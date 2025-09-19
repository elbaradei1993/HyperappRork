import { Tabs, Redirect } from "expo-router";
import { MapPin, User, Plus, Activity, Shield } from "lucide-react-native";
import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings } from "@/contexts/SettingsContext";

export default function TabLayout() {
  const { user, loading } = useAuth();
  const { t } = useSettings();

  if (loading) {
    return null;
  }

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#ff4757",
        tabBarInactiveTintColor: "#8e8e93",
        tabBarStyle: {
          backgroundColor: "#1a1a2e",
          borderTopColor: "rgba(255, 255, 255, 0.1)",
          borderTopWidth: 1,
        },
        headerShown: false,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600' as const,
        },
      }}
    >
      <Tabs.Screen
        name="map"
        options={{
          title: t('map'),
          tabBarIcon: ({ color }) => <MapPin size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="pulse"
        options={{
          title: t('pulse'),
          tabBarIcon: ({ color }) => <Activity size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="report"
        options={{
          title: t('report'),
          tabBarIcon: ({ color }) => <Plus size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="guardians"
        options={{
          title: 'Guardians',
          tabBarIcon: ({ color }) => <Shield size={24} color={color} />,
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: t('profile'),
          tabBarIcon: ({ color }) => <User size={24} color={color} />,
        }}
      />

    </Tabs>
  );
}
