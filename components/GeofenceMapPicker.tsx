import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Map, Navigation } from 'lucide-react-native';

interface MapLocation {
  latitude: number;
  longitude: number;
}

interface GeofenceMapPickerProps {
  mapRef: any;
  mapRegion: any;
  handleMapPress: (event: any) => void;
  selectedLocation: MapLocation | null;
  formData: any;
  centerMapOnLocation: () => void;
}

// Web Map Component
const WebMapPicker = ({ selectedLocation, onLocationSelect, radius, initialRegion }: any) => {
  const [inputLat, setInputLat] = useState(
    selectedLocation?.latitude?.toFixed(6) || initialRegion.latitude.toFixed(6)
  );
  const [inputLng, setInputLng] = useState(
    selectedLocation?.longitude?.toFixed(6) || initialRegion.longitude.toFixed(6)
  );

  const handleInputUpdate = () => {
    const lat = parseFloat(inputLat);
    const lng = parseFloat(inputLng);
    if (!isNaN(lat) && !isNaN(lng)) {
      onLocationSelect({ latitude: lat, longitude: lng });
    }
  };

  useEffect(() => {
    if (selectedLocation) {
      setInputLat(selectedLocation.latitude.toFixed(6));
      setInputLng(selectedLocation.longitude.toFixed(6));
    }
  }, [selectedLocation]);

  return (
    <View style={styles.webMapContainer}>
      <View style={styles.webMapContent}>
        <Map size={48} color="#007AFF" />
        <Text style={styles.webMapTitle}>Set Geofence Location</Text>
        
        <View style={styles.webInputGroup}>
          <Text style={styles.webInputLabel}>Latitude</Text>
          <TextInput
            style={styles.webCoordInput}
            value={inputLat}
            onChangeText={setInputLat}
            onBlur={handleInputUpdate}
            keyboardType="numeric"
            placeholder="37.78825"
          />
        </View>

        <View style={styles.webInputGroup}>
          <Text style={styles.webInputLabel}>Longitude</Text>
          <TextInput
            style={styles.webCoordInput}
            value={inputLng}
            onChangeText={setInputLng}
            onBlur={handleInputUpdate}
            keyboardType="numeric"
            placeholder="-122.4324"
          />
        </View>

        <View style={styles.webRadiusInfo}>
          <View style={styles.webRadiusCircle}>
            <Text style={styles.webRadiusText}>{radius}m</Text>
          </View>
          <Text style={styles.webRadiusLabel}>Geofence Radius</Text>
        </View>

        <TouchableOpacity 
          style={styles.webUseCurrentButton}
          onPress={() => {
            if (Platform.OS === 'web' && navigator.geolocation) {
              navigator.geolocation.getCurrentPosition(
                (position) => {
                  onLocationSelect({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                  });
                },
                (error) => {
                  console.log('Location error:', error);
                }
              );
            }
          }}
        >
          <Navigation size={20} color="#007AFF" />
          <Text style={styles.webUseCurrentText}>Use Current Location</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Native Map Component
const NativeMapView = ({ mapRef, mapRegion, handleMapPress, selectedLocation, formData, centerMapOnLocation }: any) => {
  const [MapComponents, setMapComponents] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Dynamically load react-native-maps only on native platforms
    const loadMaps = async () => {
      if (Platform.OS !== 'web') {
        try {
          const RNMaps = await import('react-native-maps');
          setMapComponents({
            MapView: RNMaps.default,
            Marker: RNMaps.Marker,
            Circle: RNMaps.Circle,
            PROVIDER_DEFAULT: RNMaps.PROVIDER_DEFAULT,
            PROVIDER_GOOGLE: RNMaps.PROVIDER_GOOGLE,
          });
        } catch (error) {
          console.log('react-native-maps not available:', error);
        }
      }
      setIsLoading(false);
    };
    loadMaps();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading map...</Text>
      </View>
    );
  }

  if (!MapComponents || !MapComponents.MapView) {
    // Fallback to web picker if maps not available
    return (
      <WebMapPicker
        selectedLocation={selectedLocation}
        onLocationSelect={(location: MapLocation) => {
          handleMapPress({ nativeEvent: { coordinate: location } });
        }}
        radius={parseInt(formData.radius_meters) || 100}
        initialRegion={mapRegion}
      />
    );
  }

  const { MapView, Marker, Circle, PROVIDER_DEFAULT, PROVIDER_GOOGLE } = MapComponents;

  return (
    <>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={Platform.OS === 'ios' ? PROVIDER_DEFAULT : PROVIDER_GOOGLE}
        initialRegion={mapRegion}
        onPress={handleMapPress}
        showsUserLocation
        showsMyLocationButton={false}
      >
        {selectedLocation && (
          <>
            <Marker
              coordinate={selectedLocation}
              draggable
              onDragEnd={handleMapPress}
            />
            <Circle
              center={selectedLocation}
              radius={parseInt(formData.radius_meters) || 100}
              fillColor="rgba(0, 122, 255, 0.1)"
              strokeColor="rgba(0, 122, 255, 0.3)"
              strokeWidth={2}
            />
          </>
        )}
      </MapView>
      <View style={styles.mapControls}>
        <View style={styles.radiusControl}>
          <Text style={styles.radiusLabel}>Radius: {formData.radius_meters}m</Text>
          <View style={styles.radiusButtons}>
            <TouchableOpacity 
              style={styles.radiusButton}
              onPress={() => {
                const newRadius = Math.max(50, parseInt(formData.radius_meters) - 50);
                formData.setFormData((prev: any) => ({ ...prev, radius_meters: newRadius.toString() }));
              }}
            >
              <Text style={styles.radiusButtonText}>-</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.radiusButton}
              onPress={() => {
                const newRadius = Math.min(5000, parseInt(formData.radius_meters) + 50);
                formData.setFormData((prev: any) => ({ ...prev, radius_meters: newRadius.toString() }));
              }}
            >
              <Text style={styles.radiusButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {selectedLocation && (
          <View style={styles.coordinatesDisplay}>
            <Text style={styles.coordinatesText}>
              {selectedLocation.latitude.toFixed(6)}, {selectedLocation.longitude.toFixed(6)}
            </Text>
          </View>
        )}

        <TouchableOpacity 
          style={styles.centerButton}
          onPress={centerMapOnLocation}
        >
          <Navigation size={20} color="#007AFF" />
          <Text style={styles.centerButtonText}>My Location</Text>
        </TouchableOpacity>
      </View>
    </>
  );
};

