import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAlerts } from '@/contexts/AlertContext';
import { Shield, Heart, Stethoscope, X } from 'lucide-react-native';

interface SOSModalProps {
  visible: boolean;
  onClose: () => void;
  location: {
    latitude: number;
    longitude: number;
  };
}

const SOS_TYPES = [
  { id: 'violence', label: 'Violence', icon: Shield, color: '#ff4757' },
  { id: 'medical', label: 'Medical Emergency', icon: Stethoscope, color: '#ff6b6b' },
  { id: 'panic', label: 'Panic/Anxiety', icon: Heart, color: '#ff8787' },
];

export function SOSModal({ visible, onClose, location }: SOSModalProps) {
  const [selectedType, setSelectedType] = useState('');
  const [description, setDescription] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [responseReceived, setResponseReceived] = useState(false);

  const { sendSOSAlert } = useAlerts();

  const handleSubmit = async () => {
    if (!selectedType) {
      Alert.alert('Error', 'Please select an emergency type');
      return;
    }

    setLoading(true);
    try {
      await sendSOSAlert({
        type: selectedType,
        description: description.trim() || 'Emergency assistance needed',
        location,
        anonymous,
      });

      setSubmitted(true);
      
      // Simulate response check after 10 seconds
      setTimeout(() => {
        const hasResponse = Math.random() > 0.5; // 50% chance of response
        setResponseReceived(hasResponse);
        
        if (hasResponse) {
          Alert.alert('Help is Coming', 'Hang in there, we\'re seeking help for you.');
        } else {
          Alert.alert('No Response', 'Sorry, no one responded. Try again or contact emergency services.');
        }
        
        setTimeout(() => {
          handleClose();
        }, 3000);
      }, 10000);

    } catch (error: any) {
      Alert.alert('Error', error.message);
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedType('');
    setDescription('');
    setAnonymous(false);
    setLoading(false);
    setSubmitted(false);
    setResponseReceived(false);
    onClose();
  };

  if (submitted) {
    return (
      <Modal visible={visible} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.sosStatusContainer}>
            <LinearGradient
              colors={['#ff4757', '#ff3742']}
              style={styles.sosStatusGradient}
            >
              <Shield size={48} color="#ffffff" />
              <Text style={styles.sosStatusTitle}>SOS Alert Sent</Text>
              <Text style={styles.sosStatusDescription}>
                Your emergency alert has been sent to nearby users within 10km radius.
              </Text>
              
              <View style={styles.radiusVisualization}>
                <View style={styles.radiusCenter} />
                <View style={styles.radiusRing} />
              </View>
              
              <Text style={styles.waitingText}>
                Waiting for response...
              </Text>
              
              <ActivityIndicator size="large" color="#ffffff" />
            </LinearGradient>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>Emergency SOS</Text>
            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
              <X size={24} color="#8e8e93" />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>
            What type of emergency assistance do you need?
          </Text>

          <View style={styles.typeContainer}>
            {SOS_TYPES.map((type) => {
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

          <View style={styles.descriptionContainer}>
            <Text style={styles.descriptionLabel}>Additional Details (Optional)</Text>
            <TextInput
              style={styles.descriptionInput}
              value={description}
              onChangeText={setDescription}
              placeholder="Describe the situation..."
              placeholderTextColor="#8e8e93"
              multiline
              numberOfLines={3}
            />
          </View>

          <TouchableOpacity
            style={styles.anonymousToggle}
            onPress={() => setAnonymous(!anonymous)}
          >
            <View style={[styles.checkbox, anonymous && styles.checkboxChecked]}>
              {anonymous && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.anonymousText}>Send anonymously</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <LinearGradient
              colors={['#ff4757', '#ff3742']}
              style={styles.submitGradient}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <>
                  <Shield size={20} color="#ffffff" />
                  <Text style={styles.submitButtonText}>Send SOS Alert</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <Text style={styles.disclaimer}>
            This will send an emergency alert to nearby users and responders within 10km.
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  closeButton: {
    padding: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#8e8e93',
    marginBottom: 24,
    lineHeight: 22,
  },
  typeContainer: {
    gap: 12,
    marginBottom: 24,
  },
  typeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  typeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  typeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    flex: 1,
  },
  descriptionContainer: {
    marginBottom: 24,
  },
  descriptionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  descriptionInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    minHeight: 80,
    textAlignVertical: 'top',
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
    marginBottom: 16,
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
  disclaimer: {
    fontSize: 12,
    color: '#8e8e93',
    textAlign: 'center',
    lineHeight: 16,
  },
  sosStatusContainer: {
    width: '90%',
    maxWidth: 350,
    borderRadius: 20,
    overflow: 'hidden',
  },
  sosStatusGradient: {
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
  radiusVisualization: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 16,
  },
  radiusCenter: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ffffff',
    position: 'absolute',
  },
  radiusRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: '#ffffff',
    borderStyle: 'dashed',
    opacity: 0.6,
  },
  waitingText: {
    fontSize: 16,
    color: '#ffffff',
    marginBottom: 8,
  },
});
