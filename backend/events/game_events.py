"""
Two Players - Game Events
Handles game selection and pair management via Socket.IO.
"""


def register_game_events(socketio, player_service, room_service, ttt_service):
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
        if game_id == 'tic-tac-toe':
            initial_state = ttt_service.init_game(room)

        payload = {
            'game_id': game_id,
            'room_id': room_id,
            'selected_by': selector_name,
            'state': initial_state,
        }
        socketio.emit('game_selected', payload, to=room.player1_sid)
        socketio.emit('game_selected', payload, to=room.player2_sid)

    @socketio.on('leave_pair')
    def handle_leave_pair(data):
        from flask import request
        from flask_socketio import emit, leave_room

        sid = request.sid
        player = player_service.get(sid)
        if not player:
            return

        partner_sid = room_service.leave_pair(sid)

        if partner_sid:
            partner = player_service.get(partner_sid)
            if partner:
                socketio.emit('partner_left', {'name': player.name}, to=partner_sid)

        emit('left_pair', {})
        broadcast_players()
