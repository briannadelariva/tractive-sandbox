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
  distanceFromHome?: number;
}

export interface Geofence {
  id: string;
  name: string;
  type: 'circle' | 'polygon';
  active: boolean;
  center?: {
    lat: number;
    lng: number;
  };
  radius?: number;
  coordinates?: Array<{
    lat: number;
    lng: number;
  }>;
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

export interface TrailStats {
  distance: number;
  duration: number;
  avgSpeed: number;
  elevationGain: number;
  elevationLoss: number;
  avgGrade: number;
}

export interface DistanceMatrixResult {
  distance: {
    text: string;
    value: number;
  };
  duration: {
    text: string;
    value: number;
  };
  status: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface MapSettings {
  showHeatmap: boolean;
  showGeofences: boolean;
  showPlaces: boolean;
  snapToRoads: boolean;
  timeRange: 'now-1h' | 'now-24h' | 'now-7d' | 'custom';
  customDateRange?: {
    from: Date;
    to: Date;
  };
}