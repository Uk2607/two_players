/**
 * Two Players — Rock Paper Scissors Game Controller
 * Manages UI interactions, blind-commit picks, reveal showdowns, countdowns, and rematches.
 */

import { socketService } from '../services/socket-service.js';
import { toastService } from '../services/toast-service.js';

const EMOJI_MAP = {
    rock: '✊',
    paper: '✋',
    scissors: '✌️',
};

export class RockPaperScissorsGame {
    /**
     * @param {object} options
     * @param {() => void} [options.onBackToGames]
     */
    constructor(options = {}) {
        this.onBackToGames = options.onBackToGames;

        this.roomData = null;
        this.localPlayer = null;
        this.state = null;
        this.nextRoundTimer = null;
        this.countdownValue = 3;

        this.cacheElements();
        this.bindEvents();
    }

    cacheElements() {
        // Headers & Badges
        this.pairBadge = document.getElementById('rps-pair-badge');
        this.btnLeave = document.getElementById('btn-leave-rps');

        // Scoreboard
        this.nameP1 = document.getElementById('rps-name-p1');
        this.avatarP1 = document.getElementById('rps-avatar-p1');
        this.statusP1 = document.getElementById('rps-status-p1');
        this.scoreP1 = document.getElementById('rps-score-p1');

        this.nameP2 = document.getElementById('rps-name-p2');
        this.avatarP2 = document.getElementById('rps-avatar-p2');
        this.statusP2 = document.getElementById('rps-status-p2');
        this.scoreP2 = document.getElementById('rps-score-p2');

        this.roundBadge = document.getElementById('rps-round-badge');

        // Stage
        this.stage = document.getElementById('rps-stage');
        this.handP1 = document.getElementById('rps-hand-p1');
        this.handP2 = document.getElementById('rps-hand-p2');
        this.labelP1 = document.getElementById('rps-fighter-label-p1');
        this.labelP2 = document.getElementById('rps-fighter-label-p2');

        // Banner
        this.banner = document.getElementById('rps-banner');
        this.bannerText = document.getElementById('rps-banner-text');

        // Controls
        this.controls = document.getElementById('rps-controls');
        this.choiceButtons = document.querySelectorAll('.rps-choice-btn');

        // Next round
        this.nextAction = document.getElementById('rps-next-action');
        this.btnNext = document.getElementById('btn-rps-next');
        this.nextCountdown = document.getElementById('rps-next-countdown');

        // Modal
        this.resultModal = document.getElementById('rps-result-modal');
        this.resultIcon = document.getElementById('rps-result-icon');
        this.resultTitle = document.getElementById('rps-result-title');
        this.resultSub = document.getElementById('rps-result-sub');
        this.btnRematch = document.getElementById('btn-rps-rematch');
        this.btnSwitch = document.getElementById('btn-rps-switch');
        this.btnBack = document.getElementById('btn-rps-back');
    }

    getRoomId() {
        return this.roomData?.room_id || this.roomData?.id;
    }

