import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from '@/lib/supabase';

interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface QueuedAction {
  id: string;
  type: string;
  payload: any;
  timestamp: number;
  retries: number;
}

export class OfflineManager {
  private static instance: OfflineManager;
  private isOnline: boolean = true;
  private listeners: Set<(isOnline: boolean) => void> = new Set();
  private actionQueue: QueuedAction[] = [];
  private readonly QUEUE_KEY = '@offline_queue';
  private readonly CACHE_PREFIX = '@cache_';

  private constructor() {
    this.initializeNetworkListener();
    this.loadQueue();
  }

  static getInstance(): OfflineManager {
    if (!OfflineManager.instance) {
      OfflineManager.instance = new OfflineManager();
    }
    return OfflineManager.instance;
  }

  private async initializeNetworkListener(): Promise<void> {
    // Check initial network state
    const state = await NetInfo.fetch();
    this.isOnline = state.isConnected ?? true;

    // Listen for network changes
    NetInfo.addEventListener(state => {
      const wasOnline = this.isOnline;
      this.isOnline = state.isConnected ?? true;
      
      if (!wasOnline && this.isOnline) {
        // Back online - process queued actions
        this.processQueue();
      }
      
      // Notify listeners
      this.listeners.forEach(listener => listener(this.isOnline));
    });
  }

  // Cache Management
  async setCache<T>(key: string, data: T, ttlMinutes: number = 60): Promise<void> {
    const cacheItem: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + (ttlMinutes * 60 * 1000)
    };
    
    try {
      await AsyncStorage.setItem(
        `${this.CACHE_PREFIX}${key}`,
        JSON.stringify(cacheItem)
      );
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  async getCache<T>(key: string): Promise<T | null> {
    try {
      const cached = await AsyncStorage.getItem(`${this.CACHE_PREFIX}${key}`);
      if (!cached) return null;
      
      const cacheItem: CacheItem<T> = JSON.parse(cached);
      
      // Check if cache is expired
      if (Date.now() > cacheItem.expiresAt) {
        await this.removeCache(key);
        return null;
      }
      
      return cacheItem.data;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async removeCache(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(`${this.CACHE_PREFIX}${key}`);
    } catch (error) {
      console.error('Cache remove error:', error);
    }
  }

  async clearAllCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(this.CACHE_PREFIX));
      await AsyncStorage.multiRemove(cacheKeys);
    } catch (error) {
      console.error('Clear cache error:', error);
    }
  }

  // Queue Management for Offline Actions
  async queueAction(type: string, payload: any): Promise<void> {
    const action: QueuedAction = {
      id: `${Date.now()}_${Math.random()}`,
      type,
      payload,
      timestamp: Date.now(),
      retries: 0
    };
    
    this.actionQueue.push(action);
    await this.saveQueue();
    
    // Try to process immediately if online
    if (this.isOnline) {
      this.processQueue();
    }
  }

  private async loadQueue(): Promise<void> {
    try {
      const queueData = await AsyncStorage.getItem(this.QUEUE_KEY);
      if (queueData) {
        this.actionQueue = JSON.parse(queueData);
      }
    } catch (error) {
      console.error('Load queue error:', error);
    }
  }

  private async saveQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.QUEUE_KEY, JSON.stringify(this.actionQueue));
    } catch (error) {
      console.error('Save queue error:', error);
    }
  }

  private async processQueue(): Promise<void> {
    if (!this.isOnline || this.actionQueue.length === 0) return;
    
    const processedIds: string[] = [];
    
    for (const action of this.actionQueue) {
      try {
        // Process action based on type
        await this.processAction(action);
        processedIds.push(action.id);
      } catch (error) {
        console.error(`Failed to process action ${action.id}:`, error);
        action.retries++;
        
        // Remove if too many retries
        if (action.retries > 3) {
          processedIds.push(action.id);
        }
      }
    }
    
    // Remove processed actions
    this.actionQueue = this.actionQueue.filter(
      action => !processedIds.includes(action.id)
    );
    await this.saveQueue();
  }

  private async processAction(action: QueuedAction): Promise<void> {
    console.log('Processing queued action:', action.type, action.payload);
    
    switch (action.type) {
      case 'UPDATE_PROFILE':
        const { error: profileError } = await (supabase
          .from('profiles') as any)
          .update(action.payload.updates)
          .eq('id', action.payload.userId);
        if (profileError) throw profileError;
        break;
        
      case 'SEND_ALERT':
        const { error: alertError } = await (supabase
          .from('alerts') as any)
          .insert(action.payload);
        if (alertError) throw alertError;
        break;
        
      case 'UPDATE_LOCATION':
        const { error: locationError } = await (supabase
          .from('user_locations') as any)
          .upsert({
            user_id: action.payload.userId,
            latitude: action.payload.latitude,
            longitude: action.payload.longitude,
            updated_at: action.payload.timestamp
          });
        if (locationError) throw locationError;
        break;
        
      case 'JOIN_GROUP':
        const { error: memberError } = await (supabase
          .from('group_members') as any)
          .insert({
            group_id: action.payload.groupId,
            user_id: action.payload.userId,
            role: action.payload.role || 'member'
          });
        if (memberError) throw memberError;
        break;
        
      case 'SEND_MESSAGE':
        const { error: messageError } = await (supabase
          .from('group_messages') as any)
          .insert(action.payload);
        if (messageError) throw messageError;
        break;
        
      case 'UPDATE_VIBE':
        const { error: vibeError } = await (supabase
          .from('vibe_history') as any)
          .insert(action.payload);
        if (vibeError) throw vibeError;
        break;
        
      default:
        console.warn('Unknown action type:', action.type);
    }
  }

  // Network Status
  getIsOnline(): boolean {
    return this.isOnline;
  }

  addNetworkListener(listener: (isOnline: boolean) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Data Sync
  async syncData(): Promise<void> {
    if (!this.isOnline) {
      throw new Error('Cannot sync while offline');
    }
    
    // Process any queued actions
    await this.processQueue();
    
    // Clear expired cache
    await this.cleanupExpiredCache();
  }

  private async cleanupExpiredCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(this.CACHE_PREFIX));
      
      for (const key of cacheKeys) {
        const cached = await AsyncStorage.getItem(key);
        if (cached) {
          const cacheItem = JSON.parse(cached);
          if (Date.now() > cacheItem.expiresAt) {
            await AsyncStorage.removeItem(key);
          }
        }
      }
    } catch (error) {
      console.error('Cleanup cache error:', error);
    }
  }
}

// Export singleton instance
export const offlineManager = OfflineManager.getInstance();
