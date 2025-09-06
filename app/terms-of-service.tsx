import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';

export default function TermsOfServiceScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
        >
          <ChevronLeft size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.title}>Terms of Service</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.lastUpdated}>Last updated: {new Date().toLocaleDateString()}</Text>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
          <Text style={styles.sectionText}>
            By accessing and using HyperAPP, you accept and agree to be bound by the terms and 
            provision of this agreement. If you do not agree to abide by the above, please do not 
            use this service.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Use License</Text>
          <Text style={styles.sectionText}>
            Permission is granted to temporarily download one copy of the materials on HyperAPP for 
            personal, non-commercial transitory viewing only. This is the grant of a license, not a 
            transfer of title.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. User Responsibilities</Text>
          <Text style={styles.sectionText}>
            You are responsible for your account and all activities that occur under your account. 
            You agree to provide accurate information and maintain the security of your account credentials.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Community Guidelines</Text>
          <Text style={styles.sectionText}>
            Users must report information accurately and responsibly. False reporting, harassment, 
            or misuse of emergency features may result in account suspension or termination.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Emergency Services</Text>
          <Text style={styles.sectionText}>
            HyperAPP is not a replacement for emergency services. In case of real emergency, 
            contact local emergency services (911, 112, etc.) immediately.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Limitation of Liability</Text>
          <Text style={styles.sectionText}>
            HyperAPP and its contributors shall not be liable for any damages arising from the use 
            or inability to use the service, even if we have been notified of the possibility of such damages.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. Modifications</Text>
          <Text style={styles.sectionText}>
            We may revise these terms at any time without notice. By using this service, you are 
            agreeing to be bound by the then current version of these terms.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. Contact Information</Text>
          <Text style={styles.sectionText}>
            If you have any questions about these Terms of Service, please contact us at legal@hyperapp.com
          </Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  lastUpdated: {
    fontSize: 14,
    color: '#8e8e93',
    textAlign: 'center',
    marginVertical: 20,
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
  sectionText: {
    fontSize: 14,
    color: '#8e8e93',
    lineHeight: 20,
  },
});