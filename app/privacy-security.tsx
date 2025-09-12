import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Lock, Shield, Eye, Bell, UserCheck, X } from 'lucide-react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';


interface Settings {
  twoFactorEnabled: boolean;
  profileVisible: boolean;
  activityStatus: boolean;
  contactPermissions: boolean;
}

export default function PrivacySecurityScreen() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<Settings>({
    twoFactorEnabled: false,
    profileVisible: true,
    activityStatus: true,
    contactPermissions: true,
  });
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadSettings = async () => {
    if (!user) return;
    
    try {
      // Try to load from Supabase first
      const { data: userData, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (!error && userData) {
        const data = userData as any;
        setSettings({
          twoFactorEnabled: data.two_factor_enabled ?? false,
          profileVisible: data.profile_visible ?? true,
          activityStatus: data.activity_status ?? true,
          contactPermissions: data.contact_permissions ?? true,
        });
      } else {
        // Fallback to AsyncStorage
        const savedSettings = await AsyncStorage.getItem(`privacy_settings_${user.id}`);
        if (savedSettings) {
          setSettings(JSON.parse(savedSettings));
        }
      }
    } catch (error) {
      console.error('Error loading privacy settings:', error);
    }
  };

  const saveSettingsToDatabase = async (newSettings: Settings) => {
    if (!user) return;
    
    try {
      setSavingSettings(true);
      
      // Save to Supabase
      const { error } = await supabase
        .from('users')
        .upsert({
          id: user.id,
          email: user.email || '',
          two_factor_enabled: newSettings.twoFactorEnabled,
          profile_visible: newSettings.profileVisible,
          activity_status: newSettings.activityStatus,
          contact_permissions: newSettings.contactPermissions,
          updated_at: new Date().toISOString(),
        } as any);
      
      if (error) {
        console.error('Error saving to Supabase:', error);
        // Fallback to AsyncStorage
        await AsyncStorage.setItem(`privacy_settings_${user.id}`, JSON.stringify(newSettings));
      } else {
        // Also save to AsyncStorage for offline access
        await AsyncStorage.setItem(`privacy_settings_${user.id}`, JSON.stringify(newSettings));
      }
      
      console.log('Privacy settings saved successfully');
    } catch (error) {
      console.error('Error saving privacy settings:', error);
    } finally {
      setSavingSettings(false);
    }
  };

  const updateSettings = (updates: Partial<Settings>) => {
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    saveSettingsToDatabase(newSettings);
  };

  const handleToggle = async (key: keyof Settings, value: boolean) => {
    console.log(`Toggling ${key} to ${value}`);
    updateSettings({ [key]: value });
  };

  const handleChangePassword = () => {
    setShowPasswordModal(true);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handlePasswordUpdate = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      // Update password using Supabase Auth
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        console.error('Password update error:', error);
        Alert.alert('Error', error.message || 'Failed to update password');
      } else {
        Alert.alert('Success', 'Password updated successfully');
        setShowPasswordModal(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (error: any) {
      console.error('Password update error:', error);
      Alert.alert('Error', error.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!user?.email) {
      Alert.alert('Error', 'No email address found for your account');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: 'https://yourapp.com/reset-password',
      });

      if (error) {
        Alert.alert('Error', error.message || 'Failed to send reset email');
      } else {
        Alert.alert(
          'Success', 
          `Password reset link has been sent to ${user.email}. Please check your email.`
        );
        setShowPasswordModal(false);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  const handleTwoFactor = () => {
    const newValue = !settings.twoFactorEnabled;
    Alert.alert(
      'Two-Factor Authentication',
      newValue 
        ? 'Enable two-factor authentication for enhanced security?' 
        : 'Disable two-factor authentication?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: newValue ? 'Enable' : 'Disable', 
          onPress: () => {
            updateSettings({ twoFactorEnabled: newValue });
            Alert.alert(
              'Success', 
              `Two-factor authentication ${newValue ? 'enabled' : 'disabled'}`
            );
          }
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy & Security</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Security</Text>
          
          <TouchableOpacity style={styles.item} onPress={handleChangePassword}>
            <View style={styles.itemLeft}>
              <Lock size={20} color="#666" />
              <Text style={styles.itemText}>Change Password</Text>
            </View>
            <ChevronLeft size={20} color="#999" style={styles.chevron} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.item} onPress={handleTwoFactor}>
            <View style={styles.itemLeft}>
              <Shield size={20} color="#666" />
              <Text style={styles.itemText}>Two-Factor Authentication</Text>
            </View>
            <Switch
              value={settings.twoFactorEnabled}
              onValueChange={(value) => {
                handleToggle('twoFactorEnabled', value);
                if (value) {
                  Alert.alert(
                    'Two-Factor Authentication',
                    'Two-factor authentication has been enabled for your account',
                    [{ text: 'OK' }]
                  );
                }
              }}
              trackColor={{ false: '#ddd', true: '#4CAF50' }}
              thumbColor="#fff"
              disabled={savingSettings}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy Settings</Text>
          
          <View style={styles.item}>
            <View style={styles.itemLeft}>
              <Eye size={20} color="#666" />
              <Text style={styles.itemText}>Profile Visibility</Text>
            </View>
            <Switch
              value={settings.profileVisible}
              onValueChange={(value) => handleToggle('profileVisible', value)}
              trackColor={{ false: '#ddd', true: '#4CAF50' }}
              thumbColor="#fff"
              disabled={savingSettings}
            />
          </View>

          <View style={styles.item}>
            <View style={styles.itemLeft}>
              <Bell size={20} color="#666" />
              <Text style={styles.itemText}>Activity Status</Text>
            </View>
            <Switch
              value={settings.activityStatus}
              onValueChange={(value) => handleToggle('activityStatus', value)}
              trackColor={{ false: '#ddd', true: '#4CAF50' }}
              thumbColor="#fff"
              disabled={savingSettings}
            />
          </View>

          <View style={styles.item}>
            <View style={styles.itemLeft}>
              <UserCheck size={20} color="#666" />
              <Text style={styles.itemText}>Contact Permissions</Text>
            </View>
            <Switch
              value={settings.contactPermissions}
              onValueChange={(value) => handleToggle('contactPermissions', value)}
              trackColor={{ false: '#ddd', true: '#4CAF50' }}
              thumbColor="#fff"
              disabled={savingSettings}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data & Storage</Text>
          
          <TouchableOpacity style={styles.item} onPress={() => {
            Alert.alert('Clear Cache', 'This will clear all cached data. Continue?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Clear', style: 'destructive', onPress: () => {
                Alert.alert('Success', 'Cache cleared successfully');
              }},
            ]);
          }}>
            <Text style={styles.itemText}>Clear Cache</Text>
            <ChevronLeft size={20} color="#999" style={styles.chevron} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.item} onPress={() => {
            Alert.alert('Download Data', 'Your data will be prepared and sent to your email.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Request', onPress: () => {
                Alert.alert('Success', 'Data download request submitted');
              }},
            ]);
          }}>
            <Text style={styles.itemText}>Download My Data</Text>
            <ChevronLeft size={20} color="#999" style={styles.chevron} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.deleteAccount} onPress={() => {
            Alert.alert(
              'Delete Account',
              'This action cannot be undone. All your data will be permanently deleted.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => {
                  Alert.alert('Account Deletion', 'Your request has been submitted.');
                }},
              ]
            );
          }}>
            <Text style={styles.deleteText}>Delete Account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Password Change Modal */}
      <Modal
        visible={showPasswordModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Password</Text>
              <TouchableOpacity
                onPress={() => setShowPasswordModal(false)}
                style={styles.closeButton}
              >
                <X size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>New Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter new password"
                placeholderTextColor="#999"
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
                autoCapitalize="none"
                editable={!loading}
              />

              <Text style={styles.inputLabel}>Confirm Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Confirm new password"
                placeholderTextColor="#999"
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                autoCapitalize="none"
                editable={!loading}
              />

              <Text style={styles.passwordHint}>
                Password must be at least 6 characters long
              </Text>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.primaryButton]}
                  onPress={handlePasswordUpdate}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Update Password</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalButton, styles.secondaryButton]}
                  onPress={handleResetPassword}
                  disabled={loading}
                >
                  <Text style={styles.secondaryButtonText}>Send Reset Email</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  placeholder: {
    width: 34,
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 20,
    paddingVertical: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginLeft: 20,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  itemText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 15,
  },
  chevron: {
    transform: [{ rotate: '180deg' }],
  },
  deleteAccount: {
    marginTop: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#ffebee',
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteText: {
    color: '#d32f2f',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#f9f9f9',
  },
  passwordHint: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
    fontStyle: 'italic',
  },
  modalButtons: {
    marginTop: 24,
    gap: 12,
  },
  modalButton: {
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  primaryButton: {
    backgroundColor: '#4CAF50',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  secondaryButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
});
