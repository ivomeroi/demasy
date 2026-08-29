const test = require('node:test');
const assert = require('node:assert/strict');
const SectionRouter = require('../core/section-router.js');

test('mapea cada sección a una subruta estable y viceversa', () => {
    const router = new SectionRouter();
    const expected = {
        dashboard: '/emg-en-vivo', analysis: '/analisis', patients: '/pacientes',
        'ai-assistant': '/asistente-ia', settings: '/configuracion'
    };
    for (const [section, path] of Object.entries(expected)) {
        assert.equal(router.getPath(section), path);
        assert.equal(router.getSection(path), section);
        assert.equal(router.isAppPath(path), true);
    }
});

test('normaliza raíz, barra final y rutas desconocidas al dashboard', () => {
    const router = new SectionRouter();
    assert.equal(router.getSection('/'), 'dashboard');
    assert.equal(router.getSection('/pacientes/'), 'patients');
    assert.equal(router.getSection('/ruta-inexistente'), 'dashboard');
    assert.equal(router.isAppPath('/ruta-inexistente'), false);
});
