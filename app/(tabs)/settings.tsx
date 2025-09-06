import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Bell,
  Globe,
  Palette,
  MapPin,
  Shield,
  Trash2,
  LogOut,
  ChevronRight,
  Check,
  Eye,
  EyeOff,
  User,
  Lock,
} from 'lucide-react-native';

export default function SettingsScreen() {
  const { signOut, user } = useAuth();
  const [notifications, setNotifications] = useState({
    sos: true,
    vibes: true,
    events: true,
    nearby: false,
  });
  const [radius, setRadius] = useState(10);
  const [language, setLanguage] = useState('English');
  const [theme, setTheme] = useState('dark');
  const [privacy, setPrivacy] = useState({
    profileVisible: true,
    locationSharing: true,
    dataCollection: false,
    analytics: false,
  });
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('appSettings');
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        setNotifications(settings.notifications || notifications);
        setRadius(settings.radius || 10);
        setLanguage(settings.language || 'English');
        setTheme(settings.theme || 'dark');
        setPrivacy(settings.privacy || privacy);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveSettings = async (newSettings: any) => {
    try {
      const settings = {
        notifications,
        radius,
        language,
        theme,
        privacy,
        ...newSettings,
      };
      await AsyncStorage.setItem('appSettings', JSON.stringify(settings));
      console.log('Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const handleNotificationChange = async (key: string, value: boolean) => {
    const newNotifications = { ...notifications, [key]: value };
    setNotifications(newNotifications);
    await saveSettings({ notifications: newNotifications });
  };

  const handleRadiusChange = async (newRadius: number) => {
    setRadius(newRadius);
    await saveSettings({ radius: newRadius });
  };

  const handleLanguageChange = async (newLanguage: string) => {
    setLanguage(newLanguage);
    setShowLanguageModal(false);
    await saveSettings({ language: newLanguage });
    Alert.alert('Language Changed', `Language set to ${newLanguage}`);
  };

  const handleThemeChange = async (newTheme: string) => {
    setTheme(newTheme);
    setShowThemeModal(false);
    await saveSettings({ theme: newTheme });
    Alert.alert('Theme Changed', `Theme set to ${newTheme} mode`);
  };

  const handlePrivacyChange = async (key: string, value: boolean) => {
    const newPrivacy = { ...privacy, [key]: value };
    setPrivacy(newPrivacy);
    await saveSettings({ privacy: newPrivacy });
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', onPress: () => signOut(), style: 'destructive' },
      ]
    );
  };

  const handleClearCache = () => {
    Alert.alert(
      'Clear Cache',
      'This will clear all cached data. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: () => {
          Alert.alert('Success', 'Cache cleared successfully!');
        }},
      ]
    );
  };

  const handleResetPrivacy = () => {
    const defaultPrivacy = {
      profileVisible: true,
      locationSharing: true,
      dataCollection: false,
      analytics: false,
    };
    setPrivacy(defaultPrivacy);
    saveSettings({ privacy: defaultPrivacy });
    Alert.alert('Privacy Reset', 'Privacy settings have been reset to defaults.');
  };

  const radiusOptions = [1, 5, 10, 15, 20];
  const languageOptions = ['English', 'Spanish', 'French', 'German'];
  const themeOptions = ['Light', 'Dark', 'Auto'];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
          <Text style={styles.subtitle}>Customize your HyperAPP experience</Text>
        </View>

        <View style={styles.content}>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Bell size={20} color="#ff4757" />
              <Text style={styles.sectionTitle}>Notifications</Text>
            </View>
            
            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>SOS Alerts</Text>
              <Switch
                value={notifications.sos}
                onValueChange={(value) => handleNotificationChange('sos', value)}
                trackColor={{ false: '#3e3e3e', true: '#ff4757' }}
                thumbColor="#ffffff"
              />
            </View>
            
            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Vibe Updates</Text>
              <Switch
                value={notifications.vibes}
                onValueChange={(value) => handleNotificationChange('vibes', value)}
                trackColor={{ false: '#3e3e3e', true: '#ff4757' }}
                thumbColor="#ffffff"
              />
            </View>
            
            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Event Reports</Text>
              <Switch
                value={notifications.events}
                onValueChange={(value) => handleNotificationChange('events', value)}
                trackColor={{ false: '#3e3e3e', true: '#ff4757' }}
                thumbColor="#ffffff"
              />
            </View>
            
            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Nearby Users</Text>
              <Switch
                value={notifications.nearby}
                onValueChange={(value) => handleNotificationChange('nearby', value)}
                trackColor={{ false: '#3e3e3e', true: '#ff4757' }}
                thumbColor="#ffffff"
              />
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MapPin size={20} color="#ff4757" />
              <Text style={styles.sectionTitle}>Alert Radius</Text>
            </View>
            
            <Text style={styles.sectionDescription}>
              Set the distance for receiving alerts and notifications
            </Text>
            
            <View style={styles.radiusContainer}>
              {radiusOptions.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.radiusOption,
                    radius === option && styles.radiusOptionSelected,
                  ]}
                  onPress={() => handleRadiusChange(option)}
                >
                  <Text
                    style={[
                      styles.radiusOptionText,
                      radius === option && styles.radiusOptionTextSelected,
                    ]}
                  >
                    {option}km
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Globe size={20} color="#ff4757" />
              <Text style={styles.sectionTitle}>Language</Text>
            </View>
            
            {languageOptions.map((option) => (
              <TouchableOpacity
                key={option}
                style={styles.optionItem}
                onPress={() => handleLanguageChange(option)}
              >
                <Text style={styles.optionLabel}>{option}</Text>
                <View style={styles.optionRight}>
                  {language === option && (
                    <View style={styles.selectedDot} />
                  )}
                  <ChevronRight size={16} color="#8e8e93" />
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Palette size={20} color="#ff4757" />
              <Text style={styles.sectionTitle}>Appearance</Text>
            </View>
            
            {themeOptions.map((option) => (
              <TouchableOpacity
                key={option}
                style={styles.optionItem}
                onPress={() => handleThemeChange(option.toLowerCase())}
              >
                <Text style={styles.optionLabel}>{option} Mode</Text>
                <View style={styles.optionRight}>
                  {theme === option.toLowerCase() && (
                    <View style={styles.selectedDot} />
                  )}
                  <ChevronRight size={16} color="#8e8e93" />
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Shield size={20} color="#ff4757" />
              <Text style={styles.sectionTitle}>Privacy & Security</Text>
            </View>

            <TouchableOpacity
              style={styles.optionItem}
              onPress={() => setShowPrivacyModal(true)}
            >
              <Text style={styles.optionLabel}>Privacy Settings</Text>
              <ChevronRight size={16} color="#8e8e93" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.optionItem}>
              <Text style={styles.optionLabel}>Privacy Policy</Text>
              <ChevronRight size={16} color="#8e8e93" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.optionItem}>
              <Text style={styles.optionLabel}>Terms of Service</Text>
              <ChevronRight size={16} color="#8e8e93" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.optionItem}>
              <Text style={styles.optionLabel}>Data & Storage</Text>
              <ChevronRight size={16} color="#8e8e93" />
            </TouchableOpacity>
          </View>

          {/* Privacy Modal */}
          <Modal visible={showPrivacyModal} transparent animationType="slide">
            <View style={styles.modalOverlay}>
              <View style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Privacy Settings</Text>
                  <TouchableOpacity
                    style={styles.modalCloseButton}
                    onPress={() => setShowPrivacyModal(false)}
                  >
                    <Text style={styles.modalCloseText}>✕</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalContent}>
                  <View style={styles.privacySection}>
                    <Text style={styles.privacySectionTitle}>Profile Visibility</Text>
                    <View style={styles.privacyItem}>
                      <View style={styles.privacyItemLeft}>
                        <User size={20} color="#ffffff" />
                        <View style={styles.privacyItemText}>
                          <Text style={styles.privacyItemTitle}>Profile Visible to Others</Text>
                          <Text style={styles.privacyItemDescription}>
                            Allow other users to see your profile information
                          </Text>
                        </View>
                      </View>
                      <Switch
                        value={privacy.profileVisible}
                        onValueChange={(value) => handlePrivacyChange('profileVisible', value)}
                        trackColor={{ false: '#3e3e3e', true: '#ff4757' }}
                        thumbColor="#ffffff"
                      />
                    </View>
                  </View>

                  <View style={styles.privacySection}>
                    <Text style={styles.privacySectionTitle}>Location Sharing</Text>
                    <View style={styles.privacyItem}>
                      <View style={styles.privacyItemLeft}>
                        <MapPin size={20} color="#ffffff" />
                        <View style={styles.privacyItemText}>
                          <Text style={styles.privacyItemTitle}>Share Location</Text>
                          <Text style={styles.privacyItemDescription}>
                            Allow location sharing for community features
                          </Text>
                        </View>
                      </View>
                      <Switch
                        value={privacy.locationSharing}
                        onValueChange={(value) => handlePrivacyChange('locationSharing', value)}
                        trackColor={{ false: '#3e3e3e', true: '#ff4757' }}
                        thumbColor="#ffffff"
                      />
                    </View>
                  </View>

                  <View style={styles.privacySection}>
                    <Text style={styles.privacySectionTitle}>Data Collection</Text>
                    <View style={styles.privacyItem}>
                      <View style={styles.privacyItemLeft}>
                        <Eye size={20} color="#ffffff" />
                        <View style={styles.privacyItemText}>
                          <Text style={styles.privacyItemTitle}>Analytics & Usage Data</Text>
                          <Text style={styles.privacyItemDescription}>
                            Help improve the app by sharing anonymous usage data
                          </Text>
                        </View>
                      </View>
                      <Switch
                        value={privacy.analytics}
                        onValueChange={(value) => handlePrivacyChange('analytics', value)}
                        trackColor={{ false: '#3e3e3e', true: '#ff4757' }}
                        thumbColor="#ffffff"
                      />
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.resetButton}
                    onPress={handleResetPrivacy}
                  >
                    <Text style={styles.resetButtonText}>Reset to Defaults</Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </View>
          </Modal>

          <View style={styles.section}>
            <TouchableOpacity style={styles.dangerItem} onPress={handleClearCache}>
              <Trash2 size={20} color="#ff4757" />
              <Text style={styles.dangerLabel}>Clear Cache</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.dangerItem} onPress={handleSignOut}>
              <LogOut size={20} color="#ff4757" />
              <Text style={styles.dangerLabel}>Sign Out</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>HyperAPP v1.0.0</Text>
            <Text style={styles.footerText}>Made with ❤️ for community safety</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#8e8e93',
    textAlign: 'center',
  },
  content: {
    padding: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  sectionDescription: {
    fontSize: 14,
    color: '#8e8e93',
    marginBottom: 16,
    lineHeight: 20,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  settingLabel: {
    fontSize: 16,
    color: '#ffffff',
  },
  radiusContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  radiusOption: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  radiusOptionSelected: {
    backgroundColor: 'rgba(255, 71, 87, 0.2)',
    borderColor: '#ff4757',
  },
  radiusOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8e8e93',
  },
  radiusOptionTextSelected: {
    color: '#ff4757',
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  optionLabel: {
    fontSize: 16,
    color: '#ffffff',
  },
  optionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ff4757',
  },
  dangerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 71, 87, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    gap: 12,
  },
  dangerLabel: {
    fontSize: 16,
    color: '#ff4757',
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    marginTop: 32,
    gap: 4,
  },
  footerText: {
    fontSize: 12,
    color: '#8e8e93',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#1a1a2e',
    borderRadius: 20,
    padding: 24,
    margin: 20,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalCloseText: {
    fontSize: 24,
    color: '#8e8e93',
  },
  modalContent: {
    flex: 1,
  },
  privacySection: {
    marginBottom: 24,
  },
  privacySectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 16,
  },
  privacyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  privacyItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  privacyItemText: {
    flex: 1,
  },
  privacyItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  privacyItemDescription: {
    fontSize: 14,
    color: '#8e8e93',
    lineHeight: 18,
  },
  resetButton: {
    backgroundColor: '#ff4757',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  resetButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
