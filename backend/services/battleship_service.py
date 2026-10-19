"""
Two Players - Battleship Service
Naval warfare combat with fleet deployment, radar targeting, and anti-cheat state isolation.
"""

from typing import Optional, List, Dict, Tuple
from models.room import Room

GRID_SIZE = 6
FLEET_SIZES = [3, 2, 2]  # Carrier (3), Cruiser (2), Patrol (2) = 7 hits total


class BattleshipService:
    """Manages Battleship placement phase, radar strikes, ship sinking, and anti-cheat state."""

    def init_game(self, room: Room) -> dict:
        """Initialize or reset Battleship for a room."""
        existing_scores = (
            room.state.get('battleship', {}).get('scores', {
                room.player1_sid: 0,
                room.player2_sid: 0,
            })
        )

        state = {
            'player1_sid': room.player1_sid,
            'player1_name': room.player1_name,
            'player2_sid': room.player2_sid,
            'player2_name': room.player2_name,
            'phase': 'placement',  # 'placement', 'combat', 'match_ended'
            'fleets': {
                room.player1_sid: None,  # list of ships: [{'id': 0, 'cells': [[r, c], ...], 'hits': 0, 'sunk': False}]
                room.player2_sid: None,
            },
            'ready': {
                room.player1_sid: False,
                room.player2_sid: False,
            },
            'shots': {
                # shots fired AT player1: { 'r,c': 'hit' | 'miss' }
                room.player1_sid: {},
                # shots fired AT player2: { 'r,c': 'hit' | 'miss' }
                room.player2_sid: {},
            },
            'hits_needed': sum(FLEET_SIZES),
            'hits_count': {
                room.player1_sid: 0,  # hits scored by p1
                room.player2_sid: 0,  # hits scored by p2
            },
            'starter_sid': room.player1_sid,
            'turn_sid': room.player1_sid,
            'last_shot': None,  # {'attacker': name, 'row': r, 'col': c, 'result': 'hit'|'miss'|'sunk'}
            'status': 'in_progress',  # 'in_progress', 'won'
            'winner_sid': None,
            'winner_name': None,
            'scores': existing_scores,
        }

        room.state['battleship'] = state
        return state

    def get_state(self, room: Room) -> Optional[dict]:
        return room.state.get('battleship')

    def deploy_fleet(self, room: Room, sid: str, ships: List[Dict]) -> Tuple[bool, str, Optional[dict]]:
        """Validate and lock in player's fleet of ships."""
        state = room.state.get('battleship')
        if not state:
            return False, 'Game not initialized', None

        if state['phase'] != 'placement':
            return False, 'Fleet placement has already ended', state

        if not self._validate_fleet(ships):
            return False, 'Invalid fleet configuration. Check bounds and overlap.', state

        # Format ships with hits tracking
        formatted_ships = []
        for s in ships:
            formatted_ships.append({
                'id': s.get('id', 0),
                'name': s.get('name', 'Warship'),
                'cells': s['cells'],
                'hits': 0,
                'sunk': False,
            })

        state['fleets'][sid] = formatted_ships
        state['ready'][sid] = True

        p1_sid = state['player1_sid']
        p2_sid = state['player2_sid']

        # If both ready, transition to combat phase!
        if state['ready'][p1_sid] and state['ready'][p2_sid]:
            state['phase'] = 'combat'
            state['turn_sid'] = state['starter_sid']

        return True, '', state

    def fire_torpedo(self, room: Room, sid: str, row: int, col: int) -> Tuple[bool, str, Optional[dict]]:
        """Fire a shot at target coordinates."""
        state = room.state.get('battleship')
        if not state:
            return False, 'Game not initialized', None

        if state['phase'] != 'combat' or state['status'] != 'in_progress':
            return False, 'Combat is not active', state

        if sid != state['turn_sid']:
            return False, 'It is not your turn to fire', state

        if not (0 <= row < GRID_SIZE and 0 <= col < GRID_SIZE):
            return False, 'Coordinates out of bounds', state

        # Determine target opponent
        target_sid = state['player2_sid'] if sid == state['player1_sid'] else state['player1_sid']
        coord_key = f"{row},{col}"

        # Check if already fired at this coordinate
        if coord_key in state['shots'][target_sid]:
            return False, 'Already fired at this grid coordinate', state

        attacker_name = state['player1_name'] if sid == state['player1_sid'] else state['player2_name']
        opponent_fleet = state['fleets'][target_sid]

        # Check if shot hit any ship
        hit_ship = None
        for ship in opponent_fleet:
            if [row, col] in ship['cells']:
                hit_ship = ship
                break

        if hit_ship:
            # HIT!
            state['shots'][target_sid][coord_key] = 'hit'
            hit_ship['hits'] += 1
            state['hits_count'][sid] += 1

            is_sunk = hit_ship['hits'] >= len(hit_ship['cells'])
            if is_sunk:
                hit_ship['sunk'] = True
                result_str = f"Direct hit! Sunk enemy {hit_ship['name']}!"
            else:
                result_str = f"Direct hit at {chr(65 + row)}{col + 1}!"

            state['last_shot'] = {
                'row': row,
                'col': col,
                'result': 'sunk' if is_sunk else 'hit',
                'attacker_sid': sid,
                'attacker_name': attacker_name,
                'message': result_str,
            }

            # Check win condition
            if state['hits_count'][sid] >= state['hits_needed']:
                state['status'] = 'won'
                state['phase'] = 'match_ended'
                state['winner_sid'] = sid
                state['winner_name'] = attacker_name
                state['scores'][sid] += 1
                return True, '', state

            # On hit, attacker gets another shot!
            return True, '', state
        else:
            # MISS
            state['shots'][target_sid][coord_key] = 'miss'
            state['last_shot'] = {
                'row': row,
                'col': col,
                'result': 'miss',
                'attacker_sid': sid,
                'attacker_name': attacker_name,
                'message': f"Splash! Missed at {chr(65 + row)}{col + 1}.",
            }

            # Toggle turn to opponent
            state['turn_sid'] = target_sid
            return True, '', state

    def restart_game(self, room: Room, sid: str) -> Tuple[bool, str, Optional[dict]]:
        """Reset for rematch while preserving scores and alternating starter."""
        state = room.state.get('battleship')
        if not state:
            return True, '', self.init_game(room)

        next_starter = (
            state['player2_sid'] if state.get('starter_sid') == state['player1_sid'] else state['player1_sid']
        )

        state['phase'] = 'placement'
        state['fleets'] = {state['player1_sid']: None, state['player2_sid']: None}
        state['ready'] = {state['player1_sid']: False, state['player2_sid']: False}
        state['shots'] = {state['player1_sid']: {}, state['player2_sid']: {}}
        state['hits_count'] = {state['player1_sid']: 0, state['player2_sid']: 0}
        state['starter_sid'] = next_starter
        state['turn_sid'] = next_starter
        state['last_shot'] = None
        state['status'] = 'in_progress'
        state['winner_sid'] = None
        state['winner_name'] = None

        return True, '', state

    def serialize_for_player(self, state: dict, sid: str) -> dict:
        """
        Anti-Cheat Sanitizer:
        - Own fleet ships are visible.
        - Opponent's unhit ships are strictly hidden.
        - Enemy grid only reveals hits and misses.
        """
        if not state:
            return {}

        p1_sid = state['player1_sid']
        p2_sid = state['player2_sid']
        opponent_sid = p2_sid if sid == p1_sid else p1_sid

        # Sanitize opponent fleet: only reveal sunk ships or hit coordinates
        sanitized_fleets = {
            sid: state['fleets'][sid],  # My ships: fully visible
            opponent_sid: None,
        }

        # If game is over, opponent ships can be revealed
        if state['phase'] == 'match_ended':
            sanitized_fleets[opponent_sid] = state['fleets'][opponent_sid]
        elif state['fleets'][opponent_sid]:
            # During battle, only tell client which enemy ships have been sunk
            sanitized_fleets[opponent_sid] = [
                {'name': s['name'], 'sunk': s['sunk'], 'size': len(s['cells'])}
                for s in state['fleets'][opponent_sid]
            ]

        return {
            'player1_sid': p1_sid,
            'player1_name': state['player1_name'],
            'player2_sid': p2_sid,
            'player2_name': state['player2_name'],
            'phase': state['phase'],
            'ready': state['ready'],
            'my_fleet': sanitized_fleets[sid],
            'enemy_fleet_status': sanitized_fleets[opponent_sid],
            'my_waters_shots': state['shots'][sid],  # Shots enemy fired at me
            'enemy_radar_shots': state['shots'][opponent_sid],  # Shots I fired at enemy
            'turn_sid': state['turn_sid'],
            'hits_count': state['hits_count'],
            'hits_needed': state['hits_needed'],
            'last_shot': state['last_shot'],
            'status': state['status'],
            'winner_sid': state['winner_sid'],
            'winner_name': state['winner_name'],
            'scores': state['scores'],
        }

    def _validate_fleet(self, ships: List[Dict]) -> bool:
        """Verify ship lengths, boundary adherence, and non-overlapping placement."""
        if not ships or len(ships) != len(FLEET_SIZES):
            return False

        all_cells = set()
        sizes = sorted([len(s.get('cells', [])) for s in ships])
        expected = sorted(FLEET_SIZES)
        if sizes != expected:
            return False

        for ship in ships:
            cells = ship.get('cells', [])
            for r, c in cells:
                if not (0 <= r < GRID_SIZE and 0 <= c < GRID_SIZE):
                    return False
                if (r, c) in all_cells:
                    return False  # Overlapping ship cells
                all_cells.add((r, c))

        return True
