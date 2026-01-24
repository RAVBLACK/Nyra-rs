import { loadSettings } from './storageService';

const SENSOR_DATA_BUFFER_SIZE = 25; // ~2.5 seconds of data at 10Hz

// Adjusted thresholds for realistic sensor variance values
const BASE_MOVEMENT_THRESHOLD_IDLE = 0.5;      // Minimal movement when stationary
const BASE_MOVEMENT_THRESHOLD_STANDING = 2.0;  // Light swaying/shifting while standing
const BASE_MOVEMENT_THRESHOLD_WALKING = 8.0;   // Consistent walking rhythm
const BASE_MOVEMENT_THRESHOLD_RUNNING = 20.0;  // High-intensity movement

let listeners = [];
let latestActivityState = {
  name: 'IDLE',
  confidence: 1.0,
  isProtectionActive: false,
  anomaly: null,
};

const notifyListeners = () => {
  for (const listener of listeners) {
    listener(latestActivityState);
  }
};

export const subscribeToActivity = (callback) => {
  listeners.push(callback);
  // Immediately call back with the current state
  callback(latestActivityState);
  return () => {
    listeners = listeners.filter(listener => listener !== callback);
  };
};

export const getLatestActivity = () => {
  return latestActivityState;
};

class HARModelService {
  constructor() {
    this.sensorDataBuffer = [];
    this.lastHighMovementTime = 0;
    this.settings = null;
    this.isMonitoring = false;
    this.lastActivity = 'IDLE';
    this.activityChangeCount = 0;
    this.sensorUnsubscribe = null;

    // Enhanced sudden stop detection variables
    this.movementHistory = []; // Track movement levels over time
    this.highMovementDuration = 0; // How long we've been in high movement
    this.lastMovementLevel = 0;
    this.consecutiveStillReadings = 0;
    this.lastSuddenStopTime = 0; // Prevent multiple triggers
    this.walkingSessionActive = false; // Track if we're in an active walking session

    this._refreshSettings();
    // Refresh settings every 30 seconds in case they change
    setInterval(this._refreshSettings, 30000);
  }

  start() {
    this.isMonitoring = true;

    // Import and subscribe to sensor data
    import('./sensorService').then(({ subscribeToSensorData }) => {
      this.sensorUnsubscribe = subscribeToSensorData((sensorData) => {
        this.predictActivity(sensorData);
      });
    });

    latestActivityState = { ...latestActivityState, isProtectionActive: true };
    notifyListeners();
    console.log('HAR Model Service Started');
  }

  stop() {
    this.isMonitoring = false;
    this.sensorDataBuffer = [];

    // Unsubscribe from sensor data
    if (this.sensorUnsubscribe) {
      this.sensorUnsubscribe();
      this.sensorUnsubscribe = null;
    }

    latestActivityState = {
      name: 'IDLE',
      confidence: 1.0,
      isProtectionActive: false,
      anomaly: null,
    };
    notifyListeners();
    console.log('HAR Model Service Stopped');
  }

  async _refreshSettings() {
    this.settings = await loadSettings();
    console.log('HAR model settings updated. Sensitivity:', this.settings.detectionSensitivity);
  }

  /**
   * Calculates the magnitude of a 3D vector.
   */
  _calculateMagnitude(x, y, z) {
    // Validate inputs
    const validX = isFinite(x) ? x : 0;
    const validY = isFinite(y) ? y : 0;
    const validZ = isFinite(z) ? z : 0;

    const magnitude = Math.sqrt(validX * validX + validY * validY + validZ * validZ);
    return isFinite(magnitude) ? magnitude : 0;
  }

  /**
   * Calculates the variance of an array of numbers.
   */
  _calculateVariance(arr) {
    if (!arr || arr.length < 2) return 0;

    // Filter out invalid values
    const validValues = arr.filter(val => typeof val === 'number' && isFinite(val));
    if (validValues.length < 2) return 0;

    const mean = validValues.reduce((a, b) => a + b, 0) / validValues.length;
    const variance = validValues.reduce((a, b) => a + (b - mean) ** 2, 0) / validValues.length;

    return isFinite(variance) ? variance : 0;
  }

