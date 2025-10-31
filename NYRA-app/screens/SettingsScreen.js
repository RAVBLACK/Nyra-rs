import React from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, Alert, Platform } from 'react-native';
import { Text, List, Switch, Divider, Button, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Slider from '@react-native-community/slider';
import { useSettings } from '../hooks/useSettings';
import ErrorState from '../components/ErrorState';

const sensitivityLabels = {
  0: 'Low',
  0.5: 'Medium',
  1: 'High',
};

export default function SettingsScreen() {
  const navigation = useNavigation();
  const theme = useTheme();
  const { settings, updateSetting, isLoading, error, retry, clearData } = useSettings();

  const handleClearData = () => {
    Alert.alert(
      "🗑️ Clear All Data?",
      "This will permanently delete all contacts and settings. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Clear Data", style: "destructive", onPress: async () => {
            try {
              await clearData();
              Alert.alert("✅ Success", "All app data has been cleared.");
            } catch (e) {
              console.error("Failed to clear data:", e);
              Alert.alert("❌ Error", "Could not clear all data. Please try again.");
            }
        }}
      ]
    );
  };
  
  const handleExportLogs = () => {
    console.log('Export Logs Pressed');
    Alert.alert("Coming Soon", "This feature is not yet available.");
  };

  const getSensitivityLabel = (value) => {
    if (value < 0.25) return 'Low';
    if (value > 0.75) return 'High';
    return 'Medium';
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator animating={true} size="large" />
        <Text style={{ marginTop: 10 }}>Loading settings...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={retry} />;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView>
        <List.Section>
          <List.Subheader>Detection Settings ⚙️</List.Subheader>
          <List.Item
            title="Enable Automatic Detection"
            description="Monitor activity for falls in the background"
            left={props => <List.Icon {...props} icon="walk" />}
            right={props => <Switch value={settings.isAutoDetectionEnabled} onValueChange={(value) => updateSetting('isAutoDetectionEnabled', value)} />}
          />
          <View style={styles.sliderContainer}>
            <List.Item
                title="Detection Sensitivity"
                description={`Current: ${getSensitivityLabel(settings.detectionSensitivity)}`}
                left={props => <List.Icon {...props} icon="tune-variant" />}
            />
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={1}
              step={0.5}
              value={settings.detectionSensitivity}
              onSlidingComplete={(value) => updateSetting('detectionSensitivity', value)}
              minimumTrackTintColor={theme.colors.primary}
              maximumTrackTintColor={theme.colors.onSurfaceDisabled}
              thumbTintColor={Platform.OS === 'android' ? theme.colors.primary : undefined}
            />
            <View style={styles.sliderLabels}>
              <Text>Low</Text>
              <Text>Medium</Text>
              <Text>High</Text>
            </View>
          </View>
        </List.Section>

        <Divider />

        <List.Section>
          <List.Subheader>Alert Preferences 📣</List.Subheader>
          <List.Item
            title="Send SMS Alerts"
            left={props => <List.Icon {...props} icon="message-alert-outline" />}
            right={props => <Switch value={settings.sendSmsAlerts} onValueChange={(value) => updateSetting('sendSmsAlerts', value)} />}
          />
          <List.Item
            title="Send Email Alerts"
            left={props => <List.Icon {...props} icon="email-alert-outline" />}
            right={props => <Switch value={settings.sendEmailAlerts} onValueChange={(value) => updateSetting('sendEmailAlerts', value)} />}
          />
           <List.Item
            title="Share Live Location"
            description="Include GPS coordinates in alerts"
            left={props => <List.Icon {...props} icon="map-marker-radius-outline" />}
            right={props => <Switch value={settings.shareLiveLocation} onValueChange={(value) => updateSetting('shareLiveLocation', value)} />}
          />
        </List.Section>
        
        <Divider />

        <List.Section>
            <List.Subheader>App Permissions 🔐</List.Subheader>
             <List.Item
                title="Location Access"
                description="Required for location sharing"
                left={props => <List.Icon {...props} icon="map-marker" />}
                right={() => <Text style={{color: 'green'}}>Granted</Text>}
            />
             <List.Item
                title="SMS Access"
                description="Required for SMS alerts"
                left={props => <List.Icon {...props} icon="message-text" />}
                right={() => <Text style={{color: 'green'}}>Granted</Text>}
            />
             <List.Item
                title="Microphone Access"
                description="For future audio recording feature"
                left={props => <List.Icon {...props} icon="microphone" />}
                right={() => <Text style={{color: 'grey'}}>Not Requested</Text>}
            />
        </List.Section>

        <Divider />

        <View style={styles.buttonContainer}>
            <Button 
                icon="delete-sweep-outline" 
                mode="elevated" 
                onPress={handleClearData}
                style={styles.button}
                textColor={theme.colors.error}
            >
                Clear All App Data
            </Button>
            <Button 
                icon="file-export-outline" 
                mode="outlined" 
                onPress={handleExportLogs}
                style={styles.button}
            >
                Export Activity Logs
            </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  sliderContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  slider: {
    width: '100%',
    height: 44,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    marginTop: 8,
  },
  buttonContainer: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    gap: 16,
  },
  button: {
    borderRadius: 16,
    paddingVertical: 12,
    elevation: 2,
  }
});