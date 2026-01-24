import * as SMS from 'expo-sms';
import { Alert, Platform, NativeModules } from 'react-native';
import { permissionsService } from './permissionsService';

const { SmsModule } = NativeModules;

/**
 * Configuration for SMS sending
 */
const SMS_CONFIG = {
  DELAY_BETWEEN_SMS: 2000, // 2 seconds delay to avoid carrier spam detection
  MAX_RETRIES: 1, // Number of retries for failed SMS
};

/**
 * Validates a phone number
 * @param {string} phone - Phone number to validate
 * @returns {boolean} True if valid
 */
const isValidPhoneNumber = (phone) => {
  if (!phone || typeof phone !== 'string') return false;
  // Remove spaces, dashes, parentheses
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  // Check if it's a valid number (at least 10 digits, can start with +)
  return /^\+?\d{10,15}$/.test(cleaned);
};

/**
 * Sends SMS automatically on Android using native SMS manager
 * @param {string} phoneNumber - Phone number to send to
 * @param {string} message - Message to send
 * @returns {Promise<boolean>} True if sent successfully
 */
const sendAutomaticSMS = async (phoneNumber, message) => {
  try {
    console.log(`📱 SMS Service: Sending automatic SMS to ${phoneNumber}...`);

    if (!SmsModule) {
      console.error('❌ SMS Service: SmsModule not available');
      return false;
    }

    await SmsModule.sendSms(phoneNumber, message);
    console.log(`✅ SMS Service: Successfully sent to ${phoneNumber}`);
    return true;

  } catch (error) {
    console.error(`❌ SMS Service: Failed to send to ${phoneNumber}:`, error);
    return false;
  }
};

/**
 * Sends SMS using manual composer (fallback for iOS or errors)
 * @param {Array<string>} phoneNumbers - Array of phone numbers
 * @param {string} message - Message to send
 * @returns {Promise<boolean>} True if composer opened successfully
 */
const sendManualSMS = async (phoneNumbers, message) => {
  try {
    console.log('📱 SMS Service: Opening manual SMS composer...');

    const isAvailable = await SMS.isAvailableAsync();
    if (!isAvailable) {
      console.error('📱 SMS Service: SMS not available on this device');
      Alert.alert('SMS Error', 'SMS service is not available on this device.');
      return false;
    }

    const { result } = await SMS.sendSMSAsync(phoneNumbers, message);
    console.log('📱 SMS Service: Manual SMS result:', result);

    return result === 'sent';
  } catch (error) {
    console.error('❌ SMS Service: Error opening manual SMS composer:', error);
    Alert.alert('SMS Error', `Failed to open SMS composer: ${error.message}`);
    return false;
  }
};

/**
 * Delays execution for specified milliseconds
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise<void>}
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Sends an emergency SMS to a list of contacts.
 * On Android: Sends automatically without user interaction
 * On iOS: Opens SMS composer with pre-filled message
 * 
 * @param {Array<object>} contacts - Array of contact objects, each with a 'phone' property
 * @param {Location.LocationObject} location - The user's last known location
 * @returns {Promise<object>} Result object with success status and details
 */
