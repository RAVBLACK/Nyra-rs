import * as MailComposer from 'expo-mail-composer';
import { Alert } from 'react-native';

/**
 * Composes an emergency email to a list of contacts.
 * @param {Array<object>} contacts - Array of contact objects, each with a 'email' property.
 * @param {Location.LocationObject} location - The user's last known location.
 * @returns {Promise<void>}
 */
const sendEmergencyEmail = async (contacts, location) => {
  const isAvailable = await MailComposer.isAvailableAsync();
  if (!isAvailable) {
    Alert.alert('Email Error', 'Email service is not available on this device.');
    return;
  }

  const recipients = contacts.map(c => c.email).filter(Boolean);
  if (recipients.length === 0) {
    console.log('No contacts with email addresses to send email to.');
    return;
  }

  const locationLink = location
    ? `https://www.google.com/maps/search/?api=1&query=${location.coords.latitude},${location.coords.longitude}`
    : 'Not available';

  const subject = 'Emergency Alert: Assistance Required';
  const body = `
    <p><b>This is an automated emergency alert from the NYRA app.</b></p>
    <p>I may be in a dangerous situation and require immediate assistance.</p>
    <p>My last known location is:</p>
    <p><a href="${locationLink}">${locationLink}</a></p>
    <p>Please attempt to contact me or emergency services.</p>
  `;

  try {
    const { status } = await MailComposer.composeAsync({
      recipients,
      subject,
      body,
      isHtml: true,
    });
    console.log('Email composer status:', status);
    return status === 'sent';
  } catch (error) {
    console.error('Error composing email:', error);
    Alert.alert('Email Error', 'An error occurred while trying to compose the emergency email.');
    return false;
  }
};

export const emailService = {
  sendEmergencyEmail,
};
