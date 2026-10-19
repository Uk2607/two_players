"""
Two Players - Connect Four Service
Business logic, gravity drop mechanics, 4-in-a-row win detection, and score tracking.
"""

from typing import Optional, List, Tuple
from models.room import Room

ROWS = 6
COLS = 7


class ConnectFourService:
    """Manages 7x6 Connect Four board state, gravity drops, win checking, and scores."""

    def init_game(self, room: Room) -> dict:
        """Initialize or reset Connect Four for a room."""
        existing_scores = (
            room.state.get('connect_four', {}).get('scores', {'red': 0, 'yellow': 0, 'ties': 0})
        )

        state = {
            'grid': [[None for _ in range(COLS)] for _ in range(ROWS)],
            'player_red_sid': room.player1_sid,
            'player_red_name': room.player1_name,
            'player_yellow_sid': room.player2_sid,
            'player_yellow_name': room.player2_name,
            'starter_sid': room.player1_sid,
            'turn_sid': room.player1_sid,
            'turn_color': 'red',
            'status': 'in_progress',  # 'in_progress', 'won', 'draw'
            'last_drop': None,  # {'row': r, 'col': c, 'color': 'red'}
            'winner_sid': None,
            'winner_name': None,
            'winner_color': None,
            'winning_cells': None,  # list of [row, col]
            'scores': existing_scores,
        }

        room.state['connect_four'] = state
        return state

    def get_state(self, room: Room) -> Optional[dict]:
        return room.state.get('connect_four')

    def drop_disc(self, room: Room, sid: str, col: int) -> Tuple[bool, str, Optional[dict]]:
        """
        Drop a disc into the chosen column (0..6).
        Returns (success: bool, error_message: str, updated_state: dict).
        """
        state = room.state.get('connect_four')
        if not state:
            return False, 'Game has not been initialized', None

        if state['status'] != 'in_progress':
            return False, 'Game is finished. Click Play Again to restart.', state

        if sid != state['turn_sid']:
            return False, 'It is not your turn', state

        if not (0 <= col < COLS):
            return False, f'Column index {col} is out of bounds', state

        grid = state['grid']

        # Find the lowest available row in column
        target_row = None
        for r in range(ROWS - 1, -1, -1):
            if grid[r][col] is None:
                target_row = r
                break

        if target_row is None:
            return False, 'This column is completely full!', state

        # Determine color and player name
        color = 'red' if sid == state['player_red_sid'] else 'yellow'
        player_name = state['player_red_name'] if color == 'red' else state['player_yellow_name']

        # Place disc
        grid[target_row][col] = color
        state['last_drop'] = {'row': target_row, 'col': col, 'color': color}

        # Check win condition
        winning_cells = self._check_win(grid, target_row, col, color)
        if winning_cells:
            state['status'] = 'won'
            state['winner_sid'] = sid
            state['winner_name'] = player_name
            state['winner_color'] = color
            state['winning_cells'] = winning_cells
            state['scores'][color] += 1
            return True, '', state

        # Check draw condition (top row full across all columns)
        if all(grid[0][c] is not None for c in range(COLS)):
            state['status'] = 'draw'
            state['winner_sid'] = None
            state['winner_name'] = None
            state['winner_color'] = None
            state['winning_cells'] = None
            state['scores']['ties'] += 1
            return True, '', state

        # Toggle turn
        if sid == state['player_red_sid']:
            state['turn_sid'] = state['player_yellow_sid']
            state['turn_color'] = 'yellow'
        else:
            state['turn_sid'] = state['player_red_sid']
            state['turn_color'] = 'red'

        return True, '', state

    def restart_game(self, room: Room, sid: str) -> Tuple[bool, str, Optional[dict]]:
        """Reset board while preserving scores and alternating starter."""
        state = room.state.get('connect_four')
        if not state:
            return True, '', self.init_game(room)

        # Alternate starter
        next_starter_sid = (
            state['player_yellow_sid']
            if state.get('starter_sid') == state['player_red_sid']
            else state['player_red_sid']
        )
        next_color = 'red' if next_starter_sid == state['player_red_sid'] else 'yellow'

        state['grid'] = [[None for _ in range(COLS)] for _ in range(ROWS)]
        state['starter_sid'] = next_starter_sid
        state['turn_sid'] = next_starter_sid
        state['turn_color'] = next_color
        state['status'] = 'in_progress'
        state['last_drop'] = None
        state['winner_sid'] = None
        state['winner_name'] = None
        state['winner_color'] = None
        state['winning_cells'] = None

        return True, '', state

    def _check_win(self, grid: List[List[Optional[str]]], row: int, col: int, color: str) -> Optional[List[List[int]]]:
        """Check 4 directions from placed disc: horizontal, vertical, diagonal /, diagonal \\."""
        directions = [
            (0, 1),   # Horizontal
            (1, 0),   # Vertical
            (1, 1),   # Diagonal down-right \
            (1, -1),  # Diagonal down-left /
        ]

        for dr, dc in directions:
            cells = [[row, col]]

            # Forward check
            r, c = row + dr, col + dc
            while 0 <= r < ROWS and 0 <= c < COLS and grid[r][c] == color:
                cells.append([r, c])
                r += dr
                c += dc

            # Backward check
            r, c = row - dr, col - dc
            while 0 <= r < ROWS and 0 <= c < COLS and grid[r][c] == color:
                cells.append([r, c])
                r -= dr
                c -= dc

            if len(cells) >= 4:
                return cells[:4]

        return None
