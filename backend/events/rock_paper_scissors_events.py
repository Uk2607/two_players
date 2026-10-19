"""
Two Players - Rock Paper Scissors Events
Socket.IO event handlers for multiplayer Rock Paper Scissors gameplay.
"""


def register_rock_paper_scissors_events(socketio, room_service, rps_service):
    """Register Rock Paper Scissors event handlers."""

    def emit_rps_update(room, raw_state):
        p1_payload = {
            'room_id': room.room_id,
            'state': rps_service.serialize_for_player(raw_state, room.player1_sid),
        }
        p2_payload = {
            'room_id': room.room_id,
            'state': rps_service.serialize_for_player(raw_state, room.player2_sid),
        }
        socketio.emit('rps_update', p1_payload, to=room.player1_sid)
        socketio.emit('rps_update', p2_payload, to=room.player2_sid)

    @socketio.on('rps_choice')
    def handle_rps_choice(data):
        from flask import request
        from flask_socketio import emit

        room_id = data.get('room_id')
        choice = data.get('choice')

        room = room_service._room_repo.get(room_id)
        if not room or not room.contains_player(request.sid):
            emit('error', {'message': 'Room not found or unauthorized'})
            return

        success, err_msg, state = rps_service.make_choice(room, request.sid, choice)
        if not success:
            emit('error', {'message': err_msg})
            return

        emit_rps_update(room, state)

    @socketio.on('rps_next_round')
    def handle_rps_next_round(data):
        from flask import request
        from flask_socketio import emit

        room_id = data.get('room_id')

        room = room_service._room_repo.get(room_id)
        if not room or not room.contains_player(request.sid):
            emit('error', {'message': 'Room not found or unauthorized'})
            return

        success, err_msg, state = rps_service.next_round(room, request.sid)
        if not success:
            emit('error', {'message': err_msg})
            return

        emit_rps_update(room, state)

    @socketio.on('rps_restart')
    def handle_rps_restart(data):
        from flask import request
        from flask_socketio import emit

        room_id = data.get('room_id')

        room = room_service._room_repo.get(room_id)
        if not room or not room.contains_player(request.sid):
            emit('error', {'message': 'Room not found or unauthorized'})
            return

        success, err_msg, state = rps_service.restart_game(room, request.sid)
        if not success:
            emit('error', {'message': err_msg})
            return

        emit_rps_update(room, state)
