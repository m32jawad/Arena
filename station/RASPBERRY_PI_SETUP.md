# Raspberry Pi Hardware Setup

## Quick Fix for lgpio Error

If you're seeing the error: `ModuleNotFoundError: No module named 'lgpio'`, run these commands on your Raspberry Pi:

```bash
# Install system-level GPIO libraries (required for Raspberry Pi 5)
sudo apt-get update
sudo apt-get install -y python3-lgpio python3-rpi-lgpio swig

# Activate your virtual environment
cd ~/station
source venv/bin/activate

# Install the Python GPIO libraries (no RPi.GPIO needed on Pi 5)
pip install gpiozero adafruit-circuitpython-pn532 adafruit-blinka
```

## Complete Fresh Installation

For a fresh Raspberry Pi setup:

### 1. System Preparation

```bash
# Update system packages
sudo apt-get update
sudo apt-get upgrade -y

# Install dependencies
sudo apt-get install -y \
    python3-pip \
    python3-venv \
    git \
    i2c-tools \
    python3-lgpio \
    python3-rpi-lgpio \
    swig
```

### 2. Enable I2C for NFC Reader

```bash
# Enable I2C interface
sudo raspi-config
# Navigate to: Interface Options -> I2C -> Enable -> Yes -> OK -> Finish

# Verify I2C is enabled
ls /dev/i2c*
# Should show: /dev/i2c-1

# Test I2C (with NFC reader connected)
sudo i2cdetect -y 1
# Should show device at address 0x24 or 0x48
```

### 3. Install Station Application

```bash
# Navigate to station directory
cd ~/station

# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt

# Install GPIO libraries (gpiozero uses lgpio backend on Pi 5)
pip install gpiozero adafruit-circuitpython-pn532 adafruit-blinka
```

**Note**: On Raspberry Pi 5, we use `gpiozero` (not RPi.GPIO) for buttons since gpiozero properly supports the new lgpio backend.

### 4. Configure Station

```bash
# Copy environment template
cp .env.example .env

# Edit configuration
nano .env
```

Set these values in `.env`:
```env
SIMULATE_HARDWARE=false
BACKEND_URL=http://192.168.50.10:8000
STATION_ID=station-2
STATION_NAME="Station 2"
```

### 5. Test the Station

```bash
# Test run
python main.py

# Or with uvicorn
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

## Troubleshooting

### lgpio Build Failures

If `pip install` fails with lgpio build errors:
- **Problem**: The `swig` compiler is missing
- **Solution**: Install via apt: `sudo apt-get install -y swig python3-lgpio`

### Permission Denied on GPIO

If you get permission errors accessing GPIO:
```bash
# Add user to gpio group
sudo usermod -a -G gpio $USER

# Add user to i2c group
sudo usermod -a -G i2c $USER

# Log out and log back in for changes to take effect
```

### NFC Reader Not Detected

```bash
# Check I2C is enabled
sudo raspi-config
# Interface Options -> I2C -> Enabled

# Check for connected I2C devices
sudo i2cdetect -y 1

# Expected output: device at 0x24 (if SA0 pin is low) or 0x48 (if SA0 is high)
```

### RPi.GPIO Base Address Error

If you see: `RuntimeError: Cannot determine SOC peripheral base address`
- **Problem**: RPi.GPIO library doesn't support Raspberry Pi 5
- **Solution**: The code has been updated to use `gpiozero` for buttons instead
- **What works on Pi 5**:
  - ✅ `gpiozero` (uses lgpio backend) - for buttons and relays
  - ✅ `adafruit-blinka` (uses lgpio backend) - for NFC reader  
  - ❌ `RPi.GPIO` - doesn't support Pi 5 hardware

**Fix**: Make sure you have the latest hardware.py that uses gpiozero for buttons.

## Hardware Wiring

### PN532 NFC Reader (I2C Mode)

| PN532 Pin | Raspberry Pi Pin |
|-----------|------------------|
| VCC | 3.3V (Pin 1) |
| GND | GND (Pin 6) |
| SDA | GPIO 2 / SDA (Pin 3) |
| SCL | GPIO 3 / SCL (Pin 5) |

**Important**: Set PN532 to I2C mode:
- Switch 1: OFF
- Switch 2: ON

### Buttons (Pull-up Configuration)

| Button | GPIO Pin | Connection |
|--------|----------|------------|
| Stop Button | GPIO 17 | One side to GPIO 17, other to GND |
| Hint Button | GPIO 27 | One side to GPIO 27, other to GND |

**Note**: Internal pull-up resistors are enabled in software.

### Relay Module (Active-Low, 3-channel)

| Relay | GPIO Pin | Purpose |
|-------|----------|---------|
| Game Active | GPIO 5 | Indicates game is running |
| Reset | GPIO 6 | Indicates stop/reset state |
| Ready | GPIO 13 | Indicates station is ready |

**Wiring**:
- VCC → 5V (Pin 2)
- GND → GND (Pin 9)
- IN1 → GPIO 5 (Pin 29)
- IN2 → GPIO 6 (Pin 31)
- IN3 → GPIO 13 (Pin 33)

## Running as a Service

Create systemd service file:

```bash
sudo nano /etc/systemd/system/arena-station.service
```

Content:
```ini
[Unit]
Description=Arena Station Service
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/station
Environment="PATH=/home/pi/station/venv/bin"
ExecStart=/home/pi/station/venv/bin/python main.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable arena-station.service
sudo systemctl start arena-station.service

# Check status
sudo systemctl status arena-station.service

# View logs
sudo journalctl -u arena-station.service -f
```
