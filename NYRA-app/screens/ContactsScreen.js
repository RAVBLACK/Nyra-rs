import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, Button, useTheme, Portal, Dialog, HelperText } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import EmergencyContactCard from '../components/EmergencyContactCard';
import ErrorState from '../components/ErrorState';
import { useContacts } from '../hooks/useContacts';
import * as Animatable from 'react-native-animatable';

export default function ContactsScreen() {
  const theme = useTheme();
  const { contacts, addContact, removeContact, isLoading, error, retry } = useContacts();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [relationship, setRelationship] = useState('');
  const [isDialogVisible, setIsDialogVisible] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  const showDialog = () => setIsDialogVisible(true);
  const hideDialog = () => {
    setName('');
    setPhone('');
    setRelationship('');
    setFormErrors({});
    setIsDialogVisible(false);
  };

  const validateForm = () => {
    const newErrors = {};
    if (!name.trim()) {
      newErrors.name = "Name is required.";
    }
    if (!phone.trim()) {
      newErrors.phone = "Phone number is required.";
    } else if (!/^\+?\d{10,}$/.test(phone)) {
      newErrors.phone = "Please enter a valid phone number (at least 10 digits).";
    }
    setFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddContact = () => {
    if (!validateForm()) {
      return;
    }

    const newContact = {
      // The hook will add the ID
      name: name.trim(),
      phone: phone.trim(),
      relationship: relationship.trim(),
    };

    if (addContact(newContact)) {
      hideDialog();
    }
  };

  const handleDeleteContact = (contact) => {
    Alert.alert(
      `Delete ${contact.name}?`,
      `Are you sure you want to remove ${contact.name} from your emergency contacts?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => removeContact(contact.id) }
      ]
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator animating={true} color={theme.colors.primary} size="large" />
        <Text style={{ marginTop: 10 }}>Loading contacts...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={retry} />;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text variant="headlineSmall" style={styles.title}>Emergency Contacts 📞</Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Add up to 5 trusted people who will be alerted in an emergency.
          </Text>
        </View>

        {contacts.length === 0 ? (
          <Animatable.View animation="fadeIn" style={styles.emptyStateContainer}>
            <Text style={styles.emptyStateText}>
              No contacts yet.
            </Text>
            <Text style={styles.emptyStateSubtext}>
              Tap 'Add New Contact' to get started.
            </Text>
          </Animatable.View>
        ) : (
          <View style={styles.listContainer}>
            {contacts.map((contact, index) => (
              <EmergencyContactCard
                key={contact.id}
                index={index}
                name={contact.name}
                phone={contact.phone}
                relationship={contact.relationship}
                onDelete={() => handleDeleteContact(contact)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <View style={styles.addButtonContainer}>
        <Button
          mode="contained"
          icon="plus-circle-outline"
          onPress={showDialog}
          disabled={contacts.length >= 5}
          style={styles.addButton}
          labelStyle={styles.addButtonLabel}
        >
          Add New Contact
        </Button>
        {contacts.length >= 5 && (
          <Text style={styles.limitText}>You've reached the contact limit (Max 5).</Text>
        )}
      </View>

      <Portal>
        <Dialog visible={isDialogVisible} onDismiss={hideDialog} style={{backgroundColor: theme.colors.surface}}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
            <Dialog.Title>New Contact ✨</Dialog.Title>
            <Dialog.Content>
              <TextInput
                label="Name *"
                value={name}
                onChangeText={setName}
                mode="outlined"
                style={styles.input}
                error={!!formErrors.name}
              />
              <HelperText type="error" visible={!!formErrors.name}>
                {formErrors.name}
              </HelperText>

              <TextInput
                label="Phone Number *"
                value={phone}
                onChangeText={setPhone}
                mode="outlined"
                keyboardType="phone-pad"
                style={styles.input}
                error={!!formErrors.phone}
              />
              <HelperText type="error" visible={!!formErrors.phone}>
                {formErrors.phone}
              </HelperText>

              <TextInput
                label="Relationship (e.g., Mother, Friend)"
                value={relationship}
                onChangeText={setRelationship}
                mode="outlined"
                style={styles.input}
              />
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={hideDialog}>Cancel</Button>
              <Button onPress={handleAddContact}>Save</Button>
            </Dialog.Actions>
          </KeyboardAvoidingView>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100, // Space for the floating button
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    paddingTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 16,
    alignItems: 'center',
  },
  title: {
    fontWeight: '700',
    fontSize: 28,
    letterSpacing: -0.3,
  },
  subtitle: {
    color: 'grey',
    textAlign: 'center',
    marginTop: 8,
    fontSize: 16,
    lineHeight: 22,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 50,
    padding: 20,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'grey',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: 'darkgrey',
    marginTop: 8,
  },
  input: {
    marginBottom: 0, // HelperText will provide spacing
  },
  addButtonContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  addButton: {
    borderRadius: 30,
    paddingVertical: 8,
    elevation: 4,
    width: '80%',
  },
  addButtonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  limitText: {
    marginTop: 8,
    color: 'grey',
    fontSize: 12,
  },
});