/**
 * Two Players — Main Application Entry Point
 * Orchestrates screens, services, games, and real-time multiplayer state.
 */

import { CONFIG } from './config.js';
import { socketService } from './services/socket-service.js';
import { screenManager } from './services/screen-manager.js';
import { toastService } from './services/toast-service.js';

import { RegisterScreen } from './screens/register-screen.js';
import { LobbyScreen } from './screens/lobby-screen.js';
import { GamesScreen } from './screens/games-screen.js';
import { TicTacToeGame } from './games/tic-tac-toe.js';
import { RockPaperScissorsGame } from './games/rock-paper-scissors.js';
import { ConnectFourGame } from './games/connect-four.js';
import { MemoryMatchGame } from './games/memory-match.js';
import { WordDuelGame } from './games/word-duel.js';

class App {
    constructor() {
        /** @type {{ id: string, name: string } | null} */
        this.localPlayer = null;
        /** @type {object | null} */
        this.currentRoom = null;

        this.init();
    }

    init() {
        // Register screens in the ScreenManager
        screenManager.register('register', '#screen-register');
        screenManager.register('lobby', '#screen-lobby');
        screenManager.register('games', '#screen-games');
        screenManager.register('game-arena', '#screen-game-arena');
        screenManager.register('rps-arena', '#screen-rps-arena');
        screenManager.register('c4-arena', '#screen-c4-arena');
        screenManager.register('memory-arena', '#screen-memory-arena');
        screenManager.register('word-arena', '#screen-word-arena');

        // Initialize screens
        this.registerScreen = new RegisterScreen({
            onRegistered: (player) => this.handleRegistered(player),
        });

        this.lobbyScreen = new LobbyScreen({
            onPaired: (roomData) => this.handlePaired(roomData),
        });

        this.gamesScreen = new GamesScreen({
            onLeave: () => this.handleLeaveGameRoom(),
            onLaunchGame: (gameId, roomData, state) => this.handleLaunchGame(gameId, roomData, state),
        });

        // Initialize games
        this.ticTacToeGame = new TicTacToeGame({
            onBackToGames: () => this.handleBackToGames(),
        });

        this.rpsGame = new RockPaperScissorsGame({
            onBackToGames: () => this.handleBackToGames(),
        });

        this.c4Game = new ConnectFourGame({
            onBackToGames: () => this.handleBackToGames(),
        });

        this.memoryGame = new MemoryMatchGame({
            onBackToGames: () => this.handleBackToGames(),
        });

        this.wordGame = new WordDuelGame({
            onBackToGames: () => this.handleBackToGames(),
        });

        // Setup global server socket listeners
        this.setupGlobalSocketHandlers();

        // Setup browser lifecycle listeners for clean disconnect
        this.setupWindowUnloadHandlers();

        // Setup lobby back / logout button
        const btnLobbyBack = document.getElementById('btn-lobby-back');
        if (btnLobbyBack) {
            btnLobbyBack.addEventListener('click', () => {
                this.handleLogoutLobby();
            });
        }

        // Setup browser history back button handling
        window.addEventListener('popstate', (e) => {
            const screen = e.state?.screen || 'register';
            if (screenManager.current === 'game-arena' || screenManager.current === 'rps-arena' || screenManager.current === 'c4-arena' || screenManager.current === 'memory-arena' || screenManager.current === 'word-arena' || screenManager.current === 'games') {
                this.handleLeaveGameRoom();
            } else if (screenManager.current === 'lobby' && screen === 'register') {
                this.handleLogoutLobby();
            }
        });

        // Connect to Socket.IO backend
        this.registerScreen.setConnectionStatus('connecting', 'Connecting to server...');

        socketService.connect({
            onConnect: () => {
                this.registerScreen.setConnectionStatus('connected', 'Connected to arena');
            },
            onDisconnect: () => {
                this.registerScreen.setConnectionStatus('error', 'Disconnected from server');
                // If in active room when disconnecting, return to lobby/register
                if (this.currentRoom) {
                    this.endSessionAndReturnToLobby('Connection to server lost. Reconnecting...', 'error');
                }
            },
            onError: (err) => {
                this.registerScreen.setConnectionStatus('error', 'Server unreachable');
            },
        });

        // Show registration screen initially
        screenManager.show('register');
        window.history.replaceState({ screen: 'register' }, '', '#register');
    }

