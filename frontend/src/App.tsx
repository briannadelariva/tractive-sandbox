import { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MapContainer } from './components/MapContainer';
import { ControlPanel } from './components/ControlPanel';
import { StatsCards } from './components/StatsCards';
import { 
  useTrackers, 
  useLatestPosition, 
  usePositionHistory, 
  useGeofences,
  useNearbyPlaces,
  useETA,
  useStreetView,
  useLiveTrackingToggle,
  useTriggerLED,
  useTriggerBuzzer,
} from './hooks/useApi';
import { MapSettings, Geofence, Position } from './types';
import { Battery, Wifi, WifiOff, AlertTriangle } from 'lucide-react';

// Create query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

function AppContent() {
  const [selectedTrackerId, setSelectedTrackerId] = useState<string>('');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [liveTrackingEnabled, setLiveTrackingEnabled] = useState(true);
  const [geofenceAlerts, setGeofenceAlerts] = useState<Array<{ geofence: Geofence; position: Position }>>([]);
  const [settings, setSettings] = useState<MapSettings>({
    showHeatmap: false,
    showGeofences: true,
    showPlaces: true,
    snapToRoads: false,
    timeRange: 'now-1h',
  });

  const { data: trackers = [], isLoading: trackersLoading } = useTrackers();
  const { data: latestPosition, isLoading: positionLoading } = useLatestPosition(
    selectedTrackerId,
    liveTrackingEnabled
  );
  const { data: historyData, isLoading: historyLoading } = usePositionHistory(
    selectedTrackerId,
    settings,
    !!selectedTrackerId
  );
  const { data: geofences = [] } = useGeofences(selectedTrackerId, !!selectedTrackerId);
  const { data: placesData } = useNearbyPlaces(selectedTrackerId, 2000, settings.showPlaces);
  const { data: etaData } = useETA(selectedTrackerId, userLocation);
  const { data: streetViewData } = useStreetView(selectedTrackerId, !!selectedTrackerId);

  const liveTrackingMutation = useLiveTrackingToggle();
  const ledMutation = useTriggerLED();
  const buzzerMutation = useTriggerBuzzer();

  // Get user's current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.warn('Could not get user location:', error);
        }
      );
    }
  }, []);

  // Select first tracker by default
  useEffect(() => {
    if (trackers.length > 0 && !selectedTrackerId) {
      setSelectedTrackerId(trackers[0].id);
    }
  }, [trackers, selectedTrackerId]);

  const selectedTracker = trackers.find(t => t.id === selectedTrackerId);

  const handleGeofenceViolation = (geofence: Geofence, position: Position) => {
    // Add to alerts (avoiding duplicates)
    setGeofenceAlerts(prev => {
      const exists = prev.some(alert => 
        alert.geofence.id === geofence.id && 
        Math.abs(new Date(alert.position.timestamp).getTime() - new Date(position.timestamp).getTime()) < 60000
      );
      if (!exists) {
        return [...prev, { geofence, position }];
      }
      return prev;
    });

    // Auto-remove alert after 30 seconds
    setTimeout(() => {
      setGeofenceAlerts(prev => prev.filter(alert => alert.geofence.id !== geofence.id));
    }, 30000);
  };

  const handleStreetViewClick = () => {
    if (streetViewData?.url) {
      window.open(streetViewData.url, '_blank');
    }
  };

  const handleNavigateToPet = () => {
    if (latestPosition) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${latestPosition.latitude},${latestPosition.longitude}&travelmode=walking`;
      window.open(url, '_blank');
    }
  };

  const handleToggleLiveTracking = async () => {
    if (selectedTrackerId) {
      const newState = !liveTrackingEnabled;
      const success = await liveTrackingMutation.mutateAsync({
        trackerId: selectedTrackerId,
        active: newState,
      });
      if (success) {
        setLiveTrackingEnabled(newState);
      }
    }
  };

  const handleTriggerLED = async () => {
    if (selectedTrackerId) {
      await ledMutation.mutateAsync(selectedTrackerId);
    }
  };

  const handleTriggerBuzzer = async () => {
    if (selectedTrackerId) {
      await buzzerMutation.mutateAsync(selectedTrackerId);
    }
  };

  // Use these functions to avoid unused variable warnings
  const quickActions = {
    triggerLED: handleTriggerLED,
    triggerBuzzer: handleTriggerBuzzer,
  };

  if (trackersLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading trackers...</p>
        </div>
      </div>
    );
  }

  if (trackers.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <p className="text-gray-600">No trackers found. Please check your Tractive account.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-bold text-gray-900">🐾 Tractive Pet Tracker</h1>
              
              {/* Tracker Selector */}
              {trackers.length > 1 && (
                <select
                  value={selectedTrackerId}
                  onChange={(e) => setSelectedTrackerId(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {trackers.map(tracker => (
                    <option key={tracker.id} value={tracker.id}>
                      {tracker.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Status Indicators */}
            <div className="flex items-center space-x-4">
              {selectedTracker && (
                <div className="flex items-center space-x-2">
                  <Battery 
                    size={16} 
                    className={selectedTracker.battery_level > 20 ? 'text-green-500' : 'text-red-500'}
                  />
                  <span className="text-sm text-gray-600">
                    {selectedTracker.battery_level}%
                  </span>
                </div>
              )}
              
              <button
                onClick={handleToggleLiveTracking}
                className="flex items-center space-x-2 text-sm"
              >
                {liveTrackingEnabled ? (
                  <Wifi size={16} className="text-green-500" />
                ) : (
                  <WifiOff size={16} className="text-red-500" />
                )}
                <span className={liveTrackingEnabled ? 'text-green-600' : 'text-red-600'}>
                  {liveTrackingEnabled ? 'Live' : 'Paused'}
                </span>
              </button>

              {latestPosition && (
                <span className="text-sm text-gray-500">
                  Updated {new Date(latestPosition.timestamp).toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Geofence Alerts */}
      {geofenceAlerts.length > 0 && (
        <div className="bg-red-600 text-white px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertTriangle size={16} />
              <span className="font-medium">
                Pet has left safe zone: {geofenceAlerts[0].geofence.name}
              </span>
            </div>
            <button
              onClick={handleNavigateToPet}
              className="bg-red-700 hover:bg-red-800 px-3 py-1 rounded text-sm transition-colors"
            >
              Navigate to Pet
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex h-[calc(100vh-80px)]">
        {/* Sidebar */}
        <div className="w-80 bg-gray-50 border-r overflow-y-auto">
          <div className="p-4 space-y-4">
            <ControlPanel
              settings={settings}
              onSettingsChange={setSettings}
              onStreetViewClick={handleStreetViewClick}
            />
            
            <StatsCards
              latestPosition={latestPosition || null}
              trailStats={historyData?.trailStats || null}
              etaData={etaData || null}
              batteryLevel={selectedTracker?.battery_level || 0}
              quickActions={quickActions}
            />
          </div>
        </div>

        {/* Map */}
        <div className="flex-1 relative">
          {positionLoading || historyLoading ? (
            <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                <p className="text-sm text-gray-600">Loading position data...</p>
              </div>
            </div>
          ) : null}
          
          <MapContainer
            positions={historyData?.positions || []}
            latestPosition={latestPosition || null}
            geofences={geofences}
            places={placesData?.places || null}
            settings={settings}
            onGeofenceViolation={handleGeofenceViolation}
          />
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}

export default App;