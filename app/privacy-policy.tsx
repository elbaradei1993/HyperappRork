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

export default function PrivacyPolicyScreen() {
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
        <Text style={styles.title}>Privacy Policy</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.lastUpdated}>Last updated: {new Date().toLocaleDateString()}</Text>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Information We Collect</Text>
          <Text style={styles.sectionText}>
            We collect information you provide directly to us, such as when you create an account, 
            use our services, or contact us. This includes your email address, profile information, 
            and location data when you choose to share it.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. How We Use Your Information</Text>
          <Text style={styles.sectionText}>
            We use the information we collect to provide, maintain, and improve our services, 
            including to process transactions, send notifications about safety alerts in your area, 
            and provide customer support.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Information Sharing</Text>
          <Text style={styles.sectionText}>
            We do not sell, trade, or otherwise transfer your personal information to third parties 
            without your consent, except as described in this policy. We may share information in 
            response to legal requests or to protect our rights.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Location Information</Text>
          <Text style={styles.sectionText}>
            Location data is only collected when you explicitly enable location services and is used 
            solely to provide relevant safety alerts and community features. You can disable location 
            sharing at any time in your settings.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Data Security</Text>
          <Text style={styles.sectionText}>
            We implement appropriate security measures to protect your personal information against 
            unauthorized access, alteration, disclosure, or destruction.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Your Rights</Text>
          <Text style={styles.sectionText}>
            You have the right to access, update, or delete your personal information. You can also 
            opt out of certain communications from us. Contact us if you wish to exercise these rights.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. Contact Us</Text>
          <Text style={styles.sectionText}>
            If you have any questions about this Privacy Policy, please contact us at privacy@hyperapp.com
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