import createContextHook from '@nkzw/create-context-hook';
import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { Platform } from 'react-native';

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  heading?: number;
  speed?: number;
  timestamp?: number;
}

interface LocationContextType {
  location: LocationData | null;
  loading: boolean;
  error: string | null;
  requestPermission: () => Promise<void>;
  getCurrentLocation: () => Promise<LocationData | null>;
  isHighAccuracy: boolean;
  setHighAccuracy: (enabled: boolean) => void;
}

export const [LocationProvider, useLocation] = createContextHook<LocationContextType>(() => {
  // Start with null location - will be set based on actual location or IP geolocation
  const [location, setLocation] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [watchId, setWatchId] = useState<Location.LocationSubscription | null>(null);
  const [isHighAccuracy, setIsHighAccuracy] = useState(true);
  const [webWatchId, setWebWatchId] = useState<number | null>(null);
  const [permissionRequested, setPermissionRequested] = useState(false);
  const [isRequestingLocation, setIsRequestingLocation] = useState(false);
  
  // Ref to track if we've successfully obtained location at least once
  const hasObtainedLocation = useRef(false);
  const locationAttempts = useRef(0);
  const maxAttempts = 5;
  const retryTimeouts = [1000, 2000, 4000, 8000, 16000]; // Exponential backoff
  
  // Check if we're in a browser environment that supports geolocation
  const isGeolocationAvailable = typeof navigator !== 'undefined' && 'geolocation' in navigator;
  
  // Check if we're on HTTPS (required for geolocation on web)
  const isHTTPS = typeof window !== 'undefined' && window.location?.protocol === 'https:';
  
  // IP-based geolocation fallback with multiple providers
  const getIPBasedLocation = async (): Promise<LocationData | null> => {
    // Try multiple IP geolocation providers for better reliability
    const providers = [
      {
        url: 'https://ipapi.co/json/',
        parser: (data: any) => ({
          latitude: data.latitude,
          longitude: data.longitude,
          city: data.city,
          country: data.country_name,
        }),
      },
      {
        url: 'https://api.ipgeolocation.io/ipgeo?apiKey=demo',
        parser: (data: any) => ({
          latitude: parseFloat(data.latitude),
          longitude: parseFloat(data.longitude),
          city: data.city,
          country: data.country_name,
        }),
      },
    ];

    for (const provider of providers) {
      try {
        console.log('🌐 Attempting IP-based geolocation...');
        const response = await fetch(provider.url);
        if (response.ok) {
          const data = await response.json();
          const parsed = provider.parser(data);
          if (parsed.latitude && parsed.longitude && !isNaN(parsed.latitude) && !isNaN(parsed.longitude)) {
            console.log(`📍 IP geolocation: ${parsed.city || 'Unknown'}, ${parsed.country || 'Unknown'} (${parsed.latitude}, ${parsed.longitude})`);
            return {
              latitude: parsed.latitude,
              longitude: parsed.longitude,
              accuracy: 5000, // IP geolocation is less accurate
              timestamp: Date.now(),
            };
          }
        }
      } catch (err) {
        console.warn('IP geolocation provider failed:', err);
      }
    }
    
    // Default fallback location (New York City)
    console.log('⚠️ All IP geolocation providers failed, using default location');
    return {
      latitude: 40.7128,
      longitude: -74.0060,
      accuracy: 10000,
      timestamp: Date.now(),
    };
  };

  useEffect(() => {
    if (!permissionRequested) {
      setPermissionRequested(true);
      requestPermission();
    }
    return () => {
      if (watchId) {
        watchId.remove();
      }
      if (webWatchId !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.clearWatch(webWatchId);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-request permission when accuracy changes
  useEffect(() => {
    if (location && permissionRequested) {
      requestPermission();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHighAccuracy]);

  const requestPermission = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      locationAttempts.current += 1;
      console.log(`🔍 Starting location request (attempt ${locationAttempts.current}/${maxAttempts})...`);

      if (Platform.OS === 'web') {
        // Check for HTTPS
        if (!isHTTPS && typeof window !== 'undefined' && window.location?.hostname !== 'localhost') {
          console.warn('Geolocation requires HTTPS. Using IP-based location.');
          const ipLocation = await getIPBasedLocation();
          if (ipLocation) {
            setLocation(ipLocation);
            setError('Geolocation requires HTTPS. Using approximate location based on IP.');
          } else {
            setError('Geolocation requires HTTPS. Please use a secure connection.');
          }
          setLoading(false);
          return;
        }
        
        if (!isGeolocationAvailable) {
          console.warn('Geolocation API not available, trying IP-based location');
          const ipLocation = await getIPBasedLocation();
          if (ipLocation) {
            setLocation(ipLocation);
            setError('Using approximate location based on IP address. Enable location services for better accuracy.');
          } else {
            setError('Location services not available. Please enable location in your browser.');
          }
          setLoading(false);
          return;
        }

        // Clear existing watch if any
        if (webWatchId !== null) {
          navigator.geolocation.clearWatch(webWatchId);
        }

        // Try multiple strategies to get location
        const strategies = [
          // Strategy 1: High accuracy with short timeout
          () => new Promise<GeolocationPosition>((resolve, reject) => {
            const timeoutId = setTimeout(() => reject(new Error('Timeout')), 3000);
            navigator.geolocation.getCurrentPosition(
              (pos) => { clearTimeout(timeoutId); resolve(pos); },
              (err) => { clearTimeout(timeoutId); reject(err); },
              { enableHighAccuracy: true, timeout: 2500, maximumAge: 0 }
            );
          }),
          // Strategy 2: Balanced accuracy with cached location
          () => new Promise<GeolocationPosition>((resolve, reject) => {
            const timeoutId = setTimeout(() => reject(new Error('Timeout')), 3000);
            navigator.geolocation.getCurrentPosition(
              (pos) => { clearTimeout(timeoutId); resolve(pos); },
              (err) => { clearTimeout(timeoutId); reject(err); },
              { enableHighAccuracy: false, timeout: 2500, maximumAge: 60000 }
            );
          }),
          // Strategy 3: Low accuracy for quick response
          () => new Promise<GeolocationPosition>((resolve, reject) => {
            const timeoutId = setTimeout(() => reject(new Error('Timeout')), 2000);
            navigator.geolocation.getCurrentPosition(
              (pos) => { clearTimeout(timeoutId); resolve(pos); },
              (err) => { clearTimeout(timeoutId); reject(err); },
              { enableHighAccuracy: false, timeout: 1500, maximumAge: 300000 }
            );
          })
        ];
        
        let position: GeolocationPosition | null = null;
        
        // Try each strategy in sequence
        for (const strategy of strategies) {
          try {
            console.log('Trying location strategy...');
            position = await strategy();
            if (position) {
              console.log('✅ Strategy succeeded:', position.coords.latitude, position.coords.longitude);
              break;
            }
          } catch (err) {
            console.log('Strategy failed, trying next...');
          }
        }

        if (position) {
          console.log('📍 Web location obtained:', position.coords.latitude, position.coords.longitude, 'accuracy:', position.coords.accuracy);
          
          const newLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy || 100,
            heading: position.coords.heading || undefined,
            speed: position.coords.speed || undefined,
            timestamp: position.timestamp,
          };
          
          setLocation(newLocation);
          hasObtainedLocation.current = true;
          setLoading(false);
          setError(null);
          locationAttempts.current = 0; // Reset attempts on success
        } else {
          console.log('All browser strategies failed, trying IP geolocation...');
          const ipLocation = await getIPBasedLocation();
          if (ipLocation) {
            setLocation(ipLocation);
            setError('Using approximate location. Enable location services for better accuracy.');
          } else {
            setError('Unable to determine location. Please enable location services and refresh.');
          }
          setLoading(false);
        }

        // Watch position for continuous updates
        const id = navigator.geolocation.watchPosition(
          (position) => {
            console.log('📍 Location update:', position.coords.latitude, position.coords.longitude, 'accuracy:', position.coords.accuracy);
            const newLocation = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy || 100,
              heading: position.coords.heading || undefined,
              speed: position.coords.speed || undefined,
              timestamp: position.timestamp,
            };
            setLocation(newLocation);
            hasObtainedLocation.current = true;
            setError(null);
            setLoading(false);
          },
          async (error) => {
            console.warn('Watch position error:', error.message);
            // Try IP geolocation if we've never obtained location
            if (!hasObtainedLocation.current && !location) {
              const ipLocation = await getIPBasedLocation();
              if (ipLocation) {
                setLocation(ipLocation);
                setError(`Location error: ${error.message}. Using approximate location.`);
              } else {
                setError(`Location error: ${error.message}`);
              }
            }
          },
          { 
            enableHighAccuracy: isHighAccuracy, 
            timeout: 10000, 
            maximumAge: 5000
          }
        );
        setWebWatchId(id);
      } else {
        console.log('📱 Requesting mobile location permissions...');
        
        // Request foreground permissions
        const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
        
        if (foregroundStatus !== 'granted') {
          setError('Location permission denied. Please enable location services in your device settings.');
          setLoading(false);
          return;
        }
        
        console.log('✅ Location permission granted');
        
        // Check if location services are enabled
        const locationServicesEnabled = await Location.hasServicesEnabledAsync();
        if (!locationServicesEnabled) {
          console.warn('⚠️ Location services disabled, using IP geolocation');
          const ipLocation = await getIPBasedLocation();
          if (ipLocation) {
            setLocation(ipLocation);
            setError('Location services are disabled. Using approximate location.');
          } else {
            setError('Location services are disabled. Please enable them in your device settings.');
          }
          setLoading(false);
          return;
        }

        console.log('✅ Location services enabled');

        // Clear existing watch if any
        if (watchId) {
          watchId.remove();
        }

        // First, try to get last known position immediately
        try {
          const lastKnown = await Location.getLastKnownPositionAsync();
          if (lastKnown && lastKnown.coords) {
            const age = Date.now() - lastKnown.timestamp;
            // Only use if less than 5 minutes old
            if (age < 300000) {
              console.log('📍 Using last known location:', lastKnown.coords.latitude, lastKnown.coords.longitude);
              setLocation({
                latitude: lastKnown.coords.latitude,
                longitude: lastKnown.coords.longitude,
                accuracy: lastKnown.coords.accuracy || 100,
                heading: lastKnown.coords.heading || undefined,
                speed: lastKnown.coords.speed || undefined,
                timestamp: lastKnown.timestamp,
              });
              hasObtainedLocation.current = true;
              setLoading(false);
              setError(null);
            }
          }
        } catch (err) {
          console.log('Could not get last known position:', err);
        }

        // Try multiple accuracy levels with more reasonable timeouts
        const accuracyLevels = isHighAccuracy ? [
          { level: Location.Accuracy.BestForNavigation, timeout: 10000, name: 'BestForNavigation' },
          { level: Location.Accuracy.High, timeout: 8000, name: 'High' },
          { level: Location.Accuracy.Balanced, timeout: 6000, name: 'Balanced' },
        ] : [
          { level: Location.Accuracy.Balanced, timeout: 6000, name: 'Balanced' },
          { level: Location.Accuracy.Low, timeout: 4000, name: 'Low' },
          { level: Location.Accuracy.Lowest, timeout: 3000, name: 'Lowest' }
        ];
        
        let locationObtained = false;
        
        for (const { level, timeout, name } of accuracyLevels) {
          if (locationObtained) break;
          
          try {
            console.log(`📍 Trying ${name} accuracy (timeout: ${timeout}ms)...`);
            const locationPromise = Location.getCurrentPositionAsync({
              accuracy: level,
              mayShowUserSettingsDialog: true,
              timeInterval: 1000,
              distanceInterval: 1,
            });
            
            const timeoutPromise = new Promise<null>((_, reject) => 
              setTimeout(() => reject(new Error(`${name} timeout after ${timeout}ms`)), timeout)
            );
            
            const result = await Promise.race([locationPromise, timeoutPromise]);
            
            if (result && result.coords) {
              console.log(`📍 Got location with ${name} accuracy:`, result.coords.latitude, result.coords.longitude);
              setLocation({
                latitude: result.coords.latitude,
                longitude: result.coords.longitude,
                accuracy: result.coords.accuracy || 100,
                heading: result.coords.heading || undefined,
                speed: result.coords.speed || undefined,
                timestamp: result.timestamp,
              });
              hasObtainedLocation.current = true;
              locationObtained = true;
              setLoading(false);
              setError(null);
            }
          } catch (err: any) {
            console.log(`⚠️ ${name} accuracy failed:`, err.message || err);
          }
        }

        if (!locationObtained && !hasObtainedLocation.current) {
          console.warn('⚠️ Failed to get GPS location, falling back to IP geolocation...');
          const ipLocation = await getIPBasedLocation();
          if (ipLocation) {
            setLocation(ipLocation);
            setError(null); // Don't show error if we have IP location
            console.log('✅ Using IP-based location as fallback');
          } else {
            setError('Unable to get your current location. Please ensure location services are enabled and try again.');
          }
          setLoading(false);
        }

        // Watch location for updates
        try {
          const subscription = await Location.watchPositionAsync(
            {
              accuracy: isHighAccuracy ? Location.Accuracy.BestForNavigation : Location.Accuracy.Balanced,
              timeInterval: 3000,
              distanceInterval: 5,
            },
            (newLocation) => {
              if (newLocation && newLocation.coords) {
                console.log('📍 Location update:', newLocation.coords.latitude, newLocation.coords.longitude);
                setLocation({
                  latitude: newLocation.coords.latitude,
                  longitude: newLocation.coords.longitude,
                  accuracy: newLocation.coords.accuracy || 100,
                  heading: newLocation.coords.heading || undefined,
                  speed: newLocation.coords.speed || undefined,
                  timestamp: newLocation.timestamp,
                });
                hasObtainedLocation.current = true;
                setError(null);
              }
            }
          );
          setWatchId(subscription);
        } catch (watchError) {
          console.error('Could not start location watching:', watchError);
        }
      }
    } catch (err: any) {
      console.error('Location error:', err);
      
      // Retry with exponential backoff if we haven't exceeded max attempts
      if (locationAttempts.current < maxAttempts && !hasObtainedLocation.current) {
        const retryDelay = retryTimeouts[Math.min(locationAttempts.current - 1, retryTimeouts.length - 1)];
        console.log(`⏳ Retrying location request in ${retryDelay}ms (attempt ${locationAttempts.current}/${maxAttempts})`);
        setError(`Location attempt ${locationAttempts.current} failed. Retrying...`);
        
        setTimeout(() => {
          requestPermission();
        }, retryDelay);
      } else {
        // Final fallback to IP geolocation
        const ipLocation = await getIPBasedLocation();
        if (ipLocation) {
          setLocation(ipLocation);
          setError('Using approximate location based on IP. Enable location services for better accuracy.');
        } else {
          setError(err.message || 'Unable to get location after multiple attempts.');
        }
        setLoading(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchId, webWatchId, isHighAccuracy, loading, location]);

  const getCurrentLocation = useCallback(async (): Promise<LocationData | null> => {
    // Prevent multiple simultaneous requests
    if (isRequestingLocation) {
      console.log('Already requesting location, returning current');
      return location;
    }
    
    try {
      console.log('🔄 Getting current location (forced refresh)...');
      setIsRequestingLocation(true);
      setLoading(true);
      
      if (Platform.OS === 'web') {
        if (!isGeolocationAvailable) {
          console.warn('Geolocation not available');
          setLoading(false);
          setIsRequestingLocation(false);
          // Try IP geolocation as fallback
          if (!location) {
            const ipLocation = await getIPBasedLocation();
            if (ipLocation) {
              setLocation(ipLocation);
              return ipLocation;
            }
          }
          return location;
        }
        
        return new Promise((resolve) => {
          // Try high accuracy first, then fall back
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const newLocation = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy || 100,
                heading: position.coords.heading || undefined,
                speed: position.coords.speed || undefined,
                timestamp: position.timestamp,
              };
              console.log('✅ Got fresh location:', newLocation.latitude, newLocation.longitude);
              setLocation(newLocation);
              hasObtainedLocation.current = true;
              setLoading(false);
              setIsRequestingLocation(false);
              setError(null);
              resolve(newLocation);
            },
            (error) => {
              console.warn('High accuracy failed, trying low accuracy:', error.message);
              // Try low accuracy as fallback
              navigator.geolocation.getCurrentPosition(
                (position) => {
                  const newLocation = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy || 100,
                    heading: position.coords.heading || undefined,
                    speed: position.coords.speed || undefined,
                    timestamp: position.timestamp,
                  };
                  console.log('✅ Got location with low accuracy:', newLocation.latitude, newLocation.longitude);
                  setLocation(newLocation);
                  hasObtainedLocation.current = true;
                  setLoading(false);
                  setIsRequestingLocation(false);
                  setError(null);
                  resolve(newLocation);
                },
                async () => {
                  console.warn('All attempts failed, trying IP geolocation');
                  const ipLocation = await getIPBasedLocation();
                  if (ipLocation) {
                    setLocation(ipLocation);
                    resolve(ipLocation);
                  } else {
                    resolve(location);
                  }
                  setLoading(false);
                  setIsRequestingLocation(false);
                },
                { enableHighAccuracy: false, timeout: 2000, maximumAge: 60000 }
              );
            },
            { enableHighAccuracy: true, timeout: 3000, maximumAge: 0 }
          );
        });
      } else {
        // Mobile: Try best accuracy first, then fall back
        const accuracyLevels = isHighAccuracy 
          ? [Location.Accuracy.BestForNavigation, Location.Accuracy.High, Location.Accuracy.Balanced]
          : [Location.Accuracy.Balanced, Location.Accuracy.Low];
        
        for (const accuracy of accuracyLevels) {
          try {
            const locationPromise = Location.getCurrentPositionAsync({
              accuracy,
              mayShowUserSettingsDialog: true,
            });
            
            const timeoutPromise = new Promise<null>((_, reject) => {
              setTimeout(() => reject(new Error('Timeout')), 3000);
            });
            
            const result = await Promise.race([locationPromise, timeoutPromise]);
            
            if (result && result.coords) {
              const newLocation = {
                latitude: result.coords.latitude,
                longitude: result.coords.longitude,
                accuracy: result.coords.accuracy || 100,
                heading: result.coords.heading || undefined,
                speed: result.coords.speed || undefined,
                timestamp: result.timestamp,
              };
              
              console.log('✅ Got mobile location:', newLocation.latitude, newLocation.longitude);
              setLocation(newLocation);
              hasObtainedLocation.current = true;
              setLoading(false);
              setIsRequestingLocation(false);
              setError(null);
              return newLocation;
            }
          } catch (err) {
            console.log('Accuracy level failed, trying next...');
          }
        }
        
        console.log('All mobile attempts failed, using current');
        setLoading(false);
        setIsRequestingLocation(false);
        return location;
      }
    } catch (err: any) {
      console.error('Error getting current location:', err.message || err);
      setLoading(false);
      setIsRequestingLocation(false);
      // Try IP geolocation as last resort
      if (!location) {
        const ipLocation = await getIPBasedLocation();
        if (ipLocation) {
          setLocation(ipLocation);
          return ipLocation;
        }
      }
      return location;
    }
  }, [isHighAccuracy, location, isRequestingLocation, isGeolocationAvailable]);

  const setHighAccuracy = useCallback((enabled: boolean) => {
    setIsHighAccuracy(enabled);
  }, []);

  return useMemo(() => ({
    location,
    loading,
    error,
    requestPermission,
    getCurrentLocation,
    isHighAccuracy,
    setHighAccuracy,
  }), [location, loading, error, requestPermission, getCurrentLocation, isHighAccuracy, setHighAccuracy]);
});
