import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Position, Geofence, Place, MapSettings } from '../types';

interface MapContainerProps {
  positions: Position[];
  latestPosition: Position | null;
  geofences: Geofence[];
  places: {
    parks: Place[];
    veterinary: Place[];
    petStores: Place[];
  } | null;
  settings: MapSettings;
  onGeofenceViolation?: (geofence: Geofence, position: Position) => void;
}

declare global {
  interface Window {
    google: typeof google;
    googleMapsLoaded: boolean;
  }
}

export const MapContainer: React.FC<MapContainerProps> = ({
  positions,
  latestPosition,
  geofences,
  places,
  settings,
  onGeofenceViolation,
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const heatmapRef = useRef<google.maps.visualization.HeatmapLayer | null>(null);
  const geofenceOverlaysRef = useRef<google.maps.Polygon[]>([]);
  const placeMarkersRef = useRef<google.maps.Marker[]>([]);

  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(
    typeof window !== 'undefined' && window.googleMapsLoaded
  );

  useEffect(() => {
    if (typeof window !== 'undefined' && !window.googleMapsLoaded) {
      const handleGoogleMapsLoaded = () => {
        setIsGoogleMapsLoaded(true);
      };

      window.addEventListener('google-maps-loaded', handleGoogleMapsLoaded);
      return () => {
        window.removeEventListener('google-maps-loaded', handleGoogleMapsLoaded);
      };
    }
  }, []);

  // Initialize map
  useEffect(() => {
    if (!isGoogleMapsLoaded || !mapRef.current) return;

    const defaultCenter = latestPosition
      ? { lat: latestPosition.latitude, lng: latestPosition.longitude }
      : { lat: 37.7749, lng: -122.4194 }; // Default to San Francisco

    mapInstanceRef.current = new google.maps.Map(mapRef.current, {
      zoom: 15,
      center: defaultCenter,
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      disableDefaultUI: false,
      zoomControl: true,
      streetViewControl: true,
      fullscreenControl: true,
    });
  }, [isGoogleMapsLoaded, latestPosition]);

  // Clear all overlays
  const clearOverlays = useCallback(() => {
    // Clear markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // Clear polyline
    if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }

    // Clear heatmap
    if (heatmapRef.current) {
      heatmapRef.current.setMap(null);
      heatmapRef.current = null;
    }

    // Clear geofences
    geofenceOverlaysRef.current.forEach(overlay => overlay.setMap(null));
    geofenceOverlaysRef.current = [];

    // Clear place markers
    placeMarkersRef.current.forEach(marker => marker.setMap(null));
    placeMarkersRef.current = [];
  }, []);

  // Update pet marker
  useEffect(() => {
    if (!isGoogleMapsLoaded || !mapInstanceRef.current || !latestPosition) return;

    clearOverlays();

    // Create pet marker
    const marker = new google.maps.Marker({
      position: { lat: latestPosition.latitude, lng: latestPosition.longitude },
      map: mapInstanceRef.current,
      title: 'Pet Location',
      icon: {
        url: 'data:image/svg+xml;base64,' + btoa(`
          <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
            <circle cx="16" cy="16" r="8" fill="#3b82f6" stroke="#ffffff" stroke-width="2"/>
            <circle cx="16" cy="16" r="4" fill="#ffffff"/>
          </svg>
        `),
        scaledSize: new google.maps.Size(32, 32),
        anchor: new google.maps.Point(16, 16),
      },
    });

    // Info window
    const infoWindow = new google.maps.InfoWindow({
      content: `
        <div class="p-2">
          <h3 class="font-bold">Pet Location</h3>
          <p class="text-sm text-gray-600">
            Updated: ${new Date(latestPosition.timestamp).toLocaleString()}
          </p>
          <p class="text-sm text-gray-600">
            Speed: ${(latestPosition.speed * 3.6).toFixed(1)} km/h
          </p>
          <p class="text-sm text-gray-600">
            Accuracy: ${latestPosition.accuracy}m
          </p>
          ${latestPosition.address ? `<p class="text-sm text-gray-600">${latestPosition.address}</p>` : ''}
        </div>
      `,
    });

    marker.addListener('click', () => {
      infoWindow.open(mapInstanceRef.current, marker);
    });

    markersRef.current.push(marker);

    // Center map on latest position
    mapInstanceRef.current.setCenter({ lat: latestPosition.latitude, lng: latestPosition.longitude });
  }, [isGoogleMapsLoaded, latestPosition, clearOverlays]);

  // Update trail polyline
  useEffect(() => {
    if (!isGoogleMapsLoaded || !mapInstanceRef.current || positions.length === 0) return;

    if (polylineRef.current) {
      polylineRef.current.setMap(null);
    }

    const path = positions.map(pos => ({
      lat: pos.latitude,
      lng: pos.longitude,
    }));

    polylineRef.current = new google.maps.Polyline({
      path,
      geodesic: true,
      strokeColor: '#3b82f6',
      strokeOpacity: 0.8,
      strokeWeight: 3,
      map: mapInstanceRef.current,
    });
  }, [isGoogleMapsLoaded, positions]);

  // Update heatmap
  useEffect(() => {
    if (!isGoogleMapsLoaded || !mapInstanceRef.current || !settings.showHeatmap) return;

    if (heatmapRef.current) {
      heatmapRef.current.setMap(null);
    }

    if (positions.length > 0) {
      const heatmapData = positions.map(pos => new google.maps.LatLng(pos.latitude, pos.longitude));

      heatmapRef.current = new google.maps.visualization.HeatmapLayer({
        data: heatmapData,
        map: mapInstanceRef.current,
        radius: 20,
        opacity: 0.6,
      });
    }
  }, [isGoogleMapsLoaded, positions, settings.showHeatmap]);

  // Update geofences
  useEffect(() => {
    if (!isGoogleMapsLoaded || !mapInstanceRef.current || !settings.showGeofences) return;

    // Clear existing geofences
    geofenceOverlaysRef.current.forEach(overlay => overlay.setMap(null));
    geofenceOverlaysRef.current = [];

    geofences.forEach(geofence => {
      if (geofence.type === 'circle' && geofence.center && geofence.radius) {
        new google.maps.Circle({
          strokeColor: geofence.active ? '#10b981' : '#6b7280',
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillColor: geofence.active ? '#10b981' : '#6b7280',
          fillOpacity: 0.2,
          map: mapInstanceRef.current,
          center: geofence.center,
          radius: geofence.radius,
        });

        // Check if current position violates geofence
        if (latestPosition && onGeofenceViolation) {
          const distance = google.maps.geometry.spherical.computeDistanceBetween(
            new google.maps.LatLng(latestPosition.latitude, latestPosition.longitude),
            new google.maps.LatLng(geofence.center.lat, geofence.center.lng)
          );

          const isInside = distance <= geofence.radius;
          if (geofence.active && !isInside) {
            onGeofenceViolation(geofence, latestPosition);
          }
        }
      } else if (geofence.type === 'polygon' && geofence.coordinates) {
        const polygon = new google.maps.Polygon({
          paths: geofence.coordinates,
          strokeColor: geofence.active ? '#10b981' : '#6b7280',
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillColor: geofence.active ? '#10b981' : '#6b7280',
          fillOpacity: 0.2,
          map: mapInstanceRef.current,
        });

        geofenceOverlaysRef.current.push(polygon);
      }
    });
  }, [isGoogleMapsLoaded, geofences, settings.showGeofences, latestPosition, onGeofenceViolation]);

  // Update places
  useEffect(() => {
    if (!isGoogleMapsLoaded || !mapInstanceRef.current || !settings.showPlaces || !places) return;

    // Clear existing place markers
    placeMarkersRef.current.forEach(marker => marker.setMap(null));
    placeMarkersRef.current = [];

    const addPlaceMarkers = (placeList: Place[], icon: string, color: string) => {
      placeList.forEach(place => {
        const marker = new google.maps.Marker({
          position: place.location,
          map: mapInstanceRef.current,
          title: place.name,
          icon: {
            url: `data:image/svg+xml;base64,${btoa(`
              <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="8" fill="${color}" stroke="#ffffff" stroke-width="2"/>
                <text x="12" y="16" text-anchor="middle" fill="#ffffff" font-size="12">${icon}</text>
              </svg>
            `)}`,
            scaledSize: new google.maps.Size(24, 24),
            anchor: new google.maps.Point(12, 12),
          },
        });

        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div class="p-2">
              <h3 class="font-bold">${place.name}</h3>
              ${place.rating ? `<p class="text-sm text-gray-600">Rating: ${place.rating}/5</p>` : ''}
              ${place.vicinity ? `<p class="text-sm text-gray-600">${place.vicinity}</p>` : ''}
            </div>
          `,
        });

        marker.addListener('click', () => {
          infoWindow.open(mapInstanceRef.current, marker);
        });

        placeMarkersRef.current.push(marker);
      });
    };

    addPlaceMarkers(places.parks, '🏞️', '#10b981');
    addPlaceMarkers(places.veterinary, '🏥', '#ef4444');
    addPlaceMarkers(places.petStores, '🛒', '#8b5cf6');
  }, [isGoogleMapsLoaded, places, settings.showPlaces]);

  if (!isGoogleMapsLoaded) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Google Maps...</p>
        </div>
      </div>
    );
  }

  return <div ref={mapRef} className="w-full h-full" />;
};