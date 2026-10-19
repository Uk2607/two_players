/**
 * InviteModal Component — Manages the challenge incoming modal dialog.
 */

import { $, escapeHtml } from '../utils/helpers.js';

class InviteModal {
    constructor() {
        this._modal = $('#invite-modal');
        this._title = $('#invite-modal-title');
        this._text = $('#invite-modal-text');
        this._btnAccept = $('#btn-accept-invite');
        this._btnDecline = $('#btn-decline-invite');

        this._onAccept = null;
        this._onDecline = null;

        this._setupListeners();
    }

    _setupListeners() {
        if (!this._btnAccept || !this._btnDecline) return;

        this._btnAccept.addEventListener('click', () => {
            this.hide();
            this._onAccept?.();
        });

        this._btnDecline.addEventListener('click', () => {
            this.hide();
            this._onDecline?.();
        });
    }

    /**
     * Show incoming challenge modal.
     * @param {string} fromName - Name of player sending the challenge
     * @param {Function} onAccept - Callback on accept
     * @param {Function} onDecline - Callback on decline
     */
    show(fromName, onAccept, onDecline) {
        if (!this._modal) return;

        this._onAccept = onAccept;
        this._onDecline = onDecline;

        if (this._text) {
            this._text.innerHTML = `<strong>${escapeHtml(fromName)}</strong> wants to play with you!`;
        }

        this._modal.classList.remove('hidden');
    }

    /** Hide the modal. */
    hide() {
        if (this._modal) {
            this._modal.classList.add('hidden');
        }
        this._onAccept = null;
        this._onDecline = null;
    }
}

export const inviteModal = new InviteModal();
