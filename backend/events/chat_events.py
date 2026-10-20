"""
Two Players - Chat & Room Activity Events
Real-time messaging between paired opponents with message validation and room activity streaming.
"""

import uuid
from datetime import datetime, timezone


def register_chat_events(socketio, player_service, room_service):
    """Register chat-related Socket.IO event handlers."""

    @socketio.on('send_chat_message')
    def handle_send_chat_message(data):
        from flask import request
        from flask_socketio import emit

        room_id = data.get('room_id')
        message_text = (data.get('message') or '').strip()

        if not message_text:
            return

        # Cap message length for safety
        if len(message_text) > 500:
            message_text = message_text[:500]

        room = room_service._room_repo.get(room_id)
        if not room or not room.contains_player(request.sid):
            emit('error', {'message': 'Not in a valid game room'})
            return

        sender = player_service.get(request.sid)
        sender_name = sender.name if sender else 'Player'

        payload = {
            'id': str(uuid.uuid4())[:8],
            'room_id': room.room_id,
            'sender_id': request.sid,
            'sender_name': sender_name,
            'text': message_text,
            'type': 'chat',
            'timestamp': datetime.now(timezone.utc).isoformat(),
        }

        socketio.emit('chat_message', payload, to=room.player1_sid)
        socketio.emit('chat_message', payload, to=room.player2_sid)
