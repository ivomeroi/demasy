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
            this.setTimeoutFn = options.setTimeoutFn || setTimeout;
            this.clearTimeoutFn = options.clearTimeoutFn || clearTimeout;
            this.callbacks = { onDataUpdate: null, onStatsUpdate: null };
        }

        start(config = {}) {
            if (Array.isArray(config.samples)) this.samples = config.samples;
            if (Number.isFinite(config.speed) && config.speed > 0) this.speed = config.speed;
            this.reset();
            this.status = 'running';
            this.scheduleNext();
        }

        pause() {
            if (this.status !== 'running') return;
            this.status = 'paused';
            this.cancelTimer();
        }

        resume() {
            if (this.status !== 'paused') return;
            this.status = 'running';
            this.scheduleNext();
        }

        stop() {
            this.status = 'stopped';
            this.cancelTimer();
        }

        reset() {
            this.stop();
            this.index = 0;
        }

        getStatus() {
            return this.status;
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
                this.stop();
                this.status = 'completed';
                return;
            }

            this.index += 1;
            this.callbacks.onDataUpdate?.(sample);
            this.callbacks.onStatsUpdate?.(this.getStats());
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
    }

    return ReplaySignalSource;
});
