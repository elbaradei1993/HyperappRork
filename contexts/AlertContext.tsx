import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { soundManager } from '@/utils/soundManager';
import { Alert as RNAlert } from 'react-native';

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
  
  // Performance optimization: Use refs for timers and subscriptions
  const autoRefreshTimer = useRef<NodeJS.Timeout | null>(null);
  const realtimeSubscription = useRef<any>(null);
  const lastFetchTime = useRef<number>(0);
  const FETCH_COOLDOWN = 5000; // 5 seconds cooldown between fetches

  const loadVibeHistory = useCallback(async () => {
    try {
      console.log('Loading vibe history...');
      const { data, error } = await supabase
        .from('vibe_history')
        .select('*')
        .order('expired_at', { ascending: false })
        .limit(50);
      
      if (error) {
        console.error('Error loading vibe history:', error);
        // Don't throw, just log the error to prevent app crashes
        return;
      }
      
      console.log(`Loaded ${data?.length || 0} vibe history records`);
      setVibeHistory(data || []);
    } catch (error) {
      console.error('Error in loadVibeHistory:', error);
      // Graceful error handling
      RNAlert.alert(
        'Connection Issue',
        'Unable to load vibe history. Please check your connection.',
        [{ text: 'OK' }]
      );
    }
  }, []);

  const loadSOSHistory = useCallback(async () => {
    try {
      console.log('Loading SOS history...');
      const { data, error } = await supabase
        .from('sos_history')
        .select('*')
        .order('expired_at', { ascending: false })
        .limit(50);
      
      if (error) {
        console.error('Error loading SOS history:', error);
        // Don't throw, just log the error to prevent app crashes
        return;
      }
      
      console.log(`Loaded ${data?.length || 0} SOS history records`);
      setSOSHistory(data || []);
    } catch (error) {
      console.error('Error in loadSOSHistory:', error);
      // Graceful error handling without disrupting user experience
    }
  }, []);

  const moveExpiredVibesToHistory = useCallback(async () => {
    try {
      console.log('Checking for expired vibes...');
      const now = new Date().toISOString();
      
      // Get expired vibes
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
        console.log('No expired vibes found');
        return;
      }
      
      console.log(`Found ${expiredVibes.length} expired vibes`);
      
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
      
      console.log('Successfully moved expired vibes to history');
      
      // Update local state
      setAlerts(prev => prev.filter(alert => !expiredIds.includes(alert.id)));
      
      // Reload vibe history
      loadVibeHistory();
    } catch (error) {
      console.error('Error in moveExpiredVibesToHistory:', error);
    }
  }, [loadVibeHistory]);

  const moveExpiredSOSToHistory = useCallback(async () => {
    try {
      console.log('Checking for expired SOS reports...');
      const now = new Date().toISOString();
      const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
      
      // Get SOS reports older than 12 hours or resolved
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
        console.log('No expired SOS reports found');
        return;
      }
      
      console.log(`Found ${expiredSOS.length} expired SOS reports`);
      
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
      
      console.log('Successfully moved expired SOS reports to history');
      
      // Update local state
      setAlerts(prev => prev.filter(alert => !expiredIds.includes(alert.id)));
      
      // Reload SOS history
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
        console.log('Real-time alert update:', payload);
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
      console.log('🔄 Loading alerts from Supabase...');
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(100);
      
      if (error) {
        console.error('❌ Supabase error loading alerts:', error);
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }
      
      console.log(`✅ Loaded ${data?.length || 0} alerts from Supabase`);
      if (data && data.length > 0) {
        console.log('Sample alert:', JSON.stringify(data[0], null, 2));
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
      console.log(`✅ Alerts set in state: ${transformedAlerts.length}`);
    } catch (error: any) {
      console.error('❌ Error loading alerts:', error.message || error);
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  const loadNearbyUsers = async () => {
    try {
      console.log('Loading nearby users from Supabase...');
      const { data, error } = await supabase
        .from('users')
        .select('id, location, role')
        .not('location', 'is', null);
      
      if (error) {
        console.error('Supabase error loading users:', error);
        throw error;
      }
      
      console.log(`Loaded ${data?.length || 0} users from Supabase`);
      
      const users = (data || []).map((user: any) => {
        let parsedLocation = { latitude: 0, longitude: 0 };
        try {
          if (typeof user.location === 'string' && user.location.trim() !== '') {
            // Check if it's a JSON string
            if (user.location.startsWith('{') || user.location.startsWith('[')) {
              try {
                parsedLocation = JSON.parse(user.location);
              } catch (e) {
                // Not valid JSON, it's probably a city name or address
                console.log(`User ${user.id} has location as city/address: ${user.location}`);
                // Skip this user as we need coordinates
                return null;
              }
            } else {
              // It's a plain string (city name, address, etc.)
              console.log(`User ${user.id} has location as text: ${user.location}`);
              return null; // Skip users without coordinate data
            }
          } else if (user.location && typeof user.location === 'object') {
            parsedLocation = user.location;
          } else {
            // No valid location data
            return null;
          }
        } catch (e) {
          console.error('Error parsing user location for user', user.id, ':', e);
          console.error('Location value was:', user.location);
          return null;
        }
        
        // Validate that we have valid coordinates
        if (!parsedLocation.latitude || !parsedLocation.longitude ||
            typeof parsedLocation.latitude !== 'number' || 
            typeof parsedLocation.longitude !== 'number') {
          console.log(`Invalid coordinates for user ${user.id}:`, parsedLocation);
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
      console.log('=== ADDING ALERT TO SUPABASE ===');
      console.log('Alert data received:', JSON.stringify(alertData, null, 2));
      
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
      
      console.log('Formatted insert data:', JSON.stringify(insertData, null, 2));
      
      const { data, error } = await supabase
        .from('alerts')
        .insert([insertData] as any)
        .select()
        .single();
      
      if (error) {
        console.error('❌ SUPABASE ERROR:', error);
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }
      
      if (!data) {
        console.error('❌ No data returned from insert');
        throw new Error('No data returned from insert');
      }
      
      console.log('✅ Data returned from Supabase:', JSON.stringify(data, null, 2));
      
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
      
      setAlerts(prev => {
        const newAlerts = [transformedAlert, ...prev];
        console.log(`✅ Alert added to state. Total alerts: ${newAlerts.length}`);
        return newAlerts;
      });
      
      console.log('✅ Alert added successfully:', transformedAlert);
      
      // Reload alerts to ensure sync
      setTimeout(() => {
        console.log('🔄 Reloading alerts to ensure sync...');
        loadAlerts();
      }, 1000);
      
    } catch (error: any) {
      console.error('❌ ERROR ADDING ALERT:', error);
      console.error('Full error object:', error);
      throw new Error(error.message || 'Failed to add alert');
    } finally {
      setLoading(false);
    }
  }, []);

  const sendSOSAlert = useCallback(async (sosData: any): Promise<Alert> => {
    try {
      setLoading(true);
      console.log('Sending SOS alert to Supabase:', sosData);
      
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
      
      console.log('SOS Insert data:', insertData);
      
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
      console.log('SOS Alert sent successfully:', transformedAlert);
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
      console.log('Marking alert as resolved:', alertId);
      const { data, error } = await (supabase
        .from('alerts') as any)
        .update({ resolved: true })
        .eq('id', alertId)
        .select()
        .single();
      
      if (error) {
        console.error('Supabase error marking resolved:', error);
        throw error;
      }
      
      console.log('Alert marked as resolved:', data);
      
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
      console.log('Responding to alert:', alertId, 'by user:', userId);
      
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
      
      console.log('Current alert responded_by:', currentAlert);
      
      const respondedBy: string[] = (currentAlert as any)?.responded_by || [];
      if (!respondedBy.includes(userId)) {
        respondedBy.push(userId);
      }
      
      console.log('Updating responded_by to:', respondedBy);
      
      const { data: updatedAlert, error } = await (supabase
        .from('alerts') as any)
        .update({ responded_by: respondedBy })
        .eq('id', alertId)
        .select()
        .single();
      
      if (error) {
        console.error('Supabase error updating responded_by:', error);
        throw error;
      }
      
      console.log('Alert updated with response:', updatedAlert);
      
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
