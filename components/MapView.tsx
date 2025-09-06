import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Text, Alert as RNAlert, TouchableOpacity, PanResponder, Animated, Platform, Dimensions } from 'react-native';
import { Users, ZoomIn, ZoomOut, RotateCcw, MapPin } from 'lucide-react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface Alert {
  id: string;
  type: string;
  location: {
    latitude: number;
    longitude: number;
  };
  reportType: 'vibe' | 'event' | 'sos';
  description?: string;
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
  };
  alerts: Alert[];
  nearbyUsers: NearbyUser[];
  onMapPress: (coordinate: { lat: number; lng: number }) => void;
}

// Web Map Component using OpenStreetMap tiles
function WebMapView({ location, alerts, nearbyUsers, onMapPress }: MapViewProps) {
  const zoom = 13;
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);

  useEffect(() => {
    if (Platform.OS === 'web') {
      // Load Leaflet dynamically for web
      const loadLeaflet = async () => {
        try {
          const L = await import('leaflet');
          
          // Add CSS
          if (typeof document !== 'undefined' && !document.querySelector('link[href*="leaflet.css"]')) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
            document.head.appendChild(link);
          }

          // Initialize map only once
          if (mapRef.current && !leafletMapRef.current) {
            const map = L.map(mapRef.current, {
              center: [location.latitude, location.longitude],
              zoom: zoom,
              zoomControl: true,
              scrollWheelZoom: true,
              doubleClickZoom: true,
              dragging: true,
              touchZoom: true,
              boxZoom: true,
              keyboard: true
            });
            
            leafletMapRef.current = map;
            
            // Add OpenStreetMap tiles with better mobile support
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              attribution: '© OpenStreetMap contributors',
              maxZoom: 19,
              tileSize: 256,
              zoomOffset: 0
            }).addTo(map);

            // Add user location marker
            const userIcon = L.divIcon({
              className: 'user-location-marker',
              html: '<div style="width: 20px; height: 20px; background: #2196F3; border: 3px solid white; border-radius: 50%; box-shadow: 0 0 10px rgba(33, 150, 243, 0.5); z-index: 1000;"></div>',
              iconSize: [20, 20],
              iconAnchor: [10, 10]
            });
            L.marker([location.latitude, location.longitude], { icon: userIcon }).addTo(map);

            // Add 10km radius circle
            L.circle([location.latitude, location.longitude], {
              color: '#ff4757',
              fillColor: '#ff4757',
              fillOpacity: 0.1,
              radius: 10000,
              weight: 2
            }).addTo(map);

            // Handle map clicks
            map.on('click', (e: any) => {
              onMapPress({ lat: e.latlng.lat, lng: e.latlng.lng });
            });

            // Force map to resize after initialization
            setTimeout(() => {
              map.invalidateSize();
              setMapLoaded(true);
            }, 100);
          }
        } catch (error) {
          console.error('Failed to load Leaflet:', error);
          setMapLoaded(true); // Show fallback
        }
      };

      loadLeaflet();
    }
  }, [location.latitude, location.longitude, zoom, onMapPress]);

  // Update markers when data changes
  useEffect(() => {
    if (Platform.OS === 'web' && leafletMapRef.current && mapLoaded) {
      const updateMarkers = async () => {
        try {
          const L = await import('leaflet');
          const map = leafletMapRef.current;
          
          // Clear existing markers (except user location and radius)
          map.eachLayer((layer: any) => {
            if (layer.options && (layer.options.className === 'alert-marker' || layer.options.className === 'user-marker')) {
              map.removeLayer(layer);
            }
          });

          // Add alert markers
          alerts.forEach((alert) => {
            const color = alert.reportType === 'sos' ? '#ff4757' : 
                        alert.reportType === 'event' ? '#FF9800' : '#4CAF50';
            const emoji = alert.reportType === 'sos' ? '🆘' : 
                         alert.reportType === 'event' ? '⚠️' : '💚';
            
            const alertIcon = L.divIcon({
              className: 'alert-marker',
              html: `<div style="width: 24px; height: 24px; background: ${color}; border: 2px solid white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">${emoji}</div>`,
              iconSize: [24, 24],
              iconAnchor: [12, 12]
            });
            
            L.marker([alert.location.latitude, alert.location.longitude], { icon: alertIcon })
              .addTo(map)
              .bindPopup(`<b>${alert.reportType.toUpperCase()}</b><br/>${alert.description || alert.type}`);
          });

          // Add nearby user markers
          nearbyUsers.forEach((user) => {
            const userColor = user.isResponder ? '#ff4757' : '#2196F3';
            const userIcon = L.divIcon({
              className: 'user-marker',
              html: `<div style="width: 16px; height: 16px; background: ${userColor}; border: 1px solid white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px;">👤</div>`,
              iconSize: [16, 16],
              iconAnchor: [8, 8]
            });
            
            L.marker([user.location.latitude, user.location.longitude], { icon: userIcon })
              .addTo(map)
              .bindPopup(`<b>${user.role}</b>${user.isResponder ? '<br/>(Responder)' : ''}`);
          });
        } catch (error) {
          console.error('Error updating markers:', error);
        }
      };

      updateMarkers();
    }
  }, [alerts, nearbyUsers, mapLoaded]);

  return (
    <View style={styles.container}>
      <div 
        ref={mapRef}
        style={{ 
          width: '100%', 
          height: '100%', 
          backgroundColor: '#0d1421',
          borderRadius: '12px',
          overflow: 'hidden',
          zIndex: 1
        }}
      />
      {!mapLoaded && (
        <View style={styles.loadingContainer}>
          <MapPin size={48} color="#ff4757" />
          <Text style={styles.loadingText}>Loading interactive map...</Text>
        </View>
      )}
    </View>
  );
}

