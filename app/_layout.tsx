import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as ExpoSplashScreen from "expo-splash-screen";
import React, { useEffect, useState, useMemo } from "react";
import { StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider } from "@/contexts/AuthContext";
import { LocationProvider } from "@/contexts/LocationContext";
import { StorageProvider } from "@/contexts/StorageContext";
import { AlertProvider } from "@/contexts/AlertContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { GuardianProvider } from "@/contexts/GuardianContext";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import SplashScreen from "./splash";
import { NotificationManager } from "@/components/NotificationManager";

ExpoSplashScreen.preventAutoHideAsync();

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
      gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
      refetchOnReconnect: 'always',
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
    },
  },
});

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back", animation: 'slide_from_right' }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="splash" options={{ headerShown: false }} />
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
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

export default function RootLayout() {
  const [showSplash, setShowSplash] = useState(true);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Hide the native splash screen
    ExpoSplashScreen.hideAsync().catch(console.error);
    
    // Mark as ready after a short delay to ensure everything is loaded
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // Memoize the provider tree to prevent unnecessary re-renders
  const appContent = useMemo(() => (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={styles.container}>
          <StorageProvider>
            <SettingsProvider>
              <AuthProvider>
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
              </AuthProvider>
            </SettingsProvider>
          </StorageProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </ErrorBoundary>
  ), []);

  if (!isReady) {
    return null; // Return null while app is initializing
  }

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  return appContent;
}
