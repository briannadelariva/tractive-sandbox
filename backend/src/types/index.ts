export interface Tracker {
  id: string;
  name: string;
  pet_id: string;
  model: string;
  firmware: string;
  battery_level: number;
  battery_state: 'charging' | 'discharging' | 'unknown';
  capabilities: string[];
}

export interface Position {
  tracker_id: string;
  timestamp: string;
  latitude: number;
  longitude: number;
  speed: number;
  accuracy: number;
  altitude?: number;
  sensor_used: string;
  pos_status: number;
  address?: string;
}

export interface Geofence {
  id: string;
  name: string;
  type: 'circle' | 'polygon';
  active: boolean;
  // For circle geofences
  center?: {
    lat: number;
    lng: number;
  };
  radius?: number; // in meters
  // For polygon geofences
  coordinates?: Array<{
    lat: number;
    lng: number;
  }>;
}

export interface DistanceMatrixResult {
  distance: {
    text: string;
    value: number; // meters
  };
  duration: {
    text: string;
    value: number; // seconds
  };
  status: string;
}

export interface Place {
  place_id: string;
  name: string;
  types: string[];
  location: {
    lat: number;
    lng: number;
  };
  rating?: number;
  vicinity?: string;
}

export interface ElevationPoint {
  elevation: number;
  location: {
    lat: number;
    lng: number;
  };
  resolution: number;
}

export interface TrailStats {
  distance: number; // meters
  duration: number; // seconds
  avgSpeed: number; // m/s
  elevationGain: number; // meters
  elevationLoss: number; // meters
  avgGrade: number; // percentage
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}