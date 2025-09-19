import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';



export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const { signIn, user } = useAuth();
  
  // Navigate to tabs if user is already authenticated
  useEffect(() => {
    if (user) {
      console.log('[LoginScreen] User already authenticated, redirecting to tabs');
      router.replace('/(tabs)/map');
    }
  }, [user]);

  const handleLogin = async () => {
    console.log('[LoginScreen] Starting login attempt');
    
    if (!email || !password) {
      Alert.alert('Missing Information', 'Please fill in all fields');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Invalid Email', 'Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      console.log('[LoginScreen] Calling signIn with email:', email.trim());
      await signIn(email.trim(), password);
      console.log('[LoginScreen] Sign in successful!');
      
      // Navigate immediately - the auth context will handle the user state
      console.log('[LoginScreen] Navigating to tabs');
      router.replace('/(tabs)/map');
      
    } catch (error: any) {
      console.error('[LoginScreen] Login error:', error);
      const errorMessage = error.message || 'Unknown error occurred';
      
      // User-friendly error messages
      if (errorMessage.includes('Invalid') || errorMessage.includes('credentials') || errorMessage.includes('password')) {
        Alert.alert(
          'Sign In Failed', 
          'Invalid email or password. Please check your credentials and try again.'
        );
      } else if (errorMessage.includes('confirm') || errorMessage.includes('email')) {
        Alert.alert(
          'Email Not Confirmed',
          'Please check your email and confirm your account before signing in.'
        );
      } else if (errorMessage.includes('Network') || errorMessage.includes('network') || errorMessage.includes('connection')) {
        Alert.alert(
          'Connection Error',
          'Unable to connect to the server. Please check your internet connection and try again.'
        );
      } else if (errorMessage.includes('Too many') || errorMessage.includes('rate')) {
        Alert.alert(
          'Too Many Attempts',
          'Too many login attempts. Please wait a moment and try again.'
        );
      } else {
        Alert.alert('Sign In Failed', errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };



  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f3460']}
        style={styles.gradient}
      >

        <View style={styles.content}>
          <View style={styles.header}>
            <Image 
              source={{ uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/aqlrwbgnosn05yewyps54' }}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.title}>HyperAPP</Text>
            <Text style={styles.subtitle}>Stay Safe. Stay Connected.</Text>
          </View>

          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#8e8e93"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
              testID="email-input"
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#8e8e93"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
              textContentType="password"
              testID="password-input"
            />

            <TouchableOpacity
              style={[styles.loginButton, loading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={loading}
              testID="sign-in-button"
            >
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color="#ffffff" size="small" />
                  <Text style={styles.loadingText}>Signing In...</Text>
                </View>
              ) : (
                <Text style={styles.loginButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.signupButton}
              onPress={() => router.push('/(auth)/signup')}
            >
              <Text style={styles.signupButtonText}>
                Don&apos;t have an account? <Text style={styles.signupLink}>Sign Up</Text>
              </Text>
            </TouchableOpacity>




          </View>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },

  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#8e8e93',
    textAlign: 'center',
  },
  form: {
    gap: 16,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  loginButton: {
    backgroundColor: '#ff4757',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  signupButton: {
    alignItems: 'center',
    marginTop: 16,
  },
  signupButtonText: {
    color: '#8e8e93',
    fontSize: 14,
  },
  signupLink: {
    color: '#ff4757',
    fontWeight: '600',
  },


});
