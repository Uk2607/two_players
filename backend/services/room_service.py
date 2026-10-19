"""
Two Players - Room Service
Business logic for pairing players into rooms and managing game selection.
"""

from typing import Optional
from models.room import Room
from repositories.room_repository import RoomRepository
from repositories.player_repository import PlayerRepository


class RoomService:
    """Handles room creation, game selection, and pair dissolution."""

    def __init__(self, room_repo: RoomRepository, player_repo: PlayerRepository):
        self._room_repo = room_repo
        self._player_repo = player_repo

    def create_room(self, player1_sid: str, player2_sid: str) -> Optional[Room]:
        """
        Create a new room and pair two players.
        Returns the Room or None if players are invalid.
        """
        p1 = self._player_repo.get(player1_sid)
        p2 = self._player_repo.get(player2_sid)

        if not p1 or not p2:
            return None

        room = Room(
            player1_sid=player1_sid,
            player2_sid=player2_sid,
            player1_name=p1.name,
            player2_name=p2.name,
        )
        self._room_repo.add(room)

        # Update player statuses
        p1.set_in_game(player2_sid)
        p2.set_in_game(player1_sid)

        return room

    def select_game(self, room_id: str, game_id: str, selected_by_sid: str) -> tuple[bool, str, Optional[Room]]:
        """
        Set the selected game for a room.
        Returns (success, message_or_selector_name, room).
        """
        room = self._room_repo.get(room_id)
        if not room:
            return False, 'Room not found', None

        room.game = game_id
        selector = self._player_repo.get(selected_by_sid)
        selector_name = selector.name if selector else 'Unknown'

        return True, selector_name, room

    def leave_pair(self, sid: str) -> Optional[str]:
        """
        Dissolve a pair. Resets both players to available.
        Returns the partner's SID or None.
        """
        player = self._player_repo.get(sid)
        partner_sid = player.partner_sid if player else None

        # Fallback to room lookup if partner_sid wasn't set
        rooms = self._room_repo.find_by_player(sid)
        if rooms and not partner_sid:
            room = rooms[0]
            partner_sid = room.player2_sid if room.player1_sid == sid else room.player1_sid

        # Remove rooms
        self._room_repo.remove_by_player(sid)

        # Reset the leaving player
        if player:
            player.reset()

        # Reset the partner
        if partner_sid:
            partner = self._player_repo.get(partner_sid)
            if partner:
                partner.reset()

        return partner_sid

    def cleanup_for_player(self, sid: str) -> list[Room]:
        """Remove all rooms containing a player (disconnect cleanup)."""
        return self._room_repo.remove_by_player(sid)

    def get_room_for_player(self, sid: str) -> Optional[Room]:
        """Find active room for a given player SID."""
        rooms = self._room_repo.find_by_player(sid)
        return rooms[0] if rooms else None

    def room_count(self) -> int:
        """Return number of active rooms."""
        return self._room_repo.count()
