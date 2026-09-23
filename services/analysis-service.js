/**
 * Pure time-domain analysis used by simulated and replayed sessions.
 * DEMASY v1 intentionally excludes fatigue analysis.
 */
(function exposeAnalysisService(root, factory) {
    const AnalysisService = factory(
        root?.DEMASY_CONFIG || (typeof require === 'function' ? require('../core/demasy-config.js') : null),
        root?.EMGChannelContract || (typeof require === 'function' ? require('../core/emg-channel-contract.js') : null)
    );

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = AnalysisService;
    }

    if (root) {
        root.AnalysisService = AnalysisService;
    }
})(typeof window !== 'undefined' ? window : null, function createAnalysisService(config, channelContract) {
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
                return {
                    count: 0, mean: 0, dcOffset: 0, rms: 0, mav: 0, peakAmplitude: 0,
                    min: 0, max: 0, peakToPeak: 0, waveformLength: 0, zeroCrossings: 0,
                    shannonEntropy: 0, meanNormalizedActivation: 0, noiseSigma: 0
                };
            }

            const mean = finite.reduce((sum, value) => sum + value, 0) / finite.length;
            const centered = finite.map(value => value - mean);
            const squaredTotal = centered.reduce((sum, value) => sum + value * value, 0);
            const absoluteTotal = centered.reduce((sum, value) => sum + Math.abs(value), 0);
            const peakAmplitude = centered.reduce((peak, value) => Math.max(peak, Math.abs(value)), 0);
            let minimum = Infinity;
            let maximum = -Infinity;
            for (const value of centered) {
                if (value < minimum) minimum = value;
                if (value > maximum) maximum = value;
            }

            return {
                count: finite.length,
                mean,
                dcOffset: mean,
                rms: Math.sqrt(squaredTotal / finite.length),
                mav: absoluteTotal / finite.length,
                peakAmplitude,
                min: minimum,
                max: maximum,
                peakToPeak: maximum - minimum,
                waveformLength: centered.slice(1).reduce((total, value, index) => total + Math.abs(value - centered[index]), 0),
                zeroCrossings: centered.slice(1).reduce((total, value, index) => total + (value * centered[index] < 0 ? 1 : 0), 0),
                shannonEntropy: this.calculateShannonEntropy(centered),
                meanNormalizedActivation: peakAmplitude === 0 ? 0 : absoluteTotal / finite.length / peakAmplitude * 100,
                noiseSigma: this.estimateNoiseSigma(centered)
            };
        }

        estimateNoiseSigma(values) {
            const absolute = this.finiteValues(values).map(Math.abs).sort((a, b) => a - b);
            if (!absolute.length) return 0;
            const quietCount = Math.max(1, Math.floor(absolute.length * 0.2));
            const quiet = absolute.slice(0, quietCount);
            return Math.sqrt(quiet.reduce((sum, value) => sum + value * value, 0) / quiet.length);
        }

        calculateShannonEntropy(values, binCount = 16) {
            const finite = this.finiteValues(values);
            if (finite.length < 2) return 0;
            let minimum = Infinity;
            let maximum = -Infinity;
            for (const value of finite) {
                if (value < minimum) minimum = value;
                if (value > maximum) maximum = value;
            }
            if (minimum === maximum) return 0;
            const bins = Array.from({ length: binCount }, () => 0);
            for (const value of finite) {
                const index = Math.min(binCount - 1, Math.floor((value - minimum) / (maximum - minimum) * binCount));
                bins[index] += 1;
            }
            const entropy = bins.reduce((total, count) => {
                if (!count) return total;
                const probability = count / finite.length;
                return total - probability * Math.log2(probability);
            }, 0);
            return entropy / Math.log2(binCount);
        }

        calculateBilateral(leftRms, rightRms, noiseSigma = 0) {
            const left = Number.isFinite(Number(leftRms)) ? Math.max(0, Number(leftRms)) : 0;
            const right = Number.isFinite(Number(rightRms)) ? Math.max(0, Number(rightRms)) : 0;
            const sigma = Number.isFinite(Number(noiseSigma)) ? Math.max(0, Number(noiseSigma)) : 0;
            const maximum = Math.max(left, right);
            const minimum = Math.min(left, right);
            const symmetryIndex = maximum === 0 ? 100 : minimum / maximum * 100;
            const difference = 100 - symmetryIndex;
            const mean = (left + right) / 2;
            const energyDenominator = Math.sqrt(2 * (left * left + right * right));
            const universalAsymmetry = energyDenominator === 0 ? 0 : (left - right) / energyDenominator * 100;
            const weightDenominator = Math.sqrt(2 * sigma * sigma + left * left + right * right);
            const noiseWeight = weightDenominator === 0 ? 0 : Math.max(0, 1 - Math.sqrt(2) * sigma / weightDenominator);

            return {
                symmetryIndex,
                difference,
                relativeAsymmetry: difference,
                robinsonAsymmetry: mean === 0 ? 0 : (left - right) / mean * 100,
                universalAsymmetry,
                weightedUniversalAsymmetry: universalAsymmetry * noiseWeight,
                noiseWeight,
                noiseSigma: sigma,
                absoluteRmsDifference: Math.abs(left - right),
                percentageDifference: difference,
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
            const analyzeGroup = group => {
                const left = this.calculateSide(list.map(sample => this.extractAmplitude(sample, group, 'left')));
                const right = this.calculateSide(list.map(sample => this.extractAmplitude(sample, group, 'right')));
                return { left, right, bilateral: this.calculateBilateral(left.rms, right.rms, Math.min(left.noiseSigma, right.noiseSigma)) };
            };
            const flexor = analyzeGroup('flexor');
            const extensor = analyzeGroup('extensor');
            const hasFourChannels = list.some(sample => channelContract?.normalizeSample(sample)?.channelSchema === 'flexor-extensor-4ch');
            const aggregateSymmetry = hasFourChannels
                ? (flexor.bilateral.symmetryIndex + extensor.bilateral.symmetryIndex) / 2
                : flexor.bilateral.symmetryIndex;
            const aggregateDifference = hasFourChannels
                ? (flexor.bilateral.difference + extensor.bilateral.difference) / 2
                : flexor.bilateral.difference;

            return {
                flexor,
                extensor,
                // Read-only aliases keep v1 consumers and two-channel exports usable.
                left: flexor.left,
                right: flexor.right,
                bilateral: {
                    symmetryIndex: aggregateSymmetry,
                    difference: aggregateDifference,
                    relativeAsymmetry: aggregateDifference,
                    robinsonAsymmetry: hasFourChannels ? (flexor.bilateral.robinsonAsymmetry + extensor.bilateral.robinsonAsymmetry) / 2 : flexor.bilateral.robinsonAsymmetry,
                    universalAsymmetry: hasFourChannels ? (flexor.bilateral.universalAsymmetry + extensor.bilateral.universalAsymmetry) / 2 : flexor.bilateral.universalAsymmetry,
                    weightedUniversalAsymmetry: hasFourChannels ? (flexor.bilateral.weightedUniversalAsymmetry + extensor.bilateral.weightedUniversalAsymmetry) / 2 : flexor.bilateral.weightedUniversalAsymmetry,
                    absoluteRmsDifference: hasFourChannels ? (flexor.bilateral.absoluteRmsDifference + extensor.bilateral.absoluteRmsDifference) / 2 : flexor.bilateral.absoluteRmsDifference,
                    percentageDifference: aggregateDifference,
                    dominantSide: flexor.bilateral.dominantSide,
                    asymmetryLevel: this.classifySymmetry(aggregateSymmetry)
                },
                durationSeconds: this.calculateDuration(list)
            };
        }

        extractAmplitude(sample, group, side) {
            const normalized = channelContract?.normalizeSample ? channelContract.normalizeSample(sample) : sample;
            const value = normalized?.[group]?.[side];
            return Number(value?.amplitude ?? value?.emg ?? value);
        }

        calculateDuration(samples, fallbackRateHz = 100) {
            if (!samples.length) return 0;
            const first = Number(samples[0]?.time ?? samples[0]?.timestamp);
            const last = Number(samples.at(-1)?.time ?? samples.at(-1)?.timestamp);
            if (Number.isFinite(first) && Number.isFinite(last) && last >= first) return last - first;
            return Math.max(0, (samples.length - 1) / fallbackRateHz);
        }

        analyzeWindows(samples, options = {}) {
            const list = Array.isArray(samples) ? samples : [];
            if (!list.length) return [];
            const windowSeconds = Math.max(0.1, Number(options.windowSeconds || 1));
            const fallbackRateHz = Number(options.sampleRateHz || 100);
            const groups = new Map();
            list.forEach((sample, index) => {
                const rawTime = Number(sample?.time ?? sample?.timestamp);
                const time = Number.isFinite(rawTime) ? rawTime : index / fallbackRateHz;
                const windowIndex = Math.floor(time / windowSeconds);
                if (!groups.has(windowIndex)) groups.set(windowIndex, []);
                groups.get(windowIndex).push(sample);
            });
            return [...groups.entries()].map(([windowIndex, windowSamples]) => ({
                startSeconds: windowIndex * windowSeconds,
                endSeconds: (windowIndex + 1) * windowSeconds,
                ...this.analyzeSamples(windowSamples)
            }));
        }

        analyzeSession(session, options = {}) {
            const samples = Array.isArray(session?.samples) ? session.samples : Array.isArray(session?.emgData) ? session.emgData : [];
            return {
                sessionId: session?.id,
                metrics: this.analyzeSamples(samples),
                windows: this.analyzeWindows(samples, options),
                configuredPhaseDifferenceDegrees: Number(session?.configuration?.phaseDelayDegrees || 0)
            };
        }

        analyzeSessions(sessions, options = {}) {
            const entries = (Array.isArray(sessions) ? sessions : []).map(session => ({
                session: this.configurationSnapshot(session),
                analysis: this.analyzeSession(session, options),
                timestamp: this.sessionTimestamp(session)
            }));
            const chronological = [...entries].sort((first, second) => first.timestamp - second.timestamp);
            return {
                chronological,
                newestFirst: [...chronological].reverse()
            };
        }

        sessionTimestamp(session) {
            const timestamp = new Date(session?.startedAt || session?.date || 0).getTime();
            return Number.isFinite(timestamp) ? timestamp : 0;
        }

        checkCompatibility(first, second) {
            const reasons = [];
            if (Number(first?.patientId) !== Number(second?.patientId)) reasons.push('Deben pertenecer al mismo participante');
            if (first?.muscleType !== second?.muscleType) reasons.push('Deben medir el mismo músculo');
            if ((first?.extensorMuscleType || first?.configuration?.extensorMuscleType) !== (second?.extensorMuscleType || second?.configuration?.extensorMuscleType)) reasons.push('Deben medir el mismo músculo extensor');
            if (first?.sessionType !== second?.sessionType) reasons.push('Deben usar el mismo tipo de prueba');
            const changedConditions = ['cadence', 'resistance'].filter(field => Number(first?.[field]) !== Number(second?.[field]));
            if ((first?.configuration?.scenario || first?.source?.scenario) !== (second?.configuration?.scenario || second?.source?.scenario)) changedConditions.push('scenario');
            if (Number(first?.durationSeconds ?? first?.duration) !== Number(second?.durationSeconds ?? second?.duration)) changedConditions.push('duration');
            return { compatible: reasons.length === 0, reasons, changedConditions, equivalentConditions: changedConditions.length === 0 };
        }

        compareSessions(first, second, options = {}) {
            const compatibility = this.checkCompatibility(first, second);
            const firstAnalysis = this.analyzeSession(first, options);
            const secondAnalysis = this.analyzeSession(second, options);
            const pairs = {
                flexorLeftRms: [firstAnalysis.metrics.flexor.left.rms, secondAnalysis.metrics.flexor.left.rms],
                flexorRightRms: [firstAnalysis.metrics.flexor.right.rms, secondAnalysis.metrics.flexor.right.rms],
                extensorLeftRms: [firstAnalysis.metrics.extensor.left.rms, secondAnalysis.metrics.extensor.left.rms],
                extensorRightRms: [firstAnalysis.metrics.extensor.right.rms, secondAnalysis.metrics.extensor.right.rms],
                flexorSymmetryIndex: [firstAnalysis.metrics.flexor.bilateral.symmetryIndex, secondAnalysis.metrics.flexor.bilateral.symmetryIndex],
                extensorSymmetryIndex: [firstAnalysis.metrics.extensor.bilateral.symmetryIndex, secondAnalysis.metrics.extensor.bilateral.symmetryIndex]
            };
            pairs.leftRms = pairs.flexorLeftRms;
            pairs.rightRms = pairs.flexorRightRms;
            pairs.leftMav = [firstAnalysis.metrics.flexor.left.mav, secondAnalysis.metrics.flexor.left.mav];
            pairs.rightMav = [firstAnalysis.metrics.flexor.right.mav, secondAnalysis.metrics.flexor.right.mav];
            pairs.symmetryIndex = pairs.flexorSymmetryIndex;
            const differences = Object.fromEntries(Object.entries(pairs).map(([key, [before, after]]) => [key, {
                absolute: after - before,
                percentage: compatibility.equivalentConditions && before !== 0 ? (after - before) / Math.abs(before) * 100 : null
            }]));
            return {
                compatibility,
                sessions: {
                    first: this.configurationSnapshot(first),
                    second: this.configurationSnapshot(second)
                },
                first: firstAnalysis,
                second: secondAnalysis,
                differences
            };
        }

        configurationSnapshot(session) {
            return {
                id: session?.id, patientId: session?.patientId, label: session?.label,
                startedAt: session?.startedAt || session?.date, muscleType: session?.muscleType,
                flexorMuscleType: session?.flexorMuscleType || session?.configuration?.flexorMuscleType || session?.muscleType,
                extensorMuscleType: session?.extensorMuscleType || session?.configuration?.extensorMuscleType,
                sessionType: session?.sessionType, cadence: session?.cadence, resistance: session?.resistance,
                durationSeconds: session?.durationSeconds ?? session?.duration,
                scenario: session?.configuration?.scenario || session?.source?.scenario || 'unknown',
                source: session?.source
            };
        }
    }

    return AnalysisService;
});
