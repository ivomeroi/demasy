const test = require('node:test');
const assert = require('node:assert/strict');
const { DiagnosticLogService } = require('../services/diagnostic-log-service.js');

class MemoryDiagnosticStorage {
    constructor() { this.runs = new Map(); this.chunks = []; }
    async initialize() {}
    async putRun(run) { this.runs.set(run.id, structuredClone(run)); }
    async addChunk(chunk) { this.chunks.push(structuredClone(chunk)); }
    async listRuns() { return [...this.runs.values()].map(value => structuredClone(value)); }
    async getChunks(runId) { return this.chunks.filter(chunk => chunk.runId === runId).map(value => structuredClone(value)); }
    async clear() { this.runs.clear(); this.chunks = []; }
}

const sample = (amplitude, envelope) => ({
    time: 1,
    source: 'bluetooth',
    sensorStatus: [true, true, false, false],
    batteryMv: { base: 3900, sensors: [3800, 3810, 0, 0] },
    raw: 'frame',
    flexor: {
        left: { amplitude, envelope, flags: 0 },
        right: { amplitude, envelope, flags: 0 }
    },
    extensor: {
        left: { amplitude: 0, envelope: 0, flags: 0 },
        right: { amplitude: 0, envelope: 0, flags: 0 }
    }
});

test('persiste y exporta señal original, calibrada, conexiones y calibración', async () => {
    let timestamp = Date.parse('2026-11-05T12:00:00.000Z');
    const storage = new MemoryDiagnosticStorage();
    const service = new DiagnosticLogService({ storage, now: () => timestamp, maximumBufferedSamples: 10 });
    await service.initialize();
    service.beginRun({ transport: 'bluetooth', device: { name: 'DEMASY-C3' } });
    service.recordEvent('base-connection', { status: 'connected' });
    timestamp += 100;
    const raw = sample(4, 12);
    const calibrated = sample(4, 3);
    calibrated.flexor.left.calibration = { baseline: 8, noiseSigma: 0.5, threshold: 9.5 };
    service.recordSample(raw, calibrated, { source: 'bluetooth', calibrationPhase: 'movement' });
    service.recordEvent('calibration-completed', { calibration: { 'flexor-left': calibrated.flexor.left.calibration } });
    timestamp += 900;
    await service.endRun('test-completed');

    const report = await service.exportLatest();
    assert.equal(report.run.transport, 'bluetooth');
    assert.equal(report.samples.length, 1);
    assert.equal(report.samples[0].raw.flexor.left.envelope, 12);
    assert.equal(report.samples[0].calibrated.flexor.left.envelope, 3);
    assert.equal(report.samples[0].calibrated.flexor.left.calibration.threshold, 9.5);
    assert.equal(report.samples[0].sensorStatus[0], true);
    assert.equal(report.calibrationEvents.length, 1);
    assert.ok(report.connectionEvents.some(event => event.type === 'base-connection'));
    assert.equal(report.summary.receivedSamples, 1);
});

test('borra todos los registros diagnósticos', async () => {
    const storage = new MemoryDiagnosticStorage();
    const service = new DiagnosticLogService({ storage });
    await service.initialize();
    service.beginRun({ transport: 'serial' });
    service.recordSample(sample(1, 2), null, { source: 'serial', paused: true });
    await service.endRun();
    await service.clear();
    assert.deepEqual(await service.listRuns(), []);
});
