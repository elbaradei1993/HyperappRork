import React, { useState, useEffect } from 'react';
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
  ActivityIndicator,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  Camera, 
  Edit3,
  Award,
  ChevronRight,
  Settings,
  HelpCircle,
  FileText,
  LogOut,
  Bell,
  Lock,
  Heart,
  AlertTriangle,
  Users,
  MapPin,
  Shield,
  Phone,
  User,
  Calendar,
  Check,
  X
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';



interface ProfileData {
  firstName: string;
  lastName: string;
  displayName: string;
  phone: string;
  bio: string;
  location: string;
  birthDate: string;
  emergencyContact: string;
  emergencyContactName: string;
  bloodType: string;
  allergies: string;
  medications: string;
  profileImage: string | null;
  notificationsEnabled: boolean;
  locationSharingEnabled: boolean;
  darkModeEnabled: boolean;
  gender: string;
  occupation: string;
  company: string;
  website: string;
  socialMedia: {
    twitter: string;
    instagram: string;
    linkedin: string;
  };
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export default function ProfileScreen() {
  const { user, updateProfile, signOut, isDemoMode } = useAuth();
  const { t, isDark } = useSettings();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Profile data state
  const [profileData, setProfileData] = useState<ProfileData>({
    firstName: '',
    lastName: '',
    displayName: '',
    phone: '',
    bio: '',
    location: '',
    birthDate: '',
    emergencyContact: '',
    emergencyContactName: '',
    bloodType: '',
    allergies: '',
    medications: '',
    profileImage: null,
    notificationsEnabled: true,
    locationSharingEnabled: true,
    darkModeEnabled: false,
    gender: '',
    occupation: '',
    company: '',
    website: '',
    socialMedia: {
      twitter: '',
      instagram: '',
      linkedin: '',
    },
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
  });
  
  // Stats from real data
  const [stats, setStats] = useState({
    vibesReported: 0,
    eventsReported: 0,
    sosReported: 0,
    communityScore: 0,
    totalReports: 0,
    resolvedReports: 0,
  });
  
  const [achievements, setAchievements] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  // Load profile data on mount
  useEffect(() => {
    loadProfileData();
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadProfileData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Try to load from Supabase users table first
      const { data: userData, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single() as any;
      
      if (!error && userData) {
        console.log('Loaded user profile from Supabase:', userData);
        setProfileData(prev => ({
          ...prev,
          firstName: userData.first_name || '',
          lastName: userData.last_name || '',
          displayName: userData.display_name || `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || user.email?.split('@')[0] || 'User',
          phone: userData.phone || '',
          bio: userData.bio || '',
          location: userData.location || '',
          birthDate: userData.birth_date || '',
          emergencyContact: userData.emergency_contact || '',
          emergencyContactName: userData.emergency_contact_name || '',
          bloodType: userData.blood_type || '',
          allergies: userData.allergies || '',
          medications: userData.medications || '',
          profileImage: userData.profile_image_url || null,
          notificationsEnabled: userData.notifications_enabled ?? true,
          locationSharingEnabled: userData.location_sharing_enabled ?? true,
          darkModeEnabled: userData.dark_mode_enabled ?? false,
          gender: userData.gender || '',
          occupation: userData.occupation || '',
          company: userData.company || '',
          website: userData.website || '',
          socialMedia: userData.social_media || {
            twitter: '',
            instagram: '',
            linkedin: '',
          },
          address: userData.address || '',
          city: userData.city || '',
          state: userData.state || '',
          zipCode: userData.zip_code || '',
          country: userData.country || '',
        }));
      } else {
        // Fallback to user metadata and AsyncStorage
        const savedProfile = await AsyncStorage.getItem(`profile_${user.id}`);
        if (savedProfile) {
          const parsed = JSON.parse(savedProfile);
          setProfileData(prev => ({ ...prev, ...parsed }));
        }
        
        if (user.user_metadata) {
          setProfileData(prev => ({
            ...prev,
            displayName: user.user_metadata.displayName || user.email?.split('@')[0] || 'User',
            phone: user.user_metadata.phone || '',
            bio: user.user_metadata.bio || '',
            location: user.user_metadata.location || '',
            birthDate: user.user_metadata.birthDate || '',
            emergencyContact: user.user_metadata.emergencyContact || '',
            emergencyContactName: user.user_metadata.emergencyContactName || '',
            bloodType: user.user_metadata.bloodType || '',
            allergies: user.user_metadata.allergies || '',
            medications: user.user_metadata.medications || '',
            profileImage: user.user_metadata.profile_image_url || null,
          }));
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const loadStats = async () => {
    if (!user) return;
    
    try {
      // Load real stats from Supabase
      const { data: alerts, error: alertsError } = await supabase
        .from('alerts')
        .select('*')
        .eq('user_id', user.id);
      
      if (!alertsError && alerts) {
        const vibes = alerts.filter((a: any) => a.report_type === 'vibe').length;
        const events = alerts.filter((a: any) => a.report_type === 'event').length;
        const sos = alerts.filter((a: any) => a.report_type === 'sos').length;
        const totalReports = alerts.length;
        
        // Count resolved reports (assuming resolved field exists or checking responded_by)
        const resolved = alerts.filter((a: any) => a.resolved || a.responded_by).length;
        
        setStats({
          vibesReported: vibes,
          eventsReported: events,
          sosReported: sos,
          communityScore: Math.min(100, totalReports * 10),
          totalReports: totalReports,
          resolvedReports: resolved,
        });
        
        // Set recent activity (last 5 alerts)
        const recent = alerts
          .sort((a: any, b: any) => {
            const dateA = new Date(a.created_at || a.timestamp || 0).getTime();
            const dateB = new Date(b.created_at || b.timestamp || 0).getTime();
            return dateB - dateA;
          })
          .slice(0, 5);
        setRecentActivity(recent);
        
        // Generate achievements based on real activity
        const achievementsList = [];
        if (vibes >= 1) {
          achievementsList.push({ id: 'first_vibe', title: 'First Vibe', description: 'Shared your first vibe' });
        }
        if (vibes >= 5) {
          achievementsList.push({ id: 'vibe5', title: 'Vibe Reporter', description: 'Reported 5 vibes' });
        }
        if (vibes >= 10) {
          achievementsList.push({ id: 'vibe10', title: 'Vibe Master', description: 'Reported 10 vibes' });
        }
        if (events >= 1) {
          achievementsList.push({ id: 'first_event', title: 'Event Spotter', description: 'Reported your first event' });
        }
        if (events >= 5) {
          achievementsList.push({ id: 'event5', title: 'Event Watcher', description: 'Reported 5 events' });
        }
        if (sos >= 1) {
          achievementsList.push({ id: 'helper', title: 'Community Helper', description: 'Used SOS feature' });
        }
        if (totalReports >= 20) {
          achievementsList.push({ id: 'active', title: 'Active Member', description: '20+ total reports' });
        }
        setAchievements(achievementsList);
      } else {
        // No alerts yet - set everything to zero
        setStats({
          vibesReported: 0,
          eventsReported: 0,
          sosReported: 0,
          communityScore: 0,
          totalReports: 0,
          resolvedReports: 0,
        });
        setRecentActivity([]);
        setAchievements([]);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
      // Reset to empty state on error
      setStats({
        vibesReported: 0,
        eventsReported: 0,
        sosReported: 0,
        communityScore: 0,
        totalReports: 0,
        resolvedReports: 0,
      });
      setRecentActivity([]);
      setAchievements([]);
    }
  };

  const handleImagePicker = async () => {
    try {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(t('permissionRequired'), t('permissionMessage'));
          return;
        }
      }

      Alert.alert(
        t('changePhoto'),
        t('selectOption'),
        [
          { text: t('cancel'), style: 'cancel' },
          { text: t('camera'), onPress: () => openCamera() },
          { text: t('gallery'), onPress: () => openImageLibrary() },
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
          Alert.alert(t('permissionRequired'), t('permissionMessage'));
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
        await uploadImage(imageUri);
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
        await uploadImage(imageUri);
      }
    } catch (error) {
      console.error('Error opening image library:', error);
      Alert.alert('Error', 'Failed to open image library');
    }
  };

  const uploadImage = async (imageUri: string) => {
    if (!user) return;
    
    try {
      setSaving(true);
      
      // For web, we'll use the data URI directly
      // For mobile, upload to Supabase Storage
      if (Platform.OS === 'web' || imageUri.startsWith('data:')) {
        // Use data URI directly for web
        setProfileData(prev => ({ ...prev, profileImage: imageUri }));
        
        // Save to database
        const { error } = await supabase
          .from('users')
          .upsert({
            id: user.id,
            email: user.email || '',
            profile_image_url: imageUri,
            updated_at: new Date().toISOString(),
          } as any);
        
        if (error) {
          console.error('Database update error:', error);
          throw error;
        }
        
        await updateProfile({ profile_image_url: imageUri });
        Alert.alert(t('success'), t('profileUpdated'));
      } else {
        // For mobile, upload to Supabase Storage
        const response = await fetch(imageUri);
        const blob = await response.blob();
        
        // Generate unique filename
        const fileName = `${user.id}_${Date.now()}.jpg`;
        
        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('profile-images')
          .upload(fileName, blob, {
            contentType: 'image/jpeg',
            upsert: true,
          });
        
        if (uploadError) {
          console.error('Storage upload error:', uploadError);
          // Fallback to base64
          const reader = new FileReader();
          reader.readAsDataURL(blob);
          reader.onloadend = async () => {
            const base64data = reader.result as string;
            setProfileData(prev => ({ ...prev, profileImage: base64data }));
            
            const { error } = await supabase
              .from('users')
              .upsert({
                id: user.id,
                email: user.email || '',
                profile_image_url: base64data,
                updated_at: new Date().toISOString(),
              } as any);
            
            if (!error) {
              await updateProfile({ profile_image_url: base64data });
              Alert.alert(t('success'), t('profileUpdated'));
            }
          };
          return;
        }
        
        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('profile-images')
          .getPublicUrl(fileName);
        
        setProfileData(prev => ({ ...prev, profileImage: publicUrl }));
        
        // Save URL to database
        const { error } = await supabase
          .from('users')
          .upsert({
            id: user.id,
            email: user.email || '',
            profile_image_url: publicUrl,
            updated_at: new Date().toISOString(),
          } as any);
        
        if (error) {
          console.error('Database update error:', error);
          throw error;
        }
        
        await updateProfile({ profile_image_url: publicUrl });
        Alert.alert(t('success'), t('profileUpdated'));
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert(t('error'), t('profileUpdateError'));
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      if (!user) {
        Alert.alert(t('error'), 'No user logged in');
        return;
      }
      
      // Try to update or insert into Supabase users table
      // Update display name to include first and last name if not manually set
      const displayName = profileData.displayName || `${profileData.firstName} ${profileData.lastName}`.trim();
      
      const { error: upsertError } = await (supabase as any)
        .from('users')
        .upsert({
          id: user.id,
          email: user.email,
          first_name: profileData.firstName,
          last_name: profileData.lastName,
          display_name: displayName,
          phone: profileData.phone,
          bio: profileData.bio,
          location: profileData.location,
          birth_date: profileData.birthDate,
          emergency_contact: profileData.emergencyContact,
          emergency_contact_name: profileData.emergencyContactName,
          blood_type: profileData.bloodType,
          allergies: profileData.allergies,
          medications: profileData.medications,
          profile_image_url: profileData.profileImage,
          notifications_enabled: profileData.notificationsEnabled,
          location_sharing_enabled: profileData.locationSharingEnabled,
          dark_mode_enabled: profileData.darkModeEnabled,
          gender: profileData.gender,
          occupation: profileData.occupation,
          company: profileData.company,
          website: profileData.website,
          social_media: profileData.socialMedia,
          address: profileData.address,
          city: profileData.city,
          state: profileData.state,
          zip_code: profileData.zipCode,
          country: profileData.country,
          updated_at: new Date().toISOString(),
        });
      
      if (upsertError) {
        console.error('Error updating user profile in Supabase:', upsertError);
        // Fallback to AsyncStorage
        await AsyncStorage.setItem(`profile_${user.id}`, JSON.stringify(profileData));
      }
      
      // Also update auth metadata
      await updateProfile({
        displayName: profileData.displayName,
        phone: profileData.phone,
        bio: profileData.bio,
        location: profileData.location,
        birthDate: profileData.birthDate,
        emergencyContact: profileData.emergencyContact,
        emergencyContactName: profileData.emergencyContactName,
        bloodType: profileData.bloodType,
        allergies: profileData.allergies,
        medications: profileData.medications,
      });
      
      setEditing(false);
      Alert.alert(t('success'), t('profileUpdated'));
    } catch (error: any) {
      Alert.alert(t('error'), error.message);
    } finally {
      setSaving(false);
    }
  };
  
  const handleCancel = () => {
    loadProfileData();
    setEditing(false);
  };

  const handleSignOut = () => {
    Alert.alert(
      t('signOut'),
      t('areYouSureSignOut'),
      [
        { text: t('cancel'), style: 'cancel' },
        { text: t('signOut'), style: 'destructive', onPress: () => signOut() },
      ]
    );
  };



  // Navigation handlers for menu items
  const handleNotifications = () => {
    router.push('/notifications');
  };
  
  const handlePrivacySecurity = () => {
    router.push('/privacy-security' as any);
  };
  
  const handlePaymentMethods = () => {
    router.push('/payment-methods' as any);
  };
  
  const handleSavedPlaces = () => {
    router.push('/saved-places' as any);
  };
  
  const handleAchievements = () => {
    router.push('/achievements' as any);
  };
  
  const handleTrustedContacts = () => {
    router.push('/trusted-contacts' as any);
  };
  
  const handleHelpSupport = () => {
    router.push('/help-support' as any);
  };
  
  const handleTermsPolicies = () => {
    router.push('/terms-policies' as any);
  };
  
  const handleSettings = () => {
    router.push('/settings' as any);
  };

  const menuSections = [
    {
      title: t('account'),
      items: [
        { 
          icon: Bell, 
          label: t('notifications'), 
          onPress: handleNotifications 
        },
        { icon: Lock, label: t('privacySecurity'), onPress: handlePrivacySecurity },
        { icon: MapPin, label: t('savedPlaces'), onPress: handleSavedPlaces },
      ]
    },
    {
      title: t('community'),
      items: [
        { 
          icon: Award, 
          label: t('achievements'), 
          onPress: handleAchievements 
        },
        { 
          icon: Users, 
          label: t('trustedContacts'), 
          onPress: handleTrustedContacts 
        },
      ]
    },
    {
      title: t('support'),
      items: [
        { icon: HelpCircle, label: t('helpSupport'), onPress: handleHelpSupport },
        { icon: FileText, label: t('termsPolicies'), onPress: handleTermsPolicies },
        { icon: Settings, label: t('settings'), onPress: handleSettings },
      ]
    },
  ];

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#000000" />
      </View>
    );
  }

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header Section */}
        <View style={[styles.header, isDark && styles.headerDark, { paddingTop: insets.top + 20 }]}>
          {/* App Logo and Name */}
          <View style={styles.appHeader}>
            <Image 
              source={{ uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/aqlrwbgnosn05yewyps54' }}
              style={styles.appLogo}
              resizeMode="contain"
            />
            <Text style={[styles.appName, isDark && styles.appNameDark]}>HyperAPP</Text>
            {isDemoMode && (
              <View style={styles.demoBadge}>
                <Text style={styles.demoBadgeText}>DEMO</Text>
              </View>
            )}
          </View>
          
          <View style={styles.profileSection}>
            <TouchableOpacity 
              onPress={editing ? handleImagePicker : undefined} 
              style={[styles.avatarContainer, editing && styles.avatarEditing]}
              disabled={!editing}
            >
              {profileData.profileImage ? (
                <Image
                  source={{ uri: profileData.profileImage }}
                  style={styles.avatarImage}
                />
              ) : (
                <View style={[styles.avatarImage, styles.avatarPlaceholder, isDark && styles.avatarPlaceholderDark]}>
                  <User size={40} color={isDark ? "#666" : "#8e8e93"} />
                </View>
              )}
              {editing && (
                <View style={[styles.cameraButton, isDark && styles.cameraButtonDark]}>
                  <Camera size={14} color="#ffffff" />
                </View>
              )}
            </TouchableOpacity>
            
            <View style={styles.profileInfo}>
              {editing ? (
                <TextInput
                  style={styles.nameInput}
                  value={profileData.displayName || `${profileData.firstName} ${profileData.lastName}`.trim()}
                  onChangeText={(text) => setProfileData(prev => ({ ...prev, displayName: text }))}
                  placeholder={t('displayName')}
                  placeholderTextColor="#8e8e93"
                />
              ) : (
                <Text style={[styles.name, isDark && styles.nameDark]}>
                  {profileData.firstName && profileData.lastName 
                    ? `${profileData.firstName} ${profileData.lastName}`
                    : profileData.displayName || t('user')}
                </Text>
              )}
              
              <Text style={[styles.email, isDark && styles.emailDark]}>{user?.email}</Text>
              
              {!editing && profileData.bio && (
                <Text style={[styles.bio, isDark && styles.bioDark]} numberOfLines={2}>{profileData.bio}</Text>
              )}
            </View>
            
            {!editing ? (
              <TouchableOpacity
                style={[styles.editButton, isDark && styles.editButtonDark]}
                onPress={() => setEditing(true)}
              >
                <Edit3 size={18} color={isDark ? "#ffffff" : "#000000"} />
              </TouchableOpacity>
            ) : (
              <View style={styles.editActions}>
                <TouchableOpacity
                  style={[styles.editActionButton, styles.cancelButton, isDark && styles.cancelButtonDark]}
                  onPress={handleCancel}
                  disabled={saving}
                >
                  <X size={18} color={isDark ? "#999" : "#666666"} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.editActionButton, styles.saveButton]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Check size={18} color="#ffffff" />
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <LinearGradient
            colors={['#4CAF50', '#66BB6A']}
            style={styles.statCard}
          >
            <Text style={styles.statNumber}>{stats.vibesReported}</Text>
            <Text style={styles.statLabel}>{t('vibesShared')}</Text>
          </LinearGradient>
          
          <LinearGradient
            colors={['#2196F3', '#42A5F5']}
            style={styles.statCard}
          >
            <Text style={styles.statNumber}>{stats.totalReports}</Text>
            <Text style={styles.statLabel}>{t('totalReports')}</Text>
          </LinearGradient>
          
          <LinearGradient
            colors={['#FF9800', '#FFB74D']}
            style={styles.statCard}
          >
            <Text style={styles.statNumber}>{stats.eventsReported}</Text>
            <Text style={styles.statLabel}>{t('eventsReported')}</Text>
          </LinearGradient>
        </View>

        {/* Personal Information Section - Always visible with enhanced design */}
        <View style={[styles.personalInfoCard, isDark && styles.personalInfoCardDark]}>
          <LinearGradient
            colors={['#6C63FF', '#5A52E0']}
            style={styles.personalInfoHeader}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.personalInfoTitleRow}>
              <User size={20} color="#ffffff" />
              <Text style={styles.personalInfoTitle}>{t('personalInformation')}</Text>
            </View>
            {!editing && (
              <TouchableOpacity
                style={styles.personalInfoEditButton}
                onPress={() => setEditing(true)}
              >
                <Edit3 size={16} color="#ffffff" />
              </TouchableOpacity>
            )}
          </LinearGradient>
          
          <View style={styles.personalInfoContent}>
            {/* Display Mode - Always visible */}
            {!editing ? (
              <View style={styles.personalInfoGrid}>
                <View style={styles.personalInfoItem}>
                  <View style={styles.personalInfoIconWrapper}>
                    <User size={16} color="#6C63FF" />
                  </View>
                  <View style={styles.personalInfoTextWrapper}>
                    <Text style={[styles.personalInfoLabel, isDark && styles.personalInfoLabelDark]}>{t('fullName')}</Text>
                    <Text style={[styles.personalInfoValue, isDark && styles.personalInfoValueDark]}>
                      {profileData.firstName && profileData.lastName 
                        ? `${profileData.firstName} ${profileData.lastName}`
                        : profileData.displayName || t('notSet')}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.personalInfoItem}>
                  <View style={styles.personalInfoIconWrapper}>
                    <Phone size={16} color="#6C63FF" />
                  </View>
                  <View style={styles.personalInfoTextWrapper}>
                    <Text style={[styles.personalInfoLabel, isDark && styles.personalInfoLabelDark]}>{t('phone')}</Text>
                    <Text style={[styles.personalInfoValue, isDark && styles.personalInfoValueDark]}>
                      {profileData.phone || t('notSet')}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.personalInfoItem}>
                  <View style={styles.personalInfoIconWrapper}>
                    <MapPin size={16} color="#6C63FF" />
                  </View>
                  <View style={styles.personalInfoTextWrapper}>
                    <Text style={[styles.personalInfoLabel, isDark && styles.personalInfoLabelDark]}>{t('location')}</Text>
                    <Text style={[styles.personalInfoValue, isDark && styles.personalInfoValueDark]}>
                      {profileData.city && profileData.country 
                        ? `${profileData.city}, ${profileData.country}`
                        : profileData.location || t('notSet')}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.personalInfoItem}>
                  <View style={styles.personalInfoIconWrapper}>
                    <Calendar size={16} color="#6C63FF" />
                  </View>
                  <View style={styles.personalInfoTextWrapper}>
                    <Text style={[styles.personalInfoLabel, isDark && styles.personalInfoLabelDark]}>{t('birthDate')}</Text>
                    <Text style={[styles.personalInfoValue, isDark && styles.personalInfoValueDark]}>
                      {profileData.birthDate || t('notSet')}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.personalInfoItem}>
                  <View style={styles.personalInfoIconWrapper}>
                    <Shield size={16} color="#6C63FF" />
                  </View>
                  <View style={styles.personalInfoTextWrapper}>
                    <Text style={[styles.personalInfoLabel, isDark && styles.personalInfoLabelDark]}>{t('emergencyContact')}</Text>
                    <Text style={[styles.personalInfoValue, isDark && styles.personalInfoValueDark]}>
                      {profileData.emergencyContactName || t('notSet')}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.personalInfoItem}>
                  <View style={styles.personalInfoIconWrapper}>
                    <Heart size={16} color="#6C63FF" />
                  </View>
                  <View style={styles.personalInfoTextWrapper}>
                    <Text style={[styles.personalInfoLabel, isDark && styles.personalInfoLabelDark]}>{t('bloodType')}</Text>
                    <Text style={[styles.personalInfoValue, isDark && styles.personalInfoValueDark]}>
                      {profileData.bloodType || t('notSet')}
                    </Text>
                  </View>
                </View>
              </View>
            ) : (
              /* Edit Mode */
              <View style={styles.personalInfoEditMode}>
            
                <Text style={styles.editSectionTitle}>{t('basicInformation')}</Text>
                
                <View style={styles.editFieldGroup}>
                  <View style={styles.editField}>
                    <View style={styles.editFieldLabel}>
                      <User size={14} color="#6C63FF" />
                      <Text style={styles.editFieldLabelText}>{t('firstName')} *</Text>
                    </View>
                    <TextInput
                      style={styles.editFieldInput}
                      value={profileData.firstName}
                      onChangeText={(text) => setProfileData(prev => ({ ...prev, firstName: text }))}
                      placeholder={t('enterFirstName')}
                      placeholderTextColor="#999999"
                    />
                  </View>
                  
                  <View style={styles.editField}>
                    <View style={styles.editFieldLabel}>
                      <User size={14} color="#6C63FF" />
                      <Text style={styles.editFieldLabelText}>{t('lastName')} *</Text>
                    </View>
                    <TextInput
                      style={styles.editFieldInput}
                      value={profileData.lastName}
                      onChangeText={(text) => setProfileData(prev => ({ ...prev, lastName: text }))}
                      placeholder={t('enterLastName')}
                      placeholderTextColor="#999999"
                    />
                  </View>
                </View>
            
                <View style={styles.editField}>
                  <View style={styles.editFieldLabel}>
                    <User size={14} color="#6C63FF" />
                    <Text style={styles.editFieldLabelText}>{t('gender')}</Text>
                  </View>
                  <TextInput
                    style={styles.editFieldInput}
                    value={profileData.gender}
                    onChangeText={(text) => setProfileData(prev => ({ ...prev, gender: text }))}
                    placeholder={t('selectGender')}
                    placeholderTextColor="#999999"
                  />
                </View>
            
                <View style={styles.editField}>
                  <View style={styles.editFieldLabel}>
                    <FileText size={14} color="#6C63FF" />
                    <Text style={styles.editFieldLabelText}>{t('bio')}</Text>
                  </View>
                  <TextInput
                    style={[styles.editFieldInput, styles.editFieldTextArea]}
                    value={profileData.bio}
                    onChangeText={(text) => setProfileData(prev => ({ ...prev, bio: text }))}
                    placeholder={t('tellAboutYourself')}
                    placeholderTextColor="#999999"
                    multiline
                    maxLength={150}
                  />
                  <Text style={styles.characterCount}>{profileData.bio.length}/150</Text>
                </View>
            
                <View style={styles.editField}>
                  <View style={styles.editFieldLabel}>
                    <Phone size={14} color="#6C63FF" />
                    <Text style={styles.editFieldLabelText}>{t('phoneNumber')}</Text>
                  </View>
                  <TextInput
                    style={styles.editFieldInput}
                    value={profileData.phone}
                    onChangeText={(text) => setProfileData(prev => ({ ...prev, phone: text }))}
                    placeholder="+1 (555) 123-4567"
                    placeholderTextColor="#999999"
                    keyboardType="phone-pad"
                  />
                </View>
            
                <View style={styles.editField}>
                  <View style={styles.editFieldLabel}>
                    <MapPin size={14} color="#6C63FF" />
                    <Text style={styles.editFieldLabelText}>{t('location')}</Text>
                  </View>
                  <TextInput
                    style={styles.editFieldInput}
                    value={profileData.location}
                    onChangeText={(text) => setProfileData(prev => ({ ...prev, location: text }))}
                    placeholder="City, Country"
                    placeholderTextColor="#999999"
                  />
                </View>
            
                <View style={styles.editField}>
                  <View style={styles.editFieldLabel}>
                    <Calendar size={14} color="#6C63FF" />
                    <Text style={styles.editFieldLabelText}>{t('birthDate')}</Text>
                  </View>
                  <TextInput
                    style={styles.editFieldInput}
                    value={profileData.birthDate}
                    onChangeText={(text) => setProfileData(prev => ({ ...prev, birthDate: text }))}
                    placeholder="MM/DD/YYYY"
                    placeholderTextColor="#999999"
                  />
                </View>
            
                <Text style={[styles.editSectionTitle, { marginTop: 24 }]}>{t('emergencyInformation')}</Text>
            
                <View style={styles.editField}>
                  <View style={styles.editFieldLabel}>
                    <Shield size={14} color="#6C63FF" />
                    <Text style={styles.editFieldLabelText}>{t('emergencyContactName')}</Text>
                  </View>
                  <TextInput
                    style={styles.editFieldInput}
                    value={profileData.emergencyContactName}
                    onChangeText={(text) => setProfileData(prev => ({ ...prev, emergencyContactName: text }))}
                    placeholder={t('contactName')}
                    placeholderTextColor="#999999"
                  />
                </View>
            
                <View style={styles.editField}>
                  <View style={styles.editFieldLabel}>
                    <Phone size={14} color="#6C63FF" />
                    <Text style={styles.editFieldLabelText}>{t('emergencyPhone')}</Text>
                  </View>
                  <TextInput
                    style={styles.editFieldInput}
                    value={profileData.emergencyContact}
                    onChangeText={(text) => setProfileData(prev => ({ ...prev, emergencyContact: text }))}
                    placeholder={t('emergencyPhoneNumber')}
                    placeholderTextColor="#999999"
                    keyboardType="phone-pad"
                  />
                </View>
            
                <View style={styles.editFieldGroup}>
                  <View style={styles.editField}>
                    <View style={styles.editFieldLabel}>
                      <Heart size={14} color="#6C63FF" />
                      <Text style={styles.editFieldLabelText}>{t('bloodType')}</Text>
                    </View>
                    <TextInput
                      style={styles.editFieldInput}
                      value={profileData.bloodType}
                      onChangeText={(text) => setProfileData(prev => ({ ...prev, bloodType: text }))}
                      placeholder="e.g., O+"
                      placeholderTextColor="#999999"
                    />
                  </View>
            
                  <View style={styles.editField}>
                    <View style={styles.editFieldLabel}>
                      <AlertTriangle size={14} color="#6C63FF" />
                      <Text style={styles.editFieldLabelText}>{t('allergies')}</Text>
                    </View>
                    <TextInput
                      style={styles.editFieldInput}
                      value={profileData.allergies}
                      onChangeText={(text) => setProfileData(prev => ({ ...prev, allergies: text }))}
                      placeholder={t('listAnyAllergies')}
                      placeholderTextColor="#999999"
                    />
                  </View>
                </View>
            
                <View style={styles.editField}>
                  <View style={styles.editFieldLabel}>
                    <Heart size={14} color="#6C63FF" />
                    <Text style={styles.editFieldLabelText}>{t('currentMedications')}</Text>
                  </View>
                  <TextInput
                    style={[styles.editFieldInput, styles.editFieldTextArea]}
                    value={profileData.medications}
                    onChangeText={(text) => setProfileData(prev => ({ ...prev, medications: text }))}
                    placeholder={t('listCurrentMedications')}
                    placeholderTextColor="#999999"
                    multiline
                  />
                </View>
            
                <Text style={[styles.editSectionTitle, { marginTop: 24 }]}>{t('professionalInformation')}</Text>
            
                <View style={styles.editFieldGroup}>
                  <View style={styles.editField}>
                    <View style={styles.editFieldLabel}>
                      <User size={14} color="#6C63FF" />
                      <Text style={styles.editFieldLabelText}>{t('occupation')}</Text>
                    </View>
                    <TextInput
                      style={styles.editFieldInput}
                      value={profileData.occupation}
                      onChangeText={(text) => setProfileData(prev => ({ ...prev, occupation: text }))}
                      placeholder={t('yourOccupation')}
                      placeholderTextColor="#999999"
                    />
                  </View>
                  
                  <View style={styles.editField}>
                    <View style={styles.editFieldLabel}>
                      <Users size={14} color="#6C63FF" />
                      <Text style={styles.editFieldLabelText}>{t('company')}</Text>
                    </View>
                    <TextInput
                      style={styles.editFieldInput}
                      value={profileData.company}
                      onChangeText={(text) => setProfileData(prev => ({ ...prev, company: text }))}
                      placeholder={t('companyName')}
                      placeholderTextColor="#999999"
                    />
                  </View>
                </View>
            
                <View style={styles.editField}>
                  <View style={styles.editFieldLabel}>
                    <FileText size={14} color="#6C63FF" />
                    <Text style={styles.editFieldLabelText}>{t('website')}</Text>
                  </View>
                  <TextInput
                    style={styles.editFieldInput}
                    value={profileData.website}
                    onChangeText={(text) => setProfileData(prev => ({ ...prev, website: text }))}
                    placeholder="https://example.com"
                    placeholderTextColor="#999999"
                    keyboardType="url"
                    autoCapitalize="none"
                  />
                </View>
            
                <Text style={[styles.editSectionTitle, { marginTop: 24 }]}>{t('addressInformation')}</Text>
            
                <View style={styles.editField}>
                  <View style={styles.editFieldLabel}>
                    <MapPin size={14} color="#6C63FF" />
                    <Text style={styles.editFieldLabelText}>{t('streetAddress')}</Text>
                  </View>
                  <TextInput
                    style={styles.editFieldInput}
                    value={profileData.address}
                    onChangeText={(text) => setProfileData(prev => ({ ...prev, address: text }))}
                    placeholder="123 Main St"
                    placeholderTextColor="#999999"
                  />
                </View>
            
                <View style={styles.editFieldGroup}>
                  <View style={styles.editField}>
                    <View style={styles.editFieldLabel}>
                      <MapPin size={14} color="#6C63FF" />
                      <Text style={styles.editFieldLabelText}>{t('city')}</Text>
                    </View>
                    <TextInput
                      style={styles.editFieldInput}
                      value={profileData.city}
                      onChangeText={(text) => setProfileData(prev => ({ ...prev, city: text }))}
                      placeholder={t('city')}
                      placeholderTextColor="#999999"
                    />
                  </View>
                  
                  <View style={styles.editField}>
                    <View style={styles.editFieldLabel}>
                      <MapPin size={14} color="#6C63FF" />
                      <Text style={styles.editFieldLabelText}>{t('stateProvince')}</Text>
                    </View>
                    <TextInput
                      style={styles.editFieldInput}
                      value={profileData.state}
                      onChangeText={(text) => setProfileData(prev => ({ ...prev, state: text }))}
                      placeholder={t('state')}
                      placeholderTextColor="#999999"
                    />
                  </View>
                </View>
            
                <View style={styles.editFieldGroup}>
                  <View style={styles.editField}>
                    <View style={styles.editFieldLabel}>
                      <MapPin size={14} color="#6C63FF" />
                      <Text style={styles.editFieldLabelText}>{t('zipPostalCode')}</Text>
                    </View>
                    <TextInput
                      style={styles.editFieldInput}
                      value={profileData.zipCode}
                      onChangeText={(text) => setProfileData(prev => ({ ...prev, zipCode: text }))}
                      placeholder="12345"
                      placeholderTextColor="#999999"
                      keyboardType="numeric"
                    />
                  </View>
                  
                  <View style={styles.editField}>
                    <View style={styles.editFieldLabel}>
                      <MapPin size={14} color="#6C63FF" />
                      <Text style={styles.editFieldLabelText}>{t('country')}</Text>
                    </View>
                    <TextInput
                      style={styles.editFieldInput}
                      value={profileData.country}
                      onChangeText={(text) => setProfileData(prev => ({ ...prev, country: text }))}
                      placeholder={t('country')}
                      placeholderTextColor="#999999"
                    />
                  </View>
                </View>
            
                <Text style={[styles.editSectionTitle, { marginTop: 24 }]}>{t('socialMedia')}</Text>
            
                <View style={styles.editFieldGroup}>
                  <View style={styles.editField}>
                    <View style={styles.editFieldLabel}>
                      <FileText size={14} color="#6C63FF" />
                      <Text style={styles.editFieldLabelText}>Twitter/X</Text>
                    </View>
                    <TextInput
                      style={styles.editFieldInput}
                      value={profileData.socialMedia.twitter}
                      onChangeText={(text) => setProfileData(prev => ({ 
                        ...prev, 
                        socialMedia: { ...prev.socialMedia, twitter: text }
                      }))}
                      placeholder="@username"
                      placeholderTextColor="#999999"
                      autoCapitalize="none"
                    />
                  </View>
                  
                  <View style={styles.editField}>
                    <View style={styles.editFieldLabel}>
                      <Camera size={14} color="#6C63FF" />
                      <Text style={styles.editFieldLabelText}>Instagram</Text>
                    </View>
                    <TextInput
                      style={styles.editFieldInput}
                      value={profileData.socialMedia.instagram}
                      onChangeText={(text) => setProfileData(prev => ({ 
                        ...prev, 
                        socialMedia: { ...prev.socialMedia, instagram: text }
                      }))}
                      placeholder="@username"
                      placeholderTextColor="#999999"
                      autoCapitalize="none"
                    />
                  </View>
                </View>
                
                <View style={styles.editField}>
                  <View style={styles.editFieldLabel}>
                    <Users size={14} color="#6C63FF" />
                    <Text style={styles.editFieldLabelText}>LinkedIn</Text>
                  </View>
                  <TextInput
                    style={styles.editFieldInput}
                    value={profileData.socialMedia.linkedin}
                    onChangeText={(text) => setProfileData(prev => ({ 
                      ...prev, 
                      socialMedia: { ...prev.socialMedia, linkedin: text }
                    }))}
                    placeholder="linkedin.com/in/username"
                    placeholderTextColor="#999999"
                    autoCapitalize="none"
                  />
                </View>
                
                <View style={styles.editButtonsContainer}>
                  <TouchableOpacity
                    style={styles.editCancelButton}
                    onPress={handleCancel}
                    disabled={saving}
                  >
                    <Text style={styles.editCancelButtonText}>{t('cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.editSaveButton}
                    onPress={handleSave}
                    disabled={saving}
                  >
                    {saving ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Text style={styles.editSaveButtonText}>{t('saveChanges')}</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
        
        {/* Quick Settings - Always visible */}
        {!editing && (
          <View style={[styles.quickSettings, isDark && styles.quickSettingsDark]}>
            <Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>{t('quickSettings')}</Text>
            
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Bell size={20} color={isDark ? "#ffffff" : "#000000"} />
                <Text style={[styles.settingLabel, isDark && styles.settingLabelDark]}>{t('notifications')}</Text>
              </View>
              <Switch
                value={profileData.notificationsEnabled}
                onValueChange={async (value) => {
                  console.log('Toggling notifications to:', value);
                  const newData = { ...profileData, notificationsEnabled: value };
                  setProfileData(newData);
                  
                  // Save to AsyncStorage immediately
                  await AsyncStorage.setItem(`profile_${user?.id}`, JSON.stringify(newData));
                  
                  // Save to Supabase
                  if (user) {
                    try {
                      await supabase
                        .from('users')
                        .upsert({
                          id: user.id,
                          email: user.email || '',
                          notifications_enabled: value,
                          updated_at: new Date().toISOString(),
                        } as any);
                      console.log('Notifications setting saved to database');
                    } catch (error) {
                      console.error('Error saving notifications setting:', error);
                    }
                  }
                }}
                trackColor={{ false: '#767577', true: '#4CAF50' }}
                thumbColor={profileData.notificationsEnabled ? '#ffffff' : '#f4f3f4'}
              />
            </View>
            
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <MapPin size={20} color={isDark ? "#ffffff" : "#000000"} />
                <Text style={[styles.settingLabel, isDark && styles.settingLabelDark]}>{t('locationSharing')}</Text>
              </View>
              <Switch
                value={profileData.locationSharingEnabled}
                onValueChange={async (value) => {
                  console.log('Toggling location sharing to:', value);
                  const newData = { ...profileData, locationSharingEnabled: value };
                  setProfileData(newData);
                  
                  // Save to AsyncStorage immediately
                  await AsyncStorage.setItem(`profile_${user?.id}`, JSON.stringify(newData));
                  
                  // Save to Supabase
                  if (user) {
                    try {
                      await supabase
                        .from('users')
                        .upsert({
                          id: user.id,
                          email: user.email || '',
                          location_sharing_enabled: value,
                          updated_at: new Date().toISOString(),
                        } as any);
                      console.log('Location sharing setting saved to database');
                    } catch (error) {
                      console.error('Error saving location sharing setting:', error);
                    }
                  }
                }}
                trackColor={{ false: '#767577', true: '#4CAF50' }}
                thumbColor={profileData.locationSharingEnabled ? '#ffffff' : '#f4f3f4'}
              />
            </View>
          </View>
        )}

        {/* Menu Sections */}
        {menuSections.map((section, index) => (
          <View key={index} style={[styles.menuSection, isDark && styles.menuSectionDark]}>
            <Text style={[styles.menuSectionTitle, isDark && styles.menuSectionTitleDark]}>{section.title}</Text>
            {section.items.map((item, itemIndex) => {
              const IconComponent = item.icon;
              return (
                <TouchableOpacity
                  key={itemIndex}
                  style={[styles.menuItem, isDark && styles.menuItemDark]}
                  onPress={item.onPress}
                >
                  <View style={styles.menuItemLeft}>
                    <View style={[styles.menuIconContainer, isDark && styles.menuIconContainerDark]}>
                      <IconComponent size={20} color={isDark ? "#ffffff" : "#000000"} />
                    </View>
                    <Text style={[styles.menuItemText, isDark && styles.menuItemTextDark]}>{item.label}</Text>

                  </View>
                  <ChevronRight size={20} color={isDark ? "#666" : "#8e8e93"} />
                </TouchableOpacity>
              );
            })}
          </View>
        ))}

        {/* Recent Activity */}
        <View style={[styles.activitySection, isDark && styles.activitySectionDark]}>
          <View style={styles.activityHeader}>
            <Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>{t('recentActivity')}</Text>
            {recentActivity.length > 3 && (
              <TouchableOpacity onPress={() => router.push('/activity-history' as any)}>
                <Text style={styles.viewAllText}>{t('viewAll')}</Text>
              </TouchableOpacity>
            )}
          </View>
          {recentActivity.length > 0 ? (
            recentActivity.slice(0, 3).map((item) => (
              <TouchableOpacity 
                key={item.id} 
                style={[styles.activityItem, isDark && styles.activityItemDark]}
                onPress={() => router.push(`/alert-details/${item.id}` as any)}
              >
                <View style={[styles.activityIcon, isDark && styles.activityIconDark]}>
                  {item.report_type === 'vibe' && <Heart size={16} color="#4CAF50" />}
                  {item.report_type === 'event' && <AlertTriangle size={16} color="#FF9800" />}
                  {item.report_type === 'sos' && <Shield size={16} color="#FF0000" />}
                </View>
                <View style={styles.activityContent}>
                  <Text style={[styles.activityTitle, isDark && styles.activityTitleDark]} numberOfLines={1}>
                    {item.alert_type || item.description || `${item.report_type} report`}
                  </Text>
                  <Text style={[styles.activityDate, isDark && styles.activityDateDark]}>
                    {new Date(item.created_at || item.timestamp).toLocaleDateString()}
                  </Text>
                </View>
                <ChevronRight size={16} color={isDark ? "#666" : "#8e8e93"} />
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <AlertTriangle size={32} color={isDark ? "#666" : "#8e8e93"} />
              <Text style={[styles.emptyStateText, isDark && styles.emptyStateTextDark]}>{t('noActivityYet')}</Text>
              <Text style={[styles.emptyStateSubtext, isDark && styles.emptyStateSubtextDark]}>{t('reportsWillAppearHere')}</Text>
            </View>
          )}
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity style={[styles.signOutButton, isDark && styles.signOutButtonDark]} onPress={handleSignOut}>
          <LogOut size={20} color="#ff4757" />
          <Text style={styles.signOutText}>{t('signOut')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: '#FAFBFD',
  },
  containerDark: {
    backgroundColor: '#000000',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: 'transparent',
    paddingHorizontal: 24,
    paddingBottom: 32,
    borderBottomWidth: 0,
    borderBottomColor: 'transparent',
  },
  appHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 10,
  },
  appLogo: {
    width: 32,
    height: 32,
  },
  appName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1C1E',
    letterSpacing: -0.5,
  },
  appNameDark: {
    color: '#FFFFFF',
  },
  headerDark: {
    backgroundColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarEditing: {
    opacity: 0.8,
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarPlaceholder: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholderDark: {
    backgroundColor: '#1f1f1f',
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
  cameraButtonDark: {
    backgroundColor: '#ffffff',
    borderColor: '#141414',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
  },
  email: {
    fontSize: 14,
    color: '#8e8e93',
    marginTop: 2,
  },
  emailDark: {
    color: '#666',
  },
  bio: {
    fontSize: 14,
    color: '#666666',
    marginTop: 4,
    lineHeight: 20,
  },
  bioDark: {
    color: '#999',
  },
  name: {
    fontSize: 28,
    fontWeight: '300',
    color: '#1C1C1E',
    marginBottom: 6,
    letterSpacing: -0.8,
  },
  nameDark: {
    color: '#FFFFFF',
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
  editButtonDark: {
    backgroundColor: '#2a2a2a',
  },
  editActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editActionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  cancelButtonDark: {
    backgroundColor: '#2a2a2a',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 18,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
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
  personalInfoCard: {
    marginTop: 20,
    marginHorizontal: 24,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 24,
    elevation: 4,
    overflow: 'hidden',
  },
  personalInfoCardDark: {
    backgroundColor: '#1C1C1E',
    shadowColor: '#000',
    shadowOpacity: 0.2,
  },
  personalInfoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  personalInfoTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  personalInfoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  personalInfoEditButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  personalInfoContent: {
    padding: 20,
  },
  personalInfoGrid: {
    gap: 16,
  },
  personalInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  personalInfoIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F3F2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  personalInfoTextWrapper: {
    flex: 1,
  },
  personalInfoLabel: {
    fontSize: 12,
    color: '#8e8e93',
    marginBottom: 2,
  },
  personalInfoLabelDark: {
    color: '#666',
  },
  personalInfoValue: {
    fontSize: 15,
    color: '#000000',
    fontWeight: '600',
  },
  personalInfoValueDark: {
    color: '#ffffff',
  },
  personalInfoEditMode: {
    gap: 16,
  },
  editSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6C63FF',
    marginBottom: 12,
  },
  editFieldGroup: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  editField: {
    flex: 1,
    marginBottom: 16,
  },
  editFieldLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  editFieldLabelText: {
    fontSize: 13,
    color: '#666666',
    fontWeight: '500',
  },
  editFieldInput: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#000000',
    backgroundColor: '#FAFAFA',
  },
  editFieldTextArea: {
    minHeight: 80,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  characterCount: {
    fontSize: 11,
    color: '#8e8e93',
    textAlign: 'right',
    marginTop: 4,
  },
  editButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  editCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    alignItems: 'center',
  },
  editCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666666',
  },
  editSaveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#6C63FF',
    alignItems: 'center',
  },
  editSaveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  bioInput: {
    minHeight: 60,
    textAlignVertical: 'top',
    paddingTop: 4,
  },
  menuSection: {
    backgroundColor: '#FFFFFF',
    marginTop: 20,
    marginHorizontal: 24,
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 16,
    elevation: 2,
  },
  menuSectionDark: {
    backgroundColor: '#1C1C1E',
    shadowOpacity: 0.15,
  },
  menuSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8e8e93',
    textTransform: 'uppercase',
    marginTop: 8,
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  menuSectionTitleDark: {
    color: '#666',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  menuItemDark: {
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  badge: {
    backgroundColor: '#FF0000',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(108, 99, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuIconContainerDark: {
    backgroundColor: 'rgba(108, 99, 255, 0.2)',
  },
  menuItemText: {
    fontSize: 17,
    color: '#1C1C1E',
    fontWeight: '400',
  },
  menuItemTextDark: {
    color: '#FFFFFF',
  },
  activitySection: {
    backgroundColor: '#FFFFFF',
    marginTop: 20,
    marginHorizontal: 24,
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingVertical: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 16,
    elevation: 2,
  },
  activitySectionDark: {
    backgroundColor: '#1C1C1E',
    shadowOpacity: 0.15,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  viewAllText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 16,
  },
  sectionTitleDark: {
    color: '#ffffff',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  activityItemDark: {
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(108, 99, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  activityIconDark: {
    backgroundColor: 'rgba(108, 99, 255, 0.2)',
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },
  activityTitleDark: {
    color: '#ffffff',
  },
  activityDate: {
    fontSize: 12,
    color: '#8e8e93',
  },
  activityDateDark: {
    color: '#666',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#000000',
    fontWeight: '600',
    marginTop: 12,
  },
  emptyStateTextDark: {
    color: '#ffffff',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#8e8e93',
    marginTop: 4,
  },
  emptyStateSubtextDark: {
    color: '#666',
  },
  quickSettings: {
    backgroundColor: '#FFFFFF',
    marginTop: 20,
    marginHorizontal: 24,
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingVertical: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 16,
    elevation: 2,
  },
  quickSettingsDark: {
    backgroundColor: '#1C1C1E',
    shadowOpacity: 0.15,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingLabel: {
    fontSize: 16,
    color: '#000000',
    fontWeight: '500',
  },
  settingLabelDark: {
    color: '#ffffff',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.08)',
    marginTop: 24,
    marginBottom: 40,
    marginHorizontal: 24,
    paddingVertical: 18,
    borderRadius: 20,
    gap: 10,
  },
  signOutButtonDark: {
    backgroundColor: 'rgba(255, 59, 48, 0.12)',
  },
  signOutText: {
    fontSize: 17,
    fontWeight: '500',
    color: '#FF3B30',
  },
  demoBadge: {
    backgroundColor: '#ff4757',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  demoBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
