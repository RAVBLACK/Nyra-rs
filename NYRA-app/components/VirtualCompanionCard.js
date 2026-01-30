// Virtual Companion Card Component
// Frontend UI component for the "Walk with Me" feature

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Modal, TextInput } from 'react-native';
import { virtualCompanionService } from '../services/virtualCompanionService';

const VirtualCompanionCard = ({ style, onSessionStateChange }) => {
  const [isActive, setIsActive] = useState(false);
  const [currentSession, setCurrentSession] = useState(null);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [sessionConfig, setSessionConfig] = useState({
    durationMinutes: 15,
    destination: '',
    checkIntervalMinutes: 5,
    emergencyContacts: []
  });
  const [timeRemaining, setTimeRemaining] = useState(0);

  useEffect(() => {
    // Subscribe to service events
    const unsubscribe = virtualCompanionService.subscribe((eventType, data) => {
      switch (eventType) {
        case 'sessionStarted':
          setIsActive(true);
          setCurrentSession(data);
          onSessionStateChange?.(true, data);
          break;
        case 'sessionEnded':
          setIsActive(false);
          setCurrentSession(null);
          setTimeRemaining(0);
          onSessionStateChange?.(false, null);
          break;
        case 'checkInRequired':
          showCheckInPrompt();
          break;
        case 'checkInConfirmed':
          // Update UI to show successful check-in
          break;
        case 'checkInMissed':
          showMissedCheckInAlert();
          break;
        case 'emergencyAlertTriggered':
          showEmergencyAlertSent();
          break;
      }
    });

    // Check for existing session on mount
    const existingSession = virtualCompanionService.getCurrentSession();
    if (existingSession) {
      setIsActive(true);
      setCurrentSession(existingSession);
      onSessionStateChange?.(true, existingSession);
    }

    return unsubscribe;
  }, []);

  useEffect(() => {
    // Update time remaining counter
    if (isActive && currentSession) {
      const interval = setInterval(() => {
        const endTime = new Date(currentSession.startTime).getTime() + (sessionConfig.durationMinutes * 60000);
        const remaining = Math.max(0, endTime - Date.now());
        setTimeRemaining(Math.floor(remaining / 60000)); // Convert to minutes
        
        if (remaining <= 0) {
          handleEndSession();
        }
      }, 60000); // Update every minute

      return () => clearInterval(interval);
    }
  }, [isActive, currentSession]);

  const showCheckInPrompt = () => {
    Alert.alert(
      'Safety Check-In Required',
      'Are you safe and okay?',
      [
        {
          text: 'Yes, I\'m Safe',
          onPress: () => virtualCompanionService.handleCheckInResponse(true),
          style: 'default'
        },
        {
          text: 'No, Send Alert',
          onPress: () => virtualCompanionService.handleCheckInResponse(false),
          style: 'destructive'
        }
      ],
      { 
        cancelable: false,
        // Auto-trigger alert if no response in 30 seconds
        onDismiss: () => {
          setTimeout(() => {
            virtualCompanionService.handleCheckInResponse(false);
          }, 30000);
        }
      }
    );
  };

  const showMissedCheckInAlert = () => {
    Alert.alert(
      'Missed Check-In',
      'You missed your safety check-in. Please respond immediately or an emergency alert will be sent.',
      [
        {
          text: 'I\'m Safe',
          onPress: () => virtualCompanionService.handleCheckInResponse(true)
        },
        {
          text: 'Send Alert Now',
          onPress: () => virtualCompanionService.handleCheckInResponse(false)
        }
      ],
      { cancelable: false }
    );
  };

  const showEmergencyAlertSent = () => {
    Alert.alert(
      'Emergency Alert Sent',
      'Your emergency contacts have been notified of your situation. Help is on the way.',
      [{ text: 'OK' }]
    );
  };

  const handleStartSession = () => {
    if (sessionConfig.durationMinutes < 5 || sessionConfig.durationMinutes > 480) {
      Alert.alert('Invalid Duration', 'Please enter a duration between 5 minutes and 8 hours.');
      return;
    }

    setShowSetupModal(false);
    virtualCompanionService.startSession(sessionConfig);
  };

  const handleEndSession = () => {
    Alert.alert(
      'End Virtual Companion',
      'Are you sure you want to stop the virtual companion session?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'End Session', 
          onPress: () => virtualCompanionService.endSession(),
          style: 'destructive' 
        }
      ]
    );
  };

  const getStatusColor = () => {
    if (!isActive) return '#gray';
    if (currentSession?.missedCheckIns > 0) return '#ff6b6b';
    return '#51cf66';
  };

  const getStatusText = () => {
    if (!isActive) return 'Inactive';
    if (currentSession?.missedCheckIns > 0) return 'Missed Check-In';
    return `Active • ${timeRemaining}m remaining`;
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.emoji}>🛡️</Text>
          <Text style={styles.title}>Walk with Me</Text>
        </View>
        <View style={[styles.statusIndicator, { backgroundColor: getStatusColor() }]} />
      </View>

      <Text style={styles.description}>
        {isActive ? 
          `Virtual companion active${currentSession?.destination ? ` to ${currentSession.destination}` : ''}` :
          'Set up a virtual companion for your journey'
        }
      </Text>

      <Text style={styles.status}>{getStatusText()}</Text>

      {isActive ? (
        <View style={styles.activeControls}>
          <TouchableOpacity style={styles.checkInButton} onPress={() => virtualCompanionService.handleCheckInResponse(true)}>
            <Text style={styles.checkInButtonText}>I'm Safe ✓</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.endButton} onPress={handleEndSession}>
            <Text style={styles.endButtonText}>End Session</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.startButton} onPress={() => setShowSetupModal(true)}>
          <Text style={styles.startButtonText}>Start Virtual Companion</Text>
        </TouchableOpacity>
      )}

      {/* Setup Modal */}
      <Modal
        visible={showSetupModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSetupModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Setup Virtual Companion</Text>
            
            <Text style={styles.label}>Duration (minutes):</Text>
            <TextInput
              style={styles.input}
              value={sessionConfig.durationMinutes.toString()}
              onChangeText={(text) => setSessionConfig({
                ...sessionConfig,
                durationMinutes: parseInt(text) || 15
              })}
              keyboardType="numeric"
              placeholder="15"
            />

            <Text style={styles.label}>Destination (optional):</Text>
            <TextInput
              style={styles.input}
              value={sessionConfig.destination}
              onChangeText={(text) => setSessionConfig({
                ...sessionConfig,
                destination: text
              })}
              placeholder="e.g., Home, Office, Station"
            />

            <Text style={styles.label}>Check-in interval (minutes):</Text>
            <TextInput
              style={styles.input}
              value={sessionConfig.checkIntervalMinutes.toString()}
              onChangeText={(text) => setSessionConfig({
                ...sessionConfig,
                checkIntervalMinutes: parseInt(text) || 5
              })}
              keyboardType="numeric"
              placeholder="5"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setShowSetupModal(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmButton} onPress={handleStartSession}>
                <Text style={styles.confirmButtonText}>Start</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  emoji: {
    fontSize: 24,
    marginRight: 8
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333'
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20
  },
  status: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 16
  },
  startButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center'
  },
  startButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600'
  },
  activeControls: {
    flexDirection: 'row',
    gap: 12
  },
  checkInButton: {
    flex: 1,
    backgroundColor: '#34C759',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center'
  },
  checkInButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600'
  },
  endButton: {
    flex: 1,
    backgroundColor: '#FF3B30',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center'
  },
  endButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 24,
    textAlign: 'center'
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#f8f9fa'
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd'
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600'
  },
  confirmButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center'
  },
  confirmButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600'
  }
});

export default VirtualCompanionCard;