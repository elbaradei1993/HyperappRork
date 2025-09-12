import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ProgressBarAndroid,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Trophy, Star, Shield, Heart, Users, MapPin, Clock } from 'lucide-react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  progress: number;
  total: number;
  unlocked: boolean;
  category: string;
  points: number;
}

export default function AchievementsScreen() {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [userStats, setUserStats] = useState({
    totalReports: 0,
    vibesReported: 0,
    eventsReported: 0,
    sosReported: 0,
    uniqueLocations: 0,
    nightReports: 0,
  });

  useEffect(() => {
    loadUserStats();
  }, [user]);

  const loadUserStats = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Load user's alerts from Supabase
      const { data: alerts, error } = await supabase
        .from('alerts')
        .select('*')
        .eq('user_id', user.id);
      
      if (error) {
        console.error('Error loading user stats:', error);
      } else if (alerts) {
        // Calculate stats from real data
        const vibes = alerts.filter((a: any) => a.report_type === 'vibe').length;
        const events = alerts.filter((a: any) => a.report_type === 'event').length;
        const sos = alerts.filter((a: any) => a.report_type === 'sos').length;
        const totalReports = alerts.length;
        
        // Count unique locations (simplified - based on rounded coordinates)
        const uniqueLocations = new Set(
          alerts.map((a: any) => 
            `${Math.round(a.location?.latitude || 0)},${Math.round(a.location?.longitude || 0)}`
          )
        ).size;
        
        // Count night reports (after 10 PM)
        const nightReports = alerts.filter((a: any) => {
          const hour = new Date(a.created_at || a.timestamp).getHours();
          return hour >= 22 || hour < 6;
        }).length;
        
        setUserStats({
          totalReports,
          vibesReported: vibes,
          eventsReported: events,
          sosReported: sos,
          uniqueLocations,
          nightReports,
        });
        
        // Generate achievements based on real stats
        const generatedAchievements: Achievement[] = [
          {
            id: '1',
            title: 'First Responder',
            description: 'Report your first incident',
            icon: <Shield size={24} color="#4CAF50" />,
            progress: Math.min(totalReports, 1),
            total: 1,
            unlocked: totalReports >= 1,
            category: 'Reporting',
            points: 10,
          },
          {
            id: '2',
            title: 'Community Helper',
            description: 'Report 10 incidents',
            icon: <Users size={24} color="#2196F3" />,
            progress: Math.min(totalReports, 10),
            total: 10,
            unlocked: totalReports >= 10,
            category: 'Reporting',
            points: 50,
          },
          {
            id: '3',
            title: 'Safety Champion',
            description: 'Report 50 incidents',
            icon: <Trophy size={24} color="#FFD700" />,
            progress: Math.min(totalReports, 50),
            total: 50,
            unlocked: totalReports >= 50,
            category: 'Reporting',
            points: 200,
          },
          {
            id: '4',
            title: 'Life Saver',
            description: 'Use SOS feature',
            icon: <Heart size={24} color="#FF5722" />,
            progress: Math.min(sos, 1),
            total: 1,
            unlocked: sos >= 1,
            category: 'Emergency',
            points: 100,
          },
          {
            id: '5',
            title: 'Explorer',
            description: 'Check safety in 10 different locations',
            icon: <MapPin size={24} color="#9C27B0" />,
            progress: Math.min(uniqueLocations, 10),
            total: 10,
            unlocked: uniqueLocations >= 10,
            category: 'Exploration',
            points: 30,
          },
          {
            id: '6',
            title: 'Night Watch',
            description: 'Report an incident after 10 PM',
            icon: <Clock size={24} color="#607D8B" />,
            progress: Math.min(nightReports, 1),
            total: 1,
            unlocked: nightReports >= 1,
            category: 'Special',
            points: 25,
          },
          {
            id: '7',
            title: 'Vibe Checker',
            description: 'Report 5 vibes',
            icon: <Star size={24} color="#4CAF50" />,
            progress: Math.min(vibes, 5),
            total: 5,
            unlocked: vibes >= 5,
            category: 'Vibes',
            points: 20,
          },
          {
            id: '8',
            title: 'Event Spotter',
            description: 'Report 5 events',
            icon: <Shield size={24} color="#FF9800" />,
            progress: Math.min(events, 5),
            total: 5,
            unlocked: events >= 5,
            category: 'Events',
            points: 25,
          },
        ];
        
        setAchievements(generatedAchievements);
      }
    } catch (error) {
      console.error('Error loading achievements:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalPoints = achievements
    .filter(a => a.unlocked)
    .reduce((sum, a) => sum + a.points, 0);

  const renderProgressBar = (progress: number, total: number) => {
    const percentage = (progress / total) * 100;
    
    if (Platform.OS === 'android') {
      return (
        <ProgressBarAndroid
          styleAttr="Horizontal"
          indeterminate={false}
          progress={progress / total}
          color="#4CAF50"
          style={styles.progressBarAndroid}
        />
      );
    }
    
    return (
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${percentage}%` }]} />
      </View>
    );
  };

  const categories = [...new Set(achievements.map(a => a.category))];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Achievements</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.statsCard}>
          <Trophy size={32} color="#FFD700" />
          <View style={styles.statsInfo}>
            <Text style={styles.statsPoints}>{totalPoints}</Text>
            <Text style={styles.statsLabel}>Total Points</Text>
          </View>
          <View style={styles.statsInfo}>
            <Text style={styles.statsPoints}>
              {achievements.filter(a => a.unlocked).length}
            </Text>
            <Text style={styles.statsLabel}>Unlocked</Text>
          </View>
        </View>

        {categories.map((category) => (
          <View key={category} style={styles.categorySection}>
            <Text style={styles.categoryTitle}>{category}</Text>
            {achievements
              .filter(a => a.category === category)
              .map((achievement) => (
                <TouchableOpacity
                  key={achievement.id}
                  style={[
                    styles.achievementCard,
                    achievement.unlocked && styles.unlockedCard,
                  ]}
                  activeOpacity={0.8}
                >
                  <View style={[
                    styles.iconContainer,
                    achievement.unlocked && styles.unlockedIcon,
                  ]}>
                    {achievement.icon}
                  </View>
                  <View style={styles.achievementInfo}>
                    <View style={styles.achievementHeader}>
                      <Text style={[
                        styles.achievementTitle,
                        !achievement.unlocked && styles.lockedText,
                      ]}>
                        {achievement.title}
                      </Text>
                      <View style={styles.pointsBadge}>
                        <Star size={12} color={achievement.unlocked ? '#FFD700' : '#ccc'} />
                        <Text style={[
                          styles.pointsText,
                          !achievement.unlocked && styles.lockedText,
                        ]}>
                          {achievement.points}
                        </Text>
                      </View>
                    </View>
                    <Text style={[
                      styles.achievementDescription,
                      !achievement.unlocked && styles.lockedText,
                    ]}>
                      {achievement.description}
                    </Text>
                    <View style={styles.progressContainer}>
                      {renderProgressBar(achievement.progress, achievement.total)}
                      <Text style={styles.progressText}>
                        {achievement.progress}/{achievement.total}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
          </View>
        ))}
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
  statsCard: {
    backgroundColor: '#fff',
    margin: 15,
    padding: 20,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statsInfo: {
    alignItems: 'center',
  },
  statsPoints: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statsLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  categorySection: {
    marginBottom: 20,
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginLeft: 20,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  achievementCard: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginBottom: 10,
    padding: 15,
    borderRadius: 12,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  unlockedCard: {
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  unlockedIcon: {
    backgroundColor: '#e8f5e9',
  },
  achievementInfo: {
    flex: 1,
  },
  achievementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  achievementDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  lockedText: {
    color: '#999',
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pointsText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    marginLeft: 4,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 3,
  },
  progressBarAndroid: {
    flex: 1,
    height: 6,
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 10,
  },
});
