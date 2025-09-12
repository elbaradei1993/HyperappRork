import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAlerts } from '@/contexts/AlertContext';
import { useAuth } from '@/contexts/AuthContext';
import { useGuardian } from '@/contexts/GuardianContext';
import { Shield, Heart, Stethoscope, X, CheckCircle, Clock } from 'lucide-react-native';
import { soundManager } from '@/utils/soundManager';

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
  const [, setResponseReceived] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [currentSosId, setCurrentSosId] = useState<string | null>(null);
  const reminderTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Reset state when modal opens
    if (visible && !submitted) {
      setSelectedType('');
      setDescription('');
      setAnonymous(false);
      setLoading(false);
    }
  }, [visible, location, submitted]);

  const { sendSOSAlert, markAlertResolved } = useAlerts();
  const { user } = useAuth();
  const { sendAlert: sendGuardianAlert } = useGuardian();

  const handleSubmit = async () => {
    if (!selectedType) {
      Alert.alert('Error', 'Please select an emergency type');
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
        setSubmitted(true);
        
        // Play SOS alert sound
        await soundManager.playSOSAlert();
        
        // Trigger Guardian Angels alert
        try {
          await sendGuardianAlert('manual', `Emergency: ${selectedType} - ${description || 'Immediate assistance needed'}`);
        } catch (guardianError) {
          // Guardian alert failed silently
        }
        
        // Set reminder for 10 minutes
        reminderTimeoutRef.current = setTimeout(() => {
          setShowReminderModal(true);
          soundManager.playWarning(); // Play warning sound for reminder
        }, 10 * 60 * 1000) as unknown as NodeJS.Timeout; // 10 minutes
      }

    } catch (error: any) {
      Alert.alert('Error', error.message);
      setLoading(false);
    }
  };

  const handleResolve = async () => {
    if (currentSosId) {
      try {
        await markAlertResolved(currentSosId);
        await soundManager.playSuccess(); // Play success sound
        Alert.alert('Success', 'SOS alert has been marked as resolved');
        handleClose();
      } catch {
        Alert.alert('Error', 'Failed to resolve alert');
      }
    }
  };

  const handleReminderResponse = (resolved: boolean) => {
    setShowReminderModal(false);
    if (resolved) {
      handleResolve();
    } else {
      // Set another reminder for 10 minutes
      reminderTimeoutRef.current = setTimeout(() => {
        setShowReminderModal(true);
      }, 10 * 60 * 1000) as unknown as NodeJS.Timeout;
    }
  };

  const handleClose = () => {
    if (reminderTimeoutRef.current) {
      clearTimeout(reminderTimeoutRef.current);
    }
    setSelectedType('');
    setDescription('');
    setAnonymous(false);
    setLoading(false);
    setSubmitted(false);
    setResponseReceived(false);
    setShowReminderModal(false);
    setCurrentSosId(null);
    onClose();
  };

  useEffect(() => {
    return () => {
      if (reminderTimeoutRef.current) {
        clearTimeout(reminderTimeoutRef.current);
      }
    };
  }, []);

  if (submitted) {
    return (
      <>
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
                  Your emergency alert has been sent to nearby users within 1km radius.
                </Text>
                
                <View style={styles.radiusVisualization}>
                  <View style={styles.radiusCenter} />
                  <View style={styles.radiusRing} />
                </View>
                
                <Text style={styles.waitingText}>
                  Waiting for response...
                </Text>
                
                <ActivityIndicator size="large" color="#ffffff" style={styles.activityIndicator} />
                
                <TouchableOpacity
                  style={styles.resolveButton}
                  onPress={handleResolve}
                >
                  <CheckCircle size={20} color="#ffffff" />
                  <Text style={styles.resolveButtonText}>Mark as Resolved</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.closeStatusButton}
                  onPress={handleClose}
                >
                  <Text style={styles.closeStatusText}>Close</Text>
                </TouchableOpacity>
              </LinearGradient>
            </View>
          </View>
        </Modal>

        {/* Reminder Modal */}
        <Modal visible={showReminderModal} transparent animationType="slide">
          <View style={styles.overlay}>
            <View style={styles.reminderContainer}>
              <Clock size={48} color="#ff4757" />
              <Text style={styles.reminderTitle}>SOS Status Check</Text>
              <Text style={styles.reminderText}>
                It&apos;s been 10 minutes since your SOS alert. Has your emergency been resolved?
              </Text>
              
              <View style={styles.reminderButtons}>
                <TouchableOpacity
                  style={[styles.reminderButton, styles.resolvedButton]}
                  onPress={() => handleReminderResponse(true)}
                >
                  <Text style={styles.reminderButtonText}>Yes, Resolved</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.reminderButton, styles.waitButton]}
                  onPress={() => handleReminderResponse(false)}
                >
                  <Text style={styles.reminderButtonText}>Wait 10 More Minutes</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </>
    );
  }

  if (!visible) {
    return null;
  }

  return (
    <Modal visible={true} transparent animationType="slide">
      <KeyboardAvoidingView 
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity 
          style={styles.overlayTouchable} 
          activeOpacity={1}
          onPress={handleClose}
        >
          <TouchableOpacity 
            style={styles.modalContainer}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.header}>
              <Text style={styles.title}>Emergency SOS</Text>
              <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
                <X size={24} color="#8e8e93" />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.scrollContent}
              contentContainerStyle={styles.scrollContentContainer}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
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

              <View style={styles.submitButtonContainer}>
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
              </View>

              <Text style={styles.disclaimer}>
                This will send an emergency alert to nearby users and responders within 1km.
              </Text>
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  overlayTouchable: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  modalContainer: {
    backgroundColor: '#1a1a2e',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '85%',
    minHeight: 500,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 24,
    paddingTop: 24,
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
    minHeight: 60,
    maxHeight: 80,
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
  submitButtonContainer: {
    marginTop: 16,
    marginBottom: 16,
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
    alignSelf: 'center',
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
  closeStatusButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  closeStatusText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  reminderContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    margin: 20,
    alignItems: 'center',
    maxWidth: 350,
  },
  reminderTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 12,
  },
  reminderText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  reminderButtons: {
    width: '100%',
    gap: 12,
  },
  reminderButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  resolvedButton: {
    backgroundColor: '#4CAF50',
  },
  waitButton: {
    backgroundColor: '#FF9800',
  },
  reminderButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  activityIndicator: {
    marginVertical: 16,
  },
});
