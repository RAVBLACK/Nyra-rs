import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, IconButton, useTheme, Avatar } from 'react-native-paper';
import * as Animatable from 'react-native-animatable';

export default function EmergencyContactCard({ name, phone, relationship, onDelete, index }) {
  const theme = useTheme();

  // Create a simple avatar from the contact's initials
  const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  return (
    <Animatable.View animation="fadeInUp" duration={300} delay={index * 100}>
      <Card style={styles.card}>
        <Card.Content style={styles.cardContent}>
          <View style={styles.contactInfo}>
            <Avatar.Text size={40} label={initials} style={{ backgroundColor: theme.colors.primaryContainer }} color={theme.colors.onPrimaryContainer} />
            <View style={styles.textContainer}>
              <Text variant="titleMedium">{name}</Text>
              <Text variant="bodyMedium" style={{ color: 'gray' }}>{phone}</Text>
              {relationship ? (
                <Text variant="bodySmall" style={{ color: 'gray', fontStyle: 'italic' }}>
                  ({relationship})
                </Text>
              ) : null}
            </View>
          </View>
          <IconButton 
            icon="trash-can-outline" 
            size={24} 
            iconColor={theme.colors.error} 
            onPress={onDelete} 
            style={styles.deleteButton}
          />
        </Card.Content>
      </Card>
    </Animatable.View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    elevation: 3,
    borderRadius: 16,
  },
  cardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  contactInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  textContainer: {
    marginLeft: 20,
    flexShrink: 1,
  },
  deleteButton: {
    margin: 0,
  },
});