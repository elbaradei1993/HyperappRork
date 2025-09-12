import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { router } from 'expo-router';

export default function TermsOfServiceScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <ChevronLeft size={24} color="#ffffff" onPress={() => router.back()} />
        <Text style={styles.title}>Terms of Service</Text>
      </View>
      
      <ScrollView style={styles.content}>
        <Text style={styles.lastUpdated}>Last updated: September 6, 2025</Text>
        
        <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
        <Text style={styles.paragraph}>
          By accessing and using HyperAPP, you accept and agree to be bound by the terms 
          and provision of this agreement.
        </Text>
        
        <Text style={styles.sectionTitle}>2. Use License</Text>
        <Text style={styles.paragraph}>
          Permission is granted to temporarily use HyperAPP for personal, non-commercial 
          transitory viewing only.
        </Text>
        
        <Text style={styles.sectionTitle}>3. User Responsibilities</Text>
        <Text style={styles.paragraph}>
          You are responsible for maintaining the confidentiality of your account and password 
          and for restricting access to your device.
        </Text>
        
        <Text style={styles.sectionTitle}>4. Prohibited Uses</Text>
        <Text style={styles.paragraph}>
          You may not use HyperAPP for any unlawful purpose or to solicit others to perform 
          or participate in any unlawful acts.
        </Text>
        
        <Text style={styles.sectionTitle}>5. Contact Information</Text>
        <Text style={styles.paragraph}>
          If you have any questions about these Terms of Service, please contact us at 
          legal@hyperapp.com.
        </Text>
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
    padding: 16,
    gap: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  lastUpdated: {
    fontSize: 14,
    color: '#8e8e93',
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 24,
    marginBottom: 12,
  },
  paragraph: {
    fontSize: 16,
    color: '#8e8e93',
    lineHeight: 24,
  },
});
