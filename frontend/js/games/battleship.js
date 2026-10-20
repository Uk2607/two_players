/**
 * Two Players — Battleship Game Controller
 * Manages fleet placement, auto-deployment, dual radar targeting, and naval victory modals.
 */

import { socketService } from '../services/socket-service.js';
import { toastService } from '../services/toast-service.js';

const GRID_SIZE = 6;
const FLEET_DEFINITIONS = [
    { id: 0, name: 'Carrier', size: 3 },
    { id: 1, name: 'Cruiser', size: 2 },
    { id: 2, name: 'Patrol Boat', size: 2 },
];

export class BattleshipGame {
    /**
     * @param {object} options
     * @param {() => void} [options.onBackToGames]
     */
    constructor(options = {}) {
        this.onBackToGames = options.onBackToGames;

        this.roomData = null;
        this.localPlayer = null;
        this.state = null;
        this.myPlannedShips = [];
        this.lastShotMessage = null;
        this.lastWatersHits = 0;

        this.cacheElements();
        this.bindEvents();
    }

    cacheElements() {
        // Headers & Badges
        this.pairBadge = document.getElementById('bs-pair-badge');
        this.btnLeave = document.getElementById('btn-leave-bs');

        // Scoreboard
        this.cardP1 = document.getElementById('bs-card-p1');
        this.nameP1 = document.getElementById('bs-name-p1');
        this.avatarP1 = document.getElementById('bs-avatar-p1');
        this.scoreP1 = document.getElementById('bs-score-p1');

        this.cardP2 = document.getElementById('bs-card-p2');
        this.nameP2 = document.getElementById('bs-name-p2');
        this.avatarP2 = document.getElementById('bs-avatar-p2');
        this.scoreP2 = document.getElementById('bs-score-p2');

        this.phaseBadge = document.getElementById('bs-phase-badge');
        this.hitsCounter = document.getElementById('bs-hits-counter');

        // Turn Banner
        this.turnBanner = document.getElementById('bs-turn-banner');
        this.turnDot = document.getElementById('bs-turn-dot');
        this.turnText = document.getElementById('bs-turn-text');

        // Deployment Panel
        this.deploymentPanel = document.getElementById('bs-deployment-panel');
        this.btnAutoDeploy = document.getElementById('btn-bs-auto-deploy');
        this.btnLockFleet = document.getElementById('btn-bs-lock-fleet');

        // Fleet Intel Bar
        this.fleetIntel = document.getElementById('bs-fleet-intel');
        this.intelCarrier = document.getElementById('intel-carrier');
        this.intelCruiser = document.getElementById('intel-cruiser');
        this.intelPatrol = document.getElementById('intel-patrol');

        // Mobile Tabs
        this.mobileTabs = document.getElementById('bs-mobile-tabs');
        this.tabEnemy = document.getElementById('btn-tab-enemy');
        this.tabFriendly = document.getElementById('btn-tab-friendly');
        this.friendlyBadge = document.getElementById('bs-friendly-badge');

        // Grids & Sections
        this.theatreStage = document.getElementById('bs-theatre-stage');
        this.enemySection = document.getElementById('bs-enemy-section');
        this.friendlySection = document.getElementById('bs-friendly-section');
        this.friendlyTitle = document.getElementById('bs-friendly-title');
        this.enemyRadarGrid = document.getElementById('bs-enemy-radar-grid');
        this.friendlyFleetGrid = document.getElementById('bs-friendly-fleet-grid');

        // Result Modal
        this.resultModal = document.getElementById('bs-result-modal');
        this.resultIcon = document.getElementById('bs-result-icon');
        this.resultTitle = document.getElementById('bs-result-title');
        this.resultSub = document.getElementById('bs-result-sub');
        this.btnRematch = document.getElementById('btn-bs-rematch');
        this.btnSwitch = document.getElementById('btn-bs-switch');
        this.btnBack = document.getElementById('btn-bs-back');
    }

    getRoomId() {
        return this.roomData?.room_id || this.roomData?.id;
    }

    vibrate(pattern) {
        try {
            if ('vibrate' in navigator) {
                navigator.vibrate(pattern);
            }
        } catch (_) {}
    }

