const test = require('node:test');
const assert = require('node:assert/strict');
const OnboardingTour = require('../services/onboarding-tour.js');

function memoryStorage() {
    const values = new Map();
    return {
        getItem: key => values.get(key) ?? null,
        setItem: (key, value) => values.set(key, String(value))
    };
}

test('muestra el tutorial hasta que el usuario lo completa', () => {
    const storage = memoryStorage();
    const tour = new OnboardingTour({ storage });

    assert.equal(tour.hasCompleted(), false);
    tour.markCompleted();
    assert.equal(tour.hasCompleted(), true);
});

test('define un recorrido por todas las secciones principales', () => {
    const tour = new OnboardingTour({ storage: memoryStorage() });
    const sections = new Set(tour.steps.map(step => step.section).filter(Boolean));

    assert.deepEqual([...sections].sort(), ['ai-assistant', 'analysis', 'dashboard', 'patients', 'settings']);
    assert.equal(tour.steps.at(-1).title, 'Todo listo');
});

test('no vuelve a iniciar automáticamente después de completarse', async () => {
    const tour = new OnboardingTour({ storage: memoryStorage() });
    tour.markCompleted();

    assert.equal(await tour.start(), false);
    assert.equal(tour.active, false);
});
