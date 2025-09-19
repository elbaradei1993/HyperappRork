import { Redirect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

export default function Index() {
  const { user, loading } = useAuth();

  // Show loading while checking auth
  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#ff4757" />
      </View>
    );
  }

  // Redirect based on auth status
  if (user) {
    return <Redirect href="/(tabs)/map" />;
  } else {
    return <Redirect href="/(auth)/login" />;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f0f23',
  },
});
