const test = require('node:test');
const assert = require('node:assert/strict');
const config = require('../core/demasy-config.js');
const contract = require('../core/signal-source-contract.js');
const SettingsService = require('../services/settings-service.js');
const MemoryStorageAdapter = require('../services/memory-storage-adapter.js');
const ReplaySignalSource = require('../services/replay-signal-source.js');

test('exposes DEMASY version and schema constants', () => {
    assert.equal(config.application.name, 'DEMASY');
    assert.equal(config.application.version, '1.0.0');
    assert.equal(config.schema.databaseName, 'DEMASYDB');
    assert.equal(config.schema.legacyDatabaseName, 'KinesioEMGDB');
});

test('memory adapter isolates stored values from callers', async () => {
    const storage = new MemoryStorageAdapter();
    const patient = await storage.createPatient({ participantCode: 'P-0001', name: 'Demo' });
    patient.name = 'Changed outside';

    const stored = await storage.listPatients();
    assert.equal(stored[0].name, 'Demo');
});

test('settings service applies defaults and validation', async () => {
    const storage = new MemoryStorageAdapter();
    const settings = new SettingsService(storage);

    assert.equal(await settings.get('cadenceRpm'), 80);
    assert.equal(await settings.set('cadenceRpm', 95), 95);
    assert.equal(await settings.get('cadenceRpm'), 95);
    await assert.rejects(() => settings.set('cadenceRpm', 500), RangeError);
});

test('replay source satisfies the signal source contract', () => {
    const replay = new ReplaySignalSource();
    assert.equal(contract.assert(replay), replay);
});

test('replay source supports deterministic pause and resume', () => {
    const scheduled = [];
    const replay = new ReplaySignalSource([
        { time: 0, left: { amplitude: 1 }, right: { amplitude: 1 } },
        { time: 0.01, left: { amplitude: 2 }, right: { amplitude: 1 } }
    ], {
        setTimeoutFn: callback => {
            scheduled.push(callback);
            return scheduled.length;
        },
        clearTimeoutFn: () => {}
    });
    const received = [];
    replay.onDataUpdate(sample => received.push(sample));

    replay.start();
    assert.equal(replay.getStatus(), 'running');
    scheduled.shift()();
    assert.equal(received.length, 1);

    replay.pause();
    assert.equal(replay.getStatus(), 'paused');
    replay.resume();
    assert.equal(replay.getStatus(), 'running');
});

test('replay source reports progress, speed and completion', () => {
    const scheduled = [];
    const replay = new ReplaySignalSource([{ time: 0 }, { time: 0.01 }], {
        setTimeoutFn: callback => { scheduled.push(callback); return scheduled.length; },
        clearTimeoutFn: () => {}
    });
    const statuses = [];
    const progress = [];
    replay.onStatusChange(status => statuses.push(status));
    replay.onProgress(value => progress.push(value.percent));
    replay.setSpeed(2);
    assert.equal(replay.speed, 2);
    assert.throws(() => replay.setSpeed(3), /Velocidad/);

    replay.start();
    scheduled.shift()();
    scheduled.shift()();
    scheduled.shift()();

    assert.equal(replay.getStatus(), 'completed');
    assert.deepEqual(progress, [50, 100, 100]);
    assert.deepEqual(statuses, ['stopped', 'running', 'completed']);
});
