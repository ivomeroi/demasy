/**
 * Database Initialization Script
 * Sets up sample data and ensures proper database initialization
 */

const DEMO_DATASET_VERSION = 5;
const DEMO_DATASET_KEY = `demoDataset.v${DEMO_DATASET_VERSION}`;
const RETIRED_DEMO_CODES = ['DEMO-006', 'DEMO-007', 'DEMO-008', 'DEMO-009', 'DEMO-010'];

function buildSessionSeries(options) {
    const sessionCount = 10;
    const start = new Date(options.startDate);
    return Array.from({ length: sessionCount }, (_, index) => {
        const progress = index / (sessionCount - 1);
        const interpolate = (from, to) => from + (to - from) * progress;
        const date = new Date(start.getTime() + index * 14 * 24 * 60 * 60 * 1000).toISOString();
        const leftScale = options.weakSide === 'left'
            ? interpolate(options.scaleStart, options.scaleEnd) : options.strongScale || 1;
        const rightScale = options.weakSide === 'right'
            ? interpolate(options.scaleStart, options.scaleEnd) : options.strongScale || 1;
        return {
            date,
            label: `${index === 0 ? 'Evaluación inicial' : `Control ${index}`} · ${options.label}`,
            muscleType: options.muscleType,
            scenario: options.scenario,
            cadence: Math.round(interpolate(options.cadenceStart, options.cadenceEnd)),
            resistance: Math.round(interpolate(options.resistanceStart, options.resistanceEnd)),
            leftScale: options.weakSide ? leftScale : interpolate(options.scaleStart, options.scaleEnd),
            rightScale,
            phaseDelayDegrees: Math.round(interpolate(options.phaseDelayStart || 0, options.phaseDelayEnd || 0)),
            symmetry: Math.round(interpolate(options.symmetryStart, options.symmetryEnd)),
            notes: `Caso simulado: medición ${index + 1} de ${sessionCount}; ${options.evolutionNote}`
        };
    });
}

const DEMO_PROFILES = [
    {
        participant: {
            participantCode: 'DEMO-001', name: 'María García', email: 'maria.garcia@email.com',
            dateOfBirth: '1985-03-15', gender: 'female', height: 165, weight: 60,
            medicalHistory: ['Lesión de menisco izquierdo 2023'],
            notes: 'Caso sintético: rehabilitación de rodilla izquierda y fortalecimiento bilateral.'
        },
        sessions: buildSessionSeries({ startDate: '2026-05-01T14:00:00.000Z', label: 'cuádriceps', muscleType: 'quadriceps', scenario: 'left-weakness', weakSide: 'left', scaleStart: 0.68, scaleEnd: 0.9, symmetryStart: 70, symmetryEnd: 91, cadenceStart: 68, cadenceEnd: 76, resistanceStart: 32, resistanceEnd: 44, evolutionNote: 'recuperación progresiva del reclutamiento izquierdo.' })
    },
    {
        participant: {
            participantCode: 'DEMO-002', name: 'Carlos Rodríguez', email: 'carlos.rodriguez@email.com',
            dateOfBirth: '1978-11-22', gender: 'male', height: 180, weight: 85,
            medicalHistory: ['Desgarro isquiotibial derecho 2022', 'Tendinopatía rotuliana bilateral'],
            notes: 'Caso sintético: retorno progresivo al ciclismo recreativo.'
        },
        sessions: buildSessionSeries({ startDate: '2026-05-03T15:30:00.000Z', label: 'isquiotibiales', muscleType: 'hamstring', scenario: 'right-weakness', weakSide: 'right', scaleStart: 0.62, scaleEnd: 0.84, symmetryStart: 64, symmetryEnd: 86, cadenceStart: 62, cadenceEnd: 72, resistanceStart: 38, resistanceEnd: 50, evolutionNote: 'recuperación parcial y sostenida del lado derecho.' })
    },
    {
        participant: {
            participantCode: 'DEMO-003', name: 'Ana López', email: 'ana.lopez@email.com',
            dateOfBirth: '1992-07-08', gender: 'female', height: 158, weight: 52,
            medicalHistory: [], notes: 'Caso sintético: evaluación preventiva de ciclista recreativa sin antecedentes relevantes.'
        },
        sessions: buildSessionSeries({ startDate: '2026-05-05T12:00:00.000Z', label: 'evaluación preventiva', muscleType: 'gastrocnemius', scenario: 'phase-delay', scaleStart: 0.95, scaleEnd: 0.99, symmetryStart: 94, symmetryEnd: 98, cadenceStart: 78, cadenceEnd: 84, resistanceStart: 30, resistanceEnd: 36, phaseDelayStart: 18, phaseDelayEnd: 4, evolutionNote: 'simetría conservada y reducción del retraso temporal.' })
    },
    {
        participant: {
            participantCode: 'DEMO-004', name: 'Lucía Fernández', email: 'lucia.fernandez@example.com',
            dateOfBirth: '1990-02-18', gender: 'female', height: 168, weight: 63,
            medicalHistory: ['Esguince de tobillo derecho 2024'], notes: 'Caso sintético: recuperación funcional del miembro inferior derecho.'
        },
        sessions: buildSessionSeries({ startDate: '2026-05-07T13:00:00.000Z', label: 'gemelos', muscleType: 'gastrocnemius', scenario: 'right-weakness', weakSide: 'right', scaleStart: 0.66, scaleEnd: 0.88, symmetryStart: 69, symmetryEnd: 89, cadenceStart: 60, cadenceEnd: 70, resistanceStart: 28, resistanceEnd: 38, evolutionNote: 'recuperación funcional del miembro inferior derecho.' })
    },
    {
        participant: {
            participantCode: 'DEMO-005', name: 'Diego Martínez', email: 'diego.martinez@example.com',
            dateOfBirth: '1983-09-04', gender: 'male', height: 175, weight: 78,
            medicalHistory: ['Reconstrucción de ligamento cruzado anterior izquierdo 2021'], notes: 'Caso sintético: seguimiento tardío de fuerza del cuádriceps.'
        },
        sessions: buildSessionSeries({ startDate: '2026-05-09T16:00:00.000Z', label: 'cuádriceps posquirúrgico', muscleType: 'quadriceps', scenario: 'left-weakness', weakSide: 'left', scaleStart: 0.73, scaleEnd: 0.86, symmetryStart: 76, symmetryEnd: 87, cadenceStart: 66, cadenceEnd: 74, resistanceStart: 38, resistanceEnd: 47, evolutionNote: 'mejora moderada con asimetría izquierda residual.' })
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

        await archiveRetiredDemoPatients(db, existingByCode);

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

async function archiveRetiredDemoPatients(db, existingByCode) {
    for (const code of RETIRED_DEMO_CODES) {
        const patient = existingByCode.get(code);
        if (!patient || patient.status === 'archived') continue;
        const sessions = await db.getPatientSessions(patient.id, { includeArchived: true });
        const containsOnlyDemoSessions = sessions.length > 0 && sessions.every(session => /^demasy-demo-v\d+$/.test(session.source?.provider || ''));
        if (containsOnlyDemoSessions) await db.archivePatient(patient.id);
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
