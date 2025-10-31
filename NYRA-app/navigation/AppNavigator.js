import React, { useState } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { BottomNavigation } from 'react-native-paper';
import { Text } from 'react-native';

// Import Screens
import HomeScreen from '../screens/HomeScreen';
import ContactsScreen from '../screens/ContactsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ActivityDetectionScreen from '../screens/ActivityDetectionScreen';
import AlertScreen from '../screens/AlertScreen';

// --- Create the Bottom Tab Navigator Component ---
const Tab = BottomNavigation; // Using Paper's BottomNavigation as tabs

const routes = [
  { key: 'home', title: 'Home', focusedIcon: 'home', unfocusedIcon: 'home' },
  { key: 'activity', title: 'Activity', focusedIcon: 'pulse', unfocusedIcon: 'pulse' },
  { key: 'contacts', title: 'Contacts', focusedIcon: 'phone', unfocusedIcon: 'phone' },
  { key: 'settings', title: 'Settings', focusedIcon: 'settings', unfocusedIcon: 'settings' },
];

const sceneMap = Tab.SceneMap({
  home: HomeScreen,
  activity: ActivityDetectionScreen,
  contacts: ContactsScreen,
  settings: SettingsScreen,
});

function TabNavigator() {
  const [index, setIndex] = useState(0);

  return (
    <Tab
      navigationState={{ index, routes }}
      onIndexChange={setIndex}
      renderScene={sceneMap}
      renderIcon={({ route, focused, color }) => {
        let emoji;
        switch (route.key) {
          case 'home':
            emoji = '🏠';
            break;
          case 'activity':
            emoji = '📈';
            break;
          case 'contacts':
            emoji = '👥';
            break;
          case 'settings':
            emoji = '⚙️';
            break;
          default:
            emoji = '❓';
        }
        return <Text style={{fontSize: 24}}>{emoji}</Text>;
      }}
       // Apply theme colors - using theme.colors would require PaperProvider context
      activeColor="#1591EA"  // Using our theme primary color
      inactiveColor="#A0A0A0" // Using our theme disabled color
      barStyle={{ backgroundColor: "#FFFFFF" }}
    />
  );
}
// --- End Bottom Tab Navigator Component ---


// --- Create the Main Stack Navigator ---
const Stack = createStackNavigator();

export default function AppNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: "#1591EA" }, // Using theme primary color
        headerTintColor: "#FFFFFF", // White text for header
      }}
    >
      {/* The Tab Navigator is the main screen, hide its header */}
      <Stack.Screen
        name="MainTabs"
        component={TabNavigator}
        options={{ headerShown: false }}
      />
      {/* The Alert Screen is pushed on top */}
      <Stack.Screen
        name="Alert"
        component={AlertScreen}
        options={{
          title: 'Emergency Alert',
          headerStyle: { backgroundColor: "#EF5350" }, // Using theme error color for alert screen
          headerBackVisible: false, // Hide back button on alert screen
        }}
      />
    </Stack.Navigator>
  );
}