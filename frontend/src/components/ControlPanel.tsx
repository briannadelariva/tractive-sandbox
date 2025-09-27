import React from 'react';
import { MapSettings } from '../types';
import { 
  Map, 
  Layers, 
  MapPin, 
  Clock, 
  Settings,
  Eye,
  EyeOff
} from 'lucide-react';

interface ControlPanelProps {
  settings: MapSettings;
  onSettingsChange: (settings: MapSettings) => void;
  onStreetViewClick: () => void;
  className?: string;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  settings,
  onSettingsChange,
  onStreetViewClick,
  className = '',
}) => {
  const handleTimeRangeChange = (timeRange: MapSettings['timeRange']) => {
    onSettingsChange({ ...settings, timeRange });
  };

  const handleToggle = (key: keyof Omit<MapSettings, 'timeRange' | 'customDateRange'>) => {
    onSettingsChange({ ...settings, [key]: !settings[key] });
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg p-4 space-y-4 ${className}`}>
      <div className="flex items-center space-x-2 text-gray-700 font-medium">
        <Settings size={16} />
        <span>Map Controls</span>
      </div>
      
      {/* Time Range Selector */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2 text-sm font-medium text-gray-600">
          <Clock size={14} />
          <span>Time Range</span>
        </div>
        <select
          value={settings.timeRange}
          onChange={(e) => handleTimeRangeChange(e.target.value as MapSettings['timeRange'])}
          className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="now-1h">Last Hour</option>
          <option value="now-24h">Last 24 Hours</option>
          <option value="now-7d">Last 7 Days</option>
          <option value="custom">Custom Range</option>
        </select>
      </div>

      {/* Layer Toggles */}
      <div className="space-y-3">
        <div className="flex items-center space-x-2 text-sm font-medium text-gray-600">
          <Layers size={14} />
          <span>Map Layers</span>
        </div>
        
        <div className="space-y-2">
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm text-gray-700">Heatmap</span>
            <button
              onClick={() => handleToggle('showHeatmap')}
              className={`p-1 rounded ${
                settings.showHeatmap 
                  ? 'text-blue-600 bg-blue-100' 
                  : 'text-gray-400 bg-gray-100'
              }`}
            >
              {settings.showHeatmap ? <Eye size={16} /> : <EyeOff size={16} />}
            </button>
          </label>
          
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm text-gray-700">Geofences</span>
            <button
              onClick={() => handleToggle('showGeofences')}
              className={`p-1 rounded ${
                settings.showGeofences 
                  ? 'text-green-600 bg-green-100' 
                  : 'text-gray-400 bg-gray-100'
              }`}
            >
              {settings.showGeofences ? <Eye size={16} /> : <EyeOff size={16} />}
            </button>
          </label>
          
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm text-gray-700">Places</span>
            <button
              onClick={() => handleToggle('showPlaces')}
              className={`p-1 rounded ${
                settings.showPlaces 
                  ? 'text-purple-600 bg-purple-100' 
                  : 'text-gray-400 bg-gray-100'
              }`}
            >
              {settings.showPlaces ? <Eye size={16} /> : <EyeOff size={16} />}
            </button>
          </label>
        </div>
      </div>

      {/* Additional Controls */}
      <div className="space-y-3">
        <div className="flex items-center space-x-2 text-sm font-medium text-gray-600">
          <Map size={14} />
          <span>Features</span>
        </div>
        
        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-sm text-gray-700">Snap to Roads</span>
          <button
            onClick={() => handleToggle('snapToRoads')}
            className={`p-1 rounded ${
              settings.snapToRoads 
                ? 'text-orange-600 bg-orange-100' 
                : 'text-gray-400 bg-gray-100'
            }`}
          >
            {settings.snapToRoads ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>
        </label>
      </div>

      {/* Street View Button */}
      <button
        onClick={onStreetViewClick}
        className="w-full flex items-center justify-center space-x-2 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
      >
        <MapPin size={16} />
        <span>Street View</span>
      </button>
    </div>
  );
};