# Station Integration Guide

This document explains how to integrate the station hardware with your web application.

## Overview

The system now consists of three main components:

1. **FastAPI Station App** (Raspberry Pi) - Handles hardware I/O
2. **Django Backend** - REST API + WebSocket server
3. **React Frontend** - Web interface

## Quick Start

### 1. Update Backend Dependencies

```bash
cd backend
pip install -r requirements.txt
```

New dependencies added:
- `channels==4.2.0` - Django WebSocket support
- `daphne==4.2.0` - ASGI server
- `channels-redis==4.2.1` - Optional, for production with Redis

### 2. Run Backend with WebSocket Support

Instead of the standard Django runserver, use Daphne (ASGI server):

```bash
# Development
daphne -b 0.0.0.0 -p 8000 arena.asgi:application

# Production (with Redis for channel layers)
# First, install and start Redis
# Then update settings.py CHANNEL_LAYERS to use RedisChannelLayer
daphne -b 0.0.0.0 -p 8000 arena.asgi:application
```

### 3. Test Station in Simulation Mode

```bash
cd station

# Install dependencies
pip install -r requirements.txt

# The .env file is already configured for simulation
# SIMULATE_HARDWARE=true means no GPIO/NFC hardware needed

# Run the station
python main.py
```

The station will start on `http://localhost:8001`

### 4. Test the Integration

Open multiple browser tabs:

**Tab 1: Station Status**
```
http://localhost:8001
```

**Tab 2: Simulate RFID Scan**
```bash
curl -X POST http://localhost:8001/simulate/rfid \
  -H "Content-Type: application/json" \
  -d '{"rfid_tag": "ABC123"}'
```

**Tab 3: Check WebSocket (see test HTML in station/README.md)**

## WebSocket Endpoints

### Backend WebSocket URLs

1. **Station WebSocket**: `ws://backend:8000/ws/station/{station_id}/`
   - For real-time communication with specific station
   - Receives: session updates, button presses, RFID scans
   
2. **Leaderboard WebSocket**: `ws://backend:8000/ws/leaderboard/`
   - For live leaderboard updates
   - Receives: leaderboard changes as sessions complete

### Station WebSocket: `ws://station:8001/ws`
   - Direct connection to station hardware
   - Receives: hardware events in real-time

## Updating the Frontend

### Option 1: Connect to Backend WebSocket

Update `StationPage.js` to connect to the Django backend WebSocket:

```javascript
// Connect to backend station WebSocket
const stationId = 'station-1';
const ws = new WebSocket(`ws://${backendHost}:8000/ws/station/${stationId}/`);

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  switch(data.type) {
    case 'session_started':
      // Update UI with session data
      setSession(data.session);
      break;
      
    case 'session_ended':
      // Show results
      setResult(data.result);
      break;
      
    case 'button_press':
      if (data.button === 'hint') {
        setShowHint(true);
        setStorylineHint(data.hint);
      }
      break;
      
    case 'rfid_scan':
      // Process RFID scan
      console.log('RFID scanned:', data.rfid_tag);
      break;
  }
};
```

### Option 2: Connect Directly to Station WebSocket

For local stations, connect directly:

```javascript
// Connect to station WebSocket
const ws = new WebSocket('ws://station-ip:8001/ws');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // Handle events same as above
};
```

### Removing Manual RFID Input

In `StationPage.js`, the current manual RFID input can be:

1. **Hidden** when station WebSocket is connected
2. **Kept as fallback** for testing/debugging
3. **Replaced** with connection status indicator

Example:

```javascript
const [connectedToStation, setConnectedToStation] = useState(false);

// Show manual input only when not connected
{!connectedToStation && (
  <input 
    value={rfidInput}
    onChange={(e) => setRfidInput(e.target.value)}
    placeholder="Enter RFID manually..."
  />
)}

// Show connection status
{connectedToStation && (
  <div className="status-indicator connected">
    🟢 Station Connected - Scan your RFID band
  </div>
)}
```

## Testing Workflow

### 1. Setup

```bash
# Terminal 1: Backend
cd backend
daphne -b 0.0.0.0 -p 8000 arena.asgi:application

# Terminal 2: Station (simulation mode)
cd station
python main.py

