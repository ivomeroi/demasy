const test = require('node:test');
const assert = require('node:assert/strict');
const SessionHistoryService = require('../services/session-history-service.js');

const sessions = [
    { id: 1, startedAt: '2026-08-20T10:00:00Z', muscleType: 'quadriceps', status: 'completed', configuration: { scenario: 'symmetric' }, samples: [{ time: 0 }] },
    { id: 2, startedAt: '2026-08-22T10:00:00Z', muscleType: 'hamstring', status: 'archived', source: { scenario: 'phase-delay' }, emgData: [{ time: 1 }] },
    { id: 3, startedAt: '2026-08-21T10:00:00Z', muscleType: 'quadriceps', status: 'completed', configuration: { scenario: 'left-weakness' }, samples: [] }
];

test('ordena el historial desde la sesión más reciente', () => {
    const service = new SessionHistoryService();
    assert.deepEqual(service.filter(sessions).map(session => session.id), [2, 3, 1]);
});

test('combina filtros de fecha, músculo, escenario y estado', () => {
    const service = new SessionHistoryService();
    assert.deepEqual(service.filter(sessions, { dateFrom: '2026-08-21', dateTo: '2026-08-22', muscleType: 'quadriceps', scenario: 'left-weakness', status: 'completed' }).map(session => session.id), [3]);
});

test('recupera muestras nuevas, históricas y ausentes', () => {
    const service = new SessionHistoryService();
    assert.equal(service.getSamples(sessions[0]).length, 1);
    assert.equal(service.getSamples(sessions[1]).length, 1);
    assert.deepEqual(service.getSamples({}), []);
});
