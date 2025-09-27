import axios, { AxiosInstance } from 'axios';
import { ApiResponse, Tracker, Position, Geofence, Place, DistanceMatrixResult, TrailStats } from '../types';

export class ApiService {
  private axiosInstance: AxiosInstance;

  constructor(baseURL: string = '/api') {
    this.axiosInstance = axios.create({
      baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Response interceptor for error handling
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('API Error:', error);
        return Promise.reject(error);
      }
    );
  }

  // Authentication
  async login(): Promise<boolean> {
    try {
      const response = await this.axiosInstance.post<ApiResponse<{ message: string; sessionToken: string }>>(
        '/auth/login-tractive'
      );
      return response.data.success;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  }

  async getAuthStatus(): Promise<boolean> {
    try {
      const response = await this.axiosInstance.get<ApiResponse<{ authenticated: boolean }>>(
        '/auth/status'
      );
      return response.data.data?.authenticated || false;
    } catch (error) {
      return false;
    }
  }

  // Trackers
  async getTrackers(): Promise<Tracker[]> {
    try {
      const response = await this.axiosInstance.get<ApiResponse<Tracker[]>>('/trackers');
      return response.data.data || [];
    } catch (error) {
      console.error('Failed to fetch trackers:', error);
      return [];
    }
  }

  async getLatestPosition(trackerId: string): Promise<Position | null> {
    try {
      const response = await this.axiosInstance.get<ApiResponse<Position>>(
        `/trackers/${trackerId}/position`
      );
      return response.data.data || null;
    } catch (error) {
      console.error('Failed to fetch latest position:', error);
      return null;
    }
  }

  async getPositionHistory(
    trackerId: string,
    from?: Date,
    to?: Date
  ): Promise<{
    positions: Position[];
    trailStats: TrailStats | null;
    elevations: any[];
    summary: { count: number; dateRange: { from: Date; to: Date } };
  }> {
    try {
      const params: any = {};
      if (from) params.from = from.toISOString();
      if (to) params.to = to.toISOString();

      const response = await this.axiosInstance.get<ApiResponse<{
        positions: Position[];
        trailStats: TrailStats | null;
        elevations: any[];
        summary: { count: number; dateRange: { from: Date; to: Date } };
      }>>(`/trackers/${trackerId}/history`, { params });

      return response.data.data || {
        positions: [],
        trailStats: null,
        elevations: [],
        summary: { count: 0, dateRange: { from: new Date(), to: new Date() } },
      };
    } catch (error) {
      console.error('Failed to fetch position history:', error);
      return {
        positions: [],
        trailStats: null,
        elevations: [],
        summary: { count: 0, dateRange: { from: new Date(), to: new Date() } },
      };
    }
  }

  async getGeofences(trackerId: string): Promise<Geofence[]> {
    try {
      const response = await this.axiosInstance.get<ApiResponse<Geofence[]>>(
        `/trackers/${trackerId}/geofences`
      );
      return response.data.data || [];
    } catch (error) {
      console.error('Failed to fetch geofences:', error);
      return [];
    }
  }

  async getNearbyPlaces(trackerId: string, radius: number = 2000): Promise<{
    places: {
      parks: Place[];
      veterinary: Place[];
      petStores: Place[];
    };
    center: { lat: number; lng: number };
    radius: number;
  } | null> {
    try {
      const response = await this.axiosInstance.get<ApiResponse<{
        places: {
          parks: Place[];
          veterinary: Place[];
          petStores: Place[];
        };
        center: { lat: number; lng: number };
        radius: number;
      }>>(`/trackers/${trackerId}/places`, {
        params: { radius },
      });
      return response.data.data || null;
    } catch (error) {
      console.error('Failed to fetch nearby places:', error);
      return null;
    }
  }

  async getETA(
    trackerId: string,
    userLat: number,
    userLng: number,
    mode: 'walking' | 'driving' = 'walking'
  ): Promise<DistanceMatrixResult | null> {
    try {
      const response = await this.axiosInstance.get<ApiResponse<DistanceMatrixResult>>(
        `/trackers/${trackerId}/eta`,
        {
          params: { userLat, userLng, mode },
        }
      );
      return response.data.data || null;
    } catch (error) {
      console.error('Failed to calculate ETA:', error);
      return null;
    }
  }

  async getStreetViewUrl(trackerId: string, heading: number = 0, pitch: number = 0): Promise<{
    url: string;
    location: { lat: number; lng: number };
  } | null> {
    try {
      const response = await this.axiosInstance.get<ApiResponse<{
        url: string;
        location: { lat: number; lng: number };
      }>>(`/trackers/${trackerId}/streetview`, {
        params: { heading, pitch },
      });
      return response.data.data || null;
    } catch (error) {
      console.error('Failed to get Street View URL:', error);
      return null;
    }
  }

  async toggleLiveTracking(trackerId: string, active: boolean): Promise<boolean> {
    try {
      const response = await this.axiosInstance.post<ApiResponse<{ message: string; active: boolean }>>(
        `/trackers/${trackerId}/live`,
        { active }
      );
      return response.data.success;
    } catch (error) {
      console.error('Failed to toggle live tracking:', error);
      return false;
    }
  }

  async triggerLED(trackerId: string): Promise<boolean> {
    try {
      const response = await this.axiosInstance.post<ApiResponse<{ message: string }>>(
        `/trackers/${trackerId}/led`
      );
      return response.data.success;
    } catch (error) {
      console.error('Failed to trigger LED:', error);
      return false;
    }
  }

  async triggerBuzzer(trackerId: string): Promise<boolean> {
    try {
      const response = await this.axiosInstance.post<ApiResponse<{ message: string }>>(
        `/trackers/${trackerId}/buzzer`
      );
      return response.data.success;
    } catch (error) {
      console.error('Failed to trigger buzzer:', error);
      return false;
    }
  }
}

export const apiService = new ApiService();