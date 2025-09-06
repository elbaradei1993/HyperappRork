import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
  Platform,
  Dimensions,
} from 'react-native';

import { useAuth } from '@/contexts/AuthContext';
import { useAlerts } from '@/contexts/AlertContext';
import { 
  Camera, 
  Edit3,
  Star,
  Award,
  ChevronRight,
  Settings,
  HelpCircle,
  FileText,
  LogOut,
  Bell,
  Lock,
  CreditCard,
  Heart,
  AlertTriangle,
  Users
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';



export default function ProfileScreen() {
  const { user, updateProfile, signOut } = useAuth();
  const { alerts } = useAlerts();
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(user?.user_metadata?.displayName || user?.email?.split('@')[0] || 'User');
  const [phone, setPhone] = useState(user?.user_metadata?.phone || '');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [rating] = useState(4.92);
  const [totalTrips] = useState(127);

  // Load profile image on mount
  React.useEffect(() => {
    loadProfileImage();
  }, []);

  const loadProfileImage = async () => {
    try {
      const savedImage = await AsyncStorage.getItem('profileImage');
      if (savedImage) {
        setProfileImage(savedImage);
      }
    } catch (error) {
      console.error('Error loading profile image:', error);
    }
  };

  const handleImagePicker = async () => {
    try {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Sorry, we need camera roll permissions to change your profile picture.');
          return;
        }
      }

      Alert.alert(
        'Change Profile Picture',
        'Choose an option',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Camera', onPress: () => openCamera() },
          { text: 'Photo Library', onPress: () => openImageLibrary() },
        ]
      );
    } catch (error) {
      console.error('Error requesting permissions:', error);
    }
  };

  const openCamera = async () => {
    try {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Sorry, we need camera permissions to take a photo.');
          return;
        }
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        setProfileImage(imageUri);
        await AsyncStorage.setItem('profileImage', imageUri);
        Alert.alert('Success', 'Profile picture updated!');
      }
    } catch (error) {
      console.error('Error opening camera:', error);
      Alert.alert('Error', 'Failed to open camera');
    }
  };

  const openImageLibrary = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        setProfileImage(imageUri);
        await AsyncStorage.setItem('profileImage', imageUri);
        Alert.alert('Success', 'Profile picture updated!');
      }
    } catch (error) {
      console.error('Error opening image library:', error);
      Alert.alert('Error', 'Failed to open image library');
    }
  };

  const handleSave = async () => {
    try {
      await updateProfile({
        displayName,
        phone,
      });
      setEditing(false);
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', onPress: () => signOut(), style: 'destructive' },
      ]
    );
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} days ago`;
    return date.toLocaleDateString();
  };

  // Calculate real stats from alerts
  const stats = {
    vibesReported: alerts.filter(alert => alert.reportType === 'vibe').length,
    eventsReported: alerts.filter(alert => alert.reportType === 'event').length,
    communityScore: 89,
    helpProvided: Math.floor(alerts.length * 0.6),
  };

  const menuSections = [
    {
      title: 'Account',
      items: [
        { icon: Bell, label: 'Notifications', onPress: () => Alert.alert('Coming Soon', 'Notifications settings coming soon!') },
        { icon: Lock, label: 'Privacy & Security', onPress: () => Alert.alert('Coming Soon', 'Privacy settings coming soon!') },
        { icon: CreditCard, label: 'Payment Methods', onPress: () => Alert.alert('Coming Soon', 'Payment methods coming soon!') },
      ]
    },
    {
      title: 'Community',
      items: [
        { icon: Heart, label: 'Saved Places', onPress: () => Alert.alert('Coming Soon', 'Saved places coming soon!') },
        { icon: Award, label: 'Achievements', onPress: () => Alert.alert('Coming Soon', 'Achievements coming soon!') },
        { icon: Users, label: 'Trusted Contacts', onPress: () => Alert.alert('Coming Soon', 'Trusted contacts coming soon!') },
      ]
    },
    {
      title: 'Support',
      items: [
        { icon: HelpCircle, label: 'Help & Support', onPress: () => Alert.alert('Help', 'Contact support@hyperapp.com') },
        { icon: FileText, label: 'Terms & Policies', onPress: () => Alert.alert('Coming Soon', 'Terms & Policies coming soon!') },
        { icon: Settings, label: 'Settings', onPress: () => Alert.alert('Coming Soon', 'Settings coming soon!') },
      ]
    },
  ];

  // Get recent alerts for history
  const recentHistory = alerts
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 5)
    .map(alert => ({
      id: alert.id,
      type: alert.reportType,
      title: alert.description || `${alert.type} reported`,
      date: formatDate(alert.timestamp),
      location: `${alert.location.latitude.toFixed(3)}, ${alert.location.longitude.toFixed(3)}`,
    }));

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.profileSection}>
            <TouchableOpacity onPress={handleImagePicker} style={styles.avatarContainer}>
              <Image
                source={{
                  uri: profileImage || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face'
                }}
                style={styles.avatarImage}
              />
              <View style={styles.cameraButton}>
                <Camera size={14} color="#ffffff" />
              </View>
            </TouchableOpacity>
            
            <View style={styles.profileInfo}>
              {editing ? (
                <TextInput
                  style={styles.nameInput}
                  value={displayName}
                  onChangeText={setDisplayName}
                  placeholder="Your name"
                  placeholderTextColor="#8e8e93"
                />
              ) : (
                <Text style={styles.name}>{displayName}</Text>
              )}
              
              <View style={styles.ratingContainer}>
                <Star size={14} color="#FFD700" fill="#FFD700" />
                <Text style={styles.rating}>{rating}</Text>
                <Text style={styles.ratingCount}>({totalTrips} reports)</Text>
              </View>
            </View>
            
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => editing ? handleSave() : setEditing(true)}
            >
              <Edit3 size={18} color="#000000" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <LinearGradient
            colors={['#4CAF50', '#66BB6A']}
            style={styles.statCard}
          >
            <Text style={styles.statNumber}>{stats.vibesReported}</Text>
            <Text style={styles.statLabel}>Vibes Shared</Text>
          </LinearGradient>
          
          <LinearGradient
            colors={['#2196F3', '#42A5F5']}
            style={styles.statCard}
          >
            <Text style={styles.statNumber}>{stats.communityScore}</Text>
            <Text style={styles.statLabel}>Community Score</Text>
          </LinearGradient>
          
          <LinearGradient
            colors={['#FF9800', '#FFB74D']}
            style={styles.statCard}
          >
            <Text style={styles.statNumber}>{stats.eventsReported}</Text>
            <Text style={styles.statLabel}>Events Reported</Text>
          </LinearGradient>
        </View>

        {/* Personal Info */}
        {editing && (
          <View style={styles.personalInfo}>
            <Text style={styles.sectionTitle}>Personal Information</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{user?.email}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Phone</Text>
              <TextInput
                style={styles.infoInput}
                value={phone}
                onChangeText={setPhone}
                placeholder="Add phone number"
                placeholderTextColor="#8e8e93"
                keyboardType="phone-pad"
              />
            </View>
          </View>
        )}

        {/* Menu Sections */}
        {menuSections.map((section, index) => (
          <View key={index} style={styles.menuSection}>
            <Text style={styles.menuSectionTitle}>{section.title}</Text>
            {section.items.map((item, itemIndex) => {
              const IconComponent = item.icon;
              return (
                <TouchableOpacity
                  key={itemIndex}
                  style={styles.menuItem}
                  onPress={item.onPress}
                >
                  <View style={styles.menuItemLeft}>
                    <View style={styles.menuIconContainer}>
                      <IconComponent size={20} color="#000000" />
                    </View>
                    <Text style={styles.menuItemText}>{item.label}</Text>
                  </View>
                  <ChevronRight size={20} color="#8e8e93" />
                </TouchableOpacity>
              );
            })}
          </View>
        ))}

        {/* Recent Activity */}
        <View style={styles.activitySection}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          {recentHistory.length > 0 ? (
            recentHistory.slice(0, 3).map((item) => (
              <View key={item.id} style={styles.activityItem}>
                <View style={styles.activityIcon}>
                  {item.type === 'vibe' && <Heart size={16} color="#4CAF50" />}
                  {item.type === 'event' && <AlertTriangle size={16} color="#FF9800" />}
                </View>
                <View style={styles.activityContent}>
                  <Text style={styles.activityTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.activityDate}>{item.date}</Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No activity yet</Text>
            </View>
          )}
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <LogOut size={20} color="#ff4757" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f7f7',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#000000',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 4,
  },
  nameInput: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000000',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingBottom: 4,
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rating: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
  ratingCount: {
    fontSize: 14,
    color: '#8e8e93',
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#ffffff',
    opacity: 0.9,
    textAlign: 'center',
  },
  personalInfo: {
    backgroundColor: '#ffffff',
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 14,
    color: '#8e8e93',
  },
  infoValue: {
    fontSize: 14,
    color: '#000000',
  },
  infoInput: {
    fontSize: 14,
    color: '#000000',
    textAlign: 'right',
    flex: 1,
    marginLeft: 20,
  },
  menuSection: {
    backgroundColor: '#ffffff',
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  menuSectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8e8e93',
    textTransform: 'uppercase',
    marginTop: 8,
    marginBottom: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  menuIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuItemText: {
    fontSize: 16,
    color: '#000000',
  },
  activitySection: {
    backgroundColor: '#ffffff',
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 16,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },
  activityDate: {
    fontSize: 12,
    color: '#8e8e93',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#8e8e93',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    marginTop: 12,
    marginBottom: 24,
    marginHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ff4757',
  },
});
