import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-get-random-values'; // Polyfill for uuid
import { v4 as uuidv4 } from 'uuid';

const CONTACTS_KEY = 'emergencyContacts';
const SETTINGS_KEY = 'appSettings';

// --- Contacts ---

export const saveContacts = async (contacts) => {
  try {
    const jsonValue = JSON.stringify(contacts);
    await AsyncStorage.setItem(CONTACTS_KEY, jsonValue);
  } catch (e) {
    console.error('Error saving contacts:', e);
    throw new Error('Failed to save contacts to storage.');
  }
};

export const loadContacts = async () => {
  try {
    const jsonValue = await AsyncStorage.getItem(CONTACTS_KEY);
    const contacts = jsonValue != null ? JSON.parse(jsonValue) : [];
    // Ensure all contacts have a unique ID for stable rendering and deletion
    return contacts.map(c => ({ ...c, id: c.id || uuidv4() }));
  } catch (e) {
    console.error('Error loading contacts:', e);
    throw new Error('Failed to load contacts from storage.');
  }
};

// --- Settings ---

const defaultSettings = {
  isAutoDetectionEnabled: false,
  sendSmsAlerts: true,
  sendEmailAlerts: true,
  shareLiveLocation: true,
};

export const saveSettings = async (settings) => {
  try {
    const jsonValue = JSON.stringify(settings);
    await AsyncStorage.setItem(SETTINGS_KEY, jsonValue);
  } catch (e) {
    console.error('Error saving settings:', e);
    throw new Error('Failed to save settings to storage.');
  }
};

export const loadSettings = async () => {
  try {
    const jsonValue = await AsyncStorage.getItem(SETTINGS_KEY);
    return jsonValue != null
      ? { ...defaultSettings, ...JSON.parse(jsonValue) }
      : defaultSettings;
  } catch (e) {
    console.error('Error loading settings:', e);
    throw new Error('Failed to load settings from storage.');
  }
};

// --- General ---

export const clearAllData = async () => {
  try {
    await AsyncStorage.multiRemove([CONTACTS_KEY, SETTINGS_KEY]);
    console.log('All app data cleared.');
  } catch (e) {
    console.error('Error clearing app data:', e);
    throw new Error('Failed to clear app data.');
  }
}