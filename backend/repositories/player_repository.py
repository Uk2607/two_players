"""
Two Players - Player Repository
In-memory data store for connected players.
"""

from typing import Optional
from models.player import Player


class PlayerRepository:
    """Manages the in-memory collection of connected players."""

    def __init__(self):
        self._players: dict[str, Player] = {}

    def add(self, player: Player) -> None:
        """Add a player to the store."""
        self._players[player.sid] = player

    def remove(self, sid: str) -> Optional[Player]:
        """Remove and return a player by SID."""
        return self._players.pop(sid, None)

    def get(self, sid: str) -> Optional[Player]:
        """Get a player by SID."""
        return self._players.get(sid)

    def get_all(self) -> list[Player]:
        """Get all connected players."""
        return list(self._players.values())

    def find_by_name(self, name: str, exclude_sid: str = None) -> Optional[Player]:
        """Find a player by name (case-insensitive), optionally excluding a SID."""
        for sid, player in self._players.items():
            if player.name.lower() == name.lower() and sid != exclude_sid:
                return player
        return None

    def count(self) -> int:
        """Return the number of connected players."""
        return len(self._players)

    def to_list(self) -> list[dict]:
        """Serialize all players to a list of dicts."""
        return [p.to_dict() for p in self._players.values()]
