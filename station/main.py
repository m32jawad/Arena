"""
FastAPI Station Application

This application runs on Raspberry Pi stations to handle:
- NFC/RFID card scanning
- Button inputs (stop, hint)
- Relay outputs (game state indicators)
- Communication with the Django backend
- WebSocket connections for real-time updates
- Health metrics reporting to dashboard
"""
import asyncio
import logging
import socket
import time
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
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    force=True,  # Override any prior logging config (e.g. from uvicorn imports)
)
logger = logging.getLogger(__name__)


# ============================================================================
# Station State Enum
# ============================================================================

class StationMode:
    OFFLINE = 'offline'
    READY = 'ready'
    ACTIVE = 'active'
    RESULT = 'result'


# ============================================================================
# Global State
# ============================================================================

class StationState:
    """Global station state."""
    
    def __init__(self):
        self.hardware: Optional[HardwareManager] = None
        self.api_client: Optional[BackendAPIClient] = None
        self.current_session: Optional[Dict[str, Any]] = None
        self.last_result: Optional[Dict[str, Any]] = None  # Keep result data for RESULT screen
        self.mode: str = StationMode.OFFLINE  # Station state machine
        self.websocket_clients: List[WebSocket] = []
        self.station_ip: str = settings.station_ip if settings.station_ip else self._get_local_ip()
        self.boot_time: float = time.time()
        
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
            logger.debug(f"⚠️ No WebSocket clients to broadcast to")
            return
        
        logger.info(f"📢 Broadcasting to {len(self.websocket_clients)} clients: {message.get('type')}")
        
        disconnected = []
        for client in self.websocket_clients:
            try:
                await client.send_json(message)
                logger.debug(f"✅ Sent to client")
            except Exception as e:
                logger.warning(f"❌ Failed to send to client: {e}")
                disconnected.append(client)
        
        # Remove disconnected clients
        for client in disconnected:
            self.websocket_clients.remove(client)
            logger.info(f"🔌 Removed disconnected client (remaining: {len(self.websocket_clients)})")

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
    
    health_task = None
    
    try:
        # Initialize hardware
        state.hardware = HardwareManager(simulate=settings.simulate_hardware)
        
        # Initialize API client
        state.api_client = BackendAPIClient(
            base_url=settings.api_base_url,
            station_id=settings.station_id
        )
        
        # Initialize NFC reader object (SAM_configuration deferred to after all hardware is ready)
        if settings.nfc_enabled:
            state.nfc_reader = state.hardware.init_nfc_reader()
        
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
        state.mode = StationMode.READY
        
        # Start NFC reader AFTER all other hardware is initialized (SAM_configuration
        # is called in start() so relay/button GPIO setup can't disrupt the PN532 state)
        if settings.nfc_enabled and state.nfc_reader:
            await state.nfc_reader.start(on_card_detected=handle_rfid_scan)
        
        # Start health reporter
        health_task = asyncio.create_task(health_reporter_loop())
        
        logger.info("✅ Station initialized and ready")
        
        yield
        
    except Exception as e:
        logger.error(f"❌ Startup failed: {e}")
        raise
    finally:
        # Cancel health reporter
        if health_task:
            health_task.cancel()
            try:
                await health_task
            except asyncio.CancelledError:
                pass
        # Cleanup
        logger.info("🛑 Shutting down station...")
        if state.hardware:
            state.hardware.cleanup()
        if state.api_client:
            await state.api_client.close()
        logger.info("👋 Station shutdown complete")


async def health_reporter_loop():
    """Periodically report station health metrics to the Django backend."""
    await asyncio.sleep(5)  # Wait for initial startup
    while True:
        try:
            await report_health_metrics()
        except Exception as e:
            logger.warning(f"Health report failed: {e}")
        await asyncio.sleep(15)  # Report every 15 seconds


async def report_health_metrics():
    """Collect and send health metrics to the backend."""
    metrics = collect_system_metrics()
    
    if not metrics:
        return
    
    # Send to backend via API
    try:
        result = await state.api_client.update_controller_metrics(
            ip_address=state.station_ip,
            metrics=metrics
        )
        if result:
            logger.debug(f"📊 Health metrics reported: {metrics}")
        else:
            logger.debug(f"📊 Health metrics report - no controller found for IP {state.station_ip}")
    except Exception as e:
        logger.warning(f"Failed to report health: {e}")