# Terminal 3: Frontend
cd frontend
npm start
```

### 2. Create Test Session in Django Admin

1. Go to `http://localhost:8000/admin/`
2. Create a `PendingSignup` with:
   - Party name: "Test Team"
   - RFID tag: "ABC123"
   - Status: "approved"
   - Session minutes: 60

### 3. Test RFID Scan

```bash
# Simulate RFID scan
curl -X POST http://localhost:8001/simulate/rfid \
  -H "Content-Type: application/json" \
  -d '{"rfid_tag": "ABC123"}'
```

You should see:
- Station logs showing session started
- Backend WebSocket receives event
- Frontend updates (if connected)

### 4. Test Hint Button

```bash
# Simulate hint button press
curl -X POST http://localhost:8001/simulate/button/hint
```

### 5. End Session

```bash
# Create a staff user with RFID tag "STAFF001"
# Then simulate staff scan
curl -X POST http://localhost:8001/simulate/rfid \
  -H "Content-Type: application/json" \
  -d '{"rfid_tag": "STAFF001"}'
```

## Hardware Deployment Checklist

### Raspberry Pi Setup

- [ ] Raspberry Pi with Raspbian OS installed
- [ ] I2C enabled (`sudo raspi-config`)
- [ ] PN532 NFC reader connected (I2C)
- [ ] Buttons wired to GPIO pins (with pull-up resistors)
- [ ] Relay module connected to GPIO pins
- [ ] Station app installed and configured
- [ ] Service file created (`systemctl`)
- [ ] Network connectivity to backend server
- [ ] Static IP address assigned (recommended)

### Network Configuration

- [ ] Backend server accessible from station
- [ ] Firewall rules allow ports 8000, 8001
- [ ] WebSocket connections allowed
- [ ] CORS configured in Django backend
- [ ] Stations on same VLAN or have routing

### Testing

- [ ] Test NFC reader: `python backend/scripts/nfc.py`
- [ ] Test buttons: `python backend/scripts/buttons.py`
- [ ] Test relays: `python backend/scripts/relays.py`
- [ ] Test station API: `curl http://station-ip:8001/`
- [ ] Test backend API: `curl http://backend-ip:8000/api/auth/public/storylines/`
- [ ] Test WebSocket: Use test HTML or browser console

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      Web Browser (React)                    │
│  ┌────────────────┐  ┌────────────────┐  ┌───────────────┐ │
│  │ Station Page   │  │ Dashboard      │  │ Leaderboard   │ │
│  └────────┬───────┘  └────────┬───────┘  └───────┬───────┘ │
└───────────┼──────────────────┼──────────────────┼──────────┘
            │ HTTP/WS          │ HTTP             │ WS
            ▼                  ▼                  ▼
