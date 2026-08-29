const test = require('node:test');
const assert = require('node:assert/strict');
const { buildDemoSession, generateCoherentEMGData, hashSeed, DEMO_PROFILES } = require('../database-init.js');

function rms(samples, side) {
    return Math.sqrt(samples.reduce((sum, sample) => sum + sample[side].amplitude ** 2, 0) / samples.length);
}

test('genera una señal demo determinista, bipolar y con frecuencia coherente', () => {
    const options = { durationSeconds: 2, sampleRate: 100, cadence: 60, leftScale: 0.7, rightScale: 1, seed: hashSeed('demo') };
    const first = generateCoherentEMGData(options);
    const second = generateCoherentEMGData(options);
    assert.equal(first.length, 200);
    assert.deepEqual(first, second);
    assert(first.some(sample => sample.left.amplitude < 0));
    assert(first.some(sample => sample.left.amplitude > 0));
    assert(rms(first, 'left') < rms(first, 'right'));
});

test('cada participante demo posee dos sesiones sintéticas coherentes y etiquetadas', () => {
    assert.equal(DEMO_PROFILES.length, 3);
    for (const profile of DEMO_PROFILES) {
        assert.equal(profile.sessions.length, 2);
        const session = buildDemoSession(1, profile.sessions[0], profile.participant.participantCode);
        assert.equal(session.samples.length, 3000);
        assert.equal(session.source.type, 'simulation');
        assert.equal(session.source.provider, 'demasy-demo-v2');
        assert.equal(session.configuration.scenario, profile.sessions[0].scenario);
        assert.equal(session.statistics.bilateral.symmetryIndex, profile.sessions[0].symmetry);
    }
});
