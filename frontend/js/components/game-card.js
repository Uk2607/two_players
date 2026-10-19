/**
 * GameCard Component — Renders an interactive game card.
 */

import { escapeHtml } from '../utils/helpers.js';

/**
 * Creates a game selection card element.
 * @param {object} game - { id, title, desc, icon, tag, color }
 * @param {Function} onSelect - Callback when card is selected
 * @returns {HTMLElement}
 */
export function createGameCard(game, onSelect) {
    const card = document.createElement('div');
    card.className = 'game-card';
    card.setAttribute('data-color', game.color);
    card.setAttribute('data-id', game.id);

    card.innerHTML = `
        <div class="game-card-icon">${game.icon}</div>
        <h3 class="game-card-title">${escapeHtml(game.title)}</h3>
        <p class="game-card-desc">${escapeHtml(game.desc)}</p>
        <span class="game-card-tag">${escapeHtml(game.tag)}</span>
    `;

    card.addEventListener('click', () => onSelect(game));

    return card;
}
