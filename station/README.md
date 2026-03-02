# Arena Station Application

FastAPI-based application that runs on Raspberry Pi stations to handle hardware I/O (RFID readers, buttons, relays) and communicate with the Arena backend server.

## Overview

The station application provides:
- **RFID/NFC Card Reading**: Automatically detect and process RFID card scans to start sessions
- **Button Input**: Handle physical button presses (stop session, request hint)
- **Relay Control**: Control output relays for game state indicators
- **WebSocket Communication**: Real-time bidirectional communication with the web application
- **REST API**: Communication with the Django backend for session management
- **Simulation Mode**: Test without physical hardware during development

**Session Flow**: 
1. Player scans RFID band → Session starts automatically
2. Timer begins, game is active
3. Player presses hint button → Hint is shown
4. Player presses stop button OR staff scans card → Session ends

## Architecture

```
┌─────────────────────┐         ┌──────────────────┐
│  Raspberry Pi       │         │  Django Backend  │
│  Station App        │◄───────►│  (REST API +     │
│  (FastAPI)          │ HTTP    │   WebSocket)     │
│                     │ WS      │                  │
└──────┬──────────────┘         └────────┬─────────┘
       │                                 │
       ├─ NFC Reader (PN532)            │
       ├─ Buttons (GPIO)                │
       └─ Relays (GPIO)                 │
                                         │
                                         ▼
                                ┌─────────────────┐
                                │  React Frontend │
                                │  (Web Browser)  │
                                └─────────────────┘
```

## Hardware Requirements

### For Raspberry Pi Deployment

- **Raspberry Pi** (3B+ or newer recommended)
- **PN532 NFC/RFID Reader** (I2C interface)
- **Physical Buttons** (2x momentary switches)
- **Relay Module** (3-channel, active-low recommended)
- **RFID Cards/Bands** for players

### GPIO Pin Configuration (BCM numbering)

| Component | Default Pin | Description |
|-----------|-------------|-------------|
| Stop Button | GPIO 17 | Stop/end session button |
| Hint Button | GPIO 27 | Hint button input |
| Game Active Relay | GPIO 5 | Game active indicator |
| Reset Relay | GPIO 6 | Reset/stop indicator |
| Ready Relay | GPIO 13 | Ready/idle indicator |
| NFC Reader SDA | GPIO 2 (SDA) | I2C data |
| NFC Reader SCL | GPIO 3 (SCL) | I2C clock |

## Installation

### 1. Development Setup (with simulation)

```bash
cd station

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env

# Edit .env and set:
# - SIMULATE_HARDWARE=true
# - BACKEND_URL=http://your-backend-ip:8000
nano .env
```

### 2. Raspberry Pi Setup

```bash
# Update system
sudo apt-get update
sudo apt-get upgrade

# Install system dependencies
sudo apt-get install -y python3-pip python3-venv git i2c-tools

# Enable I2C interface
sudo raspi-config
# Navigate to: Interface Options -> I2C -> Enable

# Clone repository
cd /home/pi
git clone <your-repo-url> arena
cd arena/station

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt

# Install GPIO libraries (uncomment in requirements.txt first)
pip install RPi.GPIO gpiozero adafruit-circuitpython-pn532

# Configure station
cp .env.example .env
nano .env
# Set SIMULATE_HARDWARE=false
# Set BACKEND_URL to your backend server
# Set STATION_ID and STATION_NAME
```

## Configuration

Edit the `.env` file to configure your station:

```env
# Station Identity
STATION_ID=station-1
STATION_NAME="Main Entrance Station"

# Backend Server (update with your Django backend IP)
BACKEND_URL=http://192.168.1.100:8000

# Hardware Pins (BCM numbering)
STOP_BUTTON_PIN=17
HINT_BUTTON_PIN=27
GAME_ACTIVE_RELAY_PIN=5
RESET_RELAY_PIN=6
READY_RELAY_PIN=13

# Features
NFC_ENABLED=true

# Server
STATION_PORT=8001
STATION_HOST=0.0.0.0

# Mode
DEBUG=false
SIMULATE_HARDWARE=false  # Set to true for testing without hardware
```