def collect_system_metrics() -> Dict[str, str]:
    """Collect system metrics (works on Raspberry Pi and simulated)."""
    metrics = {}
    
    try:
        import psutil
        
        # CPU Usage
        cpu_percent = psutil.cpu_percent(interval=0.5)
        metrics['cpu_usage'] = f"{cpu_percent}%"
        
        # RAM Usage
        ram = psutil.virtual_memory()
        metrics['ram_usage'] = f"{ram.percent}% ({ram.used // (1024*1024)}MB / {ram.total // (1024*1024)}MB)"
        
        # Storage Usage
        disk = psutil.disk_usage('/')
        metrics['storage_usage'] = f"{disk.percent}% ({disk.used // (1024**3)}GB / {disk.total // (1024**3)}GB)"
        
        # System Uptime
        uptime_seconds = int(time.time() - psutil.boot_time())
        days = uptime_seconds // 86400
        hours = (uptime_seconds % 86400) // 3600
        mins = (uptime_seconds % 3600) // 60
        if days > 0:
            metrics['system_uptime'] = f"{days}d {hours}h {mins}m"
        else:
            metrics['system_uptime'] = f"{hours}h {mins}m"
        
    except ImportError:
        # psutil not installed — use basic approach
        import os
        
        # Station uptime (since app start)
        uptime = int(time.time() - state.boot_time)
        hours = uptime // 3600
        mins = (uptime % 3600) // 60
        metrics['system_uptime'] = f"{hours}h {mins}m (app)"
        
        # Try Raspberry Pi specific metrics
        try:
            # CPU temperature (Raspberry Pi)
            with open('/sys/class/thermal/thermal_zone0/temp', 'r') as f:
                temp = int(f.read().strip()) / 1000.0
                metrics['cpu_temperature'] = f"{temp:.1f}°C"
        except:
            pass
        
        try:
            # Voltage status (Raspberry Pi)
            import subprocess
            result = subprocess.run(
                ['vcgencmd', 'get_throttled'],
                capture_output=True, text=True, timeout=2
            )
            throttled = result.stdout.strip()
            if '0x0' in throttled:
                metrics['voltage_power_status'] = 'OK (no throttling)'
            else:
                metrics['voltage_power_status'] = f'Warning: {throttled}'
        except:
            metrics['voltage_power_status'] = 'OK'
    
    # CPU Temperature (try even with psutil)
    if 'cpu_temperature' not in metrics:
        try:
            with open('/sys/class/thermal/thermal_zone0/temp', 'r') as f:
                temp = int(f.read().strip()) / 1000.0
                metrics['cpu_temperature'] = f"{temp:.1f}°C"
        except:
            pass
    
    # Add station mode
    metrics['station_mode'] = state.mode
    
    return metrics


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
# Event Handlers — State Machine
# ============================================================================

def handle_rfid_scan(rfid_tag: str):
    """Handle RFID card scan from NFC reader."""
    logger.info(f"🎫 RFID scanned: {rfid_tag} (station mode: {state.mode})")
    asyncio.create_task(process_rfid_scan(rfid_tag))


