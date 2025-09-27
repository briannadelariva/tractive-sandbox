import axios, { AxiosInstance } from 'axios';
import { config } from '../config';
import { DistanceMatrixResult, Place, ElevationPoint, Position, TrailStats } from '../types';

export class GoogleMapsService {
  private axiosInstance: AxiosInstance;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: 'https://maps.googleapis.com/maps/api',
      timeout: 10000,
    });
  }

  /**
   * Reverse geocode coordinates to get readable address
   */
  async reverseGeocode(lat: number, lng: number): Promise<string | null> {
    if (!config.google.enableGeocoding || !config.google.apiKey) {
      return null;
    }

    try {
      const response = await this.axiosInstance.get('/geocode/json', {
        params: {
          latlng: `${lat},${lng}`,
          key: config.google.apiKey,
        },
      });

      if (response.data.results && response.data.results.length > 0) {
        return response.data.results[0].formatted_address;
      }
      
      return null;
    } catch (error) {
      console.error('Reverse geocoding failed:', error);
      return null;
    }
  }

  /**
   * Calculate distance and ETA using Distance Matrix API
   */
  async getDistanceMatrix(
    origins: Array<{ lat: number; lng: number }>,
    destinations: Array<{ lat: number; lng: number }>,
    mode: 'walking' | 'driving' = 'walking'
  ): Promise<DistanceMatrixResult[]> {
    if (!config.google.enableDirections || !config.google.apiKey) {
      return [];
    }

    try {
      const originsStr = origins.map(o => `${o.lat},${o.lng}`).join('|');
      const destinationsStr = destinations.map(d => `${d.lat},${d.lng}`).join('|');

      const response = await this.axiosInstance.get('/distancematrix/json', {
        params: {
          origins: originsStr,
          destinations: destinationsStr,
          mode,
          units: 'metric',
          key: config.google.apiKey,
        },
      });

      if (response.data.rows && response.data.rows.length > 0) {
        return response.data.rows[0].elements.filter((element: any) => 
          element.status === 'OK'
        );
      }
      
      return [];
    } catch (error) {
      console.error('Distance matrix calculation failed:', error);
      return [];
    }
  }

  /**
   * Find nearby places of specific types
   */
  async findNearbyPlaces(
    lat: number,
    lng: number,
    types: string[],
    radius: number = 2000
  ): Promise<Place[]> {
    if (!config.google.enablePlaces || !config.google.apiKey) {
      return [];
    }

    try {
      const places: Place[] = [];
      
      for (const type of types) {
        const response = await this.axiosInstance.get('/place/nearbysearch/json', {
          params: {
            location: `${lat},${lng}`,
            radius,
            type,
            key: config.google.apiKey,
          },
        });

        if (response.data.results) {
          const typePlaces = response.data.results.map((place: any) => ({
            place_id: place.place_id,
            name: place.name,
            types: place.types,
            location: {
              lat: place.geometry.location.lat,
              lng: place.geometry.location.lng,
            },
            rating: place.rating,
            vicinity: place.vicinity,
          }));
          
          places.push(...typePlaces);
        }
      }
      
      return places;
    } catch (error) {
      console.error('Places search failed:', error);
      return [];
    }
  }

  /**
   * Get elevation data for coordinates
   */
  async getElevation(locations: Array<{ lat: number; lng: number }>): Promise<ElevationPoint[]> {
    if (!config.google.enableElevation || !config.google.apiKey) {
      return [];
    }

    try {
      const locationsStr = locations.map(l => `${l.lat},${l.lng}`).join('|');
      
      const response = await this.axiosInstance.get('/elevation/json', {
        params: {
          locations: locationsStr,
          key: config.google.apiKey,
        },
      });

      if (response.data.results) {
        return response.data.results.map((result: any) => ({
          elevation: result.elevation,
          location: {
            lat: result.location.lat,
            lng: result.location.lng,
          },
          resolution: result.resolution,
        }));
      }
      
      return [];
    } catch (error) {
      console.error('Elevation query failed:', error);
      return [];
    }
  }

  /**
   * Get directions between two points
   */
  async getDirections(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
    mode: 'walking' | 'driving' = 'walking'
  ): Promise<any> {
    if (!config.google.enableDirections || !config.google.apiKey) {
      return null;
    }

    try {
      const response = await this.axiosInstance.get('/directions/json', {
        params: {
          origin: `${origin.lat},${origin.lng}`,
          destination: `${destination.lat},${destination.lng}`,
          mode,
          key: config.google.apiKey,
        },
      });

      return response.data;
    } catch (error) {
      console.error('Directions query failed:', error);
      return null;
    }
  }

  /**
   * Calculate trail statistics from position history
   */
  calculateTrailStats(positions: Position[], elevations?: ElevationPoint[]): TrailStats {
    if (positions.length < 2) {
      return {
        distance: 0,
        duration: 0,
        avgSpeed: 0,
        elevationGain: 0,
        elevationLoss: 0,
        avgGrade: 0,
      };
    }

    let totalDistance = 0;
    let elevationGain = 0;
    let elevationLoss = 0;

    // Calculate distance and duration
    for (let i = 1; i < positions.length; i++) {
      const distance = this.calculateHaversineDistance(
        positions[i - 1].latitude,
        positions[i - 1].longitude,
        positions[i].latitude,
        positions[i].longitude
      );
      totalDistance += distance;
    }

    const startTime = new Date(positions[0].timestamp).getTime();
    const endTime = new Date(positions[positions.length - 1].timestamp).getTime();
    const duration = (endTime - startTime) / 1000; // seconds

    const avgSpeed = duration > 0 ? totalDistance / duration : 0;

    // Calculate elevation changes if elevation data is available
    if (elevations && elevations.length > 1) {
      for (let i = 1; i < elevations.length; i++) {
        const elevDiff = elevations[i].elevation - elevations[i - 1].elevation;
        if (elevDiff > 0) {
          elevationGain += elevDiff;
        } else {
          elevationLoss += Math.abs(elevDiff);
        }
      }
    }

    const avgGrade = totalDistance > 0 ? ((elevationGain - elevationLoss) / totalDistance) * 100 : 0;

    return {
      distance: totalDistance,
      duration,
      avgSpeed,
      elevationGain,
      elevationLoss,
      avgGrade,
    };
  }

  /**
   * Calculate distance between two points using Haversine formula
   */
  private calculateHaversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return R * c;
  }

  /**
   * Convert degrees to radians
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Generate Street View URL for a location
   */
  generateStreetViewUrl(lat: number, lng: number, heading: number = 0, pitch: number = 0): string {
    if (!config.google.apiKey) {
      return '';
    }

    const params = new URLSearchParams({
      location: `${lat},${lng}`,
      size: '600x400',
      heading: heading.toString(),
      pitch: pitch.toString(),
      key: config.google.apiKey,
    });

    return `https://maps.googleapis.com/maps/api/streetview?${params.toString()}`;
  }
}