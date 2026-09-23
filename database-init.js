/**
 * Database Initialization Script
 * Sets up sample data and ensures proper database initialization
 */

const DEMO_DATASET_VERSION = 4;
const DEMO_DATASET_KEY = `demoDataset.v${DEMO_DATASET_VERSION}`;
const DEMO_PROFILES = [
    {
        participant: {
            participantCode: 'DEMO-001', name: 'María García', email: 'maria.garcia@email.com',
            dateOfBirth: '1985-03-15', gender: 'female', height: 165, weight: 60,
            medicalHistory: ['Lesión de menisco izquierdo 2023'],
            notes: 'Caso sintético: rehabilitación de rodilla izquierda y fortalecimiento bilateral.'
        },
        sessions: [
            { date: '2026-08-01T14:00:00.000Z', label: 'Evaluación inicial de cuádriceps', muscleType: 'quadriceps', scenario: 'left-weakness', cadence: 70, resistance: 35, leftScale: 0.68, rightScale: 1, symmetry: 76, notes: 'Caso simulado: menor reclutamiento del cuádriceps izquierdo.' },
            { date: '2026-08-15T14:00:00.000Z', label: 'Control de cuádriceps', muscleType: 'quadriceps', scenario: 'left-weakness', cadence: 74, resistance: 40, leftScale: 0.84, rightScale: 1, symmetry: 88, notes: 'Caso simulado: mejoría del reclutamiento izquierdo respecto de la evaluación inicial.' }
        ]
    },
    {
        participant: {
            participantCode: 'DEMO-002', name: 'Carlos Rodríguez', email: 'carlos.rodriguez@email.com',
            dateOfBirth: '1978-11-22', gender: 'male', height: 180, weight: 85,
            medicalHistory: ['Desgarro isquiotibial derecho 2022', 'Tendinopatía rotuliana bilateral'],
            notes: 'Caso sintético: retorno progresivo al ciclismo recreativo.'
        },
        sessions: [
            { date: '2026-08-03T15:30:00.000Z', label: 'Evaluación de isquiotibiales', muscleType: 'hamstring', scenario: 'right-weakness', cadence: 65, resistance: 45, leftScale: 1, rightScale: 0.62, symmetry: 72, notes: 'Caso simulado: déficit persistente del isquiotibial derecho.' },
            { date: '2026-08-18T15:30:00.000Z', label: 'Control de isquiotibiales', muscleType: 'hamstring', scenario: 'right-weakness', cadence: 70, resistance: 50, leftScale: 1, rightScale: 0.79, symmetry: 84, notes: 'Caso simulado: recuperación parcial del lado derecho.' }
        ]
    },
    {
        participant: {
            participantCode: 'DEMO-003', name: 'Ana López', email: 'ana.lopez@email.com',
            dateOfBirth: '1992-07-08', gender: 'female', height: 158, weight: 52,
            medicalHistory: [], notes: 'Caso sintético: evaluación preventiva de ciclista recreativa sin antecedentes relevantes.'
        },
        sessions: [
            { date: '2026-08-05T12:00:00.000Z', label: 'Evaluación preventiva', muscleType: 'gastrocnemius', scenario: 'symmetric', cadence: 80, resistance: 30, leftScale: 0.97, rightScale: 1, symmetry: 96, notes: 'Caso simulado: patrón bilateral dentro del rango esperado.' },
            { date: '2026-08-20T12:00:00.000Z', label: 'Control preventivo', muscleType: 'gastrocnemius', scenario: 'phase-delay', cadence: 85, resistance: 35, leftScale: 0.98, rightScale: 1, phaseDelayDegrees: 12, symmetry: 95, notes: 'Caso simulado: amplitud simétrica con pequeño retraso temporal derecho.' }
        ]
    },
    {
        participant: {
            participantCode: 'DEMO-004', name: 'Lucía Fernández', email: 'lucia.fernandez@example.com',
            dateOfBirth: '1990-02-18', gender: 'female', height: 168, weight: 63,
            medicalHistory: ['Esguince de tobillo derecho 2024'], notes: 'Caso sintético: recuperación funcional del miembro inferior derecho.'
        },
        sessions: [
            { date: '2026-07-10T13:00:00.000Z', label: 'Evaluación inicial de gemelos', muscleType: 'gastrocnemius', scenario: 'right-weakness', cadence: 62, resistance: 30, leftScale: 1, rightScale: 0.66, symmetry: 70, notes: 'Caso simulado: menor activación derecha posterior al esguince.' },
            { date: '2026-08-10T13:00:00.000Z', label: 'Control de gemelos', muscleType: 'gastrocnemius', scenario: 'right-weakness', cadence: 68, resistance: 35, leftScale: 1, rightScale: 0.82, symmetry: 86, notes: 'Caso simulado: recuperación parcial de la activación derecha.' }
        ]
    },
    {
        participant: {
            participantCode: 'DEMO-005', name: 'Diego Martínez', email: 'diego.martinez@example.com',
            dateOfBirth: '1983-09-04', gender: 'male', height: 175, weight: 78,
            medicalHistory: ['Reconstrucción de ligamento cruzado anterior izquierdo 2021'], notes: 'Caso sintético: seguimiento tardío de fuerza del cuádriceps.'
        },
        sessions: [
            { date: '2026-07-12T16:00:00.000Z', label: 'Control funcional de cuádriceps', muscleType: 'quadriceps', scenario: 'left-weakness', cadence: 68, resistance: 42, leftScale: 0.73, rightScale: 1, symmetry: 78, notes: 'Caso simulado: asimetría izquierda residual.' },
            { date: '2026-08-12T16:00:00.000Z', label: 'Reevaluación de cuádriceps', muscleType: 'quadriceps', scenario: 'left-weakness', cadence: 72, resistance: 45, leftScale: 0.8, rightScale: 1, symmetry: 84, notes: 'Caso simulado: mejora moderada manteniendo asimetría.' }
        ]
    },
    {
        participant: {
            participantCode: 'DEMO-006', name: 'Sofía Pérez', email: 'sofia.perez@example.com',
            dateOfBirth: '1995-12-11', gender: 'female', height: 162, weight: 56,
            medicalHistory: [], notes: 'Caso sintético: deportista sin lesión y patrón bilateral estable.'
        },
        sessions: [
            { date: '2026-07-14T11:00:00.000Z', label: 'Línea de base bilateral', muscleType: 'quadriceps', scenario: 'symmetric', cadence: 82, resistance: 38, leftScale: 0.96, rightScale: 1, symmetry: 95, notes: 'Caso simulado: activación bilateral estable.' },
            { date: '2026-08-14T11:00:00.000Z', label: 'Control bilateral', muscleType: 'quadriceps', scenario: 'symmetric', cadence: 82, resistance: 38, leftScale: 0.98, rightScale: 1, symmetry: 97, notes: 'Caso simulado: condiciones equivalentes y simetría conservada.' }
        ]
    },
    {
        participant: {
            participantCode: 'DEMO-007', name: 'Martín Sánchez', email: 'martin.sanchez@example.com',
            dateOfBirth: '1975-05-27', gender: 'male', height: 182, weight: 88,
            medicalHistory: ['Distensión de isquiotibial izquierdo 2025'], notes: 'Caso sintético: retorno gradual a la actividad luego de lesión muscular.'
        },
        sessions: [
            { date: '2026-07-16T14:30:00.000Z', label: 'Retorno inicial de isquiotibiales', muscleType: 'hamstring', scenario: 'left-weakness', cadence: 60, resistance: 32, leftScale: 0.58, rightScale: 1, symmetry: 65, notes: 'Caso simulado: diferencia marcada del lado izquierdo.' },
            { date: '2026-08-16T14:30:00.000Z', label: 'Control de retorno', muscleType: 'hamstring', scenario: 'left-weakness', cadence: 66, resistance: 37, leftScale: 0.75, rightScale: 1, symmetry: 80, notes: 'Caso simulado: evolución favorable con déficit persistente.' }
        ]
    },
    {
        participant: {
            participantCode: 'DEMO-008', name: 'Valentina Romero', email: 'valentina.romero@example.com',
            dateOfBirth: '1988-06-30', gender: 'female', height: 170, weight: 65,
            medicalHistory: ['Tendinopatía aquílea bilateral'], notes: 'Caso sintético: comparación bilateral con retraso temporal.'
        },
        sessions: [
            { date: '2026-07-18T10:30:00.000Z', label: 'Evaluación aquílea funcional', muscleType: 'gastrocnemius', scenario: 'phase-delay', cadence: 64, resistance: 34, leftScale: 0.91, rightScale: 1, phaseDelayDegrees: 24, symmetry: 90, notes: 'Caso simulado: amplitud próxima a simétrica con retraso temporal.' },
            { date: '2026-08-18T10:30:00.000Z', label: 'Control aquíleo funcional', muscleType: 'gastrocnemius', scenario: 'phase-delay', cadence: 68, resistance: 36, leftScale: 0.95, rightScale: 1, phaseDelayDegrees: 10, symmetry: 94, notes: 'Caso simulado: reducción del retraso temporal.' }
        ]
    },
    {
        participant: {
            participantCode: 'DEMO-009', name: 'Javier Torres', email: 'javier.torres@example.com',
            dateOfBirth: '1969-01-19', gender: 'male', height: 173, weight: 81,
            medicalHistory: ['Artrosis leve de rodilla derecha'], notes: 'Caso sintético: diferencia funcional derecha sostenida.'
        },
        sessions: [
            { date: '2026-07-20T15:00:00.000Z', label: 'Evaluación de rodilla derecha', muscleType: 'quadriceps', scenario: 'right-weakness', cadence: 58, resistance: 28, leftScale: 1, rightScale: 0.7, symmetry: 75, notes: 'Caso simulado: menor activación derecha.' },
            { date: '2026-08-20T15:00:00.000Z', label: 'Control de rodilla derecha', muscleType: 'quadriceps', scenario: 'right-weakness', cadence: 62, resistance: 30, leftScale: 1, rightScale: 0.76, symmetry: 81, notes: 'Caso simulado: mejora leve del lado derecho.' }
        ]
    },
    {
        participant: {
            participantCode: 'DEMO-010', name: 'Camila Díaz', email: 'camila.diaz@example.com',
            dateOfBirth: '1998-10-06', gender: 'female', height: 160, weight: 54,
            medicalHistory: [], notes: 'Caso sintético: evaluación preventiva con evolución estable.'
        },
        sessions: [
            { date: '2026-07-22T09:00:00.000Z', label: 'Evaluación preventiva bilateral', muscleType: 'hamstring', scenario: 'symmetric', cadence: 76, resistance: 33, leftScale: 0.94, rightScale: 1, symmetry: 93, notes: 'Caso simulado: leve diferencia sin antecedente de lesión.' },
            { date: '2026-08-22T09:00:00.000Z', label: 'Seguimiento preventivo bilateral', muscleType: 'hamstring', scenario: 'symmetric', cadence: 76, resistance: 33, leftScale: 0.97, rightScale: 1, symmetry: 96, notes: 'Caso simulado: patrón bilateral estable en condiciones equivalentes.' }
        ]
    }
];

