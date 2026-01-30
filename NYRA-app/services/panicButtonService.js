// Enhanced Panic Button Service
// Sophisticated panic button with three-pulse trigger and multiple activation methods

import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter, Alert } from 'react-native';

class PanicButtonService {
  static instance = null;
  
  constructor() {
    this.isActive = false;
    this.isPulseModeEnabled = true;
    this.pulseCount = 0;
    this.pulseTimeout = null;
    this.volumeButtonEnabled = false;
    this.screenLockBypass = false;
    this.hapticEnabled = true;
    this.soundEnabled = true;
    this.listeners = new Map();
    
    // Configuration
    this.config = {
      pulseInterval: 1000, // Time between pulses (ms)
      pulseResetTime: 3000, // Time before pulse count resets (ms)
      requiredPulses: 3, // Number of pulses needed
      confirmationDelay: 5000, // Delay before activation (ms)
      escalationLevels: ['silent', 'local', 'full'], // Alert escalation
      volumeButtonSequence: ['up', 'down', 'up'] // Volume button sequence
    };
    
    this.init();
  }
  
  static getInstance() {
    if (!PanicButtonService.instance) {
      PanicButtonService.instance = new PanicButtonService();
    }
    return PanicButtonService.instance;
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
        console.error('Panic button listener error:', error);
      }
    });
  }
  
  async loadSettings() {
    try {
      const settings = await AsyncStorage.getItem('panicButtonSettings');
      if (settings) {
        const parsed = JSON.parse(settings);
        this.config = { ...this.config, ...parsed };
      }
    } catch (error) {
      console.error('Failed to load panic button settings:', error);
    }
  }
  
  async saveSettings() {
    try {
      await AsyncStorage.setItem('panicButtonSettings', JSON.stringify(this.config));
    } catch (error) {
      console.error('Failed to save panic button settings:', error);
    }
  }
  
  setupEventListeners() {
    // TODO: Implement volume button event listener
    // DeviceEventEmitter.addListener('VolumeButtonPressed', this.handleVolumeButton.bind(this));
    
    // TODO: Implement screen lock detection
    // DeviceEventEmitter.addListener('ScreenLockStateChanged', this.handleScreenLock.bind(this));
    
    this.emit('serviceReady', { isReady: true });
  }
  
  // Main panic button activation methods
  async activatePanicButton(method = 'manual') {
    if (this.isPulseModeEnabled) {
      this.handlePulseActivation(method);
    } else {
      this.triggerImmediateAlert(method);
    }
  }
  
  handlePulseActivation(method) {
    this.pulseCount++;
    this.emit('pulseDetected', { 
      count: this.pulseCount, 
      required: this.config.requiredPulses,
      method 
    });
    
    // Provide haptic and audio feedback
    if (this.hapticEnabled) {
      // TODO: Implement haptic feedback
      // Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
    
    if (this.soundEnabled) {
      // TODO: Implement sound feedback
      // playPulseSound();
    }
    
    // Clear existing timeout
    if (this.pulseTimeout) {
      clearTimeout(this.pulseTimeout);
    }
    
    if (this.pulseCount >= this.config.requiredPulses) {
      this.triggerPanicAlert(method);
    } else {
      // Reset pulse count after timeout
      this.pulseTimeout = setTimeout(() => {
        this.pulseCount = 0;
        this.emit('pulseReset', { method });
      }, this.config.pulseResetTime);
    }
  }
  
  async triggerPanicAlert(method) {
    this.emit('panicTriggered', { method, timestamp: Date.now() });
    
    // Start confirmation countdown
    let confirmationCounter = this.config.confirmationDelay / 1000;
    
    const countdown = setInterval(() => {
      confirmationCounter--;
      this.emit('confirmationCountdown', { 
        remaining: confirmationCounter,
        method 
      });
      
      if (confirmationCounter <= 0) {
        clearInterval(countdown);
        this.executeEmergencyProtocol(method);
      }
    }, 1000);
    
    // Allow user to cancel during countdown
    this.emit('showCancelOption', { 
      method,
      onCancel: () => {
        clearInterval(countdown);
        this.cancelPanicAlert(method);
      }
    });
  }
  
  triggerImmediateAlert(method) {
    this.emit('immediateAlert', { method, timestamp: Date.now() });
    this.executeEmergencyProtocol(method);
  }
  
  async executeEmergencyProtocol(method) {
    this.isActive = true;
    
    const emergencyData = {
      method,
      timestamp: Date.now(),
      location: null, // TODO: Get current location
      escalationLevel: this.config.escalationLevels[2] // Full alert by default
    };
    
    // TODO: Integrate with other safety services
    try {
      // Activate evidence recording
      // const evidenceService = require('./evidenceCaptureService').default.getInstance();
      // await evidenceService.startEmergencyRecording();
      
      // Send alerts to emergency contacts
      // const alertService = require('./alertService').default.getInstance();
      // await alertService.triggerEmergencyAlert(emergencyData);
      
      // Start location tracking
      // const locationService = require('./locationService').default.getInstance();
      // await locationService.startEmergencyTracking();
      
      // Activate community response
      // const communityService = require('./communityResponseService').default.getInstance();
      // await communityService.sendEmergencyBroadcast(emergencyData);
      
      this.emit('emergencyActivated', emergencyData);
      
    } catch (error) {
      console.error('Emergency protocol execution failed:', error);
      this.emit('emergencyError', { error: error.message, method });
    }
  }
  
  cancelPanicAlert(method) {
    this.pulseCount = 0;
    if (this.pulseTimeout) {
      clearTimeout(this.pulseTimeout);
      this.pulseTimeout = null;
    }
    
    this.emit('panicCancelled', { method, timestamp: Date.now() });
  }
  
  async deactivateEmergency() {
    this.isActive = false;
    this.pulseCount = 0;
    
    // TODO: Stop all emergency services
    this.emit('emergencyDeactivated', { timestamp: Date.now() });
  }
  
  // Volume button event handler
  handleVolumeButton(event) {
    if (!this.volumeButtonEnabled) return;
    
    // TODO: Implement volume button sequence detection
    // Check if the button sequence matches configured pattern
    const { button } = event; // 'up' or 'down'
    
    // Add to sequence and check if it matches
    this.volumeSequence = this.volumeSequence || [];
    this.volumeSequence.push(button);
    
    // Keep only recent presses
    if (this.volumeSequence.length > this.config.volumeButtonSequence.length) {
      this.volumeSequence.shift();
    }
    
    // Check if sequence matches
    if (this.volumeSequence.join(',') === this.config.volumeButtonSequence.join(',')) {
      this.activatePanicButton('volume_sequence');
      this.volumeSequence = [];
    }
  }
  
  // Screen lock bypass functionality
  handleScreenLock(isLocked) {
    if (this.screenLockBypass && isLocked) {
      // TODO: Show emergency interface over lock screen
      this.emit('showLockScreenEmergency', { isLocked });
    }
  }
  
  // Configuration methods
  async updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    await this.saveSettings();
    this.emit('configUpdated', this.config);
  }
  
  async setPulseMode(enabled) {
    this.isPulseModeEnabled = enabled;
    await this.updateConfig({ pulseMode: enabled });
    this.emit('pulseModeChanged', enabled);
  }
  
  async setVolumeButtonTrigger(enabled) {
    this.volumeButtonEnabled = enabled;
    await this.updateConfig({ volumeButtonEnabled: enabled });
    this.emit('volumeButtonChanged', enabled);
  }
  
  async setScreenLockBypass(enabled) {
    this.screenLockBypass = enabled;
    await this.updateConfig({ screenLockBypass: enabled });
    this.emit('screenLockBypassChanged', enabled);
  }
  
  // Test functions
  async testPanicButton() {
    this.emit('testStarted', { timestamp: Date.now() });
    
    // Simulate pulse sequence
    for (let i = 1; i <= this.config.requiredPulses; i++) {
      setTimeout(() => {
        this.emit('testPulse', { count: i });
        if (i === this.config.requiredPulses) {
          this.emit('testCompleted', { 
            success: true,
            timestamp: Date.now() 
          });
        }
      }, i * 500);
    }
  }
  
  // Status methods
  getStatus() {
    return {
      isActive: this.isActive,
      isPulseModeEnabled: this.isPulseModeEnabled,
      pulseCount: this.pulseCount,
      volumeButtonEnabled: this.volumeButtonEnabled,
      screenLockBypass: this.screenLockBypass,
      config: this.config
    };
  }
  
  // Analytics and logging
  async logPanicEvent(eventType, data) {
    const logEntry = {
      timestamp: Date.now(),
      type: eventType,
      data,
      version: '1.0.0'
    };
    
    try {
      // TODO: Send to analytics service
      // await analyticsService.logEvent('panic_button_event', logEntry);
      
      // Store locally for offline analysis
      const logs = await AsyncStorage.getItem('panicButtonLogs') || '[]';
      const parsedLogs = JSON.parse(logs);
      parsedLogs.push(logEntry);
      
      // Keep only last 100 entries
      if (parsedLogs.length > 100) {
        parsedLogs.splice(0, parsedLogs.length - 100);
      }
      
      await AsyncStorage.setItem('panicButtonLogs', JSON.stringify(parsedLogs));
    } catch (error) {
      console.error('Failed to log panic event:', error);
    }
  }
}

export default PanicButtonService;