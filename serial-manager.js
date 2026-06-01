/**
 * ESP32 Web Serial EMG Reader
 * Reads line-delimited EMG samples from a USB-connected ESP32.
 */

class EMGSerialManager {
    constructor() {
        this.port = null;
        this.reader = null;
        this.keepReading = false;
        this.isConnected = false;
        this.isSampling = false;
        this.sampleRate = 1000;
        this.useFixedSampleClock = false;
        this.currentMuscle = 'quadriceps';
        this.time = 0;
        this.lastSampleAt = 0;
        this.lastStatsUpdateAt = 0;
        this.statsUpdateInterval = 100;
        this.adcReferenceVoltage = 3.3;
        this.adcMaxCount = 4095;
        this.signalFlags = {
            adcClipped: 0x01,
            pressureArtifact: 0x02
        };
        this.rawBaseline = null;
        this.rawBaselineAlpha = 0.002;
        this.signalBuffer = { left: [], right: [] };
        this.maxBufferSize = 10000;
        this.callbacks = {
            onDataUpdate: null,
            onStatsUpdate: null,
            onConnectionChange: null,
            onError: null
        };
        this.stats = this.createEmptyStats();
        this.cyclingParams = {
            cadence: 80,
            resistance: 0.5,
            pedalingEfficiency: 0.85,
            pedalPosition: { left: 0, right: Math.PI }
        };
    }

    isSupported() {
        return 'serial' in navigator;
    }

    async connect(options = {}) {
        if (!this.isSupported()) {
            throw new Error('Web Serial no está disponible. Usa Chrome o Edge desde localhost.');
        }

        this.port = await navigator.serial.requestPort();
        await this.port.open({
            baudRate: options.baudRate || 115200,
            dataBits: 8,
            stopBits: 1,
            parity: 'none',
            bufferSize: 4096
        });

        this.isConnected = true;
        this.keepReading = true;
        this.time = 0;
        this.lastSampleAt = performance.now();
        this.notifyConnection('connected');
        this.readLoop();
    }

    async disconnect() {
        this.keepReading = false;
        this.isSampling = false;

        if (this.reader) {
            await this.reader.cancel().catch(() => {});
        }

        if (this.port) {
            await this.port.close().catch(() => {});
        }

        this.reader = null;
        this.port = null;
        this.isConnected = false;
        this.notifyConnection('disconnected');
    }

    start() {
        if (!this.isConnected) {
            throw new Error('ESP32 no conectado');
        }
        this.isSampling = true;
    }

    stop() {
        this.isSampling = false;
    }

    reset() {
        this.time = 0;
        this.signalBuffer = { left: [], right: [] };
        this.rawBaseline = null;
        this.stats = this.createEmptyStats();
        this.callbacks.onStatsUpdate?.(this.stats);
    }

    setMuscle(muscleType) {
        this.currentMuscle = muscleType;
        this.reset();
    }

    getStats() {
        return this.stats;
    }

    onDataUpdate(callback) {
        this.callbacks.onDataUpdate = callback;
    }

    onStatsUpdate(callback) {
        this.callbacks.onStatsUpdate = callback;
    }

    onConnectionChange(callback) {
        this.callbacks.onConnectionChange = callback;
    }

    onError(callback) {
        this.callbacks.onError = callback;
    }

    async readLoop() {
        const decoder = new TextDecoder();
        let pendingText = '';

        try {
            while (this.port?.readable && this.keepReading) {
                this.reader = this.port.readable.getReader();

                try {
                    while (this.keepReading) {
                        const { value, done } = await this.reader.read();
                        if (done) break;

                        pendingText += decoder.decode(value, { stream: true });
                        const lines = pendingText.split(/\r?\n/);
                        pendingText = lines.pop() || '';

                        for (const line of lines) {
                            this.handleLine(line);
                        }
                    }
                } finally {
                    this.reader.releaseLock();
                    this.reader = null;
                }
            }
        } catch (error) {
            this.callbacks.onError?.(error);
        } finally {
            if (this.keepReading) {
                await this.disconnect();
            }
        }
    }

    handleLine(line) {
        const sample = this.parseSample(line);
        if (!sample) return;

        const now = performance.now();
        const dt = Math.max(0.001, Math.min(0.1, (now - this.lastSampleAt) / 1000));
        this.lastSampleAt = now;
        const fixedDt = this.sampleRate > 0 ? 1 / this.sampleRate : dt;
        this.time += sample.timeDelta || (this.useFixedSampleClock ? fixedDt : dt);

        const data = {
            time: sample.time ?? this.time,
            source: 'serial',
            raw: sample.raw,
            envelope: sample.envelope,
            envelopeLeft: sample.envelopeLeft ?? sample.envelope,
            envelopeRight: sample.envelopeRight ?? sample.envelope,
            flags: sample.flags || { left: 0, right: 0 },
            left: {
                amplitude: sample.left,
                activation: Math.min(1, Math.abs(sample.left) / 2.5)
            },
            right: {
                amplitude: sample.right,
                activation: Number.isFinite(sample.right) ? Math.min(1, Math.abs(sample.right) / 2.5) : 0
            }
        };

        this.addToBuffer(data);
        this.callbacks.onDataUpdate?.(data);

        if (now - this.lastStatsUpdateAt >= this.statsUpdateInterval) {
            this.lastStatsUpdateAt = now;
            this.updateStats();
            this.callbacks.onStatsUpdate?.(this.stats);
        }
    }

