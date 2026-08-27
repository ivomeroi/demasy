/**
 * Pure time-domain analysis used by simulated and replayed sessions.
 * DEMASY v1 intentionally excludes fatigue analysis.
 */
(function exposeAnalysisService(root, factory) {
    const AnalysisService = factory(
        root?.DEMASY_CONFIG || (typeof require === 'function' ? require('../core/demasy-config.js') : null)
    );

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = AnalysisService;
    }

    if (root) {
        root.AnalysisService = AnalysisService;
    }
})(typeof window !== 'undefined' ? window : null, function createAnalysisService(config) {
    class AnalysisService {
        constructor(options = {}) {
            this.thresholds = options.thresholds || config?.symmetry || {
                highMinimum: 90,
                mildMinimum: 75,
                moderateMinimum: 60,
                labels: {
                    high: 'Simetría alta',
                    mild: 'Diferencia leve',
                    moderate: 'Diferencia moderada',
                    marked: 'Diferencia marcada'
                }
            };
        }

        finiteValues(values) {
            if (!Array.isArray(values)) return [];
            return values.map(Number).filter(Number.isFinite);
        }

        calculateSide(values) {
            const finite = this.finiteValues(values);

            if (finite.length === 0) {
                return { count: 0, rms: 0, mav: 0, peakAmplitude: 0, min: 0, max: 0 };
            }

            const squaredTotal = finite.reduce((sum, value) => sum + value * value, 0);
            const absoluteTotal = finite.reduce((sum, value) => sum + Math.abs(value), 0);

            return {
                count: finite.length,
                rms: Math.sqrt(squaredTotal / finite.length),
                mav: absoluteTotal / finite.length,
                peakAmplitude: finite.reduce((peak, value) => Math.max(peak, Math.abs(value)), 0),
                min: Math.min(...finite),
                max: Math.max(...finite)
            };
        }

        calculateBilateral(leftRms, rightRms) {
            const left = Number.isFinite(Number(leftRms)) ? Math.max(0, Number(leftRms)) : 0;
            const right = Number.isFinite(Number(rightRms)) ? Math.max(0, Number(rightRms)) : 0;
            const maximum = Math.max(left, right);
            const minimum = Math.min(left, right);
            const symmetryIndex = maximum === 0 ? 100 : minimum / maximum * 100;
            const difference = 100 - symmetryIndex;

            return {
                symmetryIndex,
                difference,
                dominantSide: left === right ? 'balanced' : left > right ? 'left' : 'right',
                asymmetryLevel: this.classifySymmetry(symmetryIndex)
            };
        }

        classifySymmetry(symmetryIndex) {
            const value = Number(symmetryIndex);
            const labels = this.thresholds.labels;

            if (!Number.isFinite(value) || value >= this.thresholds.highMinimum) return labels.high;
            if (value >= this.thresholds.mildMinimum) return labels.mild;
            if (value >= this.thresholds.moderateMinimum) return labels.moderate;
            return labels.marked;
        }

        analyzeSamples(samples) {
            const list = Array.isArray(samples) ? samples : [];
            const leftValues = list.map(sample => sample?.left?.amplitude);
            const rightValues = list.map(sample => sample?.right?.amplitude);
            const left = this.calculateSide(leftValues);
            const right = this.calculateSide(rightValues);

            return {
                left,
                right,
                bilateral: this.calculateBilateral(left.rms, right.rms)
            };
        }
    }

    return AnalysisService;
});
