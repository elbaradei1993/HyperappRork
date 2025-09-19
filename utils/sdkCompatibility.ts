// SDK Compatibility Layer for Expo
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { isFeatureAvailable } from '@/constants/sdkConfig';

// Haptics wrapper with fallback
export const triggerHaptic = async (type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' = 'light') => {
  if (!isFeatureAvailable('haptics')) {
    console.log(`Haptic feedback: ${type} (not available on this platform)`);
    return;
  }

  try {
    switch (type) {
      case 'light':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case 'medium':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case 'heavy':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        break;
      case 'success':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case 'warning':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        break;
      case 'error':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        break;
    }
  } catch (error) {
    console.log('Haptic feedback error:', error);
  }
};

// Location wrapper with web fallback
export const getCurrentLocation = async (): Promise<Location.LocationObject | null> => {
  try {
    if (Platform.OS === 'web') {
      // Use browser geolocation API for web
      return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error('Geolocation not supported'));
          return;
        }

        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              coords: {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                altitude: position.coords.altitude,
                accuracy: position.coords.accuracy,
                altitudeAccuracy: position.coords.altitudeAccuracy,
                heading: position.coords.heading,
                speed: position.coords.speed,
              },
              timestamp: position.timestamp,
            } as Location.LocationObject);
          },
          (error) => reject(error),
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 1000,
          }
        );
      });
    }

    // Native platforms
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Location permission not granted');
    }

    return await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
  } catch (error) {
    console.error('Error getting location:', error);
    return null;
  }
};

// Background location wrapper
export const startBackgroundLocation = async (taskName: string) => {
  if (!isFeatureAvailable('backgroundLocation')) {
    console.log('Background location not available on this platform');
    return false;
  }

  try {
    const { status } = await Location.requestBackgroundPermissionsAsync();
    if (status !== 'granted') {
      return false;
    }

    await Location.startLocationUpdatesAsync(taskName, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 10000,
      distanceInterval: 50,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: 'Location Tracking',
        notificationBody: 'Your location is being tracked for safety',
        notificationColor: '#ff4757',
      },
    });

    return true;
  } catch (error) {
    console.error('Error starting background location:', error);
    return false;
  }
};

// Notification wrapper with platform checks
export const scheduleNotification = async (
  title: string,
  body: string,
  trigger?: Notifications.NotificationTriggerInput
) => {
  if (!isFeatureAvailable('notifications')) {
    console.log(`Notification: ${title} - ${body} (not available)`);
    return null;
  }

  try {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      return null;
    }

    return await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: trigger || null,
    });
  } catch (error) {
    console.error('Error scheduling notification:', error);
    return null;
  }
};

// Safe async storage operations
export const safeAsyncStorage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.error('AsyncStorage getItem error:', error);
      // Fallback to localStorage for web
      if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
        return localStorage.getItem(key);
      }
      return null;
    }
  },

  setItem: async (key: string, value: string): Promise<void> => {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.error('AsyncStorage setItem error:', error);
      // Fallback to localStorage for web
      if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
        localStorage.setItem(key, value);
      }
    }
  },

  removeItem: async (key: string): Promise<void> => {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('AsyncStorage removeItem error:', error);
      // Fallback to localStorage for web
      if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
        localStorage.removeItem(key);
      }
    }
  },

  clear: async (): Promise<void> => {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.clear();
    } catch (error) {
      console.error('AsyncStorage clear error:', error);
      // Fallback to localStorage for web
      if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
        localStorage.clear();
      }
    }
  },
};

// Platform-specific image picker
export const pickImage = async (options?: any) => {
  try {
    const ImagePicker = require('expo-image-picker');
    
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Permission denied');
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: Platform.OS === 'web' ? 0.7 : 1,
      ...options,
    });

    if (!result.canceled) {
      return result.assets[0];
    }
    return null;
  } catch (error) {
    console.error('Error picking image:', error);
    return null;
  }
};

// Camera capture with fallback
export const capturePhoto = async (options?: any) => {
  try {
    const ImagePicker = require('expo-image-picker');
    
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Camera permission denied');
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: Platform.OS === 'web' ? 0.7 : 1,
      ...options,
    });

    if (!result.canceled) {
      return result.assets[0];
    }
    return null;
  } catch (error) {
    console.error('Error capturing photo:', error);
    return null;
  }
};

// Audio playback wrapper
export const playSound = async (soundFile: any) => {
  try {
    const { Audio } = require('expo-av');
    
    const { sound } = await Audio.Sound.createAsync(soundFile);
    await sound.playAsync();
    
    // Cleanup
    sound.setOnPlaybackStatusUpdate((status: any) => {
      if (status.didJustFinish) {
        sound.unloadAsync();
      }
    });
    
    return sound;
  } catch (error) {
    console.error('Error playing sound:', error);
    return null;
  }
};

// Network status checker
export const checkNetworkStatus = async () => {
  try {
    const NetInfo = require('@react-native-community/netinfo').default;
    const state = await NetInfo.fetch();
    return {
      isConnected: state.isConnected,
      type: state.type,
      isInternetReachable: state.isInternetReachable,
    };
  } catch (error) {
    console.error('Error checking network status:', error);
    // Fallback for web
    if (Platform.OS === 'web') {
      return {
        isConnected: navigator.onLine,
        type: 'unknown',
        isInternetReachable: navigator.onLine,
      };
    }
    return {
      isConnected: true,
      type: 'unknown',
      isInternetReachable: true,
    };
  }
};

export default {
  triggerHaptic,
  getCurrentLocation,
  startBackgroundLocation,
  scheduleNotification,
  safeAsyncStorage,
  pickImage,
  capturePhoto,
  playSound,
  checkNetworkStatus,
};
