import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Platform, Dimensions, Animated, PanResponder, Alert as RNAlert } from 'react-native';
import { Users, RotateCcw } from 'lucide-react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface Alert {
  id: string;
  alert_type: string;
  location: {
    latitude: number;
    longitude: number;
  };
  reportType: 'vibe' | 'event' | 'sos';
  description?: string;
  timestamp?: string;
}

interface NearbyUser {
  id: string;
  location: {
    latitude: number;
    longitude: number;
  };
  role: string;
  isResponder: boolean;
}

interface MapViewProps {
  location: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  alerts: Alert[];
  nearbyUsers: NearbyUser[];
  onMapPress: (coordinate: { lat: number; lng: number }) => void;
  onAlertPress?: (alert: Alert) => void;
  focusLocation?: {
    latitude: number;
    longitude: number;
  };
  followUserLocation?: boolean;
  onFollowUserChange?: (follow: boolean) => void;
}

// Simplified Web Map Component
function WebMapView({ location, alerts, nearbyUsers, onMapPress, onAlertPress, focusLocation, followUserLocation, onFollowUserChange }: MapViewProps) {
  // Use the fallback map view for web
  return <FallbackMobileMapView 
    location={location} 
    alerts={alerts} 
    nearbyUsers={nearbyUsers} 
    onMapPress={onMapPress} 
    onAlertPress={onAlertPress} 
    focusLocation={focusLocation} 
    followUserLocation={followUserLocation} 
    onFollowUserChange={onFollowUserChange} 
  />;
}



// Native Map Component using react-native-maps
function NativeMapComponent({ location, alerts, nearbyUsers, onMapPress, onAlertPress, focusLocation, followUserLocation, onFollowUserChange }: MapViewProps) {
  const [MapComponents, setMapComponents] = useState<any>(null);
  const [isMapLoading, setIsMapLoading] = useState(true);
  const mapRef = useRef<any>(null);
  const [region, setRegion] = useState({
    latitude: location.latitude,
    longitude: location.longitude,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });

  useEffect(() => {
    // Only load react-native-maps on native platforms
    if (Platform.OS !== 'web') {
      import('react-native-maps')
        .then((RNMaps) => {
          setMapComponents({
            MapView: RNMaps.default,
            Marker: RNMaps.Marker,
            Circle: RNMaps.Circle,
            PROVIDER_DEFAULT: RNMaps.PROVIDER_DEFAULT,
            PROVIDER_GOOGLE: RNMaps.PROVIDER_GOOGLE,
          });
          setIsMapLoading(false);
        })
        .catch((error) => {
          console.log('Failed to load react-native-maps:', error);
          setIsMapLoading(false);
        });
    } else {
      setIsMapLoading(false);
    }
  }, []);

  useEffect(() => {
    if (followUserLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 1000);
    }
  }, [location, followUserLocation]);

  useEffect(() => {
    if (focusLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: focusLocation.latitude,
        longitude: focusLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 1000);
    }
  }, [focusLocation]);

  const getMarkerColor = (alert: Alert) => {
    if (alert.reportType === 'vibe') {
      const vibeColors: Record<string, string> = {
        dangerous: '#F44336',
        suspicious: '#FFD700',
        crowded: '#FFC107',
        calm: '#2196F3',
        safe: '#9C27B0',
        lgbtqia: '#FF69B4',
      };
      return vibeColors[alert.alert_type] || '#4CAF50';
    }
    return alert.reportType === 'sos' ? '#ff4757' : '#FF9800';
  };

  const getVibeEmoji = (alertType: string) => {
    const vibeEmojis: Record<string, string> = {
      dangerous: '⚠️',
      suspicious: '👁️',
      crowded: '👥',
      calm: '😌',
      safe: '✅',
      lgbtqia: '🏳️‍🌈',
    };
    return vibeEmojis[alertType] || '📍';
  };

  if (isMapLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading map...</Text>
      </View>
    );
  }

  if (!MapComponents || !MapComponents.MapView) {
    return <FallbackMobileMapView 
      location={location} 
      alerts={alerts} 
      nearbyUsers={nearbyUsers} 
      onMapPress={onMapPress} 
      onAlertPress={onAlertPress} 
      focusLocation={focusLocation} 
      followUserLocation={followUserLocation} 
      onFollowUserChange={onFollowUserChange} 
    />;
  }

  const { MapView, Marker, Circle, PROVIDER_DEFAULT, PROVIDER_GOOGLE } = MapComponents;

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
        initialRegion={region}
        showsUserLocation={true}
        showsMyLocationButton={false}
        showsCompass={false}
        followsUserLocation={followUserLocation}
        onRegionChangeComplete={(newRegion: any) => {
          setRegion(newRegion);
          if (onFollowUserChange) {
            onFollowUserChange(false);
          }
        }}
        onPress={(e: any) => {
          const coordinate = e.nativeEvent.coordinate;
          onMapPress({ lat: coordinate.latitude, lng: coordinate.longitude });
        }}
      >
        {/* User location marker with accuracy circle */}
        <Marker
          coordinate={{
            latitude: location.latitude,
            longitude: location.longitude,
          }}
          title="Your Location"
          pinColor="#2196F3"
        />
        {location.accuracy && (
          <Circle
            center={{
              latitude: location.latitude,
              longitude: location.longitude,
            }}
            radius={location.accuracy}
            fillColor="rgba(33, 150, 243, 0.1)"
            strokeColor="rgba(33, 150, 243, 0.3)"
            strokeWidth={1}
          />
        )}

        {/* Alert markers */}
        {alerts.map((alert) => (
          <React.Fragment key={alert.id}>
            {alert.reportType === 'vibe' && (
              <Circle
                center={{
                  latitude: alert.location.latitude,
                  longitude: alert.location.longitude,
                }}
                radius={100}
                fillColor={`${getMarkerColor(alert)}30`}
                strokeColor={`${getMarkerColor(alert)}60`}
                strokeWidth={2}
              />
            )}
            <Marker
              coordinate={{
                latitude: alert.location.latitude,
                longitude: alert.location.longitude,
              }}
              onPress={() => onAlertPress && onAlertPress(alert)}
            >
              <View style={[
                alert.reportType === 'vibe' ? styles.vibeMarker : styles.alertMarker,
                { backgroundColor: getMarkerColor(alert) }
              ]}>
                <Text style={styles.markerEmoji}>
                  {alert.reportType === 'sos' ? '🆘' :
                   alert.reportType === 'event' ? '⚠️' :
                   getVibeEmoji(alert.alert_type)}
                </Text>
              </View>
            </Marker>
          </React.Fragment>
        ))}

        {/* Nearby user markers */}
        {nearbyUsers.map((user) => (
          <Marker
            key={user.id}
            coordinate={{
              latitude: user.location.latitude,
              longitude: user.location.longitude,
            }}
            title={user.role}
            description={user.isResponder ? 'Responder' : 'User'}
          >
            <View style={[
              styles.userMarker,
              { backgroundColor: user.isResponder ? '#ff4757' : '#2196F3' }
            ]}>
              <Users size={10} color="#ffffff" />
            </View>
          </Marker>
        ))}
      </MapView>
    </View>
  );
}

