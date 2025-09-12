import { useState, useEffect, useCallback, useMemo } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from '@/contexts/LocationContext';
import { useStorage } from '@/contexts/StorageContext';
import { Alert } from 'react-native';
import type { Database } from '@/types/supabase';



// Type the RPC function responses based on Database types

export interface Guardian {
  id: string;
  user_id: string;
  guardian_id: string;
  status: 'pending' | 'active' | 'inactive';
  created_at: string;
  updated_at?: string;
  permissions: {
    view_location: boolean;
    receive_sos: boolean;
    view_vibe: boolean;
  };
  guardian_profile?: {
    full_name: string;
    email: string;
    avatar_url?: string;
  } | null;
}

export type GuardianAlert = Database['public']['Tables']['guardian_alerts']['Row'];

export type CheckIn = Database['public']['Tables']['guardian_check_ins']['Row'];

interface GuardianContextValue {
  guardians: Guardian[];
  alerts: GuardianAlert[];
  checkIns: CheckIn[];
  loading: boolean;
  addGuardian: (email: string) => Promise<void>;
  removeGuardian: (id: string) => Promise<void>;
  updatePermissions: (id: string, permissions: Guardian['permissions']) => Promise<void>;
  sendCheckIn: (guardianId: string, message?: string) => Promise<void>;
  acknowledgeCheckIn: (checkInId: string) => Promise<void>;
  markAlertAsRead: (alertId: string) => Promise<void>;
  acceptInvitation: (token: string) => Promise<boolean>;
  sendAlert: (type: 'manual' | 'location_share', message?: string) => Promise<void>;
  fetchGuardians: () => Promise<void>;
  fetchAlerts: () => Promise<void>;
  fetchCheckIns: () => Promise<void>;
}

