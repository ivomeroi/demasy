/**
 * Typed access to persistent application settings with safe defaults.
 */
(function exposeSettingsService(root, factory) {
    const SettingsService = factory(
        root?.DEMASY_CONFIG || (typeof require === 'function' ? require('../core/demasy-config.js') : null)
    );

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = SettingsService;
    }

    if (root) {
        root.SettingsService = SettingsService;
    }
})(typeof window !== 'undefined' ? window : null, function createSettingsService(config) {
    class SettingsService {
        constructor(storage) {
            if (!storage || typeof storage.getSetting !== 'function' || typeof storage.setSetting !== 'function') {
                throw new TypeError('SettingsService requires getSetting and setSetting methods');
            }

            this.storage = storage;
            this.defaults = Object.freeze({
                cadenceRpm: 80,
                resistancePercent: 50,
                muscleType: 'quadriceps',
                chartWindowSeconds: config?.signal?.defaultChartWindowSeconds || 1,
                chartScaleMode: 'fixed',
                showLeftSignal: true,
                showRightSignal: true,
                showRms: true
            });
        }

        async get(key) {
            if (!Object.prototype.hasOwnProperty.call(this.defaults, key)) {
                throw new RangeError(`Unknown setting: ${key}`);
            }

            return this.storage.getSetting(key, this.defaults[key]);
        }

        async set(key, value) {
            if (!Object.prototype.hasOwnProperty.call(this.defaults, key)) {
                throw new RangeError(`Unknown setting: ${key}`);
            }

            const normalized = this.validate(key, value);
            await this.storage.setSetting(key, normalized);
            return normalized;
        }

        async getAll() {
            const entries = await Promise.all(
                Object.keys(this.defaults).map(async key => [key, await this.get(key)])
            );
            return Object.fromEntries(entries);
        }

        validate(key, value) {
            if (key === 'cadenceRpm') return this.numberInRange(value, 30, 200, key);
            if (key === 'resistancePercent') return this.numberInRange(value, 0, 100, key);
            if (key === 'chartWindowSeconds') return this.numberInRange(value, 1, 60, key);

            if (key === 'chartScaleMode' && !['auto', 'fixed'].includes(value)) {
                throw new RangeError('chartScaleMode must be auto or fixed');
            }

            if (['showLeftSignal', 'showRightSignal', 'showRms'].includes(key) && typeof value !== 'boolean') {
                throw new TypeError(`${key} must be a boolean`);
            }

            if (key === 'muscleType' && (typeof value !== 'string' || value.trim() === '')) {
                throw new TypeError('muscleType must be a non-empty string');
            }

            return value;
        }

        numberInRange(value, minimum, maximum, key) {
            const numeric = Number(value);
            if (!Number.isFinite(numeric) || numeric < minimum || numeric > maximum) {
                throw new RangeError(`${key} must be between ${minimum} and ${maximum}`);
            }
            return numeric;
        }
    }

    return SettingsService;
});
