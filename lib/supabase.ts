import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://irbjqbmzohavhhdflsip.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlyYmpxYm16b2hhdmhoZGZsc2lwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyMzE1NDMsImV4cCI6MjA2NzgwNzU0M30.XS1bZySIL4MF9GI0oak_zYHKLE-1kmTEKmW7tJH0flw';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

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
