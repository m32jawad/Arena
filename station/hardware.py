"""Hardware abstraction layer for GPIO, NFC, and other peripherals."""
import asyncio
import logging
from typing import Callable, Optional
from abc import ABC, abstractmethod

logger = logging.getLogger(__name__)


# ============================================================================
# Abstract Base Classes
# ============================================================================

class NFCReader(ABC):
    """Abstract NFC/RFID reader interface."""
    
    @abstractmethod
    async def start(self, on_card_detected: Callable[[str], None]):
        """Start reading cards and call callback when detected."""
        pass
    
    @abstractmethod
    async def stop(self):
        """Stop reading cards."""
        pass


class Button(ABC):
    """Abstract button interface."""
    
    @abstractmethod
    def setup(self, on_press: Callable[[], None]):
        """Setup button with callback for press events."""
        pass
    
    @abstractmethod
    def cleanup(self):
        """Cleanup button resources."""
        pass


class Relay(ABC):
    """Abstract relay interface."""
    
    @abstractmethod
    def turn_on(self):
        """Turn relay on."""
        pass
    
    @abstractmethod
    def turn_off(self):
        """Turn relay off."""
        pass
    
    @abstractmethod
    def pulse(self, duration: float = 2.0):
        """Pulse relay for specified duration."""
        pass
    
    @abstractmethod
    def cleanup(self):
        """Cleanup relay resources."""
        pass


# ============================================================================
# Simulated Hardware (for development/testing)
# ============================================================================

class SimulatedNFCReader(NFCReader):
    """Simulated NFC reader for testing."""
    
    def __init__(self):
        self.running = False
        self.task = None
        self.on_card_detected = None
    
    async def start(self, on_card_detected: Callable[[str], None]):
        """Start simulated reader."""
        self.on_card_detected = on_card_detected
        self.running = True
        logger.info("✅ Simulated NFC reader started")
    
    async def stop(self):
        """Stop simulated reader."""
        self.running = False
        if self.task:
            self.task.cancel()
        logger.info("🛑 Simulated NFC reader stopped")
    
    def simulate_card_scan(self, rfid_tag: str):
        """Manually trigger a card scan (for testing)."""
        if self.on_card_detected:
            logger.info(f"🎫 Simulated card scan: {rfid_tag}")
            self.on_card_detected(rfid_tag)


class SimulatedButton(Button):
    """Simulated button for testing."""
    
    def __init__(self, name: str):
        self.name = name
        self.on_press = None
    
    def setup(self, on_press: Callable[[], None]):
        """Setup button callback."""
        self.on_press = on_press
        logger.info(f"✅ Simulated button '{self.name}' setup")
    
    def cleanup(self):
        """Cleanup button."""
        logger.info(f"🛑 Simulated button '{self.name}' cleanup")
    
    def simulate_press(self):
        """Manually trigger button press (for testing)."""
        if self.on_press:
            logger.info(f"🔘 Simulated button press: {self.name}")
            self.on_press()


class SimulatedRelay(Relay):
    """Simulated relay for testing."""
    
    def __init__(self, name: str):
        self.name = name
        self.state = False
    
    def turn_on(self):
        """Turn relay on."""
        self.state = True
        logger.info(f"💡 Simulated relay '{self.name}' ON")
    
    def turn_off(self):
        """Turn relay off."""
        self.state = False
        logger.info(f"💡 Simulated relay '{self.name}' OFF")
    
    def pulse(self, duration: float = 2.0):
        """Pulse relay."""
        logger.info(f"⚡ Simulated relay '{self.name}' PULSE ({duration}s)")
        self.turn_on()
        # In real implementation, would schedule turn_off after duration
    
    def cleanup(self):
        """Cleanup relay."""
        self.turn_off()
        logger.info(f"🛑 Simulated relay '{self.name}' cleanup")


# ============================================================================
# Real Hardware (Raspberry Pi)
# ============================================================================

class RaspberryPiNFCReader(NFCReader):
    """Real NFC reader using PN532."""
    
    def __init__(self):
        try:
            import board
            import busio
            from adafruit_pn532.i2c import PN532_I2C
            
            # Create I2C bus
            i2c = busio.I2C(board.SCL, board.SDA)
            
            # Create PN532 object
            self.pn532 = PN532_I2C(i2c, debug=False)
            
            # Configure PN532
            self.pn532.SAM_configuration()
            
            self.running = False
            self.task = None
            self.on_card_detected = None
            logger.info("✅ PN532 NFC reader initialized")
        except Exception as e:
            logger.error(f"❌ Failed to initialize NFC reader: {e}")
            raise
    
    async def start(self, on_card_detected: Callable[[str], None]):
        """Start reading cards."""
        self.on_card_detected = on_card_detected
        self.running = True
        self.task = asyncio.create_task(self._read_loop())
        logger.info("📡 NFC reader started, waiting for cards...")
    
    async def stop(self):
        """Stop reading cards."""
        self.running = False
        if self.task:
            self.task.cancel()
        logger.info("🛑 NFC reader stopped")
    
    async def _read_loop(self):
        """Continuously read for NFC cards."""
        last_uid = None
        while self.running:
            try:
                uid = self.pn532.read_passive_target(timeout=0.5)
                
                if uid is not None:
                    uid_str = uid.hex().upper()
                    
                    # Avoid duplicate reads
                    if uid_str != last_uid:
                        logger.info(f"🎫 Card detected: {uid_str}")
                        if self.on_card_detected:
                            self.on_card_detected(uid_str)
                        last_uid = uid_str
                else:
                    # Reset last_uid when no card is present
                    last_uid = None
                
                await asyncio.sleep(0.1)
            except Exception as e:
                logger.error(f"❌ NFC read error: {e}")
                await asyncio.sleep(1)