export default function GeofenceMapPicker(props: GeofenceMapPickerProps) {
  const { mapRef, mapRegion, handleMapPress, selectedLocation, formData, centerMapOnLocation } = props;

  if (Platform.OS === 'web') {
    return (
      <WebMapPicker
        selectedLocation={selectedLocation}
        onLocationSelect={(location: MapLocation) => {
          handleMapPress({ nativeEvent: { coordinate: location } });
        }}
        radius={parseInt(formData.radius_meters) || 100}
        initialRegion={mapRegion}
      />
    );
  }

  return (
    <NativeMapView
      mapRef={mapRef}
      mapRegion={mapRegion}
      handleMapPress={handleMapPress}
      selectedLocation={selectedLocation}
      formData={formData}
      centerMapOnLocation={centerMapOnLocation}
    />
  );
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2F2F7',
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 16,
    color: '#000',
  },
  mapControls: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    right: 16,
    gap: 12,
  },
  radiusControl: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 8,
  },
  radiusLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  radiusButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  radiusButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radiusButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
  },
  coordinatesDisplay: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 8,
  },
  coordinatesText: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#666',
  },
  centerButton: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  centerButtonText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  webMapContainer: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  webMapContent: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  webMapTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 24,
  },
  webInputGroup: {
    width: '100%',
    marginBottom: 16,
  },
  webInputLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    color: '#333',
  },
  webCoordInput: {
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    width: '100%',
  },
  webRadiusInfo: {
    alignItems: 'center',
    marginVertical: 20,
  },
  webRadiusCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderWidth: 2,
    borderColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  webRadiusText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#007AFF',
  },
  webRadiusLabel: {
    fontSize: 14,
    color: '#666',
  },
  webUseCurrentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#E5F4FF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  webUseCurrentText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
});
