import { loadContacts, loadSettings } from './storageService';
import { locationService } from './locationService';
import { smsService } from './smsService';
import { emailService } from './emailService';

/**
 * Coordinates the entire alert procedure based on user settings.
 */
const triggerAlertProcedure = async () => {
  console.log('--- Triggering Alert Procedure ---');

  // 1. Load contacts and settings
  const contacts = await loadContacts();
  const settings = await loadSettings();

  if (!contacts || contacts.length === 0) {
    console.warn('Alert procedure aborted: No emergency contacts found.');
    return;
  }

  // 2. Get last known location
  const location = locationService.getLastKnownLocation();
  if (!location) {
      console.warn("Could not get last known location for the alert.");
  }

  // 3. Send alerts based on preferences
  if (settings.sendSmsAlerts) {
    console.log('Attempting to send SMS alerts...');
    await smsService.sendEmergencySMS(contacts, location);
  } else {
    console.log('SMS alerts are disabled in settings.');
  }

  if (settings.sendEmailAlerts) {
    console.log('Attempting to send Email alerts...');
    await emailService.sendEmergencyEmail(contacts, location);
  } else {
    console.log('Email alerts are disabled in settings.');
  }
  
  console.log('--- Alert Procedure Finished ---');
};

export const alertService = {
  triggerAlertProcedure,
};
