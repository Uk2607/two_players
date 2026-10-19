/**
 * Two Players — Memory Match Game Controller
 * Manages 16-card 3D flip grid, turn alternation, matching bonuses, and rematch resets.
 */

import { socketService } from '../services/socket-service.js';
import { toastService } from '../services/toast-service.js';

export class MemoryMatchGame {
    /**
     * @param {object} options
     * @param {() => void} [options.onBackToGames]
     */
    constructor(options = {}) {
        this.onBackToGames = options.onBackToGames;

        this.roomData = null;
        this.localPlayer = null;
        this.state = null;
        this.mismatchTimeout = null;

        this.cacheElements();
        this.bindEvents();
    }

    cacheElements() {
        // Headers & Badges
        this.pairBadge = document.getElementById('memory-pair-badge');
        this.btnLeave = document.getElementById('btn-leave-memory');

        // Scoreboard
        this.nameP1 = document.getElementById('memory-name-p1');
        this.avatarP1 = document.getElementById('memory-avatar-p1');
        this.pairsP1 = document.getElementById('memory-pairs-p1');
        this.scoreP1 = document.getElementById('memory-score-p1');

        this.nameP2 = document.getElementById('memory-name-p2');
        this.avatarP2 = document.getElementById('memory-avatar-p2');
        this.pairsP2 = document.getElementById('memory-pairs-p2');
        this.scoreP2 = document.getElementById('memory-score-p2');

        this.pairsLeftBadge = document.getElementById('memory-pairs-left');

        // Turn Banner
        this.turnBanner = document.getElementById('memory-turn-banner');
        this.turnDot = document.getElementById('memory-turn-dot');
        this.turnText = document.getElementById('memory-turn-text');

        // 4x4 Grid
        this.grid = document.getElementById('memory-grid');

        // Result Modal
        this.resultModal = document.getElementById('memory-result-modal');
        this.resultIcon = document.getElementById('memory-result-icon');
        this.resultTitle = document.getElementById('memory-result-title');
        this.resultSub = document.getElementById('memory-result-sub');
        this.btnRematch = document.getElementById('btn-memory-rematch');
        this.btnBack = document.getElementById('btn-memory-back');
    }

    getRoomId() {
        return this.roomData?.room_id || this.roomData?.id;
    }

