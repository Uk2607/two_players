/**
 * Two Players — Connect Four Game Controller
 * Manages 7x6 grid, column drops, gravity animations, 4-in-a-row highlight, and rematch resets.
 */

import { socketService } from '../services/socket-service.js';
import { toastService } from '../services/toast-service.js';

const ROWS = 6;
const COLS = 7;

export class ConnectFourGame {
    /**
     * @param {object} options
     * @param {() => void} [options.onBackToGames]
     */
    constructor(options = {}) {
        this.onBackToGames = options.onBackToGames;

        this.roomData = null;
        this.localPlayer = null;
        this.state = null;

        this.cacheElements();
        this.bindEvents();
    }

    cacheElements() {
        // Headers & Badges
        this.pairBadge = document.getElementById('c4-pair-badge');
        this.btnLeave = document.getElementById('btn-leave-c4');

        // Scoreboard
        this.nameRed = document.getElementById('c4-name-red');
        this.avatarRed = document.getElementById('c4-avatar-red');
        this.scoreRed = document.getElementById('c4-score-red');

        this.nameYellow = document.getElementById('c4-name-yellow');
        this.avatarYellow = document.getElementById('c4-avatar-yellow');
        this.scoreYellow = document.getElementById('c4-score-yellow');

        this.scoreTies = document.getElementById('c4-score-ties');

        // Turn Banner
        this.turnBanner = document.getElementById('c4-turn-banner');
        this.turnDot = document.getElementById('c4-turn-dot');
        this.turnText = document.getElementById('c4-turn-text');

        // Board & Controls
        this.colIndicators = document.getElementById('c4-column-indicators');
        this.board = document.getElementById('c4-board');

        // Result Modal
        this.resultModal = document.getElementById('c4-result-modal');
        this.resultIcon = document.getElementById('c4-result-icon');
        this.resultTitle = document.getElementById('c4-result-title');
        this.resultSub = document.getElementById('c4-result-sub');
        this.btnRematch = document.getElementById('btn-c4-rematch');
        this.btnSwitch = document.getElementById('btn-c4-switch');
        this.btnBack = document.getElementById('btn-c4-back');
    }

    getRoomId() {
        return this.roomData?.room_id || this.roomData?.id;
    }

    bindEvents() {
        const handleSwitchGame = () => {
            this.resultModal?.classList.add('hidden');
            if (socketService.connected) {
                socketService.emit('switch_game');
            } else {
                this.onBackToGames?.();
            }
        };

        const handleLeaveToLobby = () => {
            this.resultModal?.classList.add('hidden');
            if (socketService.connected) {
                socketService.emit('leave_pair');
            }
        };

        // Top back button switches game
        if (this.btnLeave) {
            this.btnLeave.addEventListener('click', handleSwitchGame);
        }

        // Modal Switch Game button
        if (this.btnSwitch) {
            this.btnSwitch.addEventListener('click', handleSwitchGame);
        }

        // Drop buttons in header row
        if (this.colIndicators) {
            this.colIndicators.addEventListener('click', (e) => {
                const btn = e.target.closest('.c4-col-drop-btn');
                if (btn) {
                    const col = parseInt(btn.dataset.col, 10);
                    this.handleDrop(col);
                }
            });
        }

        // Clicking anywhere on board column
        if (this.board) {
            this.board.addEventListener('click', (e) => {
                const cell = e.target.closest('.c4-cell');
                if (cell) {
                    const col = parseInt(cell.dataset.col, 10);
                    this.handleDrop(col);
                }
            });
        }

        // Rematch button
        if (this.btnRematch) {
            this.btnRematch.addEventListener('click', () => {
                this.resultModal?.classList.add('hidden');
                socketService.emit('c4_restart', { room_id: this.getRoomId() });
            });
        }

        // Back to lobby from modal
        if (this.btnBack) {
            this.btnBack.addEventListener('click', handleLeaveToLobby);
        }

        // Socket listener
        socketService.on('c4_update', (payload) => {
            if (payload.room_id === this.getRoomId()) {
                this.render(payload.state);
            }
        });
    }

    start(roomData, localPlayer, initialState) {
        this.roomData = roomData;
        this.localPlayer = localPlayer;
        this.state = initialState;

        if (this.pairBadge) {
            const partnerName = roomData.partner?.name || 'Friend';
            this.pairBadge.textContent = `${localPlayer.name} vs ${partnerName}`;
        }

        this.buildBoard();
        this.render(initialState);
    }

    reset() {
        this.roomData = null;
        this.state = null;
        this.resultModal?.classList.add('hidden');
    }

