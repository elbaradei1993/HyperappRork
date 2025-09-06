import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export const SupabaseTest: React.FC = () => {
  const [connectionStatus, setConnectionStatus] = useState<'testing' | 'connected' | 'error'>('testing');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const { user, session } = useAuth();

  useEffect(() => {
    testConnection();
  }, []);

  const testConnection = async () => {
    try {
      setConnectionStatus('testing');
      
      // Test basic connection
      const { error } = await supabase
        .from('alerts')
        .select('count')
        .limit(1);

      if (error) {
        throw error;
      }

      setConnectionStatus('connected');
      setErrorMessage('');
    } catch (error: any) {
      console.error('Supabase connection error:', error);
      setConnectionStatus('error');
      setErrorMessage(error.message || 'Unknown error');
    }
  };

  const testAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      Alert.alert(
        'Auth Status', 
        session ? `Authenticated as: ${session.user.email}` : 'Not authenticated'
      );
    } catch (error: any) {
      Alert.alert('Auth Error', error.message);
    }
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'testing': return '#FFC107';
      case 'connected': return '#4CAF50';
      case 'error': return '#F44336';
      default: return '#607D8B';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'testing': return 'Testing connection...';
      case 'connected': return 'Connected to Supabase ✓';
      case 'error': return 'Connection failed ✗';
      default: return 'Unknown status';
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Supabase Integration Status</Text>
      
      <View style={[styles.statusCard, { borderColor: getStatusColor() }]}>
        <Text style={[styles.statusText, { color: getStatusColor() }]}>
          {getStatusText()}
        </Text>
        {errorMessage ? (
          <Text style={styles.errorText}>{errorMessage}</Text>
        ) : null}
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Connection Details:</Text>
        <Text style={styles.infoText}>URL: https://irbjqbmzohavhhdflsip.supabase.co</Text>
        <Text style={styles.infoText}>Auth Status: {session ? 'Authenticated' : 'Not authenticated'}</Text>
        {user && (
          <Text style={styles.infoText}>User: {user.email}</Text>
        )}
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={testConnection}>
          <Text style={styles.buttonText}>Test Connection</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.button} onPress={testAuth}>
          <Text style={styles.buttonText}>Check Auth</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  statusCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    borderWidth: 2,
    marginBottom: 15,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 12,
    color: '#F44336',
    marginTop: 5,
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  button: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
  },
});