async function initializeSampleData(options = {}) {
    console.log('Setting up sample database data...');
    
    try {
        // Wait for the database to be initialized
        if (!window.app || !window.app.database) {
            console.log('Waiting for database initialization...');
            return;
        }
        
        const db = window.app.database;
        
        const existingPatients = await db.listPatients({ includeArchived: true });
        if (!options.force && await db.getSetting(DEMO_DATASET_KEY, false)) {
            console.log('Coherent demo dataset already initialized');
            return;
        }

        const existingByCode = new Map(existingPatients.map(patient => [patient.participantCode, patient]));
        if (!options.force && existingPatients.length > 0 && !DEMO_PROFILES.some(profile => existingByCode.has(profile.participant.participantCode))) {
            console.log('User database detected without demo participants; sample data was not added');
            await db.setSetting(DEMO_DATASET_KEY, { status: 'skipped', reason: 'user-data-present' });
            return;
        }

        for (const profile of DEMO_PROFILES) {
            let patient = existingByCode.get(profile.participant.participantCode);
            patient = patient
                ? await db.updatePatient(patient.id, profile.participant)
                : await db.createPatient(profile.participant);
            await createSampleSessions(db, patient, profile.sessions);
        }

        await db.setSetting(DEMO_DATASET_KEY, { status: 'completed', version: DEMO_DATASET_VERSION, updatedAt: new Date().toISOString() });
        
        console.log('Sample data initialization completed');
        
        // Show notification if the app is ready
        if (window.app && window.app.showNotification) {
            window.app.showNotification('Base de datos inicializada con datos de ejemplo', 'success');
        }
        
    } catch (error) {
        console.error('Error initializing sample data:', error);
        if (window.app && window.app.showNotification) {
            window.app.showNotification('Error al inicializar datos de ejemplo', 'error');
        }
    }
}

