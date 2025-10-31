import * as Location from 'expo-location';

let locationSubscription = null;
let lastKnownLocation = null;

/**
 * Gets the current GPS location one time.
 * Assumes permissions have already been granted.
 * @returns {Promise<Location.LocationObject>} The location object.
 * @throws Will throw an error if location cannot be fetched.
 */
const getCurrentLocation = async () => {
  try {
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    lastKnownLocation = location;
    return location;
  } catch (error) {
    console.error('Error getting current location:', error);
    // Re-throw the error to be handled by the caller
    throw new Error('Could not fetch current location. Please ensure location services are enabled.');
  }
};

/**
 * Starts continuous background location tracking.
 * Assumes permissions have already been granted.
 * @throws Will throw an error if updates cannot be started.
 */
const startLocationUpdates = async () => {
  if (locationSubscription) {
    console.log('Location updates are already active.');
    return;
  }

  try {
    locationSubscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 10000, // 10 seconds
        distanceInterval: 10, // 10 meters
      },
      (location) => {
        lastKnownLocation = location;
        console.log('New location update:', location.coords.latitude, location.coords.longitude);
      }
    );
    console.log('✅ Started continuous location updates.');
  } catch (error) {
    console.error("Failed to start location updates:", error);
    throw new Error('Failed to start location updates.');
  }
};

/**
 * Stops continuous location tracking.
 */
const stopLocationUpdates = () => {
  if (locationSubscription) {
    locationSubscription.remove();
    locationSubscription = null;
    console.log('🛑 Stopped continuous location updates.');
  }
};

/**
 * Returns the most recently recorded location.
 * @returns {Location.LocationObject | null}
 */
const getLastKnownLocation = () => {
  return lastKnownLocation;
};

export const locationService = {
  getCurrentLocation,
  startLocationUpdates,
  stopLocationUpdates,
  getLastKnownLocation,
};