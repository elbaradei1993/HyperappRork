import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAlerts } from '@/contexts/AlertContext';
import { useAuth } from '@/contexts/AuthContext';
import notificationService from '@/utils/notificationService';

interface Notification {
  id: string;
  type: 'sos' | 'event' | 'vibe' | 'system';
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
  alertId?: string;
  data?: any;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  removeNotification: (notificationId: string) => void;
}

export const [NotificationProvider, useNotifications] = createContextHook<NotificationContextType>(() => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { alerts } = useAlerts();
  const { user } = useAuth();
  const [lastAlertCount, setLastAlertCount] = useState(0);
  const [notificationPermission, setNotificationPermission] = useState<boolean>(false);

  // Initialize notification service and load notifications on mount
  useEffect(() => {
    const initializeNotifications = async () => {
      if (user) {
        // Initialize the notification service
        await notificationService.initialize(user.id);
        
        // Check notification support (will be false in Expo Go)
        const hasSupport = await notificationService.checkPushNotificationSupport();
        setNotificationPermission(hasSupport);
        
        if (!hasSupport) {
          console.log('ℹ️', notificationService.getNotificationSupportMessage());
        }
        
        // Load existing notifications
        await loadNotifications();
        
        // Set up listener for local notifications
        const unsubscribe = notificationService.addNotificationListener((notification) => {
          console.log('📬 New local notification:', notification.title);
          // Add the notification to our list
          addNotification({
            type: 'system',
            title: notification.title,
            description: notification.body,
            data: notification.data,
          });
        });
        
        return () => {
          unsubscribe();
        };
      }
    };
    
    initializeNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Monitor for new alerts and create notifications
  useEffect(() => {
    if (alerts.length > lastAlertCount && lastAlertCount > 0) {
      // New alerts have been added
      const newAlerts = alerts.slice(0, alerts.length - lastAlertCount);
      
      newAlerts.forEach(alert => {
        if (alert.reportType === 'sos' || alert.reportType === 'event') {
          const notification = {
            type: alert.reportType as 'sos' | 'event',
            title: `${alert.reportType.toUpperCase()}: ${alert.alert_type}`,
            description: alert.description || 'New alert in your area',
            alertId: alert.id,
            data: alert,
          };
          
          // Add to our internal list
          addNotification(notification);
          
          // Also schedule a local notification (for in-app display)
          notificationService.scheduleLocalNotification(
            notification.title,
            notification.description,
            notification.data
          ).catch(console.error);
        }
      });
    }
    
    setLastAlertCount(alerts.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alerts]);

  const loadNotifications = async () => {
    if (!user) return;
    
    try {
      const stored = await AsyncStorage.getItem(`notifications_${user.id}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Ensure parsed is an array
        if (Array.isArray(parsed)) {
          // Filter out notifications older than 24 hours
          const recent = parsed.filter((n: Notification) => {
            const age = Date.now() - new Date(n.timestamp).getTime();
            return age < 24 * 60 * 60 * 1000; // 24 hours
          });
          setNotifications(recent);
        } else {
          console.warn('Stored notifications is not an array, resetting...');
          setNotifications([]);
          await AsyncStorage.removeItem(`notifications_${user.id}`);
        }
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
      // Reset notifications on parse error
      setNotifications([]);
      if (user) {
        await AsyncStorage.removeItem(`notifications_${user.id}`).catch(console.error);
      }
    }
  };



  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      read: false,
    };
    
    setNotifications(prev => {
      const updated = [newNotification, ...prev];
      if (user) {
        AsyncStorage.setItem(`notifications_${user.id}`, JSON.stringify(updated)).catch(console.error);
      }
      return updated;
    });
  }, [user]);

  const markAsRead = useCallback((notificationId: string) => {
    setNotifications(prev => {
      const updated = prev.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      );
      if (user) {
        AsyncStorage.setItem(`notifications_${user.id}`, JSON.stringify(updated)).catch(console.error);
      }
      return updated;
    });
  }, [user]);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true }));
      if (user) {
        AsyncStorage.setItem(`notifications_${user.id}`, JSON.stringify(updated)).catch(console.error);
      }
      return updated;
    });
  }, [user]);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
    if (user) {
      AsyncStorage.removeItem(`notifications_${user.id}`).catch(console.error);
    }
  }, [user]);

  const removeNotification = useCallback((notificationId: string) => {
    setNotifications(prev => {
      const updated = prev.filter(n => n.id !== notificationId);
      if (user) {
        AsyncStorage.setItem(`notifications_${user.id}`, JSON.stringify(updated)).catch(console.error);
      }
      return updated;
    });
  }, [user]);

  const unreadCount = useMemo(() => {
    return notifications.filter(n => !n.read).length;
  }, [notifications]);

  return useMemo(() => ({
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    removeNotification,
  }), [notifications, unreadCount, addNotification, markAsRead, markAllAsRead, clearNotifications, removeNotification]);
});
