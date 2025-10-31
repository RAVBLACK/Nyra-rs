import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import * as Animatable from 'react-native-animatable';
import * as Haptics from 'expo-haptics';

// This is an animation definition for a pulsing effect
const pulse = {
  0: { transform: [{ scale: 1 }], opacity: 1 },
  0.5: { transform: [{ scale: 1.1 }], opacity: 0.7 },
  1: { transform: [{ scale: 1 }], opacity: 1 },
};

export default function PanicButton({ onPress }) {
  const theme = useTheme();

  const handlePress = () => {
    // Provide strong haptic feedback for a critical action
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    onPress();
  };

  return (
    <Animatable.View animation={pulse} iterationCount="infinite" duration={1500}>
      <TouchableOpacity
        onPress={handlePress}
        style={[
          styles.button,
          { backgroundColor: theme.colors.errorContainer },
        ]}
      >
        <Text style={{fontSize: 50, color: theme.colors.onErrorContainer}}>🚨</Text>
        <Text style={[styles.text, { color: theme.colors.onErrorContainer }]}>PANIC</Text>
      </TouchableOpacity>
    </Animatable.View>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  text: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 4,
  },
});