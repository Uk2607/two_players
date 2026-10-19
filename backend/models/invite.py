"""
Two Players - Invite Model
Data class representing a pending game invite.
"""

from dataclasses import dataclass
import time


@dataclass
class Invite:
    """Represents a pending game invite from one player to another."""
    from_sid: str
    from_name: str
    target_sid: str
    timestamp: float = None

    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = time.time()

    def to_dict(self) -> dict:
        return {
            'from_id': self.from_sid,
            'from_name': self.from_name,
        }
