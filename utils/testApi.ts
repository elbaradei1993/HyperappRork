// Test API client for development
// This can be used instead of Supabase for testing

const TEST_SERVER_URL = process.env.EXPO_PUBLIC_TEST_SERVER_URL || 'http://localhost:3001';

interface User {
  id: string;
  email: string;
  fullName: string;
  createdAt: string;
}

interface Alert {
  id: string;
  type: string;
  location: {
    latitude: number;
    longitude: number;
  };
  description?: string;
  createdAt: string;
  status: string;
}

interface SOSAlert {
  id: string;
  location: {
    latitude: number;
    longitude: number;
  };
  message?: string;
  timestamp: string;
  status: string;
}

interface VibeCheck {
  id: string;
  vibe: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  timestamp: string;
}

interface Geofence {
  id: string;
  name: string;
  center: {
    latitude: number;
    longitude: number;
  };
  radius: number;
  vibe?: string;
  createdAt: string;
}

class TestAPI {
  private token: string | null = null;

  private async request(endpoint: string, options: RequestInit = {}) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${TEST_SERVER_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Auth methods
  async signup(email: string, password: string, fullName: string): Promise<{ user: User; token: string }> {
    const result = await this.request('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, fullName }),
    });
    this.token = result.token;
    return result;
  }

  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    const result = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.token = result.token;
    return result;
  }

  async logout() {
    this.token = null;
  }

  // Alerts methods
  async getAlerts(): Promise<{ alerts: Alert[] }> {
    return this.request('/alerts');
  }

  async createAlert(alert: Omit<Alert, 'id' | 'createdAt' | 'status'>): Promise<Alert> {
    return this.request('/alerts', {
      method: 'POST',
      body: JSON.stringify(alert),
    });
  }

  async getAlert(id: string): Promise<Alert> {
    return this.request(`/alerts/${id}`);
  }

  async updateAlert(id: string, updates: Partial<Alert>): Promise<Alert> {
    return this.request(`/alerts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  // SOS methods
  async sendSOS(location: { latitude: number; longitude: number }, message?: string): Promise<SOSAlert> {
    return this.request('/sos', {
      method: 'POST',
      body: JSON.stringify({ location, message }),
    });
  }

  async getSOSHistory(): Promise<{ history: SOSAlert[] }> {
    return this.request('/sos/history');
  }

  // Vibe check methods
  async submitVibe(vibe: string, location?: { latitude: number; longitude: number }): Promise<VibeCheck> {
    return this.request('/vibe', {
      method: 'POST',
      body: JSON.stringify({ vibe, location }),
    });
  }

  async getVibeHistory(): Promise<{ history: VibeCheck[] }> {
    return this.request('/vibe/history');
  }

  // Geofences methods
  async getGeofences(): Promise<{ geofences: Geofence[] }> {
    return this.request('/geofences');
  }

  async createGeofence(geofence: Omit<Geofence, 'id' | 'createdAt'>): Promise<Geofence> {
    return this.request('/geofences', {
      method: 'POST',
      body: JSON.stringify(geofence),
    });
  }

  async deleteGeofence(id: string): Promise<{ success: boolean }> {
    return this.request(`/geofences/${id}`, {
      method: 'DELETE',
    });
  }

  // Real-time subscription (using EventSource for SSE)
  subscribe(channel: string, onMessage: (data: any) => void): () => void {
    if (typeof EventSource === 'undefined') {
      console.warn('EventSource not supported in this environment');
      return () => {};
    }

    const eventSource = new EventSource(`${TEST_SERVER_URL}/subscribe/${channel}`);
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (error) {
        console.error('Failed to parse SSE message:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE error:', error);
    };

    return () => {
      eventSource.close();
    };
  }
}

export const testAPI = new TestAPI();

// Export for easy switching between test and production
export const useTestMode = process.env.EXPO_PUBLIC_USE_TEST_SERVER === 'true';

console.log('Test API configured:', {
  url: TEST_SERVER_URL,
  testMode: useTestMode,
});
