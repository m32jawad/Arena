import board
import busio
from adafruit_pn532.i2c import PN532_I2C
import time

# Create I2C bus
i2c = busio.I2C(board.SCL, board.SDA)

# Create PN532 object
pn532 = PN532_I2C(i2c, debug=False)

# Configure PN532 to communicate with cards
pn532.SAM_configuration()

print("âœ… PN532 ready")
print("ðŸ“¡ Waiting for NFC card...")

while True:
    uid = pn532.read_passive_target(timeout=0.5)

    if uid is not None:
        print("ðŸŽ« Card detected!")
        print("UID:", uid.hex().upper())
        time.sleep(1)  # prevent multiple reads