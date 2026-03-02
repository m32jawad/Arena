# Quick Start Guide

## Start Everything

### 1. Backend (Django with WebSocket support)

```bash
cd backend

# Install dependencies (first time only)
pip install -r requirements.txt

# Run with ASGI server for WebSocket support
daphne -b 0.0.0.0 -p 8000 arena.asgi:application

# Backend will be available at:
# - REST API: http://localhost:8000/api/auth/
# - WebSocket: ws://localhost:8000/ws/station/
# - Admin: http://localhost:8000/admin/
```

### 2. Station (Raspberry Pi / Simulation)

```bash
cd station

# Install dependencies (first time only)
pip install -r requirements.txt

# Make sure .env is configured
# For testing, SIMULATE_HARDWARE=true is already set

# Run station
python main.py

# Station will be available at:
# - REST API: http://localhost:8001/
# - WebSocket: ws://localhost:8001/ws
# - Test Client: Open test_client.html in browser
```

### 3. Frontend (React)

```bash
cd frontend

# Install dependencies (first time only)
npm install

# Run development server
npm start

# Frontend will be available at:
# - http://localhost:3000/
```

## Quick Test

### Test 1: Check Everything is Running

```bash
# Backend health
curl http://localhost:8000/api/auth/public/storylines/

# Station health
curl http://localhost:8001/health

# Frontend
Open http://localhost:3000/
```

### Test 2: Simulate RFID Scan

First, create a test session in Django admin:
1. Go to http://localhost:8000/admin/
2. Add PendingSignup with:
   - Party name: "Test Team"
   - RFID tag: "ABC123"
   - Status: "approved"
   - Session minutes: 60

Then simulate scan:
```bash
curl -X POST http://localhost:8001/simulate/rfid \
  -H "Content-Type: application/json" \
  -d '{"rfid_tag": "ABC123"}'
```

### Test 3: WebSocket Connection

Open `station/test_client.html` in your browser:
1. Click "Connect"
2. Enter RFID tag: "ABC123"
3. Click "Simulate RFID Scan"
4. Watch messages panel for events

## Common Commands

### Backend

```bash
# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Run with Daphne (WebSocket support)
daphne -b 0.0.0.0 -p 8000 arena.asgi:application

# Run standard Django server (no WebSocket)
python manage.py runserver 0.0.0.0:8000
```

### Station

```bash
# Run in debug mode (auto-reload)
uvicorn main:app --host 0.0.0.0 --port 8001 --reload

# Check station status
curl http://localhost:8001/

# Simulate RFID
curl -X POST http://localhost:8001/simulate/rfid \
  -H "Content-Type: application/json" \
  -d '{"rfid_tag": "ABC123"}'

# Simulate stop button
curl -X POST http://localhost:8001/simulate/button/stop

# Simulate hint button
curl -X POST http://localhost:8001/simulate/button/hint

# End current session
curl -X POST http://localhost:8001/session/end
```

## Configuration

### Station Configuration (.env)

```env
# Station Identity
STATION_ID=station-1
STATION_NAME="Station 1"

# Backend (update with your Django server IP)
BACKEND_URL=http://localhost:8000

# Simulation mode (true for testing without hardware)
SIMULATE_HARDWARE=true
```

### Multiple Stations

To run multiple stations, create separate directories:

```bash
# Station 1
cd station1
cp ../station/.env .env
# Edit .env: STATION_ID=station-1, STATION_PORT=8001
python ../station/main.py

# Station 2
cd station2
cp ../station/.env .env
# Edit .env: STATION_ID=station-2, STATION_PORT=8002
python ../station/main.py
```

## Troubleshooting

### Backend: "Channel layer is not configured"

You need to run with Daphne, not the standard Django runserver:
```bash
daphne -b 0.0.0.0 -p 8000 arena.asgi:application
```

### Station: "Connection refused"

Make sure backend is running and BACKEND_URL in .env is correct:
```bash
# Check backend is running
curl http://localhost:8000/api/auth/public/storylines/

# Update .env
BACKEND_URL=http://localhost:8000
```

### WebSocket: Connection failed

1. Make sure using `ws://` not `wss://` in development
2. Check CORS settings in Django
3. Verify Daphne is running (not runserver)

### RFID: "No approved session found"

Create a PendingSignup in Django admin:
1. Go to http://localhost:8000/admin/
2. Add PendingSignup
3. Set status to "approved"
4. Set RFID tag and session minutes

## Production Deployment

### Backend

```bash
# Install Redis for production channel layers
sudo apt-get install redis-server

# Update settings.py to use Redis:
# CHANNEL_LAYERS = {
#     'default': {
#         'BACKEND': 'channels_redis.core.RedisChannelLayer',
#         'CONFIG': {
#             "hosts": [('127.0.0.1', 6379)],
#         },
#     },
# }

# Run Daphne
daphne -b 0.0.0.0 -p 8000 arena.asgi:application
```

### Station (Raspberry Pi)

```bash
# Install on Raspberry Pi
cd /home/pi
git clone <repo> arena
cd arena/station

# Install dependencies including GPIO
pip install -r requirements.txt
pip install RPi.GPIO gpiozero adafruit-circuitpython-pn532

# Configure
cp .env.example .env
nano .env
# Set SIMULATE_HARDWARE=false
# Set BACKEND_URL to your backend server

# Create systemd service
sudo nano /etc/systemd/system/arena-station.service
# (See station/README.md for service file)

# Enable and start
sudo systemctl enable arena-station
sudo systemctl start arena-station

# Check logs
sudo journalctl -u arena-station -f
```

## URLs Reference

### Backend
- REST API: `http://localhost:8000/api/auth/`
- Admin: `http://localhost:8000/admin/`
- Station WebSocket: `ws://localhost:8000/ws/station/{station_id}/`
- Leaderboard WebSocket: `ws://localhost:8000/ws/leaderboard/`

### Station
- Status: `http://localhost:8001/`
- Health: `http://localhost:8001/health`
- WebSocket: `ws://localhost:8001/ws`
- Docs: `http://localhost:8001/docs` (FastAPI auto-generated)

### Frontend
- App: `http://localhost:3000/`
- Station Page: `http://localhost:3000/station?station=station-1`
- Leaderboard: `http://localhost:3000/leaderboard`

## Next Steps

1. ✅ Backend with WebSocket running
2. ✅ Station app running in simulation mode
3. ✅ Test WebSocket with test_client.html
4. 🔲 Update frontend to connect to WebSocket
5. 🔲 Deploy station to Raspberry Pi
6. 🔲 Test with real hardware

## Support

- Station docs: `station/README.md`
- Integration guide: `STATION_INTEGRATION.md`
- Hardware scripts: `backend/scripts/`
