import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
  Animated,
  Platform,
  TextInput,
  Image,
  Linking,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { 
  Shield, 
  Heart, 
  Users, 
  AlertTriangle,
  TrendingUp,
  Activity,
  MapPin,
  Clock,
  Rainbow,
  AlertCircle,
  Zap,
  Bell,
  Radio,
  Calendar,
  Search,
  Music,
  Theater,
  Palette,
  Trophy,
  Filter,
  Bookmark,
  BookmarkCheck,
  DollarSign,
  ChevronRight,
  Flame,
  Gift,
  Crown,
  Target,
  Award,
  Star,
  Sparkles,
  MessageCircle,
  ThumbsUp,
  Share2,
  X,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAlerts } from '@/contexts/AlertContext';
import { useLocation } from '@/contexts/LocationContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import ticketmasterApi, { Event } from '@/utils/ticketmasterApi';

const { width } = Dimensions.get('window');

// Vibe radius in kilometers for filtering vibe data
const VIBE_RADIUS_KM = 0.5; // Vibes affect 0.5km radius as requested

const VIBE_COLORS = {
  safe: { gradient: ['#9C27B0', '#BA68C8'] as const, icon: Shield, label: 'Safe', pulseColor: '#9C27B0' },
  calm: { gradient: ['#2196F3', '#42A5F5'] as const, icon: Heart, label: 'Calm', pulseColor: '#2196F3' },
  crowded: { gradient: ['#FFC107', '#FFD54F'] as const, icon: Users, label: 'Crowded', pulseColor: '#FFC107' },
  suspicious: { gradient: ['#FFD700', '#FFA500'] as const, icon: AlertTriangle, label: 'Suspicious', pulseColor: '#FFD700' },
  dangerous: { gradient: ['#F44336', '#EF5350'] as const, icon: AlertTriangle, label: 'Dangerous', pulseColor: '#F44336' },
  lgbtqia: { gradient: ['#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#0000FF', '#8B00FF'] as const, icon: Rainbow, label: 'LGBTQIA+ Friendly', pulseColor: '#FF69B4' },
};

const ALERT_TYPE_CONFIG = {
  sos: { icon: AlertCircle, color: '#FF3B30', label: 'SOS Alert' },
  event: { icon: Zap, color: '#FF9500', label: 'Event' },
  vibe: { icon: Radio, color: '#AF52DE', label: 'Vibe' },
  default: { icon: Bell, color: '#007AFF', label: 'Alert' },
};

interface VibeData {
  type: string;
  count: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
  lastReported: string;
}

interface NeighborhoodVibe {
  name: string;
  dominantVibe: string;
  vibeScore: number;
  reportCount: number;
  distance: number;
  location: {
    latitude: number;
    longitude: number;
  };
  address?: string;
}

interface LiveFeedItem {
  id: string;
  type: 'sos' | 'event' | 'vibe';
  alertType: string;
  description?: string;
  location: {
    latitude: number;
    longitude: number;
  };
  timestamp: string;
  distance: number;
  address?: string;
  animation: Animated.Value;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: any;
  progress: number;
  total: number;
  unlocked: boolean;
  points: number;
}

interface DailyChallenge {
  id: string;
  title: string;
  description: string;
  points: number;
  completed: boolean;
  expiresAt: Date;
}