## Running the Station

### Development Mode (with hot reload)

```bash
# Activate virtual environment
source venv/bin/activate  # Linux/Mac
# or
venv\Scripts\activate  # Windows

# Run with auto-reload
python main.py

# Or use uvicorn directly
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

### Production Mode (Raspberry Pi)

```bash
# Run directly
python main.py

# Or use uvicorn for more control
uvicorn main:app --host 0.0.0.0 --port 8001 --log-level info
```

### Running as a System Service

Create a systemd service file:

```bash
sudo nano /etc/systemd/system/arena-station.service
```

Add the following content:

```ini
[Unit]
Description=Arena Station Service
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/arena/station
Environment="PATH=/home/pi/arena/station/venv/bin"
ExecStart=/home/pi/arena/station/venv/bin/python main.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start the service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable arena-station
sudo systemctl start arena-station

# Check status
sudo systemctl status arena-station

# View logs
sudo journalctl -u arena-station -f
```

## API Endpoints

The station exposes the following REST API endpoints:

### Status and Health

- `GET /` - Get station status
- `GET /health` - Health check

### Simulation Endpoints (only in simulation mode)

- `POST /simulate/rfid` - Simulate RFID card scan
  ```json
  {
    "rfid_tag": "AABBCCDD"
  }
  ```

- `POST /simulate/button/stop` - Simulate stop button press

- `POST /simulate/button/hint` - Simulate hint button press

- `POST /session/end` - Manually end current session

### WebSocket

- `WS /ws` - WebSocket connection for real-time updates

## WebSocket Events

### Events Sent by Station

| Event Type | Description | Data |
|------------|-------------|------|
| `connection` | Initial connection | `{station_id, station_name, current_session}` |
| `session_started` | Session started | `{session: {...}}` |
| `session_ended` | Session ended | `{result: {...}}` |
| `button_press` | Button pressed | `{button: "start"/"hint", hint: "..."}` |

### Events Received by Station

| Event Type | Description | Data |
|------------|-------------|------|
| `ping` | Heartbeat | `{}` |
| `get_status` | Request status | `{}` |

## Testing

### 1. Test Station Status

```bash
curl http://localhost:8001/
```

Expected response:
```json
{
  "station_id": "station-1",
  "station_name": "Station 1",
  "station_ip": "192.168.1.50",
  "backend_url": "http://192.168.1.100:8000",
  "has_active_session": false,
  "current_session": null,
  "hardware_mode": "simulated"
}
```

### 2. Test RFID Simulation

```bash
curl -X POST http://localhost:8001/simulate/rfid \
  -H "Content-Type: application/json" \
  -d '{"rfid_tag": "AABBCCDD"}'
```

### 3. Test Button Simulation

```bash
# Test stop button
curl -X POST http://localhost:8001/simulate/button/stop

# Test hint button
curl -X POST http://localhost:8001/simulate/button/hint
```

### 4. Test WebSocket Connection

Create a simple HTML file to test WebSocket:

```html
<!DOCTYPE html>
<html>
<body>
  <h1>Station WebSocket Test</h1>
  <div id="messages"></div>
  <script>
    const ws = new WebSocket('ws://localhost:8001/ws');
    const messages = document.getElementById('messages');
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      messages.innerHTML += `<p>${JSON.stringify(data, null, 2)}</p>`;
    };
    
    ws.onopen = () => {
      messages.innerHTML += '<p>Connected!</p>';
      // Send ping
      ws.send(JSON.stringify({type: 'ping'}));
    };
  </script>
