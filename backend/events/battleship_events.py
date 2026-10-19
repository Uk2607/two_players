"""
Two Players - Battleship Events
Socket.IO event handlers for multiplayer Battleship gameplay.
"""


def register_battleship_events(socketio, room_service, battleship_service):
    """Register Battleship event handlers."""

    def emit_battleship_update(room, raw_state):
        p1_payload = {
            'room_id': room.room_id,
            'state': battleship_service.serialize_for_player(raw_state, room.player1_sid),
        }
        p2_payload = {
            'room_id': room.room_id,
            'state': battleship_service.serialize_for_player(raw_state, room.player2_sid),
        }
        socketio.emit('battleship_update', p1_payload, to=room.player1_sid)
        socketio.emit('battleship_update', p2_payload, to=room.player2_sid)

    @socketio.on('battleship_deploy')
    def handle_battleship_deploy(data):
        from flask import request
        from flask_socketio import emit

        room_id = data.get('room_id')
        ships = data.get('ships')

        room = room_service._room_repo.get(room_id)
        if not room or not room.contains_player(request.sid):
            emit('error', {'message': 'Room not found or unauthorized'})
            return

        success, err_msg, state = battleship_service.deploy_fleet(room, request.sid, ships)
        if not success:
            emit('error', {'message': err_msg})
            return

        emit_battleship_update(room, state)

    @socketio.on('battleship_fire')
    def handle_battleship_fire(data):
        from flask import request
        from flask_socketio import emit

        room_id = data.get('room_id')
        row = data.get('row')
        col = data.get('col')

        room = room_service._room_repo.get(room_id)
        if not room or not room.contains_player(request.sid):
            emit('error', {'message': 'Room not found or unauthorized'})
            return

        try:
            r = int(row)
            c = int(col)
        except (ValueError, TypeError):
            emit('error', {'message': 'Invalid grid coordinates'})
            return

        success, err_msg, state = battleship_service.fire_torpedo(room, request.sid, r, c)
        if not success:
            emit('error', {'message': err_msg})
            return

        emit_battleship_update(room, state)

    @socketio.on('battleship_restart')
    def handle_battleship_restart(data):
        from flask import request
        from flask_socketio import emit

        room_id = data.get('room_id')

        room = room_service._room_repo.get(room_id)
        if not room or not room.contains_player(request.sid):
            emit('error', {'message': 'Room not found or unauthorized'})
            return

        success, err_msg, state = battleship_service.restart_game(room, request.sid)
        if not success:
            emit('error', {'message': err_msg})
            return

        emit_battleship_update(room, state)
