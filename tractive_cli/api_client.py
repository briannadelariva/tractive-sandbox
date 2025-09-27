"""
API client for Tractive REST API.
"""

import json
import time
import random
import os
import sys
from typing import Dict, Any, Optional, List
from urllib.parse import urljoin

import requests

from .auth import TractiveAuth


class TractiveAPIClient:
    """Client for interacting with Tractive REST API."""
    
    def __init__(self, auth: TractiveAuth, base_url: Optional[str] = None, debug: bool = False):
        self.auth = auth
        # Try common Tractive API base URLs
        self.base_url = base_url or "https://graph.tractive.com/3"
        self.debug = debug
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'tractive-cli/1.0.0',
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        })
        
        # Rate limiting configuration
        self.max_retries = int(os.getenv('TRACTIVE_MAX_RETRIES', '3'))
        self.base_backoff_ms = int(os.getenv('TRACTIVE_BACKOFF_MS', '1000'))
    
    def _debug_log(self, message: str):
        """Log debug message if debug mode is enabled."""
        if self.debug:
            redacted_message = self.auth.redact_for_debug(message)
            print(f"DEBUG: {redacted_message}", file=sys.stderr)
    
    def _make_request(self, method: str, endpoint: str, **kwargs) -> requests.Response:
        """Make HTTP request with retry logic and rate limiting."""
        url = urljoin(self.base_url, endpoint)
        
        for attempt in range(self.max_retries + 1):
            try:
                self._debug_log(f"{method.upper()} {url}")
                response = self.session.request(method, url, **kwargs)
                
                # Handle rate limiting
                if response.status_code == 429:
                    if attempt < self.max_retries:
                        backoff = (self.base_backoff_ms / 1000) * (2 ** attempt)
                        jitter = random.uniform(0.1, 0.3) * backoff
                        sleep_time = backoff + jitter
                        
                        self._debug_log(f"Rate limited, sleeping {sleep_time:.2f}s")
                        time.sleep(sleep_time)
                        continue
                    else:
                        print("Rate limit exceeded, max retries reached", file=sys.stderr)
                        sys.exit(4)
                
                # Handle server errors with backoff
                if response.status_code >= 500:
                    if attempt < self.max_retries:
                        backoff = (self.base_backoff_ms / 1000) * (2 ** attempt)
                        jitter = random.uniform(0.1, 0.3) * backoff
                        sleep_time = backoff + jitter
                        
                        self._debug_log(f"Server error {response.status_code}, sleeping {sleep_time:.2f}s")
                        time.sleep(sleep_time)
                        continue
                    else:
                        print(f"Server error {response.status_code}, max retries reached", file=sys.stderr)
                        sys.exit(3)
                
                return response
                
            except requests.exceptions.ConnectionError as e:
                if attempt < self.max_retries:
                    backoff = (self.base_backoff_ms / 1000) * (2 ** attempt)
                    jitter = random.uniform(0.1, 0.3) * backoff
                    sleep_time = backoff + jitter
                    
                    self._debug_log(f"Connection error, sleeping {sleep_time:.2f}s")
                    time.sleep(sleep_time)
                    continue
                else:
                    print(f"Network error: {e}", file=sys.stderr)
                    sys.exit(3)
            
            except requests.exceptions.Timeout as e:
                if attempt < self.max_retries:
                    backoff = (self.base_backoff_ms / 1000) * (2 ** attempt)
                    jitter = random.uniform(0.1, 0.3) * backoff
                    sleep_time = backoff + jitter
                    
                    self._debug_log(f"Timeout error, sleeping {sleep_time:.2f}s")
                    time.sleep(sleep_time)
                    continue
                else:
                    print(f"Timeout error: {e}", file=sys.stderr)
                    sys.exit(3)
        
        # Should never reach here
        raise RuntimeError("Request failed after all retries")
    
    def login(self) -> bool:
        """Authenticate with Tractive and obtain access token."""
        email, password = self.auth.get_credentials()
        
        # Try different login patterns that might be used by Tractive
        login_patterns = [
            {
                "endpoint": '/auth/token',
                "data": {
                    "platform_email": email,
                    "platform_token": password,
                    "grant_type": "tractive"
                }
            },
            {
                "endpoint": '/login',
                "data": {
                    "email": email,
                    "password": password
                }
            },
            {
                "endpoint": '/auth/login',
                "data": {
                    "username": email,
                    "password": password
                }
            }
        ]
        
        for pattern in login_patterns:
            try:
                self._debug_log(f"Trying login pattern: {pattern['endpoint']}")
                response = self._make_request('POST', pattern['endpoint'], json=pattern['data'])
                
                if response.status_code == 200:
                    data = response.json()
                    
                    # Handle different response formats
                    access_token = (data.get('access_token') or 
                                  data.get('token') or 
                                  data.get('auth_token') or
                                  data.get('jwt'))
                    
                    user_id = (data.get('user_id') or 
                              data.get('userId') or 
                              data.get('id') or
                              data.get('user', {}).get('id'))
                    
                    if access_token:
                        self.auth.access_token = access_token
                        self.auth.user_id = str(user_id) if user_id else None
                        
                        # Set authorization header for future requests
                        self.session.headers['Authorization'] = f'Bearer {access_token}'
                        self._debug_log("Login successful")
                        return True
                
                elif response.status_code in [401, 403]:
                    # Continue trying other patterns for non-auth errors
                    if pattern == login_patterns[-1]:  # Last pattern
                        error_msg = "Invalid credentials"
                        try:
                            error_data = response.json()
                            error_msg = error_data.get('message', error_msg)
                        except:
                            pass
                        print(f"Authentication failed: {error_msg}", file=sys.stderr)
                        sys.exit(2)
                    continue
                else:
                    self._debug_log(f"Login failed with status {response.status_code}")
                    continue
                    
            except Exception as e:
                self._debug_log(f"Login error with pattern {pattern['endpoint']}: {e}")
                continue
        
        print("All login patterns failed", file=sys.stderr)
        return False
    
    def get_trackers(self) -> List[Dict[str, Any]]:
        """Get list of user's trackers."""
        if not self.auth.access_token:
            if not self.login():
                raise RuntimeError("Authentication failed")
        
        response = self._make_request('GET', f'/user/{self.auth.user_id}/trackers')
        
        if response.status_code == 200:
            return response.json()
        else:
            raise RuntimeError(f"Failed to get trackers: {response.status_code}")
    
    def get_tracker_details(self, tracker_id: str) -> Dict[str, Any]:
        """Get detailed information about a specific tracker."""
        if not self.auth.access_token:
            if not self.login():
                raise RuntimeError("Authentication failed")
        
        response = self._make_request('GET', f'/tracker/{tracker_id}')
        
        if response.status_code == 200:
            return response.json()
        else:
            raise RuntimeError(f"Failed to get tracker details: {response.status_code}")
    
    def get_latest_position(self, tracker_id: str) -> Dict[str, Any]:
        """Get latest position for a tracker."""
        if not self.auth.access_token:
            if not self.login():
                raise RuntimeError("Authentication failed")
        
        response = self._make_request('GET', f'/tracker/{tracker_id}/positions/latest')
        
        if response.status_code == 200:
            return response.json()
        else:
            raise RuntimeError(f"Failed to get latest position: {response.status_code}")
    
    def get_position_history(self, tracker_id: str, from_time: str, to_time: str, 
                           max_points: Optional[int] = None) -> List[Dict[str, Any]]:
        """Get position history for a tracker."""
        if not self.auth.access_token:
            if not self.login():
                raise RuntimeError("Authentication failed")
        
        params = {
            'time_from': from_time,
            'time_to': to_time
        }
        
        if max_points:
            params['format'] = 'json_segments'
            params['segments'] = max_points
        
        response = self._make_request('GET', f'/tracker/{tracker_id}/positions', params=params)
        
        if response.status_code == 200:
            data = response.json()
            # Handle different response formats
            if isinstance(data, list):
                return data
            elif isinstance(data, dict) and 'positions' in data:
                return data['positions']
            else:
                return [data]
        else:
            raise RuntimeError(f"Failed to get position history: {response.status_code}")
    
    def get_geofences(self, tracker_id: str) -> List[Dict[str, Any]]:
        """Get geofences for a tracker."""
        if not self.auth.access_token:
            if not self.login():
                raise RuntimeError("Authentication failed")
        
        response = self._make_request('GET', f'/tracker/{tracker_id}/geofences')
        
        if response.status_code == 200:
            return response.json()
        else:
            raise RuntimeError(f"Failed to get geofences: {response.status_code}")
    
    def set_live_tracking(self, tracker_id: str, enabled: bool) -> Dict[str, Any]:
        """Enable or disable live tracking for a tracker."""
        if not self.auth.access_token:
            if not self.login():
                raise RuntimeError("Authentication failed")
        
        data = {'live_tracking': enabled}
        response = self._make_request('PUT', f'/tracker/{tracker_id}/live_tracking', json=data)
        
        if response.status_code == 200:
            return response.json()
        else:
            raise RuntimeError(f"Failed to set live tracking: {response.status_code}")