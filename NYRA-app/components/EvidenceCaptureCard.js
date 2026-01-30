// Evidence Capture Card Component
// Frontend UI component for "Black Box" Evidence Capture feature

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Modal, ScrollView } from 'react-native';
import { evidenceCaptureService } from '../services/evidenceCaptureService';

const EvidenceCaptureCard = ({ style, onCaptureStateChange }) => {
  const [isActive, setIsActive] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [currentSession, setCurrentSession] = useState(null);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [config, setConfig] = useState({
    enableAudio: true,
    enableCamera: true,
    enableLocationTracking: true,
    autoTrigger: true,
    maxDuration: 600,
    cloudBackup: true
  });
  const [recordingStats, setRecordingStats] = useState({
    duration: 0,
    fileCount: 0,
    dataSize: 0
  });
  const [lastEvidence, setLastEvidence] = useState(null);

  useEffect(() => {
    // Subscribe to service events
    const unsubscribe = evidenceCaptureService.subscribe((eventType, data) => {
      switch (eventType) {
        case 'evidenceCaptureInitialized':
          setIsActive(true);
          onCaptureStateChange?.(true, data);
          break;
        case 'recordingStarted':
          setIsRecording(true);
          setCurrentSession({ id: data.sessionId, triggerSource: data.triggerSource });
          showRecordingStartedAlert(data);
          break;
        case 'recordingStopped':
          setIsRecording(false);
          setRecordingStats({
            duration: Math.round(data.duration / 1000),
            fileCount: data.fileCount,
            dataSize: 0 // Will be updated when processing completes
          });
          break;
        case 'evidenceProcessed':
          setCurrentSession(null);
          setLastEvidence(data.evidence);
          showEvidenceProcessedAlert(data);
          break;
        case 'emergencyPhotoCaptured':
          showPhotoCapturedAlert(data);
          break;
      }
    });

    // Check if already initialized
    if (evidenceCaptureService.getIsActive()) {
      setIsActive(true);
      setIsRecording(evidenceCaptureService.getIsRecording());
      setCurrentSession(evidenceCaptureService.getCurrentSession());
    }

    return unsubscribe;
  }, []);

  const showRecordingStartedAlert = (data) => {
    if (data.triggerSource !== 'manual') {
      Alert.alert(
        '📹 Evidence Recording Started',
        `Auto-recording triggered by ${data.triggerSource.replace('_', ' ')}. Recording will continue in background.`,
        [{ text: 'OK' }]
      );
    }
  };

  const showEvidenceProcessedAlert = (data) => {
    Alert.alert(
      '✅ Evidence Secured',
      `${data.evidenceFiles.length} files have been processed and ${data.uploaded ? 'uploaded to secure storage' : 'saved locally'}.`,
      [
        { text: 'OK' },
        { text: 'View Details', onPress: () => showEvidenceDetails(data) }
      ]
    );
  };

  const showPhotoCapturedAlert = (data) => {
    Alert.alert(
      '📸 Emergency Photo Captured',
      `Photo captured ${data.discreet ? 'discretely' : 'with notification'} and saved securely.`,
      [{ text: 'OK' }]
    );
  };

  const showEvidenceDetails = (data) => {
    const fileTypes = data.evidenceFiles.map(f => f.type).join(', ');
    Alert.alert(
      'Evidence Details',
      `Session ID: ${data.sessionId}\nFiles: ${fileTypes}\nStorage: ${data.uploaded ? 'Cloud + Local' : 'Local only'}\n\nThis evidence is encrypted and can be accessed by you or law enforcement if needed.`,
      [{ text: 'OK' }]
    );
  };

  const handleInitialize = async () => {
    setShowSetupModal(false);
    const result = await evidenceCaptureService.initializeEvidenceCapture(config);
    
    if (!result.success) {
      Alert.alert('Setup Failed', result.error);
    }
  };

  const handleStartRecording = async () => {
    Alert.alert(
      'Start Evidence Recording',
      'This will record audio, video, and location data. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Start Recording',
          onPress: async () => {
            const result = await evidenceCaptureService.startEvidenceRecording({
              source: 'manual',
              urgency: 'medium'
            });
            
            if (!result.success) {
              Alert.alert('Recording Failed', result.error);
            }
          }
        }
      ]
    );
  };

  const handleStopRecording = async () => {
    Alert.alert(
      'Stop Recording',
      'Stop evidence recording and process files?',
      [
        { text: 'Continue Recording', style: 'cancel' },
        { 
          text: 'Stop & Save',
          onPress: async () => {
            await evidenceCaptureService.stopEvidenceRecording('manual');
          },
          style: 'destructive'
        }
      ]
    );
  };

  const handleEmergencyPhoto = async () => {
    const result = await evidenceCaptureService.captureEmergencyPhoto(true);
    if (!result.success) {
      Alert.alert('Photo Failed', result.error);
    }
  };

  const getFeatureIcon = (enabled) => enabled ? '✅' : '❌';
  
  const getRecordingStatusColor = () => {
    if (isRecording) return '#FF3B30';
    return isActive ? '#34C759' : '#8E8E93';
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.emoji}>📹</Text>
          <Text style={styles.title}>Evidence Capture</Text>
        </View>
        {isActive && (
          <View style={[styles.statusIndicator, { backgroundColor: getRecordingStatusColor() }]}>
            {isRecording && <Text style={styles.recordingText}>REC</Text>}
          </View>
        )}
      </View>

      <Text style={styles.description}>
        {isRecording ? 
          `Recording evidence - ${formatDuration(recordingStats.duration)} elapsed` :
          isActive ?
            'Auto black box recording ready for emergencies' :
            'Secure evidence recording for safety incidents'
        }
      </Text>

      {/* Recording Stats */}
      {isRecording && (
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Duration</Text>
            <Text style={styles.statValue}>{formatDuration(recordingStats.duration)}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Files</Text>
            <Text style={styles.statValue}>{recordingStats.fileCount}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Storage</Text>
            <Text style={styles.statValue}>{config.cloudBackup ? 'Cloud' : 'Local'}</Text>
          </View>
        </View>
      )}

      {/* Feature Status */}
      {isActive && !isRecording && (
        <View style={styles.featuresContainer}>
          <View style={styles.featureRow}>
            <Text style={styles.featureLabel}>Audio Recording:</Text>
            <Text style={styles.featureStatus}>{getFeatureIcon(config.enableAudio)}</Text>
          </View>
          <View style={styles.featureRow}>
            <Text style={styles.featureLabel}>Video Capture:</Text>
            <Text style={styles.featureStatus}>{getFeatureIcon(config.enableCamera)}</Text>
          </View>
          <View style={styles.featureRow}>
            <Text style={styles.featureLabel}>Auto Trigger:</Text>
            <Text style={styles.featureStatus}>{getFeatureIcon(config.autoTrigger)}</Text>
          </View>
          <View style={styles.featureRow}>
            <Text style={styles.featureLabel}>Cloud Backup:</Text>
            <Text style={styles.featureStatus}>{getFeatureIcon(config.cloudBackup)}</Text>
          </View>
        </View>
      )}

      {/* Last Evidence Info */}
      {lastEvidence && !isRecording && (
        <View style={styles.lastEvidenceContainer}>
          <Text style={styles.lastEvidenceLabel}>Last Recording:</Text>
          <Text style={styles.lastEvidenceText}>
            {lastEvidence.length} files • {new Date().toLocaleDateString()}
          </Text>
        </View>
      )}

      {/* Controls */}
      {isActive ? (
        <View style={styles.activeControls}>
          {isRecording ? (
            <TouchableOpacity style={styles.stopButton} onPress={handleStopRecording}>
              <Text style={styles.stopButtonText}>⏹️ Stop Recording</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity style={styles.recordButton} onPress={handleStartRecording}>
                <Text style={styles.recordButtonText}>🔴 Record Now</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.photoButton} onPress={handleEmergencyPhoto}>
                <Text style={styles.photoButtonText}>📸</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      ) : (
        <TouchableOpacity style={styles.setupButton} onPress={() => setShowSetupModal(true)}>
          <Text style={styles.setupButtonText}>Setup Evidence Capture</Text>
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
              <Text style={styles.modalTitle}>Evidence Capture Setup</Text>
              
              <Text style={styles.modalDescription}>
                Configure automatic evidence recording for emergencies. All data is encrypted and stored securely.
              </Text>

              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>Audio Recording</Text>
                <TouchableOpacity
                  style={[styles.toggle, config.enableAudio && styles.toggleActive]}
                  onPress={() => setConfig({...config, enableAudio: !config.enableAudio})}
                >
                  <View style={[styles.toggleThumb, config.enableAudio && styles.toggleThumbActive]} />
                </TouchableOpacity>
              </View>

              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>Video Capture</Text>
                <TouchableOpacity
                  style={[styles.toggle, config.enableCamera && styles.toggleActive]}
                  onPress={() => setConfig({...config, enableCamera: !config.enableCamera})}
                >
                  <View style={[styles.toggleThumb, config.enableCamera && styles.toggleThumbActive]} />
                </TouchableOpacity>
              </View>

              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>Location Tracking</Text>
                <TouchableOpacity
                  style={[styles.toggle, config.enableLocationTracking && styles.toggleActive]}
                  onPress={() => setConfig({...config, enableLocationTracking: !config.enableLocationTracking})}
                >
                  <View style={[styles.toggleThumb, config.enableLocationTracking && styles.toggleThumbActive]} />
                </TouchableOpacity>
              </View>

              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>Auto-trigger on Alerts</Text>
                <TouchableOpacity
                  style={[styles.toggle, config.autoTrigger && styles.toggleActive]}
                  onPress={() => setConfig({...config, autoTrigger: !config.autoTrigger})}
                >
                  <View style={[styles.toggleThumb, config.autoTrigger && styles.toggleThumbActive]} />
                </TouchableOpacity>
              </View>

              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>Cloud Backup</Text>
                <TouchableOpacity
                  style={[styles.toggle, config.cloudBackup && styles.toggleActive]}
                  onPress={() => setConfig({...config, cloudBackup: !config.cloudBackup})}
                >
                  <View style={[styles.toggleThumb, config.cloudBackup && styles.toggleThumbActive]} />
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Maximum Recording Duration:</Text>
              <View style={styles.durationButtons}>
                {[300, 600, 1200, 1800].map(duration => (
                  <TouchableOpacity
                    key={duration}
                    style={[
                      styles.durationButton, 
                      config.maxDuration === duration && styles.durationButtonSelected
                    ]}
                    onPress={() => setConfig({...config, maxDuration: duration})}
                  >
                    <Text style={[
                      styles.durationButtonText,
                      config.maxDuration === duration && styles.durationButtonTextSelected
                    ]}>
                      {duration / 60}min
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.securityNotice}>
                <Text style={styles.securityTitle}>🔐 Security & Privacy</Text>
                <Text style={styles.securityText}>
                  • All recordings are encrypted end-to-end
                  • You control access to your evidence
                  • Data is automatically deleted after 7 years
                  • Can be shared with law enforcement if needed
                </Text>
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setShowSetupModal(false)}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.confirmButton} onPress={handleInitialize}>
                  <Text style={styles.confirmButtonText}>Enable Capture</Text>
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
  statusIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 40,
    alignItems: 'center'
  },
  recordingText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold'
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12
  },
  statItem: {
    alignItems: 'center'
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333'
  },
  featuresContainer: {
    marginBottom: 12
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
    fontSize: 14
  },
  lastEvidenceContainer: {
    backgroundColor: '#e8f5e8',
    borderRadius: 8,
    padding: 8,
    marginBottom: 12
  },
  lastEvidenceLabel: {
    fontSize: 12,
    color: '#2d5a2d',
    fontWeight: '500'
  },
  lastEvidenceText: {
    fontSize: 12,
    color: '#2d5a2d'
  },
  activeControls: {
    flexDirection: 'row',
    gap: 12
  },
  recordButton: {
    flex: 1,
    backgroundColor: '#FF3B30',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center'
  },
  recordButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600'
  },
  photoButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 12,
    minWidth: 50,
    alignItems: 'center'
  },
  photoButtonText: {
    fontSize: 18
  },
  stopButton: {
    backgroundColor: '#8E8E93',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    flex: 1
  },
  stopButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600'
  },
  setupButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center'
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
    marginBottom: 12,
    textAlign: 'center'
  },
  modalDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20
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
  durationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24
  },
  durationButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd'
  },
  durationButtonSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF'
  },
  durationButtonText: {
    fontSize: 12,
    color: '#666'
  },
  durationButtonTextSelected: {
    color: '#ffffff',
    fontWeight: '600'
  },
  securityNotice: {
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 24
  },
  securityTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 8
  },
  securityText: {
    fontSize: 12,
    color: '#1976D2',
    lineHeight: 16
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

export default EvidenceCaptureCard;