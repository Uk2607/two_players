"""
Two Players - Player Events
Handles player registration via Socket.IO.
"""


def register_player_events(socketio, player_service):
    """Register player-related event handlers."""

    @socketio.on('register')
    def handle_register(data):
        from flask import request
        from flask_socketio import emit

        sid = request.sid
        name = data.get('name', '')

        success, result = player_service.register(sid, name)

        if not success:
            emit('error', {'message': result})
            return

        print(f"[*] {result} registered: {sid}")
        emit('registered', {'name': result, 'id': sid})
        socketio.emit('player_list', player_service.get_all_serialized())
