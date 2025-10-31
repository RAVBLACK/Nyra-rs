import { MD3LightTheme } from 'react-native-paper';

export const theme = {
  ...MD3LightTheme, // Start with Material Design 3 Light defaults
  roundness: 12,  // Clean, modern rounded corners
  colors: {
    ...MD3LightTheme.colors,

    // Core Theme Colors
    primary: '#1591EA',          // Your safety blue
    onPrimary: '#FFFFFF',        // White text on primary buttons
    primaryContainer: '#E3F2FF', // Harmonized light blue container
    onPrimaryContainer: '#001D35', // Proper dark blue text

    background: '#FAFBFC',        // Very light, clean background
    surface: '#FFFFFF',          // Pure white for cards
    surfaceVariant: '#F5F6F7',   // Light gray for subtle elements
    outline: '#E1E4E8',          // Soft gray outline

    // Text & Icon Colors on Backgrounds
    onBackground: '#24292E',     // Clean dark gray text
    onSurface: '#24292E',        // Same for consistency
    onSurfaceVariant: '#6A737D', // Medium gray for secondary text

    // Status Colors (Softer Tones)
    success: '#66BB6A',          // Soft, natural green
    warning: '#FFA726',          // Soft orange
    error: '#EF5350',            // Clear, but not overly aggressive red
    onError: '#FFFFFF',

    // Disabled states
    surfaceDisabled: '#F6F8FA',   // Clean disabled surface
    onSurfaceDisabled: '#959DA5', // Subtle gray disabled text
  }
};