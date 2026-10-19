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
        from flask_socketio import emit

        sid = request.sid
        player = player_service.get(sid)
        if not player:
            return

        name = player.name
        partner_sid = player.partner_sid

        # Notify partner if paired
        if partner_sid:
            partner = player_service.get(partner_sid)
            if partner:
                partner.reset()
                socketio.emit('partner_disconnected', {'name': name}, to=partner_sid)

        # Cleanup invites and rooms
        invite_service.cleanup_for_player(sid)
        room_service.cleanup_for_player(sid)
        player_service.unregister(sid)

        print(f"[-] {name} disconnected: {sid}")
        socketio.emit('player_list', player_service.get_all_serialized())
