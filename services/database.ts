import { supabase } from '../lib/supabase';

// Define types based on our app's data structure
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
  report_type: 'vibe' | 'event' | 'sos';
  timestamp: string;
  user_id?: string;
}

interface AlertInsert {
  type: string;
  description: string;
  tags: string;
  location: {
    latitude: number;
    longitude: number;
  };
  anonymous: boolean;
  report_type: 'vibe' | 'event' | 'sos';
  user_id?: string;
}

interface AlertUpdate {
  type?: string;
  description?: string;
  tags?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  anonymous?: boolean;
  report_type?: 'vibe' | 'event' | 'sos';
}

interface User {
  id: string;
  email: string;
  bio?: string;
  role?: string;
  interests?: string;
  location?: string;
  notification_preferences?: any;
  created_at: string;
  updated_at: string;
}

interface UserInsert {
  id: string;
  email: string;
  bio?: string;
  role?: string;
  interests?: string;
  location?: string;
  notification_preferences?: any;
}

interface UserUpdate {
  bio?: string;
  role?: string;
  interests?: string;
  location?: string;
  notification_preferences?: any;
}

export class DatabaseService {
  // Alert operations
  static async createAlert(alert: AlertInsert): Promise<Alert> {
    try {
      const { data, error } = await supabase
        .from('alerts')
        .insert(alert as any)
        .select()
        .single();
      
      if (error) throw error;
      return data as Alert;
    } catch (error) {
      console.error('Error creating alert:', error);
      throw error;
    }
  }

  static async getAlerts(limit = 50): Promise<Alert[]> {
    try {
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return (data as Alert[]) || [];
    } catch (error) {
      console.error('Error fetching alerts:', error);
      throw error;
    }
  }

  static async getAlertsByLocation(latitude: number, longitude: number, radius = 5000): Promise<Alert[]> {
    try {
      // Note: This is a simplified version. In production, you'd use PostGIS for proper geospatial queries
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .order('timestamp', { ascending: false });
      
      if (error) throw error;
      
      // Simple distance filtering (not accurate for production)
      return ((data as Alert[]) || []).filter(alert => {
        if (!alert.location) return false;
        const alertLat = alert.location.latitude;
        const alertLng = alert.location.longitude;
        const distance = Math.sqrt(
          Math.pow(alertLat - latitude, 2) + Math.pow(alertLng - longitude, 2)
        ) * 111000; // Rough conversion to meters
        return distance <= radius;
      });
    } catch (error) {
      console.error('Error fetching alerts by location:', error);
      throw error;
    }
  }

  static async updateAlert(id: string, updates: AlertUpdate): Promise<Alert> {
    try {
      const { data, error } = await (supabase as any)
        .from('alerts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as Alert;
    } catch (error) {
      console.error('Error updating alert:', error);
      throw error;
    }
  }

  static async deleteAlert(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('alerts')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error deleting alert:', error);
      throw error;
    }
  }

  // User operations
  static async createUserProfile(user: UserInsert): Promise<User> {
    try {
      const { data, error } = await supabase
        .from('users')
        .insert(user as any)
        .select()
        .single();
      
      if (error) throw error;
      return data as User;
    } catch (error) {
      console.error('Error creating user profile:', error);
      throw error;
    }
  }

  static async getUserProfile(id: string): Promise<User> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data as User;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
  }

  static async updateUserProfile(id: string, updates: UserUpdate): Promise<User> {
    try {
      const { data, error } = await (supabase as any)
        .from('users')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as User;
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }

  // Real-time subscriptions
  static subscribeToAlerts(callback: (payload: any) => void) {
    return supabase
      .channel('alerts')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'alerts' }, 
        callback
      )
      .subscribe();
  }

  static subscribeToAlertsInArea(
    latitude: number, 
    longitude: number, 
    radius: number,
    callback: (payload: any) => void
  ) {
    // For now, subscribe to all alerts and filter client-side
    // In production, you'd use PostGIS and proper geospatial queries
    return supabase
      .channel('alerts-area')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'alerts' }, 
        (payload) => {
          if (payload.new && (payload.new as any).location) {
            const alertLat = (payload.new as any).location.latitude;
            const alertLng = (payload.new as any).location.longitude;
            const distance = Math.sqrt(
              Math.pow(alertLat - latitude, 2) + Math.pow(alertLng - longitude, 2)
            ) * 111000;
            
            if (distance <= radius) {
              callback(payload);
            }
          } else {
            callback(payload);
          }
        }
      )
      .subscribe();
  }
}