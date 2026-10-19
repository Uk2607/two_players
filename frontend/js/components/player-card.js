/**
 * PlayerCard Component — Renders a single player item in the lobby.
 */

import { escapeHtml, getAvatarColors } from '../utils/helpers.js';

/**
 * Creates a player list item element.
 * @param {object} player - { id, name, status }
 * @param {string} currentSocketId - ID of the local player
 * @param {Function} onChallenge - Callback when challenge button is clicked
 * @returns {HTMLElement}
 */
export function createPlayerCard(player, currentSocketId, onChallenge) {
    const isSelf = player.id === currentSocketId;
    const isBusy = player.status === 'in-game';

    const item = document.createElement('div');
    item.className = 'player-item';
    item.dataset.id = player.id;

    const statusLabel = isBusy ? 'In Game' : 'Available';
    const statusClass = isBusy ? 'in-game' : 'available';

    item.innerHTML = `
        <div class="player-item-info">
            <div class="player-item-avatar" style="background: ${getAvatarColors(player.name)}">
                ${escapeHtml(player.name.charAt(0))}
            </div>
            <div>
                <div class="player-item-name">${escapeHtml(player.name)}</div>
                <div class="player-item-status ${statusClass}">${statusLabel}</div>
            </div>
        </div>
        <div class="player-item-action">
            ${isSelf
                ? '<span style="font-size: 0.8rem; color: var(--text-muted); font-weight: 500;">(You)</span>'
                : `<button class="btn-challenge" ${isBusy ? 'disabled' : ''} data-id="${player.id}">
                     ${isBusy ? 'Busy' : 'Challenge'}
                   </button>`
            }
        </div>
    `;

    if (!isSelf && !isBusy) {
        const btn = item.querySelector('.btn-challenge');
        btn.addEventListener('click', () => onChallenge(player));
    }

    return item;
}
