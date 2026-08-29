/**
 * Database Initialization Script
 * Sets up sample data and ensures proper database initialization
 */

async function initializeSampleData() {
    console.log('Setting up sample database data...');
    
    try {
        // Wait for the database to be initialized
        if (!window.app || !window.app.database) {
            console.log('Waiting for database initialization...');
            return;
        }
        
        const db = window.app.database;
        
        // Check if we already have patients
        const existingPatients = await db.listPatients({ includeArchived: true });
        if (existingPatients.length > 0) {
            console.log('Database already contains patient data');
            return;
        }
        
        console.log('Creating sample patients...');
        
        // Sample patients for demonstration
        const samplePatients = [
            {
                participantCode: "DEMO-001",
                name: "María García",
                email: "maria.garcia@email.com",
                dateOfBirth: "1985-03-15",
                gender: "female",
                height: 165,
                weight: 60,
                medicalHistory: ["Lesión menisco izquierdo 2023"],
                notes: "Rehabilitación post-cirugía, enfoque en fortalecimiento bilateral"
            },
            {
                participantCode: "DEMO-002",
                name: "Carlos Rodríguez", 
                email: "carlos.rodriguez@email.com",
                dateOfBirth: "1978-11-22",
                gender: "male",
                height: 180,
                weight: 85,
                medicalHistory: ["Desgarro isquiotibial derecho 2022", "Tendinitis rotuliana bilateral"],
                notes: "Atleta amateur, entrenamiento de ciclismo para recuperación"
            },
            {
                participantCode: "DEMO-003",
                name: "Ana López",
                email: "ana.lopez@email.com", 
                dateOfBirth: "1992-07-08",
                gender: "female",
                height: 158,
                weight: 52,
                medicalHistory: [],
                notes: "Evaluación preventiva, ciclista recreativa"
            }
        ];
        
        // Create sample patients
        for (const patientData of samplePatients) {
            const patient = await db.createPatient(patientData);
            console.log(`Created sample patient: ${patient.name}`);
            
            // Create some sample sessions for each patient
            await createSampleSessions(db, patient.id);
        }
        
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

async function createSampleSessions(db, patientId) {
    const sampleSessions = [
        {
            patientId: patientId,
            muscleType: 'quadriceps',
            sessionType: 'cycling',
            duration: 900, // 15 minutes
            cadence: 80,
            resistance: 50,
            emgData: generateSampleEMGData(900),
            statistics: {
                bilateral: {
                    symmetryIndex: 88.5,
                    asymmetryLevel: 11.5,
                    difference: 12.3
                },
                pedalingEfficiency: 82.5
            },
            notes: 'Primera sesión de evaluación'
        },
        {
            patientId: patientId,
            muscleType: 'gastrocnemius',
            sessionType: 'cycling',
            duration: 1200, // 20 minutes
            cadence: 85,
            resistance: 60,
            emgData: generateSampleEMGData(1200),
            statistics: {
                bilateral: {
                    symmetryIndex: 91.2,
                    asymmetryLevel: 8.8,
                    difference: 9.1
                },
                pedalingEfficiency: 85.3
            },
            notes: 'Sesión de seguimiento - mejora en simetría'
        }
    ];
    
    for (const sessionData of sampleSessions) {
        // Add some random time offset to make sessions look realistic
        const randomDaysAgo = Math.floor(Math.random() * 30) + 1;
        const sessionDate = new Date();
        sessionDate.setDate(sessionDate.getDate() - randomDaysAgo);
        sessionData.date = sessionDate.toISOString();
        
        await db.createSession(sessionData);
    }
}

function generateSampleEMGData(duration) {
    // Generate simplified sample EMG data
    const sampleRate = 50; // 50 Hz for demo
    const dataPoints = duration * sampleRate;
    const data = [];
    
    for (let i = 0; i < dataPoints; i++) {
        const time = i / sampleRate;
        
        // Generate simulated bilateral EMG with some asymmetry
        const leftEMG = Math.abs(Math.sin(time * 2 * Math.PI * 2) + Math.random() * 0.3 - 0.15) * 100;
        const rightEMG = Math.abs(Math.sin(time * 2 * Math.PI * 2 + 0.2) + Math.random() * 0.3 - 0.15) * 85; // Slight asymmetry
        
        data.push({
            time: time,
            left: {
                emg: leftEMG,
                activation: leftEMG * 0.8
            },
            right: {
                emg: rightEMG, 
                activation: rightEMG * 0.8
            }
        });
    }
    
    return data;
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
        a.download = `kinesioemg-database-${new Date().toISOString().slice(0, 10)}.json`;
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

// Export functions for console access
window.dbUtils = {
    initializeSampleData,
    clearSampleData, 
    exportAllData,
    getDatabaseStats
};

// Auto-initialize sample data when the application is ready
document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit for the app to fully initialize
    setTimeout(async () => {
        const maxAttempts = 10;
        let attempts = 0;
        
        const tryInitialize = async () => {
            if (window.app && window.app.database && window.app.database.db) {
                await initializeSampleData();
            } else if (attempts < maxAttempts) {
                attempts++;
                setTimeout(tryInitialize, 1000);
            } else {
                console.log('Could not initialize sample data - database not ready');
            }
        };
        
        await tryInitialize();
    }, 2000);
});

console.log('Database initialization script loaded. Available commands:');
console.log('- window.dbUtils.initializeSampleData() - Initialize sample patients');
console.log('- window.dbUtils.clearSampleData() - Clear all data'); 
console.log('- window.dbUtils.exportAllData() - Export database');
console.log('- window.dbUtils.getDatabaseStats() - Get statistics');
