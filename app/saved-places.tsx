import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Platform,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, MapPin, Home, Briefcase, Heart, Plus, Trash2, Edit2, Search, X } from 'lucide-react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface SavedPlace {
  id: string;
  name: string;
  address: string;
  type: 'home' | 'work' | 'favorite';
  latitude?: number;
  longitude?: number;
}

interface PlaceSearchResult {
  place_id: string;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
}

export default function SavedPlacesScreen() {
  const { user } = useAuth();
  const [places, setPlaces] = useState<SavedPlace[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPlaceName, setNewPlaceName] = useState('');
  const [newPlaceAddress, setNewPlaceAddress] = useState('');
  const [newPlaceType, setNewPlaceType] = useState<'home' | 'work' | 'favorite'>('favorite');
  const [searchingPlaces, setSearchingPlaces] = useState(false);
  const [searchResults, setSearchResults] = useState<PlaceSearchResult[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lon: number } | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const loadSavedPlaces = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('saved_places')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error loading saved places:', error);
        // Create table if it doesn't exist
        if (error.code === '42P01') {
          await createSavedPlacesTable();
        }
      } else if (data) {
        const transformedPlaces: SavedPlace[] = data.map((place: any) => ({
          id: place.id,
          name: place.name,
          address: place.address,
          type: (place.type as 'home' | 'work' | 'favorite') || 'favorite',
          latitude: place.latitude || undefined,
          longitude: place.longitude || undefined,
        }));
        setPlaces(transformedPlaces);
      }
    } catch (error) {
      console.error('Error loading saved places:', error);
    }
  }, [user]);

  useEffect(() => {
    loadSavedPlaces();
  }, [loadSavedPlaces]);

  const createSavedPlacesTable = async () => {
    try {
      // This would normally be done in Supabase dashboard
      console.log('Table does not exist. Please create saved_places table in Supabase.');
    } catch (error) {
      console.error('Error creating table:', error);
    }
  };

  const handleAddPlace = () => {
    setShowAddModal(true);
    setNewPlaceName('');
    setNewPlaceAddress('');
    setNewPlaceType('favorite');
    setSearchResults([]);
    setSelectedLocation(null);
  };

  const searchPlaces = async (query: string) => {
    if (query.length < 3) {
      setSearchResults([]);
      return;
    }

    setSearchingPlaces(true);
    try {
      // Using Nominatim API for place search (OpenStreetMap)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`,
        {
          headers: {
            'User-Agent': 'PulseApp/1.0' // Required by Nominatim
          }
        }
      );
      
      if (!response.ok) {
        console.error('Error fetching places:', response.status);
        setSearchResults([]);
        return;
      }
      
      const text = await response.text();
      
      try {
        const data = JSON.parse(text);
        if (Array.isArray(data)) {
          setSearchResults(data);
        } else {
          console.error('Invalid response format from Nominatim');
          setSearchResults([]);
        }
      } catch (parseError) {
        console.error('Error parsing JSON response:', parseError);
        console.error('Response text:', text);
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Error searching places:', error);
      setSearchResults([]);
    } finally {
      setSearchingPlaces(false);
    }
  };

  const handleAddressChange = (text: string) => {
    setNewPlaceAddress(text);
    
    // Debounce search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      searchPlaces(text);
    }, 500) as unknown as NodeJS.Timeout;
  };

  const selectSearchResult = (result: PlaceSearchResult) => {
    setNewPlaceAddress(result.display_name);
    setSelectedLocation({ lat: parseFloat(result.lat), lon: parseFloat(result.lon) });
    setSearchResults([]);
  };

  const saveNewPlace = async () => {
    if (!newPlaceName.trim()) {
      Alert.alert('Error', 'Please enter a place name');
      return;
    }
    
    if (!newPlaceAddress.trim()) {
      Alert.alert('Error', 'Please enter or search for an address');
      return;
    }

    if (!user) return;

    try {
      const placeData = {
        user_id: user.id,
        name: newPlaceName.trim(),
        address: newPlaceAddress.trim(),
        type: newPlaceType,
        latitude: selectedLocation?.lat || undefined,
        longitude: selectedLocation?.lon || undefined,
      };

      const { data, error } = await supabase
        .from('saved_places')
        .insert(placeData as any)
        .select()
        .single();

      if (error) {
        console.error('Error adding place:', error);
        Alert.alert('Error', 'Failed to add place');
      } else if (data) {
        const newPlace: SavedPlace = {
          id: (data as any).id,
          name: (data as any).name,
          address: (data as any).address,
          type: ((data as any).type as 'home' | 'work' | 'favorite') || 'favorite',
          latitude: (data as any).latitude || undefined,
          longitude: (data as any).longitude || undefined,
        };
        setPlaces([...places, newPlace]);
        setShowAddModal(false);
        Alert.alert('Success', 'Place added successfully');
      }
    } catch (error) {
      console.error('Error adding place:', error);
      Alert.alert('Error', 'Failed to add place');
    }
  };



  const handleEditPlace = async (place: SavedPlace) => {
    Alert.alert(
      'Edit Place',
      `Current name: ${place.name}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Update Name',
          onPress: async () => {
            // For demonstration, append "(edited)" to the name
            const newName = place.name + ' (edited)';
            
            try {
              const { error } = await (supabase
                .from('saved_places') as any)
                .update({ name: newName })
                .eq('id', place.id);
              
              if (error) {
                console.error('Error updating place:', error);
                Alert.alert('Error', 'Failed to update place');
              } else {
                setPlaces(places.map(p => 
                  p.id === place.id ? { ...p, name: newName } : p
                ));
                Alert.alert('Success', 'Place updated successfully');
              }
            } catch (error) {
              console.error('Error updating place:', error);
              Alert.alert('Error', 'Failed to update place');
            }
          },
        },
      ]
    );
  };

  const handleDeletePlace = async (id: string) => {
    Alert.alert(
      'Delete Place',
      'Are you sure you want to remove this saved place?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('saved_places')
                .delete()
                .eq('id', id);
              
              if (error) {
                console.error('Error deleting place:', error);
                Alert.alert('Error', 'Failed to delete place');
              } else {
                setPlaces(places.filter(p => p.id !== id));
                Alert.alert('Success', 'Place removed');
              }
            } catch (error) {
              console.error('Error deleting place:', error);
              Alert.alert('Error', 'Failed to delete place');
            }
          },
        },
      ]
    );
  };

  const getPlaceIcon = (type: string) => {
    switch (type) {
      case 'home':
        return <Home size={20} color="#4CAF50" />;
      case 'work':
        return <Briefcase size={20} color="#2196F3" />;
      default:
        return <Heart size={20} color="#FF5722" />;
    }
  };

  const filteredPlaces = places.filter(place =>
    place.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    place.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Saved Places</Text>
        <TouchableOpacity onPress={handleAddPlace} style={styles.addButton}>
          <Plus size={24} color="#4CAF50" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <MapPin size={20} color="#999" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search saved places..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
        />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {filteredPlaces.length === 0 ? (
          <View style={styles.emptyState}>
            <MapPin size={48} color="#ccc" />
            <Text style={styles.emptyText}>
              {searchQuery ? 'No places found' : 'No saved places yet'}
            </Text>
            {!searchQuery && (
              <TouchableOpacity style={styles.addFirstButton} onPress={handleAddPlace}>
                <Text style={styles.addFirstText}>Add Your First Place</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.placesList}>
            {filteredPlaces.map((place) => (
              <View key={place.id} style={styles.placeCard}>
                <View style={styles.placeIcon}>
                  {getPlaceIcon(place.type)}
                </View>
                <View style={styles.placeInfo}>
                  <Text style={styles.placeName}>{place.name}</Text>
                  <Text style={styles.placeAddress} numberOfLines={2}>
                    {place.address}
                  </Text>
                </View>
                <View style={styles.placeActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleEditPlace(place)}
                  >
                    <Edit2 size={18} color="#666" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleDeletePlace(place.id)}
                  >
                    <Trash2 size={18} color="#ff4444" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={styles.tipSection}>
          <Text style={styles.tipTitle}>Quick Tip</Text>
          <Text style={styles.tipText}>
            Save your frequently visited places for quick access during emergencies. You can add home, work, or any favorite locations.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>

    {/* Add Place Modal */}
    <Modal
      visible={showAddModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowAddModal(false)}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add New Place</Text>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <X size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Place Name</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g., Home, Office, Gym"
                value={newPlaceName}
                onChangeText={setNewPlaceName}
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Address</Text>
              <View style={styles.searchInputContainer}>
                <Search size={20} color="#999" style={styles.searchIcon} />
                <TextInput
                  style={[styles.modalInput, styles.searchInputModal]}
                  placeholder="Search for an address..."
                  value={newPlaceAddress}
                  onChangeText={handleAddressChange}
                  placeholderTextColor="#999"
                />
              </View>
              
              {searchingPlaces && (
                <ActivityIndicator size="small" color="#4CAF50" style={styles.searchLoader} />
              )}
              
              {searchResults.length > 0 && (
                <ScrollView style={styles.searchResults}>
                  {searchResults.map((result) => (
                    <TouchableOpacity
                      key={result.place_id}
                      style={styles.searchResultItem}
                      onPress={() => selectSearchResult(result)}
                    >
                      <MapPin size={16} color="#666" />
                      <Text style={styles.searchResultText} numberOfLines={2}>
                        {result.display_name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Type</Text>
              <View style={styles.typeSelector}>
                {(['home', 'work', 'favorite'] as const).map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeOption,
                      newPlaceType === type && styles.typeOptionSelected,
                    ]}
                    onPress={() => setNewPlaceType(type)}
                  >
                    {type === 'home' && <Home size={20} color={newPlaceType === type ? '#fff' : '#666'} />}
                    {type === 'work' && <Briefcase size={20} color={newPlaceType === type ? '#fff' : '#666'} />}
                    {type === 'favorite' && <Heart size={20} color={newPlaceType === type ? '#fff' : '#666'} />}
                    <Text style={[
                      styles.typeOptionText,
                      newPlaceType === type && styles.typeOptionTextSelected,
                    ]}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => setShowAddModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.saveButton]}
              onPress={saveNewPlace}
            >
              <Text style={styles.saveButtonText}>Save Place</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
    </>
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 15,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: '#333',
  },
  content: {
    flex: 1,
  },
  placesList: {
    paddingHorizontal: 15,
  },
  placeCard: {
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
  placeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  placeInfo: {
    flex: 1,
  },
  placeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  placeAddress: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
  placeActions: {
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
  tipSection: {
    margin: 15,
    padding: 15,
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1976d2',
    marginBottom: 5,
  },
  tipText: {
    fontSize: 13,
    color: '#1976d2',
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  modalBody: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  searchInputContainer: {
    position: 'relative',
  },
  searchIcon: {
    position: 'absolute',
    left: 12,
    top: 12,
    zIndex: 1,
  },
  searchInputModal: {
    paddingLeft: 40,
  },
  searchLoader: {
    marginTop: 8,
  },
  searchResults: {
    maxHeight: 150,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    gap: 8,
  },
  searchResultText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 10,
  },
  typeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    gap: 6,
  },
  typeOptionSelected: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  typeOptionText: {
    fontSize: 14,
    color: '#666',
  },
  typeOptionTextSelected: {
    color: '#fff',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
