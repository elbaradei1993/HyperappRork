import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

interface AnalyticsEvent {
  name: string;
  properties?: Record<string, any>;
  timestamp: number;
  sessionId: string;
  userId?: string;
}

interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
}

interface ErrorLog {
  message: string;
  stack?: string;
  context?: Record<string, any>;
  timestamp: number;
  userId?: string;
}

class Analytics {
  private static instance: Analytics;
  private sessionId: string;
  private userId?: string;
  private events: AnalyticsEvent[] = [];
  private metrics: PerformanceMetric[] = [];
  private errors: ErrorLog[] = [];
  private readonly MAX_QUEUE_SIZE = 100;
  private readonly STORAGE_KEY = '@analytics_queue';

  private constructor() {
    this.sessionId = this.generateSessionId();
    this.loadQueue();
  }

  static getInstance(): Analytics {
    if (!Analytics.instance) {
      Analytics.instance = new Analytics();
    }
    return Analytics.instance;
  }

  private generateSessionId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  setUserId(userId: string | undefined): void {
    this.userId = userId;
  }

  // Event Tracking
  track(eventName: string, properties?: Record<string, any>): void {
    const event: AnalyticsEvent = {
      name: eventName,
      properties: {
        ...properties,
        platform: Platform.OS,
        platformVersion: Platform.Version,
      },
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId,
    };

    this.events.push(event);
    console.log('Analytics Event:', eventName, properties);

    // Trim queue if too large
    if (this.events.length > this.MAX_QUEUE_SIZE) {
      this.events = this.events.slice(-this.MAX_QUEUE_SIZE);
    }

    this.saveQueue();
  }

  // Performance Monitoring
  trackPerformance(name: string, value: number, unit: string = 'ms'): void {
    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: Date.now(),
    };

    this.metrics.push(metric);
    console.log('Performance Metric:', name, value, unit);

    // Trim queue if too large
    if (this.metrics.length > this.MAX_QUEUE_SIZE) {
      this.metrics = this.metrics.slice(-this.MAX_QUEUE_SIZE);
    }

    this.saveQueue();
  }

  // Error Tracking
  trackError(error: Error | string, context?: Record<string, any>): void {
    const errorLog: ErrorLog = {
      message: typeof error === 'string' ? error : error.message,
      stack: typeof error === 'object' ? error.stack : undefined,
      context: {
        ...context,
        platform: Platform.OS,
        platformVersion: Platform.Version,
      },
      timestamp: Date.now(),
      userId: this.userId,
    };

    this.errors.push(errorLog);
    console.error('Analytics Error:', errorLog.message, context);

    // Trim queue if too large
    if (this.errors.length > this.MAX_QUEUE_SIZE) {
      this.errors = this.errors.slice(-this.MAX_QUEUE_SIZE);
    }

    this.saveQueue();
  }

  // Screen View Tracking
  trackScreen(screenName: string, properties?: Record<string, any>): void {
    this.track('screen_view', {
      screen_name: screenName,
      ...properties,
    });
  }

  // User Actions
  trackUserAction(action: string, target?: string, value?: any): void {
    this.track('user_action', {
      action,
      target,
      value,
    });
  }

  // Performance Helpers
  startTimer(name: string): () => void {
    const startTime = Date.now();
    return () => {
      const duration = Date.now() - startTime;
      this.trackPerformance(name, duration, 'ms');
    };
  }

  // Get Analytics Summary
  getSummary(): {
    totalEvents: number;
    totalErrors: number;
    averagePerformance: Record<string, number>;
    topEvents: Array<{ name: string; count: number }>;
  } {
    // Calculate average performance by metric name
    const performanceByName: Record<string, number[]> = {};
    this.metrics.forEach(metric => {
      if (!performanceByName[metric.name]) {
        performanceByName[metric.name] = [];
      }
      performanceByName[metric.name].push(metric.value);
    });

    const averagePerformance: Record<string, number> = {};
    Object.entries(performanceByName).forEach(([name, values]) => {
      averagePerformance[name] = values.reduce((a, b) => a + b, 0) / values.length;
    });

    // Count events by name
    const eventCounts: Record<string, number> = {};
    this.events.forEach(event => {
      eventCounts[event.name] = (eventCounts[event.name] || 0) + 1;
    });

    const topEvents = Object.entries(eventCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalEvents: this.events.length,
      totalErrors: this.errors.length,
      averagePerformance,
      topEvents,
    };
  }

  // Persistence
  private async loadQueue(): Promise<void> {
    try {
      const data = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        this.events = parsed.events || [];
        this.metrics = parsed.metrics || [];
        this.errors = parsed.errors || [];
      }
    } catch (error) {
      console.error('Failed to load analytics queue:', error);
    }
  }

  private async saveQueue(): Promise<void> {
    try {
      const data = {
        events: this.events,
        metrics: this.metrics,
        errors: this.errors,
      };
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save analytics queue:', error);
    }
  }

  // Clear all analytics data
  async clear(): Promise<void> {
    this.events = [];
    this.metrics = [];
    this.errors = [];
    this.sessionId = this.generateSessionId();
    await AsyncStorage.removeItem(this.STORAGE_KEY);
  }

  // Export data for debugging
  exportData(): {
    events: AnalyticsEvent[];
    metrics: PerformanceMetric[];
    errors: ErrorLog[];
  } {
    return {
      events: [...this.events],
      metrics: [...this.metrics],
      errors: [...this.errors],
    };
  }
}

export const analytics = Analytics.getInstance();

// React hooks for analytics
export const useAnalytics = () => {
  return {
    track: analytics.track.bind(analytics),
    trackScreen: analytics.trackScreen.bind(analytics),
    trackUserAction: analytics.trackUserAction.bind(analytics),
    trackPerformance: analytics.trackPerformance.bind(analytics),
    trackError: analytics.trackError.bind(analytics),
    startTimer: analytics.startTimer.bind(analytics),
  };
};
