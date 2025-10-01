"""
Command handlers for Tractive CLI.
"""

import json
import sys
import csv
import io
from typing import List, Dict, Any, Optional
from datetime import datetime

from .api_client import TractiveAPIClient
from .utils import format_timestamp


class Commands:
    """Handles all CLI commands."""
    
    def __init__(self, api_client: TractiveAPIClient):
        self.api_client = api_client
    
    def login_test(self) -> int:
        """Test login credentials."""
        try:
            if self.api_client.login():
                print("OK")
                return 0
            else:
                print("Authentication failed", file=sys.stderr)
                return 2
        except Exception as e:
            print(f"Login test failed: {e}", file=sys.stderr)
            return 1
    
    def trackers(self, format_type: str = 'json', battery_only: bool = False) -> int:
        """List trackers."""
        try:
            trackers_data = self.api_client.get_trackers()
            
            if not trackers_data:
                print("No trackers found")
                return 0
            
            # Prepare output data
            output_data = []
            for tracker in trackers_data:
                tracker_info = {
                    'id': tracker.get('_id'),
                    'name': tracker.get('name', ''),
                    'pet_name': tracker.get('pet_name', ''),
                    'model': tracker.get('model', ''),
                    'firmware': tracker.get('fw_version', ''),
                    'battery_level': tracker.get('battery_level', 0),
                    'charging': tracker.get('charging', False),
                    'last_seen': format_timestamp(tracker.get('time'))
                }
                
                if battery_only:
                    output_data.append({
                        'id': tracker_info['id'],
                        'battery_level': tracker_info['battery_level']
                    })
                else:
                    output_data.append(tracker_info)
            
            # Output in requested format
            if format_type == 'csv':
                self._output_csv(output_data)
            else:
                print(json.dumps(output_data, indent=2))
            
            return 0
            
        except Exception as e:
            print(f"Failed to get trackers: {e}", file=sys.stderr)
            return 1
    
    def latest(self, tracker_id: str, format_type: str = 'json') -> int:
        """Get latest position for a tracker."""
        try:
            position_data = self.api_client.get_latest_position(tracker_id)
            
            # Format position data
            position_info = {
                'lat': position_data.get('lat'),
                'lng': position_data.get('lng'),
                'time': format_timestamp(position_data.get('time')),
                'speed': position_data.get('speed'),
                'accuracy': position_data.get('accuracy'),
                'altitude': position_data.get('altitude')
            }
            
            # Output in requested format
            if format_type == 'csv':
                self._output_csv([position_info])
            else:
                print(json.dumps(position_info, indent=2))
            
            return 0
            
        except Exception as e:
            print(f"Failed to get latest position: {e}", file=sys.stderr)
            return 1
    
    def history(self, tracker_id: str, from_time: str, to_time: str, 
                format_type: str = 'json', max_points: Optional[int] = None) -> int:
        """Get position history for a tracker."""
        try:
            history_data = self.api_client.get_position_history(
                tracker_id, from_time, to_time, max_points
            )
            
            if not history_data:
                print("No position history found")
                return 0
            
            # Format position data
            formatted_positions = []
            for position in history_data:
                position_info = {
                    'time': format_timestamp(position.get('time')),
                    'lat': position.get('lat'),
                    'lng': position.get('lng'),
                    'speed': position.get('speed'),
                    'accuracy': position.get('accuracy'),
                    'altitude': position.get('altitude')
                }
                formatted_positions.append(position_info)
            
            # Apply max_points limit if specified and not handled by API
            if max_points and len(formatted_positions) > max_points:
                # Simple downsampling - take every nth point
                step = len(formatted_positions) // max_points
                if step > 1:
                    formatted_positions = formatted_positions[::step][:max_points]
            
            # Output in requested format
            if format_type == 'csv':
                self._output_csv(formatted_positions)
            else:
                print(json.dumps(formatted_positions, indent=2))
            
            return 0
            
        except Exception as e:
            print(f"Failed to get position history: {e}", file=sys.stderr)
            return 1
    
    def geofences(self, tracker_id: str) -> int:
        """Get geofences for a tracker."""
        try:
            geofences_data = self.api_client.get_geofences(tracker_id)
            
            if not geofences_data:
                print("No geofences found")
                return 0
            
            # Format geofences data
            formatted_geofences = []
            for geofence in geofences_data:
                geofence_info = {
                    'name': geofence.get('name', ''),
                    'type': geofence.get('type', ''),
                    'enabled': geofence.get('enabled', False),
                    'coordinates': geofence.get('coordinates', []),
                    'radius': geofence.get('radius')  # Only for circle type
                }
                formatted_geofences.append(geofence_info)
            
            print(json.dumps(formatted_geofences, indent=2))
            return 0
            
        except Exception as e:
            print(f"Failed to get geofences: {e}", file=sys.stderr)
            return 1
    
    def live(self, tracker_id: str, enable: bool) -> int:
        """Toggle live tracking for a tracker."""
        try:
            result = self.api_client.set_live_tracking(tracker_id, enable)
            
            # Output the resulting state
            state = {
                'tracker_id': tracker_id,
                'live_tracking': enable,
                'status': 'enabled' if enable else 'disabled'
            }
            
            print(json.dumps(state, indent=2))
            return 0
            
        except Exception as e:
            print(f"Failed to toggle live tracking: {e}", file=sys.stderr)
            return 1
    
    def _output_csv(self, data: List[Dict[str, Any]]):
        """Output data in CSV format."""
        if not data:
            return
        
        # Create CSV output
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=data[0].keys())
        writer.writeheader()
        writer.writerows(data)
        
        print(output.getvalue().strip())