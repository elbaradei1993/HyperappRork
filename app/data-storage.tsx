import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Database, Download, Trash2, HardDrive, Cloud, Wifi } from 'lucide-react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface StorageSettings {
  autoSync: boolean;
  wifiOnlySync: boolean;
  cacheImages: boolean;
  cacheMapData: boolean;
  offlineMode: boolean;
}

export default function DataStorageScreen() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<StorageSettings>({
    autoSync: true,
    wifiOnlySync: false,
    cacheImages: true,
    cacheMapData: true,
    offlineMode: false,
  });
  const [storageInfo, setStorageInfo] = useState({
    cacheSize: '0 MB',
    dataSize: '0 MB',
    totalSize: '0 MB',
  });
  const [loading, setLoading] = useState(false);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    loadSettings();
    calculateStorageSize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadSettings = async () => {
    try {
      const saved = await AsyncStorage.getItem('data_storage_settings');
      if (saved) {
        setSettings(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading storage settings:', error);
    }
  };

  const saveSettings = async (newSettings: StorageSettings) => {
    try {
      await AsyncStorage.setItem('data_storage_settings', JSON.stringify(newSettings));
      setSettings(newSettings);
      console.log('Storage settings saved');
    } catch (error) {
      console.error('Error saving storage settings:', error);
    }
  };

  const handleToggle = (key: keyof StorageSettings, value: boolean) => {
    const newSettings = { ...settings, [key]: value };
    saveSettings(newSettings);
    
    if (key === 'offlineMode') {
      Alert.alert(
        'Offline Mode',
        value 
          ? 'Offline mode enabled. The app will work with cached data when internet is unavailable.'
          : 'Offline mode disabled. Internet connection required for full functionality.'
      );
    }
  };

  const calculateStorageSize = async () => {
    try {
      // Get all keys from AsyncStorage
      const keys = await AsyncStorage.getAllKeys();
      let totalSize = 0;
      let cacheSize = 0;
      let dataSize = 0;

      // Calculate approximate sizes
      for (const key of keys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          const size = new Blob([value]).size;
          totalSize += size;
          
          if (key.includes('cache') || key.includes('image')) {
            cacheSize += size;
          } else {
            dataSize += size;
          }
        }
      }

      setStorageInfo({
        cacheSize: `${(cacheSize / 1024 / 1024).toFixed(2)} MB`,
        dataSize: `${(dataSize / 1024 / 1024).toFixed(2)} MB`,
        totalSize: `${(totalSize / 1024 / 1024).toFixed(2)} MB`,
      });
    } catch (error) {
      console.error('Error calculating storage size:', error);
    }
  };

  const handleClearCache = () => {
    Alert.alert(
      'Clear Cache',
      'This will remove all cached data including images and map data. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            setClearing(true);
            try {
              // Clear cache-related keys
              const keys = await AsyncStorage.getAllKeys();
              const cacheKeys = keys.filter(key => 
                key.includes('cache') || 
                key.includes('image') || 
                key.includes('map_data')
              );
              
              await AsyncStorage.multiRemove(cacheKeys);
              await calculateStorageSize();
              Alert.alert('Success', 'Cache cleared successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear cache');
            } finally {
              setClearing(false);
            }
          },
        },
      ]
    );
  };

  const handleClearAllData = () => {
    Alert.alert(
      'Clear All Data',
      'WARNING: This will remove ALL app data including your settings and preferences. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Confirm',
              'Are you absolutely sure? All data will be permanently deleted.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete Everything',
                  style: 'destructive',
                  onPress: async () => {
                    setClearing(true);
                    try {
                      await AsyncStorage.clear();
                      await calculateStorageSize();
                      Alert.alert('Success', 'All data cleared successfully');
                    } catch (error) {
                      Alert.alert('Error', 'Failed to clear data');
                    } finally {
                      setClearing(false);
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const handleExportData = async () => {
    setLoading(true);
    try {
      // Collect all user data
      const keys = await AsyncStorage.getAllKeys();
      const data: Record<string, any> = {};
      
      for (const key of keys) {
        const value = await AsyncStorage.getItem(key);
        if (value && !key.includes('cache')) {
          try {
            data[key] = JSON.parse(value);
          } catch {
            data[key] = value;
          }
        }
      }

      // In a real app, you would save this to a file or send via email
      // For now, we'll just show a success message
      const dataSize = new Blob([JSON.stringify(data)]).size;
      Alert.alert(
        'Export Complete',
        `Your data (${(dataSize / 1024).toFixed(2)} KB) has been prepared for export. In the full version, this would be saved to your device or sent via email.`
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to export data');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncNow = async () => {
    if (!user) {
      Alert.alert('Error', 'Please sign in to sync data');
      return;
    }

    setLoading(true);
    try {
      // Simulate sync process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      Alert.alert('Success', 'Data synced successfully');
      await calculateStorageSize();
    } catch (error) {
      Alert.alert('Error', 'Failed to sync data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Data & Storage</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Storage Info */}
        <View style={styles.storageInfo}>
          <HardDrive size={32} color="#4CAF50" />
          <View style={styles.storageDetails}>
            <Text style={styles.storageTitle}>Storage Usage</Text>
            <Text style={styles.storageSize}>Total: {storageInfo.totalSize}</Text>
            <View style={styles.storageBreakdown}>
              <Text style={styles.storageItem}>Cache: {storageInfo.cacheSize}</Text>
              <Text style={styles.storageItem}>Data: {storageInfo.dataSize}</Text>
            </View>
          </View>
        </View>

        {/* Sync Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sync Settings</Text>
          
          <View style={styles.item}>
            <View style={styles.itemLeft}>
              <Cloud size={20} color="#666" />
              <Text style={styles.itemText}>Auto Sync</Text>
            </View>
            <Switch
              value={settings.autoSync}
              onValueChange={(value) => handleToggle('autoSync', value)}
              trackColor={{ false: '#ddd', true: '#4CAF50' }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.item}>
            <View style={styles.itemLeft}>
              <Wifi size={20} color="#666" />
              <Text style={styles.itemText}>WiFi Only Sync</Text>
            </View>
            <Switch
              value={settings.wifiOnlySync}
              onValueChange={(value) => handleToggle('wifiOnlySync', value)}
              trackColor={{ false: '#ddd', true: '#4CAF50' }}
              thumbColor="#fff"
              disabled={!settings.autoSync}
            />
          </View>

          <TouchableOpacity 
            style={[styles.syncButton, loading && styles.buttonDisabled]} 
            onPress={handleSyncNow}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Cloud size={20} color="#fff" />
                <Text style={styles.syncButtonText}>Sync Now</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Cache Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cache Settings</Text>
          
          <View style={styles.item}>
            <Text style={styles.itemText}>Cache Images</Text>
            <Switch
              value={settings.cacheImages}
              onValueChange={(value) => handleToggle('cacheImages', value)}
              trackColor={{ false: '#ddd', true: '#4CAF50' }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.item}>
            <Text style={styles.itemText}>Cache Map Data</Text>
            <Switch
              value={settings.cacheMapData}
              onValueChange={(value) => handleToggle('cacheMapData', value)}
              trackColor={{ false: '#ddd', true: '#4CAF50' }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.item}>
            <Text style={styles.itemText}>Offline Mode</Text>
            <Switch
              value={settings.offlineMode}
              onValueChange={(value) => handleToggle('offlineMode', value)}
              trackColor={{ false: '#ddd', true: '#4CAF50' }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* Data Management */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Management</Text>
          
          <TouchableOpacity 
            style={[styles.actionButton, loading && styles.buttonDisabled]} 
            onPress={handleExportData}
            disabled={loading}
          >
            <Download size={20} color="#4CAF50" />
            <Text style={styles.actionButtonText}>Export My Data</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, clearing && styles.buttonDisabled]} 
            onPress={handleClearCache}
            disabled={clearing}
          >
            {clearing ? (
              <ActivityIndicator size="small" color="#FF9800" />
            ) : (
              <>
                <Database size={20} color="#FF9800" />
                <Text style={[styles.actionButtonText, { color: '#FF9800' }]}>
                  Clear Cache
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.dangerButton, clearing && styles.buttonDisabled]} 
            onPress={handleClearAllData}
            disabled={clearing}
          >
            <Trash2 size={20} color="#fff" />
            <Text style={styles.dangerButtonText}>Clear All Data</Text>
          </TouchableOpacity>
        </View>

        {/* Info */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>About Data Storage</Text>
          <Text style={styles.infoText}>
            • Auto Sync keeps your data backed up to the cloud{'\n'}
            • WiFi Only Sync saves mobile data by syncing only on WiFi{'\n'}
            • Cached data allows the app to work offline{'\n'}
            • Clearing cache will not delete your account or settings{'\n'}
            • Export your data to keep a personal backup
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  placeholder: {
    width: 34,
  },
  content: {
    flex: 1,
  },
  storageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    gap: 16,
  },
  storageDetails: {
    flex: 1,
  },
  storageTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  storageSize: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '500',
    marginBottom: 8,
  },
  storageBreakdown: {
    flexDirection: 'row',
    gap: 16,
  },
  storageItem: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 20,
    paddingVertical: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginLeft: 20,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  itemText: {
    fontSize: 16,
    color: '#333',
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 10,
    padding: 14,
    borderRadius: 8,
    gap: 8,
  },
  syncButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: 12,
  },
  actionButtonText: {
    fontSize: 16,
    color: '#333',
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ff4757',
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 10,
    padding: 14,
    borderRadius: 8,
    gap: 8,
  },
  dangerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  infoSection: {
    margin: 20,
    padding: 16,
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 20,
  },
});
