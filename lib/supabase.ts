import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://irbjqbmzohavhhdflsip.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key-here';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface Database {
  public: {
    Tables: {
      alerts: {
        Row: {
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
        };
        Insert: {
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
        };
        Update: {
          type?: string;
          description?: string;
          tags?: string;
          location?: {
            latitude: number;
            longitude: number;
          };
          anonymous?: boolean;
          report_type?: 'vibe' | 'event' | 'sos';
        };
      };
      users: {
        Row: {
          id: string;
          email: string;
          bio?: string;
          role?: string;
          interests?: string;
          location?: string;
          notification_preferences?: any;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          bio?: string;
          role?: string;
          interests?: string;
          location?: string;
          notification_preferences?: any;
        };
        Update: {
          bio?: string;
          role?: string;
          interests?: string;
          location?: string;
          notification_preferences?: any;
        };
      };
    };
  };
}
