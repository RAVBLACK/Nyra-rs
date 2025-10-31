import { useState, useEffect, useCallback } from 'react';
import { loadContacts as loadContactsFromStorage, saveContacts as saveContactsToStorage } from '../services/storageService';
import { Alert } from 'react-native';
import debounce from 'lodash.debounce';

export const useContacts = () => {
  const [contacts, setContacts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchContacts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const loadedContacts = await loadContactsFromStorage();
      setContacts(loadedContacts);
    } catch (e) {
      console.error("Failed to load contacts:", e);
      setError("Could not load contacts. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const debouncedSave = useCallback(
    debounce(async (newContacts) => {
      try {
        await saveContactsToStorage(newContacts);
      } catch (e) {
        console.error("Failed to save contacts:", e);
        setError("Could not save contacts. Changes may not persist.");
      }
    }, 500),
    []
  );

  useEffect(() => {
    if (!isLoading) {
      debouncedSave(contacts);
    }
  }, [contacts, isLoading, debouncedSave]);

  const addContact = useCallback((newContact) => {
    if (contacts.length >= 5) {
      Alert.alert("Limit Reached", "You can only add up to 5 emergency contacts.");
      return false;
    }
    setContacts(prevContacts => [...prevContacts, newContact]);
    return true;
  }, [contacts.length]);

  const removeContact = useCallback((contactId) => {
    setContacts(prevContacts => prevContacts.filter(c => c.id !== contactId));
  }, []);

  return { contacts, addContact, removeContact, isLoading, error, retry: fetchContacts };
};