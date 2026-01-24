import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, Button, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import * as Animatable from 'react-native-animatable';
import * as Haptics from 'expo-haptics';
import { smsService } from '../services/smsService';
import { emailService } from '../services/emailService';
import { locationService } from '../services/locationService';
import { useContacts } from '../hooks/useContacts';
import { useSettings } from '../hooks/useSettings';

const pulseBackground = {
  0: { backgroundColor: '#EF5350' }, // Using theme error color
  0.5: { backgroundColor: '#D32F2F' }, // Slightly darker
  1: { backgroundColor: '#EF5350' }, // Back to theme error color
};

export default function AlertScreen({ navigation }) {
  const theme = useTheme();
  const [countdown, setCountdown] = useState(10);
  const { contacts } = useContacts();
  const { settings } = useSettings();

  useEffect(() => {
    // Trigger a warning haptic feedback when the screen loads
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    // Use setInterval for accurate countdown
    const intervalId = setInterval(() => {
      setCountdown((prevCountdown) => {
        if (prevCountdown > 1) {
          // Vibrate every second during countdown
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          return prevCountdown - 1;
        } else {
          // Timer finished, send emergency alerts
          clearInterval(intervalId);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          sendEmergencyAlerts();
          navigation.navigate('MainTabs', { screen: 'Home' });
          return 0;
        }
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [navigation]);

  const sendEmergencyAlerts = async () => {
    console.log('🚨 ALERT! Countdown finished. Sending emergency alerts...');

    try {
      // Get current location for emergency alerts
      console.log('📍 Getting current location for emergency SMS...');
      const currentLocation = await locationService.getCurrentLocation();
      console.log('📍 Current location obtained:', currentLocation ? 'Yes' : 'No');
      if (currentLocation) {
        console.log(`📍 Coordinates: ${currentLocation.coords.latitude}, ${currentLocation.coords.longitude}`);
      }

      // Load contacts - use hook contacts if available, otherwise load directly from storage
      let emergencyContacts = contacts;
      console.log(`👥 Contacts from hook: ${contacts.length}`);

      if (!emergencyContacts || emergencyContacts.length === 0) {
        console.log('⚠️ No contacts from hook, loading directly from storage...');
        const { loadContacts } = require('../services/storageService');
        emergencyContacts = await loadContacts();
        console.log(`👥 Contacts loaded from storage: ${emergencyContacts.length}`);
      }

      if (!emergencyContacts || emergencyContacts.length === 0) {
        console.error('❌ No emergency contacts found!');
        Alert.alert(
          "⚠️ No Emergency Contacts",
          "No emergency contacts found. Please add contacts in the app settings.",
          [{ text: "OK" }]
        );
        // Stop location service
        locationService.stopLocationUpdates();
        return;
      }

      const emergencyMessage = "EMERGENCY: I may need help! This is an automated alert from the NYRA safety app.";

      let smsSuccess = false;
      let emailSuccess = false;

      // Send SMS alerts if enabled
      if (settings.sendSmsAlerts && emergencyContacts.length > 0) {
        console.log(`📱 Sending SMS alerts to ${emergencyContacts.length} contacts with location...`);
        const result = await smsService.sendEmergencySMS(emergencyContacts, currentLocation);
        smsSuccess = result.success || result === true;
        console.log(`📱 SMS Result: ${smsSuccess ? 'SUCCESS' : 'FAILED'} - Sent: ${result.sent || 0}, Failed: ${result.failed || 0}`);
      } else {
        console.log('📱 SMS alerts disabled or no contacts available');
      }

      // Send Email alerts if enabled  
      if (settings.sendEmailAlerts && emergencyContacts.length > 0) {
        console.log('📧 Sending Email alerts with location...');
        emailSuccess = await emailService.sendEmergencyEmail(emergencyContacts, currentLocation);
        console.log(`📧 Email Result: ${emailSuccess ? 'SUCCESS' : 'FAILED'}`);
      }

      // Stop location service after sending alerts
      console.log('🛑 Stopping location service after emergency alerts sent');
      locationService.stopLocationUpdates();

      // Show appropriate success/failure message
      if (smsSuccess || emailSuccess) {
        Alert.alert(
          "📱 Emergency Alert Sent",
          `Emergency alerts sent successfully! ${smsSuccess ? 'SMS ✅' : ''} ${emailSuccess ? 'Email ✅' : ''}`,
          [{ text: "OK" }]
        );
      } else {
        Alert.alert(
          "⚠️ Alert Warning",
          "Could not send emergency alerts. Please contact emergency services manually.",
          [{ text: "OK" }]
        );
      }

    } catch (error) {
      console.error('❌ Error sending alerts:', error);
      console.error('❌ Error stack:', error.stack);
      // Stop location service even on error
      locationService.stopLocationUpdates();
      Alert.alert(
        "❌ Alert Error",
        "There was an error sending alerts. Please contact your emergency contacts manually.",
        [{ text: "OK" }]
      );
    }
  };

  const handleCancel = () => {
    // Success haptic on cancellation
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    console.log('⚠️ Alert Cancelled by user.');
    // Stop location service when alert is cancelled
    locationService.stopLocationUpdates();
    console.log('🛑 Location service stopped after alert cancellation');
    navigation.goBack();
  };

  return (
    <Animatable.View
      animation={pulseBackground}
      iterationCount="infinite"
      duration={1500}
      style={styles.container}
    >
      <SafeAreaView style={styles.content}>
        <Text style={{ fontSize: 100, color: theme.colors.onError }}>🚨</Text>
        <Text style={[styles.title, { color: theme.colors.onError }]}>ALERT TRIGGERED!</Text>
        <Text style={[styles.countdown, { color: theme.colors.onError }]}>{countdown}</Text>
        <Text style={[styles.subtitle, { color: theme.colors.onError }]}>Sending alert in {countdown} seconds...</Text>
        <Button
          mode="contained"
          onPress={handleCancel}
          icon="cancel"
          style={[styles.cancelButton, { backgroundColor: theme.colors.success }]}
          labelStyle={[styles.cancelButtonLabel, { color: theme.colors.onPrimary }]}
        >
          Cancel Alert
        </Button>
      </SafeAreaView>
    </Animatable.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 20,
    textAlign: 'center',
    // color handled by theme
  },
  countdown: {
    fontSize: 100,
    fontWeight: 'bold',
    marginVertical: 30,
    // color handled by theme
  },
  subtitle: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 40,
    // color handled by theme
  },
  cancelButton: {
    width: '100%',
    paddingVertical: 8,
  },
  cancelButtonLabel: {
    fontSize: 18,
    // color handled by theme
  },
});