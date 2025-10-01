"""
Authentication module for Tractive CLI.
"""

import os
import getpass
import sys
from typing import Optional


class TractiveAuth:
    """Handles Tractive authentication and credential management."""
    
    def __init__(self, debug: bool = False):
        self.debug = debug
        self._email: Optional[str] = None
        self._password: Optional[str] = None
        self._access_token: Optional[str] = None
        self._user_id: Optional[str] = None
    
    def get_credentials(self) -> tuple[str, str]:
        """Get email and password from environment or prompt."""
        email = os.getenv('TRACTIVE_EMAIL')
        password = os.getenv('TRACTIVE_PASSWORD')
        
        if not email:
            try:
                email = input('Email: ').strip()
            except (EOFError, KeyboardInterrupt):
                print("\nAuthentication cancelled", file=sys.stderr)
                sys.exit(130)
        
        if not password:
            try:
                password = getpass.getpass('Password: ')
            except (EOFError, KeyboardInterrupt):
                print("\nAuthentication cancelled", file=sys.stderr)
                sys.exit(130)
        
        if not email or not password:
            raise ValueError("Email and password are required")
        
        self._email = email
        self._password = password
        return email, password
    
    @property
    def access_token(self) -> Optional[str]:
        """Get the current access token."""
        return self._access_token
    
    @access_token.setter
    def access_token(self, token: str):
        """Set the access token."""
        self._access_token = token
    
    @property
    def user_id(self) -> Optional[str]:
        """Get the current user ID."""
        return self._user_id
    
    @user_id.setter
    def user_id(self, user_id: str):
        """Set the user ID."""
        self._user_id = user_id
    
    def redact_for_debug(self, text: str) -> str:
        """Redact sensitive information from debug output."""
        if not self.debug:
            return text
            
        # Redact password and tokens
        if self._password and self._password in text:
            text = text.replace(self._password, '[REDACTED]')
        
        if self._access_token and self._access_token in text:
            text = text.replace(self._access_token, '[REDACTED]')
            
        return text