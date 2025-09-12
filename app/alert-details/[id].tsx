import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, MapPin, Clock, User, AlertTriangle, CheckCircle, Heart, Shield, Map } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useSettings } from '@/contexts/SettingsContext';

export default function AlertDetailsScreen() {
  const { id } = useLocalSearchParams();
  const { t } = useSettings();
  const [loading, setLoading] = useState(true);
  const [alertData, setAlertData] = useState<any>(null);

  useEffect(() => {
    loadAlertDetails();
  }, [id]);

  const loadAlertDetails = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        console.error('Error loading alert details:', error);
        // Fallback to basic data if not found
        setAlertData({
          id,
          type: 'Unknown',
          report_type: 'event',
          description: 'Alert details not available',
          location: { latitude: 0, longitude: 0 },
          timestamp: new Date().toISOString(),
        });
      } else {
        setAlertData(data);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('viewDetails')}</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
        </View>
      </SafeAreaView>
    );
  }

  if (!alertData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('viewDetails')}</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Alert not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const getReportTypeIcon = () => {
    switch (alertData?.report_type) {
      case 'vibe':
        return <Heart size={24} color="#4CAF50" />;
      case 'event':
        return <AlertTriangle size={24} color="#FF9800" />;
      case 'sos':
        return <Shield size={24} color="#FF0000" />;
      default:
        return <AlertTriangle size={24} color="#999" />;
    }
  };

  const getReportTypeColor = () => {
    switch (alertData?.report_type) {
      case 'vibe':
        return '#4CAF50';
      case 'event':
        return '#FF9800';
      case 'sos':
        return '#FF0000';
      default:
        return '#999';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Alert Details</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.alertHeader}>
          <View style={styles.alertTypeContainer}>
            {getReportTypeIcon()}
            <View style={styles.alertTypeInfo}>
              <Text style={styles.alertType}>{alertData.type || alertData.report_type}</Text>
              <View style={styles.badges}>
                <View style={[styles.severityBadge, { backgroundColor: getReportTypeColor() + '20' }]}>
                  <Text style={[styles.severityText, { color: getReportTypeColor() }]}>
                    {alertData.report_type === 'vibe' ? 'Vibe' : alertData.report_type === 'event' ? 'Event' : 'SOS'}
                  </Text>
                </View>
                {alertData.anonymous && (
                  <View style={styles.statusBadge}>
                    <User size={14} color="#666" />
                    <Text style={styles.statusText}>Anonymous</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{alertData.description}</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Location</Text>
            {alertData.location && (
              <TouchableOpacity
                style={styles.viewMapButton}
                onPress={() => {
                  router.push({
                    pathname: '/(tabs)/map',
                    params: {
                      focusLat: alertData.location.latitude,
                      focusLng: alertData.location.longitude,
                      alertId: alertData.id,
                      alertType: alertData.report_type,
                    },
                  });
                }}
              >
                <Map size={16} color="#fff" />
                <Text style={styles.viewMapButtonText}>View on Map</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.infoRow}>
            <MapPin size={18} color="#666" />
            <Text style={styles.infoText}>
              {alertData.location ? 
                `${alertData.location.latitude.toFixed(4)}, ${alertData.location.longitude.toFixed(4)}` : 
                'Location not available'
              }
            </Text>
          </View>
        </View>

        {alertData.tags && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tags</Text>
            <View style={styles.tagsContainer}>
              {alertData.tags.split(',').map((tag: string, index: number) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{tag.trim()}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.reportInfo}>
          <Text style={styles.reportInfoTitle}>Report Information</Text>
          <View style={styles.infoRow}>
            <User size={16} color="#999" />
            <Text style={styles.reportInfoText}>
              Reported by: {alertData.anonymous ? 'Anonymous' : alertData.user_id || 'Unknown'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Clock size={16} color="#999" />
            <Text style={styles.reportInfoText}>
              Reported at: {formatDate(alertData.timestamp || alertData.created_at)}
            </Text>
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
  content: {
    flex: 1,
  },
  alertHeader: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  alertTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  alertTypeInfo: {
    flex: 1,
    marginLeft: 12,
  },
  alertType: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  badges: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  severityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 10,
  },
  severityText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#e8f5e9',
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
    marginLeft: 4,
  },
  section: {
    backgroundColor: '#fff',
    padding: 20,
    marginTop: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  viewMapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  viewMapButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 10,
    flex: 1,
  },
  timeline: {
    position: 'relative',
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 20,
    position: 'relative',
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
    marginRight: 15,
    marginTop: 3,
  },
  timelineLine: {
    position: 'absolute',
    left: 5,
    top: 15,
    width: 2,
    height: 25,
    backgroundColor: '#e0e0e0',
  },
  timelineContent: {
    flex: 1,
  },
  timelineTime: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  timelineMessage: {
    fontSize: 14,
    color: '#333',
  },
  responderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  responderText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 10,
  },
  image: {
    width: 200,
    height: 150,
    borderRadius: 8,
    marginRight: 10,
  },
  reportInfo: {
    backgroundColor: '#f5f5f5',
    padding: 20,
    marginTop: 10,
  },
  reportInfoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 10,
  },
  reportInfoText: {
    fontSize: 13,
    color: '#999',
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagText: {
    fontSize: 12,
    color: '#666',
  },
});
