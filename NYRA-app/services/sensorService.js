import { Accelerometer, Gyroscope } from 'expo-sensors';

const UPDATE_INTERVAL_MS = 100; // 10 times per second

let isListening = false;
let accelSubscription = null;
let gyroSubscription = null;
let listeners = [];

let lastAccel = { ax: 0, ay: 0, az: 0 };
let lastGyro = { gx: 0, gy: 0, gz: 0 };

const calculateSVM = (ax, ay, az) => {
    return Math.sqrt(ax ** 2 + ay ** 2 + az ** 2);
};

const notifyListeners = (data) => {
  for (const listener of listeners) {
    listener(data);
  }
};

export const subscribeToSensorData = (callback) => {
  listeners.push(callback);
  return () => {
    listeners = listeners.filter(l => l !== callback);
  };
};

const startSensorUpdates = async () => {
  if (isListening) {
    console.log('Sensors are already running.');
    return;
  }

  let isAccelAvailable = false;
  let isGyroAvailable = false;

  try {
    console.log('🔍 Checking sensor availability...');
    isAccelAvailable = await Accelerometer.isAvailableAsync();
    isGyroAvailable = await Gyroscope.isAvailableAsync();

    console.log(`📱 Accelerometer available: ${isAccelAvailable}`);
    console.log(`🔄 Gyroscope available: ${isGyroAvailable}`);

    if (!isAccelAvailable) {
      const errorMsg = 'Accelerometer is not available on this device.';
      console.error(errorMsg);
      throw new Error(errorMsg);
    }

    // Gyroscope is optional - we can work with just accelerometer
    if (!isGyroAvailable) {
      console.warn('⚠️ Gyroscope not available, using accelerometer only');
    }
  } catch (error) {
    console.error('❌ Error checking sensor availability:', error);
    throw error;
  }

  Accelerometer.setUpdateInterval(UPDATE_INTERVAL_MS);
  
  accelSubscription = Accelerometer.addListener(accelerometerData => {
    lastAccel = {
      ax: accelerometerData.x,
      ay: accelerometerData.y,
      az: accelerometerData.z,
    };

    // If gyroscope is not available, send data immediately with default gyro values
    if (!isGyroAvailable) {
      const combinedData = { 
        ...lastAccel, 
        gx: 0, gy: 0, gz: 0, // Default gyro values
        svm: calculateSVM(lastAccel.ax, lastAccel.ay, lastAccel.az)
      };
      notifyListeners(combinedData);
    }
  });

  if (isGyroAvailable) {
    Gyroscope.setUpdateInterval(UPDATE_INTERVAL_MS);
    
    gyroSubscription = Gyroscope.addListener(gyroscopeData => {
      lastGyro = {
        gx: gyroscopeData.x,
        gy: gyroscopeData.y,
        gz: gyroscopeData.z,
      };

      const combinedData = { ...lastAccel, ...lastGyro };
      // Also include the Signal Vector Magnitude for convenience
      combinedData.svm = calculateSVM(lastAccel.ax, lastAccel.ay, lastAccel.az);

      // Notify all subscribers
      notifyListeners(combinedData);
    });
  }

  isListening = true;
  console.log('Sensor updates started.');
};

const stopSensorUpdates = () => {
  if (!isListening) {
    return;
  }
  accelSubscription?.remove();
  gyroSubscription?.remove();
  accelSubscription = null;
  gyroSubscription = null;
  isListening = false;
  console.log('Sensor updates stopped.');
};

const isSensorListening = () => {
  return isListening;
};

export const sensorService = {
  startSensorUpdates,
  stopSensorUpdates,
  isSensorListening,
};
