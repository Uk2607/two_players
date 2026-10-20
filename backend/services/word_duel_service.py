"""
Two Players - Word Duel Service
Turn-based competitive word guessing race with strikes, revealed blanks, and score tracking.
"""

import logging
import random
from pathlib import Path
from typing import Optional, List, Tuple
from models.room import Room

logger = logging.getLogger(__name__)

DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "valid-wordle-list.txt"

# Fallback words if file cannot be accessed
DEFAULT_WORD_BANK = [
    'CYBER', 'PIXEL', 'GHOST', 'ARENA', 'NEXUS', 'SPARK', 'ROBOT', 'FLAME',
    'BLADE', 'TURBO', 'STORM', 'VIPER', 'LASER', 'POWER', 'MAGIC', 'SHADOW',
    'HYPER', 'QUANTUM', 'STEALTH', 'MATRIX', 'GALAXY', 'FUSION', 'TITAN',
    'COSMIC', 'ORBIT', 'VECTOR', 'CRYPTO', 'VORTEX', 'RADAR', 'SHIELD'
]


def load_word_bank() -> List[str]:
    """Load valid word bank from valid-wordle-list.txt."""
    if DATA_PATH.exists():
        try:
            with open(DATA_PATH, "r", encoding="utf-8") as f:
                words = [line.strip().upper() for line in f if line.strip() and line.strip().isalpha()]
            if words:
                logger.info("Loaded %d words from %s", len(words), DATA_PATH)
                return words
        except Exception as e:
            logger.error("Failed to read word list from %s: %s", DATA_PATH, e)
    return DEFAULT_WORD_BANK


WORD_BANK = load_word_bank()

MAX_STRIKES = 6


