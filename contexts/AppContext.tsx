import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useStorage } from '@/contexts/StorageContext';

// Combine Settings and Storage contexts into one
interface AppSettings {
  language: string;
  theme: 'light' | 'dark' | 'auto';
  notifications: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  autoSOS: boolean;
  sosDelay: number;
  emergencyContacts: string[];
  privacyMode: boolean;
  locationSharing: boolean;
  dataUsage: 'low' | 'medium' | 'high';
  mapType: 'standard' | 'satellite' | 'hybrid';
  units: 'metric' | 'imperial';
}

interface AppContextType {
  settings: AppSettings;
  updateSettings: (updates: Partial<AppSettings>) => Promise<void>;
  resetSettings: () => Promise<void>;
  isLoading: boolean;
}

const defaultSettings: AppSettings = {
  language: 'en',
  theme: 'auto',
  notifications: true,
  soundEnabled: true,
  vibrationEnabled: true,
  autoSOS: false,
  sosDelay: 5,
  emergencyContacts: [],
  privacyMode: false,
  locationSharing: true,
  dataUsage: 'medium',
  mapType: 'standard',
  units: 'metric',
};

const STORAGE_KEY = '@hyperapp_settings';

export const [AppProvider, useApp] = createContextHook<AppContextType>(() => {
  const { getItem, setItem, removeItem } = useStorage();
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const stored = await getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setSettings({ ...defaultSettings, ...parsed });
      }
    } catch {
      // Silent fail - use defaults
    } finally {
      setIsLoading(false);
    }
  };

  const updateSettings = useCallback(async (updates: Partial<AppSettings>) => {
    try {
      const newSettings = { ...settings, ...updates };
      setSettings(newSettings);
      await setItem(STORAGE_KEY, JSON.stringify(newSettings));
    } catch {
      throw new Error('Failed to save settings');
    }
  }, [settings, setItem]);

  const resetSettings = useCallback(async () => {
    try {
      setSettings(defaultSettings);
      await removeItem(STORAGE_KEY);
    } catch {
      throw new Error('Failed to reset settings');
    }
  }, [removeItem]);

  return useMemo(() => ({
    settings,
    updateSettings,
    resetSettings,
    isLoading,
  }), [settings, updateSettings, resetSettings, isLoading]);
});
