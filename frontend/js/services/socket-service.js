/**
 * SocketService — Manages the Socket.IO connection lifecycle.
 * Thin wrapper that centralizes connect/disconnect/emit and
 * queues listeners even before socket connects.
 */

import { CONFIG } from '../config.js';

class SocketService {
    constructor() {
        /** @type {import('socket.io-client').Socket | null} */
        this._socket = null;
        /** @type {Array<{ event: string, callback: Function }>} */
        this._queuedListeners = [];
    }

    /**
     * Initialize the Socket.IO connection.
     * @param {object} callbacks - { onConnect, onDisconnect, onError }
     */
    connect({ onConnect, onDisconnect, onError } = {}) {
        // `io` is loaded globally from the CDN <script> tag
        this._socket = io(CONFIG.SERVER_URL, CONFIG.SOCKET_OPTIONS);

        // Attach any queued event listeners
        this._queuedListeners.forEach(({ event, callback }) => {
            this._socket.on(event, callback);
        });
        this._queuedListeners = [];

        this._socket.on('connect', () => {
            console.log('[Socket] Connected:', this._socket.id);
            onConnect?.();
        });

        this._socket.on('disconnect', () => {
            console.log('[Socket] Disconnected');
            onDisconnect?.();
        });

        this._socket.on('connect_error', (err) => {
            console.error('[Socket] Connection error:', err.message);
            onError?.(err);
        });
    }

    /**
     * Subscribe to a server event.
     * @param {string} event
     * @param {Function} callback
     */
    on(event, callback) {
        if (this._socket) {
            this._socket.on(event, callback);
        } else {
            this._queuedListeners.push({ event, callback });
        }
    }

    /**
     * Emit an event to the server.
     * @param {string} event
     * @param {*} data
     */
    emit(event, data = {}) {
        if (!this._socket) {
            console.warn(`[Socket] Cannot emit "${event}" — not connected yet`);
            return;
        }
        this._socket.emit(event, data);
    }

    /** @returns {boolean} Whether the socket is currently connected */
    get connected() {
        return this._socket?.connected ?? false;
    }

    /** @returns {string|null} The current socket ID */
    get id() {
        return this._socket?.id ?? null;
    }

    /** Explicitly disconnect the socket. */
    disconnect() {
        if (this._socket) {
            this._socket.disconnect();
        }
    }
}


// Singleton instance
export const socketService = new SocketService();
