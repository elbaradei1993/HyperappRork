import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';

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
  user_id?: string;
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
  refreshAlerts: () => Promise<void>;
}

export const [AlertProvider, useAlerts] = createContextHook<AlertContextType>(() => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [nearbyUsers, setNearbyUsers] = useState<NearbyUser[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      refreshAlerts();
      loadNearbyUsers();
    }
  }, [user]);

  const refreshAlerts = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(100);

      if (error) throw error;

      const formattedAlerts: Alert[] = data.map(alert => ({
        id: alert.id,
        type: alert.type,
        description: alert.description,
        tags: alert.tags,
        location: alert.location,
        anonymous: alert.anonymous,
        reportType: alert.report_type,
        timestamp: alert.timestamp,
        user_id: alert.user_id,
      }));

      setAlerts(formattedAlerts);
    } catch (error) {
      console.error('Error loading alerts:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadNearbyUsers = async () => {
    try {
      // Query users from database (simplified - in real app would use PostGIS for location queries)
      const { data, error } = await supabase
        .from('users')
        .select('id, role, location')
        .neq('id', user?.id)
        .limit(20);

      if (error) throw error;

      const formattedUsers: NearbyUser[] = data.map(user => ({
        id: user.id,
        location: user.location ? JSON.parse(user.location) : { latitude: 0, longitude: 0 },
        role: user.role || 'Individual',
        isResponder: user.role === 'Responder',
      }));

      setNearbyUsers(formattedUsers);
    } catch (error) {
      console.error('Error loading nearby users:', error);
    }
  };

  const addAlert = useCallback(async (alertData: Omit<Alert, 'id' | 'timestamp'>) => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('alerts')
        .insert({
          type: alertData.type,
          description: alertData.description,
          tags: alertData.tags,
          location: alertData.location,
          anonymous: alertData.anonymous,
          report_type: alertData.reportType,
          user_id: alertData.user_id,
        })
        .select()
        .single();

      if (error) throw error;

      const newAlert: Alert = {
        id: data.id,
        type: data.type,
        description: data.description,
        tags: data.tags,
        location: data.location,
        anonymous: data.anonymous,
        reportType: data.report_type,
        timestamp: data.timestamp,
        user_id: data.user_id,
      };

      setAlerts(prev => [newAlert, ...prev]);
    } catch (error: any) {
      console.error('Error adding alert:', error);
      throw new Error(error.message || 'Failed to add alert');
    } finally {
      setLoading(false);
    }
  }, []);

  const sendSOSAlert = useCallback(async (sosData: any) => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('alerts')
        .insert({
          type: sosData.type,
          description: sosData.description || 'Emergency assistance needed',
          tags: 'sos,emergency',
          location: sosData.location,
          anonymous: sosData.anonymous,
          report_type: 'sos',
          user_id: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      const sosAlert: Alert = {
        id: data.id,
        type: data.type,
        description: data.description,
        tags: data.tags,
        location: data.location,
        anonymous: data.anonymous,
        reportType: data.report_type,
        timestamp: data.timestamp,
        user_id: data.user_id,
      };

      setAlerts(prev => [sosAlert, ...prev]);

      // In a real app, this would trigger push notifications to nearby users
      console.log('SOS Alert sent to nearby users:', sosAlert);
    } catch (error: any) {
      console.error('Error sending SOS alert:', error);
      throw new Error(error.message || 'Failed to send SOS alert');
    } finally {
      setLoading(false);
    }
  }, [user]);

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
    refreshAlerts,
  }), [alerts, nearbyUsers, loading, addAlert, sendSOSAlert, getNearbyAlerts, refreshAlerts]);
});