    parseSample(line) {
        const text = line.trim();
        if (!text) return null;

        const jsonSample = this.parseJsonSample(text);
        if (jsonSample) return jsonSample;

        const labeledSample = this.parseLabeledSample(text);
        if (labeledSample) return labeledSample;

        const values = text
            .split(/[,\s;]+/)
            .map(value => Number(value))
            .filter(value => Number.isFinite(value));

        if (values.length >= 2) {
            if (values.length >= 6) {
                const envelopeLeft = this.toFirmwareSignalValue(Math.abs(values[1]));
                const envelopeRight = this.toFirmwareSignalValue(Math.abs(values[4]));
                return {
                    left: this.toFirmwareSignalValue(values[0]),
                    right: this.toFirmwareSignalValue(values[3]),
                    envelope: Math.max(envelopeLeft, envelopeRight),
                    envelopeLeft,
                    envelopeRight,
                    flags: {
                        left: values[2] || 0,
                        right: values[5] || 0
                    },
                    raw: text
                };
            }

            if (values.length >= 4) {
                const envelopeLeft = this.toFirmwareSignalValue(Math.abs(values[1]));
                const envelopeRight = this.toFirmwareSignalValue(Math.abs(values[3]));
                return {
                    left: this.toFirmwareSignalValue(values[0]),
                    right: this.toFirmwareSignalValue(values[2]),
                    envelope: Math.max(envelopeLeft, envelopeRight),
                    envelopeLeft,
                    envelopeRight,
                    flags: { left: 0, right: 0 },
                    raw: text
                };
            }

            return {
                left: this.toFirmwareSignalValue(values[0]),
                right: null,
                envelope: this.toFirmwareSignalValue(Math.abs(values[1])),
                flags: { left: 0, right: 0 },
                raw: text
            };
        }

        if (values.length === 1) {
            return {
                left: this.toFirmwareSignalValue(values[0]),
                right: null,
                envelope: null,
                flags: { left: 0, right: 0 },
                raw: text
            };
        }

        return null;
    }

    parseJsonSample(text) {
        if (!text.startsWith('{')) return null;

        try {
            const data = JSON.parse(text);
            const left = data.left ?? data.l ?? data.ch1 ?? data.channel1;
            const right = data.right ?? data.r ?? data.ch2 ?? data.channel2;
            const envelope = data.envelope ?? data.env ?? data.envelopeLeft ?? data.envL ?? data.ch1env;
            const envelopeRight = data.envelopeRight ?? data.envR ?? data.ch2env;
            const flagsLeft = data.flagsLeft ?? data.flagsL ?? data.flags ?? 0;
            const flagsRight = data.flagsRight ?? data.flagsR ?? 0;

            if (!Number.isFinite(Number(left))) return null;

            return {
                left: this.toFirmwareSignalValue(Number(left)),
                right: Number.isFinite(Number(right)) ? this.toFirmwareSignalValue(Number(right)) : null,
                envelope: Number.isFinite(Number(envelope)) ? this.toFirmwareSignalValue(Math.abs(Number(envelope))) : null,
                envelopeLeft: Number.isFinite(Number(envelope)) ? this.toFirmwareSignalValue(Math.abs(Number(envelope))) : null,
                envelopeRight: Number.isFinite(Number(envelopeRight)) ? this.toFirmwareSignalValue(Math.abs(Number(envelopeRight))) : null,
                flags: {
                    left: Number.isFinite(Number(flagsLeft)) ? Number(flagsLeft) : 0,
                    right: Number.isFinite(Number(flagsRight)) ? Number(flagsRight) : 0
                },
                time: Number.isFinite(Number(data.time)) ? Number(data.time) : undefined,
                raw: text
            };
        } catch {
            return null;
        }
    }

    parseLabeledSample(text) {
        const leftMatch = text.match(/\b(?:left|l|ch1|a0)\s*[:=]\s*(-?\d+(?:\.\d+)?)/i);
        const rightMatch = text.match(/\b(?:right|r|ch2|a1)\s*[:=]\s*(-?\d+(?:\.\d+)?)/i);
        const envelopeMatch = text.match(/\b(?:envelope|env|envl|ch1env)\s*[:=]\s*(-?\d+(?:\.\d+)?)/i);
        const envelopeRightMatch = text.match(/\b(?:envr|enveloperight|ch2env)\s*[:=]\s*(-?\d+(?:\.\d+)?)/i);
        const flagsLeftMatch = text.match(/\b(?:flagsl|flagsLeft)\s*[:=]\s*(\d+)/i);
        const flagsRightMatch = text.match(/\b(?:flagsr|flagsRight)\s*[:=]\s*(\d+)/i);

        if (!leftMatch && !rightMatch) return null;

        return {
            left: this.toFirmwareSignalValue(Number(leftMatch?.[1] ?? 0)),
            right: rightMatch ? this.toFirmwareSignalValue(Number(rightMatch[1])) : null,
            envelope: envelopeMatch ? this.toFirmwareSignalValue(Math.abs(Number(envelopeMatch[1]))) : null,
            envelopeLeft: envelopeMatch ? this.toFirmwareSignalValue(Math.abs(Number(envelopeMatch[1]))) : null,
            envelopeRight: envelopeRightMatch ? this.toFirmwareSignalValue(Math.abs(Number(envelopeRightMatch[1]))) : null,
            flags: {
                left: flagsLeftMatch ? Number(flagsLeftMatch[1]) : 0,
                right: flagsRightMatch ? Number(flagsRightMatch[1]) : 0
            },
            raw: text
        };
    }

