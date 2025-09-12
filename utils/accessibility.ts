import { AccessibilityInfo, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AccessibilitySettings {
  fontSize: 'small' | 'medium' | 'large' | 'xlarge';
  highContrast: boolean;
  reduceMotion: boolean;
  screenReaderEnabled: boolean;
  boldText: boolean;
}

const DEFAULT_SETTINGS: AccessibilitySettings = {
  fontSize: 'medium',
  highContrast: false,
  reduceMotion: false,
  screenReaderEnabled: false,
  boldText: false,
};

const STORAGE_KEY = '@accessibility_settings';

export class AccessibilityManager {
  private static instance: AccessibilityManager;
  private settings: AccessibilitySettings = DEFAULT_SETTINGS;
  private listeners: Set<(settings: AccessibilitySettings) => void> = new Set();

  private constructor() {
    this.loadSettings();
    this.initializeSystemListeners();
  }

  static getInstance(): AccessibilityManager {
    if (!AccessibilityManager.instance) {
      AccessibilityManager.instance = new AccessibilityManager();
    }
    return AccessibilityManager.instance;
  }

  private async loadSettings(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      }
      
      // Check system accessibility settings
      if (Platform.OS !== 'web') {
        const screenReaderEnabled = await AccessibilityInfo.isScreenReaderEnabled();
        this.settings.screenReaderEnabled = screenReaderEnabled;
        
        const reduceMotionEnabled = await AccessibilityInfo.isReduceMotionEnabled();
        this.settings.reduceMotion = reduceMotionEnabled;
      }
    } catch (error) {
      console.error('Load accessibility settings error:', error);
    }
  }

  private initializeSystemListeners(): void {
    if (Platform.OS === 'web') return;

    AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      this.handleScreenReaderChange
    );

    AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      this.handleReduceMotionChange
    );
  }

  private handleScreenReaderChange = (enabled: boolean): void => {
    this.updateSettings({ screenReaderEnabled: enabled });
  };

  private handleReduceMotionChange = (enabled: boolean): void => {
    this.updateSettings({ reduceMotion: enabled });
  };

  async updateSettings(updates: Partial<AccessibilitySettings>): Promise<void> {
    this.settings = { ...this.settings, ...updates };
    
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch (error) {
      console.error('Save accessibility settings error:', error);
    }
    
    this.notifyListeners();
  }

  getSettings(): AccessibilitySettings {
    return { ...this.settings };
  }

  addListener(listener: (settings: AccessibilitySettings) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.settings));
  }

  // Font size utilities
  getFontSize(base: number): number {
    const multipliers = {
      small: 0.85,
      medium: 1,
      large: 1.15,
      xlarge: 1.3,
    };
    return base * multipliers[this.settings.fontSize];
  }

  // Accessibility props helpers
  getAccessibilityProps(label: string, hint?: string, role?: string): any {
    return {
      accessible: true,
      accessibilityLabel: label,
      accessibilityHint: hint,
      accessibilityRole: role as any,
      importantForAccessibility: 'yes' as const,
    };
  }

  getButtonAccessibilityProps(label: string, hint?: string): any {
    return {
      ...this.getAccessibilityProps(label, hint, 'button'),
      accessibilityState: { disabled: false },
    };
  }

  // Announce for screen readers
  announce(message: string, queue: boolean = false): void {
    if (Platform.OS !== 'web') {
      AccessibilityInfo.announceForAccessibility(message);
    }
  }

  // Color contrast helpers
  getContrastColor(background: string): string {
    if (!this.settings.highContrast) {
      return this.calculateContrastColor(background);
    }
    
    // High contrast mode - use pure black or white
    const rgb = this.hexToRgb(background);
    const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
    return brightness > 128 ? '#000000' : '#FFFFFF';
  }

  private calculateContrastColor(hex: string): string {
    const rgb = this.hexToRgb(hex);
    const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
    return brightness > 128 ? '#333333' : '#FFFFFF';
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 0, g: 0, b: 0 };
  }

  // Animation duration helper
  getAnimationDuration(baseDuration: number): number {
    return this.settings.reduceMotion ? 0 : baseDuration;
  }

  // Focus management
  setAccessibilityFocus(ref: any): void {
    if (Platform.OS !== 'web' && ref?.current) {
      AccessibilityInfo.setAccessibilityFocus(ref.current);
    }
  }
}

export const accessibilityManager = AccessibilityManager.getInstance();

// Accessibility hooks
export const useAccessibilitySettings = (): AccessibilitySettings => {
  const [settings, setSettings] = React.useState(accessibilityManager.getSettings());

  React.useEffect(() => {
    const unsubscribe = accessibilityManager.addListener(setSettings);
    return unsubscribe;
  }, []);

  return settings;
};

// Import React for hooks
import * as React from 'react';
