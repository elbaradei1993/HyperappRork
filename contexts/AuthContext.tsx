import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import { AppState, AppStateStatus } from 'react-native';



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


  const appStateRef = useRef(AppState.currentState);

  useEffect(() => {
    let mounted = true;
    
    const initAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!error && session?.user && mounted) {
          setUser(session.user);
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };
    
    initAuth();

    // Setup auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        if (event === 'INITIAL_SESSION') {
          return;
        }
        
        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          setUser(session.user);
        }
        
        setLoading(false);
      }
    );

    // Handle app state changes for session refresh
    const appStateSubscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        // Refresh session when app comes to foreground
        supabase.auth.getSession();
      }
      appStateRef.current = nextAppState;
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
      appStateSubscription.remove();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    // Input validation
    if (!email?.trim() || !password?.trim()) {
      throw new Error('Email and password are required');
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      throw new Error('Please enter a valid email address');
    }
    
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();
    
    try {
      await supabase.auth.signOut();
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPassword,
      });
      
      if (error) {
        
        // Provide user-friendly error messages based on error codes and messages
        if (error.status === 400 || error.message?.includes('Invalid login credentials') || error.message?.includes('invalid_credentials')) {
          throw new Error('Invalid email or password. Please check your credentials and try again.');
        } else if (error.status === 422 || error.message?.includes('Email not confirmed') || error.message?.includes('email_not_confirmed')) {
          throw new Error('Please check your email and confirm your account before signing in.');
        } else if (error.status === 429 || error.message?.includes('Too many requests') || error.message?.includes('rate_limit')) {
          throw new Error('Too many login attempts. Please wait a moment and try again.');
        } else if (error.status === 401) {
          throw new Error('Authentication failed. Please check your credentials.');
        } else if (error.message?.includes('network') || error.message?.includes('fetch') || error.message?.includes('timeout')) {
          throw new Error('Network error. Please check your internet connection and try again.');
        } else {
          throw new Error(`Sign in failed: ${error.message || 'Unknown error'}`);
        }
      }
      
      if (!data?.user || !data?.session) {
        throw new Error('Authentication failed. Please try again.');
      }
      
      setUser(data.user);
      
    } catch (error: any) {
      throw error;
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    // Input validation
    if (!email?.trim() || !password?.trim()) {
      throw new Error('Email and password are required');
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      throw new Error('Please enter a valid email address');
    }
    
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();
    
    // Password validation
    if (cleanPassword.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }
    
    try {
      await supabase.auth.signOut();
      
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password: cleanPassword,
        options: {
          data: {
            displayName: cleanEmail.split('@')[0],
          }
        }
      });
      
      if (error) {
        
        if (error.status === 422 || error.message?.includes('already registered') || error.message?.includes('already_registered')) {
          throw new Error('This email is already registered. Please sign in instead.');
        } else if (error.message?.includes('Password should be') || error.message?.includes('password')) {
          throw new Error('Password is too weak. Please use a stronger password.');
        } else if (error.message?.includes('network') || error.message?.includes('fetch') || error.message?.includes('timeout')) {
          throw new Error('Network error. Please check your internet connection and try again.');
        } else {
          throw new Error(`Sign up failed: ${error.message || 'Unknown error'}`);
        }
      }
      
      if (!data?.user) {
        throw new Error('Sign up failed. Please try again.');
      }
      
      if (!data.session) {
        throw new Error('Account created successfully! Please check your email to confirm your account, then sign in.');
      }
      
      setUser(data.user);
      
    } catch (error: any) {
      throw error;
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
    } catch (error: any) {
      throw error;
    }
  }, []);

  const updateProfile = useCallback(async (data: any) => {
    try {
      if (!user) throw new Error('No user logged in');
      
      // Update auth user metadata
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          displayName: data.displayName,
          phone: data.phone,
          firstName: data.firstName,
          lastName: data.lastName,
        },
      });
      if (authError) throw authError;
      
      // Update local user metadata
      setUser({
        ...user,
        user_metadata: {
          ...user.user_metadata,
          ...data,
        },
      });
    } catch (error: any) {
      throw new Error(error.message);
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
