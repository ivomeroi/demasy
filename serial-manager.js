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
        this.signalBuffer = this.createEmptyBuffer();
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
        this.signalBuffer = this.createEmptyBuffer();
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
            channelSchema: 'flexor-extensor-4ch',
            flexor: this.createMuscleSample(sample.flexor),
            extensor: this.createMuscleSample(sample.extensor)
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

        if (values.length >= 12) {
            return this.parseFourChannelValues(values, text);
        }

        if (values.length >= 2) {
            if (values.length >= 6) {
                const envelopeLeft = this.toFirmwareSignalValue(Math.abs(values[1]));
                const envelopeRight = this.toFirmwareSignalValue(Math.abs(values[4]));
                return this.legacyPair(values[0], values[3], envelopeLeft, envelopeRight, values[2], values[5], text);
            }

            if (values.length >= 4) {
                const envelopeLeft = this.toFirmwareSignalValue(Math.abs(values[1]));
                const envelopeRight = this.toFirmwareSignalValue(Math.abs(values[3]));
                return this.legacyPair(values[0], values[2], envelopeLeft, envelopeRight, 0, 0, text);
            }

            return this.legacyPair(values[0], 0, values[1], 0, 0, 0, text);
        }

        if (values.length === 1) {
            return this.legacyPair(values[0], 0, 0, 0, 0, 0, text);
        }

        return null;
    }

    parseFourChannelValues(values, raw) {
        const channel = offset => ({
            amplitude: this.toFirmwareSignalValue(values[offset]),
            envelope: this.toFirmwareSignalValue(Math.abs(values[offset + 1])),
            flags: values[offset + 2] || 0
        });
        return { flexor: { left: channel(0), right: channel(3) }, extensor: { left: channel(6), right: channel(9) }, raw };
    }

    legacyPair(left, right, envelopeLeft, envelopeRight, flagsLeft, flagsRight, raw) {
        const channel = (amplitude, envelope, flags) => ({ amplitude: this.toFirmwareSignalValue(amplitude), envelope: Number(envelope) || 0, flags: Number(flags) || 0 });
        return { flexor: { left: channel(left, envelopeLeft, flagsLeft), right: channel(right, envelopeRight, flagsRight) }, extensor: { left: channel(0, 0, 0), right: channel(0, 0, 0) }, raw, legacy: true };
    }

    createMuscleSample(group = {}) {
        const make = value => ({
            amplitude: Number(value?.amplitude || 0),
            envelope: Number(value?.envelope || 0),
            flags: Number(value?.flags || 0),
            activation: Math.min(1, Math.abs(Number(value?.amplitude || 0)) / 2.5)
        });
        return { left: make(group.left), right: make(group.right) };
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

            const parsed = this.legacyPair(
                Number(left), Number.isFinite(Number(right)) ? Number(right) : 0,
                Number.isFinite(Number(envelope)) ? this.toFirmwareSignalValue(Math.abs(Number(envelope))) : 0,
                Number.isFinite(Number(envelopeRight)) ? this.toFirmwareSignalValue(Math.abs(Number(envelopeRight))) : 0,
                Number(flagsLeft) || 0, Number(flagsRight) || 0, text
            );
            parsed.time = Number.isFinite(Number(data.time)) ? Number(data.time) : undefined;
            return parsed;
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

        return this.legacyPair(
            Number(leftMatch?.[1] ?? 0), Number(rightMatch?.[1] ?? 0),
            envelopeMatch ? this.toFirmwareSignalValue(Math.abs(Number(envelopeMatch[1]))) : 0,
            envelopeRightMatch ? this.toFirmwareSignalValue(Math.abs(Number(envelopeRightMatch[1]))) : 0,
            Number(flagsLeftMatch?.[1] || 0), Number(flagsRightMatch?.[1] || 0), text
        );
    }

    toFirmwareSignalValue(value) {
        return value * (this.adcReferenceVoltage * 1000) / this.adcMaxCount;
    }

    addToBuffer(data) {
        ['flexor', 'extensor'].forEach(group => ['left', 'right'].forEach(side => {
            const value = data[group][side];
            const buffer = this.signalBuffer[group][side];
            buffer.push({ time: data.time, ...value });
            if (buffer.length > this.maxBufferSize) buffer.shift();
        }));
    }

    updateStats() {
        const groupStats = group => {
            const leftValues = this.signalBuffer[group].left.slice(-1000).map(sample => sample.amplitude);
            const rightValues = this.signalBuffer[group].right.slice(-1000).map(sample => sample.amplitude);
            const left = this.calculateSideStats(leftValues);
            const right = this.calculateSideStats(rightValues);
            const averageRms = (left.rms + right.rms) / 2;
            const difference = averageRms > 0 ? Math.abs(left.rms - right.rms) / averageRms * 100 : 0;
            return { left, right, bilateral: { symmetryIndex: Math.max(0, 100 - difference), asymmetryLevel: this.classifyAsymmetry(difference), difference } };
        };
        const flexor = groupStats('flexor');
        const extensor = groupStats('extensor');
        const all = ['flexor', 'extensor'].flatMap(group => ['left', 'right'].flatMap(side => this.signalBuffer[group][side].slice(-1000)));
        const recentFlags = all.map(sample => sample.flags || 0);
        const allValues = all.map(sample => sample.amplitude);
        const averageRms = (flexor.left.rms + flexor.right.rms + extensor.left.rms + extensor.right.rms) / 4;
        const artifactCount = recentFlags.filter(flags => flags !== 0).length;
        const artifactLabel = this.describeArtifacts(recentFlags);
        const noiseFloor = this.estimateNoise(allValues);
        const snr = noiseFloor > 0
            ? 20 * Math.log10(Math.max(averageRms, 0.001) / noiseFloor)
            : 45;

        this.stats = {
            flexor,
            extensor,
            bilateral: {
                symmetryIndex: (flexor.bilateral.symmetryIndex + extensor.bilateral.symmetryIndex) / 2,
                asymmetryLevel: this.classifyAsymmetry((flexor.bilateral.difference + extensor.bilateral.difference) / 2),
                difference: (flexor.bilateral.difference + extensor.bilateral.difference) / 2,
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
        const group = () => ({ left: { rms: 0, peakAmplitude: 0, frequency: 0 }, right: { rms: 0, peakAmplitude: 0, frequency: 0 }, bilateral: { symmetryIndex: 100, asymmetryLevel: 'Normal', difference: 0 } });
        return {
            flexor: group(), extensor: group(),
            bilateral: {
                symmetryIndex: 100,
                asymmetryLevel: 'Normal',
                difference: 0,
                snr: 45,
                artifacts: 'Ninguno'
            }
        };
    }

    createEmptyBuffer() {
        return { flexor: { left: [], right: [] }, extensor: { left: [], right: [] } };
    }

    notifyConnection(status) {
        this.callbacks.onConnectionChange?.(status);
    }
}

window.EMGSerialManager = EMGSerialManager;
