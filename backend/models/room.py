"""
Two Players - Room Model
Data class representing an active game room pairing two players.
"""

from dataclasses import dataclass, field
from typing import Optional
import uuid


@dataclass
class Room:
    """Represents a game room where two players are paired."""
    room_id: str = None
    player1_sid: str = ''
    player2_sid: str = ''
    player1_name: str = ''
    player2_name: str = ''
    game: Optional[str] = None
    state: dict = field(default_factory=dict)

    def __post_init__(self):
        if self.room_id is None:
            self.room_id = str(uuid.uuid4())[:8]

    def contains_player(self, sid: str) -> bool:
        return self.player1_sid == sid or self.player2_sid == sid

    def to_dict(self) -> dict:
        return {
            'room_id': self.room_id,
            'player1': {'id': self.player1_sid, 'name': self.player1_name},
            'player2': {'id': self.player2_sid, 'name': self.player2_name},
            'game': self.game,
        }
