"""
Two Players - Invite Repository
In-memory data store for pending invites.
"""

from typing import Optional
from models.invite import Invite


class InviteRepository:
    """Manages the in-memory collection of pending invites."""

    def __init__(self):
        # Keyed by target_sid — one pending invite per target
        self._invites: dict[str, Invite] = {}

    def add(self, invite: Invite) -> None:
        """Store an invite, keyed by the target player's SID."""
        self._invites[invite.target_sid] = invite

    def get(self, target_sid: str) -> Optional[Invite]:
        """Get a pending invite for a target SID."""
        return self._invites.get(target_sid)

    def remove(self, target_sid: str) -> Optional[Invite]:
        """Remove and return an invite by target SID."""
        return self._invites.pop(target_sid, None)

    def remove_all_by_sender(self, from_sid: str) -> list[str]:
        """Remove all invites sent by a given SID. Returns removed target SIDs."""
        to_remove = [k for k, v in self._invites.items() if v.from_sid == from_sid]
        for k in to_remove:
            del self._invites[k]
        return to_remove

    def remove_all_for_player(self, sid: str) -> None:
        """Remove all invites involving a player (as sender or target)."""
        to_remove = [
            k for k, v in self._invites.items()
            if v.from_sid == sid or k == sid
        ]
        for k in to_remove:
            del self._invites[k]
