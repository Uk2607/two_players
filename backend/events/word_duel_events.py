"""
Two Players - Word Duel Events
Socket.IO event handlers for multiplayer Word Duel gameplay.
"""


def register_word_duel_events(socketio, room_service, word_service):
    """Register Word Duel event handlers."""

    def emit_word_update(room, raw_state):
        p1_payload = {
            'room_id': room.room_id,
            'state': word_service.serialize_for_player(raw_state, room.player1_sid),
        }
        p2_payload = {
            'room_id': room.room_id,
            'state': word_service.serialize_for_player(raw_state, room.player2_sid),
        }
        socketio.emit('word_update', p1_payload, to=room.player1_sid)
        socketio.emit('word_update', p2_payload, to=room.player2_sid)

    @socketio.on('word_guess_letter')
    def handle_word_guess_letter(data):
        from flask import request
        from flask_socketio import emit

        room_id = data.get('room_id')
        letter = data.get('letter')

        room = room_service._room_repo.get(room_id)
        if not room or not room.contains_player(request.sid):
            emit('error', {'message': 'Room not found or unauthorized'})
            return

        success, err_msg, state = word_service.guess_letter(room, request.sid, letter)
        if not success:
            emit('error', {'message': err_msg})
            return

        emit_word_update(room, state)

    @socketio.on('word_guess_full')
    def handle_word_guess_full(data):
        from flask import request
        from flask_socketio import emit

        room_id = data.get('room_id')
        word = data.get('word')

        room = room_service._room_repo.get(room_id)
        if not room or not room.contains_player(request.sid):
            emit('error', {'message': 'Room not found or unauthorized'})
            return

        success, err_msg, state = word_service.guess_full_word(room, request.sid, word)
        if not success:
            emit('error', {'message': err_msg})
            return

        emit_word_update(room, state)

    @socketio.on('word_next_round')
    def handle_word_next_round(data):
        from flask import request
        from flask_socketio import emit

        room_id = data.get('room_id')

        room = room_service._room_repo.get(room_id)
        if not room or not room.contains_player(request.sid):
            emit('error', {'message': 'Room not found or unauthorized'})
            return

        success, err_msg, state = word_service.next_round(room, request.sid)
        if not success:
            emit('error', {'message': err_msg})
            return

        emit_word_update(room, state)

    @socketio.on('word_restart')
    def handle_word_restart(data):
        from flask import request
        from flask_socketio import emit

        room_id = data.get('room_id')

        room = room_service._room_repo.get(room_id)
        if not room or not room.contains_player(request.sid):
            emit('error', {'message': 'Room not found or unauthorized'})
            return

        success, err_msg, state = word_service.restart_game(room, request.sid)
        if not success:
            emit('error', {'message': err_msg})
            return

        emit_word_update(room, state)
