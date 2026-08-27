const test = require('node:test');
const assert = require('node:assert/strict');
const RecordingController = require('../core/recording-controller.js');

test('follows the complete recording lifecycle', () => {
    let now = 0;
    const controller = new RecordingController({ now: () => now });

    controller.configure({ patientId: 1, label: 'Test' });
    assert.equal(controller.state, 'ready');
    controller.start();
    now = 5000;
    assert.equal(controller.getElapsedSeconds(), 5);

    controller.pause();
    now = 9000;
    assert.equal(controller.getElapsedSeconds(), 5);
    controller.resume();
    now = 12000;
    controller.finish();

    assert.equal(controller.state, 'review');
    assert.equal(controller.getElapsedSeconds(), 8);
    controller.markSaved();
    controller.prepareNext();
    assert.equal(controller.state, 'ready');
    assert.equal(controller.getElapsedSeconds(), 0);
});

test('rejects invalid transitions', () => {
    const controller = new RecordingController({ now: () => 0 });
    assert.throws(() => controller.start(), /se esperaba ready/);
    assert.throws(() => controller.pause(), /se esperaba recording/);
    assert.throws(() => controller.finish(), /No se puede finalizar/);
});

test('discard preserves configuration and returns to ready', () => {
    const controller = new RecordingController({ now: () => 0 });
    controller.configure({ patientId: 1 });
    controller.start();
    controller.finish();
    controller.discard();

    assert.equal(controller.state, 'ready');
    assert.equal(controller.configuration.patientId, 1);
});

test('a saved session cannot be discarded as if it were pending', () => {
    const controller = new RecordingController({ now: () => 0 });
    controller.configure({ patientId: 1 });
    controller.start();
    controller.finish();
    controller.markSaved();

    assert.equal(controller.can('discard'), false);
    assert.throws(() => controller.discard(), /No se puede descartar/);
});
