"""
Two Players - Memory Match Service
Turn-based card pairing duel with flip validation, match streaks, and score tracking.
"""

import random
from typing import Optional, List, Tuple
from models.room import Room

CARD_PAIRS = ['🚀', '💎', '🍕', '👾', '⚡', '🎸', '🦊', '👑']


class MemoryMatchService:
    """Manages 4x4 card grid, pair matching logic, turn succession, and score tracking."""

    def init_game(self, room: Room) -> dict:
        """Initialize or reset Memory Match for a room."""
        # Generate shuffled 16 cards (8 pairs)
        symbols = CARD_PAIRS * 2
        random.shuffle(symbols)

        cards = [
            {'index': idx, 'symbol': sym, 'matched': False}
            for idx, sym in enumerate(symbols)
        ]

        existing_scores = (
            room.state.get('memory_match', {}).get('scores', {
                room.player1_sid: 0,
                room.player2_sid: 0,
                'ties': 0,
            })
        )

        state = {
            'cards': cards,
            'player1_sid': room.player1_sid,
            'player1_name': room.player1_name,
            'player2_sid': room.player2_sid,
            'player2_name': room.player2_name,
            'turn_sid': room.player1_sid,
            'flipped_indices': [],  # Currently flipped card indices during turn [idx1] or [idx1, idx2]
            'last_flip_result': None,  # None, 'match', 'mismatch'
            'pairs_found': {
                room.player1_sid: 0,
                room.player2_sid: 0,
            },
            'status': 'in_progress',  # 'in_progress', 'won', 'draw'
            'winner_sid': None,
            'winner_name': None,
            'scores': existing_scores,
        }

        room.state['memory_match'] = state
        return state

    def get_state(self, room: Room) -> Optional[dict]:
        return room.state.get('memory_match')

    def flip_card(self, room: Room, sid: str, card_index: int) -> Tuple[bool, str, Optional[dict]]:
        """
        Flip a card at card_index.
        Returns (success: bool, error_message: str, updated_state: dict).
        """
        state = room.state.get('memory_match')
        if not state:
            return False, 'Game has not been initialized', None

        if state['status'] != 'in_progress':
            return False, 'Game is already finished. Click Play Again to restart.', state

        if sid != state['turn_sid']:
            return False, 'It is not your turn', state

        if not (0 <= card_index < len(state['cards'])):
            return False, 'Invalid card index', state

        card = state['cards'][card_index]
        if card['matched']:
            return False, 'Card is already matched', state

        flipped = state['flipped_indices']
        if card_index in flipped:
            return False, 'Card is already flipped', state

        # If 2 cards were flipped and mismatch hasn't cleared, clear them now
        if len(flipped) >= 2:
            state['flipped_indices'] = []
            state['last_flip_result'] = None
            flipped = state['flipped_indices']

        # Add card to flipped
        flipped.append(card_index)

        # If this is the 1st card flipped in turn
        if len(flipped) == 1:
            state['last_flip_result'] = None
            return True, '', state

        # 2nd card flipped: check if symbols match
        idx1, idx2 = flipped[0], flipped[1]
        card1 = state['cards'][idx1]
        card2 = state['cards'][idx2]

        if card1['symbol'] == card2['symbol']:
            # Match!
            card1['matched'] = True
            card2['matched'] = True
            state['pairs_found'][sid] += 1
            state['last_flip_result'] = 'match'
            state['flipped_indices'] = []  # Clear flipped since they are now matched

            # Check if all 8 pairs matched
            total_matched = sum(1 for c in state['cards'] if c['matched'])
            if total_matched == len(state['cards']):
                p1_sid = state['player1_sid']
                p2_sid = state['player2_sid']
                p1_pairs = state['pairs_found'][p1_sid]
                p2_pairs = state['pairs_found'][p2_sid]

                if p1_pairs > p2_pairs:
                    state['status'] = 'won'
                    state['winner_sid'] = p1_sid
                    state['winner_name'] = state['player1_name']
                    state['scores'][p1_sid] += 1
                elif p2_pairs > p1_pairs:
                    state['status'] = 'won'
                    state['winner_sid'] = p2_sid
                    state['winner_name'] = state['player2_name']
                    state['scores'][p2_sid] += 1
                else:
                    state['status'] = 'draw'
                    state['winner_sid'] = None
                    state['winner_name'] = None
                    state['scores']['ties'] += 1

            # On match, player gets another turn!
            return True, '', state
        else:
            # Mismatch: cards stay visible until client countdown or next click, then turn toggles
            state['last_flip_result'] = 'mismatch'
            return True, '', state

    def end_mismatch_turn(self, room: Room, sid: str) -> Tuple[bool, str, Optional[dict]]:
        """Called to flip back mismatched cards and toggle turn to the opponent."""
        state = room.state.get('memory_match')
        if not state:
            return False, 'Game not initialized', None

        state['flipped_indices'] = []
        state['last_flip_result'] = None

        # Toggle turn
        if state['turn_sid'] == state['player1_sid']:
            state['turn_sid'] = state['player2_sid']
        else:
            state['turn_sid'] = state['player1_sid']

        return True, '', state

    def restart_game(self, room: Room, sid: str) -> Tuple[bool, str, Optional[dict]]:
        """Shuffle and restart game preserving scores."""
        state = room.state.get('memory_match')
        if not state:
            return True, '', self.init_game(room)

        # Alternate starting player
        next_starter_sid = (
            state['player2_sid']
            if state.get('starter_sid') == state['player1_sid']
            else state['player1_sid']
        )

        symbols = CARD_PAIRS * 2
        random.shuffle(symbols)

        cards = [
            {'index': idx, 'symbol': sym, 'matched': False}
            for idx, sym in enumerate(symbols)
        ]

        state['cards'] = cards
        state['starter_sid'] = next_starter_sid
        state['turn_sid'] = next_starter_sid
        state['flipped_indices'] = []
        state['last_flip_result'] = None
        state['pairs_found'] = {
            state['player1_sid']: 0,
            state['player2_sid']: 0,
        }
        state['status'] = 'in_progress'
        state['winner_sid'] = None
        state['winner_name'] = None

        return True, '', state

    def serialize_for_player(self, state: dict, sid: str = None) -> dict:
        """Anti-cheat sanitizer: hide card symbols unless card is flipped or matched."""
        if not state:
            return {}

        state_copy = state.copy()
        flipped = set(state.get('flipped_indices', []))
        is_game_ended = state.get('status') in ('won', 'draw')

        sanitized_cards = []
        for card in state.get('cards', []):
            if is_game_ended or card.get('matched') or card.get('index') in flipped:
                sanitized_cards.append(card)
            else:
                sanitized_cards.append({
                    'index': card.get('index'),
                    'symbol': '',  # Strictly hidden from client inspection
                    'matched': False,
                })

        state_copy['cards'] = sanitized_cards
        return state_copy
