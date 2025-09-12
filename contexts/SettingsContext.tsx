import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations, Language } from '@/utils/translations';

interface SettingsContextType {
  language: Language;
  theme: 'light' | 'dark' | 'auto';
  setLanguage: (lang: Language) => Promise<void>;
  setTheme: (theme: 'light' | 'dark' | 'auto') => Promise<void>;
  t: (key: string) => string;
  isDark: boolean;
  isLoading: boolean;
  colors: {
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    pulse: string;
    danger: string;
    success: string;
    warning: string;
  };
}

export const [SettingsProvider, useSettings] = createContextHook<SettingsContextType>(() => {
  const [language, setLanguageState] = useState<Language>('en');
  const [theme, setThemeState] = useState<'light' | 'dark' | 'auto'>('dark');
  const [isLoading, setIsLoading] = useState(true);

  const saveSettings = useCallback(async (newSettings: any) => {
    try {
      const currentSettings = await AsyncStorage.getItem('appSettings');
      const settings = currentSettings ? JSON.parse(currentSettings) : {};
      const updatedSettings = { ...settings, ...newSettings };
      await AsyncStorage.setItem('appSettings', JSON.stringify(updatedSettings));
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  }, []);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const savedSettings = await AsyncStorage.getItem('appSettings');
        if (savedSettings) {
          const settings = JSON.parse(savedSettings);
          if (settings.language) setLanguageState(settings.language);
          if (settings.theme) setThemeState(settings.theme);
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadSettings();
  }, []);

  const setLanguage = useCallback(async (lang: Language) => {
    setLanguageState(lang);
    await saveSettings({ language: lang });
  }, [saveSettings]);

  const setTheme = useCallback(async (newTheme: 'light' | 'dark' | 'auto') => {
    setThemeState(newTheme);
    await saveSettings({ theme: newTheme });
  }, [saveSettings]);

  const t = useCallback((key: string) => {
    const langTranslations = translations[language];
    if (!langTranslations) return key;
    return langTranslations[key as keyof typeof langTranslations] || key;
  }, [language]);

  const isDark = useMemo(() => {
    if (theme === 'auto') {
      // For simplicity, default to dark; in real app, check system preference
      return true;
    }
    return theme === 'dark';
  }, [theme]);

  const colors = useMemo(() => {
    if (isDark) {
      return {
        background: '#000000',
        surface: '#1A1A1A',
        text: '#FFFFFF',
        textSecondary: '#999999',
        border: '#333333',
        pulse: '#FF4444',
        danger: '#FF4444',
        success: '#00CC88',
        warning: '#FFB800',
      };
    }
    return {
      background: '#FFFFFF',
      surface: '#F7F7F7',
      text: '#000000',
      textSecondary: '#666666',
      border: '#E5E5E5',
      pulse: '#FF4444',
      danger: '#FF4444',
      success: '#00CC88',
      warning: '#FFB800',
    };
  }, [isDark]);

  return useMemo(() => ({
    language,
    theme,
    setLanguage,
    setTheme,
    t,
    isDark,
    isLoading,
    colors,
  }), [language, theme, setLanguage, setTheme, t, isDark, isLoading, colors]);
});
