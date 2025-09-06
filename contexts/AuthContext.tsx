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
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          user_metadata: session.user.user_metadata,
        });
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            user_metadata: session.user.user_metadata,
          });
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
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