// Mobile Map Component (fallback for native)
function MobileMapView({ location, alerts, nearbyUsers, onMapPress }: MapViewProps) {
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
    switch (alert.reportType) {
      case 'sos':
        return '#ff4757';
      case 'event':
        return '#FF9800';
      case 'vibe':
        return '#4CAF50';
      default:
        return '#8e8e93';
    }
  };

  const handleMarkerPress = (alert: Alert) => {
    setSelectedMarker(alert.id);
    RNAlert.alert(
      `${alert.reportType.toUpperCase()} Alert`,
      alert.description || `${alert.type} reported at this location`,
      [{ text: 'OK', onPress: () => setSelectedMarker(null) }]
    );
  };

  const handleUserMarkerPress = (user: NearbyUser) => {
    RNAlert.alert(
      'Nearby User',
      `${user.role}${user.isResponder ? ' (Responder)' : ''}`,
      [{ text: 'OK' }]
    );
  };

  const handleZoomIn = () => {
    const newZoom = Math.min(zoom * 1.5, 5);
    setZoom(newZoom);
    Animated.spring(scaleValue, {
      toValue: newZoom,
      useNativeDriver: false,
    }).start();
  };

  const handleZoomOut = () => {
    const newZoom = Math.max(zoom / 1.5, 0.5);
    setZoom(newZoom);
    Animated.spring(scaleValue, {
      toValue: newZoom,
      useNativeDriver: false,
    }).start();
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

        {/* 10km radius circle */}
        <View style={[styles.radiusCircle, {
          left: '50%',
          top: '50%',
          marginLeft: -100,
          marginTop: -100,
        }]} />

        {/* Alert markers */}
        {alerts.slice(0, 8).map((alert, index) => {
          const angle = (index * 45) * (Math.PI / 180);
          const radius = 80 + (index % 3) * 30;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;
          
          return (
            <TouchableOpacity
              key={alert.id}
              style={[
                styles.alertMarkerWeb,
                {
                  left: `50%`,
                  top: `50%`,
                  marginLeft: x - 12,
                  marginTop: y - 12,
                  backgroundColor: getMarkerColor(alert),
                },
              ]}
              onPress={() => handleMarkerPress(alert)}
            >
              <Text style={styles.markerText}>
                {alert.reportType === 'sos' ? '🆘' : 
                 alert.reportType === 'event' ? '⚠️' : '💚'}
              </Text>
            </TouchableOpacity>
          );
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

      {/* Map controls */}
      <View style={styles.mapControls}>
        <TouchableOpacity style={styles.controlButton} onPress={handleZoomIn}>
          <ZoomIn size={20} color="#ffffff" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.controlButton} onPress={handleZoomOut}>
          <ZoomOut size={20} color="#ffffff" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.controlButton} onPress={handleReset}>
          <RotateCcw size={20} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Map info */}
      <View style={styles.mapInfo}>
        <Text style={styles.mapInfoText}>Interactive Map</Text>
        <Text style={styles.mapInfoSubtext}>Drag to pan • Tap controls to zoom • Tap markers for details</Text>
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

export function HyperMapView({ location, alerts, nearbyUsers, onMapPress }: MapViewProps) {
  if (Platform.OS === 'web') {
    return <WebMapView location={location} alerts={alerts} nearbyUsers={nearbyUsers} onMapPress={onMapPress} />;
  }
  return <MobileMapView location={location} alerts={alerts} nearbyUsers={nearbyUsers} onMapPress={onMapPress} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d1421',
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
    top: 60,
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
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 5,
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