async function createSampleSessions(db, patient, definitions) {
    const existing = await db.getPatientSessions(patient.id, { includeArchived: true });
    const replaceable = existing.filter(session => session.source?.provider === 'legacy' || /^demasy-demo-v\d+$/.test(session.source?.provider || ''));
    for (let index = 0; index < definitions.length; index++) {
        const definition = definitions[index];
        const sessionData = buildDemoSession(patient.id, definition, `${patient.participantCode}-${index + 1}`);
        if (replaceable[index]) await db.updateSession(replaceable[index].id, sessionData);
        else await db.createSession(sessionData);
    }
}

function buildDemoSession(patientId, definition, seedText) {
    const durationSeconds = 30;
    const samples = generateCoherentEMGData({ ...definition, durationSeconds, sampleRate: 100, seed: hashSeed(seedText) });
    const difference = 100 - definition.symmetry;
    return {
        patientId, label: definition.label, muscleType: definition.muscleType, flexorMuscleType: definition.muscleType,
        extensorMuscleType: ({ quadriceps: 'hamstring', hamstring: 'quadriceps', gastrocnemius: 'tibialis' })[definition.muscleType] || 'complementary', sessionType: 'cycling',
        date: definition.date, startedAt: definition.date, duration: durationSeconds, durationSeconds,
        cadence: definition.cadence, resistance: definition.resistance, samples,
        channelSchema: 'flexor-extensor-4ch',
        source: { type: 'simulation', provider: `demasy-demo-v${DEMO_DATASET_VERSION}`, scenario: definition.scenario, version: DEMO_DATASET_VERSION },
        configuration: {
            label: definition.label, muscleType: definition.muscleType, testType: 'cycling',
            plannedDurationSeconds: durationSeconds, cadenceRpm: definition.cadence,
            resistancePercent: definition.resistance, scenario: definition.scenario,
            phaseDelayDegrees: definition.phaseDelayDegrees || 0, source: { type: 'simulation' }
        },
        statistics: {
            flexor: { bilateral: { symmetryIndex: definition.symmetry, asymmetryLevel: difference, difference } },
            extensor: { bilateral: { symmetryIndex: Math.min(100, definition.symmetry + 3), asymmetryLevel: Math.max(0, difference - 3), difference: Math.max(0, difference - 3) } },
            bilateral: { symmetryIndex: definition.symmetry, asymmetryLevel: difference, difference },
            pedalingEfficiency: Math.round(70 + definition.symmetry * 0.18)
        },
        notes: definition.notes
    };
}

