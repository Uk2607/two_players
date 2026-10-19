/**
 * RegisterScreen — Handles player nickname entry and server registration.
 */

import { $ } from '../utils/helpers.js';
import { CONFIG } from '../config.js';
import { socketService } from '../services/socket-service.js';
import { toastService } from '../services/toast-service.js';

export class RegisterScreen {
    /**
     * @param {object} options
     * @param {Function} options.onRegistered - Callback(playerData) when registered
     */
    constructor({ onRegistered }) {
        this._onRegistered = onRegistered;
        this._nameInput = $('#player-name');
        this._btnJoin = $('#btn-join');
        this._connectionStatus = $('#connection-status');
        this._statusText = this._connectionStatus?.querySelector('.status-text');

        this._setupListeners();
    }

    _setupListeners() {
        if (!this._nameInput || !this._btnJoin) return;

        this._nameInput.addEventListener('input', () => this._validateInput());
        this._nameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !this._btnJoin.disabled) {
                this._submit();
            }
        });

        this._btnJoin.addEventListener('click', () => this._submit());
    }

    _validateInput() {
        const val = this._nameInput.value.trim();
        this._btnJoin.disabled = val.length === 0 || val.length > CONFIG.MAX_NAME_LENGTH;
    }

    _submit() {
        const name = this._nameInput.value.trim();
        if (!name) return;

        if (!socketService.connected) {
            toastService.error('Not connected to game server. Please wait...');
            return;
        }

        this._btnJoin.disabled = true;
        socketService.emit('register', { name });
    }

    /**
     * Update connection status indicator UI.
     * @param {'connected'|'connecting'|'error'} state
     * @param {string} message
     */
    setConnectionStatus(state, message) {
        if (!this._connectionStatus || !this._statusText) return;

        this._connectionStatus.className = 'connection-status';
        if (state === 'connected') {
            this._connectionStatus.classList.add('connected');
        } else if (state === 'error') {
            this._connectionStatus.classList.add('error');
        }

        this._statusText.textContent = message;
    }

    /** Reset input state. */
    reset() {
        if (this._nameInput) {
            this._nameInput.value = '';
            this._btnJoin.disabled = true;
        }
    }
}
