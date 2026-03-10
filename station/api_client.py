"""API client for communicating with the Django backend."""
import httpx
import logging
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)


class BackendAPIClient:
    """Client for communicating with the Arena backend API."""
    
    def __init__(self, base_url: str, station_id: str):
        self.base_url = base_url.rstrip('/')
        self.station_id = station_id
        self.client = httpx.AsyncClient(timeout=10.0)
        logger.info(f"API Client initialized: {base_url}")
    
    async def close(self):
        """Close the HTTP client."""
        await self.client.aclose()
    
    async def _post(self, endpoint: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Make a POST request to the backend."""
        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        try:
            logger.debug(f"POST {url} - {data}")
            response = await self.client.post(url, json=data)
            result = response.json()
            logger.debug(f"Response ({response.status_code}): {result}")
            if response.status_code >= 400:
                # Return the error response so callers can see error messages
                return {'error': result.get('error', f'HTTP {response.status_code}'), '_status': response.status_code}
            return result
        except Exception as e:
            logger.error(f"Request failed: {e}")
            return None
    
    async def _get(self, endpoint: str, params: Optional[Dict[str, Any]] = None) -> Optional[Dict[str, Any]]:
        """Make a GET request to the backend."""
        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        try:
            logger.debug(f"GET {url} - {params}")
            response = await self.client.get(url, params=params)
            response.raise_for_status()
            result = response.json()
            logger.debug(f"Response: {result}")
            return result
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error {e.response.status_code}: {e.response.text}")
            return None
        except Exception as e:
            logger.error(f"Request failed: {e}")
            return None
    
    # ========================================================================
    # RFID Session Endpoints
    # ========================================================================
    
    async def start_session(self, rfid_tag: str, controller_ip: str = '') -> Optional[Dict[str, Any]]:
        """Start a game session for the given RFID tag.
        
        Args:
            rfid_tag: The RFID tag to start a session for.
            controller_ip: IP of the controller station (for multi-station tracking).
        
        Returns session data including:
        - session_id
        - party_name
        - session_minutes
        - remaining_seconds
        - station_remaining_seconds
        - per_station_seconds
        - total_controllers
        - current_controller_index
        - storyline_title
        - storyline_hint
        - is_start_controller
        - is_end_controller
        
        Or error dict with 'error' key if failed.
        """
        data = {'rfid': rfid_tag}
        if controller_ip:
            data['controller_ip'] = controller_ip
        result = await self._post('rfid/start/', data)
        if result and not result.get('error'):
            logger.info(f"✅ Session started for {rfid_tag}: {result.get('party_name')}")
        elif result and result.get('error'):
            logger.warning(f"❌ Start session error for {rfid_tag}: {result.get('error')}")
        else:
            logger.warning(f"❌ Failed to start session for {rfid_tag} (no response)")
        return result
    
    async def stop_session(self, rfid_tag: str, controller_ip: str = '') -> Optional[Dict[str, Any]]:
        """Stop/pause the game session at the current controller station.
        
        Args:
            rfid_tag: The RFID tag to stop/pause.
            controller_ip: IP of the controller station (for checkpoint recording).
        
        Returns result data including:
        - session_id
        - party_name
        - session_ended (bool)
        - station_points
        - total_points
        - station_elapsed_seconds
        - station_remaining_seconds
        """
        data = {'rfid': rfid_tag}
        if controller_ip:
            data['controller_ip'] = controller_ip
        result = await self._post('rfid/stop/', data)
        if result:
            logger.info(f"✅ Session stopped for {rfid_tag}: {result.get('total_points')} points")
        else:
            logger.warning(f"❌ Failed to stop session for {rfid_tag}")
        return result
    
    async def checkpoint(self, rfid_tag: str, controller_ip: str) -> Optional[Dict[str, Any]]:
        """Record a checkpoint completion.
        
        Returns checkpoint data including:
        - checkpoint_id
        - points_earned
        - total_points
        """
        result = await self._post('rfid/checkpoint/', {
            'rfid': rfid_tag,
            'controller_ip': controller_ip
        })
        if result:
            logger.info(f"✅ Checkpoint recorded for {rfid_tag}: +{result.get('points_earned')} points")
        else:
            logger.warning(f"❌ Failed to record checkpoint for {rfid_tag}")
        return result
    
    async def get_rfid_status(self, rfid_tag: str) -> Optional[Dict[str, Any]]:
        """Get the current status of a session by RFID tag.
        
        Returns session status including:
        - session_id
        - party_name
        - is_playing
        - elapsed_seconds
        - remaining_seconds
        - points
        """
        result = await self._get('rfid/status/', {'rfid': rfid_tag})
        return result
    
    async def check_staff(self, rfid_tag: str) -> Optional[Dict[str, Any]]:
        """Check if an RFID tag belongs to a staff member.
        
        Returns staff info if valid, None otherwise.
        """
        result = await self._post('rfid/check-staff/', {'rfid': rfid_tag})
        # Only return a truthy result if it's actually a staff member
        if result and result.get('is_staff'):
            return result
        return None
    
    async def get_station_recent_scans(self, station_ip: str, limit: int = 10) -> Optional[list]:
        """Get recent RFID scans for a station.
        
        Returns list of recent scans with party info.
        """
        result = await self._get('rfid/station-recent/', {
            'station_ip': station_ip,
            'limit': limit
        })
        return result if result else []
    
    # ========================================================================
    # Public Endpoints
    # ========================================================================
    
    async def get_storylines(self) -> Optional[list]:
        """Get all available storylines."""
        result = await self._get('public/storylines/')
        return result if result else []
    
    async def get_leaderboard(self) -> Optional[list]:
        """Get public leaderboard."""
        result = await self._get('public/leaderboard/')
        return result if result else []
    
    # ========================================================================
    # Health Reporting
    # ========================================================================
    
    async def update_controller_metrics(self, ip_address: str, metrics: Dict[str, str]) -> Optional[Dict[str, Any]]:
        """Report station health metrics to the backend.
        
        The backend matches the controller by IP address and updates
        the metrics fields (cpu_usage, ram_usage, storage_usage, etc.)
        """
        data = {
            'ip_address': ip_address,
            **metrics
        }
        result = await self._post('controllers/health/', data)
        return result
