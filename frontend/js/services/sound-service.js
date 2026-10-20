/**
 * Two Players — Sound Service
 * Synthesizes high-fidelity Web Audio API chimes with zero external file dependencies.
 */

class SoundService {
    constructor() {
        this._ctx = null;
    }

    _getAudioContext() {
        if (!this._ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) {
                this._ctx = new AudioCtx();
            }
        }
        if (this._ctx && this._ctx.state === 'suspended') {
            this._ctx.resume().catch(() => {});
        }
        return this._ctx;
    }

    /**
     * Play a crystal-clear, pleasant 2-tone glass chime for incoming messages.
     */
    playMessagePing() {
        try {
            const ctx = this._getAudioContext();
            if (!ctx) return;

            const now = ctx.currentTime;

            // Tone 1: High crisp glass chime (A5 880Hz -> E6 1318Hz)
            const osc1 = ctx.createOscillator();
            const gain1 = ctx.createGain();
            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(880, now);
            osc1.frequency.exponentialRampToValueAtTime(1318.5, now + 0.08);

            gain1.gain.setValueAtTime(0.2, now);
            gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

            osc1.connect(gain1);
            gain1.connect(ctx.destination);
            osc1.start(now);
            osc1.stop(now + 0.32);

            // Tone 2: Harmonic warm chime body
            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.type = 'triangle';
            osc2.frequency.setValueAtTime(1318.5, now + 0.06);

            gain2.gain.setValueAtTime(0.14, now + 0.06);
            gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            osc2.start(now + 0.06);
            osc2.stop(now + 0.4);
        } catch (_) {
            // AudioContext not supported or blocked by browser policy
        }
    }
}

export const soundService = new SoundService();
