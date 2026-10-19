"""
Two Players - Rock Paper Scissors Service
Business logic, blind commit state management, and score tracking for RPS.
"""

from typing import Optional
from models.room import Room


VALID_CHOICES = {'rock', 'paper', 'scissors'}

WINNING_RULES = {
    ('rock', 'scissors'): 'Rock crushes Scissors!',
    ('scissors', 'paper'): 'Scissors cuts Paper!',
    ('paper', 'rock'): 'Paper wraps Rock!',
}


class RockPaperScissorsService:
    """Manages RPS blind commit rounds, score tracking (first to 3 wins), and state serialization."""

    def __init__(self, target_wins: int = 3):
        self.target_wins = target_wins

    def init_game(self, room: Room) -> dict:
        """Initialize or reset the Rock Paper Scissors session for a room."""
        state = {
            'round': 1,
            'target_wins': self.target_wins,
            'player1_sid': room.player1_sid,
            'player1_name': room.player1_name,
            'player2_sid': room.player2_sid,
            'player2_name': room.player2_name,
            'scores': {
                room.player1_sid: 0,
                room.player2_sid: 0,
                'ties': 0,
            },
            'choices': {
                room.player1_sid: None,
                room.player2_sid: None,
            },
            'has_chosen': {
                room.player1_sid: False,
                room.player2_sid: False,
            },
            'round_result': None,
            'status': 'choosing',  # 'choosing', 'round_revealed', 'match_ended'
            'match_winner_sid': None,
            'match_winner_name': None,
        }

        room.state['rock_paper_scissors'] = state
        return state

    def get_state(self, room: Room) -> Optional[dict]:
        """Get the current state for a room."""
        return room.state.get('rock_paper_scissors')

    def make_choice(self, room: Room, sid: str, choice: str) -> tuple[bool, str, Optional[dict]]:
        """
        Record a player's choice. If both players have committed, evaluate the round.
        Returns (success: bool, error_message: str, raw_state: dict).
        """
        state = room.state.get('rock_paper_scissors')
        if not state:
            return False, 'Game has not been initialized', None

        if state['status'] == 'match_ended':
            return False, 'Match has ended. Click Play Again to restart.', state

        if choice not in VALID_CHOICES:
            return False, f'Invalid choice: {choice}', state

        if not room.contains_player(sid):
            return False, 'Player not part of this room', state

        # If a round was previously revealed, picking a new choice automatically advances the round
        if state['status'] == 'round_revealed':
            self._start_next_round(state)

        # Record choice
        state['choices'][sid] = choice
        state['has_chosen'][sid] = True

        p1_sid = state['player1_sid']
        p2_sid = state['player2_sid']

        # Check if both have committed
        if state['has_chosen'][p1_sid] and state['has_chosen'][p2_sid]:
            self._resolve_round(state)

        return True, '', state

    def next_round(self, room: Room, sid: str) -> tuple[bool, str, Optional[dict]]:
        """Manually advance to next round after reveal."""
        state = room.state.get('rock_paper_scissors')
        if not state:
            return False, 'Game not initialized', None

        if state['status'] != 'round_revealed':
            return False, 'Round is not ready to advance', state

        self._start_next_round(state)
        return True, '', state

    def restart_game(self, room: Room, sid: str) -> tuple[bool, str, Optional[dict]]:
        """Reset the match completely for a new match."""
        return True, '', self.init_game(room)

    def serialize_for_player(self, state: dict, sid: str) -> dict:
        """
        Sanitize state so opponent's secret choice is NEVER leaked while status == 'choosing'.
        """
        if not state:
            return {}

        state_copy = {
            'round': state['round'],
            'target_wins': state['target_wins'],
            'player1_sid': state['player1_sid'],
            'player1_name': state['player1_name'],
            'player2_sid': state['player2_sid'],
            'player2_name': state['player2_name'],
            'scores': state['scores'].copy(),
            'has_chosen': state['has_chosen'].copy(),
            'round_result': state['round_result'],
            'status': state['status'],
            'match_winner_sid': state['match_winner_sid'],
            'match_winner_name': state['match_winner_name'],
        }

        # If revealed or match ended, choices are public
        if state['status'] in ('round_revealed', 'match_ended'):
            state_copy['choices'] = state['choices'].copy()
        else:
            # Blind commit: only show requesting player's own choice
            state_copy['choices'] = {
                state['player1_sid']: state['choices'][state['player1_sid']] if sid == state['player1_sid'] else None,
                state['player2_sid']: state['choices'][state['player2_sid']] if sid == state['player2_sid'] else None,
            }

        return state_copy

    def _resolve_round(self, state: dict):
        p1_sid = state['player1_sid']
        p2_sid = state['player2_sid']
        c1 = state['choices'][p1_sid]
        c2 = state['choices'][p2_sid]

        p1_name = state['player1_name']
        p2_name = state['player2_name']

        if c1 == c2:
            # Tie
            winner_sid = None
            winner_name = None
            reason = f"Both picked {c1.capitalize()}! It's a tie!"
            state['scores']['ties'] += 1
        elif (c1, c2) in WINNING_RULES:
            winner_sid = p1_sid
            winner_name = p1_name
            reason = WINNING_RULES[(c1, c2)]
            state['scores'][p1_sid] += 1
        else:
            winner_sid = p2_sid
            winner_name = p2_name
            reason = WINNING_RULES[(c2, c1)]
            state['scores'][p2_sid] += 1

        state['round_result'] = {
            'winner_sid': winner_sid,
            'winner_name': winner_name,
            'reason': reason,
            'p1_choice': c1,
            'p2_choice': c2,
        }

        # Check match win condition
        if state['scores'][p1_sid] >= state['target_wins']:
            state['status'] = 'match_ended'
            state['match_winner_sid'] = p1_sid
            state['match_winner_name'] = p1_name
        elif state['scores'][p2_sid] >= state['target_wins']:
            state['status'] = 'match_ended'
            state['match_winner_sid'] = p2_sid
            state['match_winner_name'] = p2_name
        else:
            state['status'] = 'round_revealed'

    def _start_next_round(self, state: dict):
        state['round'] += 1
        p1_sid = state['player1_sid']
        p2_sid = state['player2_sid']
        state['choices'] = {p1_sid: None, p2_sid: None}
        state['has_chosen'] = {p1_sid: False, p2_sid: False}
        state['round_result'] = None
        state['status'] = 'choosing'
