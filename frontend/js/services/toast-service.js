/**
 * ToastService — Manages toast notification display.
 */

import { CONFIG } from '../config.js';
import { $ } from '../utils/helpers.js';

class ToastService {
    constructor() {
        this._container = null;
    }

    /** Lazy-initialize the container reference. */
    _getContainer() {
        if (!this._container) {
            this._container = $('#toast-container');
        }
        return this._container;
    }

    /**
     * Show a toast notification.
     * @param {string} message - The message to display.
     * @param {'info'|'success'|'error'} type - Toast type for styling.
     */
    show(message, type = 'info') {
        const container = this._getContainer();
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);

        setTimeout(() => toast.remove(), CONFIG.TOAST_DURATION_MS);
    }

    /** Shorthand for success toast. */
    success(message) { this.show(message, 'success'); }

    /** Shorthand for error toast. */
    error(message) { this.show(message, 'error'); }

    /** Shorthand for info toast. */
    info(message) { this.show(message, 'info'); }
}

// Singleton instance
export const toastService = new ToastService();
