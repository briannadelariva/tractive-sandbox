import React from 'react';
import { Position, TrailStats, DistanceMatrixResult } from '../types';
import { 
  MapPin, 
  Clock, 
  Battery, 
  Navigation, 
  TrendingUp,
  Mountain,
  Activity
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface StatsCardsProps {
  latestPosition: Position | null;
  trailStats: TrailStats | null;
  etaData: DistanceMatrixResult | null;
  batteryLevel: number;
  quickActions?: {
    triggerLED: () => void;
    triggerBuzzer: () => void;
  };
  className?: string;
}

export const StatsCards: React.FC<StatsCardsProps> = ({
  latestPosition,
  trailStats,
  etaData,
  batteryLevel,
  quickActions,
  className = '',
}) => {
  const formatDistance = (meters: number): string => {
    if (meters < 1000) return `${Math.round(meters)}m`;
    return `${(meters / 1000).toFixed(1)}km`;
  };

  const formatSpeed = (mps: number): string => {
    const kmh = mps * 3.6;
    return `${kmh.toFixed(1)} km/h`;
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Current Status Card */}
      <div className="bg-white rounded-lg shadow-lg p-4">
        <div className="flex items-center space-x-2 text-gray-700 font-medium mb-3">
          <MapPin size={16} />
          <span>Current Status</span>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Battery size={14} className={batteryLevel > 20 ? 'text-green-500' : 'text-red-500'} />
              <span className="text-sm text-gray-600">Battery</span>
            </div>
            <div className="text-lg font-bold">
              {batteryLevel}%
            </div>
          </div>
          
          {latestPosition && (
            <>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Clock size={14} className="text-blue-500" />
                  <span className="text-sm text-gray-600">Last Update</span>
                </div>
                <div className="text-lg font-bold">
                  {formatDistanceToNow(new Date(latestPosition.timestamp), { addSuffix: true })}
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <TrendingUp size={14} className="text-purple-500" />
                  <span className="text-sm text-gray-600">Speed</span>
                </div>
                <div className="text-lg font-bold">
                  {formatSpeed(latestPosition.speed)}
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Navigation size={14} className="text-orange-500" />
                  <span className="text-sm text-gray-600">Accuracy</span>
                </div>
                <div className="text-lg font-bold">
                  {latestPosition.accuracy}m
                </div>
              </div>
            </>
          )}
        </div>
        
        {latestPosition?.address && (
          <div className="mt-3 p-2 bg-gray-50 rounded text-sm text-gray-600">
            📍 {latestPosition.address}
          </div>
        )}
        
        {latestPosition?.distanceFromHome && (
          <div className="mt-2 text-sm text-gray-600">
            🏠 Distance from home: {formatDistance(latestPosition.distanceFromHome)}
          </div>
        )}
      </div>

      {/* ETA Card */}
      {etaData && (
        <div className="bg-white rounded-lg shadow-lg p-4">
          <div className="flex items-center space-x-2 text-gray-700 font-medium mb-3">
            <Navigation size={16} />
            <span>ETA to Pet</span>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="text-sm text-gray-600">Distance</div>
              <div className="text-lg font-bold text-blue-600">
                {etaData.distance.text}
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-gray-600">ETA</div>
              <div className="text-lg font-bold text-green-600">
                {etaData.duration.text}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Trail Stats Card */}
      {trailStats && (
        <div className="bg-white rounded-lg shadow-lg p-4">
          <div className="flex items-center space-x-2 text-gray-700 font-medium mb-3">
            <Activity size={16} />
            <span>Activity Summary</span>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="text-sm text-gray-600">Distance</div>
              <div className="text-lg font-bold">
                {formatDistance(trailStats.distance)}
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-gray-600">Duration</div>
              <div className="text-lg font-bold">
                {formatDuration(trailStats.duration)}
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-gray-600">Avg Speed</div>
              <div className="text-lg font-bold">
                {formatSpeed(trailStats.avgSpeed)}
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Mountain size={14} className="text-green-500" />
                <span className="text-sm text-gray-600">Elevation</span>
              </div>
              <div className="text-sm">
                <div className="text-green-600">↗ {trailStats.elevationGain.toFixed(0)}m</div>
                <div className="text-red-600">↘ {trailStats.elevationLoss.toFixed(0)}m</div>
              </div>
            </div>
          </div>
          
          {Math.abs(trailStats.avgGrade) > 0.1 && (
            <div className="mt-3 p-2 bg-gray-50 rounded text-sm">
              <div className="flex items-center space-x-2 text-gray-600">
                <Mountain size={14} />
                <span>Average Grade: {trailStats.avgGrade.toFixed(1)}%</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quick Actions Card */}
      <div className="bg-white rounded-lg shadow-lg p-4">
        <div className="flex items-center space-x-2 text-gray-700 font-medium mb-3">
          <Activity size={16} />
          <span>Quick Actions</span>
        </div>
        
        <div className="space-y-2">
          <button 
            onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${latestPosition?.latitude},${latestPosition?.longitude}&travelmode=walking`, '_blank')}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors text-sm"
          >
            📍 Navigate to Pet
          </button>
          <button 
            onClick={quickActions?.triggerLED}
            className="w-full bg-yellow-600 text-white py-2 px-4 rounded-md hover:bg-yellow-700 transition-colors text-sm"
          >
            💡 Flash LED
          </button>
          <button 
            onClick={quickActions?.triggerBuzzer}
            className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors text-sm"
          >
            🔊 Sound Buzzer
          </button>
        </div>
      </div>
    </div>
  );
};