// Fallback for when react-native-maps is not available
function FallbackMobileMapView({ location, alerts, nearbyUsers, onMapPress, onAlertPress, focusLocation }: MapViewProps) {
  const [, setSelectedMarker] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const panValue = useRef(new Animated.ValueXY()).current;
  const scaleValue = useRef(new Animated.Value(1)).current;
  const mapCenterX = screenWidth / 2;
  const mapCenterY = screenHeight / 2;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5;
      },
      onPanResponderGrant: () => {
        const currentX = (panValue.x as any)._value || 0;
        const currentY = (panValue.y as any)._value || 0;
        panValue.setOffset({
          x: currentX,
          y: currentY,
        });
      },
      onPanResponderMove: Animated.event(
        [null, { dx: panValue.x, dy: panValue.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: (evt, gestureState) => {
        panValue.flattenOffset();
        // Handle tap to add marker
        if (Math.abs(gestureState.dx) < 10 && Math.abs(gestureState.dy) < 10) {
          const { locationX, locationY } = evt.nativeEvent;
          // Convert screen coordinates to lat/lng (simplified)
          const offsetX = (locationX - mapCenterX) / zoom;
          const offsetY = (locationY - mapCenterY) / zoom;
          const lat = location.latitude + (offsetY * 0.0001);
          const lng = location.longitude + (offsetX * 0.0001);
          onMapPress({ lat, lng });
        }
      },
    })
  ).current;

  const getMarkerColor = (alert: Alert) => {
    if (alert.reportType === 'vibe') {
      const vibeColors: Record<string, string> = {
        dangerous: '#F44336',
        suspicious: '#FFD700',
        crowded: '#FFC107',
        calm: '#2196F3',
        safe: '#9C27B0',
        lgbtqia: '#FF69B4',
      };
      return vibeColors[alert.alert_type] || '#4CAF50';
    }
    return alert.reportType === 'sos' ? '#ff4757' : '#FF9800';
  };

  const handleMarkerPress = (alert: Alert) => {
    setSelectedMarker(alert.id);
    if (onAlertPress) {
      onAlertPress(alert);
    } else {
      RNAlert.alert(
        `${alert.reportType.toUpperCase()} Alert`,
        alert.description || `${alert.alert_type} reported at this location`,
        [{ text: 'OK', onPress: () => setSelectedMarker(null) }]
      );
    }
  };

  const handleUserMarkerPress = (user: NearbyUser) => {
    RNAlert.alert(
      'Nearby User',
      `${user.role}${user.isResponder ? ' (Responder)' : ''}`,
      [{ text: 'OK' }]
    );
  };

  const handleReset = () => {
    setZoom(1);
    Animated.parallel([
      Animated.spring(panValue, {
        toValue: { x: 0, y: 0 },
        useNativeDriver: false,
      }),
      Animated.spring(scaleValue, {
        toValue: 1,
        useNativeDriver: false,
      }),
    ]).start();
  };

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.mapContainer,
          {
            transform: [
              { translateX: panValue.x },
              { translateY: panValue.y },
              { scale: scaleValue },
            ],
          },
        ]}
        {...panResponder.panHandlers}
      >
        {/* Map background with grid pattern */}
        <View style={styles.mapBackground}>
          {/* Grid lines */}
          {Array.from({ length: 20 }).map((_, i) => (
            <View key={`v-${i}`} style={[styles.gridLine, styles.verticalLine, { left: `${i * 5}%` }]} />
          ))}
          {Array.from({ length: 20 }).map((_, i) => (
            <View key={`h-${i}`} style={[styles.gridLine, styles.horizontalLine, { top: `${i * 5}%` }]} />
          ))}
        </View>

        {/* User location indicator */}
        <View style={[styles.userLocationWeb, {
          left: '50%',
          top: '50%',
          marginLeft: -10,
          marginTop: -10,
        }]}>
          <View style={styles.userLocationInner} />
          <Animated.View style={[styles.locationPulse, {
            transform: [{ scale: scaleValue }],
          }]} />
        </View>

        {/* Alert markers and vibes */}
        {alerts.slice(0, 8).map((alert, index) => {
          const angle = (index * 45) * (Math.PI / 180);
          const radius = 80 + (index % 3) * 30;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;
          
          const vibeEmojis: Record<string, string> = {
            dangerous: '⚠️',
            suspicious: '👁️',
            crowded: '👥',
            calm: '😌',
            safe: '✅',
            lgbtqia: '🏳️‍🌈',
          };
          
          if (alert.reportType === 'vibe') {
            // Render vibe as both heat circle and icon
            return (
              <View key={alert.id}>
                <Animated.View
                  style={[
                    styles.vibeHeatCircle,
                    {
                      left: `50%`,
                      top: `50%`,
                      marginLeft: x - 60,
                      marginTop: y - 60,
                      backgroundColor: getMarkerColor(alert),
                      opacity: 0.3,
                    },
                  ]}
                >
                  <Animated.View style={[styles.vibeHeatInner, { backgroundColor: getMarkerColor(alert) }]} />
                  <Animated.View style={[styles.vibeHeatCore, { backgroundColor: getMarkerColor(alert) }]} />
                </Animated.View>
                <TouchableOpacity
                  style={[
                    styles.vibeMarkerWeb,
                    {
                      left: `50%`,
                      top: `50%`,
                      marginLeft: x - 14,
                      marginTop: y - 14,
                      backgroundColor: getMarkerColor(alert),
                    },
                  ]}
                  onPress={() => handleMarkerPress(alert)}
                >
                  <Text style={styles.markerText}>
                    {vibeEmojis[alert.alert_type] || '📍'}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          } else {
            // Render event/SOS as icon
            return (
              <TouchableOpacity
                key={alert.id}
                style={[
                  styles.alertMarkerWeb,
                  {
                    left: `50%`,
                    top: `50%`,
                    marginLeft: x - 16,
                    marginTop: y - 16,
                    backgroundColor: getMarkerColor(alert),
                  },
                ]}
                onPress={() => handleMarkerPress(alert)}
              >
                <Text style={styles.markerText}>
                  {alert.reportType === 'sos' ? '🆘' : '⚠️'}
                </Text>
              </TouchableOpacity>
            );
          }
        })}

        {/* Nearby user markers */}
        {nearbyUsers.slice(0, 5).map((user, index) => {
          const angle = (index * 72 + 36) * (Math.PI / 180);
          const radius = 60 + (index % 2) * 20;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;
          
          return (
            <TouchableOpacity
              key={user.id}
              style={[
                styles.userMarkerWeb,
                {
                  left: `50%`,
                  top: `50%`,
                  marginLeft: x - 8,
                  marginTop: y - 8,
                  backgroundColor: user.isResponder ? '#ff4757' : '#2196F3',
                },
              ]}
              onPress={() => handleUserMarkerPress(user)}
            >
              <Users size={10} color="#ffffff" />
            </TouchableOpacity>
          );
        })}
      </Animated.View>

      {/* Map controls - Reset only */}
      <View style={styles.mapControls}>
        <TouchableOpacity style={styles.controlButton} onPress={handleReset}>
          <RotateCcw size={20} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Map info */}
      <View style={styles.mapInfo}>
        <Text style={styles.mapInfoText}>Interactive Map</Text>
        <Text style={styles.mapInfoSubtext}>Drag to pan • Tap markers for details</Text>
      </View>
      
      {/* Map legend */}
      <View style={styles.legend}>
        <Text style={styles.legendTitle}>Map Legend</Text>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#ff4757' }]} />
          <Text style={styles.legendText}>SOS Alerts</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#FF9800' }]} />
          <Text style={styles.legendText}>Events</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#4CAF50' }]} />
          <Text style={styles.legendText}>Vibes</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#2196F3' }]} />
          <Text style={styles.legendText}>Users</Text>
        </View>
      </View>
    </View>
  );
}