class RaspberryPiButton(Button):
    """Real button using RPi.GPIO."""
    
    def __init__(self, pin: int, name: str, pull_up: bool = True):
        try:
            import RPi.GPIO as GPIO
            
            self.GPIO = GPIO
            self.pin = pin
            self.name = name
            self.pull_up = pull_up
            
            # Setup GPIO mode if not already set
            try:
                self.GPIO.setmode(self.GPIO.BCM)
            except:
                pass  # Already set
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize button '{name}': {e}")
            raise
    
    def setup(self, on_press: Callable[[], None]):
        """Setup button with callback."""
        pull = self.GPIO.PUD_UP if self.pull_up else self.GPIO.PUD_DOWN
        self.GPIO.setup(self.pin, self.GPIO.IN, pull_up_down=pull)
        
        # Add event detection
        edge = self.GPIO.FALLING if self.pull_up else self.GPIO.RISING
        self.GPIO.add_event_detect(
            self.pin,
            edge,
            callback=lambda channel: on_press(),
            bouncetime=300
        )
        
        logger.info(f"✅ Button '{self.name}' setup on GPIO{self.pin}")
    
    def cleanup(self):
        """Cleanup button resources."""
        try:
            self.GPIO.remove_event_detect(self.pin)
            self.GPIO.cleanup(self.pin)
        except:
            pass


class RaspberryPiRelay(Relay):
    """Real relay using gpiozero."""
    
    def __init__(self, pin: int, name: str, active_high: bool = False):
        try:
            from gpiozero import OutputDevice
            
            self.relay = OutputDevice(
                pin,
                active_high=active_high,
                initial_value=False
            )
            self.name = name
            logger.info(f"✅ Relay '{name}' initialized on GPIO{pin}")
        except Exception as e:
            logger.error(f"❌ Failed to initialize relay '{name}': {e}")
            raise
    
    def turn_on(self):
        """Turn relay on."""
        self.relay.on()
        logger.info(f"💡 Relay '{self.name}' ON")
    
    def turn_off(self):
        """Turn relay off."""
        self.relay.off()
        logger.info(f"💡 Relay '{self.name}' OFF")
    
    def pulse(self, duration: float = 2.0):
        """Pulse relay for specified duration."""
        logger.info(f"⚡ Relay '{self.name}' PULSE ({duration}s)")
        self.relay.blink(on_time=duration, n=1, background=False)
    
    def cleanup(self):
        """Cleanup relay resources."""
        self.turn_off()
        self.relay.close()


# ============================================================================
# Hardware Manager
# ============================================================================

class HardwareManager:
    """Manages all hardware components for the station."""
    
    def __init__(self, simulate: bool = False):
        self.simulate = simulate
        self.nfc_reader: Optional[NFCReader] = None
        self.stop_button: Optional[Button] = None
        self.hint_button: Optional[Button] = None
        self.game_active_relay: Optional[Relay] = None
        self.reset_relay: Optional[Relay] = None
        self.ready_relay: Optional[Relay] = None
        
        logger.info(f"Hardware Manager initialized (simulate={simulate})")
    
    def init_nfc_reader(self) -> NFCReader:
        """Initialize NFC reader."""
        if self.simulate:
            self.nfc_reader = SimulatedNFCReader()
        else:
            self.nfc_reader = RaspberryPiNFCReader()
        return self.nfc_reader
    
    def init_buttons(self, stop_pin: int, hint_pin: int):
        """Initialize buttons."""
        if self.simulate:
            self.stop_button = SimulatedButton("STOP")
            self.hint_button = SimulatedButton("HINT")
        else:
            self.stop_button = RaspberryPiButton(stop_pin, "STOP")
            self.hint_button = RaspberryPiButton(hint_pin, "HINT")
        
        return self.stop_button, self.hint_button
    
    def init_relays(self, game_pin: int, reset_pin: int, ready_pin: int):
        """Initialize relays."""
        if self.simulate:
            self.game_active_relay = SimulatedRelay("GAME_ACTIVE")
            self.reset_relay = SimulatedRelay("RESET")
            self.ready_relay = SimulatedRelay("READY")
        else:
            # Note: Most relay modules are active-low
            self.game_active_relay = RaspberryPiRelay(game_pin, "GAME_ACTIVE", active_high=False)
            self.reset_relay = RaspberryPiRelay(reset_pin, "RESET", active_high=False)
            self.ready_relay = RaspberryPiRelay(ready_pin, "READY", active_high=False)
        
        return self.game_active_relay, self.reset_relay, self.ready_relay
    
    def cleanup(self):
        """Cleanup all hardware resources."""
        logger.info("🧹 Cleaning up hardware resources...")
        
        if self.nfc_reader:
            asyncio.create_task(self.nfc_reader.stop())
        
        for component in [
            self.stop_button,
            self.hint_button,
            self.game_active_relay,
            self.reset_relay,
            self.ready_relay
        ]:
            if component:
                try:
                    component.cleanup()
                except Exception as e:
                    logger.error(f"Error cleaning up component: {e}")
        
        logger.info("✅ Hardware cleanup complete")
