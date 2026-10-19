/**
 * Configuration — Centralized app settings.
 */

const getHost = () => {
    const hostname = window.location.hostname;
    // Map 0.0.0.0 to localhost to avoid Chromium Private Network Access (PNA) restrictions
    if (!hostname || hostname === '0.0.0.0') {
        return 'localhost';
    }
    return hostname;
};

export const CONFIG = {
    SERVER_URL: `http://${getHost()}:5050`,
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

