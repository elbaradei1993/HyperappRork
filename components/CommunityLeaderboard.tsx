import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Trophy, Medal, Award, TrendingUp, Users, Crown } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSettings } from '@/contexts/SettingsContext';

interface LeaderboardUser {
  id: string;
  name: string;
  avatar?: string;
  points: number;
  level: number;
  rank: number;
  streak: number;
  badges: number;
}

export default function CommunityLeaderboard() {
  const { isDark } = useSettings();
  const [activeTab, setActiveTab] = useState<'weekly' | 'monthly' | 'allTime'>('weekly');
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [userRank, setUserRank] = useState<LeaderboardUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();
  }, [activeTab]);

  const loadLeaderboard = async () => {
    setLoading(true);
    try {
      // Simulate loading leaderboard data
      // In production, this would fetch from your backend
      const mockUsers: LeaderboardUser[] = [
        { id: '1', name: 'Sarah Johnson', points: 2450, level: 12, rank: 1, streak: 45, badges: 8 },
        { id: '2', name: 'Mike Chen', points: 2380, level: 11, rank: 2, streak: 32, badges: 7 },
        { id: '3', name: 'Emma Wilson', points: 2210, level: 11, rank: 3, streak: 28, badges: 6 },
        { id: '4', name: 'James Brown', points: 1980, level: 10, rank: 4, streak: 21, badges: 5 },
        { id: '5', name: 'Lisa Garcia', points: 1850, level: 9, rank: 5, streak: 18, badges: 5 },
        { id: '6', name: 'David Kim', points: 1720, level: 9, rank: 6, streak: 15, badges: 4 },
        { id: '7', name: 'Anna Martinez', points: 1650, level: 8, rank: 7, streak: 14, badges: 4 },
        { id: '8', name: 'Tom Anderson', points: 1580, level: 8, rank: 8, streak: 12, badges: 3 },
        { id: '9', name: 'Sophie Taylor', points: 1420, level: 7, rank: 9, streak: 10, badges: 3 },
        { id: '10', name: 'Ryan Lee', points: 1350, level: 7, rank: 10, streak: 9, badges: 2 },
      ];

      // Get current user data
      const userPoints = await AsyncStorage.getItem('userPoints');
      const userLevel = await AsyncStorage.getItem('userLevel');
      const userStreak = await AsyncStorage.getItem('dailyStreak');
      
      const currentUser: LeaderboardUser = {
        id: 'current',
        name: 'You',
        points: parseInt(userPoints || '0'),
        level: parseInt(userLevel || '1'),
        rank: 15,
        streak: parseInt(userStreak || '0'),
        badges: 1,
      };

      setLeaderboard(mockUsers);
      setUserRank(currentUser);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown size={20} color="#FFD700" />;
      case 2:
        return <Medal size={20} color="#C0C0C0" />;
      case 3:
        return <Medal size={20} color="#CD7F32" />;
      default:
        return null;
    }
  };

  const getRankColor = (rank: number): readonly [string, string, ...string[]] => {
    switch (rank) {
      case 1:
        return ['#FFD700', '#FFA500'] as const;
      case 2:
        return ['#C0C0C0', '#A8A8A8'] as const;
      case 3:
        return ['#CD7F32', '#B87333'] as const;
      default:
        return ['#6C63FF', '#5A52E0'] as const;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        {(['weekly', 'monthly', 'allTime'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.tab,
              activeTab === tab && styles.tabActive,
            ]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[
              styles.tabText,
              activeTab === tab && styles.tabTextActive,
              isDark && styles.tabTextDark,
            ]}>
              {tab === 'weekly' ? 'This Week' : tab === 'monthly' ? 'This Month' : 'All Time'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Your Rank Card */}
      {userRank && (
        <LinearGradient
          colors={['#6C63FF', '#5A52E0']}
          style={styles.userRankCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.userRankContent}>
            <View style={styles.userRankLeft}>
              <Text style={styles.userRankLabel}>Your Rank</Text>
              <Text style={styles.userRankNumber}>#{userRank.rank}</Text>
            </View>
            <View style={styles.userRankStats}>
              <View style={styles.userRankStat}>
                <Trophy size={16} color="#FFD700" />
                <Text style={styles.userRankStatText}>{userRank.points} pts</Text>
              </View>
              <View style={styles.userRankStat}>
                <TrendingUp size={16} color="#4CAF50" />
                <Text style={styles.userRankStatText}>Lvl {userRank.level}</Text>
              </View>
            </View>
          </View>
        </LinearGradient>
      )}

      {/* Leaderboard List */}
      <ScrollView style={styles.leaderboardList} showsVerticalScrollIndicator={false}>
        {leaderboard.map((user, index) => (
          <TouchableOpacity
            key={user.id}
            style={[
              styles.leaderboardItem,
              isDark && styles.leaderboardItemDark,
              index < 3 && styles.leaderboardItemTop,
            ]}
          >
            <View style={styles.rankContainer}>
              {index < 3 ? (
                <LinearGradient
                  colors={getRankColor(index + 1)}
                  style={styles.rankBadge}
                >
                  {getRankIcon(index + 1)}
                </LinearGradient>
              ) : (
                <View style={styles.rankNumber}>
                  <Text style={[styles.rankText, isDark && styles.rankTextDark]}>
                    {index + 1}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.userInfo}>
              <View style={[styles.avatar, { backgroundColor: `hsl(${index * 30}, 70%, 60%)` }]}>
                <Text style={styles.avatarText}>
                  {user.name.split(' ').map(n => n[0]).join('')}
                </Text>
              </View>
              <View style={styles.userDetails}>
                <Text style={[styles.userName, isDark && styles.userNameDark]}>
                  {user.name}
                </Text>
                <View style={styles.userBadges}>
                  <View style={styles.badge}>
                    <Trophy size={12} color="#FFD700" />
                    <Text style={styles.badgeText}>{user.points}</Text>
                  </View>
                  <View style={styles.badge}>
                    <Award size={12} color="#6C63FF" />
                    <Text style={styles.badgeText}>Lvl {user.level}</Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.streakContainer}>
              <Text style={[styles.streakNumber, isDark && styles.streakNumberDark]}>
                {user.streak}
              </Text>
              <Text style={[styles.streakLabel, isDark && styles.streakLabelDark]}>
                day streak
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFBFD',
  },
  containerDark: {
    backgroundColor: '#000000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#6C63FF',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
  },
  tabTextActive: {
    color: '#ffffff',
  },
  tabTextDark: {
    color: '#999999',
  },
  userRankCard: {
    marginHorizontal: 20,
    marginVertical: 16,
    padding: 20,
    borderRadius: 20,
  },
  userRankContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userRankLeft: {
    gap: 4,
  },
  userRankLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  userRankNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  userRankStats: {
    gap: 12,
  },
  userRankStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  userRankStatText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  leaderboardList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  leaderboardItemDark: {
    backgroundColor: '#1C1C1E',
  },
  leaderboardItemTop: {
    borderWidth: 2,
    borderColor: 'rgba(108, 99, 255, 0.2)',
  },
  rankContainer: {
    marginRight: 16,
  },
  rankBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666666',
  },
  rankTextDark: {
    color: '#999999',
  },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  userDetails: {
    flex: 1,
    gap: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  userNameDark: {
    color: '#ffffff',
  },
  userBadges: {
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  badgeText: {
    fontSize: 12,
    color: '#666666',
  },
  streakContainer: {
    alignItems: 'center',
  },
  streakNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF6B6B',
  },
  streakNumberDark: {
    color: '#FF6B6B',
  },
  streakLabel: {
    fontSize: 10,
    color: '#666666',
  },
  streakLabelDark: {
    color: '#999999',
  },
});
