/**
 * Tic Tac Toe Game Controller
 * Manages the interactive 3×3 multiplayer arena, moves, animations, and rematches.
 */

import { $, getAvatarColors } from '../utils/helpers.js';
import { socketService } from '../services/socket-service.js';
import { toastService } from '../services/toast-service.js';

export class TicTacToeGame {
    /**
     * @param {object} options
     * @param {Function} options.onBackToGames - Callback to return to game cards screen
     */
    constructor({ onBackToGames }) {
        this._onBackToGames = onBackToGames;

        // Elements
        this._btnLeaveGame = $('#btn-leave-game');
        this._arenaPairBadge = $('#arena-pair-badge');

        this._cardX = $('#card-player-x');
        this._cardO = $('#card-player-o');
        this._avatarX = $('#ttt-avatar-x');
        this._avatarO = $('#ttt-avatar-o');
        this._nameX = $('#ttt-name-x');
        this._nameO = $('#ttt-name-o');
        this._scoreX = $('#ttt-score-x');
        this._scoreO = $('#ttt-score-o');
        this._scoreTies = $('#ttt-score-ties');

        this._turnBanner = $('#ttt-turn-banner');
        this._turnText = $('#ttt-turn-text');
        this._cells = document.querySelectorAll('.ttt-cell');

        this._resultModal = $('#ttt-result-modal');
        this._resultIcon = $('#ttt-result-icon');
        this._resultTitle = $('#ttt-result-title');
        this._resultSub = $('#ttt-result-sub');
        this._btnRematch = $('#btn-ttt-rematch');
        this._btnSwitch = $('#btn-ttt-switch');
        this._btnBack = $('#btn-ttt-back');

        this._roomData = null;
        this._localPlayer = null;
        this._state = null;

        this._setupListeners();
        this._setupSocket();
    }

    _setupListeners() {
        const handleSwitchGame = () => {
            this.hideResultModal();
            if (socketService.connected) {
                socketService.emit('switch_game');
            } else {
                this._onBackToGames?.();
            }
        };

        const handleLeaveToLobby = () => {
            this.hideResultModal();
            if (socketService.connected) {
                socketService.emit('leave_pair');
            }
        };

        if (this._btnLeaveGame) {
            this._btnLeaveGame.addEventListener('click', handleSwitchGame);
        }

        if (this._btnSwitch) {
            this._btnSwitch.addEventListener('click', handleSwitchGame);
        }

        if (this._btnBack) {
            this._btnBack.addEventListener('click', handleLeaveToLobby);
        }

        if (this._btnRematch) {
            this._btnRematch.addEventListener('click', () => {
                this.hideResultModal();
                if (this._roomData && socketService.connected) {
                    socketService.emit('ttt_restart', { room_id: this._roomData.room_id });
                }
            });
        }

        this._cells.forEach(cell => {
            cell.addEventListener('click', () => {
                const index = parseInt(cell.dataset.index, 10);
                this._handleCellClick(index);
            });
        });
    }

    _setupSocket() {
        socketService.on('ttt_update', (data) => {
            if (!this._roomData || data.room_id !== this._roomData.room_id) return;
            this.update(data.state);
        });
    }

    /**
     * Start/mount the game session.
     * @param {object} roomData - { room_id, player1, player2 }
     * @param {object} localPlayer - { id, name }
     * @param {object} initialState - Initial TicTacToe state
     */
    start(roomData, localPlayer, initialState) {
        this._roomData = roomData;
        this._localPlayer = localPlayer;

        this.hideResultModal();

        // Update header pair badge
        if (this._arenaPairBadge && roomData) {
            const partner = roomData.player1.id === localPlayer.id
                ? roomData.player2
                : roomData.player1;
            this._arenaPairBadge.textContent = `${localPlayer.name} & ${partner.name}`;
        }

        if (initialState) {
            this.update(initialState);
        }
    }

    _handleCellClick(index) {
        if (!this._state || this._state.status !== 'in_progress') return;

        if (this._state.turn_sid !== this._localPlayer?.id) {
            toastService.info("Wait for your opponent's move!");
            return;
        }

        if (this._state.board[index] !== null) {
            return;
        }

        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            try { navigator.vibrate(20); } catch (_) {}
        }

