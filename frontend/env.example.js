/**
 * Frontend Environment Configuration Template
 * Copy this file to `frontend/env.js` to override runtime settings for production deployment.
 * `frontend/env.js` is ignored by Git and will not be committed.
 */
window.__ENV__ = {
    // If your backend is hosted on a separate domain/port in production, specify it here:
    // e.g.: 'https://two-players-backend.up.railway.app'
    // Leave blank or empty string '' for local auto-discovery:
    BACKEND_URL: '',

    // Custom port if backend is on a non-default local port:
    PORT: 5050,
};
