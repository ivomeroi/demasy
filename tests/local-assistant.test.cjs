const test = require('node:test');
const assert = require('node:assert/strict');
const KinesiologyAIAssistant = require('../ai-assistant.js');

function assistantWithContext() {
    const assistant = new KinesiologyAIAssistant();
    assistant.updateEMGContext({
        left: { rms: 0.62, peakAmplitude: 1.4 },
        right: { rms: 0.48, peakAmplitude: 1.1 },
        bilateral: { symmetryIndex: 82.4, difference: 17.6, snr: 24 }
    });
    return assistant;
}

test('distingue simetría, métricas y calidad de señal', async () => {
    const assistant = assistantWithContext();
    const symmetry = await assistant.processQuery('¿Qué indica esta asimetría bilateral?');
    const rms = await assistant.processQuery('¿Qué significa RMS?');
    const quality = await assistant.processQuery('¿Cómo está la calidad de la señal?');

    assert.match(symmetry, /82\.4%/);
    assert.match(symmetry, /diferencia leve/);
    assert.match(rms, /^RMS:/);
    assert.match(quality, /REGULAR/);
    assert.notEqual(symmetry, rms);
    assert.notEqual(rms, quality);
});

test('aplica límites de alcance antes que una interpretación genérica', async () => {
    const assistant = assistantWithContext();
    assert.match(await assistant.processQuery('Analiza la fatiga muscular'), /no realiza análisis de fatiga/i);
    assert.match(await assistant.processQuery('Recomienda un ejercicio y tratamiento'), /No puedo prescribir/i);
    assert.match(await assistant.processQuery('Hola'), /No identifiqué una consulta específica/);
});

test('informa cuando todavía no existen métricas de simetría', async () => {
    const assistant = new KinesiologyAIAssistant();
    assert.match(await assistant.processQuery('¿Qué simetría hay?'), /No hay un índice de simetría/);
});