    switchTab(tab) {
        this.vibrate(10);
        if (tab === 'enemy') {
            this.theatreStage?.classList.remove('active-tab-friendly');
            this.theatreStage?.classList.add('active-tab-enemy');
            this.tabEnemy?.classList.add('active');
            this.tabFriendly?.classList.remove('active');
        } else {
            this.theatreStage?.classList.remove('active-tab-enemy');
            this.theatreStage?.classList.add('active-tab-friendly');
            this.tabFriendly?.classList.add('active');
            this.tabEnemy?.classList.remove('active');
            this.friendlyBadge?.classList.add('hidden');
        }
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

        // Mobile Tab Switchers
        if (this.tabEnemy) {
            this.tabEnemy.addEventListener('click', () => this.switchTab('enemy'));
        }
        if (this.tabFriendly) {
            this.tabFriendly.addEventListener('click', () => this.switchTab('friendly'));
        }

        // Auto Deploy button
        if (this.btnAutoDeploy) {
            this.btnAutoDeploy.addEventListener('click', () => {
                this.vibrate(15);
                this.generateRandomFleet();
                this.renderPlannedShips();
                if (this.btnLockFleet) this.btnLockFleet.disabled = false;
            });
        }

        // Lock in fleet button
        if (this.btnLockFleet) {
            this.btnLockFleet.addEventListener('click', () => {
                if (this.myPlannedShips.length !== FLEET_DEFINITIONS.length) {
                    toastService.info('Please arrange your fleet first!');
                    return;
                }
                this.vibrate(25);
                this.btnLockFleet.disabled = true;
                if (this.btnAutoDeploy) this.btnAutoDeploy.disabled = true;
                toastService.success('⚓ Fleet locked in! Awaiting enemy...');
                socketService.emit('battleship_deploy', {
                    room_id: this.getRoomId(),
                    ships: this.myPlannedShips,
                });
            });
        }

        // Enemy Radar grid clicks (torpedo strike)
        if (this.enemyRadarGrid) {
            this.enemyRadarGrid.addEventListener('click', (e) => {
                const cell = e.target.closest('.bs-cell');
                if (cell) {
                    const r = parseInt(cell.dataset.row, 10);
                    const c = parseInt(cell.dataset.col, 10);
                    this.handleFire(r, c);
                }
            });
        }

        // Rematch button
        if (this.btnRematch) {
            this.btnRematch.addEventListener('click', () => {
                this.resultModal?.classList.add('hidden');
                socketService.emit('battleship_restart', { room_id: this.getRoomId() });
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
        socketService.on('battleship_update', (payload) => {
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

        this.buildGrids();

        // Default auto-deploy a fleet ready to lock in
        this.generateRandomFleet();
        this.renderPlannedShips();

        this.render(initialState);
    }

    reset() {
        this.roomData = null;
        this.state = null;
        this.myPlannedShips = [];
        this.lastShotMessage = null;
        this.lastWatersHits = 0;
        this.resultModal?.classList.add('hidden');
        this.cardP1?.classList.remove('active-turn');
        this.cardP2?.classList.remove('active-turn');
        this.friendlyBadge?.classList.add('hidden');
        this.switchTab('enemy');
    }

    buildGrids() {
        if (this.enemyRadarGrid) {
            this.enemyRadarGrid.innerHTML = '';
            for (let r = 0; r < GRID_SIZE; r++) {
                for (let c = 0; c < GRID_SIZE; c++) {
                    const cell = document.createElement('div');
                    cell.className = 'bs-cell';
                    cell.dataset.row = String(r);
                    cell.dataset.col = String(c);
                    cell.id = `enemy-cell-${r}-${c}`;
                    this.enemyRadarGrid.appendChild(cell);
                }
            }
        }

        if (this.friendlyFleetGrid) {
            this.friendlyFleetGrid.innerHTML = '';
            for (let r = 0; r < GRID_SIZE; r++) {
                for (let c = 0; c < GRID_SIZE; c++) {
                    const cell = document.createElement('div');
                    cell.className = 'bs-cell';
                    cell.dataset.row = String(r);
                    cell.dataset.col = String(c);
                    cell.id = `friendly-cell-${r}-${c}`;
                    this.friendlyFleetGrid.appendChild(cell);
                }
            }
        }
    }

    generateRandomFleet() {
        this.myPlannedShips = [];
        const occupied = new Set();

        FLEET_DEFINITIONS.forEach((def) => {
            let placed = false;
            let attempts = 0;

            while (!placed && attempts < 100) {
                attempts++;
                const isHorizontal = Math.random() < 0.5;
                const r = isHorizontal ? Math.floor(Math.random() * GRID_SIZE) : Math.floor(Math.random() * (GRID_SIZE - def.size + 1));
                const c = isHorizontal ? Math.floor(Math.random() * (GRID_SIZE - def.size + 1)) : Math.floor(Math.random() * GRID_SIZE);

                const cells = [];
                let overlaps = false;
                for (let i = 0; i < def.size; i++) {
                    const cr = isHorizontal ? r : r + i;
                    const cc = isHorizontal ? c + i : c;
                    if (occupied.has(`${cr},${cc}`)) {
                        overlaps = true;
                        break;
                    }
                    cells.push([cr, cc]);
                }

                if (!overlaps) {
                    cells.forEach(([cr, cc]) => occupied.add(`${cr},${cc}`));
                    this.myPlannedShips.push({
                        id: def.id,
                        name: def.name,
                        cells: cells,
                    });
                    placed = true;
                }
            }
        });
    }

    renderPlannedShips() {
        if (!this.friendlyFleetGrid) return;

        // Clear all ship classes
        this.friendlyFleetGrid.querySelectorAll('.bs-cell').forEach((cell) => {
            cell.classList.remove('ship');
        });

        // Add ship class for planned cells
        this.myPlannedShips.forEach((ship) => {
            ship.cells.forEach(([r, c]) => {
                const cell = document.getElementById(`friendly-cell-${r}-${c}`);
                cell?.classList.add('ship');
            });
        });
    }

    handleFire(r, c) {
        if (!this.state || this.state.phase !== 'combat' || this.state.status !== 'in_progress') return;

        if (this.state.turn_sid !== this.localPlayer?.id) {
            toastService.info("Wait for enemy strike!");
            return;
        }

        const coordKey = `${r},${c}`;
        if (this.state.enemy_radar_shots && this.state.enemy_radar_shots[coordKey]) {
            toastService.info("Already targeted this sector!");
            return;
        }

        this.vibrate(20);

        socketService.emit('battleship_fire', {
            room_id: this.getRoomId(),
            row: r,
            col: c,
        });
    }

    render(state) {
        if (!state) return;
        this.state = state;

        const p1_sid = state.player1_sid;
        const p2_sid = state.player2_sid;
        const my_sid = this.localPlayer?.id;
        const isP1 = my_sid === p1_sid;
        const isMyTurn = state.turn_sid === my_sid && state.phase === 'combat' && state.status === 'in_progress';
        const isP1Turn = state.turn_sid === p1_sid && state.phase === 'combat' && state.status === 'in_progress';
        const isP2Turn = state.turn_sid === p2_sid && state.phase === 'combat' && state.status === 'in_progress';

        // 1. Scoreboard Names, Avatars & Active Turn Glow
        this.cardP1?.classList.toggle('active-turn', isP1Turn);
        this.cardP2?.classList.toggle('active-turn', isP2Turn);

        if (this.nameP1) this.nameP1.textContent = state.player1_name + (isP1 ? ' (You)' : '');
        if (this.nameP2) this.nameP2.textContent = state.player2_name + (!isP1 ? ' (You)' : '');
        if (this.avatarP1) this.avatarP1.textContent = (state.player1_name || '1')[0].toUpperCase();
        if (this.avatarP2) this.avatarP2.textContent = (state.player2_name || '2')[0].toUpperCase();

        if (this.scoreP1) this.scoreP1.textContent = state.scores?.[p1_sid] ?? 0;
        if (this.scoreP2) this.scoreP2.textContent = state.scores?.[p2_sid] ?? 0;

        if (this.phaseBadge) {
            this.phaseBadge.textContent = state.phase === 'placement' ? 'Deployment' : 'Combat Phase';
        }
        if (this.hitsCounter) {
            const hits = state.hits_count?.[my_sid] ?? 0;
            this.hitsCounter.textContent = `Hits: ${hits} / ${state.hits_needed}`;
        }

        // 2. Deployment vs Combat Phase UI visibility
        const isPlacement = state.phase === 'placement';
        this.theatreStage?.classList.toggle('phase-placement', isPlacement);

        if (isPlacement) {
            this.deploymentPanel?.classList.remove('hidden');
            this.fleetIntel?.classList.add('hidden');
            this.mobileTabs?.classList.add('hidden');
            if (this.friendlyTitle) this.friendlyTitle.textContent = '⚓ Deploy Your Fleet (3 Ships)';

            const isReady = state.ready?.[my_sid];
            if (this.btnLockFleet) this.btnLockFleet.disabled = isReady;
            if (this.btnAutoDeploy) this.btnAutoDeploy.disabled = isReady;

            if (this.turnText) {
                this.turnText.textContent = isReady
                    ? 'Fleet locked! Waiting for enemy deployment...'
                    : 'Deploy your 3 warships, Commander!';
            }
        } else {
            this.deploymentPanel?.classList.add('hidden');
            this.fleetIntel?.classList.remove('hidden');
            this.mobileTabs?.classList.remove('hidden');
            if (this.friendlyTitle) this.friendlyTitle.textContent = '🛡️ My Fleet Waters';
        }

        // 3. Turn Banner & Tactical Feedback in Combat
        if (state.phase === 'combat') {
            if (this.turnBanner && this.turnText && this.turnDot) {
                this.turnBanner.classList.toggle('my-turn', isMyTurn);
                this.turnDot.className = `bs-turn-dot ${state.turn_sid === p2_sid ? 'p2' : ''}`;

                if (state.last_shot) {
                    this.turnText.textContent = state.last_shot.message;
                    this.turnBanner.classList.toggle('direct-hit', state.last_shot.result !== 'miss');

                    // Audio/Haptic notification for new shots
                    if (state.last_shot.message !== this.lastShotMessage) {
                        this.lastShotMessage = state.last_shot.message;
                        if (state.last_shot.result === 'sunk') {
                            this.vibrate([50, 70, 50, 90]);
                        } else if (state.last_shot.result === 'hit') {
                            this.vibrate([30, 40, 50]);
                        } else if (state.last_shot.result === 'miss') {
                            this.vibrate(15);
                        }
                    }
                } else {
                    this.turnText.textContent = isMyTurn ? 'Target confirmed! Select sector to fire.' : "Radar tracking enemy torpedoes...";
                }
            }
        }

        // 4. Update Enemy Fleet Intel status
        if (state.enemy_fleet_status && Array.isArray(state.enemy_fleet_status)) {
            state.enemy_fleet_status.forEach((ship) => {
                const isSunk = !!ship.sunk;
                if (ship.name === 'Carrier') {
                    this.intelCarrier?.classList.toggle('sunk', isSunk);
                } else if (ship.name === 'Cruiser') {
                    this.intelCruiser?.classList.toggle('sunk', isSunk);
                } else if (ship.name === 'Patrol Boat' || ship.name === 'Patrol') {
                    this.intelPatrol?.classList.toggle('sunk', isSunk);
                }
            });
        }

        // 5. Friendly incoming hit notification for mobile tab badge
        const currentMyHits = Object.values(state.my_waters_shots || {}).filter(v => v === 'hit').length;
        if (this.lastWatersHits !== undefined && currentMyHits > this.lastWatersHits) {
            if (this.theatreStage?.classList.contains('active-tab-enemy')) {
                this.friendlyBadge?.classList.remove('hidden');
            }
        }
        this.lastWatersHits = currentMyHits;

        // 6. Update Enemy Radar Grid (shots I fired at enemy)
        if (this.enemyRadarGrid) {
            this.enemyRadarGrid.classList.toggle('targetable', isMyTurn);

            for (let r = 0; r < GRID_SIZE; r++) {
                for (let c = 0; c < GRID_SIZE; c++) {
                    const cell = document.getElementById(`enemy-cell-${r}-${c}`);
                    if (!cell) continue;

                    const coord = `${r},${c}`;
                    const shot = state.enemy_radar_shots?.[coord];

                    cell.classList.remove('hit', 'miss');
                    if (shot === 'hit') {
                        cell.classList.add('hit');
                        cell.textContent = '💥';
                    } else if (shot === 'miss') {
                        cell.classList.add('miss');
                        cell.textContent = '💧';
                    } else {
                        cell.textContent = '';
                    }
                }
            }
        }

        // 7. Update Friendly Fleet Grid (my ships + enemy shots on my waters)
        if (this.friendlyFleetGrid && state.my_fleet) {
            const shipCells = new Set();
            state.my_fleet.forEach((ship) => {
                ship.cells.forEach(([r, c]) => shipCells.add(`${r},${c}`));
            });

            for (let r = 0; r < GRID_SIZE; r++) {
                for (let c = 0; c < GRID_SIZE; c++) {
                    const cell = document.getElementById(`friendly-cell-${r}-${c}`);
                    if (!cell) continue;

                    const coord = `${r},${c}`;
                    const hasShip = shipCells.has(coord);
                    const incomingShot = state.my_waters_shots?.[coord];

                    cell.classList.toggle('ship', hasShip);
                    cell.classList.remove('hit', 'miss');

                    if (incomingShot === 'hit') {
                        cell.classList.add('hit');
                        cell.textContent = '💥';
                    } else if (incomingShot === 'miss') {
                        cell.classList.add('miss');
                        cell.textContent = '💧';
                    } else {
                        cell.textContent = hasShip ? '🚢' : '';
                    }
                }
            }
        }

        // 8. Match Result Modal
        if (state.phase === 'match_ended' || state.status === 'won') {
            this.showRoundResult(state, my_sid);
        } else {
            this.resultModal?.classList.add('hidden');
        }
    }

    showRoundResult(state, my_sid) {
        this.vibrate([40, 60, 40, 80]);
        const isWinner = state.winner_sid === my_sid;
        if (this.resultIcon) this.resultIcon.textContent = isWinner ? '🏆' : '🌊';
        if (this.resultTitle) this.resultTitle.textContent = isWinner ? 'Naval Victory!' : 'Fleet Sunk!';
        if (this.resultSub) {
            this.resultSub.textContent = isWinner
                ? 'You annihilated all 3 enemy warships!'
                : `${state.winner_name} sank your entire fleet.`;
        }
        this.resultModal?.classList.remove('hidden');
    }
}
