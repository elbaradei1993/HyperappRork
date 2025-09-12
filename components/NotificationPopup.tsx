import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  useWindowDimensions,
  Platform,
  PanResponder,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Bell, AlertTriangle, MapPin, Sparkles, X, ChevronRight, Shield, Users, Zap } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

interface NotificationPopupProps {
  notification: {
    id: string;
    type: 'sos' | 'event' | 'vibe' | 'system' | 'safety' | 'social' | 'achievement';
    title: string;
    description: string;
    timestamp: string;
    priority?: 'high' | 'medium' | 'low';
    icon?: string;
    actionText?: string;
  };
  onDismiss: () => void;
  onPress?: () => void;
  duration?: number;
}

export const NotificationPopup: React.FC<NotificationPopupProps> = ({
  notification,
  onDismiss,
  onPress,
  duration = 5000,
}) => {
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-200)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.9)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const shimmerAnimation = useRef(new Animated.Value(0)).current;
  const pulseAnimation = useRef(new Animated.Value(1)).current;
  const progressAnimation = useRef(new Animated.Value(1)).current;
  const [isVisible, setIsVisible] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleDismiss = useCallback(() => {
    if (!isVisible) return;
    setIsVisible(false);
    
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -200,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 0.9,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
    });
  }, [isVisible, translateY, opacity, scale, onDismiss]);

  const handleSwipeDismiss = useCallback((direction: 'left' | 'right') => {
    if (!isVisible) return;
    setIsVisible(false);
    
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: direction === 'right' ? SCREEN_WIDTH : -SCREEN_WIDTH,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
    });
  }, [isVisible, translateX, opacity, SCREEN_WIDTH, onDismiss]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 5 || Math.abs(gestureState.dx) > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy < 0) {
          translateY.setValue(insets.top + 20 + gestureState.dy);
        }
        if (Math.abs(gestureState.dx) > 20) {
          translateX.setValue(gestureState.dx);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy < -50) {
          handleDismiss();
        } else if (Math.abs(gestureState.dx) > SCREEN_WIDTH * 0.3) {
          handleSwipeDismiss(gestureState.dx > 0 ? 'right' : 'left');
        } else {
          Animated.parallel([
            Animated.spring(translateY, {
              toValue: insets.top + 20,
              useNativeDriver: true,
              tension: 40,
              friction: 8,
            }),
            Animated.spring(translateX, {
              toValue: 0,
              useNativeDriver: true,
              tension: 40,
              friction: 8,
            }),
          ]).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    // Haptic feedback on show
    if (Platform.OS !== 'web') {
      if (notification.priority === 'high') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }

    // Animate in with bounce
    Animated.sequence([
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: insets.top + 20,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
          velocity: 2,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 60,
          friction: 7,
        }),
      ]),
      // Add a subtle bounce effect
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.02,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Start shimmer animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnimation, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnimation, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Pulse animation for high priority
    if (notification.priority === 'high') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnimation, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnimation, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }

    // Progress bar animation
    Animated.timing(progressAnimation, {
      toValue: 0,
      duration: duration,
      useNativeDriver: false,
    }).start();

    // Auto dismiss
    const timer = setTimeout(() => {
      handleDismiss();
    }, duration);
    dismissTimer.current = timer;

    return () => {
      if (dismissTimer.current) {
        clearTimeout(dismissTimer.current);
      }
    };
  }, [duration, handleDismiss, insets.top, opacity, scale, translateY, shimmerAnimation, pulseAnimation, progressAnimation, notification.priority]);



  const handlePress = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    if (dismissTimer.current) {
      clearTimeout(dismissTimer.current);
    }
    if (onPress) {
      onPress();
    }
    handleDismiss();
  };

  const handleLongPress = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
    setIsExpanded(!isExpanded);
  };

  const getIcon = () => {
    const iconSize = 24;
    const iconColor = '#FFFFFF';
    
    switch (notification.type) {
      case 'sos':
        return <AlertTriangle size={iconSize} color={iconColor} />;
      case 'event':
        return <MapPin size={iconSize} color={iconColor} />;
      case 'vibe':
        return <Sparkles size={iconSize} color={iconColor} />;
      case 'safety':
        return <Shield size={iconSize} color={iconColor} />;
      case 'social':
        return <Users size={iconSize} color={iconColor} />;
      case 'achievement':
        return <Zap size={iconSize} color={iconColor} />;
      default:
        return <Bell size={iconSize} color={iconColor} />;
    }
  };

  const getGradientColors = (): readonly [string, string, string] => {
    switch (notification.type) {
      case 'sos':
        return ['#FF6B6B', '#FF4757', '#EE5A24'] as const;
      case 'event':
        return ['#4ECDC4', '#44A08D', '#2ECC71'] as const;
      case 'vibe':
        return ['#667EEA', '#764BA2', '#F093FB'] as const;
      case 'safety':
        return ['#00D2FF', '#3A7BD5', '#00D2FF'] as const;
      case 'social':
        return ['#FA8BFF', '#2BD2FF', '#2BFF88'] as const;
      case 'achievement':
        return ['#FFD200', '#F7971E', '#FFD200'] as const;
      default:
        return ['#3B82F6', '#2563EB', '#1E40AF'] as const;
    }
  };

  const getBackgroundGradient = (): readonly [string, string] => {
    if (notification.priority === 'high') {
      return ['rgba(255, 59, 48, 0.15)', 'rgba(255, 59, 48, 0.05)'] as const;
    }
    return ['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)'] as const;
  };

  const getTimeAgo = () => {
    const now = new Date();
    const timestamp = new Date(notification.timestamp);
    const seconds = Math.floor((now.getTime() - timestamp.getTime()) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [
            { translateY },
            { translateX },
            { scale },
          ],
          opacity,
        },
      ]}
      {...panResponder.panHandlers}
    >
      <TouchableOpacity
        activeOpacity={0.95}
        onPress={handlePress}
        onLongPress={handleLongPress}
        style={styles.touchable}
      >
        {Platform.OS === 'ios' ? (
          <BlurView intensity={90} tint="dark" style={styles.blurContainer}>
            <LinearGradient
              colors={getBackgroundGradient()}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
            <Animated.View
              style={[
                styles.shimmerOverlay,
                {
                  opacity: shimmerAnimation.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0, 0.15, 0],
                  }),
                  transform: [
                    {
                      translateX: shimmerAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-SCREEN_WIDTH, SCREEN_WIDTH],
                      }),
                    },
                  ],
                },
              ]}
            />
            <View style={styles.content}>
              <Animated.View
                style={[
                  styles.iconWrapper,
                  notification.priority === 'high' && {
                    transform: [{ scale: pulseAnimation }],
                  },
                ]}
              >
                <LinearGradient
                  colors={getGradientColors()}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.iconContainer}
                >
                  {getIcon()}
                </LinearGradient>
                {notification.priority === 'high' && (
                  <View style={styles.priorityBadge}>
                    <View style={styles.priorityDot} />
                  </View>
                )}
              </Animated.View>
              
              <View style={styles.textContainer}>
                <View style={styles.headerRow}>
                  <Text style={styles.title} numberOfLines={isExpanded ? 2 : 1}>
                    {notification.title}
                  </Text>
                  <View style={styles.timeContainer}>
                    <Text style={styles.time}>{getTimeAgo()}</Text>
                  </View>
                </View>
                <Text style={styles.description} numberOfLines={isExpanded ? 4 : 2}>
                  {notification.description}
                </Text>
                {notification.actionText && (
                  <View style={styles.actionTextContainer}>
                    <Text style={styles.actionText}>{notification.actionText}</Text>
                    <ChevronRight size={14} color="#FFFFFF" opacity={0.9} />
                  </View>
                )}
              </View>
              
              {onPress && (
                <Animated.View
                  style={[
                    styles.actionContainer,
                    {
                      transform: [
                        {
                          rotate: shimmerAnimation.interpolate({
                            inputRange: [0, 1],
                            outputRange: ['0deg', '360deg'],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <ChevronRight size={20} color="#FFFFFF" opacity={0.8} />
                </Animated.View>
              )}
            </View>
            <Animated.View
              style={[
                styles.progressBar,
                {
                  width: progressAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </BlurView>
        ) : (
          <View style={styles.androidContainer}>
            <LinearGradient
              colors={['rgba(30, 30, 30, 0.98)', 'rgba(20, 20, 20, 0.98)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.androidGradient}
            >
              <LinearGradient
                colors={getBackgroundGradient()}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFillObject}
              />
              <Animated.View
                style={[
                  styles.shimmerOverlay,
                  {
                    opacity: shimmerAnimation.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: [0, 0.15, 0],
                    }),
                    transform: [
                      {
                        translateX: shimmerAnimation.interpolate({
                          inputRange: [0, 1],
                          outputRange: [-SCREEN_WIDTH, SCREEN_WIDTH],
                        }),
                      },
                    ],
                  },
                ]}
              />
              <View style={styles.content}>
                <Animated.View
                  style={[
                    styles.iconWrapper,
                    notification.priority === 'high' && {
                      transform: [{ scale: pulseAnimation }],
                    },
                  ]}
                >
                  <LinearGradient
                    colors={getGradientColors()}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.iconContainer}
                  >
                    {getIcon()}
                  </LinearGradient>
                  {notification.priority === 'high' && (
                    <View style={styles.priorityBadge}>
                      <View style={styles.priorityDot} />
                    </View>
                  )}
                </Animated.View>
                
                <View style={styles.textContainer}>
                  <View style={styles.headerRow}>
                    <Text style={styles.title} numberOfLines={isExpanded ? 2 : 1}>
                      {notification.title}
                    </Text>
                    <View style={styles.timeContainer}>
                      <Text style={styles.time}>{getTimeAgo()}</Text>
                    </View>
                  </View>
                  <Text style={styles.description} numberOfLines={isExpanded ? 4 : 2}>
                    {notification.description}
                  </Text>
                  {notification.actionText && (
                    <View style={styles.actionTextContainer}>
                      <Text style={styles.actionText}>{notification.actionText}</Text>
                      <ChevronRight size={14} color="#FFFFFF" opacity={0.9} />
                    </View>
                  )}
                </View>
                
                {onPress && (
                  <Animated.View
                    style={[
                      styles.actionContainer,
                      {
                        transform: [
                          {
                            rotate: shimmerAnimation.interpolate({
                              inputRange: [0, 1],
                              outputRange: ['0deg', '360deg'],
                            }),
                          },
                        ],
                      },
                    ]}
                  >
                    <ChevronRight size={20} color="#FFFFFF" opacity={0.8} />
                  </Animated.View>
                )}
              </View>
              <Animated.View
                style={[
                  styles.progressBar,
                  {
                    width: progressAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            </LinearGradient>
          </View>
        )}
      </TouchableOpacity>
      
      <TouchableOpacity
        style={styles.closeButton}
        onPress={handleDismiss}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <LinearGradient
          colors={['rgba(255, 255, 255, 0.2)', 'rgba(255, 255, 255, 0.1)']}
          style={styles.closeButtonGradient}
        >
          <X size={16} color="#FFFFFF" />
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 9999,
    elevation: 10,
  },
  touchable: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 12,
  },
  blurContainer: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  androidContainer: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  androidGradient: {
    borderRadius: 24,
  },
  shimmerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    width: '30%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    minHeight: 88,
  },
  iconWrapper: {
    position: 'relative',
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  priorityBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(30, 30, 30, 0.98)',
  },
  priorityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
    marginRight: 8,
    letterSpacing: 0.2,
  },
  timeContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  time: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  description: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: 20,
    letterSpacing: 0.1,
  },
  actionTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  actionText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '600',
    marginRight: 4,
  },
  actionContainer: {
    marginLeft: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  closeButtonGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
  },
  progressBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
});

export default NotificationPopup;
