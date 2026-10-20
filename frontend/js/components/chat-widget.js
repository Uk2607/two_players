/**
 * Two Players — Room Chat Widget Component
 * Floating, collapsible in-room chat with room activity events, unread notifications,
 * Web Audio ping sound, and distinct message styling.
 */

import { socketService } from '../services/socket-service.js';
import { soundService } from '../services/sound-service.js';

export class ChatWidget {
    constructor() {
        this.isOpen = false;
        this.unreadCount = 0;
        this.currentRoom = null;
        this.localPlayer = null;
        this.partner = null;
        this.messages = [];

        this.cacheElements();
        this.bindEvents();
    }

    cacheElements() {
        this.widget = document.getElementById('room-chat-widget');
        this.fabBtn = document.getElementById('chat-fab-btn');
        this.unreadBadge = document.getElementById('chat-unread-badge');
        this.chatCard = document.getElementById('chat-box-card');
        this.headerTitle = document.getElementById('chat-header-title');
        this.btnMinimize = document.getElementById('btn-chat-minimize');
        this.btnClose = document.getElementById('btn-chat-close');
        this.messagesArea = document.getElementById('chat-messages-area');
        this.inputForm = document.getElementById('chat-input-form');
        this.textInput = document.getElementById('chat-text-input');
        this.btnSend = document.getElementById('btn-chat-send');
    }

    bindEvents() {
        // Toggle open on FAB click
        this.fabBtn?.addEventListener('click', () => {
            this.open();
        });

        // Minimize / Close buttons
        this.btnMinimize?.addEventListener('click', () => {
            this.close();
        });

        this.btnClose?.addEventListener('click', () => {
            this.close();
        });

        // Form submit to send message
        this.inputForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSend();
        });
    }

    /**
     * Initialize chat session for a paired room.
     * @param {object} roomData - Room info with players
     * @param {object} localPlayer - Currently logged-in player
     */
    initRoom(roomData, localPlayer) {
        this.currentRoom = roomData;
        this.localPlayer = localPlayer;

        // Resolve opponent
        const p1 = roomData.player1 || { id: roomData.player1_sid, name: roomData.player1_name };
        const p2 = roomData.player2 || { id: roomData.player2_sid, name: roomData.player2_name };
        this.partner = p1.id === localPlayer.id ? p2 : p1;

        // Header format: <user> & <opponent_name>
        const headingText = `${localPlayer.name} & ${this.partner?.name || 'Partner'}`;
        if (this.headerTitle) {
            this.headerTitle.textContent = headingText;
        }

        // Reset memory for fresh room
        this.messages = [];
        if (this.messagesArea) {
            this.messagesArea.innerHTML = '';
        }
        this.unreadCount = 0;
        this.updateUnreadBadge();

        // Make chat available in-room (start collapsed)
        this.widget?.classList.remove('hidden');
        this.close();
    }

    /**
     * Completely clear and reset chat when players leave the room.
     */
    clear() {
        this.currentRoom = null;
        this.localPlayer = null;
        this.partner = null;
        this.messages = [];
        this.unreadCount = 0;

        if (this.messagesArea) {
            this.messagesArea.innerHTML = '';
        }

        this.updateUnreadBadge();
        this.close();

        // Hide completely in lobby/player list
        this.widget?.classList.add('hidden');
    }

    open() {
        this.isOpen = true;
        this.chatCard?.classList.remove('hidden');
        this.fabBtn?.classList.add('hidden');

        // Clear unread badge on open
        this.unreadCount = 0;
        this.updateUnreadBadge();

        this.scrollToBottom();
        setTimeout(() => this.textInput?.focus(), 100);
    }

    close() {
        this.isOpen = false;
        this.chatCard?.classList.add('hidden');
        this.fabBtn?.classList.remove('hidden');
    }

    updateUnreadBadge() {
        if (!this.unreadBadge) return;
        if (this.unreadCount > 0) {
            this.unreadBadge.textContent = this.unreadCount > 9 ? '9+' : String(this.unreadCount);
            this.unreadBadge.classList.remove('hidden');
        } else {
            this.unreadBadge.classList.add('hidden');
            this.unreadBadge.textContent = '0';
        }
    }

    handleSend() {
        const text = this.textInput?.value?.trim();
        if (!text || !this.currentRoom) return;

        socketService.emit('send_chat_message', {
            room_id: this.currentRoom.room_id || this.currentRoom.id,
            message: text,
        });

        if (this.textInput) {
            this.textInput.value = '';
        }
    }

    /**
     * Handle incoming chat or room activity message from server.
     * @param {object} payload
     */
    receiveMessage(payload) {
        if (!payload) return;
        this.messages.push(payload);

        const isActivity = payload.type === 'activity';
        const isFromMe = payload.sender_id === this.localPlayer?.id;

        // Render message into stream
        this.renderMessageBubble(payload, isFromMe, isActivity);

        // Audio ping sound on new incoming chat message (even if chat box is open)
        if (!isFromMe && !isActivity) {
            soundService.playMessagePing();
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
                try { navigator.vibrate([25, 40]); } catch (_) {}
            }
        }

        // If chat box is collapsed, notify on the chat icon badge
        if (!this.isOpen && !isFromMe) {
            this.unreadCount++;
            this.updateUnreadBadge();
        }

        this.scrollToBottom();
    }

    renderMessageBubble(msg, isFromMe, isActivity) {
        if (!this.messagesArea) return;

        const timeStr = msg.timestamp
            ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        if (isActivity) {
            // Room activity update pill (e.g., game selected, player left, etc.)
            const actEl = document.createElement('div');
            actEl.className = 'chat-activity-pill';
            actEl.textContent = msg.text;
            this.messagesArea.appendChild(actEl);
            return;
        }

        const msgRow = document.createElement('div');
        msgRow.className = `chat-msg-row ${isFromMe ? 'from-me' : 'from-opponent'}`;

        const bubble = document.createElement('div');
        bubble.className = `chat-bubble ${isFromMe ? 'bubble-me' : 'bubble-opponent'}`;

        if (!isFromMe) {
            const senderHeader = document.createElement('div');
            senderHeader.className = 'chat-sender-header';
            senderHeader.textContent = msg.sender_name || 'Opponent';
            bubble.appendChild(senderHeader);
        }

        const textEl = document.createElement('div');
        textEl.className = 'chat-msg-text';
        textEl.textContent = msg.text;
        bubble.appendChild(textEl);

        const timeEl = document.createElement('div');
        timeEl.className = 'chat-msg-time';
        timeEl.textContent = timeStr;
        bubble.appendChild(timeEl);

        msgRow.appendChild(bubble);
        this.messagesArea.appendChild(msgRow);
    }

    scrollToBottom() {
        if (this.messagesArea) {
            this.messagesArea.scrollTop = this.messagesArea.scrollHeight;
        }
    }
}
