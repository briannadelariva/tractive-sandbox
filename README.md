# Tractive CLI

A minimal command-line tool for accessing Tractive pet tracker data using the unofficial REST API.

> ⚠️ **Disclaimer**: This tool uses unofficial Tractive APIs and may break if Tractive changes their endpoints.

## Installation

```bash
# Install from source
git clone <repo-url>
cd tractive-sandbox
pip install -r requirements.txt

# Make the CLI executable
chmod +x tractive-cli
```

Or install as a package:
```bash
pip install -e .
```

## Configuration

Set your Tractive credentials via environment variables:
```bash
export TRACTIVE_EMAIL="your-email@example.com"
export TRACTIVE_PASSWORD="your-password"
```

If not set, the tool will prompt you securely for credentials.

Additional configuration:
```bash
export TRACTIVE_MAX_RETRIES=3      # Maximum API retries (default: 3)
export TRACTIVE_BACKOFF_MS=1000    # Base backoff time in ms (default: 1000)
```

## Usage

### Basic Commands

```bash
# Test login credentials
./tractive-cli login-test

# List all trackers
./tractive-cli trackers

# List trackers in CSV format
./tractive-cli trackers --format csv

# Show only battery levels
./tractive-cli trackers --battery-only

# Get latest position for a tracker
./tractive-cli latest --tracker TRACKER_ID

# Get position history
./tractive-cli history --tracker TRACKER_ID --from 2025-09-25T00:00:00Z --to 2025-09-26T00:00:00Z

# Get position history in CSV format with max points
./tractive-cli history --tracker TRACKER_ID --from 2025-09-25T00:00:00Z --to 2025-09-26T00:00:00Z --format csv --max-points 1000

# List geofences
./tractive-cli geofences --tracker TRACKER_ID

# Enable live tracking
./tractive-cli live --tracker TRACKER_ID --on

# Disable live tracking
./tractive-cli live --tracker TRACKER_ID --off
```

### Global Options

- `--debug`: Enable debug output with sensitive data redaction (shows URLs, status codes, and response bodies for troubleshooting)
- `--base-url URL`: Override the default API base URL
- `--help`: Show help message

### Output Formats

- **JSON** (default): Pretty-printed JSON output
- **CSV**: Available for `trackers`, `latest`, and `history` commands

For CSV history output, columns include: `time`, `lat`, `lng`, `speed`, `accuracy`, `altitude`

## Exit Codes

- `0`: Success
- `1`: General error
- `2`: Authentication error
- `3`: Network error
- `4`: Rate limit exceeded

## Features

- **Secure authentication**: Credentials via environment variables or secure prompts
- **Rate limiting**: Automatic retry with exponential backoff and jitter
- **Error handling**: Clear error messages with hints for common issues
- **Debug mode**: Detailed logging with sensitive data redaction
- **Multiple output formats**: JSON and CSV support
- **Data filtering**: Battery-only mode, max points for history
- **Network resilience**: Configurable retries and backoff

## API Endpoints

The tool attempts to use these Tractive API endpoints:
- `POST /auth/token` - Authentication
- `GET /user/{user_id}/trackers` - List trackers
- `GET /tracker/{tracker_id}` - Tracker details
- `GET /tracker/{tracker_id}/pos_report` - Latest position
- `GET /tracker/{tracker_id}/positions` - Position history
- `GET /tracker/{tracker_id}/geofences` - Geofences
- `PUT /tracker/{tracker_id}/live_tracking` - Live tracking control

## Development

### Using Dev Container (Recommended)

This project includes a dev container configuration for Visual Studio Code:

1. Install [Docker Desktop](https://www.docker.com/products/docker-desktop) and the [Dev Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)
2. Open this repository in VS Code
3. Click "Reopen in Container" when prompted (or use Command Palette → "Dev Containers: Reopen in Container")
4. All dependencies will be installed automatically

See [.devcontainer/README.md](.devcontainer/README.md) for more details.

### Manual Setup

```bash
# Install in development mode
pip install -e .

# Run with debug output
./tractive-cli --debug trackers
```

## Security Notes

- Never log or expose passwords or access tokens
- Debug mode automatically redacts sensitive information
- Credentials are only requested when needed
- No sensitive data is stored permanently

## Limitations

- Uses unofficial API endpoints that may change without notice
- Rate limiting depends on Tractive's server-side restrictions
- Some features may not work if API structure changes
- Network timeouts and retries are configured conservatively