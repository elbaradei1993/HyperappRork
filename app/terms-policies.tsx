import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, FileText, Shield, Lock, Info } from 'lucide-react-native';
import { router } from 'expo-router';

interface PolicyItem {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  route: string;
  lastUpdated: string;
}

export default function TermsPoliciesScreen() {
  const policies: PolicyItem[] = [
    {
      id: '1',
      title: 'Terms of Service',
      description: 'Our terms and conditions for using the app',
      icon: <FileText size={24} color="#4CAF50" />,
      route: '/terms-of-service',
      lastUpdated: 'Updated Jan 1, 2025',
    },
    {
      id: '2',
      title: 'Privacy Policy',
      description: 'How we collect, use, and protect your data',
      icon: <Shield size={24} color="#2196F3" />,
      route: '/privacy-policy',
      lastUpdated: 'Updated Jan 1, 2025',
    },
    {
      id: '3',
      title: 'Data Protection',
      description: 'Your rights and our data handling practices',
      icon: <Lock size={24} color="#FF9800" />,
      route: '/data-protection',
      lastUpdated: 'Updated Dec 15, 2024',
    },
    {
      id: '4',
      title: 'Community Guidelines',
      description: 'Rules for responsible app usage',
      icon: <Info size={24} color="#9C27B0" />,
      route: '/community-guidelines',
      lastUpdated: 'Updated Dec 1, 2024',
    },
  ];

  const handlePolicyPress = (route: string) => {
    if (route === '/terms-of-service' || route === '/privacy-policy') {
      router.push(route as any);
    } else {
      // For routes that don't exist yet, show a placeholder
      router.push('/privacy-policy');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms & Policies</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Legal Information</Text>
          <Text style={styles.infoText}>
            Please review our terms and policies to understand how we operate and protect your rights.
          </Text>
        </View>

        <View style={styles.policiesList}>
          {policies.map((policy) => (
            <TouchableOpacity
              key={policy.id}
              style={styles.policyCard}
              onPress={() => handlePolicyPress(policy.route)}
            >
              <View style={styles.iconContainer}>
                {policy.icon}
              </View>
              <View style={styles.policyInfo}>
                <Text style={styles.policyTitle}>{policy.title}</Text>
                <Text style={styles.policyDescription}>{policy.description}</Text>
                <Text style={styles.policyUpdated}>{policy.lastUpdated}</Text>
              </View>
              <ChevronLeft size={20} color="#999" style={styles.chevron} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.contactSection}>
          <Text style={styles.contactTitle}>Questions?</Text>
          <Text style={styles.contactText}>
            If you have any questions about our terms or policies, please contact our legal team at:
          </Text>
          <Text style={styles.contactEmail}>legal@safetyapp.com</Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By using our app, you agree to these terms and policies.
          </Text>
          <Text style={styles.footerVersion}>Version 1.0.0</Text>
        </View>
      </ScrollView>
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
  infoCard: {
    backgroundColor: '#e8f5e9',
    margin: 15,
    padding: 15,
    borderRadius: 10,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2e7d32',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#2e7d32',
    lineHeight: 20,
  },
  policiesList: {
    paddingHorizontal: 15,
  },
  policyCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  policyInfo: {
    flex: 1,
  },
  policyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  policyDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  policyUpdated: {
    fontSize: 12,
    color: '#999',
  },
  chevron: {
    transform: [{ rotate: '180deg' }],
  },
  contactSection: {
    backgroundColor: '#fff',
    margin: 15,
    padding: 20,
    borderRadius: 12,
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  contactText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 10,
  },
  contactEmail: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '500',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  footerText: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
    marginBottom: 5,
  },
  footerVersion: {
    fontSize: 12,
    color: '#bbb',
  },
});
