"""
Two Players - Invite Events
Handles sending, accepting, and declining game invites via Socket.IO.
"""

import uuid
from datetime import datetime, timezone


def register_invite_events(socketio, player_service, invite_service, room_service):
    """Register invite-related event handlers."""

    def broadcast_players():
        socketio.emit('player_list', player_service.get_all_serialized())

    @socketio.on('send_invite')
    def handle_send_invite(data):
        from flask import request
        from flask_socketio import emit

        target_sid = data.get('target_id')
        success, result = invite_service.send_invite(request.sid, target_sid)

        if not success:
            emit('error', {'message': result})
            return

        # result is the target's name
        emit('invite_sent', {'target_name': result})

        sender = player_service.get(request.sid)
        socketio.emit('invite_received', {
            'from_id': request.sid,
            'from_name': sender.name,
        }, to=target_sid)

        broadcast_players()

    @socketio.on('accept_invite')
    def handle_accept_invite(data):
        from flask import request
        from flask_socketio import emit

        from_sid = data.get('from_id')
        print(f"[Invite] accept_invite received from {request.sid} for sender {from_sid}")
        success, message, invite = invite_service.accept_invite(request.sid, from_sid)

        if not success:
            print(f"[Invite] accept_invite failed: {message}")
            emit('error', {'message': message})
            return

        # Create a room and pair the players
        room = room_service.create_room(from_sid, request.sid)
        if not room:
            print("[Invite] failed to create room")
            emit('error', {'message': 'Failed to create room'})
            return

        pair_data = room.to_dict()
        print(f"[Invite] Paired room created: {room.room_id}! Emitting paired to {from_sid} and {request.sid}")
        socketio.emit('paired', pair_data, to=from_sid)
        socketio.emit('paired', pair_data, to=request.sid)

        # Broadcast initial room pairing activity to in-room chat
        act_payload = {
            'id': str(uuid.uuid4())[:8],
            'room_id': room.room_id,
            'sender_id': 'system',
            'sender_name': 'Room',
            'text': f"🤝 {room.player1_name} and {room.player2_name} are paired up!",
            'type': 'activity',
            'timestamp': datetime.now(timezone.utc).isoformat(),
        }
        socketio.emit('chat_message', act_payload, to=from_sid)
        socketio.emit('chat_message', act_payload, to=request.sid)

        broadcast_players()

    @socketio.on('decline_invite')
    def handle_decline_invite(data):
        from flask import request
        from flask_socketio import emit

        from_sid = data.get('from_id')
        success, decliner_name = invite_service.decline_invite(request.sid, from_sid)

        if success:
            socketio.emit('invite_declined', {'name': decliner_name}, to=from_sid)
            broadcast_players()
