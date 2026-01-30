// Community Shield Card Component
// Frontend UI component for "Nearby Shield" community response feature

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Modal, TextInput, ScrollView } from 'react-native';
import { communityResponseService } from '../services/communityResponseService';

const CommunityShieldCard = ({ style, onCommunityStateChange }) => {
  const [isActive, setIsActive] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [activeRequests, setActiveRequests] = useState([]);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [config, setConfig] = useState({
    enableHelperMode: true,
    enableRequestMode: true,
    maxDistance: 500,
    helpTypes: ['escort', 'call_police', 'distraction'],
    anonymousMode: false
  });
  const [helpRequest, setHelpRequest] = useState({
    urgency: 'medium',
    type: 'escort',
    description: ''
  });
  const [nearbyHelperCount, setNearbyHelperCount] = useState(0);

  const helpTypeOptions = [
    { id: 'escort', label: 'Safe Escort', emoji: '🚶‍♂️' },
    { id: 'call_police', label: 'Call Police', emoji: '📞' },
    { id: 'distraction', label: 'Distraction', emoji: '👥' },
    { id: 'witness', label: 'Be a Witness', emoji: '👁️' }
  ];

  const urgencyOptions = [
    { id: 'low', label: 'Low', color: '#34C759' },
    { id: 'medium', label: 'Medium', color: '#FF9500' },
    { id: 'high', label: 'High', color: '#FF6B6B' },
    { id: 'critical', label: 'Critical', color: '#FF3B30' }
  ];

  useEffect(() => {
    // Subscribe to service events
    const unsubscribe = communityResponseService.subscribe((eventType, data) => {
      switch (eventType) {
        case 'communityInitialized':
          setIsActive(true);
          setUserProfile(data.userProfile);
          onCommunityStateChange?.(true, data);
          break;
        case 'helpRequestSent':
          setNearbyHelperCount(data.nearbyHelperCount);
          setActiveRequests(prev => [data.request, ...prev]);
          showHelpRequestSentAlert(data);
          break;
        case 'helpResponseReceived':
          showHelpResponseAlert(data);
          break;
        case 'helpRequestCompleted':
          setActiveRequests(prev => prev.filter(r => r.id !== data.requestId));
          showHelpCompletedAlert(data);
          break;
        case 'helpingSessionStarted':
          showHelpingSessionAlert(data);
          break;
      }
    });

    // Check if already initialized
    const profile = communityResponseService.getCurrentUserProfile();
    if (profile) {
      setIsActive(true);
      setUserProfile(profile);
      setActiveRequests(communityResponseService.getActiveRequests());
    }

    return unsubscribe;
  }, []);

  const showHelpRequestSentAlert = (data) => {
    Alert.alert(
      '📡 Help Request Sent',
      `Your request has been sent to ${data.nearbyHelperCount} nearby helpers. They will be notified immediately.`,
      [{ text: 'OK' }]
    );
  };

  const showHelpResponseAlert = (data) => {
    Alert.alert(
      '🤝 Helper Responded',
      `A verified helper has accepted your request and is on their way. Estimated arrival: ${data.response.estimatedArrival || '5-10 minutes'}.`,
      [
        { text: 'Great!', style: 'default' },
        { text: 'Cancel Request', style: 'cancel', onPress: () => handleCancelRequest(data.requestId) }
      ]
    );
  };

  const showHelpCompletedAlert = (data) => {
    Alert.alert(
      '✅ Help Completed',
      'Your help request has been resolved. Thank you for using Community Shield!',
      [{ text: 'OK' }]
    );
  };

  const showHelpingSessionAlert = (data) => {
    Alert.alert(
      '🛡️ Helping Session Active',
      'You are now helping someone in need. Stay safe and follow community guidelines.',
      [{ text: 'Got it' }]
    );
  };

  const handleInitialize = async () => {
    setShowSetupModal(false);
    const result = await communityResponseService.initializeCommunityResponse(config);
    
    if (!result.success) {
      Alert.alert('Setup Failed', result.error);
    }
  };

  const handleSendHelpRequest = async () => {
    if (!helpRequest.description.trim() && helpRequest.urgency === 'critical') {
      Alert.alert('Description Required', 'Please provide a brief description for critical requests.');
      return;
    }

    setShowHelpModal(false);
    const result = await communityResponseService.sendHelpRequest({
      ...helpRequest,
      shareLocation: true // Always share location for safety
    });

    if (!result.success) {
      Alert.alert('Request Failed', result.error);
    }
  };

  const handleCancelRequest = (requestId) => {
    Alert.alert(
      'Cancel Help Request',
      'Are you sure you want to cancel your help request?',
      [
        { text: 'No', style: 'cancel' },
        { 
          text: 'Yes, Cancel', 
          onPress: () => communityResponseService.completeHelpRequest(requestId, 'cancelled'),
          style: 'destructive' 
        }
      ]
    );
  };

  const toggleHelpType = (type) => {
    const newHelpTypes = config.helpTypes.includes(type)
      ? config.helpTypes.filter(t => t !== type)
      : [...config.helpTypes, type];
    
    setConfig({ ...config, helpTypes: newHelpTypes });
  };

  const getTrustScoreColor = (score) => {
    if (score >= 4.5) return '#34C759';
    if (score >= 3.5) return '#FF9500';
    return '#FF6B6B';
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.emoji}>🛡️</Text>
          <Text style={styles.title}>Community Shield</Text>
        </View>
        {isActive && userProfile && (
          <View style={styles.trustContainer}>
            <Text style={[styles.trustScore, { color: getTrustScoreColor(userProfile.trustScore) }]}>
              ⭐ {userProfile.trustScore.toFixed(1)}
            </Text>
          </View>
        )}
      </View>

      <Text style={styles.description}>
        {isActive ? 
          `Connected to community network${userProfile?.isHelper ? ' as helper' : ''}` :
          'Get help from verified community members nearby'
        }
      </Text>

      {isActive && (
        <View style={styles.statusContainer}>
          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>Status:</Text>
            <Text style={[styles.statusValue, { color: userProfile?.isAvailable ? '#34C759' : '#8E8E93' }]}>
              {userProfile?.isAvailable ? 'Available' : 'Offline'}
            </Text>
          </View>
          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>Active Requests:</Text>
            <Text style={styles.statusValue}>{activeRequests.length}</Text>
          </View>
        </View>
      )}

      {/* Active Requests */}
      {activeRequests.length > 0 && (
        <ScrollView style={styles.requestsList} showsVerticalScrollIndicator={false}>
          {activeRequests.map(request => (
            <View key={request.id} style={styles.requestItem}>
              <View style={styles.requestHeader}>
                <Text style={styles.requestType}>{helpTypeOptions.find(t => t.id === request.type)?.emoji} {request.type}</Text>
                <Text style={[styles.requestUrgency, { color: urgencyOptions.find(u => u.id === request.urgency)?.color }]}>
                  {request.urgency}
                </Text>
              </View>
              <Text style={styles.requestDescription}>{request.description}</Text>
              <TouchableOpacity 
                style={styles.cancelRequestButton}
                onPress={() => handleCancelRequest(request.id)}
              >
                <Text style={styles.cancelRequestText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      {isActive ? (
        <View style={styles.activeControls}>
          <TouchableOpacity 
            style={styles.helpButton} 
            onPress={() => setShowHelpModal(true)}
          >
            <Text style={styles.helpButtonText}>🆘 Request Help</Text>
          </TouchableOpacity>
          
          {userProfile?.isHelper && (
            <TouchableOpacity style={styles.helperButton}>
              <Text style={styles.helperButtonText}>👥 Helper Mode</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <TouchableOpacity style={styles.setupButton} onPress={() => setShowSetupModal(true)}>
          <Text style={styles.setupButtonText}>Join Community Shield</Text>
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
              <Text style={styles.modalTitle}>Join Community Shield</Text>
              
              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>I can help others</Text>
                <TouchableOpacity
                  style={[styles.toggle, config.enableHelperMode && styles.toggleActive]}
                  onPress={() => setConfig({...config, enableHelperMode: !config.enableHelperMode})}
                >
                  <View style={[styles.toggleThumb, config.enableHelperMode && styles.toggleThumbActive]} />
                </TouchableOpacity>
              </View>

              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>I may need help</Text>
                <TouchableOpacity
                  style={[styles.toggle, config.enableRequestMode && styles.toggleActive]}
                  onPress={() => setConfig({...config, enableRequestMode: !config.enableRequestMode})}
                >
                  <View style={[styles.toggleThumb, config.enableRequestMode && styles.toggleThumbActive]} />
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Help I can provide:</Text>
              <View style={styles.helpTypesContainer}>
                {helpTypeOptions.map(option => (
                  <TouchableOpacity
                    key={option.id}
                    style={[styles.helpTypeChip, config.helpTypes.includes(option.id) && styles.helpTypeChipSelected]}
                    onPress={() => toggleHelpType(option.id)}
                  >
                    <Text style={styles.helpTypeEmoji}>{option.emoji}</Text>
                    <Text style={[styles.helpTypeText, config.helpTypes.includes(option.id) && styles.helpTypeTextSelected]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Maximum help distance:</Text>
              <View style={styles.distanceButtons}>
                {[250, 500, 1000, 2000].map(distance => (
                  <TouchableOpacity
                    key={distance}
                    style={[styles.distanceButton, config.maxDistance === distance && styles.distanceButtonSelected]}
                    onPress={() => setConfig({...config, maxDistance: distance})}
                  >
                    <Text style={[styles.distanceButtonText, config.maxDistance === distance && styles.distanceButtonTextSelected]}>
                      {distance}m
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setShowSetupModal(false)}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.confirmButton} onPress={handleInitialize}>
                  <Text style={styles.confirmButtonText}>Join Network</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Help Request Modal */}
      <Modal
        visible={showHelpModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowHelpModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Request Help</Text>
            
            <Text style={styles.label}>Type of help needed:</Text>
            <View style={styles.helpTypesContainer}>
              {helpTypeOptions.map(option => (
                <TouchableOpacity
                  key={option.id}
                  style={[styles.helpTypeChip, helpRequest.type === option.id && styles.helpTypeChipSelected]}
                  onPress={() => setHelpRequest({...helpRequest, type: option.id})}
                >
                  <Text style={styles.helpTypeEmoji}>{option.emoji}</Text>
                  <Text style={[styles.helpTypeText, helpRequest.type === option.id && styles.helpTypeTextSelected]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Urgency level:</Text>
            <View style={styles.urgencyButtons}>
              {urgencyOptions.map(option => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.urgencyButton, 
                    helpRequest.urgency === option.id && styles.urgencyButtonSelected,
                    { borderColor: option.color }
                  ]}
                  onPress={() => setHelpRequest({...helpRequest, urgency: option.id})}
                >
                  <Text style={[
                    styles.urgencyButtonText,
                    helpRequest.urgency === option.id && { color: option.color }
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Brief description (optional):</Text>
            <TextInput
              style={styles.descriptionInput}
              value={helpRequest.description}
              onChangeText={(text) => setHelpRequest({...helpRequest, description: text})}
              placeholder="What kind of help do you need?"
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setShowHelpModal(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.emergencyConfirmButton} onPress={handleSendHelpRequest}>
                <Text style={styles.emergencyConfirmButtonText}>Send Help Request</Text>
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
  trustContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  trustScore: {
    fontSize: 12,
    fontWeight: 'bold'
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  statusLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 4
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333'
  },
  requestsList: {
    maxHeight: 120,
    marginBottom: 12
  },
  requestItem: {
    backgroundColor: '#fff3cd',
    borderLeftWidth: 4,
    borderLeftColor: '#FF9500',
    padding: 12,
    marginBottom: 8,
    borderRadius: 8
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4
  },
  requestType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333'
  },
  requestUrgency: {
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase'
  },
  requestDescription: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8
  },
  cancelRequestButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#FF3B30',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  cancelRequestText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600'
  },
  activeControls: {
    flexDirection: 'row',
    gap: 12
  },
  helpButton: {
    flex: 1,
    backgroundColor: '#FF3B30',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center'
  },
  helpButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600'
  },
  helperButton: {
    flex: 1,
    backgroundColor: '#34C759',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center'
  },
  helperButtonText: {
    color: '#ffffff',
    fontSize: 14,
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
  helpTypesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16
  },
  helpTypeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  helpTypeChipSelected: {
    backgroundColor: '#E3F2FD',
    borderColor: '#1976D2'
  },
  helpTypeEmoji: {
    fontSize: 16,
    marginRight: 6
  },
  helpTypeText: {
    fontSize: 14,
    color: '#666'
  },
  helpTypeTextSelected: {
    color: '#1976D2',
    fontWeight: '600'
  },
  distanceButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16
  },
  distanceButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd'
  },
  distanceButtonSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF'
  },
  distanceButtonText: {
    fontSize: 12,
    color: '#666'
  },
  distanceButtonTextSelected: {
    color: '#ffffff',
    fontWeight: '600'
  },
  urgencyButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 8
  },
  urgencyButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    borderWidth: 2,
    alignItems: 'center'
  },
  urgencyButtonSelected: {
    backgroundColor: '#ffffff'
  },
  urgencyButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666'
  },
  descriptionInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    textAlignVertical: 'top',
    marginBottom: 16
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
  },
  emergencyConfirmButton: {
    flex: 1,
    backgroundColor: '#FF3B30',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center'
  },
  emergencyConfirmButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600'
  }
});

export default CommunityShieldCard;