/**
 * Helpers — Pure utility functions used across the app.
 */

/**
 * Generate a deterministic avatar gradient from a player name.
 * @param {string} name
 * @returns {string} CSS linear-gradient value
 */
export function getAvatarColors(name) {
    const hues = [260, 180, 340, 30, 150, 0, 210, 45];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const idx = Math.abs(hash) % hues.length;
    return `linear-gradient(135deg, hsl(${hues[idx]}, 70%, 55%), hsl(${(hues[idx] + 40) % 360}, 70%, 45%))`;
}

/**
 * Escape HTML to prevent XSS in dynamic content.
 * @param {string} str
 * @returns {string}
 */
export function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/**
 * Shorthand DOM selector.
 * @param {string} selector
 * @returns {Element}
 */
export const $ = (selector) => document.querySelector(selector);