  /**
   * Predicts the current activity based on a stream of sensor data.
   * @param {object} sensorData - An object like { ax, ay, az, gx, gy, gz }.
   * @returns {object} An object like { activity, confidence, anomaly }.
   */
  predictActivity(sensorData) {
    // Validate sensor data
    if (!sensorData || typeof sensorData !== 'object') {
      console.warn('⚠️ HAR: Invalid sensor data received');
      return latestActivityState;
    }

    // Validate all required numeric fields
    const requiredFields = ['ax', 'ay', 'az', 'gx', 'gy', 'gz'];
    for (const field of requiredFields) {
      if (typeof sensorData[field] !== 'number' || !isFinite(sensorData[field])) {
        console.warn(`⚠️ HAR: Invalid sensor data field ${field}:`, sensorData[field]);
        return latestActivityState;
      }
    }

    if (!this.settings || !this.isMonitoring) {
      const activityName = this.isMonitoring ? 'CALIBRATING' : 'IDLE';
      if (latestActivityState.name !== activityName) {
        latestActivityState = { ...latestActivityState, name: activityName, confidence: 0.5 };
        notifyListeners();
      }
      return latestActivityState;
    }

    // Add new data to the buffer and keep it at a fixed size
    this.sensorDataBuffer.push(sensorData);
    if (this.sensorDataBuffer.length > SENSOR_DATA_BUFFER_SIZE) {
      this.sensorDataBuffer.shift();
    }

    // Need enough data to make a prediction
    if (this.sensorDataBuffer.length < SENSOR_DATA_BUFFER_SIZE) {
      if (latestActivityState.name !== 'CALIBRATING') {
        latestActivityState = { ...latestActivityState, name: 'CALIBRATING', confidence: 0.5 };
        notifyListeners();
      }
      return latestActivityState;
    }

    // Adjust thresholds based on sensitivity
    // Low (0): Harder to trigger (higher thresholds)
    // High (1): Easier to trigger (lower thresholds)
    const sensitivity = this.settings.detectionSensitivity;
    const modifier = 1 - sensitivity; // Low=1, Med=0.5, High=0

    const MOVEMENT_THRESHOLD_IDLE = BASE_MOVEMENT_THRESHOLD_IDLE * (1 + modifier * 0.6);      // Low: 0.8, Med: 0.65, High: 0.5
    const MOVEMENT_THRESHOLD_STANDING = BASE_MOVEMENT_THRESHOLD_STANDING * (1 + modifier * 0.6); // Low: 3.2, Med: 2.6, High: 2.0
    const MOVEMENT_THRESHOLD_WALKING = BASE_MOVEMENT_THRESHOLD_WALKING * (1 + modifier * 0.4);   // Low: 11.2, Med: 9.6, High: 8.0
    const MOVEMENT_THRESHOLD_RUNNING = BASE_MOVEMENT_THRESHOLD_RUNNING * (1 + modifier * 0.3);   // Low: 26.0, Med: 23.0, High: 20.0

    // Calculate metrics from the buffered data
    // Remove gravity from accelerometer by subtracting mean (gravity is constant)
    const accelMagnitudes = this.sensorDataBuffer.map(d => this._calculateMagnitude(d.ax, d.ay, d.az));
    const gyroMagnitudes = this.sensorDataBuffer.map(d => this._calculateMagnitude(d.gx, d.gy, d.gz));

    // Remove gravity component for better motion detection
    const meanAccel = accelMagnitudes.length > 0 ?
      accelMagnitudes.reduce((a, b) => a + b, 0) / accelMagnitudes.length : 0;
    const validMeanAccel = isFinite(meanAccel) ? meanAccel : 0;
    const accelWithoutGravity = accelMagnitudes.map(mag => Math.abs(mag - validMeanAccel));

    const accelVariance = this._calculateVariance(accelWithoutGravity);
    const gyroVariance = this._calculateVariance(gyroMagnitudes);

    // Ensure variances are valid numbers
    const validAccelVariance = isFinite(accelVariance) ? accelVariance : 0;
    const validGyroVariance = isFinite(gyroVariance) ? gyroVariance : 0;

    // Weighted movement score - gyroscope captures rotational movement better for walking detection
    const totalMovement = (validAccelVariance * 15) + (validGyroVariance * 85);

    // Validate total movement to prevent NaN
    const validTotalMovement = isFinite(totalMovement) ? totalMovement : 0;

    console.log(`🔍 HAR Debug: accel=${validAccelVariance.toFixed(3)}, gyro=${validGyroVariance.toFixed(3)}, total=${validTotalMovement.toFixed(3)}`);

    let activity = 'IDLE';
    let confidence = 0.9;
    let anomaly = null;

    // --- Activity Classification with improved confidence calculation ---
    if (validTotalMovement > MOVEMENT_THRESHOLD_RUNNING) {
      activity = 'RUNNING';
      const excessMovement = validTotalMovement - MOVEMENT_THRESHOLD_RUNNING;
      const confidenceCalc = 0.75 + (excessMovement / MOVEMENT_THRESHOLD_RUNNING) * 0.2;
      confidence = Math.min(0.95, isFinite(confidenceCalc) ? confidenceCalc : 0.75);
    } else if (validTotalMovement > MOVEMENT_THRESHOLD_WALKING) {
      activity = 'WALKING';
      const walkingRange = MOVEMENT_THRESHOLD_RUNNING - MOVEMENT_THRESHOLD_WALKING;
      const walkingProgress = walkingRange > 0 ? (validTotalMovement - MOVEMENT_THRESHOLD_WALKING) / walkingRange : 0;
      const confidenceCalc = 0.65 + walkingProgress * 0.27;
      confidence = Math.min(0.92, isFinite(confidenceCalc) ? confidenceCalc : 0.65);
    } else if (validTotalMovement > MOVEMENT_THRESHOLD_STANDING) {
      activity = 'STANDING';
      const standingRange = MOVEMENT_THRESHOLD_WALKING - MOVEMENT_THRESHOLD_STANDING;
      const standingProgress = standingRange > 0 ? (validTotalMovement - MOVEMENT_THRESHOLD_STANDING) / standingRange : 0;
      const confidenceCalc = 0.55 + standingProgress * 0.33;
      confidence = Math.min(0.88, isFinite(confidenceCalc) ? confidenceCalc : 0.55);
    } else if (validTotalMovement > MOVEMENT_THRESHOLD_IDLE) {
      activity = 'STANDING';
      const lightRange = MOVEMENT_THRESHOLD_STANDING - MOVEMENT_THRESHOLD_IDLE;
      const lightProgress = lightRange > 0 ? (validTotalMovement - MOVEMENT_THRESHOLD_IDLE) / lightRange : 0;
      const confidenceCalc = 0.45 + lightProgress * 0.37;
      confidence = Math.min(0.82, isFinite(confidenceCalc) ? confidenceCalc : 0.45);
    } else {
      activity = 'IDLE';
      const idleRatio = MOVEMENT_THRESHOLD_IDLE > 0 ? Math.min(1.0, validTotalMovement / MOVEMENT_THRESHOLD_IDLE) : 0;
      const confidenceCalc = 0.95 - idleRatio * 0.25;
      confidence = Math.max(0.7, isFinite(confidenceCalc) ? confidenceCalc : 0.7);
    }

    // --- Improved Activity Smoothing ---
    if (activity !== this.lastActivity) {
      this.activityChangeCount++;

      // Different smoothing rules for different transitions
      const needsSmoothing =
        (this.lastActivity === 'IDLE' && activity === 'STANDING' && this.activityChangeCount < 3) ||
        (this.lastActivity === 'STANDING' && activity === 'IDLE' && this.activityChangeCount < 3) ||
        (this.lastActivity === 'STANDING' && activity === 'WALKING' && this.activityChangeCount < 2) ||
        (this.lastActivity === 'WALKING' && activity === 'STANDING' && this.activityChangeCount < 2);

      if (needsSmoothing) {
        // Keep previous activity but reduce confidence
        activity = this.lastActivity;
        confidence = Math.max(0.3, confidence - 0.3);
      } else {
        // Accept the new activity
        this.lastActivity = activity;
        this.activityChangeCount = 0;
      }
    } else {
      this.activityChangeCount = 0;
    }

    // --- Very Conservative Anomaly Detection (Sudden Stop) ---
    // Track movement history for better anomaly detection
    this.movementHistory.push(totalMovement);
    if (this.movementHistory.length > 100) { // Keep 10 seconds of history
      this.movementHistory.shift();
    }

    const isHighMovement = activity === 'WALKING' || activity === 'RUNNING';
    const isStill = activity === 'IDLE';
    const timeSinceLastTrigger = Date.now() - this.lastSuddenStopTime;

    // Track walking session
    if (isHighMovement) {
      this.highMovementDuration++;
      this.consecutiveStillReadings = 0;
      if (!this.walkingSessionActive && this.highMovementDuration > 30) { // 3 seconds of consistent walking
        this.walkingSessionActive = true;
      }
    } else if (isStill) {
      this.consecutiveStillReadings++;
      if (this.consecutiveStillReadings > 30) { // Reset after being still for 3 seconds
        this.highMovementDuration = 0;
        this.walkingSessionActive = false;
      }
    } else {
      this.consecutiveStillReadings = 0;
    }

    // EXTREMELY conservative sudden stop detection - only trigger in very specific conditions
    if (this.movementHistory.length >= 50 &&
      this.walkingSessionActive &&
      this.highMovementDuration >= 50 && // Must be walking for 5+ seconds
      timeSinceLastTrigger > 30000) { // At least 30 seconds since last trigger

      const recentMovement = this.movementHistory.slice(-3); // Last 0.3 seconds
      const previousMovement = this.movementHistory.slice(-20, -10); // 1 second ago
      const longTermMovement = this.movementHistory.slice(-50, -20); // 2-3 seconds ago

      const avgRecent = recentMovement.reduce((a, b) => a + b, 0) / recentMovement.length;
      const avgPrevious = previousMovement.reduce((a, b) => a + b, 0) / previousMovement.length;
      const avgLongTerm = longTermMovement.reduce((a, b) => a + b, 0) / longTermMovement.length;

      const movementDrop = (avgPrevious - avgRecent) / avgPrevious;
      const consistentHighMovement = avgLongTerm > MOVEMENT_THRESHOLD_WALKING * 1.5 &&
        avgPrevious > MOVEMENT_THRESHOLD_WALKING * 1.5;

      // Only trigger if:
      // 1. Movement drop is VERY dramatic (>90%)
      // 2. Previous movement was consistently high
      // 3. Current movement is very low (near idle)
      // 4. We're confident this is running/fast walking, not just normal walking
      if (movementDrop > 0.9 &&
        consistentHighMovement &&
        avgRecent < MOVEMENT_THRESHOLD_IDLE * 2 &&
        avgPrevious > MOVEMENT_THRESHOLD_RUNNING * 0.8) { // Must be running-level movement

        anomaly = { type: 'SUDDEN_STOP', severity: 'HIGH' };
        console.warn(`🚨 CRITICAL: Sudden Stop Detected - ${(movementDrop * 100).toFixed(1)}% drop from ${avgPrevious.toFixed(2)} to ${avgRecent.toFixed(2)}`);
        console.warn(`🚨 Setting anomaly in latestActivityState - listeners will be notified`);
        this.lastSuddenStopTime = Date.now();
        this.highMovementDuration = 0;
        this.walkingSessionActive = false;
      }
    }

    // Update global state and notify listeners
    const previousAnomaly = latestActivityState.anomaly;
    latestActivityState = {
      name: activity,
      confidence: parseFloat(confidence.toFixed(2)),
      isProtectionActive: this.isMonitoring,
      anomaly: anomaly,
    };

    // Log when anomaly state changes
    if (anomaly && !previousAnomaly) {
      console.warn(`🚨 NEW ANOMALY SET: ${anomaly.type} - Notifying ${listeners.length} listeners`);
    } else if (!anomaly && previousAnomaly) {
      console.log(`✅ Anomaly cleared (was: ${previousAnomaly.type})`);
    }

    notifyListeners();

    return latestActivityState;
  }
}

// Export a singleton instance of the service
const harModelService = new HARModelService();
export default harModelService;

