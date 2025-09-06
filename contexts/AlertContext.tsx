import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Alert {
  id: string;
  type: string;
  description: string;
  tags: string;
  location: {
    latitude: number;
    longitude: number;
  };
  anonymous: boolean;
  reportType: 'vibe' | 'event' | 'sos';
  timestamp: string;
  userId?: string;
}

interface NearbyUser {
  id: string;
  location: {
    latitude: number;
    longitude: number;
  };
  role: string;
  isResponder: boolean;
}

interface AlertContextType {
  alerts: Alert[];
  nearbyUsers: NearbyUser[];
  loading: boolean;
  addAlert: (alertData: Omit<Alert, 'id' | 'timestamp'>) => Promise<void>;
  sendSOSAlert: (sosData: any) => Promise<void>;
  getNearbyAlerts: (location: { latitude: number; longitude: number }, radius: number) => Alert[];
}

export const [AlertProvider, useAlerts] = createContextHook<AlertContextType>(() => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [nearbyUsers, setNearbyUsers] = useState<NearbyUser[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadStoredAlerts();
    loadNearbyUsers();
  }, []);

  const loadStoredAlerts = async () => {
    try {
      const storedAlerts = await AsyncStorage.getItem('alerts');
      if (storedAlerts) {
        setAlerts(JSON.parse(storedAlerts));
      } else {
        // Add some sample alerts for demo
        const sampleAlerts: Alert[] = [
          {
            id: '1',
            type: 'safe',
            description: 'Well-lit area with good foot traffic',
            tags: 'safe,lighting,busy',
            location: { latitude: 40.7580, longitude: -73.9855 },
            anonymous: false,
            reportType: 'vibe',
            timestamp: new Date(Date.now() - 3600000).toISOString(),
          },
          {
            id: '2',
            type: 'accident',
            description: 'Minor fender bender, traffic moving slowly',
            tags: 'traffic,accident',
            location: { latitude: 40.7614, longitude: -73.9776 },
            anonymous: true,
            reportType: 'event',
            timestamp: new Date(Date.now() - 1800000).toISOString(),
          },
        ];
        await AsyncStorage.setItem('alerts', JSON.stringify(sampleAlerts));
        setAlerts(sampleAlerts);
      }
    } catch (error) {
      console.error('Error loading stored alerts:', error);
    }
  };

  const loadNearbyUsers = async () => {
    try {
      // For now, we'll use local storage for nearby users
      // In a real app, this would query Supabase for users within radius
      const storedUsers = await AsyncStorage.getItem('nearbyUsers');
      if (storedUsers) {
        setNearbyUsers(JSON.parse(storedUsers));
      } else {
        // Generate some sample users for demo
        const sampleUsers: NearbyUser[] = [
          {
            id: '1',
            location: { latitude: 40.7128, longitude: -74.0060 },
            role: 'Individual',
            isResponder: false,
          },
          {
            id: '2',
            location: { latitude: 40.7589, longitude: -73.9851 },
            role: 'Responder',
            isResponder: true,
          },
          {
            id: '3',
            location: { latitude: 40.7505, longitude: -73.9934 },
            role: 'Organization',
            isResponder: false,
          },
        ];
        await AsyncStorage.setItem('nearbyUsers', JSON.stringify(sampleUsers));
        setNearbyUsers(sampleUsers);
      }
    } catch (error) {
      console.error('Error loading nearby users:', error);
    }
  };

  const addAlert = useCallback(async (alertData: Omit<Alert, 'id' | 'timestamp'>) => {
    try {
      setLoading(true);
      
      const newAlert: Alert = {
        ...alertData,
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
      };

      // Using local storage only since Supabase is not configured
      console.log('Saving alert to local storage');

      const updatedAlerts = [...alerts, newAlert];
      setAlerts(updatedAlerts);
      
      await AsyncStorage.setItem('alerts', JSON.stringify(updatedAlerts));
      
      console.log('Alert added:', newAlert);
    } catch (error) {
      console.error('Error adding alert:', error);
      throw new Error('Failed to add alert');
    } finally {
      setLoading(false);
    }
  }, [alerts]);

  const sendSOSAlert = useCallback(async (sosData: any) => {
    try {
      setLoading(true);
      
      const sosAlert: Alert = {
        id: Date.now().toString(),
        type: sosData.type,
        description: sosData.description,
        tags: 'sos,emergency',
        location: sosData.location,
        anonymous: sosData.anonymous,
        reportType: 'sos',
        timestamp: new Date().toISOString(),
      };

      // Using local storage only since Supabase is not configured
      console.log('Saving SOS alert to local storage');

      const updatedAlerts = [...alerts, sosAlert];
      setAlerts(updatedAlerts);
      
      await AsyncStorage.setItem('alerts', JSON.stringify(updatedAlerts));
      
      console.log('SOS Alert sent to nearby users:', sosAlert);
      
      // In a real app, this would trigger push notifications to nearby users
      // For now, we'll simulate the response check
      setTimeout(() => {
        console.log('SOS response check completed');
      }, 10000);
      
    } catch (error) {
      console.error('Error sending SOS alert:', error);
      throw new Error('Failed to send SOS alert');
    } finally {
      setLoading(false);
    }
  }, [alerts]);

  const getNearbyAlerts = useCallback((location: { latitude: number; longitude: number }, radius: number = 10): Alert[] => {
    return alerts.filter(alert => {
      const distance = calculateDistance(
        location.latitude,
        location.longitude,
        alert.location.latitude,
        alert.location.longitude
      );
      return distance <= radius;
    });
  }, [alerts]);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  return useMemo(() => ({
    alerts,
    nearbyUsers,
    loading,
    addAlert,
    sendSOSAlert,
    getNearbyAlerts,
  }), [alerts, nearbyUsers, loading, addAlert, sendSOSAlert, getNearbyAlerts]);
});
