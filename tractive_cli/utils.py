"""
Utility functions for Tractive CLI.
"""

import logging
import sys
import os
from typing import Optional
from datetime import datetime


def setup_debug_logging():
    """Set up debug logging."""
    logging.basicConfig(
        level=logging.DEBUG,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        stream=sys.stderr
    )


def format_timestamp(timestamp: Optional[str]) -> Optional[str]:
    """Format timestamp for consistent output."""
    if not timestamp:
        return None
    
    try:
        # Handle different timestamp formats
        if 'T' in timestamp:
            # ISO format
            return timestamp
        else:
            # Unix timestamp
            dt = datetime.fromtimestamp(int(timestamp))
            return dt.isoformat() + 'Z'
    except (ValueError, TypeError):
        return timestamp


def print_disclaimer():
    """Print disclaimer about unofficial API usage."""
    # Only print once per session
    disclaimer_file = '/tmp/.tractive_cli_disclaimer'
    
    if not os.path.exists(disclaimer_file):
        print("Note: This tool uses unofficial Tractive APIs and may break if endpoints change.", 
              file=sys.stderr)
        try:
            with open(disclaimer_file, 'w') as f:
                f.write('shown')
        except:
            pass  # Ignore if we can't create the file