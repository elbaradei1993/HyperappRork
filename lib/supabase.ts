// Mock Supabase client for demo purposes - no network requests
export const supabase = {
  auth: {
    signInWithPassword: async () => ({ data: null, error: new Error('Demo mode - no real auth') }),
    signUp: async () => ({ data: null, error: new Error('Demo mode - no real auth') }),
    signOut: async () => ({ error: null }),
    updateUser: async () => ({ error: new Error('Demo mode - no real auth') }),
    getSession: async () => ({ data: { session: null }, error: null }),
  },
  from: () => ({
    select: () => ({
      eq: () => ({ data: [], error: null }),
      insert: () => ({ data: null, error: new Error('Demo mode - no real database') }),
      update: () => ({ data: null, error: new Error('Demo mode - no real database') }),
      delete: () => ({ data: null, error: new Error('Demo mode - no real database') }),
    }),
  }),
};

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
