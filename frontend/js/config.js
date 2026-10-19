/**
 * Configuration — Centralized app settings.
 */

export const CONFIG = {
    SERVER_URL: `http://${window.location.hostname || 'localhost'}:5050`,
    SOCKET_OPTIONS: {
        transports: ['polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 10,
    },
    TOAST_DURATION_MS: 3500,
    MAX_NAME_LENGTH: 16,
};
