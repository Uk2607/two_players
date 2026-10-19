"""
Two Players - Health Router
REST endpoints for server health/status checks.
"""

from flask import Blueprint, jsonify


def create_health_router(player_service, room_service):
    """Factory that creates the health blueprint with injected services."""
    health_bp = Blueprint('health', __name__)

    @health_bp.route('/health')
    def health():
        return jsonify({
            'status': 'ok',
            'players_online': player_service.player_count(),
            'active_rooms': room_service.room_count(),
        })

    return health_bp
