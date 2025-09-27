import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../services/apiService';
import { MapSettings } from '../types';

// Tracker queries
export const useTrackers = () => {
  return useQuery({
    queryKey: ['trackers'],
    queryFn: () => apiService.getTrackers(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useLatestPosition = (trackerId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['position', trackerId],
    queryFn: () => apiService.getLatestPosition(trackerId),
    refetchInterval: 5000, // Poll every 5 seconds for live updates
    enabled: enabled && !!trackerId,
  });
};

export const usePositionHistory = (
  trackerId: string,
  settings: MapSettings,
  enabled: boolean = true
) => {
  const getDateRange = () => {
    const now = new Date();
    switch (settings.timeRange) {
      case 'now-1h':
        return {
          from: new Date(now.getTime() - 60 * 60 * 1000),
          to: now,
        };
      case 'now-24h':
        return {
          from: new Date(now.getTime() - 24 * 60 * 60 * 1000),
          to: now,
        };
      case 'now-7d':
        return {
          from: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
          to: now,
        };
      case 'custom':
        return settings.customDateRange || { from: new Date(now.getTime() - 60 * 60 * 1000), to: now };
      default:
        return {
          from: new Date(now.getTime() - 60 * 60 * 1000),
          to: now,
        };
    }
  };

  const { from, to } = getDateRange();

  return useQuery({
    queryKey: ['history', trackerId, settings.timeRange, from.toISOString(), to.toISOString()],
    queryFn: () => apiService.getPositionHistory(trackerId, from, to),
    refetchInterval: 60000, // Refresh every minute
    enabled: enabled && !!trackerId,
  });
};

export const useGeofences = (trackerId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['geofences', trackerId],
    queryFn: () => apiService.getGeofences(trackerId),
    staleTime: 10 * 60 * 1000, // 10 minutes
    enabled: enabled && !!trackerId,
  });
};

export const useNearbyPlaces = (trackerId: string, radius: number = 2000, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['places', trackerId, radius],
    queryFn: () => apiService.getNearbyPlaces(trackerId, radius),
    staleTime: 30 * 60 * 1000, // 30 minutes
    enabled: enabled && !!trackerId,
  });
};

export const useETA = (
  trackerId: string,
  userLocation: { lat: number; lng: number } | null,
  mode: 'walking' | 'driving' = 'walking'
) => {
  return useQuery({
    queryKey: ['eta', trackerId, userLocation?.lat, userLocation?.lng, mode],
    queryFn: () => {
      if (!userLocation) return null;
      return apiService.getETA(trackerId, userLocation.lat, userLocation.lng, mode);
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    enabled: !!trackerId && !!userLocation,
  });
};

export const useStreetView = (trackerId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['streetview', trackerId],
    queryFn: () => apiService.getStreetViewUrl(trackerId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: enabled && !!trackerId,
  });
};

// Mutations for tracker control
export const useLiveTrackingToggle = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ trackerId, active }: { trackerId: string; active: boolean }) =>
      apiService.toggleLiveTracking(trackerId, active),
    onSuccess: (_, { trackerId }) => {
      // Invalidate position queries to get fresh data
      queryClient.invalidateQueries({ queryKey: ['position', trackerId] });
    },
  });
};

export const useTriggerLED = () => {
  return useMutation({
    mutationFn: (trackerId: string) => apiService.triggerLED(trackerId),
  });
};

export const useTriggerBuzzer = () => {
  return useMutation({
    mutationFn: (trackerId: string) => apiService.triggerBuzzer(trackerId),
  });
};

// Authentication
export const useAuthStatus = () => {
  return useQuery({
    queryKey: ['auth-status'],
    queryFn: () => apiService.getAuthStatus(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useLogin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => apiService.login(),
    onSuccess: () => {
      // Invalidate all queries on successful login
      queryClient.invalidateQueries();
    },
  });
};