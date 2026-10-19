/**
 * ScreenManager — Handles screen transitions.
 * Screens register by name; only one is active at a time.
 */

import { $ } from '../utils/helpers.js';

class ScreenManager {
    constructor() {
        /** @type {Map<string, HTMLElement>} */
        this._screens = new Map();
        this._current = null;
    }

    /**
     * Register a screen by name.
     * @param {string} name
     * @param {string} selector - CSS selector for the screen element
     */
    register(name, selector) {
        const el = $(selector);
        if (el) this._screens.set(name, el);
    }

    /**
     * Show a screen by name, hiding all others.
     * @param {string} name
     */
    show(name) {
        this._screens.forEach((el, key) => {
            el.classList.toggle('active', key === name);
        });
        this._current = name;
    }

    /** @returns {string|null} The name of the currently active screen. */
    get current() {
        return this._current;
    }
}

// Singleton instance
export const screenManager = new ScreenManager();
