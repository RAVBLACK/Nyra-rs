import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Card, IconButton, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

export default function ErrorState({ message, onRetry }) {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.secondary }]}>
      <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <Card.Content style={styles.content}>
          <MaterialCommunityIcons
            name="alert-circle-outline"
            size={60}
            color={theme.colors.error}
          />
          <Text variant="titleMedium" style={[styles.title, { color: theme.colors.error }]}>
            An Error Occurred
          </Text>
          <Text variant="bodyMedium" style={styles.message}>
            {message || 'Could not load the required data. Please check your connection and try again.'}
          </Text>
          {onRetry && (
            <IconButton
              icon="reload"
              size={30}
              iconColor={theme.colors.primary}
              onPress={onRetry}
              style={styles.retryButton}
            />
          )}
        </Card.Content>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 400,
  },
  content: {
    alignItems: 'center',
    padding: 20,
  },
  title: {
    marginTop: 16,
    marginBottom: 8,
    fontWeight: 'bold',
  },
  message: {
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    marginTop: 10,
  },
});
