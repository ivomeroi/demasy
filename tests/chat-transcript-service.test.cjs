const test = require('node:test');
const assert = require('node:assert/strict');
const ChatTranscriptService = require('../services/chat-transcript-service.js');

function memorySessionStorage() {
    const values = new Map();
    return {
        getItem: key => values.has(key) ? values.get(key) : null,
        setItem: (key, value) => values.set(key, value),
        removeItem: key => values.delete(key)
    };
}

test('restaura el chat después de recrear el servicio', () => {
    const storage = memorySessionStorage();
    new ChatTranscriptService(storage).save([
        { type: 'user', content: '¿Qué significa RMS?' },
        { type: 'assistant', content: 'RMS resume la amplitud.', source: 'local' }
    ]);
    assert.deepEqual(new ChatTranscriptService(storage).load(), [
        { type: 'user', content: '¿Qué significa RMS?', source: null, fallback: false },
        { type: 'assistant', content: 'RMS resume la amplitud.', source: 'local', fallback: false }
    ]);
});

test('descarta entradas inválidas, limita historial y permite limpiarlo', () => {
    const storage = memorySessionStorage();
    const service = new ChatTranscriptService(storage, { maximumMessages: 2 });
    service.save([{ type: 'invalid', content: 'x' }, { type: 'user', content: 'uno' }, { type: 'assistant', content: 'dos' }, { type: 'user', content: 'tres' }]);
    assert.deepEqual(service.load().map(entry => entry.content), ['dos', 'tres']);
    service.clear();
    assert.deepEqual(service.load(), []);
});
