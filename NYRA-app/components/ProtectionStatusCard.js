import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import * as Animatable from 'react-native-animatable';

const activityDetails = {
  IDLE: { icon: 'seat-recline-normal', emoji: '🧘' },
  STANDING: { icon: 'human-male', emoji: '🧍' },
  WALKING: { icon: 'walk', emoji: '🚶' },
  RUNNING: { icon: 'run', emoji: '🏃' },
  FALLING: { icon: 'arrow-down-bold-box', emoji: '💥' },
  CALIBRATING: { icon: 'progress-wrench', emoji: '🛠️' },
};

export default function ProtectionStatusCard({ isProtected, activity, confidence }) {
  const theme = useTheme();

  const statusText = isProtected ? 'PROTECTED' : 'NOT ACTIVE';
  const statusColor = isProtected ? theme.colors.success : theme.colors.onSurfaceDisabled;
  const iconName = isProtected ? 'shield-check' : 'shield-off';
  const cardBgColor = isProtected ? theme.colors.surface : theme.colors.surfaceDisabled; // Using theme colors for inactive

  const { icon: activityIcon, emoji: activityEmoji } = activityDetails[activity] || { icon: 'help', emoji: '❓' };

  return (
    <Animatable.View animation="fadeIn" duration={500} style={{ width: '100%' }}>
      <Card style={[styles.card, { backgroundColor: cardBgColor }]}>
        <Card.Content style={styles.cardContent}>
          <Text variant="titleLarge" style={styles.title}>
            Protection Status
          </Text>
          
          <Animatable.View animation={isProtected ? "pulse" : undefined} iterationCount={isProtected ? "infinite" : 1} duration={2000}>
            <Text style={{fontSize: 48}}>{isProtected ? '🛡️' : '⭕'}</Text>
          </Animatable.View>

          <Text variant="headlineMedium" style={[styles.statusText, { color: statusColor }]}>
            {statusText}
          </Text>

          {isProtected && (
            <Animatable.View animation="fadeInUp" duration={500} style={styles.activityContainer}>
              <View style={styles.activityInfo}>
                <Text style={{fontSize: 24}}>{activityEmoji}</Text>
                <Text variant="titleMedium" style={styles.activityText}>
                  {activity}
                </Text>
              </View>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceDisabled }}>
                Confidence: {isFinite(confidence) ? (confidence * 100).toFixed(0) : '0'}%
              </Text>
            </Animatable.View>
          )}
        </Card.Content>
      </Card>
    </Animatable.View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    marginHorizontal: 0,
    borderRadius: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  cardContent: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  title: {
    marginBottom: 16,
    textAlign: 'center',
  },
  statusText: {
    marginTop: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  activityContainer: {
    alignItems: 'center',
    marginTop: 20,
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(21, 145, 234, 0.08)',
    borderRadius: 14,
    width: '100%',
  },
  activityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  activityText: {
    marginLeft: 12,
    fontWeight: '600',
  },
});