export const [GuardianProvider, useGuardian] = createContextHook<GuardianContextValue>(() => {
  const { user } = useAuth();
  const { location } = useLocation();
  const { getItem, setItem } = useStorage();
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [alerts, setAlerts] = useState<GuardianAlert[]>([]);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchGuardians = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Fetch my guardians using the database function
      const { data: myGuardians, error: guardiansError } = await supabase
        .rpc('get_my_guardians') as any;

      if (guardiansError) {
        console.error('Error fetching guardians:', guardiansError);
        // Try to load from cache on error
        try {
          const cached = await getItem('cached_guardians');
          if (cached) {
            setGuardians(JSON.parse(cached));
          }
        } catch (cacheError) {
          console.error('Error loading cached guardians:', cacheError);
        }
      } else {
        // Transform the data to match our Guardian interface
        const guardiansData: Guardian[] = (myGuardians || []).map((g: any) => ({
          id: g.id,
          user_id: user.id,
          guardian_id: g.guardian_id,
          status: g.status as 'pending' | 'active' | 'inactive',
          created_at: g.created_at,
          updated_at: undefined,
          permissions: {
            view_location: true,
            receive_sos: true,
            view_vibe: true
          },
          guardian_profile: g.guardian_name || g.guardian_email ? {
            full_name: g.guardian_name || '',
            email: g.guardian_email || '',
            avatar_url: undefined
          } : null
        }));
        
        setGuardians(guardiansData);
        
        // Cache locally
        try {
          await setItem('cached_guardians', JSON.stringify(guardiansData));
        } catch (cacheError) {
          console.error('Error caching guardians:', cacheError);
        }
      }

      // Also fetch users I'm protecting
      const { data: protectedUsers, error: protectedError } = await supabase
        .rpc('get_protected_users') as any;

      if (!protectedError && protectedUsers) {
        // Store protected users if needed for display
        console.log('Protected users:', protectedUsers);
      }
    } catch (error) {
      console.error('Error fetching guardians:', error);
      // Try to load from cache
      try {
        const cached = await getItem('cached_guardians');
        if (cached) {
          setGuardians(JSON.parse(cached));
        }
      } catch (cacheError) {
        console.error('Error loading cached guardians:', cacheError);
      }
    } finally {
      setLoading(false);
    }
  }, [user, getItem, setItem]);

  const fetchAlerts = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('guardian_alerts')
        .select('*')
        .or(`user_id.eq.${user.id},guardian_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setAlerts((data || []) as GuardianAlert[]);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    }
  }, [user]);

  const fetchCheckIns = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('guardian_check_ins')
        .select('*')
        .or(`user_id.eq.${user.id},guardian_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setCheckIns((data || []) as CheckIn[]);
    } catch (error) {
      console.error('Error fetching check-ins:', error);
    }
  }, [user]);

  const addGuardian = useCallback(async (email: string) => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Use the database function to send invitation
      const { data, error } = await (supabase
        .rpc as any)('send_guardian_invitation', {
          p_guardian_email: email
        });

      if (error) throw error;

      // Parse the JSON response
      const response = data as any;
      if (response?.success) {
        if (response.type === 'existing_user') {
          Alert.alert('Success', 'Guardian request sent to existing HyperApp user!');
        } else {
          Alert.alert(
            'Invitation Sent', 
            `An invitation email has been sent to ${email} to join HyperApp and become your Guardian Angel.`
          );
        }
        await fetchGuardians();
      } else {
        Alert.alert('Error', response?.error || 'Failed to send invitation');
      }
    } catch (error: any) {
      if (error.code === '23505') {
        Alert.alert('Already Added', 'This guardian has already been added.');
      } else {
        Alert.alert('Error', error.message || 'Failed to add guardian');
      }
    } finally {
      setLoading(false);
    }
  }, [user, fetchGuardians]);

  const removeGuardian = useCallback(async (id: string) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('guardian_angels')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
      
      await fetchGuardians();
      Alert.alert('Success', 'Guardian removed successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to remove guardian');
    }
  }, [user, fetchGuardians]);

  const updatePermissions = useCallback(async (id: string, permissions: Guardian['permissions']) => {
    try {
      // Note: permissions are stored locally in the Guardian interface
      // but not in the database. This would need a schema update to persist.
      // For now, we'll just update the status
      const { error } = await (supabase
        .from('guardian_angels') as any)
        .update({
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      
      await fetchGuardians();
      Alert.alert('Success', 'Guardian updated');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update guardian');
    }
  }, [fetchGuardians]);

  const sendCheckIn = useCallback(async (guardianId: string, message?: string) => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to send check-ins');
      return;
    }
    
    if (!location) {
      Alert.alert('Location Required', 'Please enable location services to send check-ins');
      return;
    }
    
    try {
      const { error } = await supabase
        .from('guardian_check_ins')
        .insert([{
          user_id: user.id,
          guardian_id: guardianId,
          message: message || null,
          location: {
            latitude: location.latitude,
            longitude: location.longitude,
            accuracy: location.accuracy || null
          },
          status: 'sent' as const
        }] as any);

      if (error) throw error;
      
      await fetchCheckIns();
      Alert.alert('Success', 'Check-in sent to guardian');
    } catch (error: any) {
      console.error('Error sending check-in:', error);
      Alert.alert('Error', error.message || 'Failed to send check-in');
    }
  }, [user, location, fetchCheckIns]);

  const acknowledgeCheckIn = useCallback(async (checkInId: string) => {
    try {
      const { error } = await (supabase
        .from('guardian_check_ins') as any)
        .update({
          status: 'acknowledged',
          acknowledged_at: new Date().toISOString()
        })
        .eq('id', checkInId);

      if (error) throw error;
      
      await fetchCheckIns();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to acknowledge check-in');
    }
  }, [fetchCheckIns]);

  const markAlertAsRead = useCallback(async (alertId: string) => {
    try {
      const { error } = await (supabase
        .from('guardian_alerts') as any)
        .update({
          is_read: true
        })
        .eq('id', alertId);

      if (error) throw error;
      
      await fetchAlerts();
    } catch (error: any) {
      console.error('Error marking alert as read:', error);
    }
  }, [fetchAlerts]);

  const acceptInvitation = useCallback(async (token: string): Promise<boolean> => {
    try {
      const { data, error } = await (supabase
        .rpc as any)('accept_guardian_invitation', { 
          p_invitation_token: token 
        });

      if (error) throw error;
      
      // Parse the JSON response
      const response = data as any;
      if (response?.success) {
        await fetchGuardians();
        Alert.alert('Success', 'You are now a Guardian Angel!');
        return true;
      } else {
        Alert.alert('Error', response?.error || 'Failed to accept invitation');
        return false;
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to accept invitation');
      return false;
    }
  }, [fetchGuardians]);

  const sendAlert = useCallback(async (type: 'manual' | 'location_share', message?: string) => {
    if (!user) return;
    
    try {
      // Get all active guardians
      const activeGuardians = guardians.filter(g => 
        g.status === 'active' && g.guardian_id
      );

      if (activeGuardians.length === 0) {
        Alert.alert('No Active Guardians', 'You need at least one active guardian to send alerts.');
        return;
      }

      // Send alert to all active guardians
      const alertPromises = activeGuardians.map(guardian => {
        const alertData: Database['public']['Tables']['guardian_alerts']['Insert'] = {
            user_id: user.id,
            guardian_id: guardian.guardian_id,
            alert_type: type === 'manual' ? 'sos' : 'location_change',
            message: message || (type === 'manual' ? 'Emergency alert!' : 'Location shared'),
            location: location ? {
              latitude: location.latitude,
              longitude: location.longitude,
              accuracy: location.accuracy || null
            } : null,
            is_read: false
          };
        return supabase
          .from('guardian_alerts')
          .insert([alertData] as any);
      });

      const results = await Promise.allSettled(alertPromises);
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      
      if (successCount > 0) {
        Alert.alert('Success', `Alert sent to ${successCount} guardian(s)`);
        await fetchAlerts();
      } else {
        Alert.alert('Error', 'Failed to send alerts to guardians');
      }
    } catch (error: any) {
      console.error('Error sending alert:', error);
      Alert.alert('Error', error.message || 'Failed to send alert');
    }
  }, [user, guardians, location, fetchAlerts]);

  // Auto-fetch data when user changes
  useEffect(() => {
    if (user) {
      fetchGuardians();
      fetchAlerts();
      fetchCheckIns();
    }
  }, [user, fetchGuardians, fetchAlerts, fetchCheckIns]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!user) return;

    const guardiansSubscription = supabase
      .channel('guardians_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'guardian_angels',
        filter: `user_id=eq.${user.id}`
      }, () => {
        fetchGuardians();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'guardian_angels',
        filter: `guardian_id=eq.${user.id}`
      }, () => {
        fetchGuardians();
      })
      .subscribe();

    const alertsSubscription = supabase
      .channel('alerts_changes')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'guardian_alerts',
        filter: `guardian_id=eq.${user.id}`
      }, () => {
        fetchAlerts();
      })
      .subscribe();

    return () => {
      guardiansSubscription.unsubscribe();
      alertsSubscription.unsubscribe();
    };
  }, [user, fetchGuardians, fetchAlerts]);

  return useMemo(() => ({
    guardians,
    alerts,
    checkIns,
    loading,
    addGuardian,
    removeGuardian,
    updatePermissions,
    sendCheckIn,
    acknowledgeCheckIn,
    markAlertAsRead,
    acceptInvitation,
    sendAlert,
    fetchGuardians,
    fetchAlerts,
    fetchCheckIns
  }), [
    guardians,
    alerts,
    checkIns,
    loading,
    addGuardian,
    removeGuardian,
    updatePermissions,
    sendCheckIn,
    acknowledgeCheckIn,
    markAlertAsRead,
    acceptInvitation,
    sendAlert,
    fetchGuardians,
    fetchAlerts,
    fetchCheckIns
  ]);
});