export default function CommunityPulseScreen() {
  const { alerts, vibeHistory, moveExpiredVibesToHistory } = useAlerts();
  const { location } = useLocation();
  const { t, isDark } = useSettings();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState<'24h' | '7d' | '30d'>('24h');
  const [vibeData, setVibeData] = useState<VibeData[]>([]);
  const [neighborhoodVibes, setNeighborhoodVibes] = useState<NeighborhoodVibe[]>([]);
  const [liveFeedItems, setLiveFeedItems] = useState<LiveFeedItem[]>([]);
  const [localAlerts, setLocalAlerts] = useState<typeof alerts>([]);
  const [userRadius, setUserRadius] = useState(10); // Default to 10km
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnims = useRef<{ [key: string]: Animated.Value }>({}).current;
  const [lastRefreshTime, setLastRefreshTime] = useState(Date.now());
  const [showHistory, setShowHistory] = useState(false);
  
  // Ticketmaster states
  const [events, setEvents] = useState<Event[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [savedEvents, setSavedEvents] = useState<string[]>([]);
  const [showEventSearch, setShowEventSearch] = useState(false);
  
  // Gamification states
  const [dailyStreak, setDailyStreak] = useState(0);
  const [userPoints, setUserPoints] = useState(0);
  const [userLevel, setUserLevel] = useState(1);
  const [moodToday, setMoodToday] = useState<string | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [dailyChallenges, setDailyChallenges] = useState<DailyChallenge[]>([]);
  const [showAchievementModal, setShowAchievementModal] = useState(false);
  const [newAchievement, setNewAchievement] = useState<Achievement | null>(null);
  const [weeklyGoal, setWeeklyGoal] = useState({ current: 0, target: 7 });
  const [communityRank, setCommunityRank] = useState(0);

  // Memoize distance calculation function
  const calculateDistance = useCallback((lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }, []);

  // Event categories
  const eventCategories = [
    { id: 'Music', label: 'Music', icon: Music, color: '#FF6B6B' },
    { id: 'Sports', label: 'Sports', icon: Trophy, color: '#4ECDC4' },
    { id: 'Arts & Theatre', label: 'Arts', icon: Theater, color: '#95E77E' },
    { id: 'Family', label: 'Family', icon: Users, color: '#FFD93D' },
  ];

  // Load saved events and gamification data
  useEffect(() => {
    loadSavedEvents();
    loadGamificationData();
    checkDailyLogin();
    loadAchievements();
    loadDailyChallenges();
  }, []);

  const loadSavedEvents = async () => {
    const saved = await ticketmasterApi.getSavedEvents();
    setSavedEvents(saved);
  };

  const loadGamificationData = async () => {
    try {
      const [streak, points, level, mood, weekGoal, rank] = await Promise.all([
        AsyncStorage.getItem('dailyStreak'),
        AsyncStorage.getItem('userPoints'),
        AsyncStorage.getItem('userLevel'),
        AsyncStorage.getItem('todayMood'),
        AsyncStorage.getItem('weeklyGoal'),
        AsyncStorage.getItem('communityRank'),
      ]);
      
      setDailyStreak(streak ? parseInt(streak) : 0);
      setUserPoints(points ? parseInt(points) : 0);
      setUserLevel(level ? parseInt(level) : 1);
      setMoodToday(mood);
      setWeeklyGoal(weekGoal ? JSON.parse(weekGoal) : { current: 0, target: 7 });
      setCommunityRank(rank ? parseInt(rank) : 0);
    } catch (error) {
      console.log('Error loading gamification data:', error);
    }
  };

  const checkDailyLogin = async () => {
    try {
      const lastLogin = await AsyncStorage.getItem('lastLogin');
      const today = new Date().toDateString();
      
      if (lastLogin !== today) {
        const currentStreak = dailyStreak + 1;
        const newPoints = userPoints + 10;
        const newWeeklyGoal = { ...weeklyGoal, current: weeklyGoal.current + 1 };
        
        await AsyncStorage.setItem('lastLogin', today);
        await AsyncStorage.setItem('dailyStreak', currentStreak.toString());
        await AsyncStorage.setItem('userPoints', newPoints.toString());
        await AsyncStorage.setItem('weeklyGoal', JSON.stringify(newWeeklyGoal));
        
        setDailyStreak(currentStreak);
        setUserPoints(newPoints);
        setWeeklyGoal(newWeeklyGoal);
        
        // Check for streak achievements
        if (currentStreak === 7) {
          unlockAchievement('week_warrior');
        } else if (currentStreak === 30) {
          unlockAchievement('monthly_hero');
        }
      }
    } catch (error) {
      console.log('Error checking daily login:', error);
    }
  };

  const loadAchievements = async () => {
    const defaultAchievements: Achievement[] = [
      {
        id: 'first_vibe',
        title: 'Vibe Setter',
        description: 'Report your first vibe',
        icon: Radio,
        progress: 0,
        total: 1,
        unlocked: false,
        points: 50,
      },
      {
        id: 'week_warrior',
        title: 'Week Warrior',
        description: '7 day login streak',
        icon: Flame,
        progress: dailyStreak,
        total: 7,
        unlocked: dailyStreak >= 7,
        points: 100,
      },
      {
        id: 'event_explorer',
        title: 'Event Explorer',
        description: 'Save 5 events',
        icon: Calendar,
        progress: savedEvents.length,
        total: 5,
        unlocked: savedEvents.length >= 5,
        points: 75,
      },
      {
        id: 'community_helper',
        title: 'Community Helper',
        description: 'Report 10 alerts',
        icon: Users,
        progress: 0,
        total: 10,
        unlocked: false,
        points: 150,
      },
    ];
    
    try {
      const saved = await AsyncStorage.getItem('achievements');
      if (saved) {
        const savedAchievements = JSON.parse(saved);
        setAchievements(savedAchievements);
      } else {
        setAchievements(defaultAchievements);
      }
    } catch (error) {
      setAchievements(defaultAchievements);
    }
  };

  const loadDailyChallenges = async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const defaultChallenges: DailyChallenge[] = [
      {
        id: 'check_in',
        title: 'Check in 3 times',
        description: 'Open the app 3 times today',
        points: 20,
        completed: false,
        expiresAt: tomorrow,
      },
      {
        id: 'report_vibe',
        title: 'Share a vibe',
        description: 'Report the vibe in your area',
        points: 30,
        completed: false,
        expiresAt: tomorrow,
      },
      {
        id: 'explore_events',
        title: 'Discover events',
        description: 'Browse at least 5 events',
        points: 25,
        completed: false,
        expiresAt: tomorrow,
      },
    ];
    
    try {
      const saved = await AsyncStorage.getItem('dailyChallenges');
      const lastChallengeDate = await AsyncStorage.getItem('lastChallengeDate');
      const today = new Date().toDateString();
      
      if (saved && lastChallengeDate === today) {
        setDailyChallenges(JSON.parse(saved));
      } else {
        setDailyChallenges(defaultChallenges);
        await AsyncStorage.setItem('dailyChallenges', JSON.stringify(defaultChallenges));
        await AsyncStorage.setItem('lastChallengeDate', today);
      }
    } catch (error) {
      setDailyChallenges(defaultChallenges);
    }
  };

  const unlockAchievement = async (achievementId: string) => {
    const achievement = achievements.find(a => a.id === achievementId);
    if (achievement && !achievement.unlocked) {
      achievement.unlocked = true;
      const newPoints = userPoints + achievement.points;
      setUserPoints(newPoints);
      await AsyncStorage.setItem('userPoints', newPoints.toString());
      await AsyncStorage.setItem('achievements', JSON.stringify(achievements));
      
      // Show achievement modal
      setNewAchievement(achievement);
      setShowAchievementModal(true);
      
      // Check for level up
      const newLevel = Math.floor(newPoints / 500) + 1;
      if (newLevel > userLevel) {
        setUserLevel(newLevel);
        await AsyncStorage.setItem('userLevel', newLevel.toString());
      }
    }
  };

  const handleMoodSelection = async (mood: string) => {
    setMoodToday(mood);
    const newPoints = userPoints + 5;
    setUserPoints(newPoints);
    await AsyncStorage.setItem('userPoints', newPoints.toString());
    await AsyncStorage.setItem('todayMood', mood);
  };

  const completeChallenge = async (challengeId: string) => {
    const challenge = dailyChallenges.find(c => c.id === challengeId);
    if (challenge && !challenge.completed) {
      challenge.completed = true;
      const newPoints = userPoints + challenge.points;
      setUserPoints(newPoints);
      await AsyncStorage.setItem('userPoints', newPoints.toString());
      await AsyncStorage.setItem('dailyChallenges', JSON.stringify(dailyChallenges));
      setDailyChallenges([...dailyChallenges]);
    }
  };

  // Load events when location changes
  useEffect(() => {
    if (location) {
      loadNearbyEvents();
    }
  }, [location]);

  const loadNearbyEvents = async () => {
    if (!location) return;
    
    setLoadingEvents(true);
    try {
      const nearbyEvents = await ticketmasterApi.getNearbyEvents(
        { lat: location.latitude, lng: location.longitude },
        userRadius
      );
      setEvents(nearbyEvents);
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoadingEvents(false);
    }
  };

  const searchEvents = async () => {
    if (!searchQuery.trim()) {
      loadNearbyEvents();
      return;
    }

    setLoadingEvents(true);
    try {
      const results = await ticketmasterApi.searchEventsByKeyword(
        searchQuery,
        location ? { lat: location.latitude, lng: location.longitude } : undefined
      );
      setEvents(results);
    } catch (error) {
      console.error('Error searching events:', error);
    } finally {
      setLoadingEvents(false);
    }
  };

  const filterByCategory = async (category: string | null) => {
    setSelectedCategory(category);
    
    if (!category || !location) {
      loadNearbyEvents();
      return;
    }

    setLoadingEvents(true);
    try {
      const categoryEvents = await ticketmasterApi.getEventsByCategory(
        category,
        { lat: location.latitude, lng: location.longitude },
        userRadius
      );
      setEvents(categoryEvents);
    } catch (error) {
      console.error('Error filtering events:', error);
    } finally {
      setLoadingEvents(false);
    }
  };

  const toggleSaveEvent = async (eventId: string) => {
    const isSaved = await ticketmasterApi.toggleSaveEvent(eventId);
    if (isSaved) {
      setSavedEvents([...savedEvents, eventId]);
    } else {
      setSavedEvents(savedEvents.filter(id => id !== eventId));
    }
  };

  const formatEventDate = (dateString: string) => {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = { 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    };
    return date.toLocaleDateString('en-US', options);
  };

  // Load user's radius setting and refresh when screen is focused
  const loadRadius = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('appSettings');
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        if (settings.radius && settings.radius !== userRadius) {
          setUserRadius(settings.radius);
          // Trigger data refresh when radius changes
          setLastRefreshTime(Date.now());
        }
      }
    } catch (error) {
      console.error('Error loading radius setting:', error);
    }
  };

  // Load radius on mount
  useEffect(() => {
    loadRadius();
  }, []);

  // Reload radius when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadRadius();
    }, [])
  );

  useEffect(() => {
    // Start pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  useEffect(() => {
    if (location) {
      // Filter alerts to only show those within the user's selected radius
      const filtered = alerts.filter(alert => {
        const distance = calculateDistance(
          location.latitude,
          location.longitude,
          alert.location.latitude,
          alert.location.longitude
        );
        return distance <= userRadius;
      });
      setLocalAlerts(filtered);
    } else {
      setLocalAlerts(alerts);
    }
  }, [alerts, location, userRadius]);

  useEffect(() => {
    calculateVibeData();
    calculateNeighborhoodVibes();
    updateLiveFeed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localAlerts, selectedTimeRange, location, lastRefreshTime]);

  const calculateVibeData = useCallback(() => {
    const now = new Date();
    const timeFilter = {
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
    };

    // Use localAlerts instead of all alerts
    const filteredAlerts = localAlerts.filter(alert => {
      const alertTime = new Date(alert.timestamp);
      return (now.getTime() - alertTime.getTime()) < timeFilter[selectedTimeRange];
    });

    // Further filter vibes to only those within VIBE_RADIUS_KM
    const vibeAlerts = filteredAlerts.filter(alert => {
      if (alert.reportType !== 'vibe') return false;
      if (!location) return true; // If no location, show all
      
      const distance = calculateDistance(
        location.latitude,
        location.longitude,
        alert.location.latitude,
        alert.location.longitude
      );
      return distance <= VIBE_RADIUS_KM;
    });
    const vibeCounts: Record<string, number> = {};
    const lastReportedTimes: Record<string, Date> = {};
    
    vibeAlerts.forEach(alert => {
      // Ensure we have a valid alert_type, default to 'safe' if missing
      const type = alert.alert_type && alert.alert_type !== '' ? alert.alert_type : 'safe';
      vibeCounts[type] = (vibeCounts[type] || 0) + 1;
      const alertDate = new Date(alert.timestamp);
      if (!lastReportedTimes[type] || alertDate > lastReportedTimes[type]) {
        lastReportedTimes[type] = alertDate;
      }
    });

    const total = vibeAlerts.length;
    const data: VibeData[] = Object.keys(VIBE_COLORS).map(type => {
      const count = vibeCounts[type] || 0;
      return {
        type,
        count: count,
        percentage: total > 0 ? (count / total) * 100 : 0,
        trend: 'stable' as const,
        lastReported: lastReportedTimes[type] ? formatTimeAgo(lastReportedTimes[type]) : 'Never',
      };
    });

    // Sort by count descending to make it easier to find dominant vibe
    data.sort((a, b) => b.count - a.count);

    setVibeData(data);
  }, [localAlerts, selectedTimeRange, location, calculateDistance]);

  // Memoize geocoding function with caching
  const addressCache = useRef<Map<string, string>>(new Map());
  
  const getAddressFromCoordinates = useCallback(async (lat: number, lng: number): Promise<string> => {
    // Check cache first
    const cacheKey = `${lat.toFixed(4)}_${lng.toFixed(4)}`;
    if (addressCache.current.has(cacheKey)) {
      return addressCache.current.get(cacheKey)!;
    }
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'Pulse-App/1.0',
          },
        }
      );
      
      // Check if response is ok
      if (!response.ok) {
        console.log('Geocoding API returned error status:', response.status);
        return await getFallbackAddress(lat, lng);
      }
      
      // Get response text first to check if it's valid JSON
      const responseText = await response.text();
      
      // Check if response is empty or not JSON
      if (!responseText || responseText.trim().length === 0) {
        console.log('Empty response from geocoding API');
        return await getFallbackAddress(lat, lng);
      }
      
      // Try to parse JSON
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.log('Failed to parse geocoding response:', responseText.substring(0, 100));
        return await getFallbackAddress(lat, lng);
      }
      
      // Check if we have valid address data
      if (data && data.address) {
        const parts = [];
        
        // Build a more readable address
        if (data.address.house_number) parts.push(data.address.house_number);
        if (data.address.road) parts.push(data.address.road);
        else if (data.address.pedestrian) parts.push(data.address.pedestrian);
        else if (data.address.footway) parts.push(data.address.footway);
        
        // Add neighborhood/suburb
        if (data.address.neighbourhood) parts.push(data.address.neighbourhood);
        else if (data.address.suburb) parts.push(data.address.suburb);
        else if (data.address.district) parts.push(data.address.district);
        
        // Add city
        if (data.address.city) parts.push(data.address.city);
        else if (data.address.town) parts.push(data.address.town);
        else if (data.address.village) parts.push(data.address.village);
        
        // If we have address parts, return them
        if (parts.length > 0) {
          return parts.join(', ');
        }
        
        // If we have display_name as fallback
        if (data.display_name) {
          // Extract relevant parts from display_name
          const displayParts = data.display_name.split(',').slice(0, 3);
          return displayParts.join(',').trim();
        }
      }
    } catch (error) {
      console.log('Error getting address:', error);
    }
    
    // Return fallback address
    const address = await getFallbackAddress(lat, lng);
    addressCache.current.set(cacheKey, address);
    return address;
  }, []);

  const getFallbackAddress = useCallback(async (lat: number, lng: number): Promise<string> => {
    // Try alternative geocoding service
    try {
      const response = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data) {
          const parts = [];
          if (data.locality) parts.push(data.locality);
          if (data.city) parts.push(data.city);
          if (data.principalSubdivision) parts.push(data.principalSubdivision);
          
          if (parts.length > 0) {
            return parts.join(', ');
          }
        }
      }
    } catch (error) {
      console.log('Fallback geocoding failed:', error);
    }
    
    // Return general area description based on coordinates
    return `Area near ${lat.toFixed(3)}°, ${lng.toFixed(3)}°`;
  }, []);

  const updateLiveFeed = useCallback(async () => {
    if (!location) return;

    const now = new Date();
    const timeFilter = {
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
    };

    // Get recent local alerts
    const recentAlerts = localAlerts
      .filter(alert => {
        const alertTime = new Date(alert.timestamp);
        return (now.getTime() - alertTime.getTime()) < timeFilter[selectedTimeRange];
      })
      .slice(0, 10); // Show top 10 most recent

    // Create live feed items with animations and rate-limited geocoding
    const feedItems: LiveFeedItem[] = await Promise.all(
      recentAlerts.map(async (alert, index) => {
        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, index * 100));
        
        const distance = calculateDistance(
          location.latitude,
          location.longitude,
          alert.location.latitude,
          alert.location.longitude
        );

        // Get or create animation for this item
        if (!fadeAnims[alert.id]) {
          fadeAnims[alert.id] = new Animated.Value(0);
          // Animate in
          Animated.timing(fadeAnims[alert.id], {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }).start();
        }

        const address = await getAddressFromCoordinates(
          alert.location.latitude,
          alert.location.longitude
        );

        return {
          id: alert.id,
          type: alert.reportType,
          alertType: alert.alert_type,
          description: alert.description,
          location: alert.location,
          timestamp: alert.timestamp,
          distance,
          address,
          animation: fadeAnims[alert.id],
        };
      })
    );

    setLiveFeedItems(feedItems);
  }, [localAlerts, selectedTimeRange, location, calculateDistance, getAddressFromCoordinates]);

  const calculateNeighborhoodVibes = useCallback(async () => {
    // Group alerts by approximate location areas
    if (!location || localAlerts.length === 0) {
      setNeighborhoodVibes([]);
      return;
    }

    // Create neighborhood zones based on actual alert locations
    const zones: Record<string, any> = {};
    
    // Use localAlerts instead of all alerts
    localAlerts.forEach(alert => {
      // Create zone key based on rounded coordinates (simulating neighborhoods)
      // Use smaller rounding for more granular neighborhoods
      const zoneKey = `${Math.round(alert.location.latitude * 200) / 200}_${Math.round(alert.location.longitude * 200) / 200}`;
      
      if (!zones[zoneKey]) {
        zones[zoneKey] = {
          vibes: [],
          events: [],
          lat: alert.location.latitude,
          lng: alert.location.longitude,
        };
      }
      
      if (alert.reportType === 'vibe') {
        zones[zoneKey].vibes.push(alert.alert_type);
      } else {
        zones[zoneKey].events.push(alert.alert_type);
      }
    });

    // Process zones with rate limiting for geocoding
    const neighborhoodsPromises = Object.entries(zones).map(async ([key, zone]: [string, any], index) => {
      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, index * 100));
      
      const vibeCount = zone.vibes.length;
      const eventCount = zone.events.length;
      const totalReports = vibeCount + eventCount;
      
      // Calculate dominant vibe
      const vibeCounts: Record<string, number> = {};
      zone.vibes.forEach((vibe: string) => {
        vibeCounts[vibe] = (vibeCounts[vibe] || 0) + 1;
      });
      
      const dominantVibe = Object.keys(vibeCounts).reduce((a, b) => 
        (vibeCounts[a] || 0) > (vibeCounts[b] || 0) ? a : b, 'safe'
      );
      
      // Calculate vibe score (higher for safe/calm, lower for dangerous/suspicious)
      const scoreMap: Record<string, number> = {
        safe: 90,
        calm: 80,
        lgbtqia: 95,
        crowded: 60,
        suspicious: 40,
        dangerous: 20,
      };
      
      const vibeScore = vibeCount > 0 
        ? Math.round(zone.vibes.reduce((sum: number, vibe: string) => sum + (scoreMap[vibe] || 50), 0) / vibeCount)
        : 50;
      
      // Calculate distance from current location
      const distance = calculateDistance(
        location.latitude,
        location.longitude,
        zone.lat,
        zone.lng
      );
      
      // Get address for the location
      const address = await getAddressFromCoordinates(zone.lat, zone.lng);
      
      return {
        name: address,
        dominantVibe,
        vibeScore,
        reportCount: totalReports,
        distance: Math.round(distance * 10) / 10,
        location: {
          latitude: zone.lat,
          longitude: zone.lng,
        },
        address,
      };
    });

    const neighborhoods = await Promise.all(neighborhoodsPromises);
    setNeighborhoodVibes(neighborhoods.sort((a, b) => a.distance - b.distance).slice(0, 5));
  }, [localAlerts, location, calculateDistance, getAddressFromCoordinates]);

  const formatTimeAgo = useCallback((date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await moveExpiredVibesToHistory();
    calculateVibeData();
    calculateNeighborhoodVibes();
    updateLiveFeed();
    await loadNearbyEvents();
    setTimeout(() => setRefreshing(false), 1000);
  };

  const getDominantVibe = useMemo(() => {
    // Always default to 'safe' when no reports exist
    if (!vibeData || vibeData.length === 0) {
      return 'safe';
    }
    
    // Check if any vibes have been reported
    const hasReports = vibeData.some(v => v.count > 0);
    if (!hasReports) {
      return 'safe';
    }
    
    // Find the vibe with the highest count
    const dominant = vibeData.reduce((prev, current) => {
      if (current.count > prev.count) {
        return current;
      }
      return prev;
    }, { type: 'safe', count: 0, percentage: 0, trend: 'stable' as const, lastReported: 'Never' });
    
    // If no reports exist or all counts are 0, default to safe
    return dominant.count > 0 ? dominant.type : 'safe';
  }, [vibeData]);

  const getOverallScore = useMemo(() => {
    const weights = { safe: 100, calm: 85, crowded: 60, suspicious: 30, dangerous: 10 };
    let totalScore = 0;
    let totalCount = 0;

    vibeData.forEach(vibe => {
      const weight = weights[vibe.type as keyof typeof weights] || 50;
      totalScore += weight * vibe.count;
      totalCount += vibe.count;
    });

    // Default to 100 (safe) when no reports exist
    return totalCount > 0 ? Math.round(totalScore / totalCount) : 100;
  }, [vibeData]);

  return (
    <ScrollView 
      style={[styles.container, isDark && styles.containerDark]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header with Overall Score */}
      <View style={[styles.header, isDark && styles.headerDark]}>
        <View style={styles.headerTop}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, isDark && styles.headerTitleDark]}>{t('communityPulse')}</Text>
            <Text style={[styles.headerSubtitle, isDark && styles.headerSubtitleDark]}>{t('realTimeVibes')}</Text>
          </View>
          <View style={styles.locationBadge}>
            <MapPin size={14} color="#ff4757" />
            <Text style={styles.locationText} numberOfLines={1}>
              {location ? `${userRadius}km ${t('radius')}` : t('allAreas')}
            </Text>
          </View>
        </View>
        
        <View style={styles.scoreContainer}>
          <Animated.View style={[styles.scoreCircle, isDark && styles.scoreCircleDark, { transform: [{ scale: pulseAnim }] }]}>
            <Text style={[styles.scoreNumber, isDark && styles.scoreNumberDark]}>{getOverallScore}</Text>
            <Text style={[styles.scoreLabel, isDark && styles.scoreLabelDark]}>{t('vibeScore')}</Text>
          </Animated.View>
          
          <View style={styles.dominantVibeContainer}>
            <Text style={[styles.dominantLabel, isDark && styles.dominantLabelDark]}>{t('currentVibe')}</Text>
            <LinearGradient
              colors={VIBE_COLORS[getDominantVibe as keyof typeof VIBE_COLORS].gradient}
              style={styles.dominantBadge}
            >
              <Text style={styles.dominantText}>
                {VIBE_COLORS[getDominantVibe as keyof typeof VIBE_COLORS].label}
              </Text>
            </LinearGradient>
          </View>
        </View>
      </View>

      {/* Gamification Section */}
      <View style={styles.gamificationSection}>
        {/* Daily Mood Check */}
        {!moodToday && (
          <View style={[styles.moodCard, isDark && styles.moodCardDark]}>
            <Text style={[styles.moodTitle, isDark && styles.moodTitleDark]}>How are you feeling today?</Text>
            <View style={styles.moodOptions}>
              {['😊', '😎', '😴', '😤', '🥳'].map((mood) => (
                <TouchableOpacity
                  key={mood}
                  style={[styles.moodButton, isDark && styles.moodButtonDark]}
                  onPress={() => handleMoodSelection(mood)}
                >
                  <Text style={styles.moodEmoji}>{mood}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.moodReward, isDark && styles.moodRewardDark]}>+5 points</Text>
          </View>
        )}

        {/* Stats Bar */}
        <View style={[styles.statsBar, isDark && styles.statsBarDark]}>
          <TouchableOpacity style={styles.statItem} onPress={() => setShowAchievementModal(true)}>
            <View style={styles.statIcon}>
              <Flame size={20} color="#FF6B6B" />
            </View>
            <View>
              <Text style={[styles.statValue, isDark && styles.statValueDark]}>{dailyStreak}</Text>
              <Text style={[styles.statLabel, isDark && styles.statLabelDark]}>Day Streak</Text>
            </View>
          </TouchableOpacity>
          
          <View style={styles.statDivider} />
          
          <TouchableOpacity style={styles.statItem}>
            <View style={styles.statIcon}>
              <Crown size={20} color="#FFD93D" />
            </View>
            <View>
              <Text style={[styles.statValue, isDark && styles.statValueDark]}>{userPoints}</Text>
              <Text style={[styles.statLabel, isDark && styles.statLabelDark]}>Points</Text>
            </View>
          </TouchableOpacity>
          
          <View style={styles.statDivider} />
          
          <TouchableOpacity style={styles.statItem}>
            <View style={styles.statIcon}>
              <Star size={20} color="#4ECDC4" />
            </View>
            <View>
              <Text style={[styles.statValue, isDark && styles.statValueDark]}>Lvl {userLevel}</Text>
              <Text style={[styles.statLabel, isDark && styles.statLabelDark]}>Level</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Weekly Goal Progress */}
        <View style={[styles.weeklyGoalCard, isDark && styles.weeklyGoalCardDark]}>
          <View style={styles.weeklyGoalHeader}>
            <Target size={18} color="#FF6B6B" />
            <Text style={[styles.weeklyGoalTitle, isDark && styles.weeklyGoalTitleDark]}>Weekly Goal</Text>
            <Text style={[styles.weeklyGoalProgress, isDark && styles.weeklyGoalProgressDark]}>
              {weeklyGoal.current}/{weeklyGoal.target} days
            </Text>
          </View>
          <View style={styles.weeklyGoalBar}>
            <View 
              style={[
                styles.weeklyGoalFill,
                { width: `${(weeklyGoal.current / weeklyGoal.target) * 100}%` }
              ]} 
            />
          </View>
        </View>

        {/* Daily Challenges */}
        <View style={styles.challengesContainer}>
          <View style={styles.challengesHeader}>
            <Trophy size={18} color={isDark ? '#ffffff' : '#000000'} />
            <Text style={[styles.challengesTitle, isDark && styles.challengesTitleDark]}>Daily Challenges</Text>
            <View style={styles.challengeTimer}>
              <Clock size={12} color="#8e8e93" />
              <Text style={styles.challengeTimerText}>Resets in 8h</Text>
            </View>
          </View>
          
          {dailyChallenges.map((challenge) => (
            <TouchableOpacity
              key={challenge.id}
              style={[
                styles.challengeCard,
                challenge.completed && styles.challengeCardCompleted,
                isDark && styles.challengeCardDark
              ]}
              onPress={() => !challenge.completed && completeChallenge(challenge.id)}
              disabled={challenge.completed}
            >
              <View style={styles.challengeContent}>
                <View style={styles.challengeInfo}>
                  <Text style={[
                    styles.challengeTitle,
                    challenge.completed && styles.challengeTitleCompleted,
                    isDark && styles.challengeTitleDark
                  ]}>
                    {challenge.title}
                  </Text>
                  <Text style={[
                    styles.challengeDescription,
                    isDark && styles.challengeDescriptionDark
                  ]}>
                    {challenge.description}
                  </Text>
                </View>
                <View style={[
                  styles.challengePoints,
                  challenge.completed && styles.challengePointsCompleted
                ]}>
                  {challenge.completed ? (
                    <Award size={20} color="#4CAF50" />
                  ) : (
                    <>
                      <Gift size={16} color="#FFD93D" />
                      <Text style={styles.challengePointsText}>+{challenge.points}</Text>
                    </>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Time Range Selector */}
      <View style={styles.timeRangeContainer}>
        {(['24h', '7d', '30d'] as const).map(range => (
          <TouchableOpacity
            key={range}
            style={[
              styles.timeRangeButton,
              selectedTimeRange === range && styles.timeRangeButtonActive
            ]}
            onPress={() => setSelectedTimeRange(range)}
          >
            <Text style={[
              styles.timeRangeText,
              selectedTimeRange === range && styles.timeRangeTextActive
            ]}>
              {range === '24h' ? t('last24Hours') : range === '7d' ? t('last7Days') : t('last30Days')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Vibe Distribution */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>{t('vibeDistribution')}</Text>
          <TouchableOpacity
            style={styles.historyButton}
            onPress={() => setShowHistory(!showHistory)}
          >
            <Clock size={16} color="#ff4757" />
            <Text style={styles.historyButtonText}>
              {showHistory ? t('currentVibes') : t('vibeHistory')}
            </Text>
          </TouchableOpacity>
        </View>
        {!showHistory ? (
          <View style={styles.vibeGrid}>
            {vibeData.map(vibe => {
              const config = VIBE_COLORS[vibe.type as keyof typeof VIBE_COLORS];
              const IconComponent = config.icon;
              
              // Find if any vibes have expiration times
              const vibesWithExpiration = localAlerts.filter(a => 
                a.reportType === 'vibe' && 
                a.alert_type === vibe.type && 
                a.expires_at
              );
              
              const getTimeUntilExpiration = () => {
                if (vibesWithExpiration.length === 0) return null;
                const now = new Date();
                const nearestExpiration = vibesWithExpiration
                  .map(v => new Date(v.expires_at!))
                  .sort((a, b) => a.getTime() - b.getTime())[0];
                const hoursLeft = Math.max(0, Math.floor((nearestExpiration.getTime() - now.getTime()) / (1000 * 60 * 60)));
                return hoursLeft;
              };
              
              const hoursLeft = getTimeUntilExpiration();
              
              return (
                <TouchableOpacity key={vibe.type} style={styles.vibeCard}>
                  <LinearGradient
                    colors={config.gradient}
                    style={styles.vibeCardGradient}
                  >
                    <IconComponent size={24} color="#ffffff" />
                    <Text style={styles.vibeCardLabel}>{config.label}</Text>
                    <Text style={styles.vibeCardCount}>{vibe.count}</Text>
                    <View style={styles.vibeCardPercentage}>
                      <Text style={styles.vibeCardPercentageText}>
                        {vibe.percentage.toFixed(0)}%
                      </Text>
                      {vibe.trend === 'up' && <TrendingUp size={12} color="#ffffff" />}
                      {vibe.trend === 'down' && <TrendingUp size={12} color="#ffffff" style={{ transform: [{ rotate: '180deg' }] }} />}
                    </View>
                    {hoursLeft !== null && vibe.count > 0 && (
                      <View style={styles.expirationBadge}>
                        <Clock size={10} color="#ffffff" />
                        <Text style={styles.expirationText}>
                          {hoursLeft}h left
                        </Text>
                      </View>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <ScrollView style={styles.historyContainer}>
            {vibeHistory.length > 0 ? (
              vibeHistory.slice(0, 10).map((item: any, index: number) => {
                const config = VIBE_COLORS[item.vibe_type as keyof typeof VIBE_COLORS] || VIBE_COLORS.safe;
                const IconComponent = config.icon;
                
                return (
                  <View key={item.id || index} style={styles.historyItem}>
                    <View style={[styles.historyIcon, { backgroundColor: config.pulseColor + '20' }]}>
                      <IconComponent size={20} color={config.pulseColor} />
                    </View>
                    <View style={styles.historyContent}>
                      <Text style={styles.historyVibe}>{config.label}</Text>
                      {item.address && (
                        <Text style={styles.historyAddress} numberOfLines={1}>
                          {item.address}
                        </Text>
                      )}
                      <Text style={styles.historyTime}>
                        Expired: {new Date(item.expired_at).toLocaleDateString()} at {new Date(item.expired_at).toLocaleTimeString()}
                      </Text>
                    </View>
                  </View>
                );
              })
            ) : (
              <View style={styles.emptyHistory}>
                <Clock size={48} color="#8e8e93" />
                <Text style={styles.emptyHistoryText}>{t('noVibeHistory')}</Text>
                <Text style={styles.emptyHistorySubtext}>
                  {t('vibesExpireAfter12Hours')}
                </Text>
              </View>
            )}
          </ScrollView>
        )}
      </View>

      {/* Neighborhood Vibes */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>{t('nearbyAreas')}</Text>
          <Activity size={20} color="#ff4757" />
        </View>
        
        {neighborhoodVibes.map((neighborhood, index) => {
          const config = VIBE_COLORS[neighborhood.dominantVibe as keyof typeof VIBE_COLORS] || VIBE_COLORS.safe;
          
          return (
            <TouchableOpacity 
              key={index} 
              style={[styles.neighborhoodCard, isDark && styles.neighborhoodCardDark]}
              onPress={() => {
                // Navigate to map with the location
                router.push({
                  pathname: '/(tabs)/map',
                  params: {
                    focusLat: neighborhood.location.latitude,
                    focusLng: neighborhood.location.longitude,
                  },
                });
              }}
            >
              <View style={styles.neighborhoodHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.neighborhoodName, isDark && styles.neighborhoodNameDark]} numberOfLines={2}>
                    {neighborhood.name}
                  </Text>
                  <View style={styles.neighborhoodMeta}>
                    <MapPin size={12} color="#8e8e93" />
                    <Text style={styles.neighborhoodDistance}>
                      {neighborhood.distance} km away
                    </Text>
                    <Text style={styles.neighborhoodReports}>
                      • {neighborhood.reportCount} reports
                    </Text>
                  </View>
                </View>
                
                <View style={styles.neighborhoodScore}>
                  <Text style={[styles.neighborhoodScoreNumber, isDark && styles.neighborhoodScoreNumberDark]}>
                    {neighborhood.vibeScore}
                  </Text>
                  <LinearGradient
                    colors={Array.isArray(config.gradient) ? config.gradient : ['#4CAF50', '#66BB6A']}
                    style={styles.neighborhoodVibeBadge}
                  >
                    <Text style={styles.neighborhoodVibeBadgeText}>
                      {config.label}
                    </Text>
                  </LinearGradient>
                </View>
              </View>
              
              <View style={styles.neighborhoodBar}>
                <LinearGradient
                  colors={Array.isArray(config.gradient) ? [config.gradient[0], config.gradient[1]] : ['#4CAF50', '#66BB6A']}
                  style={[styles.neighborhoodBarFill, { width: `${neighborhood.vibeScore}%` }]}
                />
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Nearby Events Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.eventSectionHeader}>
            <Calendar size={20} color={isDark ? '#ffffff' : '#000000'} />
            <Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>Nearby Events</Text>
          </View>
          <TouchableOpacity
            onPress={() => setShowEventSearch(!showEventSearch)}
            style={styles.searchToggle}
          >
            <Search size={18} color="#ff4757" />
          </TouchableOpacity>
        </View>

        {showEventSearch && (
          <View style={styles.searchContainer}>
            <View style={[styles.searchBar, isDark && styles.searchBarDark]}>
              <Search size={18} color="#8e8e93" />
              <TextInput
                style={[styles.searchInput, isDark && styles.searchInputDark]}
                placeholder="Search events..."
                placeholderTextColor="#8e8e93"
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={searchEvents}
                returnKeyType="search"
              />
            </View>
            
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
              <TouchableOpacity
                style={[
                  styles.categoryChip,
                  !selectedCategory && styles.categoryChipActive,
                  isDark && styles.categoryChipDark
                ]}
                onPress={() => filterByCategory(null)}
              >
                <Text style={[
                  styles.categoryChipText,
                  !selectedCategory && styles.categoryChipTextActive
                ]}>
                  All
                </Text>
              </TouchableOpacity>
              {eventCategories.map(category => {
                const IconComponent = category.icon;
                return (
                  <TouchableOpacity
                    key={category.id}
                    style={[
                      styles.categoryChip,
                      selectedCategory === category.id && styles.categoryChipActive,
                      isDark && styles.categoryChipDark
                    ]}
                    onPress={() => filterByCategory(category.id)}
                  >
                    <IconComponent size={14} color={selectedCategory === category.id ? '#ffffff' : category.color} />
                    <Text style={[
                      styles.categoryChipText,
                      selectedCategory === category.id && styles.categoryChipTextActive
                    ]}>
                      {category.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {loadingEvents ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#ff4757" />
            <Text style={[styles.loadingText, isDark && styles.loadingTextDark]}>Finding events near you...</Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.eventsScroll}>
            {events.length > 0 ? (
              events.slice(0, 10).map((event) => {
                const eventImage = event.images?.[0]?.url;
                const venue = event._embedded?.venues?.[0];
                const price = event.priceRanges?.[0];
                const isSaved = savedEvents.includes(event.id);
                
                return (
                  <TouchableOpacity
                    key={event.id}
                    style={[styles.eventCard, isDark && styles.eventCardDark]}
                    onPress={() => {
                      if (event.url) {
                        Linking.openURL(event.url);
                      }
                    }}
                    activeOpacity={0.9}
                  >
                    {eventImage && (
                      <Image
                        source={{ uri: eventImage }}
                        style={styles.eventImage}
                        resizeMode="cover"
                      />
                    )}
                    
                    <TouchableOpacity
                      style={styles.saveButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        toggleSaveEvent(event.id);
                      }}
                    >
                      {isSaved ? (
                        <BookmarkCheck size={20} color="#ff4757" />
                      ) : (
                        <Bookmark size={20} color="#ffffff" />
                      )}
                    </TouchableOpacity>
                    
                    <View style={styles.eventContent}>
                      <Text style={[styles.eventName, isDark && styles.eventNameDark]} numberOfLines={2}>
                        {event.name}
                      </Text>
                      
                      {venue && (
                        <View style={styles.eventVenue}>
                          <MapPin size={12} color="#8e8e93" />
                          <Text style={styles.eventVenueText} numberOfLines={1}>
                            {venue.name}
                          </Text>
                        </View>
                      )}
                      
                      <View style={styles.eventMeta}>
                        <View style={styles.eventDate}>
                          <Calendar size={12} color="#ff4757" />
                          <Text style={styles.eventDateText}>
                            {formatEventDate(event.dates.start.dateTime || event.dates.start.localDate)}
                          </Text>
                        </View>
                        
                        {price && (
                          <View style={styles.eventPrice}>
                            <DollarSign size={12} color="#4CAF50" />
                            <Text style={styles.eventPriceText}>
                              ${price.min}-${price.max}
                            </Text>
                          </View>
                        )}
                      </View>
                      
                      <TouchableOpacity
                        style={styles.eventButton}
                        onPress={() => {
                          if (event.url) {
                            Linking.openURL(event.url);
                          }
                        }}
                      >
                        <Text style={styles.eventButtonText}>Get Tickets</Text>
                        <ChevronRight size={14} color="#ffffff" />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                );
              })
            ) : (
              <View style={styles.noEvents}>
                <Calendar size={48} color="#8e8e93" />
                <Text style={[styles.noEventsText, isDark && styles.noEventsTextDark]}>No events found nearby</Text>
                <Text style={styles.noEventsSubtext}>Try expanding your search radius or check back later</Text>
              </View>
            )}
          </ScrollView>
        )}
      </View>

      {/* Live Feed - Enhanced and Animated */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.liveFeedHeader}>
            <Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>{t('liveFeed')}</Text>
            <View style={styles.liveIndicator}>
              <Animated.View style={[
                styles.liveDot,
                {
                  opacity: pulseAnim.interpolate({
                    inputRange: [1, 1.1],
                    outputRange: [0.5, 1],
                  }),
                },
              ]} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          </View>
          <Radio size={20} color="#ff4757" />
        </View>
        
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.liveFeedScroll}
        >
          {liveFeedItems.length > 0 ? (
            liveFeedItems.map((item) => {
              const config = ALERT_TYPE_CONFIG[item.type] || ALERT_TYPE_CONFIG.default;
              const IconComponent = config.icon;
              
              return (
                <Animated.View
                  key={item.id}
                  style={[
                    styles.liveFeedCard,
                    {
                      opacity: item.animation,
                      transform: [
                        {
                          translateY: item.animation.interpolate({
                            inputRange: [0, 1],
                            outputRange: [20, 0],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <TouchableOpacity
                    onPress={() => {
                      router.push({
                        pathname: '/alert-details/[id]',
                        params: { id: item.id },
                      });
                    }}
                  >
                    <LinearGradient
                      colors={[
                        item.type === 'sos' ? '#FF3B30' : 
                        item.type === 'event' ? '#FF9500' : 
                        '#AF52DE',
                        item.type === 'sos' ? '#FF6B6B' : 
                        item.type === 'event' ? '#FFB84D' : 
                        '#C77DFF',
                      ]}
                      style={styles.liveFeedGradient}
                    >
                      <View style={styles.liveFeedIconContainer}>
                        <IconComponent size={24} color="#ffffff" />
                      </View>
                      <Text style={styles.liveFeedType}>{config.label}</Text>
                      <Text style={styles.liveFeedAlert} numberOfLines={1}>
                        {item.alertType}
                      </Text>
                      {item.address && (
                        <Text style={styles.liveFeedLocation} numberOfLines={2}>
                          {item.address}
                        </Text>
                      )}
                      <View style={styles.liveFeedMeta}>
                        <MapPin size={10} color="rgba(255,255,255,0.7)" />
                        <Text style={styles.liveFeedDistance}>
                          {item.distance.toFixed(1)}km
                        </Text>
                        <Text style={styles.liveFeedTime}>
                          • {formatTimeAgo(new Date(item.timestamp))}
                        </Text>
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                </Animated.View>
              );
            })
          ) : (
            <View style={styles.emptyLiveFeed}>
              <Bell size={48} color="#8e8e93" />
              <Text style={styles.emptyStateText}>{t('noRecentActivity')}</Text>
              <Text style={styles.emptyStateSubtext}>{t('reportsWillAppear')}</Text>
            </View>
          )}
        </ScrollView>
      </View>

      {/* Achievement Modal */}
      <Modal
        visible={showAchievementModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAchievementModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowAchievementModal(false)}
        >
          <View style={styles.achievementModalContent}>
            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={() => setShowAchievementModal(false)}
            >
              <X size={24} color="#8e8e93" />
            </TouchableOpacity>
            
            {newAchievement ? (
              <View style={styles.newAchievementContainer}>
                <Sparkles size={48} color="#FFD93D" />
                <Text style={styles.newAchievementTitle}>Achievement Unlocked!</Text>
                <View style={styles.newAchievementBadge}>
                  {React.createElement(newAchievement.icon, { size: 32, color: '#FFD93D' })}
                </View>
                <Text style={styles.newAchievementName}>{newAchievement.title}</Text>
                <Text style={styles.newAchievementDescription}>{newAchievement.description}</Text>
                <View style={styles.newAchievementPoints}>
                  <Crown size={20} color="#FFD93D" />
                  <Text style={styles.newAchievementPointsText}>+{newAchievement.points} points</Text>
                </View>
              </View>
            ) : (
              <View>
                <Text style={styles.achievementsTitle}>Your Achievements</Text>
                <ScrollView style={styles.achievementsList}>
                  {achievements.map((achievement) => (
                    <View
                      key={achievement.id}
                      style={[
                        styles.achievementItem,
                        achievement.unlocked && styles.achievementItemUnlocked
                      ]}
                    >
                      <View style={[
                        styles.achievementIcon,
                        achievement.unlocked && styles.achievementIconUnlocked
                      ]}>
                        {React.createElement(achievement.icon, { 
                          size: 24, 
                          color: achievement.unlocked ? '#FFD93D' : '#8e8e93' 
                        })}
                      </View>
                      <View style={styles.achievementDetails}>
                        <Text style={[
                          styles.achievementName,
                          !achievement.unlocked && styles.achievementNameLocked
                        ]}>
                          {achievement.title}
                        </Text>
                        <Text style={styles.achievementDesc}>{achievement.description}</Text>
                        <View style={styles.achievementProgress}>
                          <View style={styles.achievementProgressBar}>
                            <View 
                              style={[
                                styles.achievementProgressFill,
                                { width: `${(achievement.progress / achievement.total) * 100}%` }
                              ]} 
                            />
                          </View>
                          <Text style={styles.achievementProgressText}>
                            {achievement.progress}/{achievement.total}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.achievementReward}>
                        <Crown size={16} color={achievement.unlocked ? '#FFD93D' : '#8e8e93'} />
                        <Text style={[
                          styles.achievementRewardText,
                          achievement.unlocked && styles.achievementRewardTextUnlocked
                        ]}>
                          {achievement.points}
                        </Text>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFBFD',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 32,
    paddingHorizontal: 24,
    backgroundColor: 'transparent',
    borderBottomWidth: 0,
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff5f5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
    marginLeft: 0,
    maxWidth: 120,
  },
  locationText: {
    fontSize: 11,
    color: '#ff4757',
    fontWeight: '600',
    paddingRight: 4,
    flexShrink: 1,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '300',
    color: '#1C1C1E',
    marginBottom: 8,
    letterSpacing: -1,
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#8E8E93',
    marginBottom: 24,
    fontWeight: '400',
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  scoreCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 8,
  },
  scoreNumber: {
    fontSize: 36,
    fontWeight: '200',
    color: '#007AFF',
  },
  scoreLabel: {
    fontSize: 10,
    color: '#8e8e93',
    maxWidth: 80,
    textAlign: 'center',
  },
  dominantVibeContainer: {
    flex: 1,
  },
  dominantLabel: {
    fontSize: 12,
    color: '#8e8e93',
    marginBottom: 6,
  },
  dominantBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  dominantText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  timeRangeContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    borderWidth: 0,
  },
  timeRangeButtonActive: {
    backgroundColor: '#ff4757',
  },
  timeRangeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8e8e93',
  },
  timeRangeTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    letterSpacing: -0.3,
  },
  vibeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
  },
  vibeCard: {
    width: (width - 56) / 3,
    aspectRatio: 1,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
  },
  vibeCardGradient: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  vibeCardLabel: {
    fontSize: 11,
    color: '#ffffff',
    fontWeight: '600',
  },
  vibeCardCount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  vibeCardPercentage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  vibeCardPercentageText: {
    fontSize: 10,
    color: '#ffffff',
    opacity: 0.9,
  },
  neighborhoodCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 16,
    elevation: 2,
  },
  neighborhoodHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  neighborhoodName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  neighborhoodMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  neighborhoodDistance: {
    fontSize: 12,
    color: '#8e8e93',
  },
  neighborhoodReports: {
    fontSize: 12,
    color: '#8e8e93',
  },
  neighborhoodScore: {
    alignItems: 'flex-end',
  },
  neighborhoodScoreNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 4,
  },
  neighborhoodVibeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  neighborhoodVibeBadgeText: {
    fontSize: 10,
    color: '#ffffff',
    fontWeight: '600',
  },
  neighborhoodBar: {
    height: 4,
    backgroundColor: '#f0f0f0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  neighborhoodBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  activityList: {
    gap: 12,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ff4757',
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 14,
    color: '#000000',
  },
  activityTime: {
    fontSize: 12,
    color: '#8e8e93',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#000000',
    fontWeight: '600',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#8e8e93',
    marginTop: 4,
  },
  liveFeedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ff4757',
  },
  liveText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#ff4757',
    letterSpacing: 1,
  },
  liveFeedScroll: {
    marginTop: 16,
    marginHorizontal: -20,
  },
  liveFeedCard: {
    width: 150,
    marginLeft: 20,
  },
  liveFeedGradient: {
    padding: 18,
    borderRadius: 24,
    minHeight: 180,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  liveFeedIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  liveFeedType: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  liveFeedAlert: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  liveFeedLocation: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 8,
    lineHeight: 14,
  },
  liveFeedMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 'auto',
  },
  liveFeedDistance: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  liveFeedTime: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  emptyLiveFeed: {
    width: width - 40,
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 20,
  },
  historyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255, 71, 87, 0.1)',
    borderRadius: 16,
  },
  historyButtonText: {
    fontSize: 12,
    color: '#ff4757',
    fontWeight: '600',
  },
  expirationBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  expirationText: {
    fontSize: 9,
    color: '#ffffff',
    fontWeight: '600',
  },
  historyContainer: {
    maxHeight: 300,
    marginTop: 16,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  historyIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyContent: {
    flex: 1,
  },
  historyVibe: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },
  historyAddress: {
    fontSize: 12,
    color: '#8e8e93',
    marginBottom: 2,
  },
  historyTime: {
    fontSize: 11,
    color: '#8e8e93',
  },
  emptyHistory: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyHistoryText: {
    fontSize: 16,
    color: '#000000',
    fontWeight: '600',
    marginTop: 12,
  },
  emptyHistorySubtext: {
    fontSize: 14,
    color: '#8e8e93',
    marginTop: 4,
    textAlign: 'center',
  },
  // Dark mode styles
  containerDark: {
    backgroundColor: '#000000',
  },
  headerDark: {
    backgroundColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  headerTitleDark: {
    color: '#ffffff',
  },
  headerSubtitleDark: {
    color: '#b0b0b0',
  },
  scoreCircleDark: {
    backgroundColor: '#1C1C1E',
    borderColor: 'transparent',
  },
  scoreNumberDark: {
    color: '#ffffff',
  },
  scoreLabelDark: {
    color: '#b0b0b0',
  },
  dominantLabelDark: {
    color: '#b0b0b0',
  },
  sectionTitleDark: {
    color: '#ffffff',
  },
  neighborhoodCardDark: {
    backgroundColor: '#1C1C1E',
  },
  neighborhoodNameDark: {
    color: '#ffffff',
  },
  neighborhoodScoreNumberDark: {
    color: '#ffffff',
  },
  // Event styles
  eventSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchToggle: {
    padding: 8,
    backgroundColor: 'rgba(255, 71, 87, 0.1)',
    borderRadius: 20,
  },
  searchContainer: {
    marginTop: 12,
    marginBottom: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    marginBottom: 12,
  },
  searchBarDark: {
    backgroundColor: '#1C1C1E',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#000000',
  },
  searchInputDark: {
    color: '#ffffff',
  },
  categoryScroll: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    marginRight: 8,
  },
  categoryChipDark: {
    backgroundColor: '#2C2C2E',
  },
  categoryChipActive: {
    backgroundColor: '#ff4757',
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
  },
  categoryChipTextActive: {
    color: '#ffffff',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#8e8e93',
  },
  loadingTextDark: {
    color: '#b0b0b0',
  },
  eventsScroll: {
    marginHorizontal: -20,
    paddingVertical: 8,
  },
  eventCard: {
    width: 280,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    marginLeft: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    overflow: 'hidden',
  },
  eventCardDark: {
    backgroundColor: '#1C1C1E',
  },
  eventImage: {
    width: '100%',
    height: 160,
    backgroundColor: '#f5f5f5',
  },
  saveButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventContent: {
    padding: 16,
  },
  eventName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 8,
    lineHeight: 20,
  },
  eventNameDark: {
    color: '#ffffff',
  },
  eventVenue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  eventVenueText: {
    fontSize: 13,
    color: '#8e8e93',
    flex: 1,
  },
  eventMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  eventDate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  eventDateText: {
    fontSize: 12,
    color: '#ff4757',
    fontWeight: '600',
  },
  eventPrice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  eventPriceText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
  },
  eventButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#ff4757',
    paddingVertical: 10,
    borderRadius: 12,
  },
  eventButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  noEvents: {
    width: width - 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    marginLeft: 20,
  },
  noEventsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginTop: 12,
  },
  noEventsTextDark: {
    color: '#ffffff',
  },
  noEventsSubtext: {
    fontSize: 14,
    color: '#8e8e93',
    marginTop: 4,
    textAlign: 'center',
  },
  // Gamification styles
  gamificationSection: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  moodCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  moodCardDark: {
    backgroundColor: '#1C1C1E',
  },
  moodTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
  },
  moodTitleDark: {
    color: '#ffffff',
  },
  moodOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  moodButton: {
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
  },
  moodButtonDark: {
    backgroundColor: '#2C2C2E',
  },
  moodEmoji: {
    fontSize: 28,
  },
  moodReward: {
    fontSize: 12,
    color: '#4CAF50',
    textAlign: 'center',
    fontWeight: '600',
  },
  moodRewardDark: {
    color: '#4CAF50',
  },
  statsBar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statsBarDark: {
    backgroundColor: '#1C1C1E',
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
  },
  statValueDark: {
    color: '#ffffff',
  },
  statLabel: {
    fontSize: 11,
    color: '#8e8e93',
  },
  statLabelDark: {
    color: '#b0b0b0',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 12,
  },
  weeklyGoalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  weeklyGoalCardDark: {
    backgroundColor: '#1C1C1E',
  },
  weeklyGoalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  weeklyGoalTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
  weeklyGoalTitleDark: {
    color: '#ffffff',
  },
  weeklyGoalProgress: {
    fontSize: 13,
    color: '#8e8e93',
    fontWeight: '600',
  },
  weeklyGoalProgressDark: {
    color: '#b0b0b0',
  },
  weeklyGoalBar: {
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  weeklyGoalFill: {
    height: '100%',
    backgroundColor: '#FF6B6B',
    borderRadius: 4,
  },
  challengesContainer: {
    marginBottom: 16,
  },
  challengesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  challengesTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  challengesTitleDark: {
    color: '#ffffff',
  },
  challengeTimer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(142, 142, 147, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  challengeTimerText: {
    fontSize: 11,
    color: '#8e8e93',
    fontWeight: '600',
  },
  challengeCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  challengeCardDark: {
    backgroundColor: '#2C2C2E',
    borderColor: '#3C3C3E',
  },
  challengeCardCompleted: {
    opacity: 0.7,
    borderColor: '#4CAF50',
  },
  challengeContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  challengeInfo: {
    flex: 1,
  },
  challengeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },
  challengeTitleDark: {
    color: '#ffffff',
  },
  challengeTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#8e8e93',
  },
  challengeDescription: {
    fontSize: 12,
    color: '#8e8e93',
  },
  challengeDescriptionDark: {
    color: '#b0b0b0',
  },
  challengePoints: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 217, 61, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  challengePointsCompleted: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  challengePointsText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFD93D',
  },
  // Achievement Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  achievementModalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    width: '90%',
    maxHeight: '80%',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1,
  },
  newAchievementContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  newAchievementTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000000',
    marginTop: 16,
    marginBottom: 20,
  },
  newAchievementBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 217, 61, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  newAchievementName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  newAchievementDescription: {
    fontSize: 14,
    color: '#8e8e93',
    textAlign: 'center',
    marginBottom: 20,
  },
  newAchievementPoints: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 217, 61, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  newAchievementPointsText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFD93D',
  },
  achievementsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 20,
    textAlign: 'center',
  },
  achievementsList: {
    maxHeight: 400,
  },
  achievementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
    marginBottom: 12,
    opacity: 0.7,
  },
  achievementItemUnlocked: {
    backgroundColor: 'rgba(255, 217, 61, 0.1)',
    opacity: 1,
  },
  achievementIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  achievementIconUnlocked: {
    backgroundColor: 'rgba(255, 217, 61, 0.2)',
  },
  achievementDetails: {
    flex: 1,
  },
  achievementName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },
  achievementNameLocked: {
    color: '#8e8e93',
  },
  achievementDesc: {
    fontSize: 12,
    color: '#8e8e93',
    marginBottom: 6,
  },
  achievementProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  achievementProgressBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  achievementProgressFill: {
    height: '100%',
    backgroundColor: '#FFD93D',
    borderRadius: 2,
  },
  achievementProgressText: {
    fontSize: 11,
    color: '#8e8e93',
    fontWeight: '600',
  },
  achievementReward: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  achievementRewardText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#8e8e93',
  },
  achievementRewardTextUnlocked: {
    color: '#FFD93D',
  },
});
