const test = require('node:test');
const assert = require('node:assert/strict');
const DataNormalizationService = require('../services/data-normalization-service.js');

test('normaliza y valida un participante sin exigir datos identificatorios', () => {
    const service = new DataNormalizationService();
    const participant = service.normalizeParticipant({
        participantCode: ' demo-001 ',
        email: ' TEST@EXAMPLE.COM ',
        medicalHistory: 'Lesión previa\n\nControl anual'
    });

    assert.equal(participant.participantCode, 'DEMO-001');
    assert.equal(participant.name, '');
    assert.equal(participant.email, 'test@example.com');
    assert.deepEqual(participant.medicalHistory, ['Lesión previa', 'Control anual']);
    assert.equal(participant.status, 'active');
});

test('rechaza códigos, email y medidas inválidos', () => {
    const service = new DataNormalizationService();
    assert.throws(() => service.normalizeParticipant({ participantCode: '!' }), /código/);
    assert.throws(() => service.normalizeParticipant({ participantCode: 'P-1', email: 'incorrecto' }), /email/);
    assert.throws(() => service.normalizeParticipant({ participantCode: 'P-1', height: 10 }), /altura/);
});

test('adapta participantes históricos conservando id y estado', () => {
    const service = new DataNormalizationService();
    const participant = service.normalizeLegacyParticipant({ id: 42, name: 'Histórico', isActive: false });

    assert.equal(participant.id, 42);
    assert.equal(participant.participantCode, 'P-0042');
    assert.equal(participant.status, 'archived');
});

test('unifica sesiones históricas y nuevas en el esquema v1', () => {
    const service = new DataNormalizationService();
    const session = service.normalizeSession({
        id: 7,
        patientId: 42,
        date: '2026-01-01T10:00:00.000Z',
        duration: 2,
        emgData: [{ time: 0, left: { emg: 1 }, right: { emg: 2 } }],
        sessionType: 'cycling'
    });

    assert.equal(session.id, 7);
    assert.equal(session.schemaVersion, 1);
    assert.equal(session.durationSeconds, 2);
    assert.equal(session.samples, session.emgData);
    assert.equal(session.source.type, 'simulation');
    assert.equal(session.endedAt, '2026-01-01T10:00:02.000Z');
});

test('rechaza sesiones sin un participante válido', () => {
    const service = new DataNormalizationService();
    assert.throws(() => service.normalizeSession({ patientId: 0 }), /participante válido/);
});
