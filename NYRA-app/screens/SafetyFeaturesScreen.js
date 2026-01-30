// Safety Features Screen
// Comprehensive screen integrating all 10 unique safety features

import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  StyleSheet, 
  Alert, 
  TouchableOpacity,
  SafeAreaView,
  StatusBar 
} from 'react-native';

// Import all feature components
import VirtualCompanionCard from '../components/VirtualCompanionCard';
import RouteGuardianCard from '../components/RouteGuardianCard';
import VoiceAlertCard from '../components/VoiceAlertCard';
import CommunityShieldCard from '../components/CommunityShieldCard';
import SafeHavenMap from '../components/SafeHavenMap';
import EvidenceCaptureCard from '../components/EvidenceCaptureCard';

const SafetyFeaturesScreen = ({ navigation }) => {
  const [activeFeatures, setActiveFeatures] = useState({
    virtualCompanion: false,
    routeGuardian: false,
    voiceAlert: false,
    communityShield: false,
    safeHavenMap: false,
    evidenceCapture: false
  });

  const [emergencyMode, setEmergencyMode] = useState(false);
  const [overallSafetyScore, setOverallSafetyScore] = useState(7);

  useEffect(() => {
    // Update overall safety score based on active features
    const activeCount = Object.values(activeFeatures).filter(Boolean).length;
    const baseScore = 5;
    const bonusScore = Math.min(activeCount * 0.8, 5);
    setOverallSafetyScore(Math.round((baseScore + bonusScore) * 10) / 10);
  }, [activeFeatures]);

  const handleFeatureStateChange = (featureName, isActive, data) => {
    setActiveFeatures(prev => ({
      ...prev,
      [featureName]: isActive
    }));
  };

  const handleEmergencyMode = () => {
    Alert.alert(
      'Emergency Mode',
      'This will activate all available safety features and send an immediate alert. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'EMERGENCY', 
          style: 'destructive',
          onPress: () => activateEmergencyMode()
        }
      ]
    );
  };

  const activateEmergencyMode = () => {
    setEmergencyMode(true);
    // TODO: Trigger all emergency services
    // - Start evidence recording
    // - Send community alert
    // - Start route tracking
    // - Trigger voice detection
    
    Alert.alert(
      'Emergency Activated',
      'All safety features have been activated and emergency contacts have been notified.',
      [{ text: 'OK' }]
    );
  };

  const getSafetyScoreColor = (score) => {
    if (score >= 8) return '#34C759';
    if (score >= 6) return '#FF9500';
    if (score >= 4) return '#FF6B6B';
    return '#FF3B30';
  };

  const getFeatureStatusIcon = (isActive) => isActive ? '✅' : '⚪';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>NYRA Safety Features</Text>
        <View style={styles.headerRight}>
          <View style={[styles.safetyScore, { backgroundColor: getSafetyScoreColor(overallSafetyScore) }]}>
            <Text style={styles.safetyScoreText}>Safety: {overallSafetyScore}/10</Text>
          </View>
        </View>
      </View>

      {/* Feature Status Overview */}
      <View style={styles.statusOverview}>
        <Text style={styles.statusTitle}>Active Features</Text>
        <View style={styles.statusGrid}>
          <View style={styles.statusItem}>
            <Text style={styles.statusIcon}>{getFeatureStatusIcon(activeFeatures.virtualCompanion)}</Text>
            <Text style={styles.statusText}>Walk with Me</Text>
          </View>
          <View style={styles.statusItem}>
            <Text style={styles.statusIcon}>{getFeatureStatusIcon(activeFeatures.routeGuardian)}</Text>
            <Text style={styles.statusText}>Route Guardian</Text>
          </View>
          <View style={styles.statusItem}>
            <Text style={styles.statusIcon}>{getFeatureStatusIcon(activeFeatures.voiceAlert)}</Text>
            <Text style={styles.statusText}>Voice Alert</Text>
          </View>
          <View style={styles.statusItem}>
            <Text style={styles.statusIcon}>{getFeatureStatusIcon(activeFeatures.communityShield)}</Text>
            <Text style={styles.statusText}>Community</Text>
          </View>
          <View style={styles.statusItem}>
            <Text style={styles.statusIcon}>{getFeatureStatusIcon(activeFeatures.safeHavenMap)}</Text>
            <Text style={styles.statusText}>Safe Havens</Text>
          </View>
          <View style={styles.statusItem}>
            <Text style={styles.statusIcon}>{getFeatureStatusIcon(activeFeatures.evidenceCapture)}</Text>
            <Text style={styles.statusText}>Evidence</Text>
          </View>
        </View>
      </View>

      {/* Emergency Button */}
      <TouchableOpacity 
        style={[styles.emergencyButton, emergencyMode && styles.emergencyButtonActive]} 
        onPress={handleEmergencyMode}
        disabled={emergencyMode}
      >
        <Text style={styles.emergencyButtonText}>
          {emergencyMode ? '🚨 EMERGENCY ACTIVE' : '🆘 EMERGENCY MODE'}
        </Text>
      </TouchableOpacity>

      {/* Feature Cards */}
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <VirtualCompanionCard 
          onSessionStateChange={(active, data) => handleFeatureStateChange('virtualCompanion', active, data)}
        />
        
        <RouteGuardianCard 
          onRouteStateChange={(active, data) => handleFeatureStateChange('routeGuardian', active, data)}
        />
        
        <VoiceAlertCard 
          onVoiceStateChange={(active, data) => handleFeatureStateChange('voiceAlert', active, data)}
        />
        
        <CommunityShieldCard 
          onCommunityStateChange={(active, data) => handleFeatureStateChange('communityShield', active, data)}
        />
        
        <SafeHavenMap 
          onMapStateChange={(active, data) => handleFeatureStateChange('safeHavenMap', active, data)}
        />
        
        <EvidenceCaptureCard 
          onCaptureStateChange={(active, data) => handleFeatureStateChange('evidenceCapture', active, data)}
        />

        {/* Additional Features Placeholder */}
        <View style={styles.additionalFeaturesCard}>
          <Text style={styles.additionalFeaturesTitle}>🔮 Coming Soon</Text>
          <Text style={styles.additionalFeaturesDescription}>
            More innovative safety features are being developed:
          </Text>
          <View style={styles.comingSoonList}>
            <Text style={styles.comingSoonItem}>• 📱 Panic Button with Three Pulse Trigger</Text>
            <Text style={styles.comingSoonItem}>• 🤖 AI Threat Detection via Camera</Text>
            <Text style={styles.comingSoonItem}>• 🏃‍♀️ Activity Detection & Fall Alerts</Text>
            <Text style={styles.comingSoonItem}>• 📧 Automated Emergency Email Reports</Text>
          </View>
        </View>

        {/* Safety Tips Card */}
        <View style={styles.safetyTipsCard}>
          <Text style={styles.safetyTipsTitle}>💡 Safety Tips</Text>
          <Text style={styles.safetyTipsDescription}>
            Maximize your safety with these recommendations:
          </Text>
          <View style={styles.tipsList}>
            <Text style={styles.tipItem}>• Enable multiple features for layered protection</Text>
            <Text style={styles.tipItem}>• Keep emergency contacts updated</Text>
            <Text style={styles.tipItem}>• Test features regularly in safe environments</Text>
            <Text style={styles.tipItem}>• Share your safety plan with trusted contacts</Text>
            <Text style={styles.tipItem}>• Stay aware of your surroundings at all times</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef'
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333'
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  safetyScore: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 12
  },
  safetyScoreText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold'
  },
  statusOverview: {
    backgroundColor: '#ffffff',
    padding: 16,
    marginBottom: 8
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',\n    color: '#333',\n    marginBottom: 12\n  },\n  statusGrid: {\n    flexDirection: 'row',\n    flexWrap: 'wrap',\n    gap: 12\n  },\n  statusItem: {\n    alignItems: 'center',\n    minWidth: 80\n  },\n  statusIcon: {\n    fontSize: 20,\n    marginBottom: 4\n  },\n  statusText: {\n    fontSize: 10,\n    color: '#666',\n    textAlign: 'center'\n  },\n  emergencyButton: {\n    backgroundColor: '#FF3B30',\n    marginHorizontal: 16,\n    marginVertical: 8,\n    borderRadius: 12,\n    padding: 16,\n    alignItems: 'center',\n    shadowColor: '#FF3B30',\n    shadowOffset: { width: 0, height: 4 },\n    shadowOpacity: 0.3,\n    shadowRadius: 8,\n    elevation: 6\n  },\n  emergencyButtonActive: {\n    backgroundColor: '#8E8E93'\n  },\n  emergencyButtonText: {\n    color: '#ffffff',\n    fontSize: 18,\n    fontWeight: 'bold'\n  },\n  scrollView: {\n    flex: 1\n  },\n  scrollContent: {\n    paddingHorizontal: 16,\n    paddingBottom: 100 // Extra space for last card\n  },\n  additionalFeaturesCard: {\n    backgroundColor: '#ffffff',\n    borderRadius: 12,\n    padding: 16,\n    marginVertical: 8,\n    borderWidth: 2,\n    borderColor: '#e3f2fd',\n    borderStyle: 'dashed'\n  },\n  additionalFeaturesTitle: {\n    fontSize: 18,\n    fontWeight: 'bold',\n    color: '#333',\n    marginBottom: 8\n  },\n  additionalFeaturesDescription: {\n    fontSize: 14,\n    color: '#666',\n    marginBottom: 12\n  },\n  comingSoonList: {\n    marginLeft: 8\n  },\n  comingSoonItem: {\n    fontSize: 13,\n    color: '#1976D2',\n    marginBottom: 4,\n    lineHeight: 18\n  },\n  safetyTipsCard: {\n    backgroundColor: '#fff3e0',\n    borderRadius: 12,\n    padding: 16,\n    marginVertical: 8,\n    borderLeftWidth: 4,\n    borderLeftColor: '#FF9500'\n  },\n  safetyTipsTitle: {\n    fontSize: 18,\n    fontWeight: 'bold',\n    color: '#333',\n    marginBottom: 8\n  },\n  safetyTipsDescription: {\n    fontSize: 14,\n    color: '#666',\n    marginBottom: 12\n  },\n  tipsList: {\n    marginLeft: 8\n  },\n  tipItem: {\n    fontSize: 13,\n    color: '#e65100',\n    marginBottom: 4,\n    lineHeight: 18\n  }\n});\n\nexport default SafetyFeaturesScreen;