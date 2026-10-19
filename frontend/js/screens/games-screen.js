/**
 * GamesScreen — Displays available games catalog, handles game selection and leaving pairs.
 */

import { $ } from '../utils/helpers.js';
import { GAMES } from '../data/games-catalog.js';
import { socketService } from '../services/socket-service.js';
import { toastService } from '../services/toast-service.js';
import { createGameCard } from '../components/game-card.js';

export class GamesScreen {
    /**
     * @param {object} options
     * @param {Function} options.onLeave - Callback when leaving the paired room
     * @param {Function} options.onLaunchGame - Callback(gameId, roomData, state) when game is launched
     */
    constructor({ onLeave, onLaunchGame }) {
        this._onLeave = onLeave;
        this._onLaunchGame = onLaunchGame;

        this._pairBadge = $('#pair-badge');
        this._btnLeavePair = $('#btn-leave-pair');
        this._gamesGrid = $('#games-grid');

        this._roomData = null;
        this._localPlayer = null;

        this._setupListeners();
        this._setupSocketEvents();
        this._renderGames();
    }

    _setupListeners() {
        if (this._btnLeavePair) {
            this._btnLeavePair.addEventListener('click', () => {
                this._onLeave?.();
            });
        }
    }


    _setupSocketEvents() {
        socketService.on('game_selected', (data) => {
            const game = GAMES.find(g => g.id === data.game_id);
            const gameTitle = game ? game.title : data.game_id;
            toastService.success(`🎮 ${data.selected_by} selected ${gameTitle}!`);

            // Highlight selected game card
            if (this._gamesGrid) {
                this._gamesGrid.querySelectorAll('.game-card').forEach(card => {
                    card.classList.toggle('selected', card.getAttribute('data-id') === data.game_id);
                });
            }

            // Launch game arena after a brief visual transition
            setTimeout(() => {
                this._onLaunchGame?.(data.game_id, this._roomData, data.state);
            }, 600);
        });

    }

    /** Reset room state and badges. */
    clearRoom() {
        this._roomData = null;
        if (this._pairBadge) {
            this._pairBadge.textContent = 'You & Friend';
        }
        if (this._gamesGrid) {
            this._gamesGrid.querySelectorAll('.game-card').forEach(card => {
                card.classList.remove('selected');
            });
        }
    }

    /**
     * Initialize paired session with room data and current player.
     * @param {object} roomData - { room_id, player1, player2 }
     * @param {object} localPlayer - { id, name }
     */
    setRoom(roomData, localPlayer) {
        this._roomData = roomData;
        this._localPlayer = localPlayer;

        if (this._pairBadge && roomData) {
            const partner = roomData.player1.id === localPlayer.id
                ? roomData.player2
                : roomData.player1;
            this._pairBadge.textContent = `${localPlayer.name} & ${partner.name}`;
        }
    }

    _renderGames() {
        if (!this._gamesGrid) return;
        this._gamesGrid.innerHTML = '';

        GAMES.forEach(game => {
            const card = createGameCard(game, (selectedGame) => {
                this._selectGame(selectedGame);
            });
            this._gamesGrid.appendChild(card);
        });
    }

    _selectGame(game) {
        if (!this._roomData) {
            toastService.error('You are not in a room.');
            return;
        }

        socketService.emit('select_game', {
            room_id: this._roomData.room_id,
            game_id: game.id,
        });
    }
}
