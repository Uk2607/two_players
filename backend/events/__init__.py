"""
Events package — registers all Socket.IO event handlers.
"""

from events.connection_events import register_connection_events
from events.player_events import register_player_events
from events.invite_events import register_invite_events
from events.game_events import register_game_events
from events.tic_tac_toe_events import register_tic_tac_toe_events
from events.rock_paper_scissors_events import register_rock_paper_scissors_events
from events.connect_four_events import register_connect_four_events
from events.memory_match_events import register_memory_match_events
from events.word_duel_events import register_word_duel_events
from events.battleship_events import register_battleship_events
from events.chat_events import register_chat_events


def register_all_events(socketio, player_service, invite_service, room_service, game_services: dict):
    """Register all Socket.IO event handlers with their service dependencies."""
    register_connection_events(socketio, player_service, invite_service, room_service)
    register_player_events(socketio, player_service)
    register_invite_events(socketio, player_service, invite_service, room_service)
    register_game_events(socketio, player_service, room_service, game_services)
    register_chat_events(socketio, player_service, room_service)
    
    # Game-specific events
    if 'tic-tac-toe' in game_services:
        register_tic_tac_toe_events(socketio, room_service, game_services['tic-tac-toe'])
    if 'rock-paper-scissors' in game_services:
        register_rock_paper_scissors_events(socketio, room_service, game_services['rock-paper-scissors'])
    if 'connect-four' in game_services:
        register_connect_four_events(socketio, room_service, game_services['connect-four'])
    if 'memory-match' in game_services:
        register_memory_match_events(socketio, room_service, game_services['memory-match'])
    if 'word-duel' in game_services:
        register_word_duel_events(socketio, room_service, game_services['word-duel'])
    if 'battleship' in game_services:
        register_battleship_events(socketio, room_service, game_services['battleship'])
