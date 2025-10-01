"""
Tractive CLI - Minimal command-line tool for Tractive pet tracker data

This tool uses unofficial Tractive APIs and may break if Tractive changes endpoints.
"""

import argparse
import os
import sys
import json
from typing import Optional

from .auth import TractiveAuth
from .api_client import TractiveAPIClient
from .commands import Commands
from .utils import setup_debug_logging, print_disclaimer


def create_parser():
    """Create the argument parser with all subcommands."""
    parser = argparse.ArgumentParser(
        prog='tractive-cli',
        description='Minimal CLI tool for Tractive pet tracker data (unofficial API)',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Environment Variables:
  TRACTIVE_EMAIL        Email for Tractive account
  TRACTIVE_PASSWORD     Password for Tractive account
  TRACTIVE_MAX_RETRIES  Maximum number of retries (default: 3)
  TRACTIVE_BACKOFF_MS   Base backoff time in ms (default: 1000)

Exit Codes:
  0   Success
  1   General error
  2   Authentication error
  3   Network error
  4   Rate limit exceeded

Examples:
  tractive-cli login-test
  tractive-cli trackers
  tractive-cli latest --tracker <id>
  tractive-cli history --tracker <id> --from 2025-09-25T00:00:00Z --to 2025-09-26T00:00:00Z --format csv --max-points 1000
  tractive-cli geofences --tracker <id>
  tractive-cli live --tracker <id> --on
        """
    )
    
    parser.add_argument('--debug', action='store_true', help='Enable debug output')
    parser.add_argument('--base-url', help='Override API base URL')
    
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    # login-test command
    login_parser = subparsers.add_parser('login-test', help='Test login credentials')
    
    # trackers command
    trackers_parser = subparsers.add_parser('trackers', help='List trackers')
    trackers_parser.add_argument('--format', choices=['json', 'csv'], default='json', help='Output format')
    trackers_parser.add_argument('--battery-only', action='store_true', help='Show only battery percentages')
    
    # latest command
    latest_parser = subparsers.add_parser('latest', help='Get latest position')
    latest_parser.add_argument('--tracker', required=True, help='Tracker ID')
    latest_parser.add_argument('--format', choices=['json', 'csv'], default='json', help='Output format')
    
    # history command
    history_parser = subparsers.add_parser('history', help='Get position history')
    history_parser.add_argument('--tracker', required=True, help='Tracker ID')
    history_parser.add_argument('--from', dest='from_time', required=True, help='Start time (ISO8601)')
    history_parser.add_argument('--to', dest='to_time', required=True, help='End time (ISO8601)')
    history_parser.add_argument('--format', choices=['json', 'csv'], default='json', help='Output format')
    history_parser.add_argument('--max-points', type=int, help='Maximum number of points to return')
    
    # geofences command
    geofences_parser = subparsers.add_parser('geofences', help='List geofences')
    geofences_parser.add_argument('--tracker', required=True, help='Tracker ID')
    
    # live command
    live_parser = subparsers.add_parser('live', help='Toggle live tracking')
    live_parser.add_argument('--tracker', required=True, help='Tracker ID')
    live_group = live_parser.add_mutually_exclusive_group(required=True)
    live_group.add_argument('--on', action='store_true', help='Enable live tracking')
    live_group.add_argument('--off', action='store_true', help='Disable live tracking')
    
    return parser


def main():
    """Main entry point."""
    parser = create_parser()
    args = parser.parse_args()
    
    if args.debug:
        setup_debug_logging()
    
    # Print disclaimer on first meaningful command
    if args.command and args.command != 'login-test':
        print_disclaimer()
    
    if not args.command:
        parser.print_help()
        return 0
    
    try:
        # Initialize auth and API client
        auth = TractiveAuth(debug=args.debug)
        api_client = TractiveAPIClient(
            auth=auth,
            base_url=args.base_url,
            debug=args.debug
        )
        
        # Initialize commands handler
        commands = Commands(api_client)
        
        # Route to appropriate command
        if args.command == 'login-test':
            return commands.login_test()
        elif args.command == 'trackers':
            return commands.trackers(
                format_type=args.format,
                battery_only=args.battery_only
            )
        elif args.command == 'latest':
            return commands.latest(
                tracker_id=args.tracker,
                format_type=args.format
            )
        elif args.command == 'history':
            return commands.history(
                tracker_id=args.tracker,
                from_time=args.from_time,
                to_time=args.to_time,
                format_type=args.format,
                max_points=args.max_points
            )
        elif args.command == 'geofences':
            return commands.geofences(tracker_id=args.tracker)
        elif args.command == 'live':
            return commands.live(
                tracker_id=args.tracker,
                enable=args.on
            )
        else:
            print(f"Unknown command: {args.command}", file=sys.stderr)
            return 1
            
    except KeyboardInterrupt:
        print("\nInterrupted by user", file=sys.stderr)
        return 130
    except Exception as e:
        if args.debug:
            import traceback
            traceback.print_exc()
        else:
            print(f"Error: {e}", file=sys.stderr)
        return 1


if __name__ == '__main__':
    sys.exit(main())