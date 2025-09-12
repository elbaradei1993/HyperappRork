import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocation } from '@/contexts/LocationContext';
import { useAlerts } from '@/contexts/AlertContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useGuardian } from '@/contexts/GuardianContext';
import {
  Heart,
  AlertTriangle,
  Car,
  Users,
  Music,
  Shield,
  MapPin,
  Camera,
  Send,
  Rainbow,
  AlertCircle,
  X,
  CheckCircle,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { soundManager } from '@/utils/soundManager';
import { HyperMapView } from '@/components/MapView';

const { width: screenWidth } = Dimensions.get('window');

const getVibeTypes = (t: (key: string) => string) => [
  { id: 'safe', label: t('safe'), icon: Shield, color: '#9C27B0', gradient: ['#9C27B0', '#BA68C8'] },
  { id: 'calm', label: t('calm'), icon: Heart, color: '#2196F3', gradient: ['#2196F3', '#42A5F5'] },
  { id: 'crowded', label: t('crowded'), icon: Users, color: '#FFC107', gradient: ['#FFC107', '#FFD54F'] },
  { id: 'suspicious', label: t('suspicious'), icon: AlertTriangle, color: '#FFD700', gradient: ['#FFD700', '#FFA500'] },
  { id: 'dangerous', label: t('dangerous'), icon: AlertTriangle, color: '#F44336', gradient: ['#F44336', '#EF5350'] },
  { id: 'lgbtqia', label: 'LGBTQIA+ Friendly', icon: Rainbow, color: '#FF69B4', gradient: ['#FF69B4', '#FF1493'] },
];

const getEventTypes = (t: (key: string) => string) => [
  { id: 'accident', label: t('accident'), icon: Car, color: '#FF9800' },
  { id: 'incident', label: t('incident'), icon: AlertTriangle, color: '#f44336' },
  { id: 'emergency', label: t('emergency'), icon: Shield, color: '#ff4757' },
  { id: 'other', label: t('otherEvent'), icon: MapPin, color: '#607D8B' },
];

export default function ReportScreen() {
  const [reportType, setReportType] = useState<'vibe' | 'event' | 'sos' | null>(null);
  const [selectedType, setSelectedType] = useState<string>('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{latitude: number, longitude: number} | null>(null);
  const [sosSubmitted, setSosSubmitted] = useState(false);
  const [currentSosId, setCurrentSosId] = useState<string | null>(null);

  const { location, requestPermission } = useLocation();
  const { addAlert, sendSOSAlert, markAlertResolved, alerts } = useAlerts();
  const { user } = useAuth();
  const { t, isDark } = useSettings();
  const { sendAlert: sendGuardianAlert } = useGuardian();

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    requestPermission();
  }, []);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [reportType]);

  useEffect(() => {
    if (reportType === 'sos') {
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
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
    }
  }, [reportType]);

  const handleSubmit = async () => {
    if (reportType === 'sos') {
      return handleSOSSubmit();
    }

    if (!selectedType || !description.trim()) {
      Alert.alert(t('error'), t('fillRequired'));
      return;
    }

    const reportLocation = selectedLocation || location;
    if (!reportLocation) {
      Alert.alert(t('error'), t('locationRequired'));
      return;
    }

    if (!reportType) {
      Alert.alert(t('error'), t('reportTypeRequired'));
      return;
    }

    setLoading(true);
    try {
      await addAlert({
        alert_type: selectedType,
        description: description.trim(),
        tags: tags.trim(),
        location: reportLocation,
        anonymous,
        reportType: reportType,
        userId: anonymous ? undefined : user?.id,
      });

      // Play sound based on report type
      if (reportType === 'event') {
        await soundManager.playEventAlert();
      } else if (reportType === 'vibe') {
        await soundManager.playVibeAlert();
      }

      Alert.alert(t('success'), t('reportSent'));
      
      // Reset form
      setReportType(null);
      setSelectedType('');
      setDescription('');
      setTags('');
      setAnonymous(false);
      setSelectedLocation(null);
    } catch (error: any) {
      Alert.alert(t('error'), error.message || 'Failed to submit report');
    } finally {
      setLoading(false);
    }
  };

  const handleSOSSubmit = async () => {
    if (!selectedType) {
      Alert.alert(t('error'), 'Please select an emergency type');
      return;
    }

    if (!location) {
      Alert.alert(t('error'), t('locationRequired'));
      return;
    }

    setLoading(true);
    try {
      const result = await sendSOSAlert({
        alert_type: selectedType,
        description: description.trim() || 'Emergency assistance needed',
        location,
        anonymous,
        userId: user?.id,
      });

      if (result && result.id) {
        setCurrentSosId(result.id);
        setSosSubmitted(true);
        
        // Play SOS alert sound
        await soundManager.playSOSAlert();
        
        // Trigger Guardian Angels alert
        try {
          await sendGuardianAlert('manual', `Emergency: ${selectedType} - ${description || 'Immediate assistance needed'}`);
          console.log('Guardian Angels notified');
        } catch (guardianError) {
          console.error('Failed to notify Guardian Angels:', guardianError);
        }
      }
    } catch (error: any) {
      Alert.alert(t('error'), error.message || 'Failed to send SOS');
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async () => {
    if (currentSosId) {
      try {
        await markAlertResolved(currentSosId);
        await soundManager.playSuccess();
        Alert.alert(t('success'), 'SOS alert has been marked as resolved');
        setSosSubmitted(false);
        setReportType(null);
        setSelectedType('');
        setDescription('');
        setCurrentSosId(null);
      } catch {
        Alert.alert(t('error'), 'Failed to resolve alert');
      }
    }
  };

  const renderTypeSelection = () => {
    let types;
    if (reportType === 'sos') {
      types = [
        { id: 'violence', label: 'Violence', icon: Shield, color: '#ff4757' },
        { id: 'medical', label: 'Medical Emergency', icon: AlertCircle, color: '#ff6b6b' },
        { id: 'panic', label: 'Panic/Anxiety', icon: Heart, color: '#ff8787' },
      ];
    } else {
      types = reportType === 'vibe' ? getVibeTypes(t) : getEventTypes(t);
    }
    
    return (
      <View style={styles.typeGrid}>
        {types.map((type) => {
          const IconComponent = type.icon;
          const isSelected = selectedType === type.id;
          
          return (
            <TouchableOpacity
              key={type.id}
              style={[
                styles.typeCard,
                { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)' },
                isSelected && { borderColor: type.color, backgroundColor: `${type.color}20` },
              ]}
              onPress={() => setSelectedType(type.id)}
            >
              <View style={[styles.typeIcon, { backgroundColor: `${type.color}20` }]}>
                <IconComponent size={24} color={type.color} />
              </View>
              <Text style={[styles.typeLabel, { color: isDark ? '#ffffff' : '#000000' }, isSelected && { color: type.color }]}>
                {type.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  if (showMap) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#1a1a2e' : '#f5f5f5' }]}>
        <View style={styles.mapHeader}>
          <TouchableOpacity onPress={() => setShowMap(false)} style={styles.mapCloseButton}>
            <X size={24} color={isDark ? '#ffffff' : '#000000'} />
          </TouchableOpacity>
          <Text style={[styles.mapTitle, { color: isDark ? '#ffffff' : '#000000' }]}>Select Location</Text>
          <TouchableOpacity 
            onPress={() => {
              if (selectedLocation) {
                setShowMap(false);
              }
            }}
            style={[styles.mapDoneButton, !selectedLocation && styles.mapDoneButtonDisabled]}
          >
            <Text style={[styles.mapDoneText, { color: selectedLocation ? '#ff4757' : '#8e8e93' }]}>Done</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.mapContainer}>
          <HyperMapView
            location={location || { latitude: 0, longitude: 0 }}
            alerts={alerts}
            nearbyUsers={[]}
            onMapPress={(coordinate) => {
              setSelectedLocation({
                latitude: coordinate.lat,
                longitude: coordinate.lng,
              });
            }}
            onAlertPress={() => {}}
            followUserLocation={!selectedLocation}
            onFollowUserChange={() => {}}
          />
          {selectedLocation && (
            <View style={styles.selectedLocationBadge}>
              <MapPin size={16} color="#ffffff" />
              <Text style={styles.selectedLocationText}>
                Location selected
              </Text>
            </View>
          )}
        </View>
      </SafeAreaView>
    );
  }

  if (sosSubmitted) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#1a1a2e' : '#f5f5f5' }]}>
        <View style={styles.sosStatusContainer}>
          <LinearGradient
            colors={['#ff4757', '#ff3742']}
            style={styles.sosStatusGradient}
          >
            <Shield size={48} color="#ffffff" />
            <Text style={styles.sosStatusTitle}>SOS Alert Active</Text>
            <Text style={styles.sosStatusDescription}>
              Your emergency alert has been sent to nearby users and responders.
            </Text>
            
            <Animated.View style={[
              styles.pulseIndicator,
              { transform: [{ scale: pulseAnim }] }
            ]} />
            
            <TouchableOpacity
              style={styles.resolveButton}
              onPress={handleResolve}
            >
              <CheckCircle size={20} color="#ffffff" />
              <Text style={styles.resolveButtonText}>Mark as Resolved</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </SafeAreaView>
    );
  }

  if (!reportType) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#1a1a2e' : '#f5f5f5' }]}>
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: isDark ? '#ffffff' : '#000000' }]}>{t('whatToReport')}</Text>
            <Text style={[styles.subtitle, { color: isDark ? '#8e8e93' : '#666666' }]}>{t('helpCommunity')}</Text>
          </View>

          <View style={styles.optionsContainer}>
            <TouchableOpacity
              style={styles.sosOptionCard}
              onPress={() => setReportType('sos')}
            >
              <LinearGradient
                colors={['#ff4757', '#ff3742']}
                style={styles.sosOptionGradient}
              >
                <View style={styles.sosIconContainer}>
                  <Shield size={40} color="#ffffff" />
                </View>
                <View style={styles.sosTextContainer}>
                  <Text style={styles.sosTitle}>Emergency SOS</Text>
                  <Text style={styles.sosDescription}>
                    Send immediate alert to nearby responders
                  </Text>
                </View>
                <Animated.View style={[
                  styles.sosIndicator,
                  { transform: [{ scale: pulseAnim }] }
                ]} />
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionCard}
              onPress={() => setReportType('vibe')}
            >
              <LinearGradient
                colors={['#4CAF50', '#45a049']}
                style={styles.optionGradient}
              >
                <Heart size={32} color="#ffffff" />
                <Text style={styles.optionTitle}>{t('reportVibe')}</Text>
                <Text style={styles.optionDescription}>
                  {t('shareAreaVibe')}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionCard}
              onPress={() => setReportType('event')}
            >
              <LinearGradient
                colors={['#FF9800', '#f57c00']}
                style={styles.optionGradient}
              >
                <AlertTriangle size={32} color="#ffffff" />
                <Text style={styles.optionTitle}>{t('reportEvent')}</Text>
                <Text style={styles.optionDescription}>
                  {t('reportIncident')}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#1a1a2e' : '#f5f5f5' }]}>
      <Animated.ScrollView 
        style={[styles.scrollView, { opacity: fadeAnim }]} 
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              setReportType(null);
              setSelectedType('');
              setDescription('');
              setTags('');
            }}
          >
            <Text style={[styles.backButtonText, { color: isDark ? '#ff4757' : '#ff4757' }]}>← {t('back')}</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: isDark ? '#ffffff' : '#000000' }]}>
            {reportType === 'vibe' ? t('reportVibe') : 
             reportType === 'event' ? t('reportEvent') : 
             'Emergency SOS'}
          </Text>
          <Text style={[styles.subtitle, { color: isDark ? '#8e8e93' : '#666666' }]}>
            {reportType === 'vibe' ? t('shareAreaVibe') :
             reportType === 'event' ? t('reportIncident') :
             'Send immediate alert for help'}
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: isDark ? '#ffffff' : '#000000' }]}>
              {reportType === 'vibe' ? t('selectVibeType') : 
               reportType === 'event' ? t('selectEventType') : 
               'Select Emergency Type'} *
            </Text>
            {renderTypeSelection()}
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: isDark ? '#ffffff' : '#000000' }]}>{t('description')} *</Text>
            <TextInput
              style={[styles.textArea, { 
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                color: isDark ? '#ffffff' : '#000000',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)'
              }]}
              value={description}
              onChangeText={setDescription}
              placeholder={t('descriptionPlaceholder')}
              placeholderTextColor={isDark ? '#8e8e93' : '#999999'}
              multiline
              numberOfLines={4}
            />
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: isDark ? '#ffffff' : '#000000' }]}>{t('tags')}</Text>
            <TextInput
              style={[styles.textInput, { 
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                color: isDark ? '#ffffff' : '#000000',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)'
              }]}
              value={tags}
              onChangeText={setTags}
              placeholder={t('tagsPlaceholder')}
              placeholderTextColor={isDark ? '#8e8e93' : '#999999'}
            />
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: isDark ? '#ffffff' : '#000000' }]}>{t('location')}</Text>
            <TouchableOpacity 
              style={[styles.locationContainer, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)' }]}
              onPress={() => reportType !== 'sos' && setShowMap(true)}
              disabled={reportType === 'sos'}
            >
              <MapPin size={16} color="#8e8e93" />
              <Text style={[styles.locationText, { color: isDark ? '#8e8e93' : '#666666' }]}>
                {selectedLocation 
                  ? `Custom: ${selectedLocation.latitude.toFixed(4)}, ${selectedLocation.longitude.toFixed(4)}`
                  : location 
                  ? `Current: ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
                  : t('locationRequired')
                }
              </Text>
              {reportType !== 'sos' && (
                <Text style={[styles.locationEditText, { color: '#ff4757' }]}>Edit</Text>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.anonymousToggle}
            onPress={() => setAnonymous(!anonymous)}
          >
            <View style={[styles.checkbox, { borderColor: isDark ? '#8e8e93' : '#666666' }, anonymous && styles.checkboxChecked]}>
              {anonymous && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={[styles.anonymousText, { color: isDark ? '#ffffff' : '#000000' }]}>{t('reportAnonymously')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <LinearGradient
              colors={reportType === 'sos' ? ['#ff4757', '#ff3742'] : 
                      reportType === 'vibe' ? ['#4CAF50', '#45a049'] : 
                      ['#FF9800', '#f57c00']}
              style={styles.submitGradient}
            >
              {reportType === 'sos' ? (
                <Shield size={20} color="#ffffff" />
              ) : (
                <Send size={16} color="#ffffff" />
              )}
              <Text style={styles.submitButtonText}>
                {loading ? t('sending') : 
                 reportType === 'sos' ? 'Send SOS Alert' : 
                 t('sendReport')}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </Animated.ScrollView>
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
  scrollContainer: {
    flexGrow: 1,
  },
  header: {
    padding: 24,
    alignItems: 'center',
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  backButtonText: {
    color: '#ff4757',
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#8e8e93',
    textAlign: 'center',
    lineHeight: 22,
  },
  optionsContainer: {
    padding: 24,
    gap: 16,
  },
  sosOptionCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 8,
    elevation: 8,
    shadowColor: '#ff4757',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  sosOptionGradient: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  sosIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  sosTextContainer: {
    flex: 1,
  },
  sosTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  sosDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 18,
  },
  sosIndicator: {
    position: 'absolute',
    right: 20,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ffffff',
  },
  optionCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  optionGradient: {
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  optionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  optionDescription: {
    fontSize: 14,
    color: '#ffffff',
    textAlign: 'center',
    opacity: 0.9,
    lineHeight: 20,
  },
  form: {
    padding: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 12,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  typeCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  typeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  typeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
  },
  textInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  textArea: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  locationText: {
    fontSize: 14,
    color: '#8e8e93',
    flex: 1,
  },
  locationEditText: {
    fontSize: 14,
    fontWeight: '600',
  },
  anonymousToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#8e8e93',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#ff4757',
    borderColor: '#ff4757',
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  anonymousText: {
    fontSize: 14,
    color: '#ffffff',
  },
  submitButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  mapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  mapCloseButton: {
    padding: 8,
  },
  mapTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  mapDoneButton: {
    padding: 8,
  },
  mapDoneButtonDisabled: {
    opacity: 0.5,
  },
  mapDoneText: {
    fontSize: 16,
    fontWeight: '600',
  },
  selectedLocationBadge: {
    position: 'absolute',
    bottom: 100,
    alignSelf: 'center',
    backgroundColor: '#ff4757',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  selectedLocationText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  sosStatusContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  sosStatusGradient: {
    width: '100%',
    maxWidth: 350,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    gap: 16,
  },
  sosStatusTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  sosStatusDescription: {
    fontSize: 16,
    color: '#ffffff',
    textAlign: 'center',
    opacity: 0.9,
    lineHeight: 22,
  },
  pulseIndicator: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginVertical: 16,
  },
  resolveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
    gap: 8,
  },
  resolveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
