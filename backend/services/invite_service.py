"""
Two Players - Invite Service
Business logic for sending, accepting, and declining game invites.
"""

from typing import Optional
from models.invite import Invite
from repositories.invite_repository import InviteRepository
from repositories.player_repository import PlayerRepository


class InviteService:
    """Handles invite creation, validation, acceptance, and cleanup."""

    def __init__(self, invite_repo: InviteRepository, player_repo: PlayerRepository):
        self._invite_repo = invite_repo
        self._player_repo = player_repo

    def send_invite(self, from_sid: str, target_sid: str) -> tuple[bool, str]:
        """
        Send an invite from one player to another.
        Returns (success: bool, message: str).
        """
        sender = self._player_repo.get(from_sid)
        if not sender:
            return False, 'You are not registered'

        target = self._player_repo.get(target_sid)
        if not target:
            return False, 'Player not found'

        if not target.is_available():
            return False, f'{target.name} is not available'

        invite = Invite(
            from_sid=from_sid,
            from_name=sender.name,
            target_sid=target_sid,
        )
        self._invite_repo.add(invite)
        sender.set_waiting()

        return True, target.name

    def accept_invite(self, target_sid: str, from_sid: str) -> tuple[bool, str, Optional[Invite]]:
        """
        Accept a pending invite.
        Returns (success, message, invite).
        """
        invite = self._invite_repo.get(target_sid)
        if not invite or invite.from_sid != from_sid:
            return False, 'Invite not found or expired', None

        self._invite_repo.remove(target_sid)
        return True, 'Invite accepted', invite

    def decline_invite(self, target_sid: str, from_sid: str) -> tuple[bool, Optional[str]]:
        """
        Decline a pending invite.
        Returns (success, decliner_name).
        """
        invite = self._invite_repo.get(target_sid)
        if not invite or invite.from_sid != from_sid:
            return False, None

        self._invite_repo.remove(target_sid)
        # Reset sender status
        sender = self._player_repo.get(from_sid)
        if sender:
            sender.reset()

        decliner = self._player_repo.get(target_sid)
        decliner_name = decliner.name if decliner else 'Unknown'
        return True, decliner_name

    def cleanup_for_player(self, sid: str) -> None:
        """Remove all invites involving a player (disconnect cleanup)."""
        self._invite_repo.remove_all_for_player(sid)
