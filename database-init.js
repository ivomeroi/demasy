/**
 * Database Initialization Script
 * Sets up sample data and ensures proper database initialization
 */

const DEMO_DATASET_VERSION = 2;
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
    }
];

async function initializeSampleData() {
    console.log('Setting up sample database data...');
    
    try {
        // Wait for the database to be initialized
        if (!window.app || !window.app.database) {
            console.log('Waiting for database initialization...');
            return;
        }
        
        const db = window.app.database;
        
        const existingPatients = await db.listPatients({ includeArchived: true });
        if (await db.getSetting(DEMO_DATASET_KEY, false)) {
            console.log('Coherent demo dataset already initialized');
            return;
        }

        const existingByCode = new Map(existingPatients.map(patient => [patient.participantCode, patient]));
        if (existingPatients.length > 0 && !DEMO_PROFILES.some(profile => existingByCode.has(profile.participant.participantCode))) {
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
    const replaceable = existing.filter(session => session.source?.provider === 'legacy' || session.source?.provider === 'demasy-demo-v2');
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
        patientId, label: definition.label, muscleType: definition.muscleType, sessionType: 'cycling',
        date: definition.date, startedAt: definition.date, duration: durationSeconds, durationSeconds,
        cadence: definition.cadence, resistance: definition.resistance, samples,
        source: { type: 'simulation', provider: 'demasy-demo-v2', scenario: definition.scenario, version: DEMO_DATASET_VERSION },
        configuration: {
            label: definition.label, muscleType: definition.muscleType, testType: 'cycling',
            plannedDurationSeconds: durationSeconds, cadenceRpm: definition.cadence,
            resistancePercent: definition.resistance, scenario: definition.scenario,
            phaseDelayDegrees: definition.phaseDelayDegrees || 0, source: { type: 'simulation' }
        },
        statistics: {
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
        const left = generateEMGSide(time, leftPhase, options.leftScale, random);
        const right = generateEMGSide(time, rightPhase, options.rightScale, random);
        samples.push({ time, left, right });
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
    
    try {
        await window.app.database.clearAllData();
        console.log('All sample data cleared');
        
        if (window.app.showNotification) {
            window.app.showNotification('Todos los datos de ejemplo eliminados', 'success');
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