async def process_rfid_scan(rfid_tag: str):
    """Process an RFID scan based on current station mode."""
    try:
        # ── RESULT MODE: Only accept staff cards to reset back to READY ──
        if state.mode == StationMode.RESULT:
            staff_result = await state.api_client.check_staff(rfid_tag)
            if staff_result and staff_result.get('is_staff'):
                logger.info(f"👮 Staff card detected: {staff_result.get('username')} — resetting station")
                await reset_to_ready()
            else:
                logger.info(f"❌ Non-staff card scanned on RESULT screen, ignoring")
                await state.broadcast({
                    'type': 'error',
                    'message': 'Scan a STAFF card to reset the station.'
                })
            return
        
        # ── ACTIVE MODE: Only accept staff cards to end session ──
        if state.mode == StationMode.ACTIVE and state.current_session:
            staff_result = await state.api_client.check_staff(rfid_tag)
            if staff_result and staff_result.get('is_staff'):
                logger.info(f"👮 Staff card detected during game: {staff_result.get('username')} — ending session")
                await end_current_session()
            else:
                logger.info(f"⚠️ Non-staff card scanned during active session, ignoring")
                await state.broadcast({
                    'type': 'error',
                    'message': 'A game is already in progress. Use STOP button or scan staff card to end.'
                })
            return
        
        # ── READY MODE: Try to start a new session ──
        if state.mode == StationMode.READY:
            # First check if it's a staff card (staff shouldn't start sessions)
            staff_result = await state.api_client.check_staff(rfid_tag)
            if staff_result and staff_result.get('is_staff'):
                logger.info(f"👮 Staff card scanned on READY screen — no action needed")
                await state.broadcast({
                    'type': 'error',
                    'message': f'Staff card detected ({staff_result.get("username")}). Station is already ready.'
                })
                return
            
            # Try to start/resume a session (pass controller_ip so backend knows which station)
            result = await state.api_client.start_session(rfid_tag, controller_ip=state.station_ip)
            
            if result and not result.get('error'):
                state.current_session = {
                    'session_id': result.get('session_id'),
                    'party_name': result.get('party_name'),
                    'rfid_tag': rfid_tag,
                    'session_minutes': result.get('session_minutes'),
                    'remaining_seconds': result.get('remaining_seconds'),
                    'station_remaining_seconds': result.get('station_remaining_seconds'),
                    'per_station_seconds': result.get('per_station_seconds'),
                    'total_controllers': result.get('total_controllers'),
                    'current_controller_index': result.get('current_controller_index'),
                    'storyline_title': result.get('storyline_title'),
                    'storyline_hint': result.get('storyline_hint'),
                    'is_end_controller': result.get('is_end_controller', False),
                    'is_start_controller': result.get('is_start_controller', False),
                    'controller_name': result.get('controller_name', ''),
                }
                
                # Switch to ACTIVE mode
                state.mode = StationMode.ACTIVE
                state.ready_relay.turn_off()
                state.game_active_relay.turn_on()
                
                # Broadcast to frontend
                await state.broadcast({
                    'type': 'session_started',
                    'session': state.current_session
                })
                
                logger.info(f"✅ Session started: {result.get('party_name')}")
            else:
                error_msg = 'Invalid RFID tag. No approved session found.'
                error_code = None
                error_meta = {}
                if result and result.get('error'):
                    error_code = result.get('error_code')
                    if error_code == 'station_already_completed':
                        controller_name = result.get('controller_name') or settings.station_name
                        error_msg = f'Station "{controller_name}" already completed for this session. Move to a new station and scan again.'
                        error_meta = {
                            'controller_name': controller_name,
                            'controller_ip': result.get('controller_ip', ''),
                        }
                    else:
                        error_msg = result.get('error')
                logger.warning(f"❌ Failed to start session for {rfid_tag}: {error_msg}")
                
                await state.broadcast({
                    'type': 'error',
                    'message': error_msg,
                    'error_code': error_code,
                    **error_meta,
                })
            return
        
        # ── OFFLINE MODE: ignore scans ──
        logger.warning(f"RFID scanned but station is {state.mode}")
    
    except Exception as e:
        logger.error(f"Error processing RFID scan: {e}")
        await state.broadcast({
            'type': 'error',
            'message': f'Station error: {str(e)}'
        })


def handle_stop_button():
    """Handle stop button press."""
    logger.info(f"🛑 Stop button pressed (station mode: {state.mode})")
    
    if state.mode == StationMode.ACTIVE and state.current_session:
        asyncio.create_task(end_current_session())
    else:
        logger.warning(f"Stop pressed but no active session (mode: {state.mode})")


def handle_hint_button():
    """Handle hint button press — toggle hint on/off."""
    logger.info(f"💡 Hint button pressed (station mode: {state.mode})")
    
    if state.mode == StationMode.ACTIVE and state.current_session:
        hint = state.current_session.get('storyline_hint')
        asyncio.create_task(state.broadcast({
            'type': 'button_press',
            'button': 'hint',
            'action': 'toggle',
            'hint': hint
        }))
    else:
        logger.warning(f"Hint pressed but no active session (mode: {state.mode})")


