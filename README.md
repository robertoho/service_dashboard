# Services Dashboard

A dashboard application for managing links to services on your local network or VPN.

![Services Dashboard Screenshot](public/screenshot.png)

## Features

- **Organize Service Links**: Add, edit, and delete links to your services
- **Custom Organization**: Drag and drop to arrange services in your preferred order
- **Customizable Interface**: Change dashboard title, colors, and appearance
- **Multiple View Options**: Grid, list, or detailed table view
- **Image Support**: Paste images directly to customize service cards
- **Authentication**: Optional login protection for your dashboard
- **Persistent Storage**: All settings and links are saved to a backend server
- **Offline Mode Fallback**: Continues to work even if server is temporarily unreachable

## Setup

### Requirements

- Node.js (v14+)
- npm (v6+)

### Installation

1. Clone this repository
2. Install dependencies:

```bash
# Install both frontend and backend dependencies with one command
npm run install:all
```

### Configuration

By default, the dashboard server runs on port 3001, and the frontend Vite dev server runs on port 5173.
You can change these settings in:

- Frontend: `vite.config.ts` (proxy settings)
- Backend: `server/index.js` (PORT variable)

## Usage

### Development

Start both the frontend and backend simultaneously:

```bash
npm run dev:all
```

Or start them separately:

```bash
# Start just the frontend
npm run dev

# Start just the backend
npm run dev:server
```

### Production

To build for production:

```bash
npm run build
```

This creates a production build in the `dist` directory.

To serve the production build:

1. Build the frontend as above
2. Start the server:

```bash
cd server
npm start
```

## Data Storage

The dashboard server stores all data in JSON files within the `server/data` directory:

- `links.json`: All service links
- `links_order.json`: Custom ordering information
- `dashboard_settings.json`: Dashboard appearance settings
- `auth_settings.json`: Authentication settings

## Authentication

To enable authentication:

1. Click the 🔒 button in the top right corner
2. Toggle "Authentication Status" to "Enabled"
3. Enter a username and password
4. Click "Save Authentication Settings"

After enabling authentication, you'll need to log in to access the dashboard.

## License

MIT
