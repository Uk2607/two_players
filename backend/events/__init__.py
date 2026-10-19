"""
Events package — registers all Socket.IO event handlers.
"""

from events.connection_events import register_connection_events
from events.player_events import register_player_events
from events.invite_events import register_invite_events
from events.game_events import register_game_events


def register_all_events(socketio, player_service, invite_service, room_service):
    """Register all Socket.IO event handlers with their service dependencies."""
    register_connection_events(socketio, player_service, invite_service, room_service)
    register_player_events(socketio, player_service)
    register_invite_events(socketio, player_service, invite_service, room_service)
    register_game_events(socketio, player_service, room_service)
