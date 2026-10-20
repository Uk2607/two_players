"""
Two Players - Game Events
Handles game selection and pair management via Socket.IO.
"""


"""
Two Players - Game Events
Handles game selection and pair management via Socket.IO.
"""

import uuid
from datetime import datetime, timezone

GAME_TITLES = {
    'tic-tac-toe': 'Tic Tac Toe',
    'rock-paper-scissors': 'Rock Paper Scissors',
    'connect-four': 'Connect Four',
    'memory-match': 'Memory Match',
    'word-duel': 'Word Duel',
    'battleship': 'Battleship',
}


def register_game_events(socketio, player_service, room_service, game_services: dict):
    """Register game-related event handlers."""

    def broadcast_players():
        socketio.emit('player_list', player_service.get_all_serialized())

    @socketio.on('select_game')
    def handle_select_game(data):
        from flask import request
        from flask_socketio import emit

        room_id = data.get('room_id')
        game_id = data.get('game_id')

        success, selector_name, room = room_service.select_game(
            room_id, game_id, request.sid
        )

        if not success:
            emit('error', {'message': selector_name})  # selector_name is error msg on failure
            return

        initial_state = {}
        srv = game_services.get(game_id)
        if srv and hasattr(srv, 'init_game'):
            initial_state = srv.init_game(room)

        p1_state = srv.serialize_for_player(initial_state, room.player1_sid) if (srv and hasattr(srv, 'serialize_for_player')) else initial_state
        p2_state = srv.serialize_for_player(initial_state, room.player2_sid) if (srv and hasattr(srv, 'serialize_for_player')) else initial_state

        socketio.emit('game_selected', {
            'game_id': game_id,
            'room_id': room_id,
            'selected_by': selector_name,
            'state': p1_state,
        }, to=room.player1_sid)

        socketio.emit('game_selected', {
            'game_id': game_id,
            'room_id': room_id,
            'selected_by': selector_name,
            'state': p2_state,
        }, to=room.player2_sid)

        # Broadcast room activity to in-room chat
        game_title = GAME_TITLES.get(game_id, game_id)
        act_payload = {
            'id': str(uuid.uuid4())[:8],
            'room_id': room_id,
            'sender_id': 'system',
            'sender_name': 'Room',
            'text': f"🎮 {selector_name} selected {game_title}",
            'type': 'activity',
            'timestamp': datetime.now(timezone.utc).isoformat(),
        }
        socketio.emit('chat_message', act_payload, to=room.player1_sid)
        socketio.emit('chat_message', act_payload, to=room.player2_sid)

    @socketio.on('switch_game')
    def handle_switch_game(data=None):
        from flask import request
        from flask_socketio import emit

        sid = request.sid
        room = room_service.get_room_for_player(sid)
        if not room:
            emit('error', {'message': 'Not in an active match'})
            return

        player = player_service.get(sid)
        name = player.name if player else 'Partner'

        # Reset active game selection
        room.game = None

        payload = {
            'room_id': room.room_id,
            'requested_by': name,
        }
        socketio.emit('game_switched', payload, to=room.player1_sid)
        socketio.emit('game_switched', payload, to=room.player2_sid)

        # Broadcast room activity to in-room chat
        act_payload = {
            'id': str(uuid.uuid4())[:8],
            'room_id': room.room_id,
            'sender_id': 'system',
            'sender_name': 'Room',
            'text': f"🔄 {name} returned to Game Selection",
            'type': 'activity',
            'timestamp': datetime.now(timezone.utc).isoformat(),
        }
        socketio.emit('chat_message', act_payload, to=room.player1_sid)
        socketio.emit('chat_message', act_payload, to=room.player2_sid)

    @socketio.on('leave_pair')
    def handle_leave_pair(data=None):
        from flask import request
        from flask_socketio import emit

        sid = request.sid
        player = player_service.get(sid)
        player_name = player.name if player else 'Your partner'

        partner_sid = room_service.leave_pair(sid)

        if partner_sid:
            socketio.emit('partner_left', {'name': player_name}, to=partner_sid)

        emit('left_pair', {})
        broadcast_players()
