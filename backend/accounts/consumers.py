"""
WebSocket consumers for real-time station communication.
"""
import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import User

logger = logging.getLogger(__name__)


class StationConsumer(AsyncWebsocketConsumer):
    """WebSocket consumer for station real-time updates."""
    
    async def connect(self):
        """Handle WebSocket connection."""
        self.station_id = self.scope['url_route']['kwargs'].get('station_id', 'default')
        self.station_group_name = f'station_{self.station_id}'
        
        # Join station group
        await self.channel_layer.group_add(
            self.station_group_name,
            self.channel_name
        )
        
        await self.accept()
        logger.info(f"WebSocket connected: {self.station_group_name}")
        
        # Send connection confirmation
        await self.send(text_data=json.dumps({
            'type': 'connection',
            'message': f'Connected to station {self.station_id}',
            'station_id': self.station_id
        }))
    
    async def disconnect(self, close_code):
        """Handle WebSocket disconnection."""
        # Leave station group
        await self.channel_layer.group_discard(
            self.station_group_name,
            self.channel_name
        )
        logger.info(f"WebSocket disconnected: {self.station_group_name}")
    
    async def receive(self, text_data):
        """Receive message from WebSocket."""
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            logger.debug(f"Received message: {message_type}")
            
            # Handle different message types
            if message_type == 'ping':
                await self.send(text_data=json.dumps({
                    'type': 'pong'
                }))
            
            elif message_type == 'session_update':
                # Broadcast session update to all clients in this station group
                await self.channel_layer.group_send(
                    self.station_group_name,
                    {
                        'type': 'session_update',
                        'data': data.get('data', {})
                    }
                )
            
            elif message_type == 'get_status':
                # Request current status
                await self.send(text_data=json.dumps({
                    'type': 'status_response',
                    'station_id': self.station_id
                }))
        
        except json.JSONDecodeError:
            logger.error("Invalid JSON received")
        except Exception as e:
            logger.error(f"Error handling message: {e}")
    
    # Event handlers for messages from channel layer
    
    async def session_update(self, event):
        """Handle session update event."""
        await self.send(text_data=json.dumps({
            'type': 'session_update',
            'data': event['data']
        }))
    
    async def rfid_scan(self, event):
        """Handle RFID scan event."""
        await self.send(text_data=json.dumps({
            'type': 'rfid_scan',
            'rfid_tag': event['rfid_tag'],
            'data': event.get('data', {})
        }))
    
    async def button_press(self, event):
        """Handle button press event."""
        await self.send(text_data=json.dumps({
            'type': 'button_press',
            'button': event['button'],
            'data': event.get('data', {})
        }))
    
    async def session_started(self, event):
        """Handle session started event."""
        await self.send(text_data=json.dumps({
            'type': 'session_started',
            'session': event['session']
        }))
    
    async def session_ended(self, event):
        """Handle session ended event."""
        await self.send(text_data=json.dumps({
            'type': 'session_ended',
            'result': event['result']
        }))
    
    async def checkpoint_reached(self, event):
        """Handle checkpoint reached event."""
        await self.send(text_data=json.dumps({
            'type': 'checkpoint_reached',
            'checkpoint': event['checkpoint']
        }))


class LeaderboardConsumer(AsyncWebsocketConsumer):
    """WebSocket consumer for live leaderboard updates."""
    
    async def connect(self):
        """Handle WebSocket connection."""
        self.group_name = 'leaderboard'
        
        # Join leaderboard group
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )
        
        await self.accept()
        logger.info("Leaderboard WebSocket connected")
    
    async def disconnect(self, close_code):
        """Handle WebSocket disconnection."""
        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name
        )
        logger.info("Leaderboard WebSocket disconnected")
    
    async def receive(self, text_data):
        """Receive message from WebSocket."""
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            if message_type == 'ping':
                await self.send(text_data=json.dumps({
                    'type': 'pong'
                }))
        
        except json.JSONDecodeError:
            logger.error("Invalid JSON received")
    
    async def leaderboard_update(self, event):
        """Handle leaderboard update event."""
        await self.send(text_data=json.dumps({
            'type': 'leaderboard_update',
            'leaderboard': event['leaderboard']
        }))
