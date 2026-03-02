"""
FastAPI Station Application

This application runs on Raspberry Pi stations to handle:
- NFC/RFID card scanning
- Button inputs (start, hint)
- Relay outputs (game state indicators)
- Communication with the Django backend
- WebSocket connections for real-time updates
"""
import asyncio
import logging
import socket
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any, List

from config import settings
from hardware import HardwareManager, SimulatedNFCReader, SimulatedButton
from api_client import BackendAPIClient

# Setup logging
logging.basicConfig(
    level=logging.DEBUG if settings.debug else logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============================================================================
# Global State
# ============================================================================

class StationState:
    """Global station state."""
    
    def __init__(self):
        self.hardware: Optional[HardwareManager] = None
        self.api_client: Optional[BackendAPIClient] = None
        self.current_session: Optional[Dict[str, Any]] = None
        self.websocket_clients: List[WebSocket] = []
        self.station_ip: str = self._get_local_ip()
        
        # Hardware components
        self.nfc_reader = None
        self.stop_button = None
        self.hint_button = None
        self.game_active_relay = None
        self.reset_relay = None
        self.ready_relay = None
    
    def _get_local_ip(self) -> str:
        """Get the local IP address of this station."""
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            ip = s.getsockname()[0]
            s.close()
            return ip
        except:
            return "127.0.0.1"
    
    async def broadcast(self, message: Dict[str, Any]):
        """Broadcast a message to all connected WebSocket clients."""
        if not self.websocket_clients:
            return
        
        disconnected = []
        for client in self.websocket_clients:
            try:
                await client.send_json(message)
            except:
                disconnected.append(client)
        
        # Remove disconnected clients
        for client in disconnected:
            self.websocket_clients.remove(client)

state = StationState()


# ============================================================================
# Lifespan Management
# ============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    logger.info("=" * 60)
    logger.info(f"🚀 Starting Station: {settings.station_name}")
    logger.info(f"   ID: {settings.station_id}")
    logger.info(f"   IP: {state.station_ip}")
    logger.info(f"   Backend: {settings.backend_url}")
    logger.info(f"   Simulate Hardware: {settings.simulate_hardware}")
    logger.info("=" * 60)
    
    # Clean up any existing GPIO state on real hardware
    if not settings.simulate_hardware:
        try:
            import RPi.GPIO as GPIO
            GPIO.setwarnings(False)
            GPIO.cleanup()
            logger.info("🧹 Cleaned up existing GPIO state")
            # Wait a moment for GPIO to settle
            await asyncio.sleep(0.5)
        except Exception as e:
            logger.warning(f"Could not cleanup GPIO (might be first run): {e}")
    
    try:
        # Initialize hardware
        state.hardware = HardwareManager(simulate=settings.simulate_hardware)
        
        # Initialize API client
        state.api_client = BackendAPIClient(
            base_url=settings.api_base_url,
            station_id=settings.station_id
        )
        
        # Initialize NFC reader
        if settings.nfc_enabled:
            state.nfc_reader = state.hardware.init_nfc_reader()
            await state.nfc_reader.start(on_card_detected=handle_rfid_scan)
        
        # Initialize buttons
        state.stop_button, state.hint_button = state.hardware.init_buttons(
            stop_pin=settings.stop_button_pin,
            hint_pin=settings.hint_button_pin
        )
        state.stop_button.setup(on_press=handle_stop_button)
        state.hint_button.setup(on_press=handle_hint_button)
        
        # Initialize relays
        (state.game_active_relay, 
         state.reset_relay, 
         state.ready_relay) = state.hardware.init_relays(
            game_pin=settings.game_active_relay_pin,
            reset_pin=settings.reset_relay_pin,
            ready_pin=settings.ready_relay_pin
        )
        
        # Set initial state to READY
        state.ready_relay.turn_on()
        
        logger.info("✅ Station initialized and ready")
        
        yield
        
    except Exception as e:
        logger.error(f"❌ Startup failed: {e}")
        raise
    finally:
        # Cleanup
        logger.info("🛑 Shutting down station...")
        if state.hardware:
            state.hardware.cleanup()
        if state.api_client:
            await state.api_client.close()
        logger.info("👋 Station shutdown complete")


# ============================================================================
# FastAPI App
# ============================================================================

app = FastAPI(
    title="Arena Station API",
    description="Hardware control and game session management for Arena stations",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================================
# Event Handlers
# ============================================================================

def handle_rfid_scan(rfid_tag: str):
    """Handle RFID card scan."""
    logger.info(f"🎫 RFID scanned: {rfid_tag}")
    
    # Process scan in background
    asyncio.create_task(process_rfid_scan(rfid_tag))


async def process_rfid_scan(rfid_tag: str):
    """Process an RFID scan."""
    try:
        # Check if it's a staff card (for ending sessions)
        if state.current_session:
            staff_result = await state.api_client.check_staff(rfid_tag)
            if staff_result:
                logger.info(f"👮 Staff card detected: {staff_result.get('username')}")
                await end_current_session()
                return
        
        # Try to start a new session
        result = await state.api_client.start_session(rfid_tag)
        
        if result:
            state.current_session = {
                'session_id': result.get('session_id'),
                'party_name': result.get('party_name'),
                'rfid_tag': rfid_tag,
                'session_minutes': result.get('session_minutes'),
                'remaining_seconds': result.get('remaining_seconds'),
                'storyline_title': result.get('storyline_title'),
                'storyline_hint': result.get('storyline_hint'),
            }
            
            # Update hardware state
            state.ready_relay.turn_off()
            state.game_active_relay.turn_on()
            
            # Broadcast to connected clients
            await state.broadcast({
                'type': 'session_started',
                'session': state.current_session
            })
            
            logger.info(f"✅ Session started: {result.get('party_name')}")
        else:
            logger.warning(f"❌ Failed to start session for {rfid_tag}")
            
            # Broadcast error
            await state.broadcast({
                'type': 'error',
                'message': 'Failed to start session. Check if the RFID tag is approved.'
            })
    
    except Exception as e:
        logger.error(f"Error processing RFID scan: {e}")


def handle_stop_button():
    """Handle stop button press."""
    logger.info("🛑 Stop button pressed")
    
    # End the current session if one is active
    if state.current_session:
        asyncio.create_task(end_current_session())
    else:
        logger.warning("No active session to stop")
        asyncio.create_task(state.broadcast({
            'type': 'button_press',
            'button': 'stop',
            'message': 'No active session'
        }))


def handle_hint_button():
    """Handle hint button press."""
    logger.info("💡 Hint button pressed")
    
    # Broadcast hint request
    asyncio.create_task(state.broadcast({
        'type': 'button_press',
        'button': 'hint',
        'hint': state.current_session.get('storyline_hint') if state.current_session else None
    }))


async def end_current_session():
    """End the current active session."""
    if not state.current_session:
        logger.warning("No active session to end")
        return
    
    try:
        rfid_tag = state.current_session.get('rfid_tag')
        result = await state.api_client.stop_session(rfid_tag)
        
        if result:
            # Update hardware state
            state.game_active_relay.turn_off()
            state.ready_relay.turn_on()
            
            # Broadcast result
            await state.broadcast({
                'type': 'session_ended',
                'result': {
                    'party_name': result.get('party_name'),
                    'total_points': result.get('total_points'),
                    'elapsed_seconds': result.get('elapsed_seconds'),
                }
            })
            
            logger.info(f"✅ Session ended: {result.get('party_name')} - {result.get('total_points')} points")
            
            # Clear current session
            state.current_session = None
        else:
            logger.warning(f"❌ Failed to end session for {rfid_tag}")
    
    except Exception as e:
        logger.error(f"Error ending session: {e}")


# ============================================================================
# API Endpoints
# ============================================================================

class StatusResponse(BaseModel):
    station_id: str
    station_name: str
    station_ip: str
    backend_url: str
    has_active_session: bool
    current_session: Optional[Dict[str, Any]]
    hardware_mode: str


@app.get("/", response_model=StatusResponse)
async def get_status():
    """Get station status."""
    return StatusResponse(
        station_id=settings.station_id,
        station_name=settings.station_name,
        station_ip=state.station_ip,
        backend_url=settings.backend_url,
        has_active_session=state.current_session is not None,
        current_session=state.current_session,
        hardware_mode="simulated" if settings.simulate_hardware else "real"
    )


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "station": settings.station_id}


# ============================================================================
# Testing/Simulation Endpoints
# ============================================================================

class SimulateRFIDRequest(BaseModel):
    rfid_tag: str


@app.post("/simulate/rfid")
async def simulate_rfid_scan(request: SimulateRFIDRequest):
    """Simulate an RFID card scan (for testing)."""
    if not settings.simulate_hardware:
        raise HTTPException(status_code=400, detail="Simulation mode not enabled")
    
    if isinstance(state.nfc_reader, SimulatedNFCReader):
        state.nfc_reader.simulate_card_scan(request.rfid_tag)
        return {"message": f"Simulated RFID scan: {request.rfid_tag}"}
    
    raise HTTPException(status_code=500, detail="NFC reader not in simulation mode")


@app.post("/simulate/button/stop")
async def simulate_stop_button():
    """Simulate stop button press (for testing)."""
    if not settings.simulate_hardware:
        raise HTTPException(status_code=400, detail="Simulation mode not enabled")
    
    if isinstance(state.stop_button, SimulatedButton):
        state.stop_button.simulate_press()
        return {"message": "Simulated stop button press"}
    
    raise HTTPException(status_code=500, detail="Button not in simulation mode")


@app.post("/simulate/button/hint")
async def simulate_hint_button():
    """Simulate hint button press (for testing)."""
    if not settings.simulate_hardware:
        raise HTTPException(status_code=400, detail="Simulation mode not enabled")
    
    if isinstance(state.hint_button, SimulatedButton):
        state.hint_button.simulate_press()
        return {"message": "Simulated hint button press"}
    
    raise HTTPException(status_code=500, detail="Button not in simulation mode")


@app.post("/session/end")
async def manual_end_session():
    """Manually end the current session."""
    await end_current_session()
    return {"message": "Session ended"}


# ============================================================================
# WebSocket Endpoint
# ============================================================================

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time updates."""
    await websocket.accept()
    state.websocket_clients.append(websocket)
    
    logger.info(f"🔌 WebSocket client connected (total: {len(state.websocket_clients)})")
    
    # Send current state
    await websocket.send_json({
        'type': 'connection',
        'station_id': settings.station_id,
        'station_name': settings.station_name,
        'current_session': state.current_session
    })
    
    try:
        # Keep connection alive and handle incoming messages
        while True:
            data = await websocket.receive_json()
            
            # Handle commands from web clients
            if data.get('type') == 'ping':
                await websocket.send_json({'type': 'pong'})
            
            elif data.get('type') == 'get_status':
                await websocket.send_json({
                    'type': 'status',
                    'current_session': state.current_session
                })
    
    except WebSocketDisconnect:
        logger.info("🔌 WebSocket client disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        if websocket in state.websocket_clients:
            state.websocket_clients.remove(websocket)


# ============================================================================
# Main Entry Point
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "main:app",
        host=settings.station_host,
        port=settings.station_port,
        reload=settings.debug,
        log_level="debug" if settings.debug else "info"
    )
