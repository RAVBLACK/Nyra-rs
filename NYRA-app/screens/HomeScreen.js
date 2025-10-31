import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Platform, Alert, ScrollView } from 'react-native';
import { Button, useTheme, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { useNavigation } from '@react-navigation/native';
import * as Animatable from 'react-native-animatable';

import ProtectionStatusCard from '../components/ProtectionStatusCard';
import PanicButton from '../components/PanicButton';
import { sensorService } from '../services/sensorService';
import { locationService } from '../services/locationService';
import harModelService, { subscribeToActivity, getLatestActivity } from '../services/harModelService';

export default function HomeScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const protectionButtonRef = useRef(null);

  // Centralized state for HAR model
  const [activityState, setActivityState] = useState(getLatestActivity());
  const { name: currentActivity, confidence, isProtectionActive: isMonitoring } = activityState;

  useEffect(() => {
    // Subscribe to updates from the HAR model service
    const unsubscribe = subscribeToActivity(setActivityState);
    return () => unsubscribe(); // Cleanup on unmount
  }, []);

  const handlePanicPress = () => {
    console.log('Panic Button Pressed!');
    navigation.navigate('Alert');
  };



  const stopMonitoring = () => {
    harModelService.stop();
    sensorService.stopSensorUpdates();
    locationService.stopLocationUpdates();
    console.log('Protection stopped.');
    if (protectionButtonRef.current) {
      protectionButtonRef.current.pulse(800);
    }
  };

  const startMonitoring = async () => {
    // 1. Request Permissions
    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
    if (foregroundStatus !== 'granted') {
      Alert.alert(
        'Permission Denied',
        'Foreground location access is required to enable protection features.'
      );
      return;
    }
    const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
    if (backgroundStatus !== 'granted') {
      Alert.alert(
        'Permission Warning',
        'Background location is not enabled. The app may not function correctly if it is not in the foreground.'
      );
    }

    // 2. Start Services
    try {
      await locationService.startLocationUpdates();
      await sensorService.startSensorUpdates(); // Start sensor collection
      harModelService.start(); // Start HAR model (which subscribes to sensor data)
      console.log('Protection started.');
      if (protectionButtonRef.current) {
        protectionButtonRef.current.bounceIn(800);
      }
    } catch (error) {
      console.error("Failed to start monitoring services:", error);
      Alert.alert("Error Starting Protection", error.message || "An unknown error occurred. Please try again.");
      stopMonitoring(); // Ensure everything is turned off if one part fails
    }
  };

  const handleToggleProtection = () => {
    if (isMonitoring) {
      stopMonitoring();
    } else {
      startMonitoring();
    }
  };

  // Effect to listen for anomalies from the single source of truth
  useEffect(() => {
    if (activityState.anomaly && activityState.anomaly.type === 'SUDDEN_STOP') {
      console.log("SUDDEN STOP DETECTED, TRIGGERING ALERT!");
      stopMonitoring(); // Stop monitoring to prevent multiple triggers
      navigation.navigate('Alert');
    }
  }, [activityState.anomaly]);


  // Cleanup on component unmount
  useEffect(() => {
    return () => stopMonitoring();
  }, []);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text variant="headlineMedium" style={styles.welcomeTitle}>Welcome to NYRA</Text>
          <Text variant="bodyMedium" style={[styles.subtitle, {color: theme.colors.onSurfaceVariant}]}>Your personal safety companion.</Text>
        </View>

        <View style={styles.section}>
          <ProtectionStatusCard 
            isProtected={isMonitoring}
            activity={currentActivity}
            confidence={confidence}
          />
        </View>

        <Animatable.View ref={protectionButtonRef} style={styles.section}>
          <Button
            mode="contained"
            icon=""
            onPress={handleToggleProtection}
            style={[styles.protectionButton, { backgroundColor: isMonitoring ? theme.colors.error : theme.colors.primary }]}
            labelStyle={styles.protectionButtonLabel}
          >
            {isMonitoring ? 'Stop Protection' : 'Start Protection'}
          </Button>
        </Animatable.View>

        <View style={styles.panicSection}>
          <PanicButton onPress={handlePanicPress} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  content: {
    flex: 1,
    justifyContent: 'space-evenly',
    paddingVertical: 20,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  welcomeTitle: {
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    lineHeight: 20,
    opacity: 0.8,
  },
  section: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 8,
  },
  panicSection: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 8,
  },
  protectionButton: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 24,
    elevation: 4,
    width: '100%',
    maxWidth: 280,
  },
  protectionButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 20,
  },
});