    toFirmwareSignalValue(value) {
        return value * (this.adcReferenceVoltage * 1000) / this.adcMaxCount;
    }

    addToBuffer(data) {
        this.signalBuffer.left.push({
            time: data.time,
            amplitude: data.left.amplitude,
            activation: data.left.activation,
            flags: data.flags?.left || 0
        });

        this.signalBuffer.right.push({
            time: data.time,
            amplitude: data.right.amplitude,
            activation: data.right.activation,
            flags: data.flags?.right || 0
        });

        ['left', 'right'].forEach(side => {
            if (this.signalBuffer[side].length > this.maxBufferSize) {
                this.signalBuffer[side].shift();
            }
        });
    }

    updateStats() {
        const left = this.signalBuffer.left.slice(-1000).map(sample => sample.amplitude);
        const right = this.signalBuffer.right.slice(-1000).map(sample => sample.amplitude);
        const recentFlags = [
            ...this.signalBuffer.left.slice(-1000).map(sample => sample.flags || 0),
            ...this.signalBuffer.right.slice(-1000).map(sample => sample.flags || 0)
        ];

        const leftStats = this.calculateSideStats(left);
        const rightStats = this.calculateSideStats(right);
        const averageRms = (leftStats.rms + rightStats.rms) / 2;
        const difference = averageRms > 0
            ? Math.abs(leftStats.rms - rightStats.rms) / averageRms * 100
            : 0;
        const symmetryIndex = Math.max(0, 100 - difference);
        const artifactCount = recentFlags.filter(flags => flags !== 0).length;
        const artifactLabel = this.describeArtifacts(recentFlags);
        const noiseFloor = this.estimateNoise([...left, ...right]);
        const snr = noiseFloor > 0
            ? 20 * Math.log10(Math.max(averageRms, 0.001) / noiseFloor)
            : 45;

        this.stats = {
            left: leftStats,
            right: rightStats,
            bilateral: {
                symmetryIndex,
                asymmetryLevel: this.classifyAsymmetry(difference),
                difference,
                snr: Math.max(0, Math.min(60, snr)),
                artifacts: artifactCount > 5 ? artifactLabel : 'Ninguno'
            }
        };
    }

    describeArtifacts(flags) {
        const combinedFlags = flags.reduce((combined, value) => combined | value, 0);
        const labels = [];

        if ((combinedFlags & this.signalFlags.adcClipped) !== 0) {
            labels.push('Saturación ADC');
        }

        if ((combinedFlags & this.signalFlags.pressureArtifact) !== 0) {
            labels.push('Presión/contacto');
        }

        return labels.length > 0 ? labels.join(' + ') : 'Detectados';
    }

    calculateSideStats(values) {
        values = values.filter(value => Number.isFinite(value));

        if (values.length === 0) {
            return { rms: 0, peakAmplitude: 0, frequency: 0 };
        }

        const rms = Math.sqrt(values.reduce((sum, value) => sum + value * value, 0) / values.length);
        const peakAmplitude = values.reduce((peak, value) => Math.max(peak, Math.abs(value)), 0);

        return {
            rms,
            peakAmplitude,
            frequency: 0
        };
    }

    estimateNoise(values) {
        values = values.filter(value => Number.isFinite(value));

        if (values.length < 2) return 0.01;

        const deltas = [];
        for (let i = 1; i < values.length; i += 1) {
            deltas.push(Math.abs(values[i] - values[i - 1]));
        }

        const averageDelta = deltas.reduce((sum, value) => sum + value, 0) / deltas.length;
        return Math.max(0.01, averageDelta / Math.sqrt(2));
    }

    classifyAsymmetry(difference) {
        if (difference < 10) return 'Normal';
        if (difference < 25) return 'Leve';
        if (difference < 40) return 'Moderada';
        return 'Severa';
    }

    createEmptyStats() {
        return {
            left: { rms: 0, peakAmplitude: 0, frequency: 0 },
            right: { rms: 0, peakAmplitude: 0, frequency: 0 },
            bilateral: {
                symmetryIndex: 100,
                asymmetryLevel: 'Normal',
                difference: 0,
                snr: 45,
                artifacts: 'Ninguno'
            }
        };
    }

    notifyConnection(status) {
        this.callbacks.onConnectionChange?.(status);
    }
}

window.EMGSerialManager = EMGSerialManager;
