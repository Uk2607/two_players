"""
Two Players - Connection Events
Handles Socket.IO connect/disconnect lifecycle.
"""


def register_connection_events(socketio, player_service, invite_service, room_service):
    """Register connect/disconnect event handlers."""

    @socketio.on('connect')
    def handle_connect():
        from flask import request
        print(f"[+] Client connected: {request.sid}")

    @socketio.on('disconnect')
    def handle_disconnect():
        from flask import request

        sid = request.sid
        player = player_service.get(sid)
        name = player.name if player else 'Player'
        partner_sid = player.partner_sid if player else None

        # Check rooms if partner_sid was not found directly on player
        rooms = room_service._room_repo.find_by_player(sid)
        if rooms and not partner_sid:
            room = rooms[0]
            partner_sid = room.player2_sid if room.player1_sid == sid else room.player1_sid

        # Notify partner if paired and reset their status to available
        if partner_sid:
            partner = player_service.get(partner_sid)
            if partner:
                partner.reset()
            socketio.emit('partner_disconnected', {'name': name}, to=partner_sid)

        # Cleanup invites, rooms, and unregister disconnected player
        invite_service.cleanup_for_player(sid)
        room_service.cleanup_for_player(sid)
        if player:
            player_service.unregister(sid)

        print(f"[-] {name} disconnected: {sid}")
        socketio.emit('player_list', player_service.get_all_serialized())