function generateCoherentEMGData(options) {
    const random = seededRandom(options.seed);
    const samples = [];
    const cycleHz = options.cadence / 60;
    const phaseDelay = (options.phaseDelayDegrees || 0) * Math.PI / 180;
    for (let index = 0; index < options.durationSeconds * options.sampleRate; index++) {
        const time = index / options.sampleRate;
        const leftPhase = 2 * Math.PI * cycleHz * time;
        const rightPhase = leftPhase + Math.PI + phaseDelay;
        const flexorLeft = generateEMGSide(time, leftPhase, options.leftScale, random);
        const flexorRight = generateEMGSide(time, rightPhase, options.rightScale, random);
        const extensorLeft = generateEMGSide(time, leftPhase + Math.PI, options.leftScale * 0.86, random);
        const extensorRight = generateEMGSide(time, rightPhase + Math.PI, options.rightScale * 0.89, random);
        samples.push({ time, channelSchema: 'flexor-extensor-4ch', flexor: { left: flexorLeft, right: flexorRight }, extensor: { left: extensorLeft, right: extensorRight } });
    }
    return samples;
}

function generateEMGSide(time, phase, scale, random) {
    const envelope = 0.08 + 0.92 * Math.pow(Math.max(0, Math.sin(phase)), 1.8);
    const carrier = Math.sin(2 * Math.PI * 37 * time) + 0.42 * Math.sin(2 * Math.PI * 23 * time + 0.7);
    const noise = (random() - 0.5) * 0.08;
    const amplitude = scale * (0.42 * envelope * carrier + noise);
    return { amplitude, activation: Math.min(1, Math.max(0, envelope * scale)) };
}

