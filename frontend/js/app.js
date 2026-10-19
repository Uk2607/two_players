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

        // Setup browser lifecycle listeners for clean disconnect
        this.setupWindowUnloadHandlers();

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
        const notifyLeave = () => {
            if (this.currentRoom && socketService.connected) {
                socketService.emit('leave_pair');
            }
        };

        window.addEventListener('beforeunload', notifyLeave);
        window.addEventListener('pagehide', notifyLeave);
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
        if (socketService.connected) {
            socketService.emit('leave_pair');
        } else {
            this.endSessionAndReturnToLobby();
        }
    }

    /**
     * Terminate the active game session, reset all state, and navigate to the Lobby player list.
     * @param {string} [message] - Optional message for toast notification
     * @param {'info'|'success'|'error'} [type] - Toast style type
     */
    endSessionAndReturnToLobby(message = '', type = 'info') {
        // 1. Reset game arena state and close any open modals
        this.ticTacToeGame.reset();

        // 2. Clear current room on games screen and app state
        this.currentRoom = null;
        this.gamesScreen.clearRoom();

        // 3. Return to the Player List lobby screen
        screenManager.show('lobby');

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
