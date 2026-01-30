// Virtual Companion Service - "Walk with Me" Feature
// Dead-man's switch for risky commutes
// Handles both frontend UI state and backend API calls

import AsyncStorage from '@react-native-async-storage/async-storage';
import { locationService } from './locationService';
import { alertService } from './alertService';
import { smsService } from './smsService';

class VirtualCompanionService {
  constructor() {
    this.isActive = false;
    this.timerId = null;
    this.checkInterval = 300000; // 5 minutes default
    this.responseTimeoutMs = 30000; // 30 seconds to respond
    this.currentSession = null;
    this.listeners = [];
  }

  // ====== FRONTEND FUNCTIONALITY ======

  /**
   * Start a virtual companion session
   * @param {Object} config - Session configuration
   * @param {number} config.durationMinutes - Total duration of the session
   * @param {string} config.destination - Optional destination description
   * @param {number} config.checkIntervalMinutes - How often to check in
   * @param {Array} config.emergencyContacts - Contacts to notify
   */
  async startSession(config) {
    try {
      // FRONTEND: Update UI state
      this.isActive = true;
      this.checkInterval = (config.checkIntervalMinutes || 5) * 60000;
      
      // Create session object
      this.currentSession = {
        id: Date.now(),
        startTime: new Date(),
        duration: config.durationMinutes * 60000,
        destination: config.destination,
        checkInterval: this.checkInterval,
        emergencyContacts: config.emergencyContacts || [],
        checkInCount: 0,
        missedCheckIns: 0,
        status: 'active'
      };

      // BACKEND: Store session data
      await AsyncStorage.setItem('virtualCompanion_session', JSON.stringify(this.currentSession));
      
      // BACKEND: Get initial location
      const initialLocation = await locationService.getCurrentLocation();
      this.currentSession.startLocation = initialLocation;

      // Start check-in timer
      this.scheduleNextCheckIn();
      
      // Notify listeners (FRONTEND: Update UI)
      this.notifyListeners('sessionStarted', this.currentSession);

      // BACKEND: Log session start (for analytics/safety tracking)
      await this.logSessionEvent('session_started', {
        sessionId: this.currentSession.id,
        destination: config.destination,
        duration: config.durationMinutes
      });

      return { success: true, sessionId: this.currentSession.id };
    } catch (error) {
      console.error('Failed to start virtual companion session:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle user check-in response
   * @param {boolean} isSafe - Whether user confirms they're safe
   */
  async handleCheckInResponse(isSafe) {
    if (!this.currentSession) return;

    try {
      if (isSafe) {
        // User is safe - continue session
        this.currentSession.checkInCount++;
        this.currentSession.lastCheckIn = new Date();
        this.currentSession.missedCheckIns = 0;
        
        // BACKEND: Update session data
        await AsyncStorage.setItem('virtualCompanion_session', JSON.stringify(this.currentSession));
        
        // FRONTEND: Update UI
        this.notifyListeners('checkInConfirmed', this.currentSession);
        
        // Schedule next check-in
        this.scheduleNextCheckIn();
      } else {
        // User indicated they're not safe - trigger alert
        await this.triggerEmergencyAlert('user_indicated_unsafe');
      }
    } catch (error) {
      console.error('Failed to handle check-in response:', error);
    }
  }

  /**
   * Handle missed check-in (automatic trigger)
   */
  async handleMissedCheckIn() {
    if (!this.currentSession) return;

    try {
      this.currentSession.missedCheckIns++;
      
      // BACKEND: Update session data
      await AsyncStorage.setItem('virtualCompanion_session', JSON.stringify(this.currentSession));
      
      if (this.currentSession.missedCheckIns >= 2) {
        // Multiple missed check-ins - trigger emergency alert
        await this.triggerEmergencyAlert('missed_checkin_multiple');
      } else {
        // First missed check-in - send warning/retry
        this.notifyListeners('checkInMissed', this.currentSession);
        // Give user extra 2 minutes to respond
        setTimeout(() => {
          if (this.currentSession && this.currentSession.missedCheckIns > 0) {
            this.handleMissedCheckIn();
          }
        }, 120000);
      }
    } catch (error) {
      console.error('Failed to handle missed check-in:', error);
    }
  }

  /**
   * End the current virtual companion session
   */
  async endSession() {
    try {
      if (this.timerId) {
        clearTimeout(this.timerId);
        this.timerId = null;
      }

      if (this.currentSession) {
        this.currentSession.status = 'completed';
        this.currentSession.endTime = new Date();
        
        // BACKEND: Log session completion
        await this.logSessionEvent('session_completed', {
          sessionId: this.currentSession.id,
          duration: this.currentSession.endTime - this.currentSession.startTime,
          checkInCount: this.currentSession.checkInCount,
          missedCheckIns: this.currentSession.missedCheckIns
        });
        
        // FRONTEND: Update UI
        this.notifyListeners('sessionEnded', this.currentSession);
        
        // Clear session data
        await AsyncStorage.removeItem('virtualCompanion_session');
        this.currentSession = null;
      }

      this.isActive = false;
      return { success: true };
    } catch (error) {
      console.error('Failed to end virtual companion session:', error);
      return { success: false, error: error.message };
    }
  }

  // ====== BACKEND API CALLS ======

  /**
   * Trigger emergency alert when check-in fails or user indicates danger
   * @param {string} reason - Reason for the alert
   */
  async triggerEmergencyAlert(reason) {
    try {
      // Get current location
      const currentLocation = await locationService.getCurrentLocation();
      
      // Prepare alert data
      const alertData = {
        type: 'virtual_companion_alert',
        reason: reason,
        sessionId: this.currentSession?.id,
        location: currentLocation,
        timestamp: new Date(),
        destination: this.currentSession?.destination,
        lastCheckIn: this.currentSession?.lastCheckIn
      };

      // BACKEND: Send alert through existing alert service
      await alertService.sendAlert(alertData, this.currentSession?.emergencyContacts);
      
      // BACKEND: Send SMS alerts
      if (this.currentSession?.emergencyContacts?.length > 0) {
        const alertMessage = `NYRA ALERT: Virtual companion check-in failed. Last location: ${currentLocation?.latitude}, ${currentLocation?.longitude}`;
        await smsService.sendBulkSMS(this.currentSession.emergencyContacts, alertMessage);
      }

      // BACKEND: Log alert event
      await this.logSessionEvent('emergency_alert_triggered', {
        sessionId: this.currentSession?.id,
        reason: reason,
        location: currentLocation
      });

      // FRONTEND: Update UI
      this.notifyListeners('emergencyAlertTriggered', { reason, alertData });
      
      // End session after alert
      await this.endSession();

    } catch (error) {
      console.error('Failed to trigger emergency alert:', error);
    }
  }

  /**
   * BACKEND: Log session events for analytics and safety tracking
   */
  async logSessionEvent(eventType, data) {
    try {
      // TODO: Implement backend API call to log events
      const logEntry = {
        eventType,
        timestamp: new Date(),
        data,
        deviceId: await this.getDeviceId()
      };

      // Store locally for now (will sync with backend later)
      const logs = await AsyncStorage.getItem('virtualCompanion_logs');
      const logArray = logs ? JSON.parse(logs) : [];
      logArray.push(logEntry);
      await AsyncStorage.setItem('virtualCompanion_logs', JSON.stringify(logArray));

      // TODO: Send to backend API when available
      // await this.sendLogToBackend(logEntry);
      
    } catch (error) {
      console.error('Failed to log session event:', error);
    }
  }

  /**
   * BACKEND: Sync session data with backend server
   */
  async syncWithBackend() {
    try {
      // TODO: Implement backend API integration
      const sessionData = this.currentSession;
      const logs = await AsyncStorage.getItem('virtualCompanion_logs');
      
      // API calls would go here:
      // - POST /api/virtual-companion/session
      // - POST /api/virtual-companion/sync-logs
      // - GET /api/virtual-companion/user-stats
      
    } catch (error) {
      console.error('Failed to sync with backend:', error);
    }
  }

  // ====== UTILITY METHODS ======

  scheduleNextCheckIn() {
    if (this.timerId) clearTimeout(this.timerId);
    
    this.timerId = setTimeout(() => {
      // FRONTEND: Show check-in prompt
      this.notifyListeners('checkInRequired', this.currentSession);
      
      // Start response timeout
      setTimeout(() => {
        if (this.currentSession && this.currentSession.lastCheckIn !== new Date()) {
          this.handleMissedCheckIn();
        }
      }, this.responseTimeoutMs);
    }, this.checkInterval);
  }

  // FRONTEND: Subscribe to service events
  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // FRONTEND: Notify UI components of state changes
  notifyListeners(eventType, data) {
    this.listeners.forEach(listener => {
      try {
        listener(eventType, data);
      } catch (error) {
        console.error('Listener error:', error);
      }
    });
  }

  async getDeviceId() {
    // Get unique device identifier for backend tracking
    let deviceId = await AsyncStorage.getItem('device_id');
    if (!deviceId) {
      deviceId = Date.now().toString() + Math.random().toString(36);
      await AsyncStorage.setItem('device_id', deviceId);
    }
    return deviceId;
  }

  // FRONTEND: Get current session status
  getCurrentSession() {
    return this.currentSession;
  }

  // FRONTEND: Check if service is active
  getIsActive() {
    return this.isActive;
  }

  // Restore session on app restart
  async restoreSession() {
    try {
      const storedSession = await AsyncStorage.getItem('virtualCompanion_session');
      if (storedSession) {
        this.currentSession = JSON.parse(storedSession);
        this.isActive = true;
        this.scheduleNextCheckIn();
      }
    } catch (error) {
      console.error('Failed to restore session:', error);
    }
  }
}

// Export singleton instance
export const virtualCompanionService = new VirtualCompanionService();
export default virtualCompanionService;

// TODO: Backend API Endpoints to implement:
// - POST /api/virtual-companion/session/start
// - POST /api/virtual-companion/session/checkin
// - POST /api/virtual-companion/session/end
// - POST /api/virtual-companion/alert
// - GET /api/virtual-companion/user/stats
// - POST /api/virtual-companion/logs

// TODO: Required Dependencies to add:
// - @react-native-async-storage/async-storage
// - React Native notifications for check-in prompts
// - Background task handling for check-ins when app is closed