function hashSeed(value) {
    return [...String(value)].reduce((hash, character) => Math.imul(hash ^ character.charCodeAt(0), 16777619), 2166136261) >>> 0;
}

function seededRandom(seed) {
    let state = seed >>> 0;
    return () => {
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
        return state / 4294967296;
    };
}

// Database maintenance functions
async function clearSampleData() {
    if (!window.app || !window.app.database) {
        console.error('Database not available');
        return;
    }
    if (!window.confirm('¿Eliminar todos los datos locales? Esta acción no se puede deshacer sin un respaldo.')) return;
    
    try {
        await window.app.database.clearAllData();
        if (window.app.showNotification) {
            window.app.showNotification('Todos los datos locales fueron eliminados', 'success');
        }
        
        // Refresh patients section if visible
        if (window.app.patientManager) {
            await window.app.patientManager.refreshPatientList();
        }
        
    } catch (error) {
        console.error('Error clearing sample data:', error);
        if (window.app.showNotification) {
            window.app.showNotification('Error al eliminar datos de ejemplo', 'error');
        }
    }
}

async function exportAllData() {
    if (!window.app || !window.app.database) {
        console.error('Database not available');
        return;
    }
    
    try {
        const data = await window.app.database.exportAllData();
        
        const blob = new Blob([JSON.stringify(data, null, 2)], {
            type: 'application/json'
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `demasy-database-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        if (window.app.showNotification) {
            window.app.showNotification('Base de datos exportada exitosamente', 'success');
        }
        
    } catch (error) {
        console.error('Error exporting database:', error);
        if (window.app.showNotification) {
            window.app.showNotification('Error al exportar base de datos', 'error');
        }
    }
}

async function getDatabaseStats() {
    if (!window.app || !window.app.database) {
        console.error('Database not available');
        return null;
    }
    
    try {
        const stats = await window.app.database.getStatistics();
        console.log('Database Statistics:', stats);
        return stats;
    } catch (error) {
        console.error('Error getting database stats:', error);
        return null;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { buildDemoSession, generateCoherentEMGData, hashSeed, seededRandom, DEMO_PROFILES };
}

if (typeof window !== 'undefined') {
    window.dbUtils = { initializeSampleData, clearSampleData, exportAllData, getDatabaseStats };
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(async () => {
            const maxAttempts = 10;
            let attempts = 0;
            const tryInitialize = async () => {
                if (window.app && window.app.database && window.app.database.db) await initializeSampleData();
                else if (attempts < maxAttempts) {
                    attempts++;
                    setTimeout(tryInitialize, 1000);
                } else console.log('Could not initialize sample data - database not ready');
            };
            await tryInitialize();
        }, 2000);
    });

    console.log('Database initialization script loaded. Available commands:');
    console.log('- window.dbUtils.initializeSampleData() - Initialize sample participants');
    console.log('- window.dbUtils.clearSampleData() - Clear all data');
    console.log('- window.dbUtils.exportAllData() - Export database');
    console.log('- window.dbUtils.getDatabaseStats() - Get statistics');
}
