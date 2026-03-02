"""
WebSocket routing configuration.
"""
from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/station/(?P<station_id>\w+)/$', consumers.StationConsumer.as_asgi()),
    re_path(r'ws/station/$', consumers.StationConsumer.as_asgi()),
    re_path(r'ws/leaderboard/$', consumers.LeaderboardConsumer.as_asgi()),
]
