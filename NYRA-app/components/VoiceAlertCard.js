// Voice Alert Card Component
// Frontend UI component for Voice-Activated "Scream" Trigger feature

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Modal, TextInput, ScrollView } from 'react-native';
import { voiceDetectionService } from '../services/voiceDetectionService';

const VoiceAlertCard = ({ style, onVoiceStateChange }) => {
  const [isListening, setIsListening] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [config, setConfig] = useState({
    enableScreamDetection: true,
    enableKeywordDetection: true,
    customKeywords: [],
    sensitivity: 7,
    continuousListening: false
  });
  const [audioLevel, setAudioLevel] = useState(0);
  const [newKeyword, setNewKeyword] = useState('');

  useEffect(() => {
    // Subscribe to service events
    const unsubscribe = voiceDetectionService.subscribe((eventType, data) => {
      switch (eventType) {
        case 'voiceDetectionInitialized':
          setIsActive(true);
          onVoiceStateChange?.(true, data);
          break;
        case 'listeningStarted':
          setIsListening(true);
          break;
        case 'listeningStopped':
          setIsListening(false);
          break;
        case 'audioProcessed':
          setAudioLevel(data.audioLevel);
          break;
        case 'triggerDetected':
          handleTriggerDetected(data);
          break;
        case 'confirmationRequired':
          showConfirmationDialog(data);
          break;
        case 'alertSent':
          showAlertSentNotification();
          break;
        case 'alertCancelled':
          showAlertCancelledNotification();
          break;
      }
    });

    // Check if already initialized
    if (voiceDetectionService.getIsActive) {
      setIsActive(true);
      setIsListening(voiceDetectionService.getIsListening());
    }

    return unsubscribe;
  }, []);

  const handleTriggerDetected = (data) => {
    // Visual feedback for trigger detection
    console.log('Voice trigger detected:', data.type, data.confidence);
  };

  const showConfirmationDialog = (data) => {
    Alert.alert(
      '🚨 Emergency Alert Detected',
      `Voice trigger detected (${data.alertData.triggerType}). Send emergency alert?`,
      [
        {
          text: 'False Alarm',
          onPress: () => data.onCancel(),
          style: 'cancel'
        },
        {
          text: 'Send Alert Now',
          onPress: () => data.onConfirm(),
          style: 'destructive'
        }
      ],
      { cancelable: false }
    );
  };

  const showAlertSentNotification = () => {
    Alert.alert(
      'Emergency Alert Sent',
      'Your voice-triggered emergency alert has been sent to your emergency contacts.',
      [{ text: 'OK' }]
    );
  };

  const showAlertCancelledNotification = () => {
    Alert.alert(
      'Alert Cancelled',
      'The emergency alert was cancelled. Stay safe!',
      [{ text: 'OK' }]
    );
  };

  const handleInitialize = async () => {
    setShowSetupModal(false);
    const result = await voiceDetectionService.initializeVoiceDetection(config);
    
    if (!result.success) {
      Alert.alert('Setup Failed', result.error);
    }
  };

  const handleToggleListening = async () => {
    if (isListening) {
      await voiceDetectionService.stopListening();
    } else {
      const result = await voiceDetectionService.startListening(config.continuousListening);
      if (!result.success) {
        Alert.alert('Failed to Start Listening', result.error);
      }
    }
  };

  const addCustomKeyword = () => {
    if (newKeyword.trim() && !config.customKeywords.includes(newKeyword.trim().toUpperCase())) {
      setConfig({
        ...config,
        customKeywords: [...config.customKeywords, newKeyword.trim().toUpperCase()]
      });
      setNewKeyword('');
    }
  };

  const removeKeyword = (keyword) => {
    setConfig({
      ...config,
      customKeywords: config.customKeywords.filter(k => k !== keyword)
    });
  };

  const getAudioLevelColor = () => {
    if (audioLevel > 80) return '#FF3B30';
    if (audioLevel > 60) return '#FF9500';
    if (audioLevel > 30) return '#34C759';
    return '#8E8E93';
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.emoji}>🗣️</Text>
          <Text style={styles.title}>Voice Alert</Text>
        </View>
        {isListening && (
          <View style={styles.listeningIndicator}>
            <View style={[styles.audioLevel, { backgroundColor: getAudioLevelColor(), height: `${Math.min(audioLevel, 100)}%` }]} />
          </View>
        )}
      </View>

      <Text style={styles.description}>
        {isListening ? 
          'Listening for emergency voice triggers...' :
          isActive ?
            'Voice detection ready - tap to start listening' :
            'Voice-activated emergency alerts'
        }
      </Text>

      {isActive && (
        <View style={styles.featuresContainer}>
          <View style={styles.featureRow}>
            <Text style={styles.featureLabel}>Scream Detection:</Text>
            <Text style={[styles.featureStatus, { color: config.enableScreamDetection ? '#34C759' : '#8E8E93' }]}>
              {config.enableScreamDetection ? 'Enabled' : 'Disabled'}
            </Text>
          </View>
          <View style={styles.featureRow}>
            <Text style={styles.featureLabel}>Keyword Detection:</Text>
            <Text style={[styles.featureStatus, { color: config.enableKeywordDetection ? '#34C759' : '#8E8E93' }]}>
              {config.enableKeywordDetection ? 'Enabled' : 'Disabled'}
            </Text>
          </View>
          <View style={styles.featureRow}>
            <Text style={styles.featureLabel}>Sensitivity:</Text>
            <Text style={styles.featureStatus}>{config.sensitivity}/10</Text>
          </View>
        </View>
      )}

      {isActive ? (
        <TouchableOpacity 
          style={[styles.actionButton, isListening ? styles.stopButton : styles.startButton]} 
          onPress={handleToggleListening}
        >
          <Text style={styles.actionButtonText}>
            {isListening ? '🛑 Stop Listening' : '🎤 Start Listening'}
          </Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.setupButton} onPress={() => setShowSetupModal(true)}>
          <Text style={styles.setupButtonText}>Setup Voice Alerts</Text>
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
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Voice Alert Setup</Text>
              
              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>Scream Detection</Text>
                <TouchableOpacity
                  style={[styles.toggle, config.enableScreamDetection && styles.toggleActive]}
                  onPress={() => setConfig({...config, enableScreamDetection: !config.enableScreamDetection})}
                >
                  <View style={[styles.toggleThumb, config.enableScreamDetection && styles.toggleThumbActive]} />
                </TouchableOpacity>
              </View>

              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>Keyword Detection</Text>
                <TouchableOpacity
                  style={[styles.toggle, config.enableKeywordDetection && styles.toggleActive]}
                  onPress={() => setConfig({...config, enableKeywordDetection: !config.enableKeywordDetection})}
                >
                  <View style={[styles.toggleThumb, config.enableKeywordDetection && styles.toggleThumbActive]} />
                </TouchableOpacity>
              </View>

              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>Continuous Listening</Text>
                <TouchableOpacity
                  style={[styles.toggle, config.continuousListening && styles.toggleActive]}
                  onPress={() => setConfig({...config, continuousListening: !config.continuousListening})}
                >
                  <View style={[styles.toggleThumb, config.continuousListening && styles.toggleThumbActive]} />
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Sensitivity (1-10):</Text>
              <View style={styles.sensitivityButtons}>
                {[1, 3, 5, 7, 9].map(value => (
                  <TouchableOpacity
                    key={value}
                    style={[styles.sensitivityButton, config.sensitivity === value && styles.sensitivityButtonSelected]}
                    onPress={() => setConfig({...config, sensitivity: value})}
                  >
                    <Text style={[styles.sensitivityButtonText, config.sensitivity === value && styles.sensitivityButtonTextSelected]}>
                      {value}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Custom Keywords:</Text>
              <View style={styles.keywordInputContainer}>
                <TextInput
                  style={styles.keywordInput}
                  value={newKeyword}
                  onChangeText={setNewKeyword}
                  placeholder="Add custom trigger word"
                  onSubmitEditing={addCustomKeyword}
                />
                <TouchableOpacity style={styles.addKeywordButton} onPress={addCustomKeyword}>
                  <Text style={styles.addKeywordButtonText}>Add</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.keywordsList}>
                {config.customKeywords.map(keyword => (
                  <View key={keyword} style={styles.keywordChip}>
                    <Text style={styles.keywordChipText}>{keyword}</Text>
                    <TouchableOpacity onPress={() => removeKeyword(keyword)}>
                      <Text style={styles.keywordRemove}>×</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setShowSetupModal(false)}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.confirmButton} onPress={handleInitialize}>
                  <Text style={styles.confirmButtonText}>Initialize</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
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
  listeningIndicator: {
    width: 20,
    height: 20,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    justifyContent: 'flex-end',
    alignItems: 'center',
    overflow: 'hidden'
  },
  audioLevel: {
    width: '100%',
    borderRadius: 10
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20
  },
  featuresContainer: {
    marginBottom: 16
  },
  featureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4
  },
  featureLabel: {
    fontSize: 14,
    color: '#333'
  },
  featureStatus: {
    fontSize: 14,
    fontWeight: '500'
  },
  actionButton: {
    borderRadius: 8,
    padding: 12,
    alignItems: 'center'
  },
  startButton: {
    backgroundColor: '#34C759'
  },
  stopButton: {
    backgroundColor: '#FF3B30'
  },
  setupButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center'
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600'
  },
  setupButtonText: {
    color: '#ffffff',
    fontSize: 16,
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
    maxWidth: 400,
    maxHeight: '80%'
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 24,
    textAlign: 'center'
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  toggleLabel: {
    fontSize: 16,
    color: '#333'
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#E5E5E7',
    justifyContent: 'center',
    paddingHorizontal: 3
  },
  toggleActive: {
    backgroundColor: '#34C759'
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 1
  },
  toggleThumbActive: {
    alignSelf: 'flex-end'
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
    marginTop: 8
  },
  sensitivityButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16
  },
  sensitivityButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center'
  },
  sensitivityButtonSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF'
  },
  sensitivityButtonText: {
    fontSize: 14,
    color: '#666'
  },
  sensitivityButtonTextSelected: {
    color: '#ffffff'
  },
  keywordInputContainer: {
    flexDirection: 'row',
    marginBottom: 8
  },
  keywordInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 8,
    marginRight: 8,
    fontSize: 14
  },
  addKeywordButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: 'center'
  },
  addKeywordButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600'
  },
  keywordsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24
  },
  keywordChip: {
    backgroundColor: '#E3F2FD',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center'
  },
  keywordChipText: {
    fontSize: 12,
    color: '#1976D2',
    marginRight: 4
  },
  keywordRemove: {
    fontSize: 16,
    color: '#1976D2',
    fontWeight: 'bold'
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12
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

export default VoiceAlertCard;