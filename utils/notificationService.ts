import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Notification service that works with Expo Go v53
// Since expo-notifications is not fully supported in Expo Go v53,
// we use a local notification system with AsyncStorage

interface LocalNotification {
  id: string;
  title: string;
  body: string;
  data?: any;
  timestamp: number;
  read: boolean;
}

class NotificationService {
  private static instance: NotificationService;
  private listeners: Set<(notification: LocalNotification) => void> = new Set();
  private notificationQueue: LocalNotification[] = [];
  private isInitialized = false;

  private constructor() {}

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async initialize(userId?: string) {
    if (this.isInitialized) return;
    
    try {
      // Load any pending notifications from storage
      if (userId) {
        const stored = await AsyncStorage.getItem(`notification_queue_${userId}`);
        if (stored) {
          this.notificationQueue = JSON.parse(stored);
        }
      }
      this.isInitialized = true;
      console.log('✅ Notification service initialized (Expo Go compatible)');
    } catch (error) {
      console.error('Error initializing notification service:', error);
    }
  }

  // Check if push notifications are available (always false in Expo Go v53)
  async checkPushNotificationSupport(): Promise<boolean> {
    // In Expo Go v53, push notifications are not supported
    // Return false to prevent any attempts to use expo-notifications
    if (Platform.OS === 'web') {
      return false; // Web doesn't support push notifications in Expo
    }
    
    // For Expo Go, we can't use real push notifications
    // This would be true in a development build
    return false;
  }

  // Schedule a local notification (stored locally, not using expo-notifications)
  async scheduleLocalNotification(
    title: string,
    body: string,
    data?: any,
    trigger?: { seconds: number }
  ): Promise<string> {
    const notificationId = Date.now().toString();
    const notification: LocalNotification = {
      id: notificationId,
      title,
      body,
      data,
      timestamp: Date.now() + (trigger?.seconds || 0) * 1000,
      read: false,
    };

    // Add to queue
    this.notificationQueue.push(notification);
    
    // Save to storage
    try {
      await AsyncStorage.setItem(
        'notification_queue_local',
        JSON.stringify(this.notificationQueue)
      );
    } catch (error) {
      console.error('Error saving notification:', error);
    }

    // If it's immediate, notify listeners
    if (!trigger || trigger.seconds === 0) {
      this.notifyListeners(notification);
    } else {
      // Schedule for later
      setTimeout(() => {
        this.notifyListeners(notification);
      }, trigger.seconds * 1000);
    }

    return notificationId;
  }

  // Cancel a scheduled notification
  async cancelNotification(notificationId: string) {
    this.notificationQueue = this.notificationQueue.filter(
      n => n.id !== notificationId
    );
    
    try {
      await AsyncStorage.setItem(
        'notification_queue_local',
        JSON.stringify(this.notificationQueue)
      );
    } catch (error) {
      console.error('Error canceling notification:', error);
    }
  }

  // Add a listener for notifications
  addNotificationListener(callback: (notification: LocalNotification) => void) {
    this.listeners.add(callback);
    
    // Return a function to remove the listener
    return () => {
      this.listeners.delete(callback);
    };
  }

  // Notify all listeners
  private notifyListeners(notification: LocalNotification) {
    this.listeners.forEach(listener => {
      try {
        listener(notification);
      } catch (error) {
        console.error('Error in notification listener:', error);
      }
    });
  }

  // Get all pending notifications
  async getPendingNotifications(): Promise<LocalNotification[]> {
    return this.notificationQueue.filter(
      n => n.timestamp > Date.now()
    );
  }

  // Clear all notifications
  async clearAllNotifications() {
    this.notificationQueue = [];
    try {
      await AsyncStorage.removeItem('notification_queue_local');
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  }

  // Mock permission request (always grants for local notifications)
  async requestPermissions(): Promise<{ granted: boolean }> {
    // Local notifications don't need permissions
    // This is just for API compatibility
    console.log('📱 Local notification permissions granted (Expo Go mode)');
    return { granted: true };
  }

  // Get a user-friendly message about notification support
  getNotificationSupportMessage(): string {
    if (Platform.OS === 'web') {
      return 'Push notifications are not supported on web. Using in-app notifications.';
    }
    return 'Using in-app notifications. Push notifications require a development build.';
  }
}

export default NotificationService.getInstance();
export type { LocalNotification };
