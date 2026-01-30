// Activity Detection Service
// Automatic detection of activities, falls, and emergency situations using device sensors

import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';

class ActivityDetectionService {
  static instance = null;
  
  constructor() {
    this.isActive = false;
    this.isMonitoring = false;
    this.currentActivity = 'stationary';
    this.activityHistory = [];
    this.listeners = new Map();
    
    // Sensor data
    this.accelerometerData = [];
    this.gyroscopeData = [];
    this.magnetometerData = [];
    
    // Activity detection configuration
    this.config = {
      samplingRate: 50, // Hz
      windowSize: 100, // Number of samples to analyze
      fallThreshold: {
        acceleration: 15, // m/s²
        duration: 2000, // ms
        impactThreshold: 25, // m/s²
        stillnessAfterFall: 3000 // ms
      },
      activityThresholds: {
        walking: { min: 1.5, max: 4.0 },
        running: { min: 4.0, max: 12.0 },
        cycling: { min: 8.0, max: 20.0 },
        driving: { min: 5.0, max: 50.0 }
      },
      emergencyTimeout: 30000, // 30 seconds to cancel fall alert
      privacyMode: false,
      autoEmergencyCall: false,
      sensitivityLevel: 'medium' // low, medium, high
    };
    
    // Activity patterns
    this.activityPatterns = {
      walking: { pattern: 'rhythmic', frequency: [1.5, 3.0] },
      running: { pattern: 'rhythmic', frequency: [2.5, 4.5] },
      cycling: { pattern: 'smooth', frequency: [1.0, 2.5] },
      driving: { pattern: 'smooth', frequency: [0.1, 0.8] },
      stationary: { pattern: 'minimal', frequency: [0.0, 0.5] },
      fall: { pattern: 'impact', frequency: [0.0, 10.0] }
    };
    
    this.init();
  }
  
  static getInstance() {
    if (!ActivityDetectionService.instance) {
      ActivityDetectionService.instance = new ActivityDetectionService();
    }
    return ActivityDetectionService.instance;
  }
  
  async init() {
    await this.loadSettings();
    this.setupEventListeners();
  }
  
  // Event subscription system
  subscribe(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
    
    return () => {
      const callbacks = this.listeners.get(event) || [];
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    };
  }
  
