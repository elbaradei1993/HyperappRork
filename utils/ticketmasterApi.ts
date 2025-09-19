import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

interface SoundAssets {
  splash: any;
  sosAlert: any;
  eventAlert: any;
  vibeAlert: any;
  notification: any;
  success: any;
  warning: any;
}

class SoundManager {
  private sounds: Map<string, Audio.Sound> = new Map();
  private isInitialized = false;

  // Sound URLs - using free sound effects from freesound.org and other sources
  private soundUrls: SoundAssets = {
    splash: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.mp3', // Creative startup sound
    sosAlert: 'https://www.soundjay.com/misc/sounds/bell-ringing-01.mp3', // Emergency alert
    eventAlert: 'https://www.soundjay.com/misc/sounds/chimes-glassy-1.mp3', // Event notification
    vibeAlert: 'https://www.soundjay.com/misc/sounds/chimes-short-1.mp3', // Vibe notification
    notification: 'https://www.soundjay.com/misc/sounds/ding-1.mp3', // General notification
    success: 'https://www.soundjay.com/misc/sounds/chimes-1.mp3', // Success sound
    warning: 'https://www.soundjay.com/misc/sounds/warning-1.mp3', // Warning sound
  };

  async initialize() {
    if (this.isInitialized) return;

    try {
      if (Platform.OS !== 'web') {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          staysActiveInBackground: false,
        });
      }
      this.isInitialized = true;
      console.log('✅ Sound Manager initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Sound Manager:', error);
    }
  }

  async preloadSound(key: keyof SoundAssets) {
    try {
      if (Platform.OS === 'web') {
        // Web doesn't support Audio.Sound, use HTML5 Audio instead
        return;
      }

      if (this.sounds.has(key)) {
        return; // Already loaded
      }

      const { sound } = await Audio.Sound.createAsync(
        { uri: this.soundUrls[key] },
        { shouldPlay: false }
      );

      this.sounds.set(key, sound);
      console.log(`✅ Preloaded sound: ${key}`);
    } catch (error) {
      console.error(`❌ Failed to preload sound ${key}:`, error);
    }
  }

  async playSound(key: keyof SoundAssets, options?: { volume?: number; loop?: boolean }) {
    try {
      await this.initialize();

      if (Platform.OS === 'web') {
        // Use HTML5 Audio for web
        const audio = new (window as any).Audio(this.soundUrls[key]);
        audio.volume = options?.volume ?? 1.0;
        audio.loop = options?.loop ?? false;
        await audio.play();
        return;
      }

      // For native platforms
      let sound = this.sounds.get(key);

      if (!sound) {
        // Load sound if not preloaded
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: this.soundUrls[key] },
          { 
            shouldPlay: false,
            volume: options?.volume ?? 1.0,
            isLooping: options?.loop ?? false,
          }
        );
        sound = newSound;
        this.sounds.set(key, sound);
      } else {
        // Reset and configure existing sound
        await sound.setPositionAsync(0);
        if (options?.volume !== undefined) {
          await sound.setVolumeAsync(options.volume);
        }
        if (options?.loop !== undefined) {
          await sound.setIsLoopingAsync(options.loop);
        }
      }

      await sound.playAsync();
      console.log(`🔊 Playing sound: ${key}`);
    } catch (error) {
      console.error(`❌ Failed to play sound ${key}:`, error);
    }
  }

  async stopSound(key: keyof SoundAssets) {
    try {
      const sound = this.sounds.get(key);
      if (sound) {
        await sound.stopAsync();
        await sound.setPositionAsync(0);
        console.log(`🔇 Stopped sound: ${key}`);
      }
    } catch (error) {
      console.error(`❌ Failed to stop sound ${key}:`, error);
    }
  }

  async stopAllSounds() {
    try {
      for (const [key, sound] of this.sounds) {
        await sound.stopAsync();
        await sound.setPositionAsync(0);
      }
      console.log('🔇 Stopped all sounds');
    } catch (error) {
      console.error('❌ Failed to stop all sounds:', error);
    }
  }

  async cleanup() {
    try {
      for (const [key, sound] of this.sounds) {
        await sound.unloadAsync();
      }
      this.sounds.clear();
      this.isInitialized = false;
      console.log('✅ Sound Manager cleaned up');
    } catch (error) {
      console.error('❌ Failed to cleanup Sound Manager:', error);
    }
  }

  // Specific sound methods for convenience
  async playSplashSound() {
    await this.playSound('splash', { volume: 0.7 });
  }

  async playSOSAlert() {
    await this.playSound('sosAlert', { volume: 1.0 });
    // Add strong haptic feedback for SOS
    if (Platform.OS !== 'web') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }

  async playEventAlert() {
    await this.playSound('eventAlert', { volume: 0.8 });
    // Add medium haptic feedback for events
    if (Platform.OS !== 'web') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  }

  async playVibeAlert() {
    await this.playSound('vibeAlert', { volume: 0.8 });
    // Add light haptic feedback for vibes
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }

  async playNotification() {
    await this.playSound('notification', { volume: 0.7 });
    // Add selection haptic feedback for notifications
    if (Platform.OS !== 'web') {
      await Haptics.selectionAsync();
    }
  }

  async playSuccess() {
    await this.playSound('success', { volume: 0.6 });
    // Add success haptic feedback
    if (Platform.OS !== 'web') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }

  async playWarning() {
    await this.playSound('warning', { volume: 0.9 });
    // Add warning haptic feedback
    if (Platform.OS !== 'web') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  }
}

// Export singleton instance
export const soundManager = new SoundManager();

// Export type for use in components
export type { SoundAssets };
