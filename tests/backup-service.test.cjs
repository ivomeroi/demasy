const test = require('node:test');
const assert = require('node:assert/strict');
const BackupService = require('../services/backup-service.js');

const payload = { application: 'DEMASY', schemaVersion: 1, data: {
    patients: [{ id: 1, participantCode: 'P-1' }],
    sessions: [{ id: 1, patientId: 1, startedAt: '2026-01-01', muscleType: 'quadriceps', label: 'A' }],
    analyses: [{ id: 1, sessionId: 1, analysisType: 'symmetry' }], settings: []
} };

test('valida estructura, tamaño y referencias del respaldo', () => {
    const service = new BackupService();
    assert.equal(service.validate(payload).valid, true);
    const broken = structuredClone(payload);
    broken.data.sessions[0].patientId = 99;
    assert.equal(service.validate(broken).valid, false);
    assert.equal(new BackupService({ maximumBytes: 1 }).validate(payload).valid, false);
});

test('planifica merge remapeando ids y omitiendo duplicados', () => {
    const service = new BackupService();
    const current = { patients: [{ id: 10, participantCode: 'P-1' }], sessions: [], analyses: [], settings: [] };
    const plan = service.planMerge(current, payload.data);
    assert.equal(plan.report.skipped.patients, 1);
    assert.equal(plan.report.created.sessions, 1);
    assert.equal(plan.records.sessions[0].patientId, 10);
});

test('rechaza respaldos corruptos sin lanzar errores internos', () => {
    const service = new BackupService();
    for (const corrupt of [null, {}, { application: 'DEMASY', schemaVersion: 1, data: {} }]) {
        assert.doesNotThrow(() => service.validate(corrupt));
        assert.equal(service.validate(corrupt).valid, false);
    }
    const invalidRecord = structuredClone(payload);
    invalidRecord.data.patients = [null];
    assert.doesNotThrow(() => service.validate(invalidRecord));
    assert.match(service.validate(invalidRecord).errors.join(' '), /Registro inválido/);
});