┌────────────────────────────────────────────────────────────┐
│              Django Backend (REST + WebSocket)             │
│  ┌──────────────┐  ┌─────────────┐  ┌──────────────────┐  │
│  │ REST API     │  │ WebSocket   │  │ Database         │  │
│  │ /api/auth/*  │  │ Consumers   │  │ (Sessions,       │  │
│  │              │  │             │  │  Users, etc)     │  │
│  └──────────────┘  └─────────────┘  └──────────────────┘  │
└────────────┬──────────────────────────────────────────────┘
             │ HTTP API Calls
             ▼
┌────────────────────────────────────────────────────────────┐
│            Raspberry Pi Station (FastAPI)                  │
│  ┌──────────────┐  ┌─────────────┐  ┌──────────────────┐  │
│  │ FastAPI App  │  │ Hardware    │  │ WebSocket        │  │
│  │              │◄─┤ Manager     │  │                  │  │
│  └──────────────┘  └─────┬───────┘  └──────────────────┘  │
│                           │                                │
│  ┌────────────────────────┼────────────────────────────┐  │
│  │         Hardware       │                            │  │
│  │  ┌─────────────────────┴───────────────────┐       │  │
│  │  │                                          │       │  │
│  │  │  ┌────────────┐  ┌────────────┐  ┌─────▼─────┐ │  │
│  │  │  │ NFC Reader │  │  Buttons   │  │  Relays   │ │  │
│  │  │  │  (PN532)   │  │ (Stop,     │  │ (Game     │ │  │
│  │  │  │            │  │  Hint)     │  │  State)   │ │  │
│  │  │  └────────────┘  └────────────┘  └───────────┘ │  │
│  │  │                                                  │  │
│  │  └──────────────────────────────────────────────────┘ │
│  │                           GPIO                         │
└──┴────────────────────────────────────────────────────────┘
```

## Event Flow Examples

### Example 1: Player Starts Game

1. Player scans RFID band → **Station NFC Reader**
2. Station detects card → `handle_rfid_scan()`
3. Station calls Backend API → `POST /api/auth/rfid/start/`
4. Backend validates & starts session → Returns session data, timer starts automatically
5. Station updates hardware → Turn on GAME_ACTIVE relay
6. Station broadcasts WebSocket → `{type: 'session_started', session: {...}}`
7. Frontend receives WebSocket → Updates UI to show game in progress

### Example 2: Player Requests Hint

1. Player presses hint button → **Station GPIO Button**
2. Station detects press → `handle_hint_button()`
3. Station broadcasts WebSocket → `{type: 'button_press', button: 'hint'}`
4. Frontend receives event → Shows hint overlay with storyline hint

### Example 3: Player/Staff Ends Game

**Option A: Stop Button**
1. Player presses stop button → **Station GPIO Button**
2. Station detects press → `handle_stop_button()`
3. Station ends session → `POST /api/auth/rfid/stop/`
4. Backend calculates points → Returns result
5. Station updates hardware → Turn off GAME_ACTIVE, turn on READY relay
6. Station broadcasts WebSocket → `{type: 'session_ended', result: {...}}`
7. Frontend shows results → Display points and time

**Option B: Staff Card**
1. Staff scans RFID card → **Station NFC Reader**
2. Station calls Backend API → `POST /api/auth/rfid/check-staff/`
3. Backend confirms staff → Returns staff data
4. Station ends session → `POST /api/auth/rfid/stop/`
5. Backend calculates points → Returns result
6. Station updates hardware → Turn off GAME_ACTIVE, turn on READY relay
7. Station broadcasts WebSocket → `{type: 'session_ended', result: {...}}`
8. Frontend shows results → Display points and time

## File Changes Summary

### New Files

- `station/` - New directory with entire station application
  - `main.py` - FastAPI application
  - `config.py` - Configuration management
  - `hardware.py` - Hardware abstraction layer
  - `api_client.py` - Backend API client
  - `requirements.txt` - Dependencies
  - `.env` - Configuration file
  - `README.md` - Documentation

- `backend/accounts/consumers.py` - WebSocket consumers
- `backend/accounts/routing.py` - WebSocket routing
- `backend/accounts/websocket_utils.py` - Broadcast helper functions

### Modified Files

- `backend/requirements.txt` - Added channels, daphne
- `backend/arena/settings.py` - Added ASGI and CHANNEL_LAYERS config
- `backend/arena/asgi.py` - Updated for channels routing

### Files to Update (Frontend)

- `frontend/src/station/StationPage.js` - Add WebSocket connection
- Any other pages that need real-time updates

## Next Steps

1. **Test Backend WebSocket**
   ```bash
   cd backend
   pip install -r requirements.txt
   daphne -b 0.0.0.0 -p 8000 arena.asgi:application
   ```

2. **Test Station in Simulation**
   ```bash
   cd station
   pip install -r requirements.txt
   python main.py
   ```

3. **Update Frontend** to connect to WebSocket

4. **Deploy to Raspberry Pi** when ready for hardware testing

5. **Setup Multiple Stations** by changing STATION_ID in .env

## Troubleshooting

### "Channel layer is not configured"

Make sure you've:
1. Installed channels: `pip install channels`
2. Added channels to INSTALLED_APPS
3. Added CHANNEL_LAYERS to settings.py
4. Running with daphne, not runserver

### WebSocket connection failed

1. Check daphne is running
2. Verify CORS/CSRF settings in Django
3. Try ws:// instead of wss:// for development
4. Check browser console for errors

### RFID not being detected

In simulation mode, use the API:
```bash
curl -X POST http://localhost:8001/simulate/rfid \
  -H "Content-Type: application/json" \
  -d '{"rfid_tag": "ABC123"}'
```

On real hardware:
1. Check I2C: `sudo i2cdetect -y 1`
2. Check wiring
3. Test with: `python backend/scripts/nfc.py`

## Support

Check the detailed README files:
- `station/README.md` - Station application docs
- Backend logs: Station logs or Django logs
- Test individual components with scripts in `backend/scripts/`
