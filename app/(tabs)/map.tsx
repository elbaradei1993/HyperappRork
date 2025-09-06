import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Animated,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AlertTriangle, MapPin, Users } from 'lucide-react-native';
import { useLocation } from '@/contexts/LocationContext';
import { useAlerts } from '@/contexts/AlertContext';
import { SOSModal } from '@/components/SOSModal';
import { HyperMapView } from '@/components/MapView';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';

export default function MapScreen() {
  const [showSOSModal, setShowSOSModal] = useState(false);
  const { location, requestPermission } = useLocation();
  const { alerts, nearbyUsers } = useAlerts();
  
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rippleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    requestPermission();
  }, [requestPermission]);

  useEffect(() => {
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnimation.start();

    return () => pulseAnimation.stop();
  }, [pulseAnim]);

  const handleSOSPress = () => {
    Animated.sequence([
      Animated.timing(rippleAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(rippleAnim, {
        toValue: 0,
        duration: 0,
        useNativeDriver: true,
      }),
    ]).start();

    setShowSOSModal(true);
  };

  const handleMapPress = (coordinate: {lat: number, lng: number}) => {
    Alert.alert(
      'Report at this location?',
      'What would you like to report here?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Report Vibe', 
          onPress: () => {
            console.log('Report vibe at', coordinate);
            router.push('/report');
          }
        },
        { 
          text: 'Report Event', 
          onPress: () => {
            console.log('Report event at', coordinate);
            router.push('/report');
          }
        },
      ]
    );
  };

  if (!location) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <MapPin size={48} color="#ff4757" />
          <Text style={styles.loadingText}>Getting your location...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.mapContainer}>
        <HyperMapView
          location={location}
          alerts={alerts}
          nearbyUsers={nearbyUsers}
          onMapPress={handleMapPress}
        />
        
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <AlertTriangle size={16} color="#ff4757" />
            <Text style={styles.statText}>{alerts.length} Alerts</Text>
          </View>
          <View style={styles.statItem}>
            <Users size={16} color="#4CAF50" />
            <Text style={styles.statText}>{nearbyUsers.length} Nearby</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.sosButton}
          onPress={handleSOSPress}
          activeOpacity={0.8}
        >
          <Animated.View
            style={[
              styles.sosRipple,
              {
                transform: [{ scale: rippleAnim }],
                opacity: rippleAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.7, 0],
                }),
              },
            ]}
          />
          <Animated.View
            style={[
              styles.sosButtonInner,
              { transform: [{ scale: pulseAnim }] },
            ]}
          >
            <LinearGradient
              colors={['#ff4757', '#ff3742']}
              style={styles.sosGradient}
            >
              <Text style={styles.sosText}>SOS</Text>
            </LinearGradient>
          </Animated.View>
        </TouchableOpacity>
      </View>

      <SOSModal
        visible={showSOSModal}
        onClose={() => setShowSOSModal(false)}
        location={location}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 16,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  statsContainer: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  statItem: {
    backgroundColor: 'rgba(26, 26, 46, 0.9)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    flex: 1,
  },
  statText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  sosButton: {
    position: 'absolute',
    bottom: 100,
    right: 24,
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sosRipple: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#ff4757',
  },
  sosButtonInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    elevation: 8,
    shadowColor: '#ff4757',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  sosGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sosText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
