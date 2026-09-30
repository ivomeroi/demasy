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
