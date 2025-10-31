import * as SMS from 'expo-sms';
import { Alert } from 'react-native';

/**
 * Sends an emergency SMS to a list of contacts.
 * @param {Array<object>} contacts - Array of contact objects, each with a 'phone' property.
 * @param {Location.LocationObject} location - The user's last known location.
 * @returns {Promise<void>}
 */
const sendEmergencySMS = async (contacts, location) => {
  console.log('📱 SMS Service: Starting emergency SMS...');
  console.log('📱 SMS Service: Contacts received:', contacts?.length || 0);
  console.log('📱 SMS Service: Location received:', location ? 'Yes' : 'No');

  try {
    const isAvailable = await SMS.isAvailableAsync();
    console.log('📱 SMS Service: SMS available on device:', isAvailable);
    
    if (!isAvailable) {
      console.error('📱 SMS Service: SMS not available');
      Alert.alert('SMS Error', 'SMS service is not available on this device.');
      return false;
    }

    const phoneNumbers = contacts.map(c => c.phone).filter(Boolean);
    console.log('📱 SMS Service: Phone numbers extracted:', phoneNumbers);
    
    if (phoneNumbers.length === 0) {
      console.log('📱 SMS Service: No valid phone numbers found');
      Alert.alert('SMS Error', 'No emergency contacts with phone numbers found.');
      return false;
    }

    const locationLink = location && location.coords
      ? `https://www.google.com/maps/search/?api=1&query=${location.coords.latitude},${location.coords.longitude}`
      : 'Location not available';

    const message = `🚨 EMERGENCY ALERT from NYRA: I may be in danger and need help! My location: ${locationLink}`;
    
    console.log('📱 SMS Service: Message to send:', message);
    console.log('📱 SMS Service: Sending to numbers:', phoneNumbers);

    const { result } = await SMS.sendSMSAsync(phoneNumbers, message);
    console.log('📱 SMS Service: SMS send result:', result);
    
    if (result === 'sent') {
      console.log('✅ SMS Service: SMS sent successfully');
      return true;
    } else {
      console.warn('⚠️ SMS Service: SMS may not have been sent, result:', result);
      return false;
    }
  } catch (error) {
    console.error('❌ SMS Service: Error sending SMS:', error);
    Alert.alert('SMS Error', `Failed to send emergency SMS: ${error.message}`);
    return false;
  }
};

export const smsService = {
  sendEmergencySMS,
};
