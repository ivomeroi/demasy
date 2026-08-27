const test = require('node:test');
const assert = require('node:assert/strict');
const SessionConfigurationService = require('../services/session-configuration-service.js');

const validInput = {
    patientId: '12',
    label: ' Evaluación inicial ',
    muscleType: 'quadriceps',
    plannedDurationSeconds: '60',
    cadenceRpm: '80',
    resistancePercent: '50',
    scenario: 'left-weakness',
    asymmetryPercent: '20',
    phaseDelayDegrees: '0',
    notes: ' Demo '
};

test('normalizes valid form values', () => {
    const service = new SessionConfigurationService();
    const result = service.normalize(validInput);

    assert.equal(result.patientId, 12);
    assert.equal(result.label, 'Evaluación inicial');
    assert.equal(result.cadenceRpm, 80);
    assert.equal(result.scenarioParameters.affectedSide, 'left');
    assert.equal(result.source.type, 'simulation');
});

test('reports all relevant validation errors', () => {
    const service = new SessionConfigurationService();
    const result = service.validate({
        patientId: '', muscleType: 'unknown', scenario: 'unknown',
        plannedDurationSeconds: 5, cadenceRpm: 500,
        resistancePercent: -1, asymmetryPercent: 90, phaseDelayDegrees: 200
    });

    assert.equal(result.valid, false);
    assert.deepEqual(Object.keys(result.errors).sort(), [
        'asymmetryPercent', 'cadenceRpm', 'muscleType', 'patientId',
        'phaseDelayDegrees', 'plannedDurationSeconds', 'resistancePercent', 'scenario'
    ]);
});

test('enforces the approved maximum duration', () => {
    const service = new SessionConfigurationService();
    assert.throws(
        () => service.normalize({ ...validInput, plannedDurationSeconds: 1801 }),
        error => error.validationErrors.plannedDurationSeconds !== undefined
    );
});
