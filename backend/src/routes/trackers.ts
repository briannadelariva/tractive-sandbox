import { Router } from 'express';
import { TractiveService } from '../services/tractiveService';
import { GoogleMapsService } from '../services/googleMapsService';
import { ApiResponse, Position, TrailStats } from '../types';
import { config } from '../config';

const router = Router();
const tractiveService = new TractiveService();
const googleMapsService = new GoogleMapsService();

/**
 * GET /api/trackers
 * Get list of trackers with ids, names, battery, model, firmware
 */
router.get('/', async (req, res) => {
  try {
    const trackers = await tractiveService.getTrackers();
    
    res.json({
      success: true,
      data: trackers,
      timestamp: new Date().toISOString(),
    } as ApiResponse<typeof trackers>);
  } catch (error) {
    console.error('Get trackers error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch trackers',
      timestamp: new Date().toISOString(),
    } as ApiResponse<never>);
  }
});

/**
 * GET /api/trackers/:id/position
 * Get latest position with enhanced data
 */
router.get('/:id/position', async (req, res) => {
  try {
    const { id } = req.params;
    const position = await tractiveService.getLatestPosition(id);
    
    if (!position) {
      return res.status(404).json({
        success: false,
        error: 'No recent position found',
        timestamp: new Date().toISOString(),
      } as ApiResponse<never>);
    }

    // Enhance with reverse geocoding
    let address: string | null = null;
    try {
      address = await googleMapsService.reverseGeocode(position.latitude, position.longitude);
      position.address = address || undefined;
    } catch (error) {
      console.warn('Reverse geocoding failed:', error);
    }

    // Calculate distance from home if configured
    let distanceFromHome: number | null = null;
    if (config.homeBase.lat !== 0 && config.homeBase.lng !== 0) {
      try {
        const distanceResults = await googleMapsService.getDistanceMatrix(
          [config.homeBase],
          [{ lat: position.latitude, lng: position.longitude }],
          'walking'
        );
        if (distanceResults.length > 0) {
          distanceFromHome = distanceResults[0].distance.value;
        }
      } catch (error) {
        console.warn('Distance calculation failed:', error);
      }
    }

    res.json({
      success: true,
      data: {
        ...position,
        distanceFromHome,
      },
      timestamp: new Date().toISOString(),
    } as ApiResponse<typeof position & { distanceFromHome: number | null }>);
  } catch (error) {
    console.error('Get position error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch position',
      timestamp: new Date().toISOString(),
    } as ApiResponse<never>);
  }
});

/**
 * GET /api/trackers/:id/history
 * Get position history for heatmap/trail with optional date range
 */
router.get('/:id/history', async (req, res) => {
  try {
    const { id } = req.params;
    const { from, to } = req.query;
    
    // Default to last 24 hours if no dates provided
    const fromDate = from ? new Date(from as string) : new Date(Date.now() - 24 * 60 * 60 * 1000);
    const toDate = to ? new Date(to as string) : new Date();
    
    const positions = await tractiveService.getPositionHistory(id, fromDate, toDate);
    
    // Calculate trail statistics
    let trailStats: TrailStats | null = null;
    let elevations: any[] = [];
    
    if (positions.length > 1) {
      try {
        // Get elevation data for the trail
        elevations = await googleMapsService.getElevation(
          positions.map(p => ({ lat: p.latitude, lng: p.longitude }))
        );
        
        trailStats = googleMapsService.calculateTrailStats(positions, elevations);
      } catch (error) {
        console.warn('Trail stats calculation failed:', error);
        trailStats = googleMapsService.calculateTrailStats(positions);
      }
    }

    res.json({
      success: true,
      data: {
        positions,
        trailStats,
        elevations,
        summary: {
          count: positions.length,
          dateRange: { from: fromDate, to: toDate },
        },
      },
      timestamp: new Date().toISOString(),
    } as ApiResponse<{
      positions: Position[];
      trailStats: TrailStats | null;
      elevations: any[];
      summary: { count: number; dateRange: { from: Date; to: Date } };
    }>);
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch position history',
      timestamp: new Date().toISOString(),
    } as ApiResponse<never>);
  }
});

/**
 * GET /api/trackers/:id/geofences
 * Get geofences for a tracker
 */
router.get('/:id/geofences', async (req, res) => {
  try {
    const { id } = req.params;
    const geofences = await tractiveService.getGeofences(id);
    
    res.json({
      success: true,
      data: geofences,
      timestamp: new Date().toISOString(),
    } as ApiResponse<typeof geofences>);
  } catch (error) {
    console.error('Get geofences error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch geofences',
      timestamp: new Date().toISOString(),
    } as ApiResponse<never>);
  }
});

/**
 * GET /api/trackers/:id/places
 * Get nearby places (dog parks, vets, pet stores)
 */
