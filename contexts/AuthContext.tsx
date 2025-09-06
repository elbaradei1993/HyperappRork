import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';

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
    avatar_url?: string;
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
    // For development, set a default user - In production, this would check actual auth
    const checkAuth = async () => {
      try {
        // Try to get session, but provide fallback for demo
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            user_metadata: session.user.user_metadata,
          });
        } else {
          // For demo purposes, create a default user
          const { data: users } = await supabase
            .from('users')
            .select('*')
            .limit(1);
          
          if (users && users.length > 0) {
            setUser({
              id: users[0].id,
              email: users[0].email,
              user_metadata: {
                displayName: users[0].display_name,
                bio: users[0].bio,
                phone: users[0].phone,
                avatar_url: users[0].avatar_url,
              }
            });
          }
        }
      } catch (error) {
        console.error('Auth check error:', error);
        // Still provide a demo user for functionality testing
        setUser({
          id: 'demo-user',
          email: 'demo@hyperapp.com',
          user_metadata: {
            displayName: 'Demo User',
            bio: 'Demo user for testing',
          }
        });
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        setUser({
          id: data.user.id,
          email: data.user.email || '',
          user_metadata: data.user.user_metadata,
        });
      }
    } catch (error: any) {
      console.error('Sign in error:', error);
      throw new Error(error.message || 'Login failed');
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        // Create user profile in database
        const { error: profileError } = await supabase
          .from('users')
          .insert({
            id: data.user.id,
            email: data.user.email || '',
            bio: '',
            role: 'Individual',
            interests: '',
            location: '',
            notification_preferences: {
              sos: true,
              vibes: true,
              events: true,
              nearby: false,
            },
          });

        if (profileError) {
          console.error('Profile creation error:', profileError);
        }
      }
    } catch (error: any) {
      console.error('Signup error:', error);
      throw new Error(error.message || 'Signup failed');
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
    } catch (error: any) {
      console.error('Error signing out:', error);
      throw new Error(error.message || 'Sign out failed');
    }
  }, []);

  const updateProfile = useCallback(async (data: any) => {
    try {
      if (!user) throw new Error('No user logged in');

      // Update user metadata in auth
      const { error: authError } = await supabase.auth.updateUser({
        data: data,
      });

      if (authError) throw authError;

      // Update profile in database
      const { error: profileError } = await supabase
        .from('users')
        .update({
          bio: data.bio,
          role: data.role,
          interests: data.interests,
          location: data.location,
        })
        .eq('id', user.id);

      if (profileError) {
        console.error('Profile update error:', profileError);
      }

      // Update local state
      setUser({
        ...user,
        user_metadata: {
          ...user.user_metadata,
          ...data,
        },
      });
    } catch (error: any) {
      console.error('Profile update error:', error);
      throw new Error(error.message || 'Failed to update profile');
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
