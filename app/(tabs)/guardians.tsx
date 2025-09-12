import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Switch,
  RefreshControl,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Linking,
  Alert,
} from 'react-native';
import { useGuardian } from '@/contexts/GuardianContext';
import type { Guardian, GuardianAlert } from '@/contexts/GuardianContext';
import { useSettings } from '@/contexts/SettingsContext';
import { 
  Shield, 
  Plus, 
  Edit2, 
  Trash2, 
  Bell, 
  BellOff,
  Phone,
  Mail,
  User,
  AlertCircle,
  Send,
  MapPin,
  Heart,
  Activity,
  Clock,
  CheckCircle,
  XCircle,
  Star,
  Users,
  MessageCircle,
  TrendingUp,
  Award,
  Zap,
  Info
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function GuardiansScreen() {
  const { 
    guardians, 
    alerts,
    loading, 
    addGuardian, 
    updatePermissions, 
    removeGuardian,
    sendAlert,
    fetchGuardians,
    fetchAlerts,
  } = useGuardian();
  const { isDark } = useSettings();

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingGuardian, setEditingGuardian] = useState<Guardian | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [sendingAlert, setSendingAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [guardianEmail, setGuardianEmail] = useState('');
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'guardians' | 'alerts'>('guardians');
  const [permissions, setPermissions] = useState({
    view_location: true,
    receive_sos: true,
    view_vibe: true,
  });

  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const activeGuardians = guardians.filter(g => g.status === 'active');
  const pendingGuardians = guardians.filter(g => g.status === 'pending');
  const recentAlerts = alerts.slice(0, 5);

  // Stats calculations
  const totalAlertsSent = alerts.filter(a => a.alert_type === 'sos').length;
  const responseRate = activeGuardians.length > 0 
    ? Math.round((alerts.filter(a => a.is_read).length / Math.max(alerts.length, 1)) * 100)
    : 0;

  useEffect(() => {
    // Pulse animation for status indicators
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [pulseAnim, fadeAnim]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchGuardians(), fetchAlerts()]);
    setRefreshing(false);
  }, [fetchGuardians, fetchAlerts]);

  const handleAddGuardian = async () => {
    if (!guardianEmail) {
      return;
    }

    try {
      await addGuardian(guardianEmail);
      setShowAddModal(false);
      setGuardianEmail('');
      setPermissions({
        view_location: true,
        receive_sos: true,
        view_vibe: true,
      });
    } catch (error) {
      console.error('Failed to add guardian:', error);
    }
  };

  const handleUpdatePermissions = async () => {
    if (!editingGuardian) return;

    try {
      await updatePermissions(editingGuardian.id, permissions);
      setEditingGuardian(null);
    } catch (error) {
      console.error('Failed to update permissions:', error);
    }
  };

  const handleDeleteGuardian = async (id: string) => {
    Alert.alert(
      'Remove Guardian',
      'Are you sure you want to remove this guardian?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeGuardian(id);
            } catch (error) {
              console.error('Failed to remove guardian:', error);
            }
          },
        },
      ]
    );
  };

  const handleCallGuardian = (phoneNumber?: string) => {
    if (phoneNumber) {
      Linking.openURL(`tel:${phoneNumber}`);
    } else {
      Alert.alert('No Phone Number', 'This guardian has not provided a phone number.');
    }
  };

  const handleMessageGuardian = (email: string) => {
    Linking.openURL(`mailto:${email}?subject=HyperApp Alert`);
  };

  const getTrustLevel = (guardian: Guardian): number => {
    let level = 1;
    if (guardian.status === 'active') level++;
    if (guardian.permissions.receive_sos) level++;
    if (guardian.permissions.view_location) level++;
    if (guardian.created_at && new Date(guardian.created_at) < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) level++;
    return Math.min(level, 5);
  };

  const handleSendAlert = async (type: 'manual' | 'location_share') => {
    setSendingAlert(true);
    try {
      await sendAlert(type, alertMessage || undefined);
      setShowAlertModal(false);
      setAlertMessage('');
    } catch (error) {
      console.error('Failed to send alert:', error);
    } finally {
      setSendingAlert(false);
    }
  };

  const openEditModal = (guardian: Guardian) => {
    setEditingGuardian(guardian);
    setPermissions(guardian.permissions);
  };

  const renderGuardianCard = (guardian: Guardian) => {
    const isActive = guardian.status === 'active';
    const displayName = guardian.guardian_profile?.full_name || guardian.guardian_profile?.email || 'Unknown';
    const trustLevel = getTrustLevel(guardian);
    
    return (
      <Animated.View 
        key={guardian.id} 
        style={[styles.guardianCard, { opacity: fadeAnim }]}
      >
        <LinearGradient
          colors={isDark 
            ? (isActive ? ['#2a2a3e', '#1a1a2e'] : ['#3a3a4e', '#2a2a3e'])
            : (isActive ? ['#ffffff', '#f8f8f8'] : ['#f0f0f0', '#e8e8e8'])
          }
          style={styles.cardGradient}
        >
          <View style={styles.cardHeader}>
            <View style={styles.cardInfo}>
              <View style={styles.nameRow}>
                <Text style={[styles.guardianName, { color: isDark ? '#fff' : '#000' }]}>{displayName}</Text>
                {isActive && (
                  <Animated.View 
                    style={[
                      styles.statusDot,
                      { transform: [{ scale: pulseAnim }] }
                    ]}
                  />
                )}
              </View>
              <View style={styles.trustLevelContainer}>
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={`star-${guardian.id}-${i}`}
                    size={12}
                    color={i < trustLevel ? '#ffd700' : '#3a3a4e'}
                    fill={i < trustLevel ? '#ffd700' : 'transparent'}
                  />
                ))}
                <Text style={[styles.trustLevelText, { color: isDark ? '#8e8e93' : '#666' }]}>Trust Level</Text>
              </View>
            </View>
            <View style={styles.cardActions}>
              {isActive && (
                <TouchableOpacity
                  onPress={() => openEditModal(guardian)}
                  style={styles.iconButton}
                >
                  <Edit2 size={18} color="#ff4757" />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => handleDeleteGuardian(guardian.id)}
                style={styles.iconButton}
              >
                <Trash2 size={18} color="#ff6b6b" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.cardDetails}>
            <View style={styles.detailRow}>
              <Mail size={14} color="#8e8e93" />
              <Text style={[styles.detailText, { color: isDark ? '#8e8e93' : '#666' }]}>{guardian.guardian_profile?.email || 'No email'}</Text>
            </View>
            
            {isActive && guardian.guardian_profile?.email && (
              <View style={styles.quickActions}>
                <TouchableOpacity
                  style={styles.quickActionButton}
                  onPress={() => handleCallGuardian(undefined)}
                >
                  <Phone size={16} color="#4cd137" />
                  <Text style={[styles.quickActionText, { color: isDark ? '#fff' : '#000' }]}>Call</Text>
                </TouchableOpacity>
                {guardian.guardian_profile?.email && (
                  <TouchableOpacity
                    style={styles.quickActionButton}
                    onPress={() => handleMessageGuardian(guardian.guardian_profile!.email)}
                  >
                    <MessageCircle size={16} color="#3498db" />
                    <Text style={[styles.quickActionText, { color: isDark ? '#fff' : '#000' }]}>Message</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.quickActionButton}
                  onPress={() => handleSendAlert('location_share')}
                >
                  <MapPin size={16} color="#9b59b6" />
                  <Text style={[styles.quickActionText, { color: isDark ? '#fff' : '#000' }]}>Share</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {isActive && (
            <View style={styles.alertSettings}>
              <View style={styles.settingRow}>
                {guardian.permissions.receive_sos ? (
                  <Bell size={14} color="#4cd137" />
                ) : (
                  <BellOff size={14} color="#8e8e93" />
                )}
                <Text style={[styles.settingText, { color: isDark ? '#8e8e93' : '#666' }]}>
                  SOS Alerts: {guardian.permissions.receive_sos ? 'ON' : 'OFF'}
                </Text>
              </View>
              <View style={styles.settingRow}>
                {guardian.permissions.view_location ? (
                  <MapPin size={14} color="#4cd137" />
                ) : (
                  <MapPin size={14} color="#8e8e93" />
                )}
                <Text style={[styles.settingText, { color: isDark ? '#8e8e93' : '#666' }]}>
                  Location Access: {guardian.permissions.view_location ? 'ON' : 'OFF'}
                </Text>
              </View>
              <View style={styles.settingRow}>
                {guardian.permissions.view_vibe ? (
                  <Activity size={14} color="#4cd137" />
                ) : (
                  <Activity size={14} color="#8e8e93" />
                )}
                <Text style={[styles.settingText, { color: isDark ? '#8e8e93' : '#666' }]}>
                  Vibe Updates: {guardian.permissions.view_vibe ? 'ON' : 'OFF'}
                </Text>
              </View>
              {guardian.created_at && (
                <View style={styles.settingRow}>
                  <Clock size={14} color="#8e8e93" />
                  <Text style={[styles.settingText, { color: isDark ? '#8e8e93' : '#666' }]}>
                    Added: {new Date(guardian.created_at).toLocaleDateString()}
                  </Text>
                </View>
              )}
            </View>
          )}
        </LinearGradient>
      </Animated.View>
    );
  };

  const renderStatsCards = () => (
    <View style={styles.statsContainer}>
      <LinearGradient
        colors={['#ff4757', '#ff6b6b']}
        style={styles.statCard}
      >
        <View style={styles.statIconContainer}>
          <Shield size={24} color="#fff" />
        </View>
        <Text style={styles.statNumber}>{activeGuardians.length}</Text>
        <Text style={styles.statLabel}>Active Guardians</Text>
      </LinearGradient>

      <LinearGradient
        colors={['#3498db', '#5dade2']}
        style={styles.statCard}
      >
        <View style={styles.statIconContainer}>
          <Send size={24} color="#fff" />
        </View>
        <Text style={styles.statNumber}>{totalAlertsSent}</Text>
        <Text style={styles.statLabel}>Alerts Sent</Text>
      </LinearGradient>

      <LinearGradient
        colors={['#4cd137', '#44bd32']}
        style={styles.statCard}
      >
        <View style={styles.statIconContainer}>
          <TrendingUp size={24} color="#fff" />
        </View>
        <Text style={styles.statNumber}>{responseRate}%</Text>
        <Text style={styles.statLabel}>Response Rate</Text>
      </LinearGradient>
    </View>
  );

  const renderQuickActions = () => (
    <View style={styles.quickActionsSection}>
      <Text style={[styles.sectionTitle, { color: isDark ? '#fff' : '#000' }]}>Quick Actions</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <TouchableOpacity
          style={[styles.quickActionCard, { backgroundColor: '#ff4757' }]}
          onPress={() => setShowAlertModal(true)}
          disabled={activeGuardians.length === 0}
        >
          <Zap size={20} color="#fff" />
          <Text style={styles.quickActionCardText}>Emergency Alert</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.quickActionCard, { backgroundColor: '#3498db' }]}
          onPress={() => handleSendAlert('location_share')}
          disabled={activeGuardians.length === 0}
        >
          <MapPin size={20} color="#fff" />
          <Text style={styles.quickActionCardText}>Share Location</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.quickActionCard, { backgroundColor: '#9b59b6' }]}
          onPress={() => setShowAddModal(true)}
        >
          <Plus size={20} color="#fff" />
          <Text style={styles.quickActionCardText}>Add Guardian</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.quickActionCard, { backgroundColor: '#f39c12' }]}
          onPress={() => setShowInfoModal(true)}
        >
          <Info size={20} color="#fff" />
          <Text style={styles.quickActionCardText}>How It Works</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );

  const renderRecentAlert = (alert: GuardianAlert) => {
    const alertTypeIcons: Record<string, React.ReactNode> = {
      sos: <AlertCircle size={16} color="#ff4757" />,
      low_vibe: <Heart size={16} color="#ffa502" />,
      location_change: <MapPin size={16} color="#9b59b6" />,
      check_in_request: <User size={16} color="#3498db" />,
    };

    return (
      <View key={alert.id} style={[styles.alertItem, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)' }]}>
        <View style={styles.alertIcon}>
          {alertTypeIcons[alert.alert_type] || <AlertCircle size={16} color="#8e8e93" />}
        </View>
        <View style={styles.alertContent}>
          <Text style={[styles.alertType, { color: isDark ? '#fff' : '#000' }]}>
            {alert.alert_type.replace(/_/g, ' ').toUpperCase()}
          </Text>
          {alert.message && (
            <Text style={[styles.alertMessage, { color: isDark ? '#8e8e93' : '#666' }]}>{alert.message}</Text>
          )}
          <Text style={[styles.alertTime, { color: isDark ? '#6e6e73' : '#999' }]}>
            {new Date(alert.created_at).toLocaleString()}
          </Text>
        </View>
        <View style={styles.alertStatus}>
          {alert.is_read ? (
            <CheckCircle size={14} color="#4cd137" />
          ) : (
            <XCircle size={14} color="#ff4757" />
          )}
        </View>
      </View>
    );
  };

  const renderFormModal = () => (
    <Modal
      visible={showAddModal || !!editingGuardian}
      animationType="slide"
      transparent={true}
      onRequestClose={() => {
        setShowAddModal(false);
        setEditingGuardian(null);
      }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalContainer}
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>
            {editingGuardian ? 'Edit Guardian Permissions' : 'Add Guardian Angel'}
          </Text>

          {!editingGuardian && (
            <>
              <Text style={styles.modalDescription}>
                Enter the email address of the person you want to add as your Guardian Angel.
                If they&apos;re already on HyperApp, they&apos;ll receive a notification.
                Otherwise, we&apos;ll send them an invitation to join.
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Guardian&apos;s Email"
                placeholderTextColor="#8e8e93"
                value={guardianEmail}
                onChangeText={setGuardianEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </>
          )}

          {editingGuardian && (
            <>
              <Text style={styles.permissionsTitle}>Permissions</Text>
              
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Receive SOS Alerts</Text>
                <Switch
                  value={permissions.receive_sos}
                  onValueChange={(value) => setPermissions({ ...permissions, receive_sos: value })}
                  trackColor={{ false: '#3a3a4e', true: '#ff4757' }}
                  thumbColor="#fff"
                />
              </View>

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>View Location</Text>
                <Switch
                  value={permissions.view_location}
                  onValueChange={(value) => setPermissions({ ...permissions, view_location: value })}
                  trackColor={{ false: '#3a3a4e', true: '#ff4757' }}
                  thumbColor="#fff"
                />
              </View>

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>View Vibe Updates</Text>
                <Switch
                  value={permissions.view_vibe}
                  onValueChange={(value) => setPermissions({ ...permissions, view_vibe: value })}
                  trackColor={{ false: '#3a3a4e', true: '#ff4757' }}
                  thumbColor="#fff"
                />
              </View>
            </>
          )}

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => {
                setShowAddModal(false);
                setEditingGuardian(null);
                setGuardianEmail('');
              }}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.saveButton]}
              onPress={editingGuardian ? handleUpdatePermissions : handleAddGuardian}
            >
              <Text style={styles.buttonText}>
                {editingGuardian ? 'Update' : 'Add'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  const renderInfoModal = () => (
    <Modal
      visible={showInfoModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowInfoModal(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>How Guardian Angels Work</Text>
          
          <View style={styles.infoSection}>
            <View style={styles.infoItem}>
              <Shield size={20} color="#ff4757" />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoTitle}>Add Trusted Contacts</Text>
                <Text style={styles.infoDescription}>
                  Invite family and friends to be your Guardian Angels
                </Text>
              </View>
            </View>

            <View style={styles.infoItem}>
              <Bell size={20} color="#3498db" />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoTitle}>Set Permissions</Text>
                <Text style={styles.infoDescription}>
                  Control what information each guardian can access
                </Text>
              </View>
            </View>

            <View style={styles.infoItem}>
              <Send size={20} color="#4cd137" />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoTitle}>Send Alerts</Text>
                <Text style={styles.infoDescription}>
                  Quickly notify your guardians in case of emergency
                </Text>
              </View>
            </View>

            <View style={styles.infoItem}>
              <Award size={20} color="#ffd700" />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoTitle}>Build Trust</Text>
                <Text style={styles.infoDescription}>
                  Guardians earn trust levels based on their activity
                </Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.modalButton, styles.saveButton]}
            onPress={() => setShowInfoModal(false)}
          >
            <Text style={styles.buttonText}>Got It!</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderAlertModal = () => (
    <Modal
      visible={showAlertModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowAlertModal(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Send Alert to Guardians</Text>
          
          <TextInput
            style={[styles.input, styles.messageInput]}
            placeholder="Optional message..."
            placeholderTextColor="#8e8e93"
            value={alertMessage}
            onChangeText={setAlertMessage}
            multiline
            numberOfLines={4}
          />

          <View style={styles.alertTypeButtons}>
            <TouchableOpacity
              style={[styles.alertTypeButton, styles.manualAlertButton]}
              onPress={() => handleSendAlert('manual')}
              disabled={sendingAlert}
            >
              {sendingAlert ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Send size={20} color="#fff" />
                  <Text style={styles.alertTypeText}>Send Alert</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.alertTypeButton, styles.locationAlertButton]}
              onPress={() => handleSendAlert('location_share')}
              disabled={sendingAlert}
            >
              {sendingAlert ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <MapPin size={20} color="#fff" />
                  <Text style={styles.alertTypeText}>Share Location</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.modalButton, styles.cancelButton]}
            onPress={() => {
              setShowAlertModal(false);
              setAlertMessage('');
            }}
          >
            <Text style={styles.buttonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  if (loading && guardians.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ff4757" />
          <Text style={styles.loadingText}>Loading Guardian Angels...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#0f0f1e' : '#f5f5f5' }]}>
      <LinearGradient
        colors={isDark ? ['#0f0f1e', '#1a1a2e'] : ['#ffffff', '#f5f5f5']}
        style={styles.gradient}
      >
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Shield size={28} color="#ff4757" />
            <Text style={styles.title}>Guardian Angels</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.infoButton}
              onPress={() => setShowInfoModal(true)}
            >
              <Info size={20} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.alertButton}
              onPress={() => setShowAlertModal(true)}
              disabled={activeGuardians.length === 0}
            >
              <Send size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, selectedTab === 'guardians' && styles.activeTab]}
            onPress={() => setSelectedTab('guardians')}
          >
            <Users size={18} color={selectedTab === 'guardians' ? '#ff4757' : '#8e8e93'} />
            <Text style={[styles.tabText, selectedTab === 'guardians' && styles.activeTabText]}>
              Guardians
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, selectedTab === 'alerts' && styles.activeTab]}
            onPress={() => setSelectedTab('alerts')}
          >
            <Bell size={18} color={selectedTab === 'alerts' ? '#ff4757' : '#8e8e93'} />
            <Text style={[styles.tabText, selectedTab === 'alerts' && styles.activeTabText]}>
              Activity
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#ff4757"
            />
          }
        >
          {selectedTab === 'guardians' ? (
            <>
              {renderStatsCards()}
              {renderQuickActions()}
              
              {guardians.length === 0 ? (
            <View style={styles.emptyState}>
              <Shield size={64} color="#3a3a4e" />
              <Text style={styles.emptyTitle}>No Guardian Angels Yet</Text>
              <Text style={styles.emptyText}>
                Add trusted contacts who will be notified in case of emergency.
                They can be existing HyperApp users or you can invite them via email.
              </Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => setShowAddModal(true)}
              >
                <Plus size={20} color="#fff" />
                <Text style={styles.emptyButtonText}>Add Your First Guardian</Text>
              </TouchableOpacity>
            </View>
              ) : (
                <>
                  {activeGuardians.length > 0 && (
                    <View style={styles.guardiansSection}>
                      <Text style={styles.sectionTitle}>Active Guardians ({activeGuardians.length})</Text>
                      {activeGuardians.map(renderGuardianCard)}
                    </View>
                  )}

                  {pendingGuardians.length > 0 && (
                    <View style={styles.guardiansSection}>
                      <Text style={styles.sectionTitle}>Pending Invitations ({pendingGuardians.length})</Text>
                      {pendingGuardians.map(renderGuardianCard)}
                    </View>
                  )}
                </>
              )}
            </>
          ) : (

            <View style={styles.alertsSection}>
              <Text style={styles.sectionTitle}>Recent Activity</Text>
              {recentAlerts.length > 0 ? (
                recentAlerts.map(renderRecentAlert)
              ) : (
                <View style={styles.emptyAlerts}>
                  <Activity size={48} color="#3a3a4e" />
                  <Text style={styles.emptyAlertsText}>No recent activity</Text>
                  <Text style={styles.emptyAlertsSubtext}>
                    Your alert history will appear here
                  </Text>
                </View>
              )}
            </View>
          )}

          <View style={styles.bottomSpacer} />
        </ScrollView>

        <TouchableOpacity
          style={styles.fab}
          onPress={() => setShowAddModal(true)}
        >
          <Plus size={24} color="#fff" />
        </TouchableOpacity>

        {renderFormModal()}
        {renderAlertModal()}
        {renderInfoModal()}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1e',
  },
  gradient: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#8e8e93',
    marginTop: 16,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold' as const,
    color: '#fff',
  },
  alertButton: {
    backgroundColor: '#ff4757',
    padding: 10,
    borderRadius: 20,
  },
  infoButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 10,
    borderRadius: 20,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#ff4757',
  },
  tabText: {
    fontSize: 14,
    color: '#8e8e93',
  },
  activeTabText: {
    color: '#ff4757',
    fontWeight: '600' as const,
  },
  scrollView: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: '#fff',
    marginTop: 20,
  },
  emptyText: {
    fontSize: 14,
    color: '#8e8e93',
    marginTop: 8,
    textAlign: 'center' as const,
    paddingHorizontal: 40,
    marginBottom: 24,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff4757',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  guardiansSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#fff',
    marginBottom: 16,
  },
  guardianCard: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  cardGradient: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  guardianName: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#fff',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4cd137',
  },
  trustLevelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  trustLevelText: {
    fontSize: 11,
    color: '#8e8e93',
    marginLeft: 4,
  },
  guardianStatus: {
    fontSize: 14,
    color: '#8e8e93',
    marginTop: 2,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  quickActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    gap: 4,
  },
  quickActionText: {
    fontSize: 12,
    color: '#fff',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    padding: 4,
  },
  cardDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  detailText: {
    fontSize: 14,
    color: '#8e8e93',
  },
  alertSettings: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    paddingTop: 12,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  settingText: {
    fontSize: 12,
    color: '#8e8e93',
  },
  alertsSection: {
    padding: 20,
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  alertIcon: {
    marginRight: 12,
  },
  alertContent: {
    flex: 1,
  },
  alertType: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#fff',
    marginBottom: 2,
  },
  alertMessage: {
    fontSize: 12,
    color: '#8e8e93',
    marginBottom: 2,
  },
  alertTime: {
    fontSize: 10,
    color: '#6e6e73',
  },
  alertStatus: {
    marginLeft: 8,
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#ff4757',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  modalContent: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold' as const,
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center' as const,
  },
  modalDescription: {
    fontSize: 14,
    color: '#8e8e93',
    marginBottom: 20,
    textAlign: 'center' as const,
    lineHeight: 20,
  },
  permissionsTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
    marginBottom: 16,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    marginBottom: 12,
    fontSize: 16,
  },
  messageInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  switchLabel: {
    fontSize: 16,
    color: '#fff',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginRight: 8,
  },
  saveButton: {
    backgroundColor: '#ff4757',
    marginLeft: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  alertTypeButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 20,
    gap: 12,
  },
  alertTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    gap: 8,
  },
  manualAlertButton: {
    backgroundColor: '#3498db',
  },
  locationAlertButton: {
    backgroundColor: '#9b59b6',
  },
  alertTypeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  bottomSpacer: {
    height: 100,
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
  statIconContainer: {
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold' as const,
    color: '#fff',
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  quickActionsSection: {
    paddingVertical: 16,
  },
  quickActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 6,
    gap: 8,
  },
  quickActionCardText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500' as const,
  },
  emptyAlerts: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyAlertsText: {
    fontSize: 16,
    color: '#fff',
    marginTop: 16,
  },
  emptyAlertsSubtext: {
    fontSize: 14,
    color: '#8e8e93',
    marginTop: 4,
  },
  infoSection: {
    marginVertical: 20,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
    marginBottom: 4,
  },
  infoDescription: {
    fontSize: 13,
    color: '#8e8e93',
    lineHeight: 18,
  },
});
