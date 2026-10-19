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
        this._submitTimeout = null;

        // Restore previously remembered nickname from localStorage
        try {
            const savedName = localStorage.getItem('two_players_player_name');
            if (savedName && this._nameInput && !this._nameInput.value) {
                this._nameInput.value = savedName;
            }
        } catch (_) {}

        this._setupListeners();
        // Immediately validate input on init (handles autofill and restored name)
        this._validateInput();
    }

    _setupListeners() {
        if (!this._nameInput || !this._btnJoin) return;

        // Multiple events guarantee autofill, pasting, and typing are caught
        ['input', 'change', 'keyup', 'paste', 'focus'].forEach((evt) => {
            this._nameInput.addEventListener(evt, () => this._validateInput());
        });

        this._nameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this._validateInput();
                if (!this._btnJoin.disabled) {
                    this._submit();
                }
            }
        });

        this._btnJoin.addEventListener('click', (e) => {
            e.preventDefault();
            this._submit();
        });
    }

    _validateInput() {
        const val = this._nameInput ? this._nameInput.value.trim() : '';
        const isValid = val.length > 0 && val.length <= CONFIG.MAX_NAME_LENGTH;
        if (this._btnJoin) {
            this._btnJoin.disabled = !isValid;
        }
        return isValid;
    }

    _setButtonLoading(loading) {
        if (!this._btnJoin) return;
        const btnText = this._btnJoin.querySelector('.btn-text');
        if (btnText) {
            btnText.textContent = loading ? 'Entering...' : 'Enter Arena';
        }
    }

    enableSubmit() {
        if (this._submitTimeout) {
            clearTimeout(this._submitTimeout);
            this._submitTimeout = null;
        }
        this._setButtonLoading(false);
        this._validateInput();
    }

    _submit() {
        const name = this._nameInput ? this._nameInput.value.trim() : '';
        if (!name) return;

        if (!socketService.connected) {
            toastService.error('Connecting to server... Please wait a second and try again.');
            this.enableSubmit();
            return;
        }

        // Save name for convenience across page reloads
        try {
            localStorage.setItem('two_players_player_name', name);
        } catch (_) {}

        this._btnJoin.disabled = true;
        this._setButtonLoading(true);

        // Safety timeout: re-enable after 6 seconds if server has not responded
        if (this._submitTimeout) clearTimeout(this._submitTimeout);
        this._submitTimeout = setTimeout(() => {
            this.enableSubmit();
        }, 6000);

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
        this.enableSubmit();
    }

    /** Refresh validation state based on current input value. */
    refresh() {
        this.enableSubmit();
    }
}


