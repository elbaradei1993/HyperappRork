import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { useSettings } from '@/contexts/SettingsContext';
import CommunityLeaderboard from '@/components/CommunityLeaderboard';

export default function LeaderboardScreen() {
  const { isDark } = useSettings();

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <Stack.Screen
        options={{
          title: 'Community Leaderboard',
          headerStyle: {
            backgroundColor: isDark ? '#000000' : '#ffffff',
          },
          headerTintColor: isDark ? '#ffffff' : '#000000',
        }}
      />
      <CommunityLeaderboard />
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
});
