import createContextHook from '@nkzw/create-context-hook';
import { useState, useCallback, useMemo, useEffect } from 'react';
import * as Location from 'expo-location';
import { Platform } from 'react-native';

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

interface LocationContextType {
  location: LocationData | null;
  loading: boolean;
  error: string | null;
  requestPermission: () => Promise<void>;
  getCurrentLocation: () => Promise<LocationData | null>;
}

export const [LocationProvider, useLocation] = createContextHook<LocationContextType>(() => {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [watchId, setWatchId] = useState<Location.LocationSubscription | null>(null);

  useEffect(() => {
    requestPermission();
    return () => {
      if (watchId) {
        watchId.remove();
      }
    };
  }, []);

  const requestPermission = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (Platform.OS === 'web') {
        if (!navigator.geolocation) {
          throw new Error('Geolocation is not supported by this browser');
        }

        // Get initial position
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setLocation({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
            });
            setLoading(false);
          },
          (error) => {
            console.error('Web geolocation error:', error);
            // Set default location for demo
            setLocation({
              latitude: 40.7128,
              longitude: -74.0060,
              accuracy: 100
            });
            setLoading(false);
          },
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
        );

        // Watch position for updates
        const id = navigator.geolocation.watchPosition(
          (position) => {
            setLocation({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
            });
          },
          (error) => console.error('Watch position error:', error),
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
        );
      } else {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          // Set default location for demo
          setLocation({
            latitude: 40.7128,
            longitude: -74.0060,
            accuracy: 100
          });
          setLoading(false);
          return;
        }

        // Get initial location
        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Highest,
        });

        setLocation({
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
          accuracy: currentLocation.coords.accuracy || undefined,
        });

        // Watch location for updates
        const subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 10000,
            distanceInterval: 10,
          },
          (newLocation) => {
            setLocation({
              latitude: newLocation.coords.latitude,
              longitude: newLocation.coords.longitude,
              accuracy: newLocation.coords.accuracy || undefined,
            });
          }
        );
        setWatchId(subscription);
      }
    } catch (err: any) {
      setError(err.message);
      console.error('Location error:', err);
      // Set default location for demo
      setLocation({
        latitude: 40.7128,
        longitude: -74.0060,
        accuracy: 100
      });
    } finally {
      setLoading(false);
    }
  }, [watchId]);

  const getCurrentLocation = useCallback(async (): Promise<LocationData | null> => {
    try {
      if (Platform.OS === 'web') {
        return new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              resolve({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
              });
            },
            (error) => reject(error),
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
          );
        });
      } else {
        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

        return {
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
          accuracy: currentLocation.coords.accuracy || undefined,
        };
      }
    } catch (err) {
      console.error('Error getting current location:', err);
      return null;
    }
  }, []);

  return useMemo(() => ({
    location,
    loading,
    error,
    requestPermission,
    getCurrentLocation,
  }), [location, loading, error, requestPermission, getCurrentLocation]);
});
