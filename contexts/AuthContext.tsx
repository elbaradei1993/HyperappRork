import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
  id: string;
  email: string;
  user_metadata?: {
    bio?: string;
    role?: string;
    interests?: string;
    location?: string;
    displayName?: string;
    phone?: string;
  };
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (data: any) => Promise<void>;
}

export const [AuthProvider, useAuth] = createContextHook<AuthContextType>(() => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStoredUser();
  }, []);

  const loadStoredUser = async () => {
    try {
      const storedUser = await AsyncStorage.getItem('user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error('Error loading stored user:', error);
    } finally {
      setLoading(false);
    }
  };

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      // Demo mode - accept any email/password for testing
      console.log('Demo login for:', email);
      
      const mockUser: User = {
        id: Date.now().toString(),
        email,
        user_metadata: {
          bio: 'Demo user for HyperAPP testing',
          role: 'Individual',
          interests: 'Safety, Community, Technology',
          location: 'New York, NY',
          displayName: email.split('@')[0],
          phone: '',
        },
      };
      
      await AsyncStorage.setItem('user', JSON.stringify(mockUser));
      setUser(mockUser);
      console.log('Demo login successful');
    } catch (error) {
      console.error('Sign in error:', error);
      throw new Error('Login failed');
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    try {
      console.log('Demo signup for user:', email);
      // In demo mode, just show success message
      // In real app, this would create account and require email verification
    } catch (error) {
      console.error('Signup error:', error);
      throw new Error('Signup failed');
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await AsyncStorage.removeItem('user');
      setUser(null);
      console.log('Demo logout successful');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }, []);

  const updateProfile = useCallback(async (data: any) => {
    try {
      if (!user) throw new Error('No user logged in');
      
      const updatedUser = {
        ...user,
        user_metadata: {
          ...user.user_metadata,
          ...data,
        },
      };
      
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      console.log('Demo profile update successful');
    } catch (error) {
      console.error('Profile update error:', error);
      throw new Error('Failed to update profile');
    }
  }, [user]);

  return useMemo(() => ({
    user,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile,
  }), [user, loading, signIn, signUp, signOut, updateProfile]);
});
