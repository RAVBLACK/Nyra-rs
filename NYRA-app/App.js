import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { theme } from './utils/theme'; // Import your custom theme
import AppNavigator from './navigation/AppNavigator'; // Import the navigator
import { StatusBar } from 'expo-status-bar';

export default function App() {
  return (
    <PaperProvider theme={theme}>
      <SafeAreaProvider>
        <NavigationContainer>
          <StatusBar style="auto" />
          <AppNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </PaperProvider>
  );
}