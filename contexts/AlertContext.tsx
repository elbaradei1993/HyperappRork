import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { soundManager } from '@/utils/soundManager';


interface Alert {
  id: string;
  alert_type: string; // Changed from 'type' to 'alert_type'
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
  resolved?: boolean;
  respondedBy?: string[];
  address?: string;
  expires_at?: string;
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
  vibeHistory: any[];
  sosHistory: any[];
  addAlert: (alertData: Omit<Alert, 'id' | 'timestamp'>) => Promise<void>;
  sendSOSAlert: (sosData: any) => Promise<Alert>;
  getNearbyAlerts: (location: { latitude: number; longitude: number }, radius: number) => Alert[];
  markAlertResolved: (alertId: string) => Promise<void>;
  respondToAlert: (alertId: string, userId: string) => Promise<void>;
  moveExpiredVibesToHistory: () => Promise<void>;
  moveExpiredSOSToHistory: () => Promise<void>;
  loadVibeHistory: () => Promise<void>;
  loadSOSHistory: () => Promise<void>;
}

export const [AlertProvider, useAlerts] = createContextHook<AlertContextType>(() => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [nearbyUsers, setNearbyUsers] = useState<NearbyUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [vibeHistory, setVibeHistory] = useState<any[]>([]);
  const [sosHistory, setSOSHistory] = useState<any[]>([]);
  


  const loadVibeHistory = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('vibe_history')
        .select('*')
        .order('expired_at', { ascending: false })
        .limit(50);
      
      if (error) {
        console.error('Error loading vibe history:', error);
        return;
      }
      
      setVibeHistory(data || []);
    } catch (error) {
      console.error('Error in loadVibeHistory:', error);
    }
  }, []);

  const loadSOSHistory = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('sos_history')
        .select('*')
        .order('expired_at', { ascending: false })
        .limit(50);
      
      if (error) {
        console.error('Error loading SOS history:', error);
        return;
      }
      
      setSOSHistory(data || []);
    } catch (error) {
      console.error('Error in loadSOSHistory:', error);
    }
  }, []);

  const moveExpiredVibesToHistory = useCallback(async () => {
    try {
      const now = new Date().toISOString();
      
      const { data: expiredVibes, error: fetchError } = await supabase
        .from('alerts')
        .select('*')
        .eq('report_type', 'vibe')
        .not('expires_at', 'is', null)
        .lte('expires_at', now);
      
      if (fetchError) {
        console.error('Error fetching expired vibes:', fetchError);
        return;
      }
      
      if (!expiredVibes || expiredVibes.length === 0) {
        return;
      }
      
      // Move to history
      const historyRecords = expiredVibes.map((vibe: any) => ({
        user_id: vibe.user_id,
        vibe_type: vibe.alert_type,
        location: vibe.location,
        latitude: vibe.location?.latitude,
        longitude: vibe.location?.longitude,
        address: vibe.address,
        description: vibe.description,
        timestamp: vibe.timestamp || vibe.created_at,
        created_at: vibe.created_at,
        expired_at: now,
        radius_km: 0.5,
      }));
      
      const { error: insertError } = await supabase
        .from('vibe_history')
        .insert(historyRecords as any);
      
      if (insertError) {
        console.error('Error inserting into vibe_history:', insertError);
        return;
      }
      
      // Delete expired vibes from alerts
      const expiredIds = expiredVibes.map((v: any) => v.id);
      const { error: deleteError } = await supabase
        .from('alerts')
        .delete()
        .in('id', expiredIds);
      
      if (deleteError) {
        console.error('Error deleting expired vibes:', deleteError);
        return;
      }
      
      setAlerts(prev => prev.filter(alert => !expiredIds.includes(alert.id)));
      loadVibeHistory();
    } catch (error) {
      console.error('Error in moveExpiredVibesToHistory:', error);
    }
  }, [loadVibeHistory]);

  const moveExpiredSOSToHistory = useCallback(async () => {
    try {
      const now = new Date().toISOString();
      const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
      
      const { data: expiredSOS, error: fetchError } = await supabase
        .from('alerts')
        .select('*')
        .eq('report_type', 'sos')
        .or(`created_at.lte.${twelveHoursAgo},resolved.eq.true`);
      
      if (fetchError) {
        console.error('Error fetching expired SOS reports:', fetchError);
        return;
      }
      
      if (!expiredSOS || expiredSOS.length === 0) {
        return;
      }
      
      // Move to history
      const historyRecords = expiredSOS.map((sos: any) => {
        const createdAt = new Date(sos.created_at);
        const resolvedAt = sos.resolved ? new Date() : null;
        const responseTime = resolvedAt ? Math.floor((resolvedAt.getTime() - createdAt.getTime()) / 60000) : null;
        
        return {
          user_id: sos.user_id,
          alert_type: sos.alert_type,
          location: sos.location,
          latitude: sos.location?.latitude,
          longitude: sos.location?.longitude,
          address: sos.address,
          description: sos.description,
          timestamp: sos.timestamp || sos.created_at,
          created_at: sos.created_at,
          resolved_at: sos.resolved ? now : null,
          expired_at: now,
          responded_by: sos.responded_by || [],
          resolution_notes: sos.resolved ? 'Auto-archived after resolution' : 'Auto-archived after 12 hours',
          response_time_minutes: responseTime,
        };
      });
      
      const { error: insertError } = await supabase
        .from('sos_history')
        .insert(historyRecords as any);
      
      if (insertError) {
        console.error('Error inserting into sos_history:', insertError);
        return;
      }
      
      // Delete expired SOS from alerts
      const expiredIds = expiredSOS.map((s: any) => s.id);
      const { error: deleteError } = await supabase
        .from('alerts')
        .delete()
        .in('id', expiredIds);
      
      if (deleteError) {
        console.error('Error deleting expired SOS reports:', deleteError);
        return;
      }
      
      setAlerts(prev => prev.filter(alert => !expiredIds.includes(alert.id)));
      loadSOSHistory();
    } catch (error) {
      console.error('Error in moveExpiredSOSToHistory:', error);
    }
  }, [loadSOSHistory]);

  useEffect(() => {
    loadAlerts();
    loadNearbyUsers();
    loadVibeHistory();
    loadSOSHistory();
    moveExpiredVibesToHistory();
    moveExpiredSOSToHistory();
    
    // Set up interval to check for expired vibes every hour
    const vibeExpirationInterval = setInterval(() => {
      moveExpiredVibesToHistory();
    }, 60 * 60 * 1000); // Check every hour
    
    // Set up interval to check for expired SOS reports every hour
    const sosExpirationInterval = setInterval(() => {
      moveExpiredSOSToHistory();
    }, 60 * 60 * 1000); // Check every hour
    
    // Set up real-time subscription for alerts
    const subscription = supabase
      .channel('alerts-channel')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'alerts' 
      }, (payload) => {

        if (payload.eventType === 'INSERT') {
          const newAlert = payload.new as Alert;
          setAlerts(prev => [newAlert, ...prev]);
          
          // Play sound based on alert type
          if (newAlert.reportType === 'sos') {
            soundManager.playSOSAlert();
          } else if (newAlert.reportType === 'event') {
            soundManager.playEventAlert();
          } else if (newAlert.reportType === 'vibe') {
            soundManager.playVibeAlert();
          } else {
            soundManager.playNotification();
          }
        } else if (payload.eventType === 'DELETE') {
          setAlerts(prev => prev.filter(a => a.id !== payload.old.id));
        } else if (payload.eventType === 'UPDATE') {
          setAlerts(prev => prev.map(a => a.id === payload.new.id ? payload.new as Alert : a));
        }
      })
      .subscribe();
    
    return () => {
      subscription.unsubscribe();
      clearInterval(vibeExpirationInterval);
      clearInterval(sosExpirationInterval);
    };
  }, [loadVibeHistory, loadSOSHistory, moveExpiredVibesToHistory, moveExpiredSOSToHistory]);

  const loadAlerts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(100);
      
      if (error) {
        console.error('Error loading alerts:', error);
        throw error;
      }
      
      // Transform data to match our Alert interface
      const transformedAlerts: Alert[] = (data || []).map((item: any) => ({
        id: item.id,
        alert_type: item.alert_type, // Changed from 'type' to 'alert_type'
        description: item.description,
        tags: item.tags,
        location: item.location,
        anonymous: item.anonymous,
        reportType: item.report_type,
        timestamp: item.timestamp || item.created_at,
        userId: item.user_id,
        resolved: item.resolved || false,
        respondedBy: item.responded_by || [],
        address: item.address,
        expires_at: item.expires_at,
      }));
      
      setAlerts(transformedAlerts);
    } catch (error: any) {
      console.error('Error loading alerts:', error.message || error);
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  const loadNearbyUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, location, role')
        .not('location', 'is', null);
      
      if (error) {
        console.error('Error loading users:', error);
        throw error;
      }
      
      const users = (data || []).map((user: any) => {
        let parsedLocation = { latitude: 0, longitude: 0 };
        try {
          if (typeof user.location === 'string' && user.location.trim() !== '') {
            // Check if it's a JSON string
            if (user.location.startsWith('{') || user.location.startsWith('[')) {
              try {
                parsedLocation = JSON.parse(user.location);
              } catch {
                return null;
              }
            } else {
              return null;
            }
          } else if (user.location && typeof user.location === 'object') {
            parsedLocation = user.location;
          } else {
            // No valid location data
            return null;
          }
        } catch {
          return null;
        }
        
        // Validate that we have valid coordinates
        if (!parsedLocation.latitude || !parsedLocation.longitude ||
            typeof parsedLocation.latitude !== 'number' || 
            typeof parsedLocation.longitude !== 'number') {
          return null;
        }
        
        return {
          id: user.id,
          location: parsedLocation,
          role: user.role || 'Individual',
          isResponder: user.role === 'Responder',
        };
      }).filter(Boolean) as NearbyUser[]; // Remove null entries and cast to correct type
      
      setNearbyUsers(users);
    } catch (error: any) {
      console.error('Error loading nearby users:', error.message || error);
      setNearbyUsers([]);
    }
  };

  const addAlert = useCallback(async (alertData: Omit<Alert, 'id' | 'timestamp'>) => {
    try {
      setLoading(true);
      // Prepare the insert data
      const insertData: any = {
        alert_type: alertData.alert_type, // Changed from 'type' to 'alert_type'
        description: alertData.description,
        tags: alertData.tags || '',
        location: alertData.location,
        anonymous: alertData.anonymous || false,
        report_type: alertData.reportType,
        user_id: alertData.anonymous ? null : alertData.userId,
      };
      
      // If it's a vibe report, set expiration to 12 hours from now
      if (alertData.reportType === 'vibe') {
        const expirationDate = new Date();
        expirationDate.setHours(expirationDate.getHours() + 12);
        insertData.expires_at = expirationDate.toISOString();
      }
      
      const { data, error } = await supabase
        .from('alerts')
        .insert([insertData] as any)
        .select()
        .single();
      
      if (error) {
        console.error('Error adding alert:', error);
        throw error;
      }
      
      if (!data) {
        throw new Error('No data returned from insert');
      }
      
      // Transform the returned data to match our Alert interface
      const transformedAlert: Alert = {
        id: (data as any).id,
        alert_type: (data as any).alert_type, // Changed from 'type' to 'alert_type'
        description: (data as any).description,
        tags: (data as any).tags,
        location: (data as any).location,
        anonymous: (data as any).anonymous,
        reportType: (data as any).report_type,
        timestamp: (data as any).timestamp || (data as any).created_at,
        userId: (data as any).user_id,
        resolved: (data as any).resolved || false,
        respondedBy: (data as any).responded_by || [],
        address: (data as any).address,
        expires_at: (data as any).expires_at,
      };
      
      setAlerts(prev => [transformedAlert, ...prev]);
      
      setTimeout(() => {
        loadAlerts();
      }, 1000);
      
    } catch (error: any) {
      console.error('Error adding alert:', error);
      throw new Error(error.message || 'Failed to add alert');
    } finally {
      setLoading(false);
    }
  }, []);

  const sendSOSAlert = useCallback(async (sosData: any): Promise<Alert> => {
    try {
      setLoading(true);
      // Prepare the insert data
      const insertData: any = {
        alert_type: sosData.alert_type || 'Emergency', // Changed from 'type' to 'alert_type'
        description: sosData.description,
        tags: 'sos,emergency',
        location: sosData.location,
        anonymous: sosData.anonymous || false,
        report_type: 'sos',
        user_id: sosData.anonymous ? null : sosData.userId,
        // SOS reports don't have automatic expiration like vibes, but are moved after 12 hours or when resolved
      };
      
      const { data, error } = await supabase
        .from('alerts')
        .insert([insertData] as any)
        .select()
        .single();
      
      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      if (!data) {
        throw new Error('No data returned from insert');
      }
      
      // Transform the returned data to match our Alert interface
      const transformedAlert: Alert = {
        id: (data as any).id,
        alert_type: (data as any).alert_type, // Changed from 'type' to 'alert_type'
        description: (data as any).description,
        tags: (data as any).tags,
        location: (data as any).location,
        anonymous: (data as any).anonymous,
        reportType: (data as any).report_type,
        timestamp: (data as any).timestamp || (data as any).created_at,
        userId: (data as any).user_id,
        resolved: (data as any).resolved || false,
        respondedBy: (data as any).responded_by || [],
        address: (data as any).address,
        expires_at: (data as any).expires_at,
      };
      
      setAlerts(prev => [transformedAlert, ...prev]);
      return transformedAlert;
    } catch (error: any) {
      console.error('Error sending SOS alert:', error);
      throw new Error(error.message || 'Failed to send SOS alert');
    } finally {
      setLoading(false);
    }
  }, []);

  const getNearbyAlerts = useCallback((location: { latitude: number; longitude: number }, radius: number = 1): Alert[] => {
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

  const markAlertResolved = useCallback(async (alertId: string) => {
    try {

      const { error } = await (supabase
        .from('alerts') as any)
        .update({ resolved: true })
        .eq('id', alertId)
        .select()
        .single();
      
      if (error) {
        console.error('Supabase error marking resolved:', error);
        throw error;
      }
      
      // Update local state
      setAlerts(prev => prev.map(alert => 
        alert.id === alertId ? { ...alert, resolved: true } : alert
      ));
    } catch (error: any) {
      console.error('Error marking alert as resolved:', error);
      throw new Error(error.message || 'Failed to mark alert as resolved');
    }
  }, []);
  
  const respondToAlert = useCallback(async (alertId: string, userId: string) => {
    try {
      // Get current alert to update responded_by array
      const { data: currentAlert, error: fetchError } = await supabase
        .from('alerts')
        .select('responded_by')
        .eq('id', alertId)
        .single();
      
      if (fetchError) {
        console.error('Error fetching alert:', fetchError);
        throw fetchError;
      }
      
      const respondedBy: string[] = (currentAlert as any)?.responded_by || [];
      if (!respondedBy.includes(userId)) {
        respondedBy.push(userId);
      }
      
      const { error } = await (supabase
        .from('alerts') as any)
        .update({ responded_by: respondedBy })
        .eq('id', alertId)
        .select()
        .single();
      
      if (error) {
        console.error('Supabase error updating responded_by:', error);
        throw error;
      }
      
      // Update local state
      setAlerts(prev => prev.map(alert => 
        alert.id === alertId ? { ...alert, respondedBy } : alert
      ));
    } catch (error: any) {
      console.error('Error responding to alert:', error);
      throw new Error(error.message || 'Failed to respond to alert');
    }
  }, []);

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
    vibeHistory,
    sosHistory,
    addAlert,
    sendSOSAlert,
    getNearbyAlerts,
    markAlertResolved,
    respondToAlert,
    moveExpiredVibesToHistory,
    moveExpiredSOSToHistory,
    loadVibeHistory,
    loadSOSHistory,
  }), [alerts, nearbyUsers, loading, vibeHistory, sosHistory, addAlert, sendSOSAlert, getNearbyAlerts, markAlertResolved, respondToAlert, moveExpiredVibesToHistory, moveExpiredSOSToHistory, loadVibeHistory, loadSOSHistory]);
});
