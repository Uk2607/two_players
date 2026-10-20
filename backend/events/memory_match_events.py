"""
Two Players - Memory Match Events
Socket.IO event handlers for multiplayer Memory Match gameplay.
"""


def register_memory_match_events(socketio, room_service, memory_service):
    """Register Memory Match event handlers."""

    def emit_memory_update(room, state):
        p1_payload = {
            'room_id': room.room_id,
            'state': memory_service.serialize_for_player(state, room.player1_sid),
        }
        p2_payload = {
            'room_id': room.room_id,
            'state': memory_service.serialize_for_player(state, room.player2_sid),
        }
        socketio.emit('memory_update', p1_payload, to=room.player1_sid)
        socketio.emit('memory_update', p2_payload, to=room.player2_sid)

    @socketio.on('memory_flip')
    def handle_memory_flip(data):
        from flask import request
        from flask_socketio import emit

        room_id = data.get('room_id')
        index = data.get('index')

        room = room_service._room_repo.get(room_id)
        if not room or not room.contains_player(request.sid):
            emit('error', {'message': 'Room not found or unauthorized'})
            return

        try:
            card_idx = int(index)
        except (ValueError, TypeError):
            emit('error', {'message': 'Invalid card index'})
            return

        success, err_msg, state = memory_service.flip_card(room, request.sid, card_idx)
        if not success:
            emit('error', {'message': err_msg})
            return

        emit_memory_update(room, state)

    @socketio.on('memory_end_mismatch')
    def handle_memory_end_mismatch(data):
        from flask import request
        from flask_socketio import emit

        room_id = data.get('room_id')

        room = room_service._room_repo.get(room_id)
        if not room or not room.contains_player(request.sid):
            emit('error', {'message': 'Room not found or unauthorized'})
            return

        success, err_msg, state = memory_service.end_mismatch_turn(room, request.sid)
        if not success:
            emit('error', {'message': err_msg})
            return

        emit_memory_update(room, state)

    @socketio.on('memory_restart')
    def handle_memory_restart(data):
        from flask import request
        from flask_socketio import emit

        room_id = data.get('room_id')

        room = room_service._room_repo.get(room_id)
        if not room or not room.contains_player(request.sid):
            emit('error', {'message': 'Room not found or unauthorized'})
            return

        success, err_msg, state = memory_service.restart_game(room, request.sid)
        if not success:
            emit('error', {'message': err_msg})
            return

        emit_memory_update(room, state)
