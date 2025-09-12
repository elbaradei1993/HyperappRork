import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
  TextInput,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, HelpCircle, MessageCircle, Phone, Mail, FileText, Send } from 'lucide-react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';

interface HelpItem {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  action: () => void;
}

export default function HelpSupportScreen() {
  const { user } = useAuth();
  const { t } = useSettings();
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackType, setFeedbackType] = useState<'bug' | 'feature' | 'general'>('general');
  const [submitting, setSubmitting] = useState(false);

  const handleContactSupport = async (method: string) => {
    if (method === 'Email') {
      const email = 'support@hyperapp.com';
      const subject = 'Support Request';
      const body = `User ID: ${user?.id || 'Not logged in'}\n\nDescribe your issue:`;
      const url = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Unable to open email client');
      }
    } else if (method === 'Phone') {
      const phoneNumber = Platform.OS === 'ios' ? 'tel:+1234567890' : 'tel:+1234567890';
      const canOpen = await Linking.canOpenURL(phoneNumber);
      if (canOpen) {
        Alert.alert(
          'Call Support',
          'Call our 24/7 support line?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Call', onPress: () => Linking.openURL(phoneNumber) },
          ]
        );
      } else {
        Alert.alert('Error', 'Unable to make phone calls from this device');
      }
    } else if (method === 'Live Chat') {
      Alert.alert(
        'Live Chat',
        'Live chat support is available 24/7',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Start Chat', onPress: () => {
            // In a real app, this would open a chat interface
            Alert.alert('Chat Started', 'A support agent will be with you shortly');
          }},
        ]
      );
    }
  };

  const handleOpenFAQ = async () => {
    const url = 'https://hyperapp.com/faq';
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      Alert.alert(
        'Frequently Asked Questions',
        'Q: How do I report an emergency?\nA: Use the SOS button on the main screen for immediate help.\n\nQ: How do I add trusted contacts?\nA: Go to Profile > Trusted Contacts to add emergency contacts.\n\nQ: Is my location data private?\nA: Yes, your location is only shared when you explicitly report an incident or activate SOS.'
      );
    }
  };

  const handleOpenGuide = async () => {
    const url = 'https://hyperapp.com/guide';
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      Alert.alert(
        'User Guide',
        'Welcome to HyperAPP!\n\n1. Report vibes and events to help your community\n2. Use the SOS feature in emergencies\n3. Check the map for nearby incidents\n4. Keep your profile updated for better assistance\n5. Add trusted contacts for emergency notifications'
      );
    }
  };

  const submitFeedback = async () => {
    if (!feedbackText.trim()) {
      Alert.alert('Error', 'Please enter your feedback');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await (supabase as any)
        .from('feedback')
        .insert([{
          user_id: user?.id,
          type: feedbackType,
          message: feedbackText,
          created_at: new Date().toISOString(),
        }]);

      if (error) throw error;

      Alert.alert('Success', 'Thank you for your feedback!');
      setFeedbackText('');
      setShowFeedbackModal(false);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      Alert.alert('Success', 'Thank you for your feedback! We\'ll review it soon.');
      setFeedbackText('');
      setShowFeedbackModal(false);
    } finally {
      setSubmitting(false);
    }
  };

  const helpItems: HelpItem[] = [
    {
      id: '1',
      title: t('faqs'),
      description: t('faqsDescription'),
      icon: <HelpCircle size={24} color="#4CAF50" />,
      action: handleOpenFAQ,
    },
    {
      id: '2',
      title: t('userGuide'),
      description: t('userGuideDescription'),
      icon: <FileText size={24} color="#2196F3" />,
      action: handleOpenGuide,
    },
    {
      id: '3',
      title: t('liveChat'),
      description: t('liveChatDescription'),
      icon: <MessageCircle size={24} color="#FF9800" />,
      action: () => handleContactSupport('Live Chat'),
    },
    {
      id: '4',
      title: t('callSupport'),
      description: t('callSupportDescription'),
      icon: <Phone size={24} color="#9C27B0" />,
      action: () => handleContactSupport('Phone'),
    },
    {
      id: '5',
      title: t('emailSupport'),
      description: t('emailSupportDescription'),
      icon: <Mail size={24} color="#00BCD4" />,
      action: () => handleContactSupport('Email'),
    },
  ];

  const emergencyNumbers = [
    { country: 'USA', number: '911' },
    { country: 'UK', number: '999' },
    { country: 'EU', number: '112' },
    { country: 'Australia', number: '000' },
    { country: 'UAE', number: '999' },
    { country: 'Saudi Arabia', number: '911' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('helpSupport')}</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('howCanWeHelp')}</Text>
          
          {helpItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.helpCard}
              onPress={item.action}
            >
              <View style={styles.iconContainer}>
                {item.icon}
              </View>
              <View style={styles.helpInfo}>
                <Text style={styles.helpTitle}>{item.title}</Text>
                <Text style={styles.helpDescription}>{item.description}</Text>
              </View>
              <ChevronLeft size={20} color="#999" style={styles.chevron} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('emergencyNumbers')}</Text>
          <View style={styles.emergencyCard}>
            {emergencyNumbers.map((item, index) => (
              <View key={index} style={styles.emergencyItem}>
                <Text style={styles.emergencyCountry}>{item.country}</Text>
                <TouchableOpacity
                  onPress={async () => {
                    const phoneNumber = Platform.OS === 'ios' ? `tel:${item.number}` : `tel:${item.number}`;
                    const canOpen = await Linking.canOpenURL(phoneNumber);
                    if (canOpen) {
                      Alert.alert('Emergency Call', `Call ${item.number}?`, [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Call', style: 'destructive', onPress: () => Linking.openURL(phoneNumber) },
                      ]);
                    } else {
                      Alert.alert('Error', `Unable to call ${item.number}`);
                    }
                  }}
                >
                  <Text style={styles.emergencyNumber}>{item.number}</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('quickTips')}</Text>
          <View style={styles.tipsCard}>
            <Text style={styles.tipItem}>• Enable location services for accurate emergency response</Text>
            <Text style={styles.tipItem}>• Keep your trusted contacts updated</Text>
            <Text style={styles.tipItem}>• Test the SOS feature in a safe environment</Text>
            <Text style={styles.tipItem}>• Report incidents promptly to help others</Text>
          </View>
        </View>

        <View style={styles.feedbackSection}>
          <Text style={styles.feedbackTitle}>{t('sendFeedback')}</Text>
          <Text style={styles.feedbackText}>
            {t('helpImprove')}
          </Text>
          <TouchableOpacity
            style={styles.feedbackButton}
            onPress={() => setShowFeedbackModal(true)}
          >
            <Text style={styles.feedbackButtonText}>{t('sendFeedback')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Feedback Modal */}
      <Modal
        visible={showFeedbackModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFeedbackModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('sendFeedback')}</Text>
            
            <View style={styles.feedbackTypes}>
              {(['bug', 'feature', 'general'] as const).map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.feedbackTypeButton,
                    feedbackType === type && styles.feedbackTypeButtonActive,
                  ]}
                  onPress={() => setFeedbackType(type)}
                >
                  <Text
                    style={[
                      styles.feedbackTypeText,
                      feedbackType === type && styles.feedbackTypeTextActive,
                    ]}
                  >
                    {type === 'bug' ? t('bugReport') : type === 'feature' ? t('featureRequest') : t('general')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.feedbackInput}
              placeholder={t('describeFeedback')}
              placeholderTextColor="#999"
              multiline
              numberOfLines={6}
              value={feedbackText}
              onChangeText={setFeedbackText}
              textAlignVertical="top"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowFeedbackModal(false)}
              >
                <Text style={styles.cancelButtonText}>{t('cancel')}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={submitFeedback}
                disabled={submitting}
              >
                <Send size={18} color="#fff" />
                <Text style={styles.submitButtonText}>
                  {submitting ? t('sending') : t('send')}
                </Text>
              </TouchableOpacity>
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
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 20,
    marginBottom: 15,
  },
  helpCard: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  helpInfo: {
    flex: 1,
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  helpDescription: {
    fontSize: 14,
    color: '#666',
  },
  chevron: {
    transform: [{ rotate: '180deg' }],
  },
  emergencyCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    padding: 15,
    borderRadius: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  emergencyItem: {
    width: '48%',
    paddingVertical: 10,
    alignItems: 'center',
  },
  emergencyCountry: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  emergencyNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ff4444',
  },
  tipsCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    padding: 15,
    borderRadius: 12,
  },
  tipItem: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
    marginBottom: 8,
  },
  feedbackSection: {
    backgroundColor: '#e3f2fd',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  feedbackTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976d2',
    marginBottom: 8,
  },
  feedbackText: {
    fontSize: 14,
    color: '#1976d2',
    textAlign: 'center',
    marginBottom: 15,
  },
  feedbackButton: {
    backgroundColor: '#1976d2',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  feedbackButtonText: {
    color: '#fff',
    fontSize: 14,
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
    borderRadius: 20,
    padding: 24,
    margin: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  feedbackTypes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 10,
  },
  feedbackTypeButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  feedbackTypeButtonActive: {
    backgroundColor: '#e3f2fd',
    borderColor: '#1976d2',
  },
  feedbackTypeText: {
    fontSize: 14,
    color: '#666',
  },
  feedbackTypeTextActive: {
    color: '#1976d2',
    fontWeight: '600',
  },
  feedbackInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#333',
    minHeight: 120,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#1976d2',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
