"""
Two Players - Room Repository
In-memory data store for active game rooms.
"""

from typing import Optional
from models.room import Room


class RoomRepository:
    """Manages the in-memory collection of active game rooms."""

    def __init__(self):
        self._rooms: dict[str, Room] = {}

    def add(self, room: Room) -> None:
        """Add a room to the store."""
        self._rooms[room.room_id] = room

    def get(self, room_id: str) -> Optional[Room]:
        """Get a room by ID."""
        return self._rooms.get(room_id)

    def remove(self, room_id: str) -> Optional[Room]:
        """Remove and return a room by ID."""
        return self._rooms.pop(room_id, None)

    def find_by_player(self, sid: str) -> list[Room]:
        """Find all rooms that contain a given player SID."""
        return [r for r in self._rooms.values() if r.contains_player(sid)]

    def remove_by_player(self, sid: str) -> list[Room]:
        """Remove and return all rooms containing a given player."""
        rooms = self.find_by_player(sid)
        for room in rooms:
            del self._rooms[room.room_id]
        return rooms

    def count(self) -> int:
        """Return the number of active rooms."""
        return len(self._rooms)