export function HyperMapView({ location, alerts, nearbyUsers, onMapPress, onAlertPress, focusLocation, followUserLocation, onFollowUserChange }: MapViewProps) {
  // Always use fallback on web or when react-native-maps is not available
  if (Platform.OS === 'web') {
    return <FallbackMobileMapView 
      location={location} 
      alerts={alerts} 
      nearbyUsers={nearbyUsers} 
      onMapPress={onMapPress} 
      onAlertPress={onAlertPress} 
      focusLocation={focusLocation} 
      followUserLocation={followUserLocation} 
      onFollowUserChange={onFollowUserChange} 
    />;
  }
  
  // On mobile, try to use native map component which will handle its own fallback
  return <NativeMapComponent 
    location={location} 
    alerts={alerts} 
    nearbyUsers={nearbyUsers} 
    onMapPress={onMapPress} 
    onAlertPress={onAlertPress} 
    focusLocation={focusLocation} 
    followUserLocation={followUserLocation} 
    onFollowUserChange={onFollowUserChange} 
  />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d1421',
  },
  map: {
    flex: 1,
  },
  alertMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#ffffff',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  vibeMarker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  userMarker: {
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ffffff',
  },
  markerEmoji: {
    fontSize: 14,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  mapBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0d1421',
  },
  gridLine: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  verticalLine: {
    width: 1,
    height: '100%',
  },
  horizontalLine: {
    height: 1,
    width: '100%',
  },
  mapControls: {
    position: 'absolute',
    bottom: 200,
    right: 16,
    gap: 8,
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(26, 26, 46, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  mapInfo: {
    position: 'absolute',
    top: 60,
    left: 16,
    backgroundColor: 'rgba(26, 26, 46, 0.9)',
    borderRadius: 12,
    padding: 12,
    maxWidth: 200,
  },
  mapInfoText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  mapInfoSubtext: {
    color: '#8e8e93',
    fontSize: 10,
    lineHeight: 14,
  },
  radiusCircle: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 2,
    borderColor: 'rgba(255, 71, 87, 0.3)',
    backgroundColor: 'rgba(255, 71, 87, 0.05)',
  },
  userLocationWeb: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#ffffff',
    shadowColor: '#2196F3',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 5,
    zIndex: 10,
  },
  userLocationInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ffffff',
  },
  locationPulse: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(33, 150, 243, 0.2)',
    top: -10,
    left: -10,
  },
  alertMarkerWeb: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#ffffff',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 5,
  },
  vibeHeatCircle: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  vibeHeatInner: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    opacity: 0.4,
  },
  vibeHeatCore: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    opacity: 0.6,
  },
  vibeMarkerWeb: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 10,
  },
  userMarkerWeb: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ffffff',
    zIndex: 5,
  },
  markerText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  legend: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    backgroundColor: 'rgba(26, 26, 46, 0.9)',
    borderRadius: 12,
    padding: 12,
    minWidth: 120,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  legendTitle: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    color: '#8e8e93',
    fontSize: 10,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(13, 20, 33, 0.8)',
    zIndex: 1000,
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },

});