    setupGlobalSocketHandlers() {
        // Server emitted an error message
        socketService.on('error', (err) => {
            const message = typeof err === 'object' && err.message ? err.message : String(err);
            toastService.error(message);
        });

        // Successful registration
        socketService.on('registered', (data) => {
            this.handleRegistered(data);
        });

        // Player unregistered (e.g. from logout)
        socketService.on('unregistered', () => {
            this.localPlayer = null;
            screenManager.show('register');
            window.history.replaceState({ screen: 'register' }, '', '#register');
        });

        // Partner closed the tab or lost connection
        socketService.on('partner_disconnected', (data) => {
            const partnerName = data?.name || 'Your partner';
            this.endSessionAndReturnToLobby(`${partnerName} closed the page. Game ended.`, 'error');
        });

        // Partner voluntarily left the game
        socketService.on('partner_left', (data) => {
            const partnerName = data?.name || 'Your partner';
            this.endSessionAndReturnToLobby(`${partnerName} left the game. Returned to player list.`, 'info');
        });

        // Local player voluntary leave confirmed by server
        socketService.on('left_pair', () => {
            this.endSessionAndReturnToLobby('You left the game and returned to player list.', 'info');
        });
    }

    setupWindowUnloadHandlers() {
        const handleTabClose = () => {
            const sid = socketService.id;
            if (!sid) return;

            // Immediately notify backend that this player closed the page/tab
            // Using sendBeacon guarantees the request is delivered during tab closure
            const url = `${CONFIG.SERVER_URL}/api/leave`;
            const payload = JSON.stringify({ sid });

            if (navigator.sendBeacon) {
                const blob = new Blob([payload], { type: 'application/json' });
                navigator.sendBeacon(url, blob);
            } else {
                fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: payload,
                    keepalive: true,
                });
            }

            // Disconnect socket immediately
            socketService.disconnect();
        };

        window.addEventListener('pagehide', handleTabClose);
        window.addEventListener('beforeunload', handleTabClose);
    }

    handleRegistered(player) {
        this.localPlayer = player;
        this.lobbyScreen.setCurrentPlayer(player);
        screenManager.show('lobby');
        window.history.pushState({ screen: 'lobby' }, '', '#lobby');
        toastService.success(`Welcome, ${player.name}!`);
    }

    handlePaired(roomData) {
        this.currentRoom = roomData;
        this.gamesScreen.setRoom(roomData, this.localPlayer);
        screenManager.show('games');
        window.history.pushState({ screen: 'games' }, '', '#games');
    }

    handleLaunchGame(gameId, roomData, state) {
        if (gameId === 'tic-tac-toe') {
            this.ticTacToeGame.start(roomData, this.localPlayer, state);
            screenManager.show('game-arena');
            window.history.pushState({ screen: 'game-arena' }, '', '#game-arena');
        } else if (gameId === 'rock-paper-scissors') {
            this.rpsGame.start(roomData, this.localPlayer, state);
            screenManager.show('rps-arena');
            window.history.pushState({ screen: 'rps-arena' }, '', '#rps-arena');
        } else if (gameId === 'connect-four') {
            this.c4Game.start(roomData, this.localPlayer, state);
            screenManager.show('c4-arena');
            window.history.pushState({ screen: 'c4-arena' }, '', '#c4-arena');
        } else if (gameId === 'memory-match') {
            this.memoryGame.start(roomData, this.localPlayer, state);
            screenManager.show('memory-arena');
            window.history.pushState({ screen: 'memory-arena' }, '', '#memory-arena');
        } else if (gameId === 'word-duel') {
            this.wordGame.start(roomData, this.localPlayer, state);
            screenManager.show('word-arena');
            window.history.pushState({ screen: 'word-arena' }, '', '#word-arena');
        } else {
            toastService.info(`${gameId} arena coming next!`);
        }
    }

    handleBackToGames() {
        screenManager.show('games');
    }

    handleLeaveGameRoom() {
        if (socketService.connected) {
            socketService.emit('leave_pair');
        } else {
            this.endSessionAndReturnToLobby();
        }
    }

    handleLogoutLobby() {
        if (socketService.connected) {
            socketService.emit('unregister');
        }
        this.localPlayer = null;
        this.currentRoom = null;
        this.ticTacToeGame.reset();
        this.rpsGame.reset();
        this.c4Game.reset();
        this.memoryGame.reset();
        this.wordGame.reset();
        this.gamesScreen.clearRoom();
        this.registerScreen.reset();
        screenManager.show('register');
        window.history.pushState({ screen: 'register' }, '', '#register');
        toastService.info('You left the player list.');
    }


    /**
     * Terminate the active game session, reset all state, and navigate to the Lobby player list.
     * @param {string} [message] - Optional message for toast notification
     * @param {'info'|'success'|'error'} [type] - Toast style type
     */
    endSessionAndReturnToLobby(message = '', type = 'info') {
        // 1. Reset game arena state and close any open modals
        this.ticTacToeGame.reset();
        this.rpsGame.reset();
        this.c4Game.reset();
        this.memoryGame.reset();
        this.wordGame.reset();

        // 2. Clear current room on games screen and app state
        this.currentRoom = null;
        this.gamesScreen.clearRoom();

        // 3. Return to the Player List lobby screen
        screenManager.show('lobby');
        window.history.pushState({ screen: 'lobby' }, '', '#lobby');

        // 4. Show notification if a message was provided
        if (message) {
            toastService.show(message, type);
        }
    }
}

// Start application when DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    window.__twoPlayersApp = new App();
});

