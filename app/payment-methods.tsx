import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, CreditCard, Plus, Trash2 } from 'lucide-react-native';
import { router } from 'expo-router';

interface PaymentMethod {
  id: string;
  type: 'card' | 'paypal' | 'apple' | 'google';
  last4?: string;
  brand?: string;
  email?: string;
  isDefault: boolean;
}

export default function PaymentMethodsScreen() {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([
    {
      id: '1',
      type: 'card',
      brand: 'Visa',
      last4: '4242',
      isDefault: true,
    },
    {
      id: '2',
      type: 'card',
      brand: 'Mastercard',
      last4: '5555',
      isDefault: false,
    },
  ]);

  const handleAddPayment = () => {
    Alert.alert(
      'Add Payment Method',
      'Choose a payment method to add',
      [
        { text: 'Credit/Debit Card', onPress: () => addCard() },
        { text: 'PayPal', onPress: () => addPayPal() },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const addCard = () => {
    Alert.prompt(
      'Add Card',
      'Enter last 4 digits (for demo)',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add',
          onPress: (last4) => {
            if (last4 && last4.length === 4) {
              const newCard: PaymentMethod = {
                id: Date.now().toString(),
                type: 'card',
                brand: 'Visa',
                last4,
                isDefault: paymentMethods.length === 0,
              };
              setPaymentMethods([...paymentMethods, newCard]);
              Alert.alert('Success', 'Card added successfully');
            }
          },
        },
      ],
      'plain-text'
    );
  };

  const addPayPal = () => {
    Alert.prompt(
      'Add PayPal',
      'Enter PayPal email',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add',
          onPress: (email) => {
            if (email && email.includes('@')) {
              const newPayPal: PaymentMethod = {
                id: Date.now().toString(),
                type: 'paypal',
                email,
                isDefault: paymentMethods.length === 0,
              };
              setPaymentMethods([...paymentMethods, newPayPal]);
              Alert.alert('Success', 'PayPal account added successfully');
            }
          },
        },
      ],
      'plain-text'
    );
  };

  const handleSetDefault = (id: string) => {
    setPaymentMethods(methods =>
      methods.map(method => ({
        ...method,
        isDefault: method.id === id,
      }))
    );
    Alert.alert('Success', 'Default payment method updated');
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      'Delete Payment Method',
      'Are you sure you want to remove this payment method?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setPaymentMethods(methods => methods.filter(m => m.id !== id));
            Alert.alert('Success', 'Payment method removed');
          },
        },
      ]
    );
  };

  const renderPaymentMethod = (method: PaymentMethod) => {
    const getCardIcon = () => {
      if (method.type === 'paypal') return '💳';
      if (method.brand === 'Visa') return '💳';
      if (method.brand === 'Mastercard') return '💳';
      return '💳';
    };

    return (
      <View key={method.id} style={styles.paymentCard}>
        <View style={styles.cardLeft}>
          <Text style={styles.cardIcon}>{getCardIcon()}</Text>
          <View style={styles.cardInfo}>
            {method.type === 'card' ? (
              <>
                <Text style={styles.cardBrand}>{method.brand}</Text>
                <Text style={styles.cardNumber}>•••• {method.last4}</Text>
              </>
            ) : (
              <>
                <Text style={styles.cardBrand}>PayPal</Text>
                <Text style={styles.cardNumber}>{method.email}</Text>
              </>
            )}
            {method.isDefault && (
              <Text style={styles.defaultBadge}>Default</Text>
            )}
          </View>
        </View>
        <View style={styles.cardActions}>
          {!method.isDefault && (
            <TouchableOpacity
              style={styles.setDefaultButton}
              onPress={() => handleSetDefault(method.id)}
            >
              <Text style={styles.setDefaultText}>Set Default</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDelete(method.id)}
          >
            <Trash2 size={18} color="#ff4444" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment Methods</Text>
        <TouchableOpacity onPress={handleAddPayment} style={styles.addButton}>
          <Plus size={24} color="#4CAF50" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {paymentMethods.length === 0 ? (
          <View style={styles.emptyState}>
            <CreditCard size={48} color="#ccc" />
            <Text style={styles.emptyText}>No payment methods added</Text>
            <TouchableOpacity style={styles.addFirstButton} onPress={handleAddPayment}>
              <Text style={styles.addFirstText}>Add Payment Method</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.methodsList}>
            {paymentMethods.map(renderPaymentMethod)}
          </View>
        )}

        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>Payment Security</Text>
          <Text style={styles.infoText}>
            Your payment information is encrypted and securely stored. We never store your full card details.
          </Text>
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
  addButton: {
    padding: 5,
  },
  content: {
    flex: 1,
  },
  methodsList: {
    padding: 20,
  },
  paymentCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cardIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  cardInfo: {
    flex: 1,
  },
  cardBrand: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  cardNumber: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  defaultBadge: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
    marginTop: 4,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  setDefaultButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
    marginRight: 10,
  },
  setDefaultText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  deleteButton: {
    padding: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 15,
    marginBottom: 20,
  },
  addFirstButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addFirstText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoSection: {
    margin: 20,
    padding: 15,
    backgroundColor: '#e8f5e9',
    borderRadius: 8,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2e7d32',
    marginBottom: 5,
  },
  infoText: {
    fontSize: 13,
    color: '#2e7d32',
    lineHeight: 18,
  },
});
