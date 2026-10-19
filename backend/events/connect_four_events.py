"""
Two Players - Connect Four Events
Socket.IO event handlers for multiplayer Connect Four gameplay.
"""


def register_connect_four_events(socketio, room_service, c4_service):
    """Register Connect Four event handlers."""

    def emit_c4_update(room, state):
        payload = {
            'room_id': room.room_id,
            'state': state,
        }
        socketio.emit('c4_update', payload, to=room.player1_sid)
        socketio.emit('c4_update', payload, to=room.player2_sid)

    @socketio.on('c4_drop')
    def handle_c4_drop(data):
        from flask import request
        from flask_socketio import emit

        room_id = data.get('room_id')
        col = data.get('col')

        room = room_service._room_repo.get(room_id)
        if not room or not room.contains_player(request.sid):
            emit('error', {'message': 'Room not found or unauthorized'})
            return

        try:
            col_int = int(col)
        except (ValueError, TypeError):
            emit('error', {'message': 'Invalid column index'})
            return

        success, err_msg, state = c4_service.drop_disc(room, request.sid, col_int)
        if not success:
            emit('error', {'message': err_msg})
            return

        emit_c4_update(room, state)

    @socketio.on('c4_restart')
    def handle_c4_restart(data):
        from flask import request
        from flask_socketio import emit

        room_id = data.get('room_id')

        room = room_service._room_repo.get(room_id)
        if not room or not room.contains_player(request.sid):
            emit('error', {'message': 'Room not found or unauthorized'})
            return

        success, err_msg, state = c4_service.restart_game(room, request.sid)
        if not success:
            emit('error', {'message': err_msg})
            return

        emit_c4_update(room, state)
