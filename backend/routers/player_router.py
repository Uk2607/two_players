"""
Two Players - Player Router
REST endpoints for player actions and page unload beacon.
"""

from flask import Blueprint, request, jsonify


def create_player_router(socketio, player_service, invite_service, room_service):
    """Factory that creates the player blueprint with injected services."""
    player_bp = Blueprint('player', __name__, url_prefix='/api')

    @player_bp.route('/leave', methods=['POST'])
    def handle_leave_beacon():
        """
        Called via navigator.sendBeacon when a player closes their tab.
        Immediately unregisters the player so they are no longer online.
        """
        data = request.get_json(silent=True)
        if not data and request.data:
            import json
            try:
                data = json.loads(request.data.decode('utf-8'))
            except Exception:
                data = {}

        sid = data.get('sid') if isinstance(data, dict) else None
        if sid:
            from events.connection_events import teardown_player_connection
            teardown_player_connection(sid, socketio, player_service, invite_service, room_service)

        return jsonify({'status': 'ok'})

    return player_bp
