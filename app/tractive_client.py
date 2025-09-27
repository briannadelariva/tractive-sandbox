"""
Tractive API Client Wrapper

A thin wrapper around aiotractive for authentication and data retrieval.
"""

import logging
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta

try:
    from aiotractive import Tractive
except ImportError:
    # Fallback for development/testing
    class Tractive:
        def __init__(self, email: str, password: str):
            self.email = email
            self.password = password
        
        async def __aenter__(self):
            return self
        
        async def __aexit__(self, *args):
            pass

logger = logging.getLogger(__name__)


class TractiveClientError(Exception):
    """Custom exception for Tractive client errors"""
    pass


class TractiveClient:
    """Thin wrapper around aiotractive for session management and data fetching"""
    
    def __init__(self):
        self._client: Optional[Tractive] = None
        self._user_id: Optional[str] = None
        self._access_token: Optional[str] = None
        self._trackers: Optional[List[Dict]] = None
        
    async def authenticate(self, email: str, password: str) -> Dict[str, Any]:
        """
        Authenticate with Tractive API
        
        Returns:
            Dict with user_id and access_token for session storage
        """
        try:
            self._client = Tractive(email, password)
            await self._client.__aenter__()
            
            # Get user info and store session data
            user_info = await self._client.user_details()
            self._user_id = user_info.get('_id')
            self._access_token = getattr(self._client, '_access_token', None)
            
            logger.info(f"Successfully authenticated user: {email}")
            
            return {
                'user_id': self._user_id,
                'access_token': self._access_token,
                'email': email,
                'authenticated_at': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Authentication failed for {email}: {str(e)}")
            raise TractiveClientError(f"Authentication failed: {str(e)}")
    
    async def restore_session(self, session_data: Dict[str, Any]):
        """Restore client session from stored session data"""
        try:
            # For now, we'll need to re-authenticate
            # In a production app, you'd want to store and reuse the access token
            email = session_data.get('email')
            if not email:
                raise TractiveClientError("No email in session data")
                
            # Note: This is a limitation of the current approach
            # In production, you'd want to store refresh tokens
            logger.info(f"Session restoration attempted for {email}")
            
        except Exception as e:
            logger.error(f"Session restoration failed: {str(e)}")
            raise TractiveClientError(f"Session restoration failed: {str(e)}")
    
    async def get_trackers(self) -> List[Dict[str, Any]]:
        """Get list of user's trackers"""
        if not self._client:
            raise TractiveClientError("Not authenticated")
            
        try:
            trackers = await self._client.tracker()
            self._trackers = trackers
            
            # Format tracker data for display
            formatted_trackers = []
            for tracker in trackers:
                formatted_trackers.append({
                    'id': tracker.get('_id', 'Unknown'),
                    'name': tracker.get('name', 'Unnamed'),
                    'pet_name': tracker.get('pet_name', 'Unknown Pet'),
                    'model': tracker.get('model_number', 'Unknown Model'),
                    'firmware': tracker.get('fw_version', 'Unknown'),
                    'battery': tracker.get('battery_level', 0),
                    'charging': tracker.get('charging', False),
                    'last_seen': tracker.get('time_of_last_position_update', 'Unknown')
                })
            
            return formatted_trackers
            
        except Exception as e:
            logger.error(f"Failed to get trackers: {str(e)}")
            raise TractiveClientError(f"Failed to get trackers: {str(e)}")
    
    async def get_hardware_info(self, tracker_id: str) -> Dict[str, Any]:
        """Get hardware information for a specific tracker"""
        if not self._client:
            raise TractiveClientError("Not authenticated")
            
        try:
            # Get tracker details
            tracker = next((t for t in (self._trackers or []) if t.get('_id') == tracker_id), None)
            if not tracker:
                raise TractiveClientError(f"Tracker {tracker_id} not found")
            
            return {
                'tracker_id': tracker_id,
                'battery_level': tracker.get('battery_level', 0),
                'firmware_version': tracker.get('fw_version', 'Unknown'),
                'model': tracker.get('model_number', 'Unknown'),
                'capabilities': tracker.get('capabilities', []),
                'hardware_id': tracker.get('hw_id', 'Unknown'),
                'charging': tracker.get('charging', False)
            }
            
        except Exception as e:
            logger.error(f"Failed to get hardware info for {tracker_id}: {str(e)}")
            raise TractiveClientError(f"Failed to get hardware info: {str(e)}")
    
    async def get_latest_position(self, tracker_id: str) -> Dict[str, Any]:
        """Get latest position for a tracker"""
        if not self._client:
            raise TractiveClientError("Not authenticated")
            
        try:
            positions = await self._client.pos_report(tracker_ids=[tracker_id])
            
            if not positions or tracker_id not in positions:
                return {'error': 'No position data available'}
            
            pos_data = positions[tracker_id]
            
            return {
                'tracker_id': tracker_id,
                'timestamp': pos_data.get('time', 'Unknown'),
                'latitude': pos_data.get('latlong', [None, None])[0],
                'longitude': pos_data.get('latlong', [None, None])[1],
                'speed': pos_data.get('speed', 0),
                'accuracy': pos_data.get('pos_uncertainty', 0),
                'altitude': pos_data.get('altitude', None)
            }
            
        except Exception as e:
            logger.error(f"Failed to get position for {tracker_id}: {str(e)}")
            raise TractiveClientError(f"Failed to get position: {str(e)}")
    
    async def get_position_history(self, tracker_id: str, hours: int = 2) -> List[Dict[str, Any]]:
        """Get position history for a tracker"""
        if not self._client:
            raise TractiveClientError("Not authenticated")
            
        try:
            # Calculate time range
            to_time = datetime.now()
            from_time = to_time - timedelta(hours=hours)
            
            positions = await self._client.positions(
                tracker_ids=[tracker_id],
                time_from=int(from_time.timestamp()),
                time_to=int(to_time.timestamp())
            )
            
            if not positions or tracker_id not in positions:
                return []
            
            pos_list = positions[tracker_id]
            
            # Format position data
            formatted_positions = []
            for pos in pos_list[:100]:  # Limit to first 100 points
                formatted_positions.append({
                    'timestamp': pos.get('time', 'Unknown'),
                    'latitude': pos.get('latlong', [None, None])[0],
                    'longitude': pos.get('latlong', [None, None])[1],
                    'speed': pos.get('speed', 0),
                    'accuracy': pos.get('pos_uncertainty', 0)
                })
            
            return formatted_positions
            
        except Exception as e:
            logger.error(f"Failed to get position history for {tracker_id}: {str(e)}")
            raise TractiveClientError(f"Failed to get position history: {str(e)}")
    
    async def get_geofences(self, tracker_id: str) -> List[Dict[str, Any]]:
        """Get geofences for a tracker"""
        if not self._client:
            raise TractiveClientError("Not authenticated")
            
        try:
            # This is a placeholder - actual implementation depends on aiotractive API
            # For now, return empty list
            return []
            
        except Exception as e:
            logger.error(f"Failed to get geofences for {tracker_id}: {str(e)}")
            return []
    
    async def get_live_tracking_state(self, tracker_id: str) -> Dict[str, Any]:
        """Get live tracking state for a tracker"""
        if not self._client:
            raise TractiveClientError("Not authenticated")
            
        try:
            # This is a placeholder - actual implementation depends on aiotractive API
            return {
                'tracker_id': tracker_id,
                'live_tracking_enabled': False,
                'message': 'Live tracking state not available'
            }
            
        except Exception as e:
            logger.error(f"Failed to get live tracking state for {tracker_id}: {str(e)}")
            return {'error': str(e)}
    
    async def toggle_live_tracking(self, tracker_id: str, enable: bool) -> Dict[str, Any]:
        """Toggle live tracking for a tracker"""
        if not self._client:
            raise TractiveClientError("Not authenticated")
            
        try:
            # This is a placeholder - actual implementation depends on aiotractive API
            return {
                'tracker_id': tracker_id,
                'live_tracking_enabled': enable,
                'message': f'Live tracking {"enabled" if enable else "disabled"} (placeholder)'
            }
            
        except Exception as e:
            logger.error(f"Failed to toggle live tracking for {tracker_id}: {str(e)}")
            return {'error': str(e)}
    
    async def close(self):
        """Close the client connection"""
        if self._client:
            try:
                await self._client.__aexit__(None, None, None)
            except Exception as e:
                logger.error(f"Error closing client: {str(e)}")
            finally:
                self._client = None