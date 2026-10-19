"""
Two Players - Player Service
Business logic for player registration and lifecycle.
"""

from typing import Optional
from models.player import Player
from repositories.player_repository import PlayerRepository


class PlayerService:
    """Handles player registration, lookup, and lifecycle management."""

    def __init__(self, player_repo: PlayerRepository):
        self._repo = player_repo

    def register(self, sid: str, name: str) -> tuple[bool, str]:
        """
        Register a new player.
        Returns (success: bool, message: str).
        """
        name = name.strip()
        if not name:
            return False, 'Name cannot be empty'

        if len(name) > 16:
            return False, 'Name must be 16 characters or fewer'

        # Check duplicate names
        existing = self._repo.find_by_name(name, exclude_sid=sid)
        if existing:
            return False, f'Name "{name}" is already taken. Choose another.'

        player = Player(sid=sid, name=name)
        self._repo.add(player)
        return True, name

    def unregister(self, sid: str) -> Optional[Player]:
        """Remove a player from the store. Returns the removed player or None."""
        return self._repo.remove(sid)

    def get(self, sid: str) -> Optional[Player]:
        """Get a player by SID."""
        return self._repo.get(sid)

    def get_all_serialized(self) -> list[dict]:
        """Get all players as serialized dicts for the client."""
        return self._repo.to_list()

    def player_count(self) -> int:
        """Return total online player count."""
        return self._repo.count()