        socketService.emit('ttt_move', {
            room_id: this._roomData.room_id,
            index: index,
        });
    }

    /**
     * Update the board and game UI with new state.
     * @param {object} state
     */
    update(state) {
        if (!state) return;
        this._state = state;

        // 1. Update Player Details & Avatars
        if (this._nameX) this._nameX.textContent = state.player_x_name || 'Player 1';
        if (this._nameO) this._nameO.textContent = state.player_o_name || 'Player 2';

        if (this._avatarX && state.player_x_name) {
            this._avatarX.textContent = state.player_x_name.charAt(0);
            this._avatarX.style.background = getAvatarColors(state.player_x_name);
        }
        if (this._avatarO && state.player_o_name) {
            this._avatarO.textContent = state.player_o_name.charAt(0);
            this._avatarO.style.background = getAvatarColors(state.player_o_name);
        }

        // 2. Update Scores
        if (this._scoreX) this._scoreX.textContent = state.scores?.x ?? 0;
        if (this._scoreO) this._scoreO.textContent = state.scores?.o ?? 0;
        if (this._scoreTies) this._scoreTies.textContent = state.scores?.ties ?? 0;

        // 3. Update Turn Styling on Cards & Banner
        const isXTurn = state.turn_sid === state.player_x_sid;
        this._cardX?.classList.toggle('active-turn', isXTurn && state.status === 'in_progress');
        this._cardO?.classList.toggle('active-turn', !isXTurn && state.status === 'in_progress');

        const isMyTurn = state.turn_sid === this._localPlayer?.id;
        const mySymbol = this._localPlayer?.id === state.player_x_sid ? 'X' : 'O';

        if (this._turnBanner) {
            this._turnBanner.classList.toggle('my-turn', isMyTurn && state.status === 'in_progress');
            this._turnBanner.classList.toggle('opponent-turn', !isMyTurn && state.status === 'in_progress');
        }

        if (this._turnText) {
            if (state.status === 'in_progress') {
                if (isMyTurn) {
                    this._turnText.textContent = `Your Turn (${mySymbol})`;
                } else {
                    const opponentName = mySymbol === 'X' ? state.player_o_name : state.player_x_name;
                    this._turnText.textContent = `Waiting for ${opponentName}...`;
                }
            } else if (state.status === 'won') {
                this._turnText.textContent = `Game Over — ${state.winner_name} won!`;
            } else if (state.status === 'draw') {
                this._turnText.textContent = "Game Over — It's a draw!";
            }
        }

        // 4. Update Board Cells
        const winningSet = new Set(state.winning_line || []);
        this._cells.forEach((cell, idx) => {
            const mark = state.board[idx];
            cell.className = 'ttt-cell';
            cell.textContent = mark ? (mark === 'X' ? '✕' : '○') : '';

            if (mark === 'X') cell.classList.add('cell-x');
            if (mark === 'O') cell.classList.add('cell-o');
            if (winningSet.has(idx)) cell.classList.add('winning-cell');

            cell.disabled = mark !== null || state.status !== 'in_progress' || !isMyTurn;
        });

        // 5. Handle Game Conclusion
        if (state.status === 'won') {
            const isWinner = state.winner_sid === this._localPlayer?.id;
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
                try { navigator.vibrate(isWinner ? [40, 60, 80] : [60]); } catch (_) {}
            }
            setTimeout(() => {
                this.showResultModal({
                    icon: isWinner ? '🏆' : '⚔️',
                    title: isWinner ? 'Victory!' : 'Defeat',
                    sub: isWinner ? 'You won the round! Outstanding move.' : `${state.winner_name} won this round.`,
                });
            }, 600);
        } else if (state.status === 'draw') {
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
                try { navigator.vibrate(40); } catch (_) {}
            }
            setTimeout(() => {
                this.showResultModal({
                    icon: '🤝',
                    title: "It's a Draw!",
                    sub: 'Both players matched wits equally.',
                });
            }, 600);
        }
    }

    showResultModal({ icon, title, sub }) {
        if (!this._resultModal) return;
        if (this._resultIcon) this._resultIcon.textContent = icon;
        if (this._resultTitle) this._resultTitle.textContent = title;
        if (this._resultSub) this._resultSub.textContent = sub;
        this._resultModal.classList.remove('hidden');
    }

    hideResultModal() {
        if (this._resultModal) {
            this._resultModal.classList.add('hidden');
        }
    }

    /** Clean up and reset game arena state when session ends. */
    reset() {
        this.hideResultModal();
        this._roomData = null;
        this._state = null;
        this._cells.forEach(cell => {
            cell.className = 'ttt-cell';
            cell.textContent = '';
            cell.disabled = true;
        });
        if (this._turnText) {
            this._turnText.textContent = 'Waiting for game start...';
        }
        if (this._turnBanner) {
            this._turnBanner.className = 'ttt-turn-banner';
        }
        if (this._cardX) this._cardX.className = 'ttt-score-card player-x-card';
        if (this._cardO) this._cardO.className = 'ttt-score-card player-o-card';
    }
}
