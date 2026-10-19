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

        // Search elements
        this._searchContainer = $('#lobby-search-container');
        this._searchInput = $('#player-search-input');
        this._btnClearSearch = $('#btn-clear-search');
        this._searchEmpty = $('#player-search-empty');
        this._searchQueryText = $('#player-search-query-text');

        this._currentPlayer = null;
        this._players = [];
        this._searchQuery = '';

        this._setupSocketEvents();
        this._setupSearchEvents();
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

    _setupSearchEvents() {
        if (this._searchInput) {
            this._searchInput.addEventListener('input', (e) => {
                this._searchQuery = e.target.value;
                if (this._btnClearSearch) {
                    this._btnClearSearch.classList.toggle('hidden', !this._searchQuery);
                }
                this._renderPlayerList();
            });
        }

        if (this._btnClearSearch) {
            this._btnClearSearch.addEventListener('click', () => {
                this._searchQuery = '';
                if (this._searchInput) {
                    this._searchInput.value = '';
                    this._searchInput.focus();
                }
                this._btnClearSearch.classList.add('hidden');
                this._renderPlayerList();
            });
        }
    }

    /**
     * Case-insensitive SQL LIKE pattern matching for player names.
     * Supports:
     *  - Standard contains search when no wildcards: e.g. "alex" -> LIKE '%alex%'
     *  - SQL wildcard '%': matches 0 or more characters (e.g. "al%", "%x")
     *  - SQL wildcard '_': matches exactly 1 character (e.g. "b_b")
     * @param {string} text - Candidate string
     * @param {string} pattern - SQL LIKE pattern
     * @returns {boolean}
     */
    _matchesSqlLike(text, pattern) {
        if (!pattern || !pattern.trim()) return true;
        const cleanPattern = pattern.trim().toLowerCase();
        const cleanText = (text || '').toLowerCase();

        // If explicit SQL wildcards % or _ are present
        if (cleanPattern.includes('%') || cleanPattern.includes('_')) {
            const escaped = cleanPattern
                .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
                .replace(/%/g, '.*')
                .replace(/_/g, '.');
            try {
                const regex = new RegExp(`^${escaped}$`, 'i');
                return regex.test(cleanText);
            } catch {
                return cleanText.includes(cleanPattern);
            }
        }

        // Default SQL LIKE '%pattern%' (substring)
        return cleanText.includes(cleanPattern);
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

        // Update online count indicator
        const totalOther = otherPlayers.length;

        // Apply SQL LIKE query filter
        const filteredPlayers = otherPlayers.filter(p => this._matchesSqlLike(p.name, this._searchQuery));

        if (this._onlineCount) {
            if (this._searchQuery.trim() && totalOther > 0) {
                this._onlineCount.textContent = `${filteredPlayers.length} / ${this._players.length}`;
            } else {
                this._onlineCount.textContent = this._players.length;
            }
        }

        // Case 1: No other players online at all
        if (totalOther === 0) {
            if (this._searchContainer) this._searchContainer.classList.add('hidden');
            if (this._emptyState) this._emptyState.classList.remove('hidden');
            if (this._searchEmpty) this._searchEmpty.classList.add('hidden');
            this._playerList.innerHTML = '';
            return;
        }

        // Show search bar when players are online
        if (this._searchContainer) this._searchContainer.classList.remove('hidden');
        if (this._emptyState) this._emptyState.classList.add('hidden');

        // Case 2: Players are online, but query matched 0 results
        if (filteredPlayers.length === 0) {
            if (this._searchEmpty) {
                this._searchEmpty.classList.remove('hidden');
                if (this._searchQueryText) {
                    this._searchQueryText.textContent = `No players matched: '${this._searchQuery}'`;
                }
            }
            this._playerList.innerHTML = '';
            return;
        }

        // Case 3: Matching players found
        if (this._searchEmpty) this._searchEmpty.classList.add('hidden');
        this._playerList.innerHTML = '';

        filteredPlayers.forEach(player => {
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
