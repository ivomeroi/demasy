/**
 * Signal source that replays normalized samples from a stored session.
 */
(function exposeReplaySource(root, factory) {
    const ReplaySignalSource = factory(
        root?.AnalysisService || (typeof require === 'function' ? require('./analysis-service.js') : null)
    );

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = ReplaySignalSource;
    }

    if (root) {
        root.ReplaySignalSource = ReplaySignalSource;
    }
})(typeof window !== 'undefined' ? window : null, function createReplaySource(AnalysisService) {
    class ReplaySignalSource {
        constructor(samples = [], options = {}) {
            this.samples = Array.isArray(samples) ? samples : [];
            this.speed = options.speed || 1;
            this.index = 0;
            this.status = 'stopped';
            this.timer = null;
            this.analysisService = options.analysisService || new AnalysisService();
            const schedule = options.setTimeoutFn || ((callback, delay) => setTimeout(callback, delay));
            const cancel = options.clearTimeoutFn || (timer => clearTimeout(timer));
            this.setTimeoutFn = (callback, delay) => schedule(callback, delay);
            this.clearTimeoutFn = timer => cancel(timer);
            this.callbacks = { onDataUpdate: null, onStatsUpdate: null, onStatusChange: null, onProgress: null };
        }

        start(config = {}) {
            if (Array.isArray(config.samples)) this.samples = config.samples;
            if (Number.isFinite(config.speed) && config.speed > 0) this.speed = config.speed;
            this.reset();
            this.status = 'running';
            this.emitStatus();
            this.scheduleNext();
        }

        pause() {
            if (this.status !== 'running') return;
            this.status = 'paused';
            this.cancelTimer();
            this.emitStatus();
        }

        resume() {
            if (this.status !== 'paused') return;
            this.status = 'running';
            this.emitStatus();
            this.scheduleNext();
        }

        stop() {
            this.status = 'stopped';
            this.cancelTimer();
            this.emitStatus();
        }

        reset() {
            this.stop();
            this.index = 0;
        }

        getStatus() {
            return this.status;
        }

        setSpeed(speed) {
            const numeric = Number(speed);
            if (![0.5, 1, 2].includes(numeric)) throw new Error('Velocidad de reproducción inválida');
            this.speed = numeric;
            if (this.status === 'running') {
                this.cancelTimer();
                this.scheduleNext();
            }
        }

        getStats() {
            return this.analysisService.analyzeSamples(this.samples.slice(0, this.index));
        }

        onDataUpdate(callback) {
            this.callbacks.onDataUpdate = callback;
        }

        onStatsUpdate(callback) {
            this.callbacks.onStatsUpdate = callback;
        }

        emitNext() {
            if (this.status !== 'running') return;

            const sample = this.samples[this.index];
            if (!sample) {
                this.cancelTimer();
                this.status = 'completed';
                this.emitStatus();
                this.callbacks.onProgress?.({ index: this.index, total: this.samples.length, percent: 100 });
                return;
            }

            this.index += 1;
            this.callbacks.onDataUpdate?.(sample);
            if (this.callbacks.onStatsUpdate) this.callbacks.onStatsUpdate(this.getStats());
            this.callbacks.onProgress?.({
                index: this.index,
                total: this.samples.length,
                percent: this.samples.length ? (this.index / this.samples.length) * 100 : 100
            });
            this.scheduleNext();
        }

        scheduleNext() {
            if (this.status !== 'running') return;
            const current = this.samples[this.index];
            const previous = this.samples[Math.max(0, this.index - 1)];
            const deltaSeconds = Math.max(0, Number(current?.time) - Number(previous?.time) || 0.01);
            this.timer = this.setTimeoutFn(() => this.emitNext(), deltaSeconds * 1000 / this.speed);
        }

        cancelTimer() {
            if (this.timer !== null) this.clearTimeoutFn(this.timer);
            this.timer = null;
        }

        onStatusChange(callback) { this.callbacks.onStatusChange = callback; }
        onProgress(callback) { this.callbacks.onProgress = callback; }
        emitStatus() { this.callbacks.onStatusChange?.(this.status); }
    }

    return ReplaySignalSource;
});