  emit(event, data) {
    const callbacks = this.listeners.get(event) || [];
    callbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('Activity detection listener error:', error);
      }
    });
  }
  
  async loadSettings() {
    try {
      const settings = await AsyncStorage.getItem('activityDetectionSettings');
      if (settings) {
        const parsed = JSON.parse(settings);
        this.config = { ...this.config, ...parsed };
      }
    } catch (error) {
      console.error('Failed to load activity detection settings:', error);
    }
  }
  
  async saveSettings() {
    try {
      await AsyncStorage.setItem('activityDetectionSettings', JSON.stringify(this.config));
    } catch (error) {
      console.error('Failed to save activity detection settings:', error);
    }
  }
  
  setupEventListeners() {
    // TODO: Set up sensor event listeners
    // DeviceEventEmitter.addListener('AccelerometerData', this.handleAccelerometerData.bind(this));
    // DeviceEventEmitter.addListener('GyroscopeData', this.handleGyroscopeData.bind(this));
    // DeviceEventEmitter.addListener('MagnetometerData', this.handleMagnetometerData.bind(this));
    
    this.emit('serviceReady', { isReady: true });
  }
  
  // Main activity detection methods
  async startMonitoring() {
    if (this.isMonitoring) {
      console.log('Activity monitoring already active');
      return;
    }
    
    try {
      // TODO: Request sensor permissions
      // const sensorPermission = await requestSensorPermissions();
      // if (!sensorPermission) throw new Error('Sensor permissions denied');
      
      this.isMonitoring = true;
      this.activityHistory = [];
      
      // TODO: Start sensor data collection
      // await this.startSensorCollection();
      
      // Start analysis loop
      this.startAnalysisLoop();
      
      this.emit('monitoringStarted', {
        timestamp: Date.now(),
        config: this.config
      });
      
    } catch (error) {
      console.error('Failed to start activity monitoring:', error);
      this.emit('monitoringError', { error: error.message });
    }
  }
  
  async stopMonitoring() {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    
    // TODO: Stop sensor data collection
    // await this.stopSensorCollection();
    
    this.emit('monitoringStopped', {
      timestamp: Date.now(),
      totalActivities: this.activityHistory.length
    });
  }
  
  startAnalysisLoop() {
    if (!this.isMonitoring) return;
    
    const analyzeData = async () => {
      if (!this.isMonitoring) return;
      
      try {
        // Analyze recent sensor data
        const activity = await this.analyzeCurrentActivity();
        
        if (activity !== this.currentActivity) {
          this.handleActivityChange(activity);
        }
        
        // Check for fall detection
        await this.checkForFall();
        
        // Check for unusual patterns
        await this.checkForAnomalies();
        
      } catch (error) {
        console.error('Activity analysis error:', error);
      }
      
      if (this.isMonitoring) {
        setTimeout(analyzeData, 1000 / this.config.samplingRate);
      }
    };
    
    analyzeData();
  }
  
  // Sensor data handlers
  handleAccelerometerData(data) {
    if (!this.isMonitoring) return;
    
    this.accelerometerData.push({
      ...data,
      timestamp: Date.now()
    });
    
    // Keep only recent data
    const cutoff = Date.now() - (this.config.windowSize * 1000 / this.config.samplingRate);
    this.accelerometerData = this.accelerometerData.filter(item => item.timestamp > cutoff);
  }
  
  handleGyroscopeData(data) {
    if (!this.isMonitoring) return;
    
    this.gyroscopeData.push({
      ...data,
      timestamp: Date.now()
    });
    
    // Keep only recent data
    const cutoff = Date.now() - (this.config.windowSize * 1000 / this.config.samplingRate);
    this.gyroscopeData = this.gyroscopeData.filter(item => item.timestamp > cutoff);
  }
  
  handleMagnetometerData(data) {
    if (!this.isMonitoring) return;
    
    this.magnetometerData.push({
      ...data,
      timestamp: Date.now()
    });
    
    // Keep only recent data
    const cutoff = Date.now() - (this.config.windowSize * 1000 / this.config.samplingRate);
    this.magnetometerData = this.magnetometerData.filter(item => item.timestamp > cutoff);
  }
  
  // Activity analysis
  async analyzeCurrentActivity() {
    if (this.accelerometerData.length < 10) {
      return 'insufficient_data';
    }
    
    // Calculate movement magnitude
    const movementMagnitude = this.calculateMovementMagnitude();
    
    // Analyze movement patterns
    const patterns = this.analyzeMovementPatterns();
    
    // Determine activity based on magnitude and patterns
    let detectedActivity = 'stationary';
    
    if (movementMagnitude < 0.5) {
      detectedActivity = 'stationary';
    } else if (patterns.rhythmic && movementMagnitude < 4.0) {
      detectedActivity = 'walking';
    } else if (patterns.rhythmic && movementMagnitude >= 4.0) {
      detectedActivity = 'running';
    } else if (patterns.smooth && movementMagnitude > 8.0) {
      if (patterns.speed > 20) {
        detectedActivity = 'driving';
      } else {
        detectedActivity = 'cycling';
      }
    } else {
      detectedActivity = 'unknown';
    }
    
    return detectedActivity;
  }
  
  calculateMovementMagnitude() {
    if (this.accelerometerData.length === 0) return 0;
    
    const recentData = this.accelerometerData.slice(-20);
    const magnitudes = recentData.map(data => 
      Math.sqrt(data.x * data.x + data.y * data.y + data.z * data.z)
    );
    
    return magnitudes.reduce((sum, mag) => sum + mag, 0) / magnitudes.length;
  }
  
  analyzeMovementPatterns() {
    if (this.accelerometerData.length < 20) {
      return { rhythmic: false, smooth: false, speed: 0 };
    }
    
    const recentData = this.accelerometerData.slice(-50);
    
    // Simple pattern analysis
    const variations = recentData.map((data, index) => {
      if (index === 0) return 0;
      const prev = recentData[index - 1];
      return Math.abs(data.x - prev.x) + Math.abs(data.y - prev.y) + Math.abs(data.z - prev.z);
    });
    
    const avgVariation = variations.reduce((sum, v) => sum + v, 0) / variations.length;
    const maxVariation = Math.max(...variations);
    
    return {
      rhythmic: avgVariation > 0.5 && maxVariation < 3.0,
      smooth: avgVariation < 0.3,
      speed: this.calculateMovementMagnitude()
    };
  }
  
  handleActivityChange(newActivity) {
    const previousActivity = this.currentActivity;
    this.currentActivity = newActivity;
    
    const activityEvent = {
      previousActivity,
      currentActivity: newActivity,
      timestamp: Date.now(),
      confidence: this.calculateActivityConfidence(newActivity)
    };
    
    this.activityHistory.push(activityEvent);
    
    // Keep only recent history
    const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours
    this.activityHistory = this.activityHistory.filter(event => event.timestamp > cutoff);
    
    this.emit('activityChanged', activityEvent);
    
    // Check for dangerous activity transitions
    this.checkDangerousTransitions(previousActivity, newActivity);
  }
  
  calculateActivityConfidence(activity) {
    // Simple confidence calculation based on data quality
    const dataQuality = Math.min(this.accelerometerData.length / 50, 1.0);
    const movementConsistency = this.analyzeMovementPatterns().rhythmic ? 0.8 : 0.6;
    
    return dataQuality * movementConsistency;
  }
  
  // Fall detection
  async checkForFall() {
    if (this.accelerometerData.length < 10) return;
    
    const recentData = this.accelerometerData.slice(-10);
    
    // Check for sudden impact
    const impacts = recentData.filter(data => {
      const magnitude = Math.sqrt(data.x * data.x + data.y * data.y + data.z * data.z);
      return magnitude > this.config.fallThreshold.impactThreshold;
    });
    
    if (impacts.length > 0) {
      // Check for subsequent stillness
      setTimeout(() => {
        this.checkForStillnessAfterImpact(impacts[0].timestamp);
      }, this.config.fallThreshold.stillnessAfterFall);
    }
  }
  
  checkForStillnessAfterImpact(impactTime) {
    const currentTime = Date.now();
    const dataAfterImpact = this.accelerometerData.filter(
      data => data.timestamp > impactTime && data.timestamp < currentTime
    );
    
    if (dataAfterImpact.length < 5) return;
    
    // Calculate average movement after impact
    const avgMovement = dataAfterImpact.reduce((sum, data) => {
      const magnitude = Math.sqrt(data.x * data.x + data.y * data.y + data.z * data.z);
      return sum + magnitude;
    }, 0) / dataAfterImpact.length;
    
    // If movement is very low, likely a fall
    if (avgMovement < 2.0) {
      this.triggerFallAlert(impactTime);
    }
  }
  
  async triggerFallAlert(impactTime) {
    const fallEvent = {
      type: 'fall_detected',
      timestamp: impactTime,
      currentTime: Date.now(),
      location: null, // TODO: Get current location
      activity: this.currentActivity,
      confidence: 0.8
    };
    
    this.emit('fallDetected', fallEvent);
    
    // Start emergency countdown
    this.startEmergencyCountdown(fallEvent);
  }
  
  startEmergencyCountdown(fallEvent) {
    let countdown = this.config.emergencyTimeout / 1000;
    
    const countdownInterval = setInterval(() => {
      countdown--;
      this.emit('emergencyCountdown', { 
        remaining: countdown,
        fallEvent 
      });
      
      if (countdown <= 0) {
        clearInterval(countdownInterval);
        this.executeEmergencyProtocol(fallEvent);
      }
    }, 1000);
    
    // Allow user to cancel
    this.emit('showFallCancelOption', {
      fallEvent,
      onCancel: () => {
        clearInterval(countdownInterval);
        this.cancelFallAlert(fallEvent);
      }
    });
  }
  
  async executeEmergencyProtocol(fallEvent) {
    try {
      // TODO: Integrate with other safety services
      // const alertService = require('./alertService').default.getInstance();
      // await alertService.triggerFallAlert(fallEvent);
      
      // const evidenceService = require('./evidenceCaptureService').default.getInstance();
      // await evidenceService.startFallRecording(fallEvent);
      
      // const communityService = require('./communityResponseService').default.getInstance();
      // await communityService.sendFallEmergency(fallEvent);
      
      this.emit('emergencyActivated', fallEvent);
      
    } catch (error) {
      console.error('Emergency protocol execution failed:', error);
      this.emit('emergencyError', { error: error.message, fallEvent });
    }
  }
  
  cancelFallAlert(fallEvent) {
    this.emit('fallAlertCancelled', fallEvent);
  }
  
  // Anomaly detection
  async checkForAnomalies() {
    // Check for unusual activity patterns
    const recentHistory = this.activityHistory.slice(-10);
    
    if (recentHistory.length < 5) return;
    
    // Check for rapid activity changes
    const rapidChanges = recentHistory.filter((event, index) => {
      if (index === 0) return false;
      const prevEvent = recentHistory[index - 1];
      return event.timestamp - prevEvent.timestamp < 10000; // Less than 10 seconds
    });
    
    if (rapidChanges.length > 3) {
      this.emit('anomalyDetected', {
        type: 'rapid_activity_changes',
        events: rapidChanges,
        timestamp: Date.now()
      });
    }
  }
  
  checkDangerousTransitions(fromActivity, toActivity) {
    // Check for potentially dangerous transitions
    const dangerousTransitions = [
      { from: 'running', to: 'stationary', concern: 'sudden_stop' },
      { from: 'cycling', to: 'stationary', concern: 'cycling_accident' },
      { from: 'driving', to: 'stationary', concern: 'vehicle_accident' }
    ];
    
    const dangerous = dangerousTransitions.find(
      transition => transition.from === fromActivity && transition.to === toActivity
    );
    
    if (dangerous) {
      this.emit('dangerousTransition', {
        ...dangerous,
        timestamp: Date.now()
      });
    }
  }
  
  // Configuration methods
  async updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    await this.saveSettings();
    this.emit('configUpdated', this.config);
  }
  
  async setSensitivity(level) {
    const sensitivityConfigs = {
      low: {
        fallThreshold: { ...this.config.fallThreshold, impactThreshold: 30 },
        emergencyTimeout: 45000
      },
      medium: {
        fallThreshold: { ...this.config.fallThreshold, impactThreshold: 25 },
        emergencyTimeout: 30000
      },
      high: {
        fallThreshold: { ...this.config.fallThreshold, impactThreshold: 20 },
        emergencyTimeout: 15000
      }
    };
    
    await this.updateConfig({
      sensitivityLevel: level,
      ...sensitivityConfigs[level]
    });
    
    this.emit('sensitivityChanged', level);
  }
  
  // Status and data methods
  getStatus() {
    return {
      isMonitoring: this.isMonitoring,
      currentActivity: this.currentActivity,
      activityHistory: this.activityHistory.slice(-10),
      sensorDataSize: {
        accelerometer: this.accelerometerData.length,
        gyroscope: this.gyroscopeData.length,
        magnetometer: this.magnetometerData.length
      },
      config: this.config
    };
  }
  
  getActivityStatistics(timeRange = 24 * 60 * 60 * 1000) {
    const cutoff = Date.now() - timeRange;
    const recentActivities = this.activityHistory.filter(
      event => event.timestamp > cutoff
    );
    
    const stats = {
      totalActivities: recentActivities.length,
      activityDurations: {},
      mostCommonActivity: null,
      averageConfidence: 0
    };
    
    if (recentActivities.length === 0) return stats;
    
    // Calculate activity durations and frequencies
    const activityCounts = {};
    recentActivities.forEach((event, index) => {
      const activity = event.currentActivity;
      activityCounts[activity] = (activityCounts[activity] || 0) + 1;
      
      if (index < recentActivities.length - 1) {
        const duration = recentActivities[index + 1].timestamp - event.timestamp;
        stats.activityDurations[activity] = (stats.activityDurations[activity] || 0) + duration;
      }
    });
    
    // Find most common activity
    stats.mostCommonActivity = Object.entries(activityCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || null;
    
    // Average confidence
    stats.averageConfidence = recentActivities.reduce(
      (sum, event) => sum + event.confidence, 0) / recentActivities.length;
    
    return stats;
  }
}

export default ActivityDetectionService;