</body>
</html>
```

## Hardware Testing Scripts

Test individual hardware components:

### Test NFC Reader

```bash
cd ../backend/scripts
python nfc.py
# Scan a card to see the output
```

### Test Buttons

```bash
cd ../backend/scripts
python buttons.py
# Press buttons to see events
```

### Test Relays

```bash
cd ../backend/scripts
python relays.py
# Watch relays pulse in sequence
```

## Troubleshooting

### NFC Reader Not Working

1. **Check I2C is enabled**:
   ```bash
   sudo raspi-config
   # Interface Options -> I2C -> Enable
   ```

2. **Detect I2C devices**:
   ```bash
   sudo i2cdetect -y 1
   # Should show device at address 0x24
   ```

3. **Check permissions**:
   ```bash
   sudo usermod -a -G i2c pi
   # Logout and login again
   ```

### GPIO Permissions

```bash
sudo usermod -a -G gpio pi
# Logout and login again
```

### Check Station Logs

```bash
# If running as service
sudo journalctl -u arena-station -f

# If running directly
# The application logs to stdout
```

### Backend Connection Issues

1. **Check backend is running**:
   ```bash
   curl http://192.168.1.100:8000/api/auth/public/storylines/
   ```

2. **Check firewall**:
   ```bash
   # On backend server
   sudo ufw allow 8000
   ```

3. **Update BACKEND_URL** in `.env` to correct IP

## Integration with Web Application

The station communicates with the Django backend and React frontend:

### Session Flow

1. **RFID Scan** → Station detects card
2. **Start Session** → Station calls backend API `/api/auth/rfid/start/`
3. **Session Started** → Backend confirms, station broadcasts WebSocket event
4. **Game Play** → Player interacts with game
5. **Checkpoints** → Station can call `/api/auth/rfid/checkpoint/`
6. **Hint Button** → Station broadcasts hint request via WebSocket
7. **Staff Scan** → Station detects staff card, ends session
8. **End Session** → Station calls `/api/auth/rfid/stop/`
9. **Results** → Backend returns points, station broadcasts results

### Django Backend Updates

The Django backend now includes:
- **WebSocket support** via Django Channels
- **Station consumer** at `ws://backend/ws/station/{station_id}/`
- **Leaderboard consumer** at `ws://backend/ws/leaderboard/`

Update requirements and run migrations:

```bash
cd ../backend
pip install -r requirements.txt
python manage.py migrate

# Run with Daphne (ASGI server)
daphne -b 0.0.0.0 -p 8000 arena.asgi:application
```

## File Structure

```
station/
├── main.py              # Main FastAPI application
├── config.py            # Configuration management
├── hardware.py          # Hardware abstraction layer
├── api_client.py        # Django backend API client
├── requirements.txt     # Python dependencies
├── .env                 # Configuration (create from .env.example)
├── .env.example         # Example configuration
└── README.md           # This file
```

## Security Considerations

1. **Network Isolation**: Place stations on a dedicated network
2. **Firewall Rules**: Only allow necessary ports (8001, 8000)
3. **API Authentication**: Consider adding authentication for station API
4. **HTTPS**: Use HTTPS in production (update BACKEND_URL)
5. **Physical Access**: Secure physical access to stations

## Performance Tips

1. **Use Redis** for Django Channels in production (see settings.py)
2. **Limit WebSocket clients** to prevent memory issues
3. **Monitor GPIO** for proper cleanup
4. **Regular updates** for security patches

## Next Steps

1. **Deploy Backend**: Update Django backend with WebSocket support
2. **Update Frontend**: Connect React app to station WebSocket
3. **Test End-to-End**: Test complete RFID → session → game flow
4. **Add Checkpoints**: Implement checkpoint scanning at game stations
5. **Monitor**: Set up logging and monitoring for production

## Support

For issues or questions:
1. Check logs: `sudo journalctl -u arena-station -f`
2. Test hardware with individual scripts in `backend/scripts/`
3. Verify backend connectivity
4. Check GPIO wiring and I2C connections

## License

See the main project LICENSE file.
