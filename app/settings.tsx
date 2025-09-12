import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Bell,
  Globe,
  Palette,
  MapPin,
  Shield,
  Trash2,
  ChevronRight,
  Check,
  ChevronLeft,
} from 'lucide-react-native';
import { router } from 'expo-router';
import { useSettings } from '@/contexts/SettingsContext';
import { languageOptions } from '@/utils/translations';
import { useNotifications } from '@/contexts/NotificationContext';

export default function SettingsScreen() {
  const { signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const { t, language, setLanguage, theme, setTheme, isDark } = useSettings();
  const { addNotification } = useNotifications();
  const [notifications, setNotifications] = useState({
    sos: true,
    vibes: true,
    events: true,
    nearby: false,
  });
  const [radius, setRadius] = useState(10);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('appSettings');
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        setNotifications(settings.notifications || {
          sos: true,
          vibes: true,
          events: true,
          nearby: false,
        });
        setRadius(settings.radius || 10);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const saveSettings = async (newSettings: any) => {
    try {
      const settings = {
        notifications,
        radius,
        language,
        theme,
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

  const handleLanguageChange = async (newLanguage: 'en' | 'es' | 'fr' | 'de' | 'ar') => {
    await setLanguage(newLanguage);
    setShowLanguageModal(false);
    const langName = languageOptions.find(l => l.code === newLanguage)?.nativeName || newLanguage.toUpperCase();
    Alert.alert(t('languageChanged'), `${t('setTo')} ${langName}`);
  };

  const handleThemeChange = async (newTheme: 'light' | 'dark' | 'auto') => {
    await setTheme(newTheme);
    setShowThemeModal(false);
    Alert.alert(t('themeChanged'), `${t('setTo')} ${newTheme.charAt(0).toUpperCase() + newTheme.slice(1)} Mode`);
  };

  const handleClearCache = () => {
    Alert.alert(
      t('clearCache'),
      'This will clear all cached data except your login. Are you sure?',
      [
        { text: t('cancel'), style: 'cancel' },
        { 
          text: t('clear'), 
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('Clearing cache...');
              let clearedItems = 0;
              
              if (Platform.OS === 'web') {
                if (typeof window !== 'undefined') {
                  if (window.localStorage) {
                    const keysToRemove: string[] = [];
                    for (let i = 0; i < window.localStorage.length; i++) {
                      const key = window.localStorage.key(i);
                      if (key && !key.includes('supabase.auth') && !key.includes('sb-')) {
                        keysToRemove.push(key);
                      }
                    }
                    
                    keysToRemove.forEach(key => {
                      try {
                        window.localStorage.removeItem(key);
                        clearedItems++;
                      } catch (e) {
                        console.error(`Error removing ${key}:`, e);
                      }
                    });
                    console.log('Cleared localStorage keys:', keysToRemove);
                  }
                }
              } else {
                const allKeys = await AsyncStorage.getAllKeys();
                console.log('Found keys:', allKeys);
                
                const keysToRemove = allKeys.filter(key => 
                  !key.includes('supabase.auth') && !key.includes('sb-')
                );
                
                console.log('Keys to remove:', keysToRemove);
                
                if (keysToRemove.length > 0) {
                  await AsyncStorage.multiRemove(keysToRemove);
                  clearedItems = keysToRemove.length;
                  console.log('Cleared cache keys:', keysToRemove);
                }
              }
              
              if (clearedItems === 0) {
                Alert.alert('Info', 'No cache data to clear.');
                return;
              }
              
              setNotifications({
                sos: true,
                vibes: true,
                events: true,
                nearby: false,
              });
              setRadius(10);
              
              await saveSettings({
                notifications: {
                  sos: true,
                  vibes: true,
                  events: true,
                  nearby: false,
                },
                radius: 10
              });
              
              Alert.alert('Success', `Cache cleared successfully (${clearedItems} items). Your settings have been reset to defaults.`);
              
              if (Platform.OS === 'web' && typeof window !== 'undefined') {
                setTimeout(() => {
                  window.location.reload();
                }, 1000);
              }
            } catch (error) {
              console.error('Error clearing cache:', error);
              Alert.alert('Error', 'Failed to clear cache. Please try again.');
            }
          }
        },
      ]
    );
  };

  const radiusOptions = [1, 5, 10, 15, 20];
  const themeOptions = [
    { label: 'Light', value: 'light' as const },
    { label: 'Dark', value: 'dark' as const },
    { label: 'Auto', value: 'auto' as const },
  ];

  const containerStyle = isDark ? styles.containerDark : styles.containerLight;
  const textStyle = isDark ? styles.textDark : styles.textLight;
  const sectionStyle = isDark ? styles.sectionDark : styles.sectionLight;

  return (
    <View style={[styles.container, containerStyle]}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ChevronLeft size={24} color={isDark ? '#ffffff' : '#000000'} />
        </TouchableOpacity>
        <Text style={[styles.title, textStyle]}>{t('settings')}</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={[styles.section, sectionStyle]}>
            <View style={styles.sectionHeader}>
              <Bell size={20} color="#ff4757" />
              <Text style={[styles.sectionTitle, textStyle]}>{t('notifications')}</Text>
            </View>
            
            <View style={styles.settingItem}>
              <Text style={[styles.settingLabel, textStyle]}>{t('sosAlerts')}</Text>
              <Switch
                value={notifications.sos}
                onValueChange={(value) => handleNotificationChange('sos', value)}
                trackColor={{ false: '#3e3e3e', true: '#ff4757' }}
                thumbColor="#ffffff"
              />
            </View>
            
            <View style={styles.settingItem}>
              <Text style={[styles.settingLabel, textStyle]}>{t('vibeUpdates')}</Text>
              <Switch
                value={notifications.vibes}
                onValueChange={(value) => handleNotificationChange('vibes', value)}
                trackColor={{ false: '#3e3e3e', true: '#ff4757' }}
                thumbColor="#ffffff"
              />
            </View>
            
            <View style={styles.settingItem}>
              <Text style={[styles.settingLabel, textStyle]}>{t('eventReports')}</Text>
              <Switch
                value={notifications.events}
                onValueChange={(value) => handleNotificationChange('events', value)}
                trackColor={{ false: '#3e3e3e', true: '#ff4757' }}
                thumbColor="#ffffff"
              />
            </View>
            
            <View style={styles.settingItem}>
              <Text style={[styles.settingLabel, textStyle]}>{t('nearbyUsers')}</Text>
              <Switch
                value={notifications.nearby}
                onValueChange={(value) => handleNotificationChange('nearby', value)}
                trackColor={{ false: '#3e3e3e', true: '#ff4757' }}
                thumbColor="#ffffff"
              />
            </View>
          </View>

          <View style={[styles.section, sectionStyle]}>
            <View style={styles.sectionHeader}>
              <MapPin size={20} color="#ff4757" />
              <Text style={[styles.sectionTitle, textStyle]}>{t('alertRadius')}</Text>
            </View>
            
            <Text style={[styles.sectionDescription, textStyle]}>
              {t('setDistance')}
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

          <View style={[styles.section, sectionStyle]}>
            <View style={styles.sectionHeader}>
              <Globe size={20} color="#ff4757" />
              <Text style={[styles.sectionTitle, textStyle]}>{t('language')}</Text>
            </View>
            
            <TouchableOpacity
              style={styles.optionItem}
              onPress={() => setShowLanguageModal(true)}
              testID="language-button"
            >
              <Text style={[styles.optionLabel, textStyle]}>
                {languageOptions.find(opt => opt.code === language)?.nativeName || 'English'}
              </Text>
              <View style={styles.optionRight}>
                <ChevronRight size={16} color="#8e8e93" />
              </View>
            </TouchableOpacity>
          </View>

          <View style={[styles.section, sectionStyle]}>
            <View style={styles.sectionHeader}>
              <Palette size={20} color="#ff4757" />
              <Text style={[styles.sectionTitle, textStyle]}>{t('appearance')}</Text>
            </View>
            
            <TouchableOpacity
              style={styles.optionItem}
              onPress={() => setShowThemeModal(true)}
              testID="theme-button"
            >
              <Text style={[styles.optionLabel, textStyle]}>
                {theme === 'light' ? t('lightMode') : theme === 'dark' ? t('darkMode') : t('autoMode')}
              </Text>
              <View style={styles.optionRight}>
                <ChevronRight size={16} color="#8e8e93" />
              </View>
            </TouchableOpacity>
          </View>

          <View style={[styles.section, sectionStyle]}>
            <View style={styles.sectionHeader}>
              <MapPin size={20} color="#ff4757" />
              <Text style={[styles.sectionTitle, textStyle]}>Location</Text>
            </View>
            
            <TouchableOpacity style={styles.optionItem} onPress={() => router.push('/geofences' as any)}>
              <Text style={[styles.optionLabel, textStyle]}>Manage Geofences</Text>
              <ChevronRight size={16} color="#8e8e93" />
            </TouchableOpacity>
          </View>

          <View style={[styles.section, sectionStyle]}>
            <View style={styles.sectionHeader}>
              <Shield size={20} color="#ff4757" />
              <Text style={[styles.sectionTitle, textStyle]}>{t('privacySecurity')}</Text>
            </View>
            
            <TouchableOpacity style={styles.optionItem} onPress={() => router.push('/privacy-policy')}>
              <Text style={[styles.optionLabel, textStyle]}>{t('privacyPolicy')}</Text>
              <ChevronRight size={16} color="#8e8e93" />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.optionItem} onPress={() => router.push('/terms-of-service')}>
              <Text style={[styles.optionLabel, textStyle]}>{t('termsOfService')}</Text>
              <ChevronRight size={16} color="#8e8e93" />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.optionItem} onPress={() => router.push('/data-storage' as any)}>
              <Text style={[styles.optionLabel, textStyle]}>{t('dataStorage')}</Text>
              <ChevronRight size={16} color="#8e8e93" />
            </TouchableOpacity>
          </View>

          <View style={[styles.section, sectionStyle]}>
            <TouchableOpacity style={styles.dangerItem} onPress={handleClearCache}>
              <Trash2 size={20} color="#ff4757" />
              <Text style={[styles.dangerLabel, textStyle]}>{t('clearCache')}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={[styles.footerText, textStyle]}>HyperAPP v1.0.0</Text>
            <Text style={[styles.footerText, textStyle]}>Made with ❤️ for community safety</Text>
          </View>
        </View>
      </ScrollView>

      {/* Language Modal */}
      <Modal visible={showLanguageModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isDark ? styles.modalContentDark : styles.modalContentLight]}>
            <Text style={[styles.modalTitle, textStyle]}>{t('language')}</Text>
            {languageOptions.map((option) => (
              <TouchableOpacity
                key={option.code}
                style={styles.modalOption}
                onPress={() => handleLanguageChange(option.code as any)}
              >
                <Text style={[styles.modalOptionText, textStyle]}>{option.nativeName}</Text>
                {language === option.code && <Check size={20} color="#ff4757" />}
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setShowLanguageModal(false)}
            >
              <Text style={[styles.modalCloseText, textStyle]}>{t('cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Theme Modal */}
      <Modal visible={showThemeModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isDark ? styles.modalContentDark : styles.modalContentLight]}>
            <Text style={[styles.modalTitle, textStyle]}>{t('appearance')}</Text>
            {themeOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={styles.modalOption}
                onPress={() => handleThemeChange(option.value)}
              >
                <Text style={[styles.modalOptionText, textStyle]}>
                  {option.value === 'light' ? t('lightMode') : option.value === 'dark' ? t('darkMode') : t('autoMode')}
                </Text>
                {theme === option.value && <Check size={20} color="#ff4757" />}
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setShowThemeModal(false)}
            >
              <Text style={[styles.modalCloseText, textStyle]}>{t('cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  containerDark: {
    backgroundColor: '#1a1a2e',
  },
  containerLight: {
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  textDark: {
    color: '#ffffff',
  },
  textLight: {
    color: '#000000',
  },
  content: {
    padding: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
  },
  sectionLight: {
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    padding: 16,
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
  },
  sectionDescription: {
    fontSize: 14,
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  settingLabel: {
    fontSize: 16,
  },
  radiusContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  radiusOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
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
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  optionLabel: {
    fontSize: 16,
  },
  optionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dangerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    gap: 12,
  },
  dangerLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ff4757',
  },
  footer: {
    alignItems: 'center',
    marginTop: 32,
    gap: 4,
  },
  footerText: {
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    borderRadius: 20,
    padding: 24,
    margin: 20,
    width: '80%',
    maxWidth: 300,
  },
  modalContentDark: {
    backgroundColor: '#1a1a2e',
  },
  modalContentLight: {
    backgroundColor: '#ffffff',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalOptionText: {
    fontSize: 16,
  },
  modalClose: {
    marginTop: 20,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 16,
    color: '#ff4757',
    fontWeight: '600',
  },
});