    buildBoard() {
        if (!this.board || !this.colIndicators) return;

        // Build top column buttons
        this.colIndicators.innerHTML = '';
        for (let c = 0; c < COLS; c++) {
            const btn = document.createElement('button');
            btn.className = 'c4-col-drop-btn';
            btn.dataset.col = String(c);
            btn.innerHTML = '↓';
            btn.title = `Drop in column ${c + 1}`;
            this.colIndicators.appendChild(btn);
        }

        // Build 6x7 grid cells
        this.board.innerHTML = '';
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const cell = document.createElement('div');
                cell.className = 'c4-cell';
                cell.dataset.row = String(r);
                cell.dataset.col = String(c);
                cell.id = `c4-cell-${r}-${c}`;
                this.board.appendChild(cell);
            }
        }
    }

    handleDrop(col) {
        if (!this.state || this.state.status !== 'in_progress') return;

        if (this.state.turn_sid !== this.localPlayer?.id) {
            toastService.info("Wait for your opponent's move!");
            return;
        }

        if (col < 0 || col >= COLS) return;

        // Check if column is already full
        if (this.state.grid[0][col] !== null) {
            toastService.info('This column is full! Choose another.');
            return;
        }

        socketService.emit('c4_drop', {
            room_id: this.getRoomId(),
            col: col,
        });
    }

    render(state) {
        if (!state) return;
        this.state = state;

        const my_sid = this.localPlayer?.id;
        const isRed = my_sid === state.player_red_sid;
        const isMyTurn = state.turn_sid === my_sid && state.status === 'in_progress';

        // 1. Update Scoreboard Names & Avatars
        if (this.nameRed) this.nameRed.textContent = state.player_red_name + (isRed ? ' (You)' : '');
        if (this.nameYellow) this.nameYellow.textContent = state.player_yellow_name + (!isRed ? ' (You)' : '');
        if (this.avatarRed) this.avatarRed.textContent = (state.player_red_name || 'R')[0].toUpperCase();
        if (this.avatarYellow) this.avatarYellow.textContent = (state.player_yellow_name || 'Y')[0].toUpperCase();

        if (this.scoreRed) this.scoreRed.textContent = state.scores?.red ?? 0;
        if (this.scoreYellow) this.scoreYellow.textContent = state.scores?.yellow ?? 0;
        if (this.scoreTies) this.scoreTies.textContent = state.scores?.ties ?? 0;

        // 2. Turn Banner
        if (this.turnBanner && this.turnText && this.turnDot) {
            this.turnBanner.classList.toggle('my-turn', isMyTurn);
            this.turnDot.className = `c4-turn-dot ${state.turn_color === 'yellow' ? 'yellow' : ''}`;

            if (state.status === 'in_progress') {
                const turnName = state.turn_sid === state.player_red_sid ? state.player_red_name : state.player_yellow_name;
                const turnColorName = state.turn_color === 'red' ? 'Red' : 'Yellow';
                this.turnText.textContent = isMyTurn ? `Your Turn (${turnColorName}) — Tap column to drop!` : `${turnName}'s Turn (${turnColorName})`;
            } else if (state.status === 'won') {
                this.turnText.textContent = `${state.winner_name} connected 4 discs!`;
            } else if (state.status === 'draw') {
                this.turnText.textContent = 'Full board — It\'s a draw!';
            }
        }

        // 3. Update Drop Indicators (disable if not my turn or column full)
        const colButtons = this.colIndicators?.querySelectorAll('.c4-col-drop-btn');
        if (colButtons) {
            colButtons.forEach((btn) => {
                const c = parseInt(btn.dataset.col, 10);
                const isFull = state.grid[0][c] !== null;
                btn.disabled = !isMyTurn || isFull;
            });
        }

        // 4. Update Board Discs
        const winningMap = new Set(
            (state.winning_cells || []).map(([r, c]) => `${r}-${c}`)
        );

        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const cell = document.getElementById(`c4-cell-${r}-${c}`);
                if (!cell) continue;

                const color = state.grid[r][c];
                const isWinning = winningMap.has(`${r}-${c}`);
                const isLastDrop = state.last_drop && state.last_drop.row === r && state.last_drop.col === c;

                if (!color) {
                    cell.innerHTML = '';
                } else {
                    let disc = cell.querySelector('.c4-disc');
                    if (!disc) {
                        disc = document.createElement('div');
                        cell.appendChild(disc);
                        if (isLastDrop) {
                            disc.classList.add('dropping');
                        }
                    }
                    disc.className = `c4-disc ${color} ${isWinning ? 'winner-disc' : ''}`;
                }
            }
        }

        // 5. Result Modal
        if (state.status === 'won' || state.status === 'draw') {
            this.showRoundResult(state, my_sid);
        } else {
            this.resultModal?.classList.add('hidden');
        }
    }

    showRoundResult(state, my_sid) {
        if (state.status === 'won') {
            const isWinner = state.winner_sid === my_sid;
            if (this.resultIcon) this.resultIcon.textContent = isWinner ? '🏆' : '🔴';
            if (this.resultTitle) this.resultTitle.textContent = isWinner ? 'Four in a Row!' : 'Round Over';
            if (this.resultSub) this.resultSub.textContent = isWinner ? 'You connected 4 discs and won!' : `${state.winner_name} connected 4 discs and won.`;
        } else {
            if (this.resultIcon) this.resultIcon.textContent = '🤝';
            if (this.resultTitle) this.resultTitle.textContent = "It's a Draw!";
            if (this.resultSub) this.resultSub.textContent = 'The board is completely full without 4 in a row.';
        }

        this.resultModal?.classList.remove('hidden');
    }
}