    bindEvents() {
        const handleSwitchGame = () => {
            this.clearCountdown();
            this.resultModal?.classList.add('hidden');
            if (socketService.connected) {
                socketService.emit('switch_game');
            } else {
                this.onBackToGames?.();
            }
        };

        const handleLeaveToLobby = () => {
            this.clearCountdown();
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

        // Choice buttons
        this.choiceButtons.forEach((btn) => {
            btn.addEventListener('click', () => {
                const choice = btn.dataset.choice;
                this.handleMakeChoice(choice);
            });
        });

        // Next Round button
        if (this.btnNext) {
            this.btnNext.addEventListener('click', () => {
                this.clearCountdown();
                socketService.emit('rps_next_round', { room_id: this.getRoomId() });
            });
        }

        // Rematch button
        if (this.btnRematch) {
            this.btnRematch.addEventListener('click', () => {
                this.resultModal?.classList.add('hidden');
                socketService.emit('rps_restart', { room_id: this.getRoomId() });
            });
        }

        // Back to lobby from modal
        if (this.btnBack) {
            this.btnBack.addEventListener('click', handleLeaveToLobby);
        }

        // Socket listener for RPS state updates
        socketService.on('rps_update', (payload) => {
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

        this.render(initialState);
    }

    reset() {
        this.clearCountdown();
        this.roomData = null;
        this.state = null;
        this.resultModal?.classList.add('hidden');
        this.clearStageEffects();
    }

    clearCountdown() {
        if (this.nextRoundTimer) {
            clearInterval(this.nextRoundTimer);
            this.nextRoundTimer = null;
        }
    }

    clearStageEffects() {
        this.handP1?.classList.remove('locked', 'winner-glow', 'loser-glow', 'shaking');
        this.handP2?.classList.remove('locked', 'winner-glow', 'loser-glow', 'shaking');
        this.banner?.classList.remove('victory', 'tie', 'defeat');
    }

    handleMakeChoice(choice) {
        if (!this.roomData || !this.state) return;
        if (this.state.status === 'match_ended') return;

        const p1_sid = this.state.player1_sid;
        const my_sid = this.localPlayer.id;

        // If currently choosing and already chose, ignore
        if (this.state.status === 'choosing' && this.state.has_chosen?.[my_sid]) {
            return;
        }

        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            try { navigator.vibrate(20); } catch (_) {}
        }

        this.clearCountdown();
        socketService.emit('rps_choice', {
            room_id: this.getRoomId(),
            choice: choice,
        });
    }

    render(state) {
        if (!state) return;
        this.state = state;

        const p1_sid = state.player1_sid;
        const p2_sid = state.player2_sid;
        const my_sid = this.localPlayer?.id;
        const isP1 = my_sid === p1_sid;

        // 1. Update Scoreboard Names & Avatars
        if (this.nameP1) this.nameP1.textContent = state.player1_name + (isP1 ? ' (You)' : '');
        if (this.nameP2) this.nameP2.textContent = state.player2_name + (!isP1 ? ' (You)' : '');
        if (this.avatarP1) this.avatarP1.textContent = (state.player1_name || '1')[0].toUpperCase();
        if (this.avatarP2) this.avatarP2.textContent = (state.player2_name || '2')[0].toUpperCase();
        if (this.labelP1) this.labelP1.textContent = state.player1_name;
        if (this.labelP2) this.labelP2.textContent = state.player2_name;

        // Scores
        if (this.scoreP1) this.scoreP1.textContent = state.scores?.[p1_sid] ?? 0;
        if (this.scoreP2) this.scoreP2.textContent = state.scores?.[p2_sid] ?? 0;
        if (this.roundBadge) this.roundBadge.textContent = `Round ${state.round}`;

        // 2. Status Pills
        this.updateStatusPills(state, p1_sid, p2_sid);

        // 3. Hands & Stage Display
        this.updateStage(state, p1_sid, p2_sid, my_sid);

        // 4. Choice Buttons & Banner
        this.updateControlsAndBanner(state, my_sid);

        // 5. Match Ended Modal
        if (state.status === 'match_ended') {
            this.showMatchResult(state, my_sid);
        } else {
            this.resultModal?.classList.add('hidden');
        }
    }

    updateStatusPills(state, p1_sid, p2_sid) {
        const hasP1 = state.has_chosen?.[p1_sid];
        const hasP2 = state.has_chosen?.[p2_sid];

        if (state.status === 'choosing') {
            if (this.statusP1) {
                this.statusP1.textContent = hasP1 ? 'Ready! 🔒' : 'Thinking...';
                this.statusP1.className = `rps-status-pill ${hasP1 ? 'ready' : ''}`;
            }
            if (this.statusP2) {
                this.statusP2.textContent = hasP2 ? 'Ready! 🔒' : 'Thinking...';
                this.statusP2.className = `rps-status-pill ${hasP2 ? 'ready' : ''}`;
            }
        } else if (state.status === 'round_revealed' || state.status === 'match_ended') {
            const winner_sid = state.round_result?.winner_sid;
            if (this.statusP1) {
                this.statusP1.textContent = winner_sid === p1_sid ? 'Winner! 🏆' : (winner_sid ? 'Defeated' : 'Tied');
                this.statusP1.className = `rps-status-pill ${winner_sid === p1_sid ? 'winner' : ''}`;
            }
            if (this.statusP2) {
                this.statusP2.textContent = winner_sid === p2_sid ? 'Winner! 🏆' : (winner_sid ? 'Defeated' : 'Tied');
                this.statusP2.className = `rps-status-pill ${winner_sid === p2_sid ? 'winner' : ''}`;
            }
        }
    }

    updateStage(state, p1_sid, p2_sid, my_sid) {
        this.clearStageEffects();

        const emojiP1El = this.handP1?.querySelector('.rps-hand-emoji');
        const emojiP2El = this.handP2?.querySelector('.rps-hand-emoji');

        if (state.status === 'choosing') {
            // Secret blind commit stage
            const hasP1 = state.has_chosen?.[p1_sid];
            const hasP2 = state.has_chosen?.[p2_sid];
            const p1_choice = state.choices?.[p1_sid];
            const p2_choice = state.choices?.[p2_sid];

            if (emojiP1El) emojiP1El.textContent = p1_choice ? EMOJI_MAP[p1_choice] : (hasP1 ? '✊' : '❓');
            if (emojiP2El) emojiP2El.textContent = p2_choice ? EMOJI_MAP[p2_choice] : (hasP2 ? '✊' : '❓');

            if (hasP1) {
                this.handP1?.classList.add('locked');
                if (!p1_choice) this.handP1?.classList.add('shaking', 'left');
            }
            if (hasP2) {
                this.handP2?.classList.add('locked');
                if (!p2_choice) this.handP2?.classList.add('shaking', 'right');
            }
        } else if (state.status === 'round_revealed' || state.status === 'match_ended') {
            // Choices are now public
            const p1_choice = state.choices?.[p1_sid] || state.round_result?.p1_choice;
            const p2_choice = state.choices?.[p2_sid] || state.round_result?.p2_choice;

            if (emojiP1El) emojiP1El.textContent = EMOJI_MAP[p1_choice] || '❓';
            if (emojiP2El) emojiP2El.textContent = EMOJI_MAP[p2_choice] || '❓';

            const winner_sid = state.round_result?.winner_sid;
            if (winner_sid === p1_sid) {
                this.handP1?.classList.add('winner-glow');
                this.handP2?.classList.add('loser-glow');
            } else if (winner_sid === p2_sid) {
                this.handP2?.classList.add('winner-glow');
                this.handP1?.classList.add('loser-glow');
            } else {
                // Tie
                this.handP1?.classList.add('locked');
                this.handP2?.classList.add('locked');
            }
        }
    }

    updateControlsAndBanner(state, my_sid) {
        const my_choice = state.choices?.[my_sid];
        const has_chosen = state.has_chosen?.[my_sid];

        if (state.status === 'choosing') {
            this.nextAction?.classList.add('hidden');
            this.clearCountdown();

            // Choice button states
            this.choiceButtons.forEach((btn) => {
                const choice = btn.dataset.choice;
                if (has_chosen) {
                    btn.disabled = true;
                    btn.classList.toggle('selected', my_choice === choice);
                } else {
                    btn.disabled = false;
                    btn.classList.remove('selected');
                }
            });

            if (this.bannerText) {
                if (!has_chosen) {
                    this.bannerText.textContent = 'Choose your weapon!';
                } else {
                    this.bannerText.textContent = 'Choice locked in! Waiting for opponent...';
                }
            }
        } else if (state.status === 'round_revealed') {
            // Enable buttons so players can immediately tap their next choice if they want
            this.choiceButtons.forEach((btn) => {
                btn.disabled = false;
                btn.classList.remove('selected');
            });

            const winner_sid = state.round_result?.winner_sid;
            const isWinner = winner_sid === my_sid;
            const isTie = winner_sid === null;

            if (typeof navigator !== 'undefined' && navigator.vibrate) {
                try {
                    navigator.vibrate(isWinner ? [35, 45, 35] : (isTie ? 30 : 60));
                } catch (_) {}
            }

            if (this.bannerText) {
                this.bannerText.textContent = state.round_result?.reason || 'Round finished!';
            }
            if (this.banner) {
                this.banner.classList.toggle('victory', isWinner);
                this.banner.classList.toggle('tie', isTie);
                this.banner.classList.toggle('defeat', !isWinner && !isTie);
            }

            // Start auto-countdown to next round
            this.nextAction?.classList.remove('hidden');
            this.startNextRoundCountdown();
        } else if (state.status === 'match_ended') {
            this.nextAction?.classList.add('hidden');
            this.clearCountdown();
            this.choiceButtons.forEach((btn) => {
                btn.disabled = true;
                btn.classList.remove('selected');
            });
        }
    }

    startNextRoundCountdown() {
        this.clearCountdown();
        this.countdownValue = 3;
        if (this.nextCountdown) this.nextCountdown.textContent = '3';

        this.nextRoundTimer = setInterval(() => {
            this.countdownValue -= 1;
            if (this.nextCountdown) this.nextCountdown.textContent = String(this.countdownValue);

            if (this.countdownValue <= 0) {
                this.clearCountdown();
                socketService.emit('rps_next_round', { room_id: this.getRoomId() });
            }
        }, 1000);
    }

    showMatchResult(state, my_sid) {
        this.clearCountdown();
        const winner_sid = state.match_winner_sid;
        const winner_name = state.match_winner_name;
        const isWinner = winner_sid === my_sid;

        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            try {
                navigator.vibrate(isWinner ? [40, 60, 80] : [80]);
            } catch (_) {}
        }

        const p1_sid = state.player1_sid;
        const p2_sid = state.player2_sid;
        const s1 = state.scores?.[p1_sid] || 0;
        const s2 = state.scores?.[p2_sid] || 0;

        if (this.resultIcon) {
            this.resultIcon.textContent = isWinner ? '🏆' : '💀';
        }
        if (this.resultTitle) {
            this.resultTitle.textContent = isWinner ? 'Victory!' : 'Defeated';
        }
        if (this.resultSub) {
            this.resultSub.textContent = isWinner
                ? `You won the match ${Math.max(s1, s2)} - ${Math.min(s1, s2)}!`
                : `${winner_name} won the match ${Math.max(s1, s2)} - ${Math.min(s1, s2)}.`;
        }

        this.resultModal?.classList.remove('hidden');
    }
}
