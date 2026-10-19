/**
 * Two Players — Main Application Entry Point
 * Orchestrates screens, services, games, and real-time multiplayer state.
 */

import { socketService } from './services/socket-service.js';
import { screenManager } from './services/screen-manager.js';
import { toastService } from './services/toast-service.js';

import { RegisterScreen } from './screens/register-screen.js';
import { LobbyScreen } from './screens/lobby-screen.js';
import { GamesScreen } from './screens/games-screen.js';
import { TicTacToeGame } from './games/tic-tac-toe.js';

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

        // Setup global server socket listeners
        this.setupGlobalSocketHandlers();

        // Connect to Socket.IO backend
        this.registerScreen.setConnectionStatus('connecting', 'Connecting to server...');

        socketService.connect({
            onConnect: () => {
                this.registerScreen.setConnectionStatus('connected', 'Connected to arena');
            },
            onDisconnect: () => {
                this.registerScreen.setConnectionStatus('error', 'Disconnected from server');
                toastService.error('Connection to server lost. Reconnecting...');
            },
            onError: (err) => {
                this.registerScreen.setConnectionStatus('error', 'Server unreachable');
            },
        });

        // Show registration screen initially
        screenManager.show('register');
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
    }

    handleRegistered(player) {
        this.localPlayer = player;
        this.lobbyScreen.setCurrentPlayer(player);
        screenManager.show('lobby');
        toastService.success(`Welcome, ${player.name}!`);
    }

    handlePaired(roomData) {
        this.currentRoom = roomData;
        this.gamesScreen.setRoom(roomData, this.localPlayer);
        screenManager.show('games');
    }

    handleLaunchGame(gameId, roomData, state) {
        if (gameId === 'tic-tac-toe') {
            this.ticTacToeGame.start(roomData, this.localPlayer, state);
            screenManager.show('game-arena');
        } else {
            toastService.info(`${gameId} arena coming next!`);
        }
    }

    handleBackToGames() {
        screenManager.show('games');
    }

    handleLeaveGameRoom() {
        this.currentRoom = null;
        screenManager.show('lobby');
    }
}

// Start application when DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    window.__twoPlayersApp = new App();
});
