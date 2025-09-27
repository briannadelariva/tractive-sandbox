import axios, { AxiosInstance } from 'axios';
import { config } from '../config';
import { Tracker, Position, Geofence } from '../types';

export class TractiveService {
  private axiosInstance: AxiosInstance;
  private accessToken: string | null = null;
  private userId: string | null = null;
  private sessionExpiry: number | null = null;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: config.tractive.baseUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Tractive Pet Tracker App/1.0.0',
      },
    });

    // Add response interceptor for token refresh
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401 && this.accessToken) {
          // Token expired, try to refresh
          await this.authenticate();
          // Retry original request
          if (error.config) {
            error.config.headers.Authorization = `Bearer ${this.accessToken}`;
            return this.axiosInstance.request(error.config);
          }
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Authenticate with Tractive API using email/password
   */
  async authenticate(): Promise<boolean> {
    try {
      const response = await this.axiosInstance.post('/auth/login', {
        email: config.tractive.email,
        password: config.tractive.password,
      });

      if (response.data.access_token) {
        this.accessToken = response.data.access_token;
        this.userId = response.data.user_id;
        this.sessionExpiry = Date.now() + (response.data.expires_in * 1000);
        
        // Set default authorization header
        this.axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${this.accessToken}`;
        
        console.log('Tractive authentication successful');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Tractive authentication failed:', error);
      return false;
    }
  }

  /**
   * Check if current session is valid
   */
  private isSessionValid(): boolean {
    return !!(this.accessToken && this.sessionExpiry && Date.now() < this.sessionExpiry);
  }

  /**
   * Ensure valid authentication before API calls
   */
  private async ensureAuthenticated(): Promise<void> {
    if (!this.isSessionValid()) {
      const success = await this.authenticate();
      if (!success) {
        throw new Error('Failed to authenticate with Tractive API');
      }
    }
  }

  /**
   * Get list of trackers for the authenticated user
   */
  async getTrackers(): Promise<Tracker[]> {
    await this.ensureAuthenticated();
    
    try {
      const response = await this.axiosInstance.get(`/user/${this.userId}/trackers`);
      return response.data.map((tracker: any) => ({
        id: tracker._id,
        name: tracker.details?.name || `Tracker ${tracker._id}`,
        pet_id: tracker.pet_id,
        model: tracker.model_number || 'Unknown',
        firmware: tracker.fw_version || 'Unknown',
        battery_level: tracker.battery_level || 0,
        battery_state: tracker.charging_state || 'unknown',
        capabilities: tracker.capabilities || [],
      }));
    } catch (error) {
      console.error('Failed to get trackers:', error);
      throw new Error('Failed to fetch trackers');
    }
  }

  /**
   * Get latest position for a tracker
   */
  async getLatestPosition(trackerId: string): Promise<Position | null> {
    await this.ensureAuthenticated();
    
    try {
      const response = await this.axiosInstance.get(`/tracker/${trackerId}/positions`, {
        params: {
          time_from: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          time_to: new Date().toISOString(),
          format: 'json_segments',
        },
      });

      const positions = response.data;
      if (positions && positions.length > 0) {
        const latest = positions[positions.length - 1];
        return {
          tracker_id: trackerId,
          timestamp: latest.time,
          latitude: latest.lat,
          longitude: latest.lng,
          speed: latest.speed || 0,
          accuracy: latest.pos_uncertainty || 0,
          altitude: latest.altitude,
          sensor_used: latest.sensor_used || 'unknown',
          pos_status: latest.pos_status || 0,
        };
      }
      
      return null;
    } catch (error) {
      console.error('Failed to get latest position:', error);
      throw new Error('Failed to fetch latest position');
    }
  }

  /**
   * Get position history for a tracker
   */
  async getPositionHistory(
    trackerId: string,
    from: Date,
    to: Date
  ): Promise<Position[]> {
    await this.ensureAuthenticated();
    
    try {
      const response = await this.axiosInstance.get(`/tracker/${trackerId}/positions`, {
        params: {
          time_from: from.toISOString(),
          time_to: to.toISOString(),
          format: 'json_segments',
        },
      });

      const positions = response.data || [];
      return positions.map((pos: any) => ({
        tracker_id: trackerId,
        timestamp: pos.time,
        latitude: pos.lat,
        longitude: pos.lng,
        speed: pos.speed || 0,
        accuracy: pos.pos_uncertainty || 0,
        altitude: pos.altitude,
        sensor_used: pos.sensor_used || 'unknown',
        pos_status: pos.pos_status || 0,
      }));
    } catch (error) {
      console.error('Failed to get position history:', error);
      throw new Error('Failed to fetch position history');
    }
  }

  /**
   * Get geofences for a tracker
   */
  async getGeofences(trackerId: string): Promise<Geofence[]> {
    await this.ensureAuthenticated();
    
    try {
      const response = await this.axiosInstance.get(`/tracker/${trackerId}/geofences`);
      return response.data.map((fence: any) => ({
        id: fence._id,
        name: fence.name,
        type: fence.shape.type,
        active: fence.active,
        center: fence.shape.center ? {
          lat: fence.shape.center.lat,
          lng: fence.shape.center.lng,
        } : undefined,
        radius: fence.shape.radius,
        coordinates: fence.shape.coordinates?.map((coord: any) => ({
          lat: coord.lat,
          lng: coord.lng,
        })),
      }));
    } catch (error) {
      console.error('Failed to get geofences:', error);
      throw new Error('Failed to fetch geofences');
    }
  }

  /**
   * Toggle live tracking for a tracker
   */
  async toggleLiveTracking(trackerId: string, active: boolean): Promise<boolean> {
    await this.ensureAuthenticated();
    
    try {
      const response = await this.axiosInstance.post(`/tracker/${trackerId}/live_tracking`, {
        active,
      });
      
      return response.status === 200;
    } catch (error) {
      console.error('Failed to toggle live tracking:', error);
      throw new Error('Failed to toggle live tracking');
    }
  }

  /**
   * Trigger LED on tracker
   */
  async triggerLED(trackerId: string): Promise<boolean> {
    await this.ensureAuthenticated();
    
    try {
      const response = await this.axiosInstance.post(`/tracker/${trackerId}/led`);
      return response.status === 200;
    } catch (error) {
      console.error('Failed to trigger LED:', error);
      throw new Error('Failed to trigger LED');
    }
  }

  /**
   * Trigger buzzer on tracker
   */
  async triggerBuzzer(trackerId: string): Promise<boolean> {
    await this.ensureAuthenticated();
    
    try {
      const response = await this.axiosInstance.post(`/tracker/${trackerId}/buzzer`);
      return response.status === 200;
    } catch (error) {
      console.error('Failed to trigger buzzer:', error);
      throw new Error('Failed to trigger buzzer');
    }
  }
}