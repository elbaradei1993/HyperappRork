import AsyncStorage from '@react-native-async-storage/async-storage';

const API_KEY = 'KDDyGfAzLbyZU8gDHYknKgY6oNBsScOR';
const BASE_URL = 'https://app.ticketmaster.com/discovery/v2';

// Rate limiting configuration
const RATE_LIMIT_DELAY = 1000; // 1 second between requests
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

interface CacheEntry {
  data: any;
  timestamp: number;
}

interface RateLimitState {
  lastRequestTime: number;
  requestQueue: Array<() => void>;
}

export interface Event {
  id: string;
  name: string;
  type: string;
  url: string;
  locale: string;
  images: Array<{
    url: string;
    width: number;
    height: number;
  }>;
  dates: {
    start: {
      localDate: string;
      localTime?: string;
      dateTime?: string;
    };
    status: {
      code: string;
    };
  };
  classifications?: Array<{
    primary: boolean;
    segment: {
      id: string;
      name: string;
    };
    genre?: {
      id: string;
      name: string;
    };
    subGenre?: {
      id: string;
      name: string;
    };
  }>;
  priceRanges?: Array<{
    type: string;
    currency: string;
    min: number;
    max: number;
  }>;
  _embedded?: {
    venues?: Array<{
      name: string;
      type: string;
      id: string;
      locale: string;
      postalCode?: string;
      timezone?: string;
      city?: {
        name: string;
      };
      state?: {
        name: string;
        stateCode: string;
      };
      country?: {
        name: string;
        countryCode: string;
      };
      address?: {
        line1: string;
      };
      location?: {
        longitude: string;
        latitude: string;
      };
    }>;
    attractions?: Array<{
      name: string;
      type: string;
      id: string;
      locale: string;
      images?: Array<{
        url: string;
        width: number;
        height: number;
      }>;
    }>;
  };
  distance?: number;
  units?: string;
}

export interface EventSearchParams {
  latlong?: string;
  radius?: string;
  unit?: 'miles' | 'km';
  keyword?: string;
  classificationName?: string;
  city?: string;
  stateCode?: string;
  countryCode?: string;
  size?: number;
  page?: number;
  sort?: 'name,asc' | 'name,desc' | 'date,asc' | 'date,desc' | 'relevance,asc' | 'relevance,desc' | 'distance,asc';
  startDateTime?: string;
  endDateTime?: string;
}

class TicketmasterAPI {
  private cache: Map<string, CacheEntry> = new Map();
  private rateLimitState: RateLimitState = {
    lastRequestTime: 0,
    requestQueue: []
  };
  private isProcessingQueue = false;

  private getCacheKey(endpoint: string, params: Record<string, any>): string {
    return `${endpoint}_${JSON.stringify(params)}`;
  }

  private getCachedData(key: string): any | null {
    const entry = this.cache.get(key);
    if (entry && Date.now() - entry.timestamp < CACHE_DURATION) {
      console.log('Using cached data for:', key);
      return entry.data;
    }
    if (entry) {
      this.cache.delete(key);
    }
    return null;
  }

  private setCachedData(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  private async processRequestQueue(): Promise<void> {
    if (this.isProcessingQueue || this.rateLimitState.requestQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.rateLimitState.requestQueue.length > 0) {
      const timeSinceLastRequest = Date.now() - this.rateLimitState.lastRequestTime;
      const waitTime = Math.max(0, RATE_LIMIT_DELAY - timeSinceLastRequest);

      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }

      const request = this.rateLimitState.requestQueue.shift();
      if (request) {
        this.rateLimitState.lastRequestTime = Date.now();
        request();
      }
    }

    this.isProcessingQueue = false;
  }

