import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
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
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAlerts } from '@/contexts/AlertContext';
import { useLocation } from '@/contexts/LocationContext';

const { width } = Dimensions.get('window');

const VIBE_COLORS = {
  safe: { gradient: ['#4CAF50', '#66BB6A'] as const, icon: Shield, label: 'Safe' },
  calm: { gradient: ['#2196F3', '#42A5F5'] as const, icon: Heart, label: 'Calm' },
  crowded: { gradient: ['#FFC107', '#FFD54F'] as const, icon: Users, label: 'Crowded' },
  suspicious: { gradient: ['#FF9800', '#FFB74D'] as const, icon: AlertTriangle, label: 'Suspicious' },
  dangerous: { gradient: ['#F44336', '#EF5350'] as const, icon: AlertTriangle, label: 'Dangerous' },
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
}

export default function CommunityPulseScreen() {
  const { alerts } = useAlerts();
  const { location } = useLocation();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState<'24h' | '7d' | '30d'>('24h');
  const [vibeData, setVibeData] = useState<VibeData[]>([]);
  const [neighborhoodVibes, setNeighborhoodVibes] = useState<NeighborhoodVibe[]>([]);

  useEffect(() => {
    calculateVibeData();
    calculateNeighborhoodVibes();
  }, [alerts, selectedTimeRange]);

  const calculateVibeData = () => {
    const now = new Date();
    const timeFilter = {
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
    };

    const filteredAlerts = alerts.filter(alert => {
      const alertTime = new Date(alert.timestamp);
      return (now.getTime() - alertTime.getTime()) < timeFilter[selectedTimeRange];
    });

    const vibeAlerts = filteredAlerts.filter(alert => alert.reportType === 'vibe');
    const vibeCounts: Record<string, number> = {};
    
    vibeAlerts.forEach(alert => {
      const type = alert.type || 'safe';
      vibeCounts[type] = (vibeCounts[type] || 0) + 1;
    });

    const total = vibeAlerts.length || 1;
    const data: VibeData[] = Object.keys(VIBE_COLORS).map(type => ({
      type,
      count: vibeCounts[type] || 0,
      percentage: ((vibeCounts[type] || 0) / total) * 100,
      trend: Math.random() > 0.5 ? 'up' : Math.random() > 0.5 ? 'down' : 'stable',
      lastReported: vibeCounts[type] ? formatTimeAgo(new Date()) : 'Never',
    }));

    setVibeData(data);
  };

  const calculateNeighborhoodVibes = () => {
    // Simulate neighborhood data based on location
    const neighborhoods: NeighborhoodVibe[] = [
      {
        name: 'Downtown',
        dominantVibe: 'crowded',
        vibeScore: 72,
        reportCount: 45,
        distance: 0.5,
      },
      {
        name: 'Central Park',
        dominantVibe: 'safe',
        vibeScore: 89,
        reportCount: 32,
        distance: 1.2,
      },
      {
        name: 'Financial District',
        dominantVibe: 'calm',
        vibeScore: 78,
        reportCount: 28,
        distance: 2.1,
      },
      {
        name: 'Brooklyn Heights',
        dominantVibe: 'safe',
        vibeScore: 85,
        reportCount: 19,
        distance: 3.5,
      },
      {
        name: 'Times Square',
        dominantVibe: 'crowded',
        vibeScore: 65,
        reportCount: 67,
        distance: 1.8,
      },
    ];

    setNeighborhoodVibes(neighborhoods.sort((a, b) => a.distance - b.distance));
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const onRefresh = () => {
    setRefreshing(true);
    calculateVibeData();
    calculateNeighborhoodVibes();
    setTimeout(() => setRefreshing(false), 1000);
  };

  const getDominantVibe = () => {
    const dominant = vibeData.reduce((prev, current) => 
      (prev.count > current.count) ? prev : current
    , vibeData[0]);
    return dominant?.type || 'safe';
  };

  const getOverallScore = () => {
    const weights = { safe: 100, calm: 85, crowded: 60, suspicious: 30, dangerous: 10 };
    let totalScore = 0;
    let totalCount = 0;

    vibeData.forEach(vibe => {
      const weight = weights[vibe.type as keyof typeof weights] || 50;
      totalScore += weight * vibe.count;
      totalCount += vibe.count;
    });

    return totalCount > 0 ? Math.round(totalScore / totalCount) : 75;
  };

  return (
    <ScrollView 
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header with Overall Score */}
      <LinearGradient
        colors={['#1a1a2e', '#16213e']}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Community Pulse</Text>
        <Text style={styles.headerSubtitle}>Real-time neighborhood vibes</Text>
        
        <View style={styles.scoreContainer}>
          <View style={styles.scoreCircle}>
            <Text style={styles.scoreNumber}>{getOverallScore()}</Text>
            <Text style={styles.scoreLabel}>Vibe Score</Text>
          </View>
          
          <View style={styles.dominantVibeContainer}>
            <Text style={styles.dominantLabel}>Current Vibe</Text>
            <LinearGradient
              colors={VIBE_COLORS[getDominantVibe() as keyof typeof VIBE_COLORS].gradient}
              style={styles.dominantBadge}
            >
              <Text style={styles.dominantText}>
                {VIBE_COLORS[getDominantVibe() as keyof typeof VIBE_COLORS].label}
              </Text>
            </LinearGradient>
          </View>
        </View>
      </LinearGradient>

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
              {range === '24h' ? 'Last 24 Hours' : range === '7d' ? 'Last 7 Days' : 'Last 30 Days'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Vibe Distribution */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Vibe Distribution</Text>
        <View style={styles.vibeGrid}>
          {vibeData.map(vibe => {
            const config = VIBE_COLORS[vibe.type as keyof typeof VIBE_COLORS];
            const IconComponent = config.icon;
            
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
                </LinearGradient>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Neighborhood Vibes */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Nearby Areas</Text>
          <Activity size={20} color="#ff4757" />
        </View>
        
        {neighborhoodVibes.map((neighborhood, index) => {
          const config = VIBE_COLORS[neighborhood.dominantVibe as keyof typeof VIBE_COLORS];
          
          return (
            <View key={index} style={styles.neighborhoodCard}>
              <View style={styles.neighborhoodHeader}>
                <View>
                  <Text style={styles.neighborhoodName}>{neighborhood.name}</Text>
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
                  <Text style={styles.neighborhoodScoreNumber}>
                    {neighborhood.vibeScore}
                  </Text>
                  <LinearGradient
                    colors={config.gradient}
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
                  colors={config.gradient}
                  style={[styles.neighborhoodBarFill, { width: `${neighborhood.vibeScore}%` }]}
                />
              </View>
            </View>
          );
        })}
      </View>

      {/* Recent Activity */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Live Feed</Text>
          <Clock size={20} color="#ff4757" />
        </View>
        
        <View style={styles.activityList}>
          {alerts.slice(0, 5).map((alert, index) => (
            <View key={index} style={styles.activityItem}>
              <View style={styles.activityDot} />
              <View style={styles.activityContent}>
                <Text style={styles.activityText}>
                  {alert.type} reported in your area
                </Text>
                <Text style={styles.activityTime}>
                  {formatTimeAgo(new Date(alert.timestamp))}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f7f7',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#8e8e93',
    marginBottom: 24,
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
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#ff4757',
  },
  scoreNumber: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  scoreLabel: {
    fontSize: 12,
    color: '#8e8e93',
  },
  dominantVibeContainer: {
    flex: 1,
  },
  dominantLabel: {
    fontSize: 14,
    color: '#8e8e93',
    marginBottom: 8,
  },
  dominantBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  dominantText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
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
    borderRadius: 20,
    backgroundColor: '#ffffff',
    alignItems: 'center',
  },
  timeRangeButtonActive: {
    backgroundColor: '#ff4757',
  },
  timeRangeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8e8e93',
  },
  timeRangeTextActive: {
    color: '#ffffff',
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
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
  },
  vibeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
  },
  vibeCard: {
    width: (width - 52) / 3,
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
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
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
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
});
