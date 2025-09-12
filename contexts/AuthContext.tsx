import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import { authRateLimiter, SessionManager, validatePassword } from '@/utils/security';
import { offlineManager } from '@/utils/offlineManager';
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
  const sessionManagerRef = useRef<SessionManager | null>(null);
  const appStateRef = useRef(AppState.currentState);

  useEffect(() => {
    // Get initial session
    console.log('Checking for existing session...');
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Error getting session:', error);
      } else {
        console.log('Session found:', session?.user?.email || 'No session');
        if (session?.user) {
          // Initialize session manager for authenticated user
          sessionManagerRef.current = new SessionManager(15, async () => {
            console.log('Session timeout - signing out');
            await signOut();
          });
          sessionManagerRef.current.startSession();
        }
      }
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
        
        if (event === 'SIGNED_IN' && session?.user) {
          // Start session manager
          if (!sessionManagerRef.current) {
            sessionManagerRef.current = new SessionManager(15, async () => {
              console.log('Session timeout - signing out');
              await signOut();
            });
          }
          sessionManagerRef.current.startSession();
        } else if (event === 'SIGNED_OUT') {
          // Stop session manager
          sessionManagerRef.current?.stopSession();
          sessionManagerRef.current = null;
        }
      }
    );

    // Handle app state changes for session management
    const appStateSubscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        // App has come to foreground
        sessionManagerRef.current?.resetTimer();
      }
      appStateRef.current = nextAppState;
    });

    return () => {
      subscription.unsubscribe();
      appStateSubscription.remove();
      sessionManagerRef.current?.stopSession();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    // Check rate limiting
    if (!authRateLimiter.canAttempt(email)) {
      throw new Error('Too many login attempts. Please try again later.');
    }
    
    try {
      console.log('Attempting to sign in with email:', email);
      
      // Check if offline
      if (!offlineManager.getIsOnline()) {
        throw new Error('No internet connection. Please check your network.');
      }
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        console.error('Supabase sign in error:', error);
        throw error;
      }
      
      // Reset rate limiter on success
      authRateLimiter.reset(email);
      
      console.log('Sign in successful:', data.user?.email);
    } catch (error: any) {
      console.error('Sign in error details:', {
        message: error.message,
        status: error.status,
        code: error.code,
      });
      throw new Error(error.message || 'Failed to sign in');
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      throw new Error(passwordValidation.errors.join('\n'));
    }
    
    // Check rate limiting
    if (!authRateLimiter.canAttempt(email)) {
      throw new Error('Too many signup attempts. Please try again later.');
    }
    
    try {
      console.log('Attempting to sign up with email:', email);
      
      // Check if offline
      if (!offlineManager.getIsOnline()) {
        throw new Error('No internet connection. Please check your network.');
      }
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: undefined, // No email confirmation required for testing
        }
      });
      
      if (error) {
        console.error('Supabase sign up error:', error);
        throw error;
      }
      
      // Reset rate limiter on success
      authRateLimiter.reset(email);
      
      console.log('Sign up successful:', data.user?.email);
      
      // Auto sign in after signup if email confirmation is disabled
      if (data.user && !data.session) {
        console.log('Email confirmation may be required');
      }
    } catch (error: any) {
      console.error('Signup error details:', {
        message: error.message,
        status: error.status,
        code: error.code,
      });
      throw new Error(error.message || 'Failed to sign up');
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      console.log('Starting sign out process...');
      
      // Stop session manager
      sessionManagerRef.current?.stopSession();
      sessionManagerRef.current = null;
      
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Supabase sign out error:', error);
        throw error;
      }
      setUser(null);
      
      // Clear offline cache on sign out
      await offlineManager.clearAllCache();
      
      console.log('Sign out successful');
    } catch (error: any) {
      console.error('Error signing out:', error);
      throw error;
    }
  }, []);

  const updateProfile = useCallback(async (data: any) => {
    try {
      if (!user) throw new Error('No user logged in');
      
      // Reset session timer on activity
      sessionManagerRef.current?.resetTimer();
      
      // Check if offline - queue the update
      if (!offlineManager.getIsOnline()) {
        await offlineManager.queueAction('UPDATE_PROFILE', data);
        
        // Update local state optimistically
        setUser({
          ...user,
          user_metadata: {
            ...user.user_metadata,
            ...data,
          },
        });
        
        console.log('Profile update queued for when online');
        return;
      }
      
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
      
      // Also update the users table in database
      if (data.firstName || data.lastName) {
        const { error: dbError } = await (supabase as any)
          .from('users')
          .upsert({
            id: user.id,
            email: user.email || '',
            first_name: data.firstName || data.first_name,
            last_name: data.lastName || data.last_name,
            display_name: data.displayName || `${data.firstName || ''} ${data.lastName || ''}`.trim(),
            phone: data.phone,
            updated_at: new Date().toISOString(),
          });
        
        if (dbError) {
          console.error('Error updating user in database:', dbError);
        }
      }
      
      // Update local user metadata
      setUser({
        ...user,
        user_metadata: {
          ...user.user_metadata,
          ...data,
        },
      });
      
      // Cache the updated profile
      await offlineManager.setCache(`profile_${user.id}`, data, 1440); // Cache for 24 hours
    } catch (error: any) {
      console.error('Profile update error:', error);
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