const sendEmergencySMS = async (contacts, location) => {
  console.log('📱 SMS Service: Starting emergency SMS...');
  console.log('📱 SMS Service: Platform:', Platform.OS);
  console.log('📱 SMS Service: Contacts received:', contacts?.length || 0);
  console.log('📱 SMS Service: Location received:', location ? 'Yes' : 'No');

  // Validate inputs
  if (!contacts || contacts.length === 0) {
    console.log('📱 SMS Service: No contacts provided');
    Alert.alert('SMS Error', 'No emergency contacts found. Please add contacts first.');
    return { success: false, sent: 0, failed: 0, total: 0 };
  }

  // Extract and validate phone numbers
  const phoneNumbers = contacts
    .map(c => c.phone)
    .filter(phone => {
      const valid = isValidPhoneNumber(phone);
      if (!valid && phone) {
        console.warn(`⚠️ SMS Service: Invalid phone number: ${phone}`);
      }
      return valid;
    });

  console.log('📱 SMS Service: Valid phone numbers:', phoneNumbers.length);

  if (phoneNumbers.length === 0) {
    console.log('📱 SMS Service: No valid phone numbers found');
    Alert.alert('SMS Error', 'No valid phone numbers found in emergency contacts.');
    return { success: false, sent: 0, failed: 0, total: 0 };
  }

  // Build location link
  const locationLink = location && location.coords
    ? `https://www.google.com/maps/search/?api=1&query=${location.coords.latitude},${location.coords.longitude}`
    : 'Location not available';

  const message = `🚨 EMERGENCY ALERT from NYRA: I may be in danger and need help! My location: ${locationLink}`;

  console.log('📱 SMS Service: Message to send:', message);
  console.log('📱 SMS Service: Sending to numbers:', phoneNumbers);

  // iOS or fallback: Use manual SMS composer
  if (Platform.OS !== 'android') {
    console.log('📱 SMS Service: iOS detected, using manual SMS composer');
    const success = await sendManualSMS(phoneNumbers, message);
    return {
      success,
      sent: success ? phoneNumbers.length : 0,
      failed: success ? 0 : phoneNumbers.length,
      total: phoneNumbers.length,
      method: 'manual'
    };
  }

  // Android: Check and request SMS permission
  console.log('📱 SMS Service: Android detected, checking SMS permission...');
  const hasPermission = await permissionsService.ensureSMSPermission();

  if (!hasPermission) {
    console.warn('⚠️ SMS Service: SMS permission denied, falling back to manual SMS');
    Alert.alert(
      'Permission Required',
      'SMS permission is required for automatic alerts. Opening manual SMS composer instead.',
      [{ text: 'OK' }]
    );
    const success = await sendManualSMS(phoneNumbers, message);
    return {
      success,
      sent: success ? phoneNumbers.length : 0,
      failed: success ? 0 : phoneNumbers.length,
      total: phoneNumbers.length,
      method: 'manual_fallback'
    };
  }

  // Android with permission: Send automatically
  console.log('✅ SMS Service: SMS permission granted, sending automatically...');

  let sentCount = 0;
  let failedCount = 0;
  const results = [];

  for (let i = 0; i < phoneNumbers.length; i++) {
    const phoneNumber = phoneNumbers[i];

    // Add delay between messages to avoid carrier spam detection
    if (i > 0) {
      console.log(`⏳ SMS Service: Waiting ${SMS_CONFIG.DELAY_BETWEEN_SMS}ms before next SMS...`);
      await delay(SMS_CONFIG.DELAY_BETWEEN_SMS);
    }

    const success = await sendAutomaticSMS(phoneNumber, message);

    if (success) {
      sentCount++;
      results.push({ phoneNumber, status: 'sent' });
    } else {
      failedCount++;
      results.push({ phoneNumber, status: 'failed' });
    }
  }

  console.log('📱 SMS Service: SMS sending complete');
  console.log(`✅ SMS Service: Sent: ${sentCount}/${phoneNumbers.length}`);
  console.log(`❌ SMS Service: Failed: ${failedCount}/${phoneNumbers.length}`);

  // Show user-friendly alert
  if (sentCount === phoneNumbers.length) {
    Alert.alert(
      'Emergency SMS Sent',
      `Successfully sent emergency alerts to ${sentCount} contact${sentCount > 1 ? 's' : ''}.`,
      [{ text: 'OK' }]
    );
  } else if (sentCount > 0) {
    Alert.alert(
      'Partial Success',
      `Sent to ${sentCount} contact${sentCount > 1 ? 's' : ''}, but ${failedCount} failed. Check your signal and try again.`,
      [{ text: 'OK' }]
    );
  } else {
    Alert.alert(
      'SMS Failed',
      'Failed to send emergency SMS. Please check your signal or try manual SMS.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Try Manual SMS',
          onPress: () => sendManualSMS(phoneNumbers, message)
        }
      ]
    );
  }

  return {
    success: sentCount > 0,
    sent: sentCount,
    failed: failedCount,
    total: phoneNumbers.length,
    method: 'automatic',
    results
  };
};

export const smsService = {
  sendEmergencySMS,
};
