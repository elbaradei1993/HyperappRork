import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import NotificationPopup from './NotificationPopup';
import { useNotifications } from '@/contexts/NotificationContext';
import { useRouter } from 'expo-router';

interface ActiveNotification {
  id: string;
  type: 'sos' | 'event' | 'vibe' | 'system';
  title: string;
  description: string;
  timestamp: string;
  alertId?: string;
}

export const NotificationManager: React.FC = () => {
  const { notifications } = useNotifications();
  const router = useRouter();
  const [activeNotifications, setActiveNotifications] = useState<ActiveNotification[]>([]);
  const displayedIds = useRef<Set<string>>(new Set());
  const lastNotificationCount = useRef(0);

  useEffect(() => {
    // Check for new notifications
    if (notifications.length > lastNotificationCount.current && lastNotificationCount.current > 0) {
      const newNotifications = notifications.slice(0, notifications.length - lastNotificationCount.current);
      
      newNotifications.forEach(notification => {
        if (!displayedIds.current.has(notification.id) && !notification.read) {
          displayedIds.current.add(notification.id);
          
          // Add a small delay between multiple notifications
          setTimeout(() => {
            setActiveNotifications(prev => [...prev, {
              id: notification.id,
              type: notification.type,
              title: notification.title,
              description: notification.description,
              timestamp: notification.timestamp,
              alertId: notification.alertId,
            }]);
          }, activeNotifications.length * 300);
        }
      });
    }
    
    lastNotificationCount.current = notifications.length;
  }, [notifications]);

  const handleDismiss = (notificationId: string) => {
    setActiveNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  const handlePress = (notification: ActiveNotification) => {
    if (notification.alertId) {
      router.push(`/alert-details/${notification.alertId}`);
    } else if (notification.type === 'system') {
      router.push('/notifications');
    }
  };

  return (
    <View style={styles.container} pointerEvents="box-none">
      {activeNotifications.map((notification, index) => (
        <View
          key={notification.id}
          style={[
            styles.notificationWrapper,
            { top: index * 100 } // Stack notifications
          ]}
        >
          <NotificationPopup
            notification={notification}
            onDismiss={() => handleDismiss(notification.id)}
            onPress={notification.alertId || notification.type === 'system' ? () => handlePress(notification) : undefined}
            duration={5000 + (index * 1000)} // Increase duration for stacked notifications
          />
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9998,
    elevation: 9,
  },
  notificationWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
});

export default NotificationManager;
