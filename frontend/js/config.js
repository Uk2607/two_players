/**
 * Configuration — Centralized app settings.
 * Supports window.__ENV__ runtime overrides from env.js or deployment.
 */

const getBackendUrl = () => {
    // 1. Explicit deployment override via window.__ENV__ (from env.js or deployment inject)
    if (window.__ENV__?.BACKEND_URL && window.__ENV__.BACKEND_URL.trim() !== '') {
        return window.__ENV__.BACKEND_URL.trim().replace(/\/+$/, '');
    }

    // 2. Derive host dynamically from current browser location (supports WiFi/LAN & localhost)
    const hostname = window.location.hostname;
    const host = (!hostname || hostname === '0.0.0.0') ? 'localhost' : hostname;
    const port = window.__ENV__?.PORT || 5050;

    return `http://${host}:${port}`;
};

export const CONFIG = {
    SERVER_URL: getBackendUrl(),
    SOCKET_OPTIONS: {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: Infinity,
        timeout: 10000,
    },
    TOAST_DURATION_MS: 3500,
    MAX_NAME_LENGTH: 16,
};


