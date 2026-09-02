const test = require('node:test');
const assert = require('node:assert/strict');
const {
    AssistantService, LocalAssistantAdapter, RemoteAssistantAdapter,
    MockAssistantAdapter, anonymizeContext
} = require('../services/assistant-service.js');

test('anonimiza contexto y elimina datos identificatorios', () => {
    const result = anonymizeContext({
        patientId: 42, name: 'Persona Demo', email: 'demo@example.com',
        muscle: 'quadriceps', left: { rms: 1.25, notes: 'Llamar +54 351 555 1234' },
        bilateral: { symmetryIndex: 88.4 }
    });
    assert.deepEqual(result, { muscle: 'quadriceps', left: { rms: 1.25 }, bilateral: { symmetryIndex: 88.4 } });
});

test('modo local funciona sin red y limita el historial', async () => {
    const service = new AssistantService({
        mode: 'local', maximumHistory: 4,
        local: new LocalAssistantAdapter(message => `Local: ${message}`),
        remote: { request: () => { throw new Error('No debe llamarse'); } }
    });
    await service.request('uno');
    await service.request('dos');
    await service.request('tres');
    assert.equal(service.getHistory().length, 4);
    assert.match(service.getHistory().at(-1).content, /Contenido educativo/);
});

test('modo automático usa fallback local ante caída remota', async () => {
    const service = new AssistantService({
        mode: 'auto',
        local: new LocalAssistantAdapter(() => 'Respuesta local'),
        remote: { request: async () => { throw new Error('API caída'); } }
    });
    const result = await service.request('interpreta simetría', { patientId: 9, bilateral: { symmetryIndex: 82 } });
    assert.equal(result.source, 'local');
    assert.equal(result.fallback, true);
    assert.equal(result.remoteError, 'API caída');
});

test('evita solicitudes simultáneas duplicadas', async () => {
    let calls = 0;
    let resolveRequest;
    const local = new LocalAssistantAdapter(() => new Promise(resolve => { calls += 1; resolveRequest = resolve; }));
    const service = new AssistantService({ mode: 'local', local, remote: {} });
    const first = service.request('misma consulta');
    const second = service.request(' MISMA CONSULTA ');
    assert.equal(first, second);
    resolveRequest('Respuesta');
    await first;
    assert.equal(calls, 1);
});

test('adaptador remoto informa timeout y mock es determinista', async () => {
    const remote = new RemoteAssistantAdapter({
        timeoutMs: 5,
        fetch: (_url, options) => new Promise((_resolve, reject) => options.signal.addEventListener('abort', () => reject(Object.assign(new Error('abort'), { name: 'AbortError' }))))
    });
    await assert.rejects(() => remote.request({ message: 'hola', context: {}, history: [] }), /tiempo de espera/);
    const mock = await new MockAssistantAdapter().request({ context: { bilateral: { symmetryIndex: 91.25 } } });
    assert.match(mock.content, /91.3%/);
});

test('restaura historial previo respetando límite y redacción', () => {
    const service = new AssistantService({ mode: 'local', maximumHistory: 2, local: {}, remote: {} });
    const restored = service.restoreHistory([
        { type: 'user', content: 'descartar' },
        { type: 'user', content: 'mi correo es demo@example.com' },
        { type: 'assistant', content: 'respuesta', source: 'local' }
    ]);
    assert.equal(restored.length, 2);
    assert.match(restored[0].content, /\[correo omitido\]/);
});
