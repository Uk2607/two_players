/**
 * Two Players — Word Duel Game Controller
 * Manages word blanks, strikes, virtual QWERTY keyboard, direct solves, and round resets.
 */

import { socketService } from '../services/socket-service.js';
import { toastService } from '../services/toast-service.js';

const KEYBOARD_ROWS = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
];

export class WordDuelGame {
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
        this.pairBadge = document.getElementById('word-pair-badge');
        this.btnLeave = document.getElementById('btn-leave-word');

        // Scoreboard
        this.nameP1 = document.getElementById('word-name-p1');
        this.avatarP1 = document.getElementById('word-avatar-p1');
        this.scoreP1 = document.getElementById('word-score-p1');

        this.nameP2 = document.getElementById('word-name-p2');
        this.avatarP2 = document.getElementById('word-avatar-p2');
        this.scoreP2 = document.getElementById('word-score-p2');

        this.roundBadge = document.getElementById('word-round-badge');
        this.strikesContainer = document.getElementById('word-strikes');

        // Turn Banner
        this.turnBanner = document.getElementById('word-turn-banner');
        this.turnDot = document.getElementById('word-turn-dot');
        this.turnText = document.getElementById('word-turn-text');

        // Stage & Blanks
        this.blanksStage = document.getElementById('word-blanks');

        // Direct solve bar
        this.solveInput = document.getElementById('word-solve-input');
        this.btnSolve = document.getElementById('btn-word-solve');

        // Virtual Keyboard
        this.keyboard = document.getElementById('word-keyboard');

        // Result Modal
        this.resultModal = document.getElementById('word-result-modal');
        this.resultIcon = document.getElementById('word-result-icon');
        this.resultTitle = document.getElementById('word-result-title');
        this.resultSub = document.getElementById('word-result-sub');
        this.btnRematch = document.getElementById('btn-word-rematch');
        this.btnBack = document.getElementById('btn-word-back');
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

        // Virtual Keyboard clicks
        if (this.keyboard) {
            this.keyboard.addEventListener('click', (e) => {
                const btn = e.target.closest('.word-key-btn');
                if (btn && !btn.disabled) {
                    const letter = btn.dataset.letter;
                    this.handleGuessLetter(letter);
                }
            });
        }

