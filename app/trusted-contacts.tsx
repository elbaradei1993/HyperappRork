import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  TextInput,
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, UserPlus, Phone, Trash2, Shield, X, Book, Search } from 'lucide-react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/contexts/AuthContext';
import * as Contacts from 'expo-contacts';

interface TrustedContact {
  id: string;
  name: string;
  phone: string;
  email: string;
  relationship: string;
  isPrimary: boolean;
}

export default function TrustedContactsScreen() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<TrustedContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showContactsModal, setShowContactsModal] = useState(false);
  const [phoneContacts, setPhoneContacts] = useState<any[]>([]);
  const [filteredPhoneContacts, setFilteredPhoneContacts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [newContact, setNewContact] = useState({
    name: '',
    phone: '',
    email: '',
    relationship: 'Friend',
  });

  useEffect(() => {
    loadContacts();
  }, [user]);

  const loadContacts = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const stored = await AsyncStorage.getItem(`trusted_contacts_${user.id}`);
      if (stored) {
        setContacts(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveContacts = async (updatedContacts: TrustedContact[]) => {
    if (!user) return;
    
    try {
      await AsyncStorage.setItem(`trusted_contacts_${user.id}`, JSON.stringify(updatedContacts));
      setContacts(updatedContacts);
    } catch (error) {
      console.error('Error saving contacts:', error);
      Alert.alert('Error', 'Failed to save contacts');
    }
  };

  const handleAddContact = () => {
    Alert.alert(
      'Add Contact',
      'How would you like to add a contact?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'From Phone Book', onPress: handleImportFromContacts },
        { text: 'Enter Manually', onPress: () => setShowAddModal(true) },
      ]
    );
  };

  const handleImportFromContacts = async () => {
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need access to your contacts to import them.');
        return;
      }

      setLoadingContacts(true);
      setShowContactsModal(true);
      
      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers, Contacts.Fields.Emails],
      });

      if (data.length > 0) {
        // Filter contacts that have phone numbers
        const contactsWithPhone = data.filter((contact: any) => 
          contact.phoneNumbers && contact.phoneNumbers.length > 0
        );
        setPhoneContacts(contactsWithPhone);
        setFilteredPhoneContacts(contactsWithPhone);
      } else {
        Alert.alert('No Contacts', 'No contacts found in your phone book.');
        setShowContactsModal(false);
      }
    } catch (error) {
      console.error('Error accessing contacts:', error);
      Alert.alert('Error', 'Failed to access contacts');
      setShowContactsModal(false);
    } finally {
      setLoadingContacts(false);
    }
  };

  const handleSearchContacts = (query: string) => {
    setSearchQuery(query);
    if (query.trim() === '') {
      setFilteredPhoneContacts(phoneContacts);
    } else {
      const filtered = phoneContacts.filter(contact =>
        contact.name?.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredPhoneContacts(filtered);
    }
  };

  const handleSelectPhoneContact = (contact: any) => {
    if (contacts.length >= 5) {
      Alert.alert('Limit Reached', 'You can only add up to 5 trusted contacts.');
      return;
    }

    const phoneNumber = contact.phoneNumbers?.[0]?.number || '';
    const email = contact.emails?.[0]?.email || '';
    
    const newTrustedContact: TrustedContact = {
      id: Date.now().toString(),
      name: contact.name || 'Unknown',
      phone: phoneNumber,
      email: email,
      relationship: 'Friend',
      isPrimary: contacts.length === 0,
    };

    const updatedContacts = [...contacts, newTrustedContact];
    saveContacts(updatedContacts);
    
    setShowContactsModal(false);
    setSearchQuery('');
    Alert.alert('Success', `${contact.name} added as trusted contact`);
  };

  const handleSaveNewContact = async () => {
    if (!newContact.name || !newContact.phone) {
      Alert.alert('Error', 'Please enter name and phone number');
      return;
    }

    const contact: TrustedContact = {
      id: Date.now().toString(),
      name: newContact.name,
      phone: newContact.phone,
      email: newContact.email,
      relationship: newContact.relationship,
      isPrimary: contacts.length === 0,
    };

    const updatedContacts = [...contacts, contact];
    await saveContacts(updatedContacts);
    
    setShowAddModal(false);
    setNewContact({ name: '', phone: '', email: '', relationship: 'Friend' });
    Alert.alert('Success', 'Trusted contact added successfully');
  };

  const handleSetPrimary = async (id: string) => {
    const updatedContacts = contacts.map(contact => ({
      ...contact,
      isPrimary: contact.id === id,
    }));
    await saveContacts(updatedContacts);
    Alert.alert('Success', 'Primary contact updated');
  };

  const handleDeleteContact = (id: string) => {
    Alert.alert(
      'Remove Contact',
      'Are you sure you want to remove this trusted contact?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const updatedContacts = contacts.filter(c => c.id !== id);
            await saveContacts(updatedContacts);
            Alert.alert('Success', 'Contact removed');
          },
        },
      ]
    );
  };

  const handleCallContact = (phone: string) => {
    Alert.alert('Call Contact', `Call ${phone}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Call', onPress: () => console.log(`Calling ${phone}`) },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Phone Contacts Modal */}
      <Modal
        visible={showContactsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowContactsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '80%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select from Contacts</Text>
              <TouchableOpacity onPress={() => setShowContactsModal(false)}>
                <X size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.searchContainer}>
              <Search size={20} color="#999" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search contacts..."
                value={searchQuery}
                onChangeText={handleSearchContacts}
                placeholderTextColor="#999"
              />
            </View>
            
            {loadingContacts ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4CAF50" />
                <Text style={styles.loadingText}>Loading contacts...</Text>
              </View>
            ) : (
              <FlatList
                data={filteredPhoneContacts}
                keyExtractor={(item) => item.id || Math.random().toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.phoneContactItem}
                    onPress={() => handleSelectPhoneContact(item)}
                  >
                    <View style={styles.phoneContactAvatar}>
                      <Text style={styles.phoneContactInitial}>
                        {item.name?.charAt(0) || '?'}
                      </Text>
                    </View>
                    <View style={styles.phoneContactInfo}>
                      <Text style={styles.phoneContactName}>{item.name || 'Unknown'}</Text>
                      {item.phoneNumbers && item.phoneNumbers[0] && (
                        <Text style={styles.phoneContactNumber}>
                          {item.phoneNumbers[0].number}
                        </Text>
                      )}
                    </View>
                    <UserPlus size={20} color="#4CAF50" />
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View style={styles.emptyContactsList}>
                    <Text style={styles.emptyContactsText}>
                      {searchQuery ? 'No contacts found' : 'No contacts available'}
                    </Text>
                  </View>
                }
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Add Contact Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Trusted Contact</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <X size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <TextInput
              style={styles.input}
              placeholder="Name"
              value={newContact.name}
              onChangeText={(text) => setNewContact({ ...newContact, name: text })}
              placeholderTextColor="#999"
            />
            
            <TextInput
              style={styles.input}
              placeholder="Phone Number"
              value={newContact.phone}
              onChangeText={(text) => setNewContact({ ...newContact, phone: text })}
              keyboardType="phone-pad"
              placeholderTextColor="#999"
            />
            
            <TextInput
              style={styles.input}
              placeholder="Email (optional)"
              value={newContact.email}
              onChangeText={(text) => setNewContact({ ...newContact, email: text })}
              keyboardType="email-address"
              placeholderTextColor="#999"
            />
            
            <View style={styles.relationshipContainer}>
              <Text style={styles.inputLabel}>Relationship</Text>
              <View style={styles.relationshipOptions}>
                {['Family', 'Friend', 'Other'].map((rel) => (
                  <TouchableOpacity
                    key={rel}
                    style={[
                      styles.relationshipOption,
                      newContact.relationship === rel && styles.relationshipOptionActive,
                    ]}
                    onPress={() => setNewContact({ ...newContact, relationship: rel })}
                  >
                    <Text
                      style={[
                        styles.relationshipText,
                        newContact.relationship === rel && styles.relationshipTextActive,
                      ]}
                    >
                      {rel}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowAddModal(false);
                  setNewContact({ name: '', phone: '', email: '', relationship: 'Friend' });
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSaveNewContact}
              >
                <Text style={styles.saveButtonText}>Add Contact</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Trusted Contacts</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleImportFromContacts} style={styles.addButton}>
            <Book size={24} color="#2196F3" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowAddModal(true)} style={styles.addButton}>
            <UserPlus size={24} color="#4CAF50" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.infoCard}>
          <Shield size={24} color="#4CAF50" />
          <Text style={styles.infoText}>
            Trusted contacts will be automatically notified when you trigger an SOS alert
          </Text>
        </View>

        {contacts.length === 0 ? (
          <View style={styles.emptyState}>
            <UserPlus size={48} color="#ccc" />
            <Text style={styles.emptyText}>No trusted contacts added</Text>
            <TouchableOpacity style={styles.addFirstButton} onPress={handleAddContact}>
              <Text style={styles.addFirstText}>Add Your First Contact</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.contactsList}>
            {contacts.map((contact) => (
              <View key={contact.id} style={styles.contactCard}>
                <View style={styles.contactAvatar}>
                  <Text style={styles.avatarText}>
                    {contact.name.split(' ').map(n => n[0]).join('')}
                  </Text>
                </View>
                <View style={styles.contactInfo}>
                  <View style={styles.contactHeader}>
                    <Text style={styles.contactName}>{contact.name}</Text>
                    {contact.isPrimary && (
                      <View style={styles.primaryBadge}>
                        <Text style={styles.primaryText}>Primary</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.contactDetail}>{contact.phone}</Text>
                  {contact.email && (
                    <Text style={styles.contactDetail}>{contact.email}</Text>
                  )}
                  <Text style={styles.contactRelation}>{contact.relationship}</Text>
                </View>
                <View style={styles.contactActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleCallContact(contact.phone)}
                  >
                    <Phone size={18} color="#4CAF50" />
                  </TouchableOpacity>
                  {!contact.isPrimary && (
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleSetPrimary(contact.id)}
                    >
                      <Shield size={18} color="#2196F3" />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleDeleteContact(contact.id)}
                  >
                    <Trash2 size={18} color="#ff4444" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={styles.limitInfo}>
          <Text style={styles.limitText}>
            You can add up to 5 trusted contacts. {contacts.length}/5 added.
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
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  content: {
    flex: 1,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e9',
    margin: 15,
    padding: 15,
    borderRadius: 10,
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#2e7d32',
    lineHeight: 20,
  },
  contactsList: {
    paddingHorizontal: 15,
  },
  contactCard: {
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
  contactAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  contactInfo: {
    flex: 1,
  },
  contactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  primaryBadge: {
    marginLeft: 8,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  primaryText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
  },
  contactDetail: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  contactRelation: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  contactActions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
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
  limitInfo: {
    padding: 20,
    alignItems: 'center',
  },
  limitText: {
    fontSize: 13,
    color: '#999',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
    color: '#333',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 8,
  },
  relationshipContainer: {
    marginBottom: 20,
  },
  relationshipOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  relationshipOption: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  relationshipOptionActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  relationshipText: {
    fontSize: 14,
    color: '#666',
  },
  relationshipTextActive: {
    color: '#fff',
    fontWeight: '500',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
  },
  saveButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#333',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  phoneContactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  phoneContactAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  phoneContactInitial: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
  },
  phoneContactInfo: {
    flex: 1,
  },
  phoneContactName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  phoneContactNumber: {
    fontSize: 14,
    color: '#666',
  },
  emptyContactsList: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyContactsText: {
    fontSize: 14,
    color: '#999',
  },
});