async def end_current_session():
    """End/pause the current session at this station and move to RESULT mode.
    
    In multi-station workflow:
    - Calls stop with controller_ip so backend records the checkpoint
    - If this is the END controller, session is fully ended
    - If not, session is paused — player goes to next station
    """
    if not state.current_session:
        logger.warning("No active session to end")
        return
    
    try:
        rfid_tag = state.current_session.get('rfid_tag')
        result = await state.api_client.stop_session(rfid_tag, controller_ip=state.station_ip)
        
        if result:
            session_ended = result.get('session_ended', True)
            
            # Store result for RESULT screen
            state.last_result = {
                'party_name': result.get('party_name'),
                'total_points': result.get('total_points'),
                'station_points': result.get('station_points'),
                'station_elapsed_seconds': result.get('station_elapsed_seconds'),
                'station_remaining_seconds': result.get('station_remaining_seconds'),
                'per_station_seconds': result.get('per_station_seconds'),
                'total_elapsed_seconds': result.get('total_elapsed_seconds'),
                'remaining_seconds': result.get('remaining_seconds'),
                'current_controller_index': result.get('current_controller_index'),
                'total_controllers': result.get('total_controllers'),
                'controller_name': result.get('controller_name'),
                'session_ended': session_ended,
                'is_end_controller': result.get('is_end_controller', False),
            }
            
            # Switch to RESULT mode
            state.mode = StationMode.RESULT
            state.game_active_relay.turn_off()
            
            # Broadcast result to frontend
            await state.broadcast({
                'type': 'session_ended',
                'result': state.last_result
            })
            
            if session_ended:
                logger.info(f"✅ Session fully ended: {result.get('party_name')} - {result.get('total_points')} points")
            else:
                logger.info(f"✅ Station completed: {result.get('party_name')} - +{result.get('station_points')} pts this station")
            
            # Clear current session
            state.current_session = None
        else:
            logger.warning(f"❌ Failed to end session for {rfid_tag}")
            await state.broadcast({
                'type': 'error',
                'message': 'Failed to end session. Please try again.'
            })
    
    except Exception as e:
        logger.error(f"Error ending session: {e}")


async def reset_to_ready():
    """Reset station back to READY mode (called after staff scan on RESULT screen)."""
    logger.info("🔄 Resetting station to READY")
    
    # Clear all session data
    state.current_session = None
    state.last_result = None
    state.mode = StationMode.READY
    
    # Set hardware relays
    state.game_active_relay.turn_off()
    state.ready_relay.turn_on()
    
    # Broadcast to frontend
    await state.broadcast({
        'type': 'station_reset',
        'mode': StationMode.READY,
        'message': 'Station reset to READY by staff.'
    })
    
    logger.info("✅ Station is READY for next player")


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
    station_mode: str


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
        hardware_mode="simulated" if settings.simulate_hardware else "real",
        station_mode=state.mode
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
    connection_msg = {
        'type': 'connection',
        'station_id': settings.station_id,
        'station_name': settings.station_name,
        'hardware_mode': 'simulated' if settings.simulate_hardware else 'real',
        'station_mode': state.mode,
        'has_active_session': state.current_session is not None,
        'current_session': state.current_session,
        'last_result': state.last_result,
    }
    logger.info(f"📤 Sending connection message (mode={state.mode})")
    await websocket.send_json(connection_msg)
    
    try:
        # Keep connection alive and handle incoming messages
        while True:
            data = await websocket.receive_json()
            
            # Handle commands from web clients
            if data.get('type') == 'ping':
                await websocket.send_json({'type': 'pong'})
            
            elif data.get('type') == 'get_status':
                status_msg = {
                    'type': 'status',
                    'station_id': settings.station_id,
                    'station_name': settings.station_name,
                    'hardware_mode': 'simulated' if settings.simulate_hardware else 'real',
                    'station_mode': state.mode,
                    'has_active_session': state.current_session is not None,
                    'current_session': state.current_session
                }
                await websocket.send_json(status_msg)
    
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

    # IMPORTANT: log_config=None prevents uvicorn from calling logging.config.dictConfig()
    # which would reset the root logger to WARNING and silence all application INFO logs
    # (hardware init, NFC card reads, button presses, etc.)
    uvicorn.run(
        "main:app",
        host=settings.station_host,
        port=settings.station_port,
        reload=settings.debug,
        log_level="debug" if settings.debug else "info",
        log_config=None,
    )
