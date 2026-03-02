"""
WebSocket utility functions for broadcasting real-time updates.
"""
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
import logging

logger = logging.getLogger(__name__)


def broadcast_to_station(station_id: str, event_type: str, data: dict):
    """
    Broadcast a message to all WebSocket clients connected to a specific station.
    
    Args:
        station_id: Station identifier
        event_type: Type of event (e.g., 'session_started', 'button_press')
        data: Event data to send
    """
    channel_layer = get_channel_layer()
    if not channel_layer:
        logger.warning("Channel layer not configured")
        return
    
    group_name = f'station_{station_id}'
    
    try:
        async_to_sync(channel_layer.group_send)(
            group_name,
            {
                'type': event_type,
                **data
            }
        )
        logger.debug(f"Broadcast {event_type} to {group_name}")
    except Exception as e:
        logger.error(f"Failed to broadcast to {group_name}: {e}")


def broadcast_leaderboard_update(leaderboard_data: list):
    """
    Broadcast leaderboard update to all connected leaderboard clients.
    
    Args:
        leaderboard_data: List of leaderboard entries
    """
    channel_layer = get_channel_layer()
    if not channel_layer:
        logger.warning("Channel layer not configured")
        return
    
    try:
        async_to_sync(channel_layer.group_send)(
            'leaderboard',
            {
                'type': 'leaderboard_update',
                'leaderboard': leaderboard_data
            }
        )
        logger.debug("Broadcast leaderboard update")
    except Exception as e:
        logger.error(f"Failed to broadcast leaderboard: {e}")


def notify_rfid_scan(station_id: str, rfid_tag: str, session_data: dict = None):
    """
    Notify about an RFID scan event.
    
    Args:
        station_id: Station identifier
        rfid_tag: Scanned RFID tag
        session_data: Optional session information
    """
    broadcast_to_station(
        station_id,
        'rfid_scan',
        {
            'rfid_tag': rfid_tag,
            'data': session_data or {}
        }
    )


def notify_button_press(station_id: str, button: str, data: dict = None):
    """
    Notify about a button press event.
    
    Args:
        station_id: Station identifier
        button: Button name ('start' or 'hint')
        data: Optional additional data
    """
    broadcast_to_station(
        station_id,
        'button_press',
        {
            'button': button,
            'data': data or {}
        }
    )


def notify_session_started(station_id: str, session: dict):
    """
    Notify about a session starting.
    
    Args:
        station_id: Station identifier
        session: Session information
    """
    broadcast_to_station(
        station_id,
        'session_started',
        {
            'session': session
        }
    )


def notify_session_ended(station_id: str, result: dict):
    """
    Notify about a session ending.
    
    Args:
        station_id: Station identifier
        result: Session end result (points, time, etc.)
    """
    broadcast_to_station(
        station_id,
        'session_ended',
        {
            'result': result
        }
    )


def notify_checkpoint_reached(station_id: str, checkpoint: dict):
    """
    Notify about a checkpoint being reached.
    
    Args:
        station_id: Station identifier
        checkpoint: Checkpoint information
    """
    broadcast_to_station(
        station_id,
        'checkpoint_reached',
        {
            'checkpoint': checkpoint
        }
    )
