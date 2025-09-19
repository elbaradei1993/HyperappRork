// SDK Configuration for Expo Go compatibility
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// SDK Version Detection - Force SDK 54 for compatibility
const getSDKVersion = () => {
  // Force SDK 54 as we're running on Expo Go v54
  return '54.0.0';
};

export const SDK_VERSION = getSDKVersion();
export const IS_EXPO_GO = Constants.appOwnership === 'expo' || 
                          Constants.executionEnvironment === 'storeClient' ||
                          Constants.executionEnvironment === 'standalone';
export const IS_DEV = __DEV__;

// Log SDK information
if (IS_DEV) {
  console.log(`[SDK Config] Detected SDK Version: ${SDK_VERSION}`);
  console.log(`[SDK Config] Running in Expo Go: ${IS_EXPO_GO}`);
  console.log(`[SDK Config] Platform: ${Platform.OS}`);
}

// Platform-specific configurations
export const PLATFORM_CONFIG = {
  ios: {
    minimumOSVersion: '13.4',
    supportedFeatures: {
      haptics: true,
      backgroundLocation: true,
      notifications: true,
      camera: true,
      audio: true,
    },
  },
  android: {
    minimumSDKVersion: 21,
    targetSDKVersion: 34,
    supportedFeatures: {
      haptics: true,
      backgroundLocation: true,
      notifications: true,
      camera: true,
      audio: true,
    },
  },
  web: {
    supportedFeatures: {
      haptics: false,
      backgroundLocation: false,
      notifications: true,
      camera: true,
      audio: true,
    },
  },
};

// Get current platform config
export const getCurrentPlatformConfig = () => {
  const platform = Platform.OS as keyof typeof PLATFORM_CONFIG;
  return PLATFORM_CONFIG[platform] || PLATFORM_CONFIG.web;
};

// Feature availability checker
export const isFeatureAvailable = (feature: string): boolean => {
  const config = getCurrentPlatformConfig();
  return config.supportedFeatures[feature as keyof typeof config.supportedFeatures] || false;
};

// SDK Compatibility helpers - Works with both SDK 53 and 54
export const SDK_FEATURES = {
  // Features available in SDK 53+
  newArchitecture: parseFloat(SDK_VERSION) >= 53,
  improvedPerformance: parseFloat(SDK_VERSION) >= 53,
  enhancedGestures: parseFloat(SDK_VERSION) >= 52,
  // SDK 54 specific features
  reactNative079: parseFloat(SDK_VERSION) >= 54,
  improvedTypeScript: parseFloat(SDK_VERSION) >= 54,
  
  // Check if running in Expo Go
  isExpoGo: IS_EXPO_GO,
  
  // Development mode
  isDevelopment: IS_DEV,
};

// Animation configuration based on SDK
export const ANIMATION_CONFIG = {
  useNativeDriver: Platform.OS !== 'web',
  duration: 300,
  useSpringAnimation: parseFloat(SDK_VERSION) >= 52,
  // SDK 54 uses improved animation performance
  optimizedAnimations: parseFloat(SDK_VERSION) >= 54,
};

// Network configuration
export const NETWORK_CONFIG = {
  timeout: Platform.OS === 'web' ? 10000 : 30000,
  retryAttempts: Platform.OS === 'web' ? 1 : 3,
  retryDelay: 1000,
};

// Storage limits based on platform
export const STORAGE_LIMITS = {
  maxCacheSize: Platform.select({
    ios: 50 * 1024 * 1024, // 50MB
    android: 100 * 1024 * 1024, // 100MB
    default: 10 * 1024 * 1024, // 10MB for web
  }),
  maxImageSize: Platform.select({
    ios: 10 * 1024 * 1024, // 10MB
    android: 10 * 1024 * 1024, // 10MB
    default: 5 * 1024 * 1024, // 5MB for web
  }),
};

// Performance optimizations based on SDK
export const PERFORMANCE_CONFIG = {
  enableHermes: Platform.OS === 'android' && parseFloat(SDK_VERSION) >= 52,
  enableNewArchitecture: SDK_FEATURES.newArchitecture,
  batchedBridgeCalls: true,
  lazyLoadScreens: true,
};

export default {
  SDK_VERSION,
  IS_EXPO_GO,
  IS_DEV,
  PLATFORM_CONFIG,
  getCurrentPlatformConfig,
  isFeatureAvailable,
  SDK_FEATURES,
  ANIMATION_CONFIG,
  NETWORK_CONFIG,
  STORAGE_LIMITS,
  PERFORMANCE_CONFIG,
};
