import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import type { Database } from '@/types/supabase';

// Supabase configuration
const supabaseUrl = 'https://irbjqbmzohavhhdflsip.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlyYmpxYm16b2hhdmhoZGZsc2lwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyMzE1NDMsImV4cCI6MjA2NzgwNzU0M30.XS1bZySIL4MF9GI0oak_zYHKLE-1kmTEKmW7tJH0flw';

// Validate configuration
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase configuration');
}

// Custom storage for React Native
const customStorage = {
  getItem: async (key: string) => {
    try {
      if (Platform.OS === 'web') {
        return localStorage?.getItem(key) || null;
      }
      return await AsyncStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      if (Platform.OS === 'web') {
        localStorage?.setItem(key, value);
      } else {
        await AsyncStorage.setItem(key, value);
      }
    } catch {
      // Ignore storage errors
    }
  },
  removeItem: async (key: string) => {
    try {
      if (Platform.OS === 'web') {
        localStorage?.removeItem(key);
      } else {
        await AsyncStorage.removeItem(key);
      }
    } catch {
      // Ignore storage errors
    }
  },
};

// Create Supabase client
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: customStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Test connection function
export const testSupabaseConnection = async (): Promise<boolean> => {
  try {
    const { error } = await supabase.auth.getSession();
    return !error;
  } catch {
    return false;
  }
};
