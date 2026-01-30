// Route Guardian Card Component
// Frontend UI component for AI Route Guardian feature

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Modal, TextInput, ScrollView } from 'react-native';
import { routeGuardianService } from '../services/routeGuardianService';

const RouteGuardianCard = ({ style, onRouteStateChange }) => {
  const [isActive, setIsActive] = useState(false);
  const [currentRoute, setCurrentRoute] = useState(null);
  const [safetyScore, setSafetyScore] = useState(0);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [routeConfig, setRouteConfig] = useState({
    destinationName: '',
    riskTolerance: 5,
    useOptimalRoute: true
  });
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    // Subscribe to service events
    const unsubscribe = routeGuardianService.subscribe((eventType, data) => {
      switch (eventType) {
        case 'routeAnalysisReady':
          setIsActive(true);
          setCurrentRoute(data.route);
          setSafetyScore(data.safetyScore);
          onRouteStateChange?.(true, data);
          if (data.safetyScore < 5) {
            showSafetyWarning(data);
          }
          break;
        case 'trackingStopped':
          setIsActive(false);
          setCurrentRoute(null);
          setSafetyScore(0);
          setAlerts([]);
          onRouteStateChange?.(false, null);
          break;
        case 'riskZoneDetected':
          handleRiskZoneAlert(data);
          break;
        case 'locationUpdated':
          setSafetyScore(data.safetyScore);
          break;
        case 'routeCompleted':
          showRouteCompletedMessage(data);
          break;
      }
    });

    // Check for existing route
    const existingRoute = routeGuardianService.getCurrentRoute();
    if (existingRoute) {
      setIsActive(true);
      setCurrentRoute(existingRoute);
      setSafetyScore(routeGuardianService.getCurrentSafetyScore());
    }

    return unsubscribe;
  }, []);

  const showSafetyWarning = (analysisData) => {
    Alert.alert(
      'Route Safety Warning',
      `Your planned route has a low safety score (${analysisData.safetyScore}/10). Consider taking precautions or an alternative route.`,
      [
        { text: 'Proceed Anyway', style: 'default' },
        { text: 'View Recommendations', onPress: () => showRecommendations(analysisData.recommendations) },
        { text: 'Stop Tracking', onPress: () => routeGuardianService.stopTracking(), style: 'cancel' }
      ]
    );
  };

  const handleRiskZoneAlert = (data) => {
    const newAlert = {
      id: Date.now(),
      type: 'risk_zone',
      message: `Entering ${data.riskZone?.reason || 'high-risk area'}`,
      safetyScore: data.newSafetyScore,
      timestamp: new Date(),
      recommendations: data.recommendations
    };
    
    setAlerts(prev => [newAlert, ...prev.slice(0, 4)]); // Keep only 5 most recent
    
    Alert.alert(
      '⚠️ Risk Zone Detected',
      newAlert.message,
      [
        { text: 'I\'m Aware', style: 'default' },
        { text: 'View Safety Tips', onPress: () => showRecommendations(data.recommendations) },
        { text: 'Call for Help', onPress: () => handleEmergencyCall() }
      ]
    );
  };

  const showRecommendations = (recommendations) => {
    Alert.alert(
      'Safety Recommendations',
      recommendations.join('\n\n'),
      [{ text: 'OK' }]
    );
  };

  const showRouteCompletedMessage = (data) => {
    Alert.alert(
      '🎉 Journey Complete',
      `You've safely reached your destination! Average safety score: ${data.safetyReport.averageSafetyScore}/10`,
      [{ text: 'Great!' }]
    );
  };

  const handleEmergencyCall = () => {
    // TODO: Integrate with emergency services or NYRA alert system
    Alert.alert(
      'Emergency Options',
      'How would you like to get help?',
      [
        { text: 'Call Police', onPress: () => {/* TODO: Call emergency services */} },
        { text: 'Send NYRA Alert', onPress: () => {/* TODO: Trigger NYRA alert */} },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const handleStartTracking = () => {
    if (!routeConfig.destinationName.trim()) {
      Alert.alert('Missing Destination', 'Please enter a destination to start route tracking.');
      return;
    }

    setShowSetupModal(false);
    
    // TODO: Get actual destination coordinates (could use geocoding)
    const mockDestination = {
      latitude: 37.7749 + (Math.random() - 0.5) * 0.01,
      longitude: -122.4194 + (Math.random() - 0.5) * 0.01
    };

    const config = {
      ...routeConfig,
      destination: mockDestination
    };

    routeGuardianService.startRouteGuardian(config);
  };

  const handleStopTracking = () => {
    Alert.alert(
      'Stop Route Tracking',
      'Are you sure you want to stop AI route analysis?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Stop', onPress: () => routeGuardianService.stopTracking(), style: 'destructive' }
      ]
    );
  };

  const getSafetyScoreColor = (score) => {
    if (score >= 8) return '#34C759'; // Green
    if (score >= 6) return '#FF9500'; // Orange
    if (score >= 4) return '#FF6B6B'; // Red
    return '#FF3B30'; // Dark red
  };

  const getSafetyScoreText = (score) => {
    if (score >= 8) return 'Very Safe';
    if (score >= 6) return 'Moderately Safe';
    if (score >= 4) return 'Use Caution';
    return 'High Risk';
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.emoji}>🗺️</Text>
          <Text style={styles.title}>AI Route Guardian</Text>
        </View>
        {isActive && (
          <View style={[styles.safetyScore, { backgroundColor: getSafetyScoreColor(safetyScore) }]}>
            <Text style={styles.safetyScoreText}>{safetyScore}/10</Text>
          </View>
        )}
      </View>

      <Text style={styles.description}>
        {isActive ? 
          `Monitoring route${currentRoute?.destinationName ? ` to ${currentRoute.destinationName}` : ''} for safety risks` :
          'AI-powered route analysis for safer journeys'
        }
      </Text>

      {isActive && (
        <View style={styles.statusContainer}>
          <Text style={styles.statusLabel}>Route Safety: </Text>
          <Text style={[styles.statusValue, { color: getSafetyScoreColor(safetyScore) }]}>
            {getSafetyScoreText(safetyScore)}
          </Text>
        </View>
      )}

      {/* Recent Alerts */}
      {alerts.length > 0 && (
        <ScrollView style={styles.alertsContainer} showsVerticalScrollIndicator={false}>
          {alerts.map(alert => (
            <View key={alert.id} style={styles.alertItem}>
              <Text style={styles.alertText}>{alert.message}</Text>
              <Text style={styles.alertTime}>
                {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          ))}
        </ScrollView>
      )}

      {isActive ? (
        <View style={styles.activeControls}>
          <TouchableOpacity style={styles.emergencyButton} onPress={handleEmergencyCall}>
            <Text style={styles.emergencyButtonText}>🚨 Emergency</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.stopButton} onPress={handleStopTracking}>
            <Text style={styles.stopButtonText}>Stop Tracking</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.startButton} onPress={() => setShowSetupModal(true)}>
          <Text style={styles.startButtonText}>Start Route Guardian</Text>
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
            <Text style={styles.modalTitle}>Setup Route Guardian</Text>
            
            <Text style={styles.label}>Destination:</Text>
            <TextInput
              style={styles.input}
              value={routeConfig.destinationName}
              onChangeText={(text) => setRouteConfig({
                ...routeConfig,
                destinationName: text
              })}
              placeholder="e.g., Home, Office, Train Station"
            />

            <Text style={styles.label}>Risk Tolerance (1-10):</Text>
            <View style={styles.sliderContainer}>
              <Text style={styles.sliderLabel}>Cautious</Text>
              <View style={styles.sliderPlaceholder}>
                <Text style={styles.sliderValue}>{routeConfig.riskTolerance}</Text>
              </View>
              <Text style={styles.sliderLabel}>Adventurous</Text>
            </View>
            <View style={styles.riskButtons}>
              {[1, 3, 5, 7, 9].map(value => (
                <TouchableOpacity
                  key={value}
                  style={[
                    styles.riskButton,
                    routeConfig.riskTolerance === value && styles.riskButtonSelected
                  ]}
                  onPress={() => setRouteConfig({
                    ...routeConfig,
                    riskTolerance: value
                  })}
                >
                  <Text style={[
                    styles.riskButtonText,
                    routeConfig.riskTolerance === value && styles.riskButtonTextSelected
                  ]}>
                    {value}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.checkboxContainer}>
              <TouchableOpacity
                style={styles.checkbox}
                onPress={() => setRouteConfig({
                  ...routeConfig,
                  useOptimalRoute: !routeConfig.useOptimalRoute
                })}
              >
                <Text style={styles.checkboxText}>
                  {routeConfig.useOptimalRoute ? '✅' : '☐'} Use AI-optimized safe route
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setShowSetupModal(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmButton} onPress={handleStartTracking}>
                <Text style={styles.confirmButtonText}>Start Tracking</Text>
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
  safetyScore: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    minWidth: 50,
    alignItems: 'center'
  },
  safetyScoreText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold'
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  statusLabel: {
    fontSize: 14,
    color: '#333'
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '600'
  },
  alertsContainer: {
    maxHeight: 80,
    marginBottom: 12
  },
  alertItem: {
    backgroundColor: '#fff8e1',
    borderLeftWidth: 3,
    borderLeftColor: '#FF9500',
    padding: 8,
    marginBottom: 4,
    borderRadius: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  alertText: {
    fontSize: 12,
    color: '#333',
    flex: 1
  },
  alertTime: {
    fontSize: 11,
    color: '#666',
    marginLeft: 8
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
  emergencyButton: {
    flex: 1,
    backgroundColor: '#FF3B30',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center'
  },
  emergencyButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600'
  },
  stopButton: {
    flex: 1,
    backgroundColor: '#8E8E93',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center'
  },
  stopButtonText: {
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
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  sliderLabel: {
    fontSize: 12,
    color: '#666'
  },
  sliderPlaceholder: {
    backgroundColor: '#007AFF',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  sliderValue: {
    color: '#ffffff',
    fontWeight: 'bold'
  },
  riskButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16
  },
  riskButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center'
  },
  riskButtonSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF'
  },
  riskButtonText: {
    fontSize: 14,
    color: '#666'
  },
  riskButtonTextSelected: {
    color: '#ffffff'
  },
  checkboxContainer: {
    marginBottom: 24
  },
  checkbox: {
    padding: 8
  },
  checkboxText: {
    fontSize: 14,
    color: '#333'
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

export default RouteGuardianCard;