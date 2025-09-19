import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import React from "react";
import { StyleSheet, Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider } from "@/contexts/AuthContext";
import { LocationProvider } from "@/contexts/LocationContext";
import { StorageProvider } from "@/contexts/StorageContext";
import { AlertProvider } from "@/contexts/AlertContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { GuardianProvider } from "@/contexts/GuardianContext";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { NotificationManager } from "@/components/NotificationManager";

// Remove splash screen handling - let Expo handle it natively

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

// Optimized QueryClient configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
      retry: 2,
      retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
      refetchOnReconnect: 'always' as const,
    },
    mutations: {
      retry: Platform.OS === 'web' ? 0 : 1,
    },
  },
});

function RootLayoutNav() {
  return (
    <Stack 
      screenOptions={{ 
        headerBackTitle: "Back", 
        animation: Platform.OS === 'ios' ? 'ios_from_right' : 'fade',
        headerStyle: {
          backgroundColor: '#1a1a2e',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold' as const,
        },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="privacy-policy" options={{ title: "Privacy Policy" }} />
      <Stack.Screen name="terms-of-service" options={{ title: "Terms of Service" }} />
      <Stack.Screen name="notifications" options={{ title: "Notifications" }} />
      <Stack.Screen name="privacy-security" options={{ title: "Privacy & Security" }} />
      <Stack.Screen name="payment-methods" options={{ title: "Payment Methods" }} />
      <Stack.Screen name="saved-places" options={{ title: "Saved Places" }} />
      <Stack.Screen name="achievements" options={{ title: "Achievements" }} />
      <Stack.Screen name="trusted-contacts" options={{ title: "Trusted Contacts" }} />
      <Stack.Screen name="help-support" options={{ title: "Help & Support" }} />
      <Stack.Screen name="terms-policies" options={{ title: "Terms & Policies" }} />
      <Stack.Screen name="activity-history" options={{ title: "Activity History" }} />
      <Stack.Screen name="alert-details/[id]" options={{ title: "Alert Details" }} />
      <Stack.Screen name="geofences" options={{ title: "Geofences" }} />
      <Stack.Screen name="settings" options={{ title: "Settings" }} />
      <Stack.Screen name="leaderboard" options={{ title: "Leaderboard" }} />
      <Stack.Screen name="data-storage" options={{ title: "Data Storage" }} />
      <Stack.Screen name="+not-found" options={{ title: "Not Found" }} />
    </Stack>
  );
}

export default function RootLayout() {
  // Removed splash screen handling to let Expo handle it natively

  // Simplified provider structure - combine related contexts
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={styles.container}>
          <AuthProvider>
            <StorageProvider>
              <SettingsProvider>
                <LocationProvider>
                  <AlertProvider>
                    <NotificationProvider>
                      <GuardianProvider>
                        <RootLayoutNav />
                        <NotificationManager />
                      </GuardianProvider>
                    </NotificationProvider>
                  </AlertProvider>
                </LocationProvider>
              </SettingsProvider>
            </StorageProvider>
          </AuthProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
