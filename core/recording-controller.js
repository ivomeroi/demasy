/**
 * Deterministic recording state machine, independent from the DOM and signal source.
 */
(function exposeRecordingController(root, factory) {
    const RecordingController = factory();

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = RecordingController;
    }

    if (root) root.RecordingController = RecordingController;
})(typeof window !== 'undefined' ? window : null, function createRecordingController() {
    const transitions = Object.freeze({
        idle: ['ready'],
        ready: ['recording', 'idle'],
        recording: ['paused', 'review'],
        paused: ['recording', 'review'],
        review: ['saved', 'ready', 'idle'],
        saved: ['ready', 'idle']
    });

    class RecordingController {
        constructor(options = {}) {
            this.now = options.now || (() => performance.now());
            this.state = 'idle';
            this.configuration = null;
            this.startedAtMs = null;
            this.pausedAtMs = null;
            this.totalPausedMs = 0;
            this.finishedAtMs = null;
            this.listeners = new Set();
        }

        configure(configuration) {
            if (['recording', 'paused'].includes(this.state)) {
                throw new Error('No se puede reconfigurar una sesión activa');
            }
            this.configuration = Object.freeze({ ...configuration });
            this.resetClock();
            this.transition('ready');
            return this.configuration;
        }

        clearConfiguration() {
            if (['recording', 'paused'].includes(this.state)) {
                throw new Error('No se puede limpiar una sesión activa');
            }
            this.configuration = null;
            this.resetClock();
            this.transition('idle');
        }

        start() {
            this.requireState('ready');
            this.resetClock();
            this.startedAtMs = this.now();
            this.transition('recording');
        }

        restoreReview(configuration, elapsedSeconds = 0) {
            if (['recording', 'paused'].includes(this.state)) throw new Error('No se puede restaurar sobre una sesión activa');
            this.configuration = Object.freeze({ ...configuration });
            this.startedAtMs = 0;
            this.pausedAtMs = null;
            this.totalPausedMs = 0;
            this.finishedAtMs = Math.max(0, Number(elapsedSeconds) || 0) * 1000;
            this.state = 'review';
            const snapshot = this.getSnapshot();
            this.listeners.forEach(listener => listener(snapshot));
            return snapshot;
        }

        pause() {
            this.requireState('recording');
            this.pausedAtMs = this.now();
            this.transition('paused');
        }

        resume() {
            this.requireState('paused');
            this.totalPausedMs += Math.max(0, this.now() - this.pausedAtMs);
            this.pausedAtMs = null;
            this.transition('recording');
        }

        finish() {
            if (!['recording', 'paused'].includes(this.state)) {
                throw new Error(`No se puede finalizar desde ${this.state}`);
            }
            const finishedAt = this.now();
            if (this.state === 'paused') {
                this.totalPausedMs += Math.max(0, finishedAt - this.pausedAtMs);
                this.pausedAtMs = null;
            }
            this.finishedAtMs = finishedAt;
            this.transition('review');
        }

        discard() {
            if (this.state !== 'review') {
                throw new Error(`No se puede descartar desde ${this.state}`);
            }
            this.resetClock();
            this.transition(this.configuration ? 'ready' : 'idle');
        }

        markSaved() {
            this.requireState('review');
            this.transition('saved');
        }

        prepareNext() {
            this.requireState('saved');
            this.resetClock();
            this.transition('ready');
        }

        getElapsedMilliseconds(at = this.now()) {
            if (this.startedAtMs === null) return 0;
            const end = this.finishedAtMs ?? (this.pausedAtMs ?? at);
            return Math.max(0, end - this.startedAtMs - this.totalPausedMs);
        }

        getElapsedSeconds(at = this.now()) {
            return this.getElapsedMilliseconds(at) / 1000;
        }

        getSnapshot() {
            return {
                state: this.state,
                configuration: this.configuration,
                elapsedSeconds: this.getElapsedSeconds()
            };
        }

        can(action) {
            const allowed = {
                configure: !['recording', 'paused'].includes(this.state),
                start: this.state === 'ready',
                pause: this.state === 'recording',
                resume: this.state === 'paused',
                finish: ['recording', 'paused'].includes(this.state),
                discard: this.state === 'review',
                save: this.state === 'review'
            };
            return Boolean(allowed[action]);
        }

        subscribe(listener) {
            this.listeners.add(listener);
            return () => this.listeners.delete(listener);
        }

        resetClock() {
            this.startedAtMs = null;
            this.pausedAtMs = null;
            this.totalPausedMs = 0;
            this.finishedAtMs = null;
        }

        requireState(expected) {
            if (this.state !== expected) {
                throw new Error(`Transición inválida: se esperaba ${expected} y el estado es ${this.state}`);
            }
        }

        transition(nextState) {
            if (nextState !== this.state && !transitions[this.state]?.includes(nextState)) {
                throw new Error(`Transición inválida: ${this.state} → ${nextState}`);
            }
            this.state = nextState;
            const snapshot = this.getSnapshot();
            this.listeners.forEach(listener => listener(snapshot));
        }
    }

    RecordingController.STATES = Object.freeze(Object.keys(transitions));
    return RecordingController;
});
