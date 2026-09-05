const test = require('node:test');
const assert = require('node:assert/strict');
const contract = require('../core/signal-source-contract.js');
const EMGSimulator = require('../emg-simulator.js');

test('simulator satisfies the shared signal source contract', () => {
    const simulator = new EMGSimulator();
    assert.equal(contract.assert(simulator), simulator);
    assert.equal(simulator.getStatus(), 'stopped');
});

test('simulator pause and resume preserve its time and buffers', () => {
    const simulator = new EMGSimulator();
    simulator.isRunning = true;
    simulator.time = 1.25;
    simulator.signalBuffer.left.push({ time: 1, amplitude: 1 });

    simulator.pause();
    assert.equal(simulator.getStatus(), 'paused');
    assert.equal(simulator.time, 1.25);
    assert.equal(simulator.signalBuffer.left.length, 1);

    simulator.generateSignal = () => {};
    simulator.resume();
    assert.equal(simulator.getStatus(), 'running');
    assert.equal(simulator.time, 1.25);
    assert.equal(simulator.signalBuffer.left.length, 1);
});

test('simulator applies configured unilateral fatigue progression', () => {
    const simulator = new EMGSimulator();
    simulator.setScenario('left-fatigue', {}, 100);
    simulator.time = 50;
    simulator.updateScenarioState();

    assert.equal(simulator.fatigueLevel.left, 0.4);
    assert.equal(simulator.fatigueLevel.right, 0);
});

test('simulator timestamps follow monotonic wall time instead of callback count', () => {
    const simulator = new EMGSimulator();
    simulator.accumulatedTimeSeconds = 2;
    simulator.clockStartedAtMs = 1000;
    simulator.now = () => 3500;
    assert.equal(simulator.syncTimeToClock(), 4.5);
});
