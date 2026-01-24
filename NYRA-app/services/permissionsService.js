import { Platform, PermissionsAndroid, Alert, Linking } from 'react-native';

/**
 * Permissions Service
 * Handles runtime permissions for SMS on Android
 */

/**
 * Checks if SMS permission is granted
 * @returns {Promise<boolean>} True if permission is granted
 */
const checkSMSPermission = async () => {
    console.log('🔐 Permissions Service: Checking SMS permission...');

    if (Platform.OS !== 'android') {
        console.log('🔐 Permissions Service: Not Android, skipping permission check');
        return true; // iOS doesn't need runtime SMS permission
    }

    try {
        const granted = await PermissionsAndroid.check(
            PermissionsAndroid.PERMISSIONS.SEND_SMS
        );
        console.log('🔐 Permissions Service: SMS permission status:', granted ? 'GRANTED' : 'DENIED');
        return granted;
    } catch (error) {
        console.error('❌ Permissions Service: Error checking SMS permission:', error);
        return false;
    }
};

/**
 * Requests SMS permission from the user
 * @returns {Promise<boolean>} True if permission is granted
 */
const requestSMSPermission = async () => {
    console.log('🔐 Permissions Service: Requesting SMS permission...');

    if (Platform.OS !== 'android') {
        console.log('🔐 Permissions Service: Not Android, skipping permission request');
        return true;
    }

    try {
        const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.SEND_SMS,
            {
                title: 'SMS Permission Required',
                message: 'NYRA needs permission to send emergency SMS alerts to your emergency contacts.',
                buttonNeutral: 'Ask Me Later',
                buttonNegative: 'Deny',
                buttonPositive: 'Allow',
            }
        );

        const isGranted = granted === PermissionsAndroid.RESULTS.GRANTED;
        console.log('🔐 Permissions Service: SMS permission result:', granted);

        if (!isGranted) {
            console.warn('⚠️ Permissions Service: SMS permission denied by user');
            Alert.alert(
                'Permission Denied',
                'SMS permission is required to send automatic emergency alerts. You can enable it in Settings.',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Open Settings',
                        onPress: () => Linking.openSettings()
                    }
                ]
            );
        }

        return isGranted;
    } catch (error) {
        console.error('❌ Permissions Service: Error requesting SMS permission:', error);
        Alert.alert('Permission Error', 'Failed to request SMS permission. Please try again.');
        return false;
    }
};

/**
 * Ensures SMS permission is granted, requesting if necessary
 * @returns {Promise<boolean>} True if permission is granted
 */
const ensureSMSPermission = async () => {
    console.log('🔐 Permissions Service: Ensuring SMS permission...');

    const hasPermission = await checkSMSPermission();

    if (hasPermission) {
        console.log('✅ Permissions Service: SMS permission already granted');
        return true;
    }

    console.log('⚠️ Permissions Service: SMS permission not granted, requesting...');
    return await requestSMSPermission();
};

export const permissionsService = {
    checkSMSPermission,
    requestSMSPermission,
    ensureSMSPermission,
};
