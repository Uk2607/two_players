"""
Two Players - Tic Tac Toe Events
Socket.IO event handlers for multiplayer Tic Tac Toe gameplay.
"""


def register_tic_tac_toe_events(socketio, room_service, ttt_service):
    """Register Tic Tac Toe game action handlers."""

    @socketio.on('ttt_move')
    def handle_ttt_move(data):
        from flask import request
        from flask_socketio import emit

        room_id = data.get('room_id')
        index = data.get('index')

        room = room_service._room_repo.get(room_id)
        if not room or not room.contains_player(request.sid):
            emit('error', {'message': 'Room not found or unauthorized'})
            return

        success, err_msg, state = ttt_service.make_move(room, request.sid, index)
        if not success:
            emit('error', {'message': err_msg})
            return

        payload = {'room_id': room_id, 'state': state}
        socketio.emit('ttt_update', payload, to=room.player1_sid)
        socketio.emit('ttt_update', payload, to=room.player2_sid)

    @socketio.on('ttt_restart')
    def handle_ttt_restart(data):
        from flask import request
        from flask_socketio import emit

        room_id = data.get('room_id')

        room = room_service._room_repo.get(room_id)
        if not room or not room.contains_player(request.sid):
            emit('error', {'message': 'Room not found or unauthorized'})
            return

        success, err_msg, state = ttt_service.restart_game(room, request.sid)
        if not success:
            emit('error', {'message': err_msg})
            return

        payload = {'room_id': room_id, 'state': state}
        socketio.emit('ttt_update', payload, to=room.player1_sid)
        socketio.emit('ttt_update', payload, to=room.player2_sid)
