/**
 * LobbyScreen — Displays online players, handles challenges and match pairing.
 */

import { $, getAvatarColors } from '../utils/helpers.js';
import { socketService } from '../services/socket-service.js';
import { toastService } from '../services/toast-service.js';
import { createPlayerCard } from '../components/player-card.js';
import { inviteModal } from '../components/invite-modal.js';

export class LobbyScreen {
    /**
     * @param {object} options
     * @param {Function} options.onPaired - Callback(roomData) when paired with a friend
     */
    constructor({ onPaired }) {
        this._onPaired = onPaired;

        this._myAvatar = $('#my-avatar');
        this._myName = $('#my-name');
        this._onlineCount = $('#online-count');
        this._emptyState = $('#player-list-empty');
        this._playerList = $('#player-list');

        this._currentPlayer = null;
        this._players = [];

        this._setupSocketEvents();
    }

    /**
     * Update local player profile header.
     * @param {{ id: string, name: string }} player
     */
    setCurrentPlayer(player) {
        this._currentPlayer = player;
        if (this._myName) this._myName.textContent = player.name;
        if (this._myAvatar) {
            this._myAvatar.textContent = player.name.charAt(0);
            this._myAvatar.style.background = getAvatarColors(player.name);
        }
    }

    _setupSocketEvents() {
        socketService.on('player_list', (players) => {
            this._players = players || [];
            this._renderPlayerList();
        });

        socketService.on('invite_sent', (data) => {
            toastService.info(`Challenge sent to ${data.target_name}! Waiting for reply...`);
        });

        socketService.on('invite_received', (data) => {
            inviteModal.show(
                data.from_name,
                () => socketService.emit('accept_invite', { from_id: data.from_id }),
                () => socketService.emit('decline_invite', { from_id: data.from_id })
            );
        });

        socketService.on('invite_declined', (data) => {
            toastService.error(`${data.name} declined your challenge.`);
        });

        socketService.on('paired', (roomData) => {
            inviteModal.hide();
            toastService.success('Paired successfully! Pick a game to play.');
            this._onPaired?.(roomData);
        });
    }

    _renderPlayerList() {
        if (!this._playerList) return;

        const myId = this._currentPlayer?.id || socketService.id;
        const otherPlayers = this._players.filter(p => p.id !== myId);

        // Update online count
        if (this._onlineCount) {
            this._onlineCount.textContent = this._players.length;
        }

        // Toggle empty state
        if (otherPlayers.length === 0) {
            if (this._emptyState) this._emptyState.classList.remove('hidden');
            this._playerList.innerHTML = '';
            return;
        }

        if (this._emptyState) this._emptyState.classList.add('hidden');
        this._playerList.innerHTML = '';

        otherPlayers.forEach(player => {
            const card = createPlayerCard(player, myId, (target) => {
                this._sendChallenge(target);
            });
            this._playerList.appendChild(card);
        });
    }

    _sendChallenge(targetPlayer) {
        if (!socketService.connected) {
            toastService.error('Disconnected from server.');
            return;
        }
        socketService.emit('send_invite', { target_id: targetPlayer.id });
    }
}
