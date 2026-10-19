"""
Two Players - Player Model
Data class representing a connected player.
"""

from dataclasses import dataclass, field
from typing import Optional


@dataclass
class Player:
    """Represents a connected player."""
    sid: str
    name: str
    status: str = 'available'  # 'available', 'waiting', 'in-game'
    partner_sid: Optional[str] = None

    def to_dict(self) -> dict:
        """Serialize player to dict for client emission."""
        return {
            'id': self.sid,
            'name': self.name,
            'status': self.status,
        }

    def is_available(self) -> bool:
        return self.status == 'available'

    def set_waiting(self):
        self.status = 'waiting'

    def set_in_game(self, partner_sid: str):
        self.status = 'in-game'
        self.partner_sid = partner_sid

    def reset(self):
        self.status = 'available'
        self.partner_sid = None
