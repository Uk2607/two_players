"""
Two Players - Tic Tac Toe Service
Business logic and state management for the 3×3 multiplayer Tic Tac Toe game.
"""

from typing import Optional
from models.room import Room


class TicTacToeService:
    """Manages Tic Tac Toe state, turn validation, win conditions, and score tracking."""

    WINNING_COMBINATIONS = [
        (0, 1, 2), (3, 4, 5), (6, 7, 8),  # Rows
        (0, 3, 6), (1, 4, 7), (2, 5, 8),  # Columns
        (0, 4, 8), (2, 4, 6),              # Diagonals
    ]

    def init_game(self, room: Room) -> dict:
        """Initialize or reset the Tic Tac Toe session for a paired room."""
        # Check if scores already exist from earlier rounds
        existing_scores = (
            room.state.get('tic_tac_toe', {}).get('scores', {'x': 0, 'o': 0, 'ties': 0})
        )

        state = {
            'board': [None] * 9,
            'player_x_sid': room.player1_sid,
            'player_x_name': room.player1_name,
            'player_o_sid': room.player2_sid,
            'player_o_name': room.player2_name,
            'turn_sid': room.player1_sid,
            'turn_symbol': 'X',
            'status': 'in_progress',  # 'in_progress', 'won', 'draw'
            'winner_sid': None,
            'winner_name': None,
            'winner_symbol': None,
            'winning_line': None,
            'scores': existing_scores,
        }

        room.state['tic_tac_toe'] = state
        return state

    def get_state(self, room: Room) -> Optional[dict]:
        """Get the current Tic Tac Toe state for a room."""
        return room.state.get('tic_tac_toe')

    def make_move(self, room: Room, sid: str, index: int) -> tuple[bool, str, Optional[dict]]:
        """
        Execute a move on the board.
        Returns (success: bool, error_message: str, updated_state: dict).
        """
        state = room.state.get('tic_tac_toe')
        if not state:
            return False, 'Game has not been initialized', None

        if state['status'] != 'in_progress':
            return False, 'Game is already finished. Click Play Again to restart.', state

        if not (0 <= index <= 8):
            return False, 'Invalid cell index', state

        if state['board'][index] is not None:
            return False, 'Cell is already occupied', state

        if sid != state['turn_sid']:
            return False, 'It is not your turn', state

        # Determine player symbol
        symbol = 'X' if sid == state['player_x_sid'] else 'O'
        player_name = state['player_x_name'] if symbol == 'X' else state['player_o_name']

        # Place the move
        state['board'][index] = symbol

        # Check for win
        winner_line = self._check_winner(state['board'], symbol)
        if winner_line:
            state['status'] = 'won'
            state['winner_sid'] = sid
            state['winner_name'] = player_name
            state['winner_symbol'] = symbol
            state['winning_line'] = list(winner_line)
            score_key = 'x' if symbol == 'X' else 'o'
            state['scores'][score_key] += 1
            return True, '', state

        # Check for draw
        if all(cell is not None for cell in state['board']):
            state['status'] = 'draw'
            state['winner_sid'] = None
            state['winner_name'] = None
            state['winner_symbol'] = None
            state['winning_line'] = None
            state['scores']['ties'] += 1
            return True, '', state

        # Toggle turn
        if sid == state['player_x_sid']:
            state['turn_sid'] = state['player_o_sid']
            state['turn_symbol'] = 'O'
        else:
            state['turn_sid'] = state['player_x_sid']
            state['turn_symbol'] = 'X'

        return True, '', state

    def restart_game(self, room: Room, sid: str) -> tuple[bool, str, Optional[dict]]:
        """
        Reset the board for a new round while preserving scores.
        """
        state = room.state.get('tic_tac_toe')
        if not state:
            state = self.init_game(room)
            return True, '', state

        # Alternate starting player for fairness, or default to Player X
        next_starter_sid = (
            state['player_o_sid'] if state.get('starter_sid') == state['player_x_sid'] else state['player_x_sid']
        )
        next_symbol = 'X' if next_starter_sid == state['player_x_sid'] else 'O'

        state['board'] = [None] * 9
        state['starter_sid'] = next_starter_sid
        state['turn_sid'] = next_starter_sid
        state['turn_symbol'] = next_symbol
        state['status'] = 'in_progress'
        state['winner_sid'] = None
        state['winner_name'] = None
        state['winner_symbol'] = None
        state['winning_line'] = None

        return True, '', state

    def _check_winner(self, board: list, symbol: str) -> Optional[tuple[int, int, int]]:
        for line in self.WINNING_COMBINATIONS:
            if board[line[0]] == symbol and board[line[1]] == symbol and board[line[2]] == symbol:
                return line
        return None
