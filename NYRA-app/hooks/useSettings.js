import { useState, useEffect, useCallback } from 'react';
import {
  loadSettings as loadSettingsFromStorage,
  saveSettings as saveSettingsToStorage,
  clearAllData as clearAllDataFromStorage,
} from '../services/storageService';
import debounce from 'lodash.debounce';

const defaultSettings = {
  isAutoDetectionEnabled: false,
  detectionSensitivity: 0.5, // Default to Medium
  sendSmsAlerts: true,
  sendEmailAlerts: true,
  shareLiveLocation: true,
};

export const useSettings = () => {
  const [settings, setSettings] = useState(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const storedSettings = await loadSettingsFromStorage();
      setSettings(storedSettings); // storageService handles merging with defaults
    } catch (e) {
      console.error("Failed to load settings:", e);
      setError("We couldn't load your settings. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const debouncedSave = useCallback(
    debounce(async (newSettings) => {
      try {
        await saveSettingsToStorage(newSettings);
      } catch (e) {
        console.error("Failed to save settings:", e);
        // Optionally, inform the user of the save failure
      }
    }, 500),
    []
  );

  useEffect(() => {
    // Only save if initial loading is done and there was no error
    if (!isLoading && !error) {
      debouncedSave(settings);
    }
  }, [settings, debouncedSave, isLoading, error]);

  const updateSetting = useCallback((key, value) => {
    setSettings((prevSettings) => ({
      ...prevSettings,
      [key]: value,
    }));
  }, []);

  const clearData = async () => {
    // No need to wrap in try/catch here as the screen will handle it
    await clearAllDataFromStorage();
    setSettings(defaultSettings); // Reset state to defaults after clearing
  };

  return { settings, updateSetting, isLoading, error, retry: fetchSettings, clearData };
};