    bindEvents() {
        // Leave / Back button
        if (this.btnLeave) {
            this.btnLeave.addEventListener('click', () => {
                socketService.emit('leave_pair');
            });
        }

        // Card clicks
        if (this.grid) {
            this.grid.addEventListener('click', (e) => {
                const card = e.target.closest('.memory-card');
                if (card) {
                    const index = parseInt(card.dataset.index, 10);
                    this.handleCardClick(index);
                }
            });
        }

        // Rematch button
        if (this.btnRematch) {
            this.btnRematch.addEventListener('click', () => {
                this.resultModal?.classList.add('hidden');
                socketService.emit('memory_restart', { room_id: this.getRoomId() });
            });
        }

        // Back to lobby from modal
        if (this.btnBack) {
            this.btnBack.addEventListener('click', () => {
                this.resultModal?.classList.add('hidden');
                socketService.emit('leave_pair');
            });
        }

        // Socket listener
        socketService.on('memory_update', (payload) => {
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

        this.buildGrid();
        this.render(initialState);
    }

    reset() {
        this.clearMismatchTimer();
        this.roomData = null;
        this.state = null;
        this.resultModal?.classList.add('hidden');
    }

    clearMismatchTimer() {
        if (this.mismatchTimeout) {
            clearTimeout(this.mismatchTimeout);
            this.mismatchTimeout = null;
        }
    }

    buildGrid() {
        if (!this.grid) return;
        this.grid.innerHTML = '';

        for (let i = 0; i < 16; i++) {
            const card = document.createElement('div');
            card.className = 'memory-card';
            card.dataset.index = String(i);
            card.id = `memory-card-${i}`;

            card.innerHTML = `
                <div class="memory-card-inner">
                    <div class="memory-card-front">
                        <span class="memory-card-icon-back">?</span>
                    </div>
                    <div class="memory-card-back">
                        <span class="memory-card-symbol">❓</span>
                    </div>
                </div>
            `;
            this.grid.appendChild(card);
        }
    }

    handleCardClick(index) {
        if (!this.state || this.state.status !== 'in_progress') return;

        // If not my turn
        if (this.state.turn_sid !== this.localPlayer?.id) {
            toastService.info("Wait for your opponent's move!");
            return;
        }

        // If card already matched or currently flipped
        const cardData = this.state.cards[index];
        if (cardData.matched || this.state.flipped_indices.includes(index)) {
            return;
        }

        // If 2 cards already showing mismatch, don't allow 3rd until flipped back
        if (this.state.flipped_indices.length >= 2) {
            return;
        }

        socketService.emit('memory_flip', {
            room_id: this.getRoomId(),
            index: index,
        });
    }

    render(state) {
        if (!state) return;
        this.state = state;

        const p1_sid = state.player1_sid;
        const p2_sid = state.player2_sid;
        const my_sid = this.localPlayer?.id;
        const isP1 = my_sid === p1_sid;
        const isMyTurn = state.turn_sid === my_sid && state.status === 'in_progress';

        // 1. Update Scoreboard Names & Avatars
        if (this.nameP1) this.nameP1.textContent = state.player1_name + (isP1 ? ' (You)' : '');
        if (this.nameP2) this.nameP2.textContent = state.player2_name + (!isP1 ? ' (You)' : '');
        if (this.avatarP1) this.avatarP1.textContent = (state.player1_name || '1')[0].toUpperCase();
        if (this.avatarP2) this.avatarP2.textContent = (state.player2_name || '2')[0].toUpperCase();

        const p1Pairs = state.pairs_found?.[p1_sid] ?? 0;
        const p2Pairs = state.pairs_found?.[p2_sid] ?? 0;
        if (this.pairsP1) this.pairsP1.textContent = `${p1Pairs} pairs`;
        if (this.pairsP2) this.pairsP2.textContent = `${p2Pairs} pairs`;

        if (this.scoreP1) this.scoreP1.textContent = state.scores?.[p1_sid] ?? 0;
        if (this.scoreP2) this.scoreP2.textContent = state.scores?.[p2_sid] ?? 0;

        const pairsRemaining = 8 - (p1Pairs + p2Pairs);
        if (this.pairsLeftBadge) this.pairsLeftBadge.textContent = `${pairsRemaining} Left`;

        // 2. Turn Banner
        if (this.turnBanner && this.turnText && this.turnDot) {
            this.turnBanner.classList.toggle('my-turn', isMyTurn);
            this.turnBanner.classList.toggle('matched-bonus', state.last_flip_result === 'match');
            this.turnDot.className = `memory-turn-dot ${state.turn_sid === p2_sid ? 'p2' : ''}`;

            if (state.status === 'in_progress') {
                const turnName = state.turn_sid === p1_sid ? state.player1_name : state.player2_name;

                if (state.last_flip_result === 'match') {
                    this.turnText.textContent = isMyTurn ? 'Match found! You get a bonus turn! 🎉' : `${turnName} found a match! Bonus turn.`;
                } else if (state.last_flip_result === 'mismatch') {
                    this.turnText.textContent = 'No match! Flipping back...';
                } else {
                    const flippedCount = state.flipped_indices?.length || 0;
                    if (isMyTurn) {
                        this.turnText.textContent = flippedCount === 1 ? 'Pick your second card!' : 'Your turn! Flip 2 cards.';
                    } else {
                        this.turnText.textContent = `${turnName}'s turn to pick cards.`;
                    }
                }
            } else if (state.status === 'won') {
                this.turnText.textContent = `${state.winner_name} won the match!`;
            } else if (state.status === 'draw') {
                this.turnText.textContent = 'All pairs matched — It\'s a Tie!';
            }
        }

        // 3. Update Grid Cards
        this.clearMismatchTimer();

        state.cards.forEach((card, idx) => {
            const cardEl = document.getElementById(`memory-card-${idx}`);
            if (!cardEl) return;

            const symbolEl = cardEl.querySelector('.memory-card-symbol');
            if (symbolEl) {
                symbolEl.textContent = card.symbol;
            }

            const isFlipped = state.flipped_indices.includes(idx);
            const isMatched = card.matched;
            const isMismatch = state.last_flip_result === 'mismatch' && isFlipped;

            cardEl.classList.toggle('flipped', isFlipped || isMatched);
            cardEl.classList.toggle('matched', isMatched);
            cardEl.classList.toggle('mismatch', isMismatch);
        });

        // If mismatch occurred, auto-clear after 1.2s
        if (state.last_flip_result === 'mismatch') {
            this.mismatchTimeout = setTimeout(() => {
                if (state.turn_sid === my_sid) {
                    socketService.emit('memory_end_mismatch', { room_id: this.getRoomId() });
                }
            }, 1200);
        }

        // 4. Match Ended Modal
        if (state.status === 'won' || state.status === 'draw') {
            this.showRoundResult(state, my_sid);
        } else {
            this.resultModal?.classList.add('hidden');
        }
    }

    showRoundResult(state, my_sid) {
        if (state.status === 'won') {
            const isWinner = state.winner_sid === my_sid;
            if (this.resultIcon) this.resultIcon.textContent = isWinner ? '🏆' : '🃏';
            if (this.resultTitle) this.resultTitle.textContent = isWinner ? 'Master of Memory!' : 'Game Over';
            if (this.resultSub) {
                const p1_sid = state.player1_sid;
                const p2_sid = state.player2_sid;
                const p1Pairs = state.pairs_found?.[p1_sid] || 0;
                const p2Pairs = state.pairs_found?.[p2_sid] || 0;
                this.resultSub.textContent = isWinner
                    ? `You won with ${Math.max(p1Pairs, p2Pairs)} pairs matched!`
                    : `${state.winner_name} won with ${Math.max(p1Pairs, p2Pairs)} pairs.`;
            }
        } else {
            if (this.resultIcon) this.resultIcon.textContent = '🤝';
            if (this.resultTitle) this.resultTitle.textContent = "It's a Draw!";
            if (this.resultSub) this.resultSub.textContent = 'Both players found 4 pairs each.';
        }

        this.resultModal?.classList.remove('hidden');
    }
}