  private async makeRequestWithRateLimit(endpoint: string, params: Record<string, any> = {}): Promise<any> {
    return new Promise((resolve, reject) => {
      this.rateLimitState.requestQueue.push(async () => {
        try {
          const result = await this.makeRequestInternal(endpoint, params);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      this.processRequestQueue();
    });
  }

  private async makeRequestInternal(endpoint: string, params: Record<string, any> = {}, retryCount = 0): Promise<any> {
    const queryParams = new URLSearchParams({
      apikey: API_KEY,
      ...params
    });

    const url = `${BASE_URL}${endpoint}?${queryParams}`;
    
    try {
      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      // Handle rate limiting
      if (response.status === 429) {
        if (retryCount < MAX_RETRIES) {
          console.log(`Rate limited. Retrying in ${RETRY_DELAY}ms... (Attempt ${retryCount + 1}/${MAX_RETRIES})`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (retryCount + 1)));
          return this.makeRequestInternal(endpoint, params, retryCount + 1);
        }
        console.warn('Rate limit exceeded. Returning empty results.');
        return { _embedded: { events: [] }, page: { totalElements: 0 } };
      }
      
      if (!response.ok) {
        console.warn(`API request failed: ${response.status} ${response.statusText}`);
        return { _embedded: { events: [] }, page: { totalElements: 0 } };
      }
      
      const data = await response.json();
      return data;
    } catch (error: any) {
      // Handle different error types
      if (error.name === 'AbortError') {
        console.warn('Request timeout:', endpoint);
        // Don't retry on timeout, just return empty data
        return { _embedded: { events: [] }, page: { totalElements: 0 } };
      }
      
      if (error.message?.includes('Network request failed') || 
          error.message?.includes('Failed to fetch') ||
          error.message?.includes('NetworkError')) {
        console.warn('Network error - API may be unavailable or blocked');
        // Return empty data instead of throwing for network errors
        return { _embedded: { events: [] }, page: { totalElements: 0 } };
      }
      
      console.warn('Ticketmaster API error:', error.message || error);
      // Always return empty data instead of throwing
      return { _embedded: { events: [] }, page: { totalElements: 0 } };
    }
  }

  private async makeRequest(endpoint: string, params: Record<string, any> = {}): Promise<any> {
    const cacheKey = this.getCacheKey(endpoint, params);
    
    // Check cache first
    const cachedData = this.getCachedData(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    // Make request with rate limiting
    const data = await this.makeRequestWithRateLimit(endpoint, params);
    
    // Cache the result
    this.setCachedData(cacheKey, data);
    
    return data;
  }

  async searchEvents(params: EventSearchParams): Promise<{ events: Event[], totalElements: number }> {
    try {
      // Limit the size to reduce API calls
      const limitedParams = {
        ...params,
        size: Math.min(params.size || 10, 10) // Max 10 events per request
      };
      
      const response = await this.makeRequest('/events.json', limitedParams);
      
      if (response && response._embedded?.events) {
        return {
          events: response._embedded.events,
          totalElements: response.page?.totalElements || 0
        };
      }
      
      return { events: [], totalElements: 0 };
    } catch (error: any) {
      console.warn('Error searching events:', error.message || error);
      // Return empty results instead of throwing
      return { events: [], totalElements: 0 };
    }
  }

  async getEventDetails(eventId: string): Promise<Event | null> {
    try {
      const response = await this.makeRequest(`/events/${eventId}.json`);
      return response || null;
    } catch (error: any) {
      console.warn('Error getting event details:', error.message || error);
      return null;
    }
  }

  async getEventsByCategory(category: string, location: { lat: number, lng: number }, radius: number = 25): Promise<Event[]> {
    try {
      const params: EventSearchParams = {
        latlong: `${location.lat},${location.lng}`,
        radius: radius.toString(),
        unit: 'miles',
        classificationName: category,
        sort: 'date,asc',
        size: 10
      };

      const { events } = await this.searchEvents(params);
      return events || [];
    } catch (error: any) {
      console.warn('Error getting events by category:', error.message || error);
      return [];
    }
  }

  async getNearbyEvents(location: { lat: number, lng: number }, radius: number = 25): Promise<Event[]> {
    try {
      const params: EventSearchParams = {
        latlong: `${location.lat},${location.lng}`,
        radius: radius.toString(),
        unit: 'miles',
        sort: 'distance,asc',
        size: 10
      };

      const { events } = await this.searchEvents(params);
      return events || [];
    } catch (error: any) {
      console.warn('Error getting nearby events:', error.message || error);
      return [];
    }
  }

  async searchEventsByKeyword(keyword: string, location?: { lat: number, lng: number }): Promise<Event[]> {
    try {
      const params: EventSearchParams = {
        keyword,
        sort: 'relevance,desc',
        size: 10
      };

      if (location) {
        params.latlong = `${location.lat},${location.lng}`;
        params.radius = '50';
        params.unit = 'miles';
      }

      const { events } = await this.searchEvents(params);
      return events || [];
    } catch (error: any) {
      console.warn('Error searching events by keyword:', error.message || error);
      return [];
    }
  }

  // Save user preferences
  async saveUserPreferences(preferences: string[]) {
    try {
      await AsyncStorage.setItem('event_preferences', JSON.stringify(preferences));
    } catch (error) {
      console.error('Error saving preferences:', error);
    }
  }

  // Get user preferences
  async getUserPreferences(): Promise<string[]> {
    try {
      const prefs = await AsyncStorage.getItem('event_preferences');
      return prefs ? JSON.parse(prefs) : [];
    } catch (error) {
      console.error('Error getting preferences:', error);
      return [];
    }
  }

  // Get personalized recommendations
  async getPersonalizedEvents(location: { lat: number, lng: number }): Promise<Event[]> {
    try {
      const preferences = await this.getUserPreferences();
      
      if (preferences.length === 0) {
        return this.getNearbyEvents(location);
      }

      const allEvents: Event[] = [];
      
      // Limit to first 2 preferences to reduce API calls
      const limitedPreferences = preferences.slice(0, 2);
      
      for (const preference of limitedPreferences) {
        try {
          const events = await this.getEventsByCategory(preference, location, 30);
          if (events && events.length > 0) {
            allEvents.push(...events);
          }
        } catch (error) {
          console.warn(`Error fetching events for preference ${preference}:`, error);
        }
      }

      // Remove duplicates and sort by date
      const uniqueEvents = Array.from(new Map(allEvents.map(e => [e.id, e])).values());
      return uniqueEvents.sort((a, b) => {
        const dateA = new Date(a.dates.start.dateTime || a.dates.start.localDate);
        const dateB = new Date(b.dates.start.dateTime || b.dates.start.localDate);
        return dateA.getTime() - dateB.getTime();
      }).slice(0, 10); // Limit final results
    } catch (error: any) {
      console.warn('Error getting personalized events:', error.message || error);
      return [];
    }
  }

  // Track event interaction
  async trackEventInteraction(eventId: string, interactionType: 'view' | 'save' | 'share') {
    try {
      const key = `event_${interactionType}_history`;
      const history = await AsyncStorage.getItem(key);
      const historyArray = history ? JSON.parse(history) : [];
      
      historyArray.push({
        eventId,
        timestamp: new Date().toISOString()
      });

      // Keep only last 100 interactions
      if (historyArray.length > 100) {
        historyArray.shift();
      }

      await AsyncStorage.setItem(key, JSON.stringify(historyArray));
    } catch (error) {
      console.error('Error tracking interaction:', error);
    }
  }

  // Get saved events
  async getSavedEvents(): Promise<string[]> {
    try {
      const saved = await AsyncStorage.getItem('saved_events');
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error('Error getting saved events:', error);
      return [];
    }
  }

  // Save/unsave event
  async toggleSaveEvent(eventId: string): Promise<boolean> {
    try {
      const saved = await this.getSavedEvents();
      const index = saved.indexOf(eventId);
      
      if (index > -1) {
        saved.splice(index, 1);
      } else {
        saved.push(eventId);
      }

      await AsyncStorage.setItem('saved_events', JSON.stringify(saved));
      return index === -1; // Returns true if event was saved
    } catch (error) {
      console.error('Error toggling save event:', error);
      return false;
    }
  }
  // Clear cache method
  clearCache(): void {
    this.cache.clear();
    console.log('Ticketmaster API cache cleared');
  }
}

export default new TicketmasterAPI();
