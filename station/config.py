"""Configuration management for the station application."""
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional


class Settings(BaseSettings):
    """Station configuration settings."""
    
    # Station identification
    station_id: str = "station-1"
    station_name: str = "Station 1"
    
    # Backend API
    backend_url: str = "http://192.168.50.10:8000"
    api_base_url: Optional[str] = None
    
    # Hardware GPIO pins (BCM numbering)
    stop_button_pin: int = 17
    hint_button_pin: int = 27
    game_active_relay_pin: int = 5
    reset_relay_pin: int = 6
    ready_relay_pin: int = 13
    
    # NFC/RFID
    nfc_enabled: bool = True
    
    # Station server
    station_port: int = 8001
    station_host: str = "0.0.0.0"
    station_ip: Optional[str] = None  # Explicit IP (e.g. Ethernet IP); auto-detected if not set
    
    # WebSocket
    ws_reconnect_delay: int = 5
    ws_heartbeat_interval: int = 30
    
    # Debug
    debug: bool = False
    simulate_hardware: bool = False
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Set api_base_url if not provided
        if not self.api_base_url:
            self.api_base_url = f"{self.backend_url}/api/auth"


# Global settings instance
settings = Settings()