        // Direct solve button
        if (this.btnSolve) {
            this.btnSolve.addEventListener('click', () => {
                this.handleDirectSolve();
            });
        }
        if (this.solveInput) {
            this.solveInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    this.handleDirectSolve();
                }
            });
        }

        // Physical Keyboard listener
        window.addEventListener('keydown', (e) => {
            // Only handle if active screen is word-arena and not typing in solveInput
            const arena = document.getElementById('screen-word-arena');
            if (!arena || !arena.classList.contains('active')) return;
            if (document.activeElement === this.solveInput) return;

            const key = e.key.toUpperCase();
            if (/^[A-Z]$/.test(key)) {
                this.handleGuessLetter(key);
            }
        });

        // Rematch button (Play Again / Next Round)
        if (this.btnRematch) {
            this.btnRematch.addEventListener('click', () => {
                this.resultModal?.classList.add('hidden');
                if (this.state?.status === 'match_ended') {
                    socketService.emit('word_restart', { room_id: this.getRoomId() });
                } else {
                    socketService.emit('word_next_round', { room_id: this.getRoomId() });
                }
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
        socketService.on('word_update', (payload) => {
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

        this.buildKeyboard();
        this.render(initialState);
    }

    reset() {
        this.roomData = null;
        this.state = null;
        this.resultModal?.classList.add('hidden');
        if (this.solveInput) this.solveInput.value = '';
    }

    buildKeyboard() {
        if (!this.keyboard) return;
        this.keyboard.innerHTML = '';

        KEYBOARD_ROWS.forEach((row) => {
            const rowEl = document.createElement('div');
            rowEl.className = 'word-keyboard-row';

            row.forEach((letter) => {
                const btn = document.createElement('button');
                btn.className = 'word-key-btn';
                btn.dataset.letter = letter;
                btn.id = `key-${letter}`;
                btn.textContent = letter;
                rowEl.appendChild(btn);
            });

            this.keyboard.appendChild(rowEl);
        });
    }

    handleGuessLetter(letter) {
        if (!this.state || this.state.status !== 'in_progress') return;

        if (this.state.turn_sid !== this.localPlayer?.id) {
            toastService.info("Wait for your opponent's turn!");
            return;
        }

        if (this.state.guessed_letters.includes(letter)) {
            return;
        }

        socketService.emit('word_guess_letter', {
            room_id: this.getRoomId(),
            letter: letter,
        });
    }

    handleDirectSolve() {
        if (!this.state || this.state.status !== 'in_progress') return;

        if (this.state.turn_sid !== this.localPlayer?.id) {
            toastService.info("Wait for your opponent's turn!");
            return;
        }

        const guess = this.solveInput?.value.trim().toUpperCase();
        if (!guess) return;

        socketService.emit('word_guess_full', {
            room_id: this.getRoomId(),
            word: guess,
        });

        if (this.solveInput) this.solveInput.value = '';
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

        if (this.scoreP1) this.scoreP1.textContent = state.scores?.[p1_sid] ?? 0;
        if (this.scoreP2) this.scoreP2.textContent = state.scores?.[p2_sid] ?? 0;
        if (this.roundBadge) this.roundBadge.textContent = `Round ${state.round} / ${state.max_rounds}`;

        // Strikes left
        if (this.strikesContainer) {
            const strikes = Math.max(0, state.strikes_left);
            this.strikesContainer.innerHTML = '❤️'.repeat(strikes) + '🖤'.repeat(6 - strikes);
        }

        // 2. Turn Banner
        if (this.turnBanner && this.turnText && this.turnDot) {
            this.turnBanner.classList.toggle('my-turn', isMyTurn);
            this.turnDot.className = `word-turn-dot ${state.turn_sid === p2_sid ? 'p2' : ''}`;

            if (state.status === 'in_progress') {
                const turnName = state.turn_sid === p1_sid ? state.player1_name : state.player2_name;

                if (state.last_guess) {
                    const { letter, correct, by } = state.last_guess;
                    if (correct) {
                        this.turnText.textContent = `${by} hit "${letter}"! +10 pts (Keep going!)`;
                    } else {
                        this.turnText.textContent = `${by} missed "${letter}". Turn switched!`;
                    }
                } else {
                    this.turnText.textContent = isMyTurn ? 'Your turn! Guess a letter or solve.' : `${turnName}'s turn to guess.`;
                }
            } else if (state.status === 'round_won') {
                this.turnText.textContent = `Word Solved by ${state.round_winner_name}!`;
            } else if (state.status === 'round_lost') {
                this.turnText.textContent = 'Out of shields! Word missed.';
            } else if (state.status === 'match_ended') {
                this.turnText.textContent = 'Match Finished!';
            }
        }

        // 3. Render Blanks
        if (this.blanksStage) {
            this.blanksStage.innerHTML = '';
            state.revealed.forEach((char) => {
                const box = document.createElement('div');
                box.className = `word-letter-box ${char !== '_' ? 'revealed' : ''}`;
                box.textContent = char !== '_' ? char : '';
                this.blanksStage.appendChild(box);
            });
        }

        // 4. Update Keyboard States
        const correctSet = new Set(state.correct_letters || []);
        const wrongSet = new Set(state.wrong_letters || []);

        this.keyboard?.querySelectorAll('.word-key-btn').forEach((btn) => {
            const letter = btn.dataset.letter;
            const isCorrect = correctSet.has(letter);
            const isWrong = wrongSet.has(letter);

            btn.classList.toggle('correct', isCorrect);
            btn.classList.toggle('wrong', isWrong);
            btn.disabled = !isMyTurn || isCorrect || isWrong;
        });

        // 5. Update Solve Input
        if (this.solveInput) this.solveInput.disabled = !isMyTurn;
        if (this.btnSolve) this.btnSolve.disabled = !isMyTurn;

        // 6. Round / Match Modal
        if (state.status === 'round_won' || state.status === 'round_lost' || state.status === 'match_ended') {
            this.showRoundResult(state, my_sid);
        } else {
            this.resultModal?.classList.add('hidden');
        }
    }

    showRoundResult(state, my_sid) {
        const isMatchEnded = state.status === 'match_ended';
        const p1_sid = state.player1_sid;
        const p2_sid = state.player2_sid;
        const s1 = state.scores?.[p1_sid] || 0;
        const s2 = state.scores?.[p2_sid] || 0;

        if (isMatchEnded) {
            const winner_sid = state.match_winner_sid;
            const isWinner = winner_sid === my_sid;
            if (this.resultIcon) this.resultIcon.textContent = isWinner ? '🏆' : '👑';
            if (this.resultTitle) this.resultTitle.textContent = isWinner ? 'Duel Champion!' : 'Match Completed';
            if (this.resultSub) {
                this.resultSub.textContent = isWinner
                    ? `You won the duel ${Math.max(s1, s2)} - ${Math.min(s1, s2)} pts!`
                    : `${state.match_winner_name} won the duel ${Math.max(s1, s2)} - ${Math.min(s1, s2)} pts.`;
            }
            if (this.btnRematch) this.btnRematch.textContent = 'Play Again';
        } else {
            // Round finished
            const wonRound = state.status === 'round_won';
            const winner_name = state.round_winner_name;
            const isRoundWinner = state.round_winner_sid === my_sid;

            if (this.resultIcon) this.resultIcon.textContent = wonRound ? '✨' : '💥';
            if (this.resultTitle) {
                this.resultTitle.textContent = wonRound
                    ? (isRoundWinner ? 'Word Solved!' : `${winner_name} Solved the Word!`)
                    : 'Strikes Depleted!';
            }
            if (this.resultSub) {
                const word = state.secret_word || state.revealed.join('');
                this.resultSub.textContent = `The secret word was: "${word}". Ready for round ${state.round + 1}?`;
            }
            if (this.btnRematch) this.btnRematch.textContent = `Start Round ${state.round + 1}`;
        }

        this.resultModal?.classList.remove('hidden');
    }
}
