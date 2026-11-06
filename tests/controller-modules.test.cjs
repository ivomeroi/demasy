const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');

const controllerFiles = [
    'controllers/live-chart-controller.js',
    'controllers/device-connection-controller.js',
    'controllers/recording-workflow-controller.js',
    'controllers/signal-processing-controller.js'
];

test('registra los controladores modulares sobre la aplicación principal', () => {
    class TestApp {}
    const context = vm.createContext({ window: { KinesioEMGApp: TestApp } });

    controllerFiles.forEach(path => {
        vm.runInContext(readFileSync(path, 'utf8'), context, { filename: path });
    });

    const expectedMethods = [
        'initializeChart',
        'setupBluetoothManager',
        'startRecording',
        'showSessionConfigurationForm',
        'startSignalCalibration',
        'ingestSignalData',
        'updateSignalQuality'
    ];

    expectedMethods.forEach(method => {
        assert.equal(typeof TestApp.prototype[method], 'function', `${method} no fue registrado`);
    });
});

test('calibra el reposo con mediana y dispersión robusta sin aplicar ganancia', () => {
    class TestApp {}
    const context = vm.createContext({ window: { KinesioEMGApp: TestApp } });
    vm.runInContext(readFileSync('controllers/signal-processing-controller.js', 'utf8'), context);
    const app = new TestApp();
    app.getActiveSignalProvider = () => ({ sampleRate: 50 });
    const state = app.createEnvelopeDisplayState();
    state.baselineSamples = Array.from({ length: 120 }, (_, index) => 10 + ((index % 5) - 2) * 0.1);
    state.baselineSamples.push(500);

    assert.equal(app.finalizeRestCalibration(state), true);
    assert.ok(Math.abs(state.baseline - 10) < 0.01);
    assert.ok(state.noiseSigma >= 0.05);
    assert.ok(state.threshold > state.baseline);
    assert.equal(app.getCalibrationSnapshot.call({ envelopeDisplay: { sensor: state } }).sensor.gainApplied, 1);
});

test('divide la calibración total en flexores y extensores consecutivos', () => {
    class TestApp {}
    const context = vm.createContext({ window: { KinesioEMGApp: TestApp } });
    vm.runInContext(readFileSync('controllers/signal-processing-controller.js', 'utf8'), context);
    const app = new TestApp();
    app.envelopeDisplay = Object.fromEntries(
        ['flexor-left', 'flexor-right', 'extensor-left', 'extensor-right'].map(channel => [channel, {}])
    );

    assert.deepEqual(
        JSON.parse(JSON.stringify(app.getCalibrationBatches('all'))),
        [['flexor-left', 'flexor-right'], ['extensor-left', 'extensor-right']]
    );
    assert.deepEqual(
        JSON.parse(JSON.stringify(app.getCalibrationBatches('extensor-left'))),
        [['extensor-left']]
    );
    assert.equal(app.isBilateralCalibrationBatch(['flexor-left', 'flexor-right']), true);
    assert.equal(app.isBilateralCalibrationBatch(['extensor-left', 'extensor-right']), true);
    assert.equal(app.isBilateralCalibrationBatch(['flexor-right']), false);
    assert.equal(app.isBilateralCalibrationBatch(['flexor-left', 'extensor-right']), false);
});

test('conserva la muestra original y corrige potencia de ruido sin usar el umbral como zona muerta', () => {
    class TestApp {}
    const context = vm.createContext({ window: { KinesioEMGApp: TestApp } });
    vm.runInContext(readFileSync('controllers/signal-processing-controller.js', 'utf8'), context);
    const app = new TestApp();
    app.signalSource = 'bluetooth';
    app.calibrationInProgress = false;
    app.calibrationPhase = null;
    app.activeCalibrationChannels = [];
    app.updateActivityBadge = () => {};
    const state = () => ({
        ...app.createEnvelopeDisplayState(), calibrated: true, baselineValid: true,
        comparisonValid: true, baseline: 10, noiseSigma: 1, threshold: 13, smoothed: 20
    });
    app.envelopeDisplay = {
        'flexor-left': state(), 'flexor-right': state(),
        'extensor-left': state(), 'extensor-right': state()
    };
    const channel = { amplitude: 5, envelope: 20, flags: 0 };
    const result = app.applyCalibrationToSample({
        time: 1, flexor: { left: channel, right: channel },
        extensor: { left: channel, right: channel }
    });

    assert.equal(result.flexor.left.rawAmplitude, 5);
    assert.equal(result.flexor.left.rawEnvelope, 20);
    assert.ok(result.flexor.left.envelope > 0);
    assert.ok(result.flexor.left.amplitude > 0);
    assert.ok(result.flexor.left.amplitude < 5);
    assert.equal(result.flexor.left.calibration.correctionMethod, 'noise-power-subtraction');

    app.envelopeDisplay['flexor-left'].smoothed = 11;
    const quiet = app.applyCalibrationToSample({
        time: 2, flexor: { left: { amplitude: 4, envelope: 11, flags: 0 }, right: channel },
        extensor: { left: channel, right: channel }
    });
    assert.ok(quiet.flexor.left.envelope > 0);
    assert.ok(quiet.flexor.left.amplitude > 0);
    assert.equal(quiet.flexor.left.rawAmplitude, 4);
});

test('valida movimiento contra el umbral de detección sin alterar la amplitud corregida', () => {
    class TestApp {}
    const context = vm.createContext({ window: { KinesioEMGApp: TestApp } });
    vm.runInContext(readFileSync('controllers/signal-processing-controller.js', 'utf8'), context);
    const app = new TestApp();
    const state = app.createEnvelopeDisplayState();
    Object.assign(state, { baselineValid: true, baseline: 10, noiseSigma: 1, threshold: 13 });
    state.movementSamples = Array(100).fill(12);
    assert.equal(app.hasValidCalibrationMovement(state), false);
    state.movementSamples = Array(100).fill(14);
    assert.equal(app.hasValidCalibrationMovement(state), true);
    assert.ok(app.noiseCorrectEnvelope(state, 12) > 0);
});
