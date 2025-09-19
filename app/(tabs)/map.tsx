import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Animated,
  Alert as RNAlert,
  Platform,
} from 'react-native';
import { AlertTriangle, MapPin, Users, Bell, Navigation, X } from 'lucide-react-native';
import { Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocation } from '@/contexts/LocationContext';
import { useAlerts } from '@/contexts/AlertContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { SOSModal } from '@/components/SOSModal';
import { HyperMapView } from '@/components/MapView';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';

interface Alert {
  id: string;
  alert_type: string;
  location: {
    latitude: number;
    longitude: number;
  };
  reportType: 'vibe' | 'event' | 'sos';
  description?: string;
  timestamp?: string;
  resolved?: boolean;
  respondedBy?: string[];
  address?: string;
  userId?: string;
}

export default function MapScreen() {
  const { t, colors } = useSettings();
  const insets = useSafeAreaInsets();
  const styles = getStyles(colors, insets);
  const [showSOSModal, setShowSOSModal] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{lat: number, lng: number} | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [showAlertDetails, setShowAlertDetails] = useState(false);
  const [followUserLocation, setFollowUserLocation] = useState(true);
  const [showAlertsModal, setShowAlertsModal] = useState(false);
  const [showNearbyModal, setShowNearbyModal] = useState(false);
  const { location, requestPermission, getCurrentLocation, isHighAccuracy, setHighAccuracy, error } = useLocation();
  const { alerts, nearbyUsers, markAlertResolved, respondToAlert } = useAlerts();
  const { user } = useAuth();
  const { notifications, unreadCount, markAllAsRead, markAsRead } = useNotifications();
  const params = useLocalSearchParams<{ focusLat?: string; focusLng?: string; alertId?: string; alertType?: string }>();
  
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rippleAnim = useRef(new Animated.Value(0)).current;
  const bellShakeAnim = useRef(new Animated.Value(0)).current;
  const navButtonScale = useRef(new Animated.Value(1)).current;
  const navButtonRotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    requestPermission();
  }, []);

  // Handle focus location from params
  useEffect(() => {
    if (params.focusLat && params.focusLng) {
      setFollowUserLocation(false);
      
      // If there's an alertId, find and select that alert
      if (params.alertId) {
        const targetAlert = alerts.find(a => a.id === params.alertId);
        if (targetAlert) {
          setSelectedAlert(targetAlert);
          // Show alert details after a small delay
          setTimeout(() => {
            setShowAlertDetails(true);
          }, 500);
        }
      }
    }
  }, [params.focusLat, params.focusLng, params.alertId, alerts]);

  // Animate bell when there are unread notifications
  useEffect(() => {
    if (unreadCount > 0) {
      Animated.sequence([
        Animated.timing(bellShakeAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(bellShakeAnim, {
          toValue: -1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(bellShakeAnim, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [unreadCount]);

  useEffect(() => {
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnimation.start();

    return () => pulseAnimation.stop();
  }, []);

  const handleSOSPress = useCallback(() => {
    
    if (!location) {
      RNAlert.alert('Location Required', 'Please wait for your location to be detected before sending an SOS alert.');
      return;
    }
    
    // Animate the ripple effect
    Animated.sequence([
      Animated.timing(rippleAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(rippleAnim, {
        toValue: 0,
        duration: 0,
        useNativeDriver: true,
      }),
    ]).start();

    setShowSOSModal(true);
  }, [rippleAnim, location]);

  const handleMapPress = useCallback((coordinate: {lat: number, lng: number}) => {
    setSelectedLocation(coordinate);
    router.push('/report');
  }, []);
  
  const handleRecenterPress = async () => {
    // Animate button press
    Animated.sequence([
      Animated.parallel([
        Animated.timing(navButtonScale, {
          toValue: 0.9,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(navButtonRotate, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.spring(navButtonScale, {
          toValue: 1,
          friction: 3,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(navButtonRotate, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
    
    // First enable follow mode
    setFollowUserLocation(true);
    

    try {
      const currentLocation = await getCurrentLocation();
      if (currentLocation) {

        setFollowUserLocation(false);
        setTimeout(() => {
          setFollowUserLocation(true);
        }, 50);
      } else {
      }
    } catch (error) {
      // Error handled silently
    }
  };
  
  const handleAlertPress = useCallback((alert: Alert) => {
    setSelectedAlert(alert);
    // Small delay to ensure state updates properly
    setTimeout(() => {
      setShowAlertDetails(true);
    }, 100);
  }, []);
  
  const handleNotificationPress = useCallback(async (notification: any) => {
    
    // Mark this notification as read
    markAsRead(notification.id);
    
    // If it's an alert notification, show the alert details
    if (notification.data && notification.alertId) {
      const alert = alerts.find(a => a.id === notification.alertId);
      if (alert) {
        setSelectedAlert(alert);
        setShowNotifications(false);
        // Small delay to ensure state updates properly
        setTimeout(() => {
          setShowAlertDetails(true);
        }, 100);
      }
    }
  }, [alerts, markAsRead]);
  
  const getDirections = useCallback(async (alert: Alert) => {
    if (!location) return;
    
    const url = Platform.select({
      ios: `maps://app?saddr=${location.latitude},${location.longitude}&daddr=${alert.location.latitude},${alert.location.longitude}`,
      android: `google.navigation:q=${alert.location.latitude},${alert.location.longitude}&mode=d`,
      default: `https://www.google.com/maps/dir/?api=1&origin=${location.latitude},${location.longitude}&destination=${alert.location.latitude},${alert.location.longitude}`,
    });
    
    if (Platform.OS === 'web') {
      window.open(url, '_blank');
    } else {
      const { Linking } = await import('react-native');
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        const webUrl = `https://www.google.com/maps/dir/?api=1&origin=${location.latitude},${location.longitude}&destination=${alert.location.latitude},${alert.location.longitude}`;
        await Linking.openURL(webUrl);
      }
    }
  }, [location]);
  
  const handleRespondToAlert = useCallback(async (alert: Alert) => {
    if (!user) {
      RNAlert.alert(t('loginRequired'), t('loginToRespond'));
      return;
    }
    
    try {
      // Check if user has already responded
      if (alert.respondedBy?.includes(user.id)) {
        RNAlert.alert(t('alreadyResponded'), t('alreadyRespondedMessage'));
        // Still get directions even if already responded
        await getDirections(alert);
        return;
      }
      
      await respondToAlert(alert.id, user.id);
      const updatedAlert = { ...alert, respondedBy: [...(alert.respondedBy || []), user.id] };
      
      // Update selected alert if it's the same
      if (selectedAlert?.id === alert.id) {
        setSelectedAlert(updatedAlert);
      }
      
      RNAlert.alert(t('responseSent'), t('nowResponding'));
      
      // Automatically get directions after responding
      await getDirections(alert);
    } catch (error) {
      RNAlert.alert(t('error'), t('failedToRespond'));
    }
  }, [user, t, getDirections, respondToAlert, selectedAlert]);
  
  const handleMarkResolved = useCallback(async (alert: Alert) => {
    try {
      await markAlertResolved(alert.id);
      setShowAlertDetails(false);
      RNAlert.alert(t('success'), t('alertResolvedSuccess'));
    } catch (error) {
      RNAlert.alert(t('error'), t('alertResolvedError'));
    }
  }, [markAlertResolved, t]);

  const loadingPulse = useRef(new Animated.Value(0.3)).current;
  const loadingRotate = useRef(new Animated.Value(0)).current;
  
  const calculateDistance = useCallback((lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }, []);

  useEffect(() => {
    if (!location) {
      // Pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(loadingPulse, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(loadingPulse, {
            toValue: 0.3,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Rotate animation
      Animated.loop(
        Animated.timing(loadingRotate, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        })
      ).start();
    }
  }, [location, loadingPulse, loadingRotate]);

  if (!location) {
    return (
      <View style={styles.container}>
        <View style={[styles.loadingGradient, { backgroundColor: colors.background }]}>
          <View style={styles.loadingContainer}>
            <Animated.View
              style={[
                styles.loadingIconContainer,
                {
                  opacity: loadingPulse,
                  transform: [
                    {
                      rotate: loadingRotate.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '360deg'],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Navigation size={48} color={colors.pulse} />
            </Animated.View>
            <Text style={styles.loadingText}>{t('gettingLocation')}</Text>
            <Text style={styles.loadingSubtext}>{t('makeSureLocationEnabled')}</Text>
            
            {error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity 
                  style={styles.retryButton}
                  onPress={() => {
                    requestPermission();
                  }}
                >
                  <Text style={styles.retryButtonText}>{t('retry')}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Animated.View
                style={[
                  styles.loadingDots,
                  { opacity: loadingPulse },
                ]}
              >
                <View style={styles.loadingDot} />
                <View style={styles.loadingDot} />
                <View style={styles.loadingDot} />
              </Animated.View>
            )}
            
            <TouchableOpacity 
              style={styles.skipButton}
              onPress={() => {
                router.push('/(tabs)/pulse');
              }}
            >
              <Text style={styles.skipButtonText}>{t('skipForNow')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.mapContainer}>
        <HyperMapView
          location={location}
          alerts={alerts}
          nearbyUsers={nearbyUsers}
          onMapPress={handleMapPress}
          onAlertPress={handleAlertPress}
          focusLocation={params.focusLat && params.focusLng ? {
            latitude: parseFloat(params.focusLat),
            longitude: parseFloat(params.focusLng),
          } : undefined}
          followUserLocation={followUserLocation}
          onFollowUserChange={setFollowUserLocation}
        />
        
        <View style={styles.statsContainer}>
          <TouchableOpacity 
            style={[styles.statItem, isHighAccuracy && styles.statItemActive]}
            onPress={() => setHighAccuracy(!isHighAccuracy)}
          >
            <MapPin size={16} color={isHighAccuracy ? "#2196F3" : "#8e8e93"} />
            <Text style={[styles.statText, isHighAccuracy && styles.statTextActive]}>
              {isHighAccuracy ? t('highAccuracy') : t('balanced')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.statItem}
            onPress={() => setShowAlertsModal(true)}
          >
            <AlertTriangle size={16} color="#ff4757" />
            <Text style={styles.statText}>{alerts.length} {t('alerts')}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.statItem}
            onPress={() => setShowNearbyModal(true)}
          >
            <Users size={16} color="#4CAF50" />
            <Text style={styles.statText}>{nearbyUsers.length} {t('nearby')}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.notificationButton, unreadCount > 0 && styles.notificationButtonActive]}
            onPress={() => {
              setShowNotifications(!showNotifications);
              // Mark all as read when opening notifications panel
              if (!showNotifications && unreadCount > 0) {
                setTimeout(() => {
                  markAllAsRead();
                }, 500); // Small delay to let user see the notifications first
              }
            }}
          >
            <Animated.View style={[
              styles.bellAnimatedContainer,
              {
                transform: [{
                  rotate: bellShakeAnim.interpolate({
                    inputRange: [-1, 1],
                    outputRange: ['-10deg', '10deg'],
                  }),
                }],
              },
            ]}>
              <Bell size={18} color={unreadCount > 0 ? '#ffffff' : '#1a1a2e'} />
            </Animated.View>
            {unreadCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>{unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
        
        {/* Navigation/Recenter Button */}
        <Animated.View
          style={[
            styles.navigationButton,
            {
              transform: [
                { scale: navButtonScale },
                {
                  rotate: navButtonRotate.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', '360deg'],
                  }),
                },
              ],
            },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.navigationButtonInner,
              followUserLocation && styles.navigationButtonActive,
            ]}
            onPress={handleRecenterPress}
            activeOpacity={0.8}
          >
            <Navigation 
              size={20} 
              color={followUserLocation ? '#ffffff' : '#1a1a2e'} 
            />
            {followUserLocation && (
              <Animated.View style={styles.navigationActiveIndicator} />
            )}
          </TouchableOpacity>
        </Animated.View>
        
        {/* Notifications Panel */}
        {showNotifications && (
          <View style={styles.notificationsPanel}>
            <Text style={styles.notificationsPanelTitle}>{t('notifications')}</Text>
            {notifications.length === 0 ? (
              <Text style={styles.noNotificationsText}>{t('noNotifications')}</Text>
            ) : (
              notifications.slice(0, 10).map((notification) => {
                const alert = notification.data as Alert | undefined;
                return (
                  <TouchableOpacity
                    key={notification.id}
                    style={[styles.notificationItem, !notification.read && styles.notificationItemUnread]}
                    onPress={() => handleNotificationPress(notification)}
                  >
                    <View style={styles.notificationIcon}>
                      <Text>
                        {notification.type === 'sos' ? '🆘' : 
                         notification.type === 'event' ? '⚠️' : 
                         notification.type === 'vibe' ? '📍' : '🔔'}
                      </Text>
                    </View>
                    <View style={styles.notificationContent}>
                      <Text style={styles.notificationTitle}>
                        {notification.title}
                      </Text>
                      <Text style={styles.notificationDescription}>
                        {notification.description}
                      </Text>
                      <Text style={styles.notificationTime}>
                        {new Date(notification.timestamp).toLocaleTimeString()}
                      </Text>
                    </View>
                    {alert && (notification.type === 'sos' || notification.type === 'event') && (
                      <View style={styles.notificationActions}>
                        {notification.type === 'sos' && (
                          <TouchableOpacity
                            style={[
                              styles.respondButton,
                              alert.respondedBy?.includes(user?.id || '') && styles.respondButtonDisabled
                            ]}
                            onPress={async (e) => {
                              e.stopPropagation();
                              markAsRead(notification.id);
                              setShowNotifications(false);
                              setSelectedAlert(alert);
                              await handleRespondToAlert(alert);
                              setTimeout(() => {
                                setShowAlertDetails(true);
                              }, 100);
                            }}
                          >
                            <Text style={styles.respondButtonText}>
                              {alert.respondedBy?.includes(user?.id || '') ? t('responded') : t('respond')}
                            </Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          style={styles.directionsButton}
                          onPress={(e) => {
                            e.stopPropagation();
                            if (alert) getDirections(alert);
                          }}
                        >
                          <Navigation size={16} color="#ffffff" />
                        </TouchableOpacity>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        )}



        <TouchableOpacity
          style={styles.sosButton}
          onPress={handleSOSPress}
          activeOpacity={0.8}
        >
          <Animated.View
            style={[
              styles.sosRipple,
              {
                transform: [{ scale: rippleAnim }],
                opacity: rippleAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.7, 0],
                }),
              },
            ]}
          />
          <Animated.View
            style={[
              styles.sosButtonInner,
              { transform: [{ scale: pulseAnim }] },
            ]}
          >
            <LinearGradient
              colors={['#ff4757', '#ff3742']}
              style={styles.sosGradient}
            >
              <Text style={styles.sosText}>{t('sosButton')}</Text>
            </LinearGradient>
          </Animated.View>
        </TouchableOpacity>
      </View>

      <SOSModal
        visible={showSOSModal}
        onClose={() => {
          setShowSOSModal(false);
        }}
        location={{
          latitude: location.latitude,
          longitude: location.longitude
        }}
      />
      
      {/* Alerts List Modal */}
      <Modal visible={showAlertsModal} transparent animationType="slide">
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1}
          onPress={() => setShowAlertsModal(false)}
        >
          <TouchableOpacity 
            style={styles.listModal}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.listModalHeader}>
              <Text style={styles.listModalTitle}>{t('activeAlerts')}</Text>
              <TouchableOpacity onPress={() => setShowAlertsModal(false)}>
                <X size={24} color="#8e8e93" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.alertsStats}>
              <View style={styles.alertStatItem}>
                <Text style={styles.alertStatEmoji}>🆘</Text>
                <Text style={styles.alertStatCount}>{alerts.filter(a => a.reportType === 'sos').length}</Text>
                <Text style={styles.alertStatLabel}>SOS</Text>
              </View>
              <View style={styles.alertStatItem}>
                <Text style={styles.alertStatEmoji}>⚠️</Text>
                <Text style={styles.alertStatCount}>{alerts.filter(a => a.reportType === 'event').length}</Text>
                <Text style={styles.alertStatLabel}>Events</Text>
              </View>
              <View style={styles.alertStatItem}>
                <Text style={styles.alertStatEmoji}>📍</Text>
                <Text style={styles.alertStatCount}>{alerts.filter(a => a.reportType === 'vibe').length}</Text>
                <Text style={styles.alertStatLabel}>Vibes</Text>
              </View>
            </View>
            
            {alerts.length === 0 ? (
              <View style={styles.emptyState}>
                <AlertTriangle size={48} color="#8e8e93" />
                <Text style={styles.emptyStateText}>{t('noAlertsInArea')}</Text>
                <Text style={styles.emptyStateSubtext}>{t('allClearInYourArea')}</Text>
              </View>
            ) : (
              <View style={styles.listContent}>
                {alerts.slice(0, 10).map((alert) => (
                  <TouchableOpacity
                    key={alert.id}
                    style={styles.alertListItem}
                    onPress={() => {
                      setSelectedAlert(alert);
                      setShowAlertsModal(false);
                      setTimeout(() => setShowAlertDetails(true), 100);
                    }}
                  >
                    <View style={styles.alertListIcon}>
                      <Text style={styles.alertListEmoji}>
                        {alert.reportType === 'sos' ? '🆘' : 
                         alert.reportType === 'event' ? '⚠️' : '📍'}
                      </Text>
                    </View>
                    <View style={styles.alertListContent}>
                      <Text style={styles.alertListType}>{alert.alert_type}</Text>
                      <Text style={styles.alertListDescription} numberOfLines={2}>
                        {alert.description || t('noDescription')}
                      </Text>
                      <View style={styles.alertListMeta}>
                        <MapPin size={12} color="#8e8e93" />
                        <Text style={styles.alertListDistance}>
                          {location ? `${calculateDistance(
                            location.latitude,
                            location.longitude,
                            alert.location.latitude,
                            alert.location.longitude
                          ).toFixed(1)} km away` : 'Unknown distance'}
                        </Text>
                        <Text style={styles.alertListTime}>
                          {new Date(alert.timestamp).toLocaleTimeString()}
                        </Text>
                      </View>
                    </View>
                    {alert.reportType === 'sos' && !alert.resolved && (
                      <View style={styles.alertUrgentBadge}>
                        <Text style={styles.alertUrgentText}>URGENT</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Nearby Users Modal */}
      <Modal visible={showNearbyModal} transparent animationType="slide">
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1}
          onPress={() => setShowNearbyModal(false)}
        >
          <TouchableOpacity 
            style={styles.listModal}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.listModalHeader}>
              <Text style={styles.listModalTitle}>{t('nearbyUsers')}</Text>
              <TouchableOpacity onPress={() => setShowNearbyModal(false)}>
                <X size={24} color="#8e8e93" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.nearbyStats}>
              <View style={styles.nearbyStatItem}>
                <Text style={styles.nearbyStatEmoji}>👮</Text>
                <Text style={styles.nearbyStatCount}>
                  {nearbyUsers.filter(u => u.isResponder).length}
                </Text>
                <Text style={styles.nearbyStatLabel}>Responders</Text>
              </View>
              <View style={styles.nearbyStatItem}>
                <Text style={styles.nearbyStatEmoji}>👥</Text>
                <Text style={styles.nearbyStatCount}>
                  {nearbyUsers.filter(u => !u.isResponder).length}
                </Text>
                <Text style={styles.nearbyStatLabel}>Users</Text>
              </View>
              <View style={styles.nearbyStatItem}>
                <Text style={styles.nearbyStatEmoji}>📍</Text>
                <Text style={styles.nearbyStatCount}>{nearbyUsers.length}</Text>
                <Text style={styles.nearbyStatLabel}>Total</Text>
              </View>
            </View>
            
            {nearbyUsers.length === 0 ? (
              <View style={styles.emptyState}>
                <Users size={48} color="#8e8e93" />
                <Text style={styles.emptyStateText}>{t('noUsersNearby')}</Text>
                <Text style={styles.emptyStateSubtext}>{t('beTheFirstInArea')}</Text>
              </View>
            ) : (
              <View style={styles.listContent}>
                {nearbyUsers.slice(0, 20).map((user) => (
                  <View key={user.id} style={styles.userListItem}>
                    <View style={[
                      styles.userListIcon,
                      user.isResponder && styles.userListIconResponder
                    ]}>
                      <Text style={styles.userListEmoji}>
                        {user.isResponder ? '👮' : '👤'}
                      </Text>
                    </View>
                    <View style={styles.userListContent}>
                      <Text style={styles.userListRole}>
                        {user.role || 'Individual'}
                      </Text>
                      <View style={styles.userListMeta}>
                        <MapPin size={12} color="#8e8e93" />
                        <Text style={styles.userListDistance}>
                          {location ? `${calculateDistance(
                            location.latitude,
                            location.longitude,
                            user.location.latitude,
                            user.location.longitude
                          ).toFixed(1)} km away` : 'Unknown distance'}
                        </Text>
                      </View>
                    </View>
                    {user.isResponder && (
                      <View style={styles.responderBadge}>
                        <Text style={styles.responderBadgeText}>RESPONDER</Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Alert Details Modal */}
      {showAlertDetails && selectedAlert && (
        <Modal visible={showAlertDetails} transparent animationType="slide">
          <TouchableOpacity 
            style={styles.modalOverlay} 
            activeOpacity={1}
            onPress={() => setShowAlertDetails(false)}
          >
            <TouchableOpacity 
              style={styles.alertDetailsModal}
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.alertDetailsHeader}>
                <Text style={styles.alertDetailsTitle}>
                  {selectedAlert.reportType === 'sos' ? `🆘 ${t('sosAlert')}` : 
                   selectedAlert.reportType === 'event' ? `⚠️ ${t('eventReport')}` : 
                   `📍 ${t('vibeReport')}`}
                </Text>
                <TouchableOpacity onPress={() => setShowAlertDetails(false)}>
                  <X size={24} color="#8e8e93" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.alertDetailsContent}>
                <Text style={styles.alertDetailsType}>{selectedAlert.alert_type}</Text>
                <Text style={styles.alertDetailsDescription}>
                  {selectedAlert.description || t('noDescriptionProvided')}
                </Text>
                
                {selectedAlert.address && (
                  <View style={styles.alertDetailsLocation}>
                    <MapPin size={16} color="#8e8e93" />
                    <Text style={styles.alertDetailsAddress}>{selectedAlert.address}</Text>
                  </View>
                )}
                
                <Text style={styles.alertDetailsTime}>
                  {t('reported')} {selectedAlert.timestamp ? new Date(selectedAlert.timestamp).toLocaleString() : t('recently')}
                </Text>
                
                {selectedAlert.respondedBy && selectedAlert.respondedBy.length > 0 && (
                  <Text style={styles.alertDetailsResponders}>
                    {selectedAlert.respondedBy.length} {t('respondersOnTheWay')}
                  </Text>
                )}
              </View>
              
              <View style={styles.alertDetailsActions}>
                {selectedAlert.reportType === 'sos' && !selectedAlert.resolved && (
                  <>
                    {!selectedAlert.respondedBy?.includes(user?.id || '') ? (
                      <TouchableOpacity
                        style={styles.alertActionButton}
                        onPress={async () => {
                          await handleRespondToAlert(selectedAlert);
                          // Update the selected alert to reflect the response
                          const updatedAlert = { 
                            ...selectedAlert, 
                            respondedBy: [...(selectedAlert.respondedBy || []), user?.id || '']
                          };
                          setSelectedAlert(updatedAlert);
                        }}
                      >
                        <LinearGradient
                          colors={['#ff4757', '#ff3742']}
                          style={styles.alertActionGradient}
                        >
                          <Text style={styles.alertActionText}>{t('respondToSOS')}</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.respondedIndicator}>
                        <Text style={styles.respondedText}>✓ {t('youAreResponding')}</Text>
                      </View>
                    )}
                    
                    {/* Show resolve button only if user created the SOS */}
                    {user && selectedAlert.userId === user.id && (
                      <TouchableOpacity
                        style={styles.alertResolveButton}
                        onPress={() => handleMarkResolved(selectedAlert)}
                      >
                        <Text style={styles.alertResolveText}>{t('markAsResolved')}</Text>
                      </TouchableOpacity>
                    )}
                  </>
                )}
                
                {selectedAlert.reportType === 'event' && !selectedAlert.resolved && (
                  <TouchableOpacity
                    style={styles.alertActionButton}
                    onPress={async () => {
                      await handleRespondToAlert(selectedAlert);
                    }}
                  >
                    <LinearGradient
                      colors={['#FF9800', '#F57C00']}
                      style={styles.alertActionGradient}
                    >
                      <Text style={styles.alertActionText}>
                        {selectedAlert.respondedBy?.includes(user?.id || '') ? t('alreadyResponded') : t('respondToEvent')}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
                
                <TouchableOpacity
                  style={styles.alertDirectionsButton}
                  onPress={() => {
                    getDirections(selectedAlert);
                    setShowAlertDetails(false);
                  }}
                >
                  <Navigation size={20} color="#ffffff" />
                  <Text style={styles.alertDirectionsText}>{t('getDirections')}</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      )}
    </View>
  );
}

const getStyles = (colors: any, insets: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingGradient: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingIconContainer: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 40,
    backgroundColor: 'rgba(255, 71, 87, 0.1)',
    borderWidth: 2,
    borderColor: 'rgba(255, 71, 87, 0.3)',
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 8,
  },
  loadingSubtext: {
    color: '#8e8e93',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  loadingDots: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ff4757',
  },
  errorContainer: {
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
  },
  errorText: {
    color: '#ff4757',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  retryButton: {
    backgroundColor: '#ff4757',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  skipButton: {
    marginTop: 24,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  skipButtonText: {
    color: '#8e8e93',
    fontSize: 14,
    textDecoration: 'underline',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  statsContainer: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    zIndex: 1000,
    elevation: 10,
  },
  statItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    flex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  statItemActive: {
    backgroundColor: 'rgba(33, 150, 243, 0.15)',
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  statText: {
    color: '#1a1a2e',
    fontSize: 11,
    fontWeight: '600',
  },
  statTextActive: {
    color: '#2196F3',
  },
  sosButton: {
    position: 'absolute',
    bottom: Platform.select({
      ios: 100,
      android: 100,
      default: 100,
    }),
    right: 20,
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000,
    elevation: 20,
  },
  sosRipple: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#ff4757',
  },
  sosButtonInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    elevation: 15,
    shadowColor: '#ff4757',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
  },
  sosGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  sosText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1.2,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  notificationButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  notificationButtonActive: {
    backgroundColor: '#ff4757',
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ff4757',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1a1a2e',
  },
  notificationBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  notificationsPanel: {
    position: 'absolute',
    top: 76,
    right: 16,
    left: 16,
    maxHeight: 400,
    backgroundColor: 'rgba(26, 26, 46, 0.98)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    zIndex: 2000,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 15,
    backdropFilter: 'blur(10px)',
  },
  notificationsPanelTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  noNotificationsText: {
    color: '#8e8e93',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  notificationItemUnread: {
    backgroundColor: 'rgba(255, 71, 87, 0.1)',
    borderLeftWidth: 3,
    borderLeftColor: '#ff4757',
  },
  notificationIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 71, 87, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  notificationDescription: {
    color: '#8e8e93',
    fontSize: 12,
    marginBottom: 2,
  },
  notificationTime: {
    color: '#8e8e93',
    fontSize: 10,
  },
  respondButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#ff4757',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  respondButtonText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
  directionsButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertDetailsModal: {
    backgroundColor: '#1a1a2e',
    borderRadius: 20,
    padding: 24,
    margin: 20,
    width: '90%',
    maxWidth: 400,
  },
  alertDetailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  alertDetailsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  alertDetailsContent: {
    marginBottom: 20,
  },
  alertDetailsType: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ff4757',
    marginBottom: 8,
  },
  alertDetailsDescription: {
    fontSize: 14,
    color: '#ffffff',
    marginBottom: 12,
    lineHeight: 20,
  },
  alertDetailsLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  alertDetailsAddress: {
    fontSize: 12,
    color: '#8e8e93',
    flex: 1,
  },
  alertDetailsTime: {
    fontSize: 12,
    color: '#8e8e93',
    marginBottom: 8,
  },
  alertDetailsResponders: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
  },
  alertDetailsActions: {
    gap: 12,
  },
  alertActionButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  alertActionGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  alertActionText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  alertResolveButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  alertResolveText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  alertDirectionsButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  alertDirectionsText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  respondButtonDisabled: {
    backgroundColor: '#8e8e93',
    opacity: 0.7,
  },
  respondedIndicator: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    borderWidth: 1,
    borderColor: '#4CAF50',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  respondedText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: '600',
  },
  navigationButton: {
    position: 'absolute',
    bottom: 200,
    left: 16,
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1500,
    elevation: 12,
  },
  navigationButtonInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  navigationButtonActive: {
    backgroundColor: '#2196F3',
    shadowColor: '#2196F3',
    shadowOpacity: 0.3,
  },
  navigationActiveIndicator: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#2196F3',
    opacity: 0.3,
  },
  listModal: {
    backgroundColor: '#1a1a2e',
    borderRadius: 20,
    padding: 24,
    margin: 20,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  listModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  listModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  alertsStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
  },
  alertStatItem: {
    alignItems: 'center',
    gap: 4,
  },
  alertStatEmoji: {
    fontSize: 24,
  },
  alertStatCount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  alertStatLabel: {
    fontSize: 12,
    color: '#8e8e93',
  },
  nearbyStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
  },
  nearbyStatItem: {
    alignItems: 'center',
    gap: 4,
  },
  nearbyStatEmoji: {
    fontSize: 24,
  },
  nearbyStatCount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  nearbyStatLabel: {
    fontSize: 12,
    color: '#8e8e93',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#8e8e93',
  },
  listContent: {
    maxHeight: 400,
  },
  alertListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  alertListIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 71, 87, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertListEmoji: {
    fontSize: 20,
  },
  alertListContent: {
    flex: 1,
    gap: 4,
  },
  alertListType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  alertListDescription: {
    fontSize: 12,
    color: '#8e8e93',
    lineHeight: 16,
  },
  alertListMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  alertListDistance: {
    fontSize: 11,
    color: '#8e8e93',
  },
  alertListTime: {
    fontSize: 11,
    color: '#8e8e93',
  },
  alertUrgentBadge: {
    backgroundColor: '#ff4757',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  alertUrgentText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  userListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  userListIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userListIconResponder: {
    backgroundColor: 'rgba(33, 150, 243, 0.2)',
  },
  userListEmoji: {
    fontSize: 20,
  },
  userListContent: {
    flex: 1,
    gap: 4,
  },
  userListRole: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  userListMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userListDistance: {
    fontSize: 11,
    color: '#8e8e93',
  },
  responderBadge: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  responderBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  bellAnimatedContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
