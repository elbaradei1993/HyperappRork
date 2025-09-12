import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  FlatList,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { useSettings } from '@/contexts/SettingsContext';
import notificationService from '@/utils/notificationService';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Bell,
  MessageCircle,
  AlertTriangle,
  Heart,
  Users,
  MapPin,
  Shield,
  Calendar,
  ChevronLeft,
  Trash2,
  CheckCircle,
  Mail,
  MessageSquare,
  Volume2,
  Vibrate,
  Moon,
  Sparkles,
  Clock,
  X,
} from 'lucide-react-native';

const { width } = Dimensions.get('window');

interface NotificationSettings {
  pushEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
  vibeAlerts: boolean;
  eventAlerts: boolean;
  sosAlerts: boolean;
  nearbyAlerts: boolean;
  communityUpdates: boolean;
  weeklyDigest: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
}

export default function NotificationsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { t } = useSettings();
  const { notifications, markAsRead, markAllAsRead, removeNotification, unreadCount } = useNotifications();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'notifications' | 'settings'>('notifications');
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pushNotificationSupport, setPushNotificationSupport] = useState<boolean>(false);
  const [supportMessage, setSupportMessage] = useState<string>('');
  
  const [settings, setSettings] = useState<NotificationSettings>({
    pushEnabled: true,
    emailEnabled: true,
    smsEnabled: false,
    vibeAlerts: true,
    eventAlerts: true,
    sosAlerts: true,
    nearbyAlerts: true,
    communityUpdates: true,
    weeklyDigest: false,
    soundEnabled: true,
    vibrationEnabled: true,
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '07:00',
  });

  useEffect(() => {
    loadSettings();
    checkNotificationSupport();
    // Animate entrance
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mark all notifications as read when entering the screen
  useEffect(() => {
    if (unreadCount > 0) {
      // Small delay to show the user the unread notifications first
      const timer = setTimeout(() => {
        markAllAsRead();
      }, 1000);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkNotificationSupport = async () => {
    const hasSupport = await notificationService.checkPushNotificationSupport();
    setPushNotificationSupport(hasSupport);
    setSupportMessage(notificationService.getNotificationSupportMessage());
  };

  const loadSettings = async () => {
    try {
      const saved = await AsyncStorage.getItem(`notifications_${user?.id}`);
      if (saved) {
        setSettings(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: keyof NotificationSettings, value: boolean) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    
    try {
      await AsyncStorage.setItem(`notifications_${user?.id}`, JSON.stringify(newSettings));
    } catch (error) {
      console.error('Error saving notification settings:', error);
    }
  };

  const handleDeleteNotification = (id: string) => {
    setDeletingId(id);
    setTimeout(() => {
      removeNotification(id);
      setDeletingId(null);
    }, 300);
  };

  if (loading) {
    return (
      <LinearGradient
        colors={['#f8f9fa', '#e9ecef']}
        style={[styles.container, styles.loadingContainer]}
      >
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading notifications...</Text>
      </LinearGradient>
    );
  }

  const renderNotification = ({ item, index }: { item: any; index: number }) => {
    const getIconConfig = () => {
      switch (item.type) {
        case 'sos':
          return { icon: Shield, color: '#ef4444', bgColor: '#fee2e2' };
        case 'event':
          return { icon: AlertTriangle, color: '#f59e0b', bgColor: '#fef3c7' };
        case 'vibe':
          return { icon: Heart, color: '#10b981', bgColor: '#d1fae5' };
        default:
          return { icon: Bell, color: '#6366f1', bgColor: '#e0e7ff' };
      }
    };

    const { icon: Icon, color, bgColor } = getIconConfig();
    const isDeleting = deletingId === item.id;
    const animatedValue = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 300,
        delay: index * 50,
        useNativeDriver: true,
      }).start();
    }, []);

    const formatTime = (timestamp: string) => {
      const date = new Date(timestamp);
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const days = Math.floor(hours / 24);
      
      if (hours < 1) return 'Just now';
      if (hours < 24) return `${hours}h ago`;
      if (days < 7) return `${days}d ago`;
      return date.toLocaleDateString();
    };

    return (
      <Animated.View
        style={[
          {
            opacity: isDeleting ? 0.5 : animatedValue,
            transform: [
              {
                translateY: animatedValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }),
              },
              {
                scale: isDeleting ? 0.95 : 1,
              },
            ],
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.notificationItem, !item.read && styles.unreadNotification]}
          onPress={() => {
            markAsRead(item.id);
            if (item.alertId) {
              router.push(`/alert-details/${item.alertId}` as any);
            }
          }}
          activeOpacity={0.7}
        >
          <View style={[styles.notificationIcon, { backgroundColor: bgColor }]}>
            <Icon size={24} color={color} />
          </View>
          <View style={styles.notificationContent}>
            <View style={styles.notificationHeader}>
              <Text style={[styles.notificationTitle, !item.read && styles.unreadText]}>
                {item.title}
              </Text>
              {!item.read && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadBadgeText}>NEW</Text>
                </View>
              )}
            </View>
            <Text style={styles.notificationDescription} numberOfLines={2}>
              {item.description}
            </Text>
            <View style={styles.notificationFooter}>
              <Clock size={12} color="#9ca3af" />
              <Text style={styles.notificationTime}>
                {formatTime(item.timestamp)}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteNotification(item.id)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X size={18} color="#9ca3af" />
          </TouchableOpacity>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <>
      <Stack.Screen 
        options={{
          title: '',
          headerTransparent: true,
          headerLeft: () => null,
          headerRight: () => null,
        }}
      />
      
      <LinearGradient
        colors={['#6366f1', '#8b5cf6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('notifications')}</Text>
          {notifications.length > 0 && activeTab === 'notifications' && (
            <TouchableOpacity onPress={markAllAsRead} style={styles.markAllButton}>
              <CheckCircle size={20} color="#ffffff" />
            </TouchableOpacity>
          )}
        </View>
        
        {/* Tab Switcher */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'notifications' && styles.activeTab]}
            onPress={() => setActiveTab('notifications')}
          >
            <Bell size={18} color={activeTab === 'notifications' ? '#ffffff' : '#e0e7ff'} />
            <Text style={[styles.tabText, activeTab === 'notifications' && styles.activeTabText]}>
              {t('notifications')}
            </Text>
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'settings' && styles.activeTab]}
            onPress={() => setActiveTab('settings')}
          >
            <Sparkles size={18} color={activeTab === 'settings' ? '#ffffff' : '#e0e7ff'} />
            <Text style={[styles.tabText, activeTab === 'settings' && styles.activeTabText]}>
              {t('settings')}
            </Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <View style={styles.container}>

        {activeTab === 'notifications' ? (
          <Animated.View 
            style={[
              styles.tabContent,
              {
                opacity: fadeAnim,
                transform: [
                  {
                    translateY: slideAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [30, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            {notifications.length > 0 ? (
              <FlatList
                data={notifications}
                renderItem={renderNotification}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.notificationsList}
                showsVerticalScrollIndicator={false}
              />
            ) : (
              <View style={styles.emptyState}>
                <LinearGradient
                  colors={['#e0e7ff', '#c7d2fe']}
                  style={styles.emptyStateIcon}
                >
                  <Bell size={32} color="#6366f1" />
                </LinearGradient>
                <Text style={styles.emptyStateTitle}>{t('noNotifications')}</Text>
                <Text style={styles.emptyStateText}>{t('notificationsWillAppearHere')}</Text>
              </View>
            )}
          </Animated.View>
        ) : (
      <Animated.ScrollView 
        style={[
          styles.settingsContainer,
          {
            opacity: fadeAnim,
            transform: [
              {
                translateY: slideAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [30, 0],
                }),
              },
            ],
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Main Notification Channels */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
              <Bell size={16} color="#6366f1" />
            </View>
            <Text style={styles.sectionTitle}>{t('notificationChannels')}</Text>
          </View>
          
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIconBg, { backgroundColor: '#e0e7ff' }]}>
                <Bell size={20} color="#6366f1" />
              </View>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Push Notifications</Text>
                <Text style={styles.settingDescription}>
                  {pushNotificationSupport ? 'Receive alerts on your device' : 'In-app notifications only'}
                </Text>
              </View>
            </View>
            <Switch
              value={settings.pushEnabled && pushNotificationSupport}
              onValueChange={(value) => {
                if (pushNotificationSupport) {
                  updateSetting('pushEnabled', value);
                }
              }}
              trackColor={{ false: '#e5e7eb', true: '#c7d2fe' }}
              thumbColor={(settings.pushEnabled && pushNotificationSupport) ? '#6366f1' : '#9ca3af'}
              ios_backgroundColor="#e5e7eb"
              disabled={!pushNotificationSupport}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIconBg, { backgroundColor: '#fce7f3' }]}>
                <Mail size={20} color="#ec4899" />
              </View>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Email Notifications</Text>
                <Text style={styles.settingDescription}>Get updates in your inbox</Text>
              </View>
            </View>
            <Switch
              value={settings.emailEnabled}
              onValueChange={(value) => updateSetting('emailEnabled', value)}
              trackColor={{ false: '#e5e7eb', true: '#fbcfe8' }}
              thumbColor={settings.emailEnabled ? '#ec4899' : '#9ca3af'}
              ios_backgroundColor="#e5e7eb"
            />
          </View>

          <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIconBg, { backgroundColor: '#d1fae5' }]}>
                <MessageSquare size={20} color="#10b981" />
              </View>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>SMS Notifications</Text>
                <Text style={styles.settingDescription}>Critical alerts via text</Text>
              </View>
            </View>
            <Switch
              value={settings.smsEnabled}
              onValueChange={(value) => updateSetting('smsEnabled', value)}
              trackColor={{ false: '#e5e7eb', true: '#a7f3d0' }}
              thumbColor={settings.smsEnabled ? '#10b981' : '#9ca3af'}
              ios_backgroundColor="#e5e7eb"
            />
          </View>
        </View>

        {/* Alert Types */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
              <AlertTriangle size={16} color="#f59e0b" />
            </View>
            <Text style={styles.sectionTitle}>Alert Types</Text>
          </View>
          
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIconBg, { backgroundColor: '#d1fae5' }]}>
                <Heart size={20} color="#10b981" />
              </View>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Vibe Alerts</Text>
                <Text style={styles.settingDescription}>Positive community vibes</Text>
              </View>
            </View>
            <Switch
              value={settings.vibeAlerts}
              onValueChange={(value) => updateSetting('vibeAlerts', value)}
              trackColor={{ false: '#e5e7eb', true: '#a7f3d0' }}
              thumbColor={settings.vibeAlerts ? '#10b981' : '#9ca3af'}
              ios_backgroundColor="#e5e7eb"
              disabled={!settings.pushEnabled}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIconBg, { backgroundColor: '#fef3c7' }]}>
                <AlertTriangle size={20} color="#f59e0b" />
              </View>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Event Alerts</Text>
                <Text style={styles.settingDescription}>Local events and incidents</Text>
              </View>
            </View>
            <Switch
              value={settings.eventAlerts}
              onValueChange={(value) => updateSetting('eventAlerts', value)}
              trackColor={{ false: '#e5e7eb', true: '#fde68a' }}
              thumbColor={settings.eventAlerts ? '#f59e0b' : '#9ca3af'}
              ios_backgroundColor="#e5e7eb"
              disabled={!settings.pushEnabled}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIconBg, { backgroundColor: '#fee2e2' }]}>
                <Shield size={20} color="#ef4444" />
              </View>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>SOS Alerts</Text>
                <Text style={styles.settingDescription}>Emergency notifications</Text>
              </View>
            </View>
            <Switch
              value={settings.sosAlerts}
              onValueChange={(value) => updateSetting('sosAlerts', value)}
              trackColor={{ false: '#e5e7eb', true: '#fca5a5' }}
              thumbColor={settings.sosAlerts ? '#ef4444' : '#9ca3af'}
              ios_backgroundColor="#e5e7eb"
              disabled={!settings.pushEnabled}
            />
          </View>

          <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIconBg, { backgroundColor: '#e0e7ff' }]}>
                <MapPin size={20} color="#6366f1" />
              </View>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Nearby Alerts</Text>
                <Text style={styles.settingDescription}>Alerts within your area</Text>
              </View>
            </View>
            <Switch
              value={settings.nearbyAlerts}
              onValueChange={(value) => updateSetting('nearbyAlerts', value)}
              trackColor={{ false: '#e5e7eb', true: '#c7d2fe' }}
              thumbColor={settings.nearbyAlerts ? '#6366f1' : '#9ca3af'}
              ios_backgroundColor="#e5e7eb"
              disabled={!settings.pushEnabled}
            />
          </View>
        </View>

        {/* Community Updates */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
              <Users size={16} color="#8b5cf6" />
            </View>
            <Text style={styles.sectionTitle}>Community</Text>
          </View>
          
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIconBg, { backgroundColor: '#ede9fe' }]}>
                <Users size={20} color="#8b5cf6" />
              </View>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Community Updates</Text>
                <Text style={styles.settingDescription}>News from your community</Text>
              </View>
            </View>
            <Switch
              value={settings.communityUpdates}
              onValueChange={(value) => updateSetting('communityUpdates', value)}
              trackColor={{ false: '#e5e7eb', true: '#ddd6fe' }}
              thumbColor={settings.communityUpdates ? '#8b5cf6' : '#9ca3af'}
              ios_backgroundColor="#e5e7eb"
            />
          </View>

          <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIconBg, { backgroundColor: '#fce7f3' }]}>
                <Calendar size={20} color="#ec4899" />
              </View>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Weekly Digest</Text>
                <Text style={styles.settingDescription}>Summary of weekly activity</Text>
              </View>
            </View>
            <Switch
              value={settings.weeklyDigest}
              onValueChange={(value) => updateSetting('weeklyDigest', value)}
              trackColor={{ false: '#e5e7eb', true: '#fbcfe8' }}
              thumbColor={settings.weeklyDigest ? '#ec4899' : '#9ca3af'}
              ios_backgroundColor="#e5e7eb"
            />
          </View>
        </View>

        {/* Expo Go Notice */}
        {!pushNotificationSupport && (
          <View style={[styles.section, { backgroundColor: '#fef3c7' }]}>
            <View style={styles.noticeContent}>
              <View style={styles.noticeIcon}>
                <Bell size={20} color="#f59e0b" />
              </View>
              <View style={styles.noticeTextContainer}>
                <Text style={styles.noticeTitle}>Limited Notification Support</Text>
                <Text style={styles.noticeText}>{supportMessage}</Text>
                <Text style={styles.noticeSubtext}>In-app notifications will still work normally.</Text>
              </View>
            </View>
          </View>
        )}

        {/* Sound & Vibration */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
              <Volume2 size={16} color="#06b6d4" />
            </View>
            <Text style={styles.sectionTitle}>Sound & Vibration</Text>
          </View>
          
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIconBg, { backgroundColor: '#cffafe' }]}>
                <Volume2 size={20} color="#06b6d4" />
              </View>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Sound</Text>
                <Text style={styles.settingDescription}>Play notification sounds</Text>
              </View>
            </View>
            <Switch
              value={settings.soundEnabled}
              onValueChange={(value) => updateSetting('soundEnabled', value)}
              trackColor={{ false: '#e5e7eb', true: '#a5f3fc' }}
              thumbColor={settings.soundEnabled ? '#06b6d4' : '#9ca3af'}
              ios_backgroundColor="#e5e7eb"
            />
          </View>

          <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIconBg, { backgroundColor: '#f3e8ff' }]}>
                <Vibrate size={20} color="#a855f7" />
              </View>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Vibration</Text>
                <Text style={styles.settingDescription}>Vibrate on notifications</Text>
              </View>
            </View>
            <Switch
              value={settings.vibrationEnabled}
              onValueChange={(value) => updateSetting('vibrationEnabled', value)}
              trackColor={{ false: '#e5e7eb', true: '#e9d5ff' }}
              thumbColor={settings.vibrationEnabled ? '#a855f7' : '#9ca3af'}
              ios_backgroundColor="#e5e7eb"
            />
          </View>
        </View>

        {/* Quiet Hours */}
        <View style={[styles.section, { marginBottom: 32 }]}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
              <Moon size={16} color="#6366f1" />
            </View>
            <Text style={styles.sectionTitle}>Quiet Hours</Text>
          </View>
          
          <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIconBg, { backgroundColor: '#e0e7ff' }]}>
                <Moon size={20} color="#6366f1" />
              </View>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Do Not Disturb</Text>
                <Text style={styles.settingDescription}>
                  {settings.quietHoursEnabled 
                    ? `${settings.quietHoursStart} - ${settings.quietHoursEnd}`
                    : 'Disabled'}
                </Text>
              </View>
            </View>
            <Switch
              value={settings.quietHoursEnabled}
              onValueChange={(value) => updateSetting('quietHoursEnabled', value)}
              trackColor={{ false: '#e5e7eb', true: '#c7d2fe' }}
              thumbColor={settings.quietHoursEnabled ? '#6366f1' : '#9ca3af'}
              ios_backgroundColor="#e5e7eb"
            />
          </View>
        </View>
      </Animated.ScrollView>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 10,
  },
  section: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 14,
  },
  settingIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 3,
  },
  settingDescription: {
    fontSize: 13,
    color: '#6b7280',
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    gap: 6,
  },
  activeTab: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  tabText: {
    fontSize: 14,
    color: '#e0e7ff',
    fontWeight: '600',
  },
  activeTabText: {
    color: '#ffffff',
  },
  badge: {
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  tabContent: {
    flex: 1,
  },
  markAllButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationsList: {
    paddingVertical: 12,
  },
  notificationItem: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  unreadNotification: {
    backgroundColor: '#fefce8',
    borderWidth: 1,
    borderColor: '#fef08a',
  },
  notificationIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  unreadText: {
    fontWeight: '700',
  },
  unreadBadge: {
    backgroundColor: '#fbbf24',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  unreadBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#78350f',
  },
  notificationDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
    lineHeight: 20,
  },
  notificationFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  notificationTime: {
    fontSize: 12,
    color: '#9ca3af',
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyStateIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    paddingHorizontal: 50,
    lineHeight: 20,
  },
  settingsContainer: {
    flex: 1,
  },
  noticeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  noticeIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noticeTextContainer: {
    flex: 1,
  },
  noticeTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 4,
  },
  noticeText: {
    fontSize: 13,
    color: '#78350f',
    marginBottom: 2,
  },
  noticeSubtext: {
    fontSize: 12,
    color: '#92400e',
    fontStyle: 'italic',
  },
});
