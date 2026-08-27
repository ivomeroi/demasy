const test = require('node:test');
const assert = require('node:assert/strict');
const AnalysisService = require('../services/analysis-service.js');

test('calculates known time-domain metrics', () => {
    const service = new AnalysisService();
    const result = service.calculateSide([-2, -1, 1, 2]);

    assert.equal(result.count, 4);
    assert.equal(result.rms, Math.sqrt(2.5));
    assert.equal(result.mav, 1.5);
    assert.equal(result.peakAmplitude, 2);
    assert.equal(result.min, -2);
    assert.equal(result.max, 2);
});

test('uses the approved bounded symmetry formula', () => {
    const service = new AnalysisService();
    const bilateral = service.calculateBilateral(2, 1);

    assert.equal(bilateral.symmetryIndex, 50);
    assert.equal(bilateral.difference, 50);
    assert.equal(bilateral.dominantSide, 'left');
    assert.equal(bilateral.asymmetryLevel, 'Diferencia marcada');
});

test('treats two empty sides as balanced', () => {
    const service = new AnalysisService();
    const result = service.analyzeSamples([]);

    assert.equal(result.left.rms, 0);
    assert.equal(result.right.rms, 0);
    assert.equal(result.bilateral.symmetryIndex, 100);
    assert.equal(result.bilateral.dominantSide, 'balanced');
});