class WordDuelService:
    """Manages word guessing duels, letter validations, turn alternation, and anti-cheat state serialization."""

    def init_game(self, room: Room) -> dict:
        """Initialize or reset Word Duel for a room."""
        secret_word = random.choice(WORD_BANK).upper()

        existing_scores = (
            room.state.get('word_duel', {}).get('scores', {
                room.player1_sid: 0,
                room.player2_sid: 0,
            })
        )

        state = {
            'round': 1,
            'max_rounds': 3,
            'secret_word': secret_word,
            'revealed': ['_' for _ in secret_word],
            'guessed_letters': [],  # all guessed letters
            'correct_letters': [],
            'wrong_letters': [],
            'player1_sid': room.player1_sid,
            'player1_name': room.player1_name,
            'player2_sid': room.player2_sid,
            'player2_name': room.player2_name,
            'starter_sid': room.player1_sid,
            'turn_sid': room.player1_sid,
            'strikes_left': MAX_STRIKES,
            'status': 'in_progress',  # 'in_progress', 'round_won', 'round_lost', 'match_ended'
            'round_winner_sid': None,
            'round_winner_name': None,
            'scores': existing_scores,
            'last_guess': None,  # {'letter': 'A', 'correct': True, 'by': name}
        }

        room.state['word_duel'] = state
        return state

    def get_state(self, room: Room) -> Optional[dict]:
        return room.state.get('word_duel')

    def guess_letter(self, room: Room, sid: str, letter: str) -> Tuple[bool, str, Optional[dict]]:
        """Process a letter guess by the active player."""
        state = room.state.get('word_duel')
        if not state:
            return False, 'Game has not been initialized', None

        if state['status'] not in ('in_progress',):
            return False, 'Round is finished. Advance to next round.', state

        if sid != state['turn_sid']:
            return False, 'It is not your turn', state

        letter = letter.strip().upper()
        if len(letter) != 1 or not letter.isalpha():
            return False, 'Please guess a single valid letter A-Z', state

        if letter in state['guessed_letters']:
            return False, f'Letter "{letter}" has already been guessed', state

        state['guessed_letters'].append(letter)
        word = state['secret_word']
        p_name = state['player1_name'] if sid == state['player1_sid'] else state['player2_name']

        if letter in word:
            # Correct guess!
            state['correct_letters'].append(letter)
            # Reveal letter in blanks
            for i, ch in enumerate(word):
                if ch == letter:
                    state['revealed'][i] = letter

            state['scores'][sid] += 10
            state['last_guess'] = {'letter': letter, 'correct': True, 'by': p_name}

            # Check if whole word is solved
            if '_' not in state['revealed']:
                state['status'] = 'round_won'
                state['round_winner_sid'] = sid
                state['round_winner_name'] = p_name
                state['scores'][sid] += 30  # Bonus for solving word
                self._check_match_status(state)
                return True, '', state

            # On correct guess, player keeps turn!
            return True, '', state
        else:
            # Wrong guess
            state['wrong_letters'].append(letter)
            state['strikes_left'] -= 1
            state['last_guess'] = {'letter': letter, 'correct': False, 'by': p_name}

            if state['strikes_left'] <= 0:
                # Word missed by both
                state['status'] = 'round_lost'
                state['revealed'] = list(word)  # Reveal full word
                self._check_match_status(state)
                return True, '', state

            # Toggle turn to opponent
            if sid == state['player1_sid']:
                state['turn_sid'] = state['player2_sid']
            else:
                state['turn_sid'] = state['player1_sid']

            return True, '', state

    def guess_full_word(self, room: Room, sid: str, full_word: str) -> Tuple[bool, str, Optional[dict]]:
        """Process a direct full word solve attempt."""
        state = room.state.get('word_duel')
        if not state or state['status'] != 'in_progress':
            return False, 'Round is not active', state

        if sid != state['turn_sid']:
            return False, 'It is not your turn', state

        full_word = full_word.strip().upper()
        p_name = state['player1_name'] if sid == state['player1_sid'] else state['player2_name']

        if full_word == state['secret_word']:
            state['revealed'] = list(state['secret_word'])
            state['status'] = 'round_won'
            state['round_winner_sid'] = sid
            state['round_winner_name'] = p_name
            state['scores'][sid] += 50
            state['last_guess'] = {'letter': full_word, 'correct': True, 'by': p_name}
            self._check_match_status(state)
            return True, '', state
        else:
            state['strikes_left'] -= 2
            state['last_guess'] = {'letter': full_word, 'correct': False, 'by': p_name}
            if state['strikes_left'] <= 0:
                state['status'] = 'round_lost'
                state['revealed'] = list(state['secret_word'])
                self._check_match_status(state)
            else:
                # Switch turn
                state['turn_sid'] = state['player2_sid'] if sid == state['player1_sid'] else state['player1_sid']
            return True, '', state

    def next_round(self, room: Room, sid: str) -> Tuple[bool, str, Optional[dict]]:
        """Advance to next word round."""
        state = room.state.get('word_duel')
        if not state:
            return False, 'Game not initialized', None

        if state['round'] >= state['max_rounds']:
            return False, 'Match already completed', state

        secret_word = random.choice(WORD_BANK).upper()
        state['round'] += 1
        state['secret_word'] = secret_word
        state['revealed'] = ['_' for _ in secret_word]
        state['guessed_letters'] = []
        state['correct_letters'] = []
        state['wrong_letters'] = []
        state['strikes_left'] = MAX_STRIKES
        state['status'] = 'in_progress'
        state['round_winner_sid'] = None
        state['round_winner_name'] = None
        state['last_guess'] = None

        # Alternate starter
        state['turn_sid'] = (
            state['player2_sid'] if state.get('starter_sid') == state['player1_sid'] else state['player1_sid']
        )
        state['starter_sid'] = state['turn_sid']

        return True, '', state

    def restart_game(self, room: Room, sid: str) -> Tuple[bool, str, Optional[dict]]:
        """Reset match completely."""
        return True, '', self.init_game(room)

    def serialize_for_player(self, state: dict, sid: str) -> dict:
        """Anti-cheat: hide secret_word until round is won/lost or match ended."""
        if not state:
            return {}

        state_copy = state.copy()
        if state['status'] in ('in_progress',):
            state_copy['secret_word'] = None  # Never leak unrevealed letters!
        return state_copy

    def _check_match_status(self, state: dict):
        if state['round'] >= state['max_rounds']:
            state['status'] = 'match_ended'
            p1_sid = state['player1_sid']
            p2_sid = state['player2_sid']
            if state['scores'][p1_sid] > state['scores'][p2_sid]:
                state['match_winner_sid'] = p1_sid
                state['match_winner_name'] = state['player1_name']
            elif state['scores'][p2_sid] > state['scores'][p1_sid]:
                state['match_winner_sid'] = p2_sid
                state['match_winner_name'] = state['player2_name']
            else:
                state['match_winner_sid'] = None
                state['match_winner_name'] = None
