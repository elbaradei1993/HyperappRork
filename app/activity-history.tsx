import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, AlertTriangle, MapPin, Clock, Filter, Heart, Shield } from 'lucide-react-native';
import { router } from 'expo-router';
import { useAlerts } from '@/contexts/AlertContext';
import { useAuth } from '@/contexts/AuthContext';

interface ActivityItem {
  id: string;
  type: 'vibe' | 'event' | 'sos';
  title: string;
  description: string;
  location: string;
  timestamp: string;
  status: 'resolved' | 'pending' | 'active';
  alert_type?: string;
  latitude?: number;
  longitude?: number;
}

export default function ActivityHistoryScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'vibe' | 'event' | 'sos'>('all');
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const { alerts } = useAlerts();
  const { user } = useAuth();

  useEffect(() => {
    loadActivities();
  }, [alerts, user]);

  const loadActivities = async () => {
    // Convert alerts to activity items
    // Show all alerts for now since we want to see community activity
    const userAlerts = alerts;

    const activityItems: ActivityItem[] = userAlerts.map(alert => {
      const formatTimeAgo = (timestamp: string) => {
        const now = new Date();
        const alertTime = new Date(timestamp);
        const diff = now.getTime() - alertTime.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 60) return `${minutes} minutes ago`;
        if (hours < 24) return `${hours} hours ago`;
        return `${days} days ago`;
      };

      const getLocationString = async (lat: number, lng: number) => {
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
          );
          const data = await response.json();
          if (data.address) {
            const parts = [];
            if (data.address.road) parts.push(data.address.road);
            if (data.address.suburb) parts.push(data.address.suburb);
            return parts.join(', ') || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
          }
        } catch (error) {
          console.error('Error getting address:', error);
        }
        return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      };

      return {
        id: alert.id,
        type: alert.reportType as 'vibe' | 'event' | 'sos',
        title: alert.reportType === 'vibe' 
          ? `${alert.alert_type} vibe reported`
          : alert.reportType === 'sos'
          ? 'SOS Alert Triggered'
          : `${alert.alert_type} event reported`,
        description: alert.description || `${alert.alert_type} reported at this location`,
        location: `${alert.location.latitude.toFixed(4)}, ${alert.location.longitude.toFixed(4)}`,
        timestamp: formatTimeAgo(alert.timestamp || new Date().toISOString()),
        status: 'active' as const,
        alert_type: alert.alert_type,
        latitude: alert.location.latitude,
        longitude: alert.location.longitude,
      };
    });

    // Sort by timestamp (most recent first)
    activityItems.sort((a, b) => {
      const getMinutes = (timeStr: string) => {
        const match = timeStr.match(/(\d+)\s*(minute|hour|day)/);
        if (!match) return 0;
        const value = parseInt(match[1]);
        const unit = match[2];
        if (unit.includes('minute')) return value;
        if (unit.includes('hour')) return value * 60;
        if (unit.includes('day')) return value * 1440;
        return 0;
      };
      return getMinutes(a.timestamp) - getMinutes(b.timestamp);
    });

    setActivities(activityItems);
  };

  const filteredActivities = filter === 'all' 
    ? activities 
    : activities.filter(a => a.type === filter);

  const stats = {
    vibes: activities.filter(a => a.type === 'vibe').length,
    events: activities.filter(a => a.type === 'event').length,
    sos: activities.filter(a => a.type === 'sos').length,
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadActivities();
    setRefreshing(false);
  };

  const getActivityIcon = (type: string, alertType?: string) => {
    if (type === 'vibe') {
      const vibeEmojis: Record<string, string> = {
        safe: '🛡️',
        calm: '😌',
        crowded: '👥',
        suspicious: '🤔',
        dangerous: '⚠️',
        lgbtqia: '🏳️‍🌈',
      };
      return vibeEmojis[alertType || ''] || '💭';
    }
    switch (type) {
      case 'event':
        return '📍';
      case 'sos':
        return '🆘';
      default:
        return '📝';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved':
        return '#4CAF50';
      case 'pending':
        return '#FF9800';
      case 'active':
        return '#2196F3';
      default:
        return '#999';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Activity History</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {['all', 'vibe', 'event', 'sos'].map((filterType) => (
            <TouchableOpacity
              key={filterType}
              style={[
                styles.filterButton,
                filter === filterType && styles.filterButtonActive,
              ]}
              onPress={() => setFilter(filterType as any)}
            >
              <Text style={[
                styles.filterText,
                filter === filterType && styles.filterTextActive,
              ]}>
                {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredActivities.length === 0 ? (
          <View style={styles.emptyState}>
            <Clock size={48} color="#ccc" />
            <Text style={styles.emptyText}>No activities found</Text>
          </View>
        ) : (
          filteredActivities.map((activity) => (
            <TouchableOpacity
              key={activity.id}
              style={styles.activityCard}
              onPress={() => router.push(`/alert-details/${activity.id}` as any)}
            >
              <View style={styles.activityHeader}>
                <Text style={styles.activityIcon}>{getActivityIcon(activity.type, activity.alert_type)}</Text>
                <View style={styles.activityInfo}>
                  <Text style={styles.activityTitle}>{activity.title}</Text>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(activity.status) + '20' }
                  ]}>
                    <Text style={[
                      styles.statusText,
                      { color: getStatusColor(activity.status) }
                    ]}>
                      {activity.status.toUpperCase()}
                    </Text>
                  </View>
                </View>
              </View>
              <Text style={styles.activityDescription}>{activity.description}</Text>
              <View style={styles.activityMeta}>
                <TouchableOpacity 
                  style={styles.metaItem}
                  onPress={() => {
                    if (activity.latitude && activity.longitude) {
                      router.push({
                        pathname: '/(tabs)/map',
                        params: {
                          focusLat: activity.latitude,
                          focusLng: activity.longitude,
                        },
                      });
                    }
                  }}
                >
                  <MapPin size={14} color="#666" />
                  <Text style={[styles.metaText, { textDecorationLine: 'underline' }]}>{activity.location}</Text>
                </TouchableOpacity>
                <View style={styles.metaItem}>
                  <Clock size={14} color="#666" />
                  <Text style={styles.metaText}>{activity.timestamp}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}

        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>Your Impact</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.vibes}</Text>
              <Text style={styles.statLabel}>Vibes</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.events}</Text>
              <Text style={styles.statLabel}>Events</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.sos}</Text>
              <Text style={styles.statLabel}>SOS Alerts</Text>
            </View>
          </View>
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
  placeholder: {
    width: 34,
  },
  filterContainer: {
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    marginRight: 10,
  },
  filterButtonActive: {
    backgroundColor: '#4CAF50',
  },
  filterText: {
    fontSize: 14,
    color: '#666',
  },
  filterTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 15,
  },
  activityCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  activityIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  activityInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  activityDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  activityMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 12,
    color: '#999',
    marginLeft: 5,
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
  },
  statsCard: {
    backgroundColor: '#e8f5e9',
    borderRadius: 12,
    padding: 20,
    marginTop: 20,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2e7d32',
    marginBottom: 15,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2e7d32',
  },
  statLabel: {
    fontSize: 12,
    color: '#2e7d32',
    marginTop: 4,
  },
});
