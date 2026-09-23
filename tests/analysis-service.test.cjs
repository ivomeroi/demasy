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

test('calcula métricas temporales adicionales documentadas en el informe', () => {
    const service = new AnalysisService();
    const result = service.calculateSide([-1, 1, -1, 1]);
    assert.equal(result.peakToPeak, 2);
    assert.equal(result.waveformLength, 6);
    assert.equal(result.zeroCrossings, 3);
    assert.equal(result.meanNormalizedActivation, 100);
    assert(result.shannonEntropy > 0);
});

test('elimina el nivel de continua antes de calcular amplitud', () => {
    const service = new AnalysisService();
    const result = service.calculateSide([9, 11, 9, 11]);
    assert.equal(result.dcOffset, 10);
    assert.equal(result.rms, 1);
    assert.equal(result.mav, 1);
});

test('procesa sesiones del tamaño máximo sin expandir el vector como argumentos', () => {
    const service = new AnalysisService();
    const values = Array.from({ length: 180000 }, (_, index) => index % 2 ? 1 : -1);
    const result = service.calculateSide(values);
    assert.equal(result.count, 180000);
    assert.equal(result.rms, 1);
    assert.equal(result.peakToPeak, 2);
});

test('uses the approved bounded symmetry formula', () => {
    const service = new AnalysisService();
    const bilateral = service.calculateBilateral(2, 1);

    assert.equal(bilateral.symmetryIndex, 50);
    assert.equal(bilateral.difference, 50);
    assert.equal(bilateral.dominantSide, 'left');
    assert.equal(bilateral.asymmetryLevel, 'Diferencia marcada');
});

test('calcula múltiples índices de asimetría y conserva su dirección', () => {
    const service = new AnalysisService();
    const leftDominant = service.calculateBilateral(2, 1, 0.1);
    const rightDominant = service.calculateBilateral(1, 2, 0.1);
    assert.equal(leftDominant.relativeAsymmetry, 50);
    assert(Math.abs(leftDominant.robinsonAsymmetry - 100 / 1.5) < 1e-10);
    assert(leftDominant.weightedUniversalAsymmetry > 0);
    assert(rightDominant.robinsonAsymmetry < 0);
    assert(rightDominant.weightedUniversalAsymmetry < 0);
    assert(Math.abs(leftDominant.weightedUniversalAsymmetry) < Math.abs(leftDominant.universalAsymmetry));
});

test('treats two empty sides as balanced', () => {
    const service = new AnalysisService();
    const result = service.analyzeSamples([]);

    assert.equal(result.left.rms, 0);
    assert.equal(result.right.rms, 0);
    assert.equal(result.bilateral.symmetryIndex, 100);
    assert.equal(result.bilateral.dominantSide, 'balanced');
});

test('calcula evolución por ventanas y acepta muestras históricas', () => {
    const service = new AnalysisService();
    const samples = [
        { time: 0, left: { emg: -1 }, right: { emg: -2 } },
        { time: 0.5, left: { emg: 1 }, right: { emg: 2 } },
        { time: 1, left: -2, right: -2 },
        { time: 1.5, left: 2, right: 2 }
    ];
    const windows = service.analyzeWindows(samples, { windowSeconds: 1 });
    assert.equal(windows.length, 2);
    assert.equal(windows[0].bilateral.symmetryIndex, 50);
    assert.equal(windows[1].bilateral.symmetryIndex, 100);
});

test('aplica reglas de compatibilidad y omite progreso si cambian condiciones', () => {
    const service = new AnalysisService();
    const sample = amplitude => [{ time: 0, left: { amplitude: -amplitude }, right: { amplitude: -amplitude } }, { time: 1, left: { amplitude }, right: { amplitude } }];
    const first = { id: 1, patientId: 1, muscleType: 'quadriceps', sessionType: 'cycling', cadence: 70, resistance: 30, duration: 1, samples: sample(1), configuration: { scenario: 'symmetric' } };
    const second = { ...first, id: 2, cadence: 80, samples: sample(2) };
    const comparison = service.compareSessions(first, second);
    assert.equal(comparison.compatibility.compatible, true);
    assert.equal(comparison.compatibility.equivalentConditions, false);
    assert.equal(comparison.differences.leftRms.absolute, 1);
    assert.equal(comparison.differences.leftRms.percentage, null);
    assert.equal(comparison.sessions.first.cadence, 70);
    assert.equal(comparison.sessions.second.cadence, 80);
    assert.equal(service.checkCompatibility(first, { ...second, muscleType: 'hamstring' }).compatible, false);
});

test('analiza flexores y extensores bilateralmente de forma independiente', () => {
    const service = new AnalysisService();
    const samples = [-1, 1].map((value, index) => ({
        time: index,
        flexor: { left: { amplitude: value }, right: { amplitude: value * 2 } },
        extensor: { left: { amplitude: value * 3 }, right: { amplitude: value * 3 } }
    }));
    const result = service.analyzeSamples(samples);
    assert.equal(result.flexor.bilateral.symmetryIndex, 50);
    assert.equal(result.extensor.bilateral.symmetryIndex, 100);
    assert.equal(result.flexor.left.rms, 1);
    assert.equal(result.extensor.left.rms, 3);
});

test('ordena múltiples sesiones para análisis longitudinal', () => {
    const service = new AnalysisService();
    const samples = [{ time: 0, left: -1, right: -2 }, { time: 1, left: 1, right: 2 }];
    const sessions = [
        { id: 2, patientId: 1, startedAt: '2026-02-02T10:00:00Z', samples },
        { id: 1, patientId: 1, startedAt: '2026-01-01T10:00:00Z', samples },
        { id: 3, patientId: 1, startedAt: '2026-03-03T10:00:00Z', samples }
    ];
    const result = service.analyzeSessions(sessions);
    assert.deepEqual(result.chronological.map(item => item.session.id), [1, 2, 3]);
    assert.deepEqual(result.newestFirst.map(item => item.session.id), [3, 2, 1]);
    assert.equal(result.newestFirst[0].analysis.metrics.flexor.bilateral.symmetryIndex, 50);
});
