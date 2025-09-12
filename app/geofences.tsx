import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from '@/contexts/LocationContext';
import { MapPin, Edit2, Trash2, X, Navigation, Shield, AlertTriangle, AlertCircle } from 'lucide-react-native';
import { formatDate } from '@/utils/formatDate';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { detectStateFromCoordinates, getStateDisplayText, getStateIcon } from '@/utils/stateDetection';

interface Geofence {
  id: string;
  name: string;
  description: string;
  vibe: 'safe' | 'caution' | 'danger';
  center_latitude: number;
  center_longitude: number;
  radius_meters: number;
  alert_on_enter: boolean;
  alert_on_exit: boolean;
  is_active: boolean;
  state?: string;
  country?: string;
  created_at: string;
}

interface GeofenceFormData {
  name: string;
  description: string;
  vibe: 'safe' | 'caution' | 'danger';
  radius_meters: string;
  alert_on_enter: boolean;
  alert_on_exit: boolean;
  is_active: boolean;
}

interface GeofenceEvent {
  id: string;
  geofence_id: string;
  event_type: 'enter' | 'exit';
  timestamp: string;
}

export default function GeofencesScreen() {
  const { user } = useAuth();
  const { location } = useLocation();
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [geofenceEvents, setGeofenceEvents] = useState<GeofenceEvent[]>([]);
  const [loading, setLoading] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingGeofence, setEditingGeofence] = useState<Geofence | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [formData, setFormData] = useState<GeofenceFormData>({
    name: '',
    description: '',
    vibe: 'safe',
    radius_meters: '100',
    alert_on_enter: true,
    alert_on_exit: true,
    is_active: true,
  });
  
  // Track geofence states to prevent notification spam
  const [geofenceStates, setGeofenceStates] = useState<Record<string, boolean>>({});
  const lastNotificationTime = useRef<Record<string, number>>({});
  const notificationCooldown = 60000; // 1 minute cooldown between notifications for same geofence
  
  // Load geofences from AsyncStorage
  useEffect(() => {
    loadGeofences();
    loadGeofenceEvents();
  }, []);
  
  const loadGeofences = async () => {
    try {
      const stored = await AsyncStorage.getItem('geofences');
      if (stored) {
        setGeofences(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading geofences:', error);
    }
  };
  
  const loadGeofenceEvents = async () => {
    try {
      const stored = await AsyncStorage.getItem('geofenceEvents');
      if (stored) {
        setGeofenceEvents(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading geofence events:', error);
    }
  };
  
  const saveGeofences = async (updatedGeofences: Geofence[]) => {
    try {
      await AsyncStorage.setItem('geofences', JSON.stringify(updatedGeofences));
      setGeofences(updatedGeofences);
    } catch (error) {
      console.error('Error saving geofences:', error);
    }
  };
  
  const saveGeofenceEvents = async (updatedEvents: GeofenceEvent[]) => {
    try {
      // Keep only last 50 events
      const eventsToSave = updatedEvents.slice(0, 50);
      await AsyncStorage.setItem('geofenceEvents', JSON.stringify(eventsToSave));
      setGeofenceEvents(eventsToSave);
    } catch (error) {
      console.error('Error saving geofence events:', error);
    }
  };
  
  const createGeofence = async (geofenceData: Omit<Geofence, 'id' | 'created_at'>) => {
    const newGeofence: Geofence = {
      ...geofenceData,
      id: Date.now().toString(),
      created_at: new Date().toISOString(),
    };
    
    const updatedGeofences = [...geofences, newGeofence];
    await saveGeofences(updatedGeofences);
  };
  
  const updateGeofence = async (id: string, updates: Partial<Geofence>) => {
    const updatedGeofences = geofences.map(g => 
      g.id === id ? { ...g, ...updates } : g
    );
    await saveGeofences(updatedGeofences);
  };
  
  const deleteGeofence = async (id: string) => {
    const updatedGeofences = geofences.filter(g => g.id !== id);
    await saveGeofences(updatedGeofences);
  };

  const handleCreateGeofence = async () => {
    if (!formData.name) {
      Alert.alert('Missing Information', 'Please enter a name for the geofence.');
      return;
    }

    setIsGettingLocation(true);
    try {
      // Get current location
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to create a geofence');
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });

      // Detect state and country from coordinates
      const stateInfo = detectStateFromCoordinates(
        currentLocation.coords.latitude,
        currentLocation.coords.longitude
      );

      const geofenceData = {
        name: formData.name,
        description: formData.description || `${formData.vibe} zone`,
        vibe: formData.vibe,
        center_latitude: currentLocation.coords.latitude,
        center_longitude: currentLocation.coords.longitude,
        radius_meters: parseInt(formData.radius_meters) || 100,
        alert_on_enter: formData.alert_on_enter,
        alert_on_exit: formData.alert_on_exit,
        is_active: formData.is_active,
        state: stateInfo.state,
        country: stateInfo.country,
      };
      
      await createGeofence(geofenceData);

      // Setup geofencing notifications if on mobile
      if (Platform.OS !== 'web') {
        await setupGeofencingNotifications();
      }
      
      Alert.alert('Success', `Geofence "${formData.name}" created at your current location`);
      setShowAddModal(false);
      resetForm();
    } catch (err) {
      console.error('Error creating geofence:', err);
      Alert.alert('Error', 'Failed to create geofence');
    } finally {
      setIsGettingLocation(false);
    }
  };

  const handleUpdateGeofence = async () => {
    if (!editingGeofence) return;

    try {
      const updateData = {
        name: formData.name,
        description: formData.description,
        vibe: formData.vibe,
        radius_meters: parseInt(formData.radius_meters) || 100,
        alert_on_enter: formData.alert_on_enter,
        alert_on_exit: formData.alert_on_exit,
        is_active: formData.is_active,
      };
      
      await updateGeofence(editingGeofence.id, updateData);
      
      setEditingGeofence(null);
      setShowAddModal(false);
      resetForm();
    } catch (err) {
      console.error('Error updating geofence:', err);
    }
  };

  const handleDeleteGeofence = (id: string, name: string) => {
    Alert.alert(
      'Delete Geofence',
      `Are you sure you want to delete "${name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: () => deleteGeofence(id) 
        },
      ]
    );
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      vibe: 'safe',
      radius_meters: '100',
      alert_on_enter: true,
      alert_on_exit: true,
      is_active: true,
    });
  };

  const setupGeofencingNotifications = async () => {
    if (Platform.OS === 'web') return;

    try {
      // Try to request permissions, but don't fail if in Expo Go
      const { status } = await Notifications.requestPermissionsAsync().catch(() => ({ status: 'denied' }));
      if (status !== 'granted') {
        console.log('Notification permission not granted or not available in Expo Go');
        return;
      }

      // Configure notification handler
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
    } catch (error) {
      // Silently handle error in Expo Go
      console.log('Notifications not available in Expo Go');
    }
  };

  const getVibeColor = (vibe: string) => {
    switch (vibe) {
      case 'safe': return '#10B981';
      case 'caution': return '#F59E0B';
      case 'danger': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getVibeIcon = (vibe: string) => {
    switch (vibe) {
      case 'safe': return Shield;
      case 'caution': return AlertTriangle;
      case 'danger': return AlertCircle;
      default: return MapPin;
    }
  };

  const openEditModal = (geofence: Geofence) => {
    setEditingGeofence(geofence);
    setFormData({
      name: geofence.name,
      description: geofence.description || '',
      vibe: geofence.vibe || 'safe',
      radius_meters: geofence.radius_meters.toString(),
      alert_on_enter: geofence.alert_on_enter,
      alert_on_exit: geofence.alert_on_exit,
      is_active: geofence.is_active,
    });
    setShowAddModal(true);
  };

  // Monitor geofences and send notifications
  useEffect(() => {
    if (!location || geofences.length === 0) return;

    geofences.forEach(async (geofence) => {
      if (!geofence.is_active) return;

      const distance = getDistance(
        location.latitude,
        location.longitude,
        geofence.center_latitude,
        geofence.center_longitude
      );

      const isInside = distance <= geofence.radius_meters;
      const wasInside = geofenceStates[geofence.id] ?? false;
      const vibe = geofence.vibe || 'monitored';
      const now = Date.now();
      const lastNotification = lastNotificationTime.current[geofence.id] || 0;

      // Only update if state actually changed and cooldown has passed
      if (isInside !== wasInside && (now - lastNotification) > notificationCooldown) {
        setGeofenceStates(prev => ({ ...prev, [geofence.id]: isInside }));
        lastNotificationTime.current[geofence.id] = now;

        // Create event
        const event: GeofenceEvent = {
          id: Date.now().toString(),
          geofence_id: geofence.id,
          event_type: isInside ? 'enter' : 'exit',
          timestamp: new Date().toISOString(),
        };
        
        const updatedEvents = [event, ...geofenceEvents];
        saveGeofenceEvents(updatedEvents);

        if (isInside && geofence.alert_on_enter) {
          const stateText = getStateDisplayText(geofence.state || null, geofence.country || null);
          sendNotification(
            `Entered ${geofence.name}`,
            `You've entered the ${vibe} zone: ${geofence.name} in ${stateText}`
          );
        } else if (!isInside && geofence.alert_on_exit) {
          const stateText = getStateDisplayText(geofence.state || null, geofence.country || null);
          sendNotification(
            `Left ${geofence.name}`,
            `You've left the ${vibe} zone: ${geofence.name} in ${stateText}`
          );
        }
      }
    });
  }, [location]);

  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  };

  const sendNotification = async (title: string, body: string) => {
    if (Platform.OS === 'web') {
      // Web notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body });
      }
    } else {
      // Mobile notification - only if not in Expo Go
      try {
        // Check if we're in Expo Go by checking for push token capability
        const token = await Notifications.getExpoPushTokenAsync({ projectId: 'your-project-id' }).catch(() => null);
        if (token) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title,
              body,
              sound: true,
            },
            trigger: null,
          });
        } else {
          // Fallback for Expo Go - just log the notification
          console.log(`Notification: ${title} - ${body}`);
        }
      } catch (error) {
        // Silently fail in Expo Go
        console.log(`Notification (Expo Go): ${title} - ${body}`);
      }
    }
  };

  const renderGeofence = ({ item }: { item: Geofence }) => {
    const vibe = item.vibe || 'safe';
    const VibeIcon = getVibeIcon(vibe);
    const vibeColor = getVibeColor(vibe);
    
    return (
      <View style={styles.geofenceCard}>
        <View style={styles.geofenceHeader}>
          <View style={styles.geofenceInfo}>
            <View style={styles.geofenceNameRow}>
              <Text style={styles.geofenceName}>{item.name}</Text>
              <View style={[styles.vibeBadge, { backgroundColor: `${vibeColor}20` }]}>
                <VibeIcon size={14} color={vibeColor} />
                <Text style={[styles.vibeText, { color: vibeColor }]}>
                  {vibe}
                </Text>
              </View>
            </View>
            {item.description && (
              <Text style={styles.geofenceDescription}>{item.description}</Text>
            )}
            <View style={styles.geofenceDetails}>
              <MapPin size={14} color="#666" />
              <Text style={styles.detailText}>
                {item.center_latitude.toFixed(4)}, {item.center_longitude.toFixed(4)}
              </Text>
              <Text style={styles.detailText}>• {item.radius_meters}m radius</Text>
              {(item.state || item.country) && (
                <View style={styles.stateInfo}>
                  <Text style={styles.stateText}>
                    {getStateIcon(item.country || null)} {getStateDisplayText(item.state || null, item.country || null)}
                  </Text>
                </View>
              )}
            </View>
          </View>
          <Switch
            value={item.is_active}
            onValueChange={(value) => updateGeofence(item.id, { is_active: value })}
          />
        </View>
      
        <View style={styles.alertSettings}>
          {item.alert_on_enter && (
            <View style={styles.alertBadge}>
              <Text style={styles.alertBadgeText}>Entry</Text>
            </View>
          )}
          {item.alert_on_exit && (
            <View style={styles.alertBadge}>
              <Text style={styles.alertBadgeText}>Exit</Text>
            </View>
          )}
        </View>

        <View style={styles.geofenceActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => openEditModal(item)}
          >
            <Edit2 size={18} color="#007AFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleDeleteGeofence(item.id, item.name)}
          >
            <Trash2 size={18} color="#FF3B30" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderEvent = ({ item }: { item: GeofenceEvent }) => {
    const geofence = geofences.find(g => g.id === item.geofence_id);
    return (
      <View style={styles.eventCard}>
        <View style={styles.eventIcon}>
          {item.event_type === 'enter' ? (
            <Text>📍</Text>
          ) : (
            <Text>🚪</Text>
          )}
        </View>
        <View style={styles.eventInfo}>
          <Text style={styles.eventType}>
            {item.event_type === 'enter' ? 'Entered' : 'Exited'} {geofence?.name || 'geofence'}
          </Text>
          <Text style={styles.eventTime}>{formatDate(item.timestamp)}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Add Geofence Button */}
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            resetForm();
            setEditingGeofence(null);
            setShowAddModal(true);
          }}
        >
          <Navigation size={24} color="#FFF" />
          <Text style={styles.addButtonText}>Mark Current Location</Text>
        </TouchableOpacity>

        {/* Active Geofences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Active Geofences</Text>
          {geofences.length > 0 ? (
            <FlatList
              data={geofences}
              renderItem={renderGeofence}
              keyExtractor={item => item.id}
              scrollEnabled={false}
            />
          ) : (
            <Text style={styles.emptyText}>No geofences created yet</Text>
          )}
        </View>

        {/* Recent Events */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Events</Text>
          {geofenceEvents.length > 0 ? (
            <FlatList
              data={geofenceEvents.slice(0, 10)}
              renderItem={renderEvent}
              keyExtractor={item => item.id}
              scrollEnabled={false}
            />
          ) : (
            <Text style={styles.emptyText}>No geofence events yet</Text>
          )}
        </View>
      </ScrollView>

      {/* Add/Edit Geofence Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editingGeofence ? 'Edit Geofence' : 'Mark Current Location'}
                </Text>
                <TouchableOpacity onPress={() => setShowAddModal(false)}>
                  <X size={24} color="#666" />
                </TouchableOpacity>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Name *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.name}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
                  placeholder="Home, Office, School..."
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formData.description}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
                  placeholder="Optional description..."
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Select Vibe for this Location</Text>
                <View style={styles.vibeOptions}>
                  <TouchableOpacity
                    style={[
                      styles.vibeOption,
                      formData.vibe === 'safe' && styles.vibeOptionSelected
                    ]}
                    onPress={() => setFormData(prev => ({ ...prev, vibe: 'safe' }))}
                    activeOpacity={0.7}
                  >
                    <Shield size={20} color={formData.vibe === 'safe' ? getVibeColor('safe') : '#666'} />
                    <Text style={[styles.vibeOptionText, formData.vibe === 'safe' && { color: getVibeColor('safe') }]}>Safe</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.vibeOption,
                      formData.vibe === 'caution' && styles.vibeOptionSelected
                    ]}
                    onPress={() => setFormData(prev => ({ ...prev, vibe: 'caution' }))}
                    activeOpacity={0.7}
                  >
                    <AlertTriangle size={20} color={formData.vibe === 'caution' ? getVibeColor('caution') : '#666'} />
                    <Text style={[styles.vibeOptionText, formData.vibe === 'caution' && { color: getVibeColor('caution') }]}>Caution</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.vibeOption,
                      formData.vibe === 'danger' && styles.vibeOptionSelected
                    ]}
                    onPress={() => setFormData(prev => ({ ...prev, vibe: 'danger' }))}
                    activeOpacity={0.7}
                  >
                    <AlertCircle size={20} color={formData.vibe === 'danger' ? getVibeColor('danger') : '#666'} />
                    <Text style={[styles.vibeOptionText, formData.vibe === 'danger' && { color: getVibeColor('danger') }]}>Danger</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Radius (meters)</Text>
                <TextInput
                  style={styles.input}
                  value={formData.radius_meters}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, radius_meters: text }))}
                  placeholder="100"
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Alert Settings</Text>
                
                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>Alert on Entry</Text>
                  <Switch
                    value={formData.alert_on_enter}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, alert_on_enter: value }))}
                  />
                </View>

                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>Alert on Exit</Text>
                  <Switch
                    value={formData.alert_on_exit}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, alert_on_exit: value }))}
                  />
                </View>
              </View>

              {!editingGeofence && (
                <View style={styles.infoBox}>
                  <Navigation size={16} color="#6B7280" />
                  <Text style={styles.infoText}>
                    This geofence will be created at your current location. You&apos;ll receive notifications when entering or leaving this area based on your settings.
                  </Text>
                </View>
              )}

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Active</Text>
                <Switch
                  value={formData.is_active}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, is_active: value }))}
                />
              </View>

              <TouchableOpacity
                style={[styles.modalButton, (loading || isGettingLocation) && styles.buttonDisabled]}
                onPress={editingGeofence ? handleUpdateGeofence : handleCreateGeofence}
                disabled={loading || isGettingLocation}
              >
                {(loading || isGettingLocation) ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.modalButtonText}>
                    {editingGeofence ? 'Update Geofence' : 'Mark This Location'}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  scrollContent: {
    padding: 16,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    gap: 8,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
  },
  geofenceCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  geofenceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  geofenceInfo: {
    flex: 1,
  },
  geofenceNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  vibeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  vibeText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  geofenceName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  geofenceDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  geofenceDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 12,
    color: '#666',
  },
  alertSettings: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  alertBadge: {
    backgroundColor: '#E5F4FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  alertBadgeText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  geofenceActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    paddingTop: 12,
  },
  actionButton: {
    padding: 8,
  },
  eventCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  eventInfo: {
    flex: 1,
  },
  eventType: {
    fontSize: 14,
    fontWeight: '500',
  },
  eventTime: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  emptyText: {
    fontSize: 14,
    color: '#8E8E93',
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 20,
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
    fontSize: 18,
    fontWeight: '600',
  },
  formGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  vibeOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  vibeOption: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF',
  },
  vibeOptionSelected: {
    borderWidth: 2,
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
  },
  vibeOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  stateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  stateText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#F2F2F7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'flex-start',
    gap: 8,
  },
  infoText: {
    fontSize: 12,
    color: '#6B7280',
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  halfInput: {
    flex: 1,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  switchLabel: {
    fontSize: 16,
  },
  modalButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
});
