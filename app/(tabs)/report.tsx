import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocation } from '@/contexts/LocationContext';
import { useAlerts } from '@/contexts/AlertContext';
import { useAuth } from '@/contexts/AuthContext';
import { DatabaseService } from '@/services/database';
import {
  Heart,
  AlertTriangle,
  Car,
  Users,
  Shield,
  MapPin,
  Send,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const VIBE_TYPES = [
  { id: 'safe', label: 'Safe', icon: Shield, color: '#4CAF50', gradient: ['#4CAF50', '#66BB6A'] },
  { id: 'calm', label: 'Calm', icon: Heart, color: '#2196F3', gradient: ['#2196F3', '#42A5F5'] },
  { id: 'crowded', label: 'Crowded', icon: Users, color: '#FFC107', gradient: ['#FFC107', '#FFD54F'] },
  { id: 'suspicious', label: 'Suspicious', icon: AlertTriangle, color: '#FF9800', gradient: ['#FF9800', '#FFB74D'] },
  { id: 'dangerous', label: 'Dangerous', icon: AlertTriangle, color: '#F44336', gradient: ['#F44336', '#EF5350'] },
];

const EVENT_TYPES = [
  { id: 'accident', label: 'Traffic Accident', icon: Car, color: '#FF9800' },
  { id: 'incident', label: 'Safety Incident', icon: AlertTriangle, color: '#f44336' },
  { id: 'emergency', label: 'Emergency', icon: Shield, color: '#ff4757' },
  { id: 'other', label: 'Other Event', icon: MapPin, color: '#607D8B' },
];

export default function ReportScreen() {
  const [reportType, setReportType] = useState<'vibe' | 'event' | null>(null);
  const [selectedType, setSelectedType] = useState<string>('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);

  const { location } = useLocation();
  const { addAlert } = useAlerts();
  const { user } = useAuth();

  const handleSubmit = async () => {
    if (!selectedType || !description.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (!location) {
      Alert.alert('Error', 'Location not available. Please enable location services.');
      return;
    }

    if (!reportType) {
      Alert.alert('Error', 'Report type is required.');
      return;
    }

    setLoading(true);
    try {
      // Save to Supabase database
      const alertData = {
        type: selectedType,
        description: description.trim(),
        tags: tags.trim(),
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
        },
        anonymous,
        report_type: reportType as 'vibe' | 'event' | 'sos',
        user_id: anonymous ? undefined : user?.id,
      };

      await DatabaseService.createAlert(alertData);

      // Also add to local context for immediate UI update
      await addAlert({
        type: selectedType,
        description: description.trim(),
        tags: tags.trim(),
        location,
        anonymous,
        reportType: reportType,
      });

      Alert.alert('Success', `${reportType === 'vibe' ? 'Vibe' : 'Event'} reported successfully!`);
      
      // Reset form
      setReportType(null);
      setSelectedType('');
      setDescription('');
      setTags('');
      setAnonymous(false);
    } catch (error: any) {
      console.error('Error submitting report:', error);
      Alert.alert('Error', error.message || 'Failed to submit report');
    } finally {
      setLoading(false);
    }
  };

  const renderTypeSelection = () => {
    const types = reportType === 'vibe' ? VIBE_TYPES : EVENT_TYPES;
    
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
                isSelected && { borderColor: type.color, backgroundColor: `${type.color}20` },
              ]}
              onPress={() => setSelectedType(type.id)}
            >
              <View style={[styles.typeIcon, { backgroundColor: `${type.color}20` }]}>
                <IconComponent size={24} color={type.color} />
              </View>
              <Text style={[styles.typeLabel, isSelected && { color: type.color }]}>
                {type.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  if (!reportType) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>What would you like to report?</Text>
          <Text style={styles.subtitle}>Help keep your community informed and safe</Text>
        </View>

        <View style={styles.optionsContainer}>
          <TouchableOpacity
            style={styles.optionCard}
            onPress={() => setReportType('vibe')}
          >
            <LinearGradient
              colors={['#4CAF50', '#45a049']}
              style={styles.optionGradient}
            >
              <Heart size={32} color="#ffffff" />
              <Text style={styles.optionTitle}>Report Vibe</Text>
              <Text style={styles.optionDescription}>
                Share positive experiences, safe areas, or community events
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
              <Text style={styles.optionTitle}>Report Event</Text>
              <Text style={styles.optionDescription}>
                Report incidents, accidents, or situations that need attention
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setReportType(null)}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>
            Report {reportType === 'vibe' ? 'Vibe' : 'Event'}
          </Text>
          <Text style={styles.subtitle}>
            {reportType === 'vibe' 
              ? 'Share something positive happening around you'
              : 'Report an incident or situation that needs attention'
            }
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Type *</Text>
            {renderTypeSelection()}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description *</Text>
            <TextInput
              style={styles.textArea}
              value={description}
              onChangeText={setDescription}
              placeholder={`Describe the ${reportType}...`}
              placeholderTextColor="#8e8e93"
              multiline
              numberOfLines={4}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tags (optional)</Text>
            <TextInput
              style={styles.textInput}
              value={tags}
              onChangeText={setTags}
              placeholder="e.g., music, safety, community"
              placeholderTextColor="#8e8e93"
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Location</Text>
            <View style={styles.locationContainer}>
              <MapPin size={16} color="#8e8e93" />
              <Text style={styles.locationText}>
                {location 
                  ? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
                  : 'Location not available'
                }
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.anonymousToggle}
            onPress={() => setAnonymous(!anonymous)}
          >
            <View style={[styles.checkbox, anonymous && styles.checkboxChecked]}>
              {anonymous && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.anonymousText}>Report anonymously</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <LinearGradient
              colors={reportType === 'vibe' ? ['#4CAF50', '#45a049'] : ['#FF9800', '#f57c00']}
              style={styles.submitGradient}
            >
              <Send size={16} color="#ffffff" />
              <Text style={styles.submitButtonText}>
                {loading ? 'Submitting...' : `Submit ${reportType === 'vibe' ? 'Vibe' : 'Event'}`}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
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
});