router.get('/:id/places', async (req, res) => {
  try {
    const { id } = req.params;
    const { radius = '2000' } = req.query;
    
    const position = await tractiveService.getLatestPosition(id);
    if (!position) {
      return res.status(404).json({
        success: false,
        error: 'No recent position found',
        timestamp: new Date().toISOString(),
      } as ApiResponse<never>);
    }

    const placeTypes = ['park', 'veterinary_care', 'pet_store'];
    const places = await googleMapsService.findNearbyPlaces(
      position.latitude,
      position.longitude,
      placeTypes,
      parseInt(radius as string)
    );
    
    // Group places by type
    const groupedPlaces = {
      parks: places.filter(p => p.types.includes('park')),
      veterinary: places.filter(p => p.types.includes('veterinary_care')),
      petStores: places.filter(p => p.types.includes('pet_store')),
    };

    res.json({
      success: true,
      data: {
        places: groupedPlaces,
        center: { lat: position.latitude, lng: position.longitude },
        radius: parseInt(radius as string),
      },
      timestamp: new Date().toISOString(),
    } as ApiResponse<{
      places: typeof groupedPlaces;
      center: { lat: number; lng: number };
      radius: number;
    }>);
  } catch (error) {
    console.error('Get places error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch nearby places',
      timestamp: new Date().toISOString(),
    } as ApiResponse<never>);
  }
});

/**
 * GET /api/trackers/:id/eta
 * Calculate ETA from user location to pet
 */
router.get('/:id/eta', async (req, res) => {
  try {
    const { id } = req.params;
    const { userLat, userLng, mode = 'walking' } = req.query;
    
    if (!userLat || !userLng) {
      return res.status(400).json({
        success: false,
        error: 'User location is required',
        timestamp: new Date().toISOString(),
      } as ApiResponse<never>);
    }

    const position = await tractiveService.getLatestPosition(id);
    if (!position) {
      return res.status(404).json({
        success: false,
        error: 'No recent position found',
        timestamp: new Date().toISOString(),
      } as ApiResponse<never>);
    }

    const etaResults = await googleMapsService.getDistanceMatrix(
      [{ lat: parseFloat(userLat as string), lng: parseFloat(userLng as string) }],
      [{ lat: position.latitude, lng: position.longitude }],
      mode as 'walking' | 'driving'
    );
    
    if (etaResults.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Could not calculate ETA',
        timestamp: new Date().toISOString(),
      } as ApiResponse<never>);
    }

    res.json({
      success: true,
      data: etaResults[0],
      timestamp: new Date().toISOString(),
    } as ApiResponse<typeof etaResults[0]>);
  } catch (error) {
    console.error('Get ETA error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate ETA',
      timestamp: new Date().toISOString(),
    } as ApiResponse<never>);
  }
});

/**
 * GET /api/trackers/:id/streetview
 * Get Street View URL for current position
 */
router.get('/:id/streetview', async (req, res) => {
  try {
    const { id } = req.params;
    const { heading = '0', pitch = '0' } = req.query;
    
    const position = await tractiveService.getLatestPosition(id);
    if (!position) {
      return res.status(404).json({
        success: false,
        error: 'No recent position found',
        timestamp: new Date().toISOString(),
      } as ApiResponse<never>);
    }

    const streetViewUrl = googleMapsService.generateStreetViewUrl(
      position.latitude,
      position.longitude,
      parseInt(heading as string),
      parseInt(pitch as string)
    );
    
    res.json({
      success: true,
      data: {
        url: streetViewUrl,
        location: { lat: position.latitude, lng: position.longitude },
      },
      timestamp: new Date().toISOString(),
    } as ApiResponse<{ url: string; location: { lat: number; lng: number } }>);
  } catch (error) {
    console.error('Get Street View error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate Street View URL',
      timestamp: new Date().toISOString(),
    } as ApiResponse<never>);
  }
});

/**
 * POST /api/trackers/:id/live
 * Toggle live tracking
 */
router.post('/:id/live', async (req, res) => {
  try {
    const { id } = req.params;
    const { active } = req.body;
    
    if (typeof active !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'Active parameter must be a boolean',
        timestamp: new Date().toISOString(),
      } as ApiResponse<never>);
    }

    const success = await tractiveService.toggleLiveTracking(id, active);
    
    res.json({
      success,
      data: {
        message: `Live tracking ${active ? 'enabled' : 'disabled'}`,
        active,
      },
      timestamp: new Date().toISOString(),
    } as ApiResponse<{ message: string; active: boolean }>);
  } catch (error) {
    console.error('Toggle live tracking error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to toggle live tracking',
      timestamp: new Date().toISOString(),
    } as ApiResponse<never>);
  }
});

/**
 * POST /api/trackers/:id/led
 * Trigger LED on tracker
 */
router.post('/:id/led', async (req, res) => {
  try {
    const { id } = req.params;
    const success = await tractiveService.triggerLED(id);
    
    res.json({
      success,
      data: {
        message: 'LED command sent',
      },
      timestamp: new Date().toISOString(),
    } as ApiResponse<{ message: string }>);
  } catch (error) {
    console.error('Trigger LED error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to trigger LED',
      timestamp: new Date().toISOString(),
    } as ApiResponse<never>);
  }
});

/**
 * POST /api/trackers/:id/buzzer
 * Trigger buzzer on tracker
 */
router.post('/:id/buzzer', async (req, res) => {
  try {
    const { id } = req.params;
    const success = await tractiveService.triggerBuzzer(id);
    
    res.json({
      success,
      data: {
        message: 'Buzzer command sent',
      },
      timestamp: new Date().toISOString(),
    } as ApiResponse<{ message: string }>);
  } catch (error) {
    console.error('Trigger buzzer error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to trigger buzzer',
      timestamp: new Date().toISOString(),
    } as ApiResponse<never>);
  }
});

export default router;