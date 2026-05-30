/**
 * KinesioEMG Database Manager
 * Manages patient data and EMG sessions using IndexedDB
 * Stores patient information, session recordings, and analysis results
 */

class KinesioEMGDatabase {
    constructor() {
        this.dbName = 'KinesioEMGDB';
        this.dbVersion = 1;
        this.db = null;
        
        // Database schema
        this.stores = {
            patients: 'patients',
            sessions: 'sessions', 
            analyses: 'analyses',
            settings: 'settings'
        };
    }

    async initialize() {
        return new Promise((resolve, reject) => {
            console.log('Initializing KinesioEMG Database...');
            
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onerror = () => {
                console.error('Error opening database:', request.error);
                reject(request.error);
            };
            
            request.onsuccess = () => {
                this.db = request.result;
                console.log('Database opened successfully');
                resolve(this.db);
            };
            
            request.onupgradeneeded = (event) => {
                console.log('Database upgrade needed, creating/updating schema...');
                this.db = event.target.result;
                this.createSchema();
            };
        });
    }

    createSchema() {
        console.log('Creating database schema...');
        
        // Patients store
        if (!this.db.objectStoreNames.contains(this.stores.patients)) {
            const patientsStore = this.db.createObjectStore(this.stores.patients, { 
                keyPath: 'id', 
                autoIncrement: true 
            });
            
            // Indexes for efficient querying
            patientsStore.createIndex('name', 'name', { unique: false });
            patientsStore.createIndex('email', 'email', { unique: true });
            patientsStore.createIndex('dateOfBirth', 'dateOfBirth', { unique: false });
            patientsStore.createIndex('createdAt', 'createdAt', { unique: false });
            
            console.log('Patients store created');
        }

        // Sessions store
        if (!this.db.objectStoreNames.contains(this.stores.sessions)) {
            const sessionsStore = this.db.createObjectStore(this.stores.sessions, { 
                keyPath: 'id', 
                autoIncrement: true 
            });
            
            sessionsStore.createIndex('patientId', 'patientId', { unique: false });
            sessionsStore.createIndex('date', 'date', { unique: false });
            sessionsStore.createIndex('muscleType', 'muscleType', { unique: false });
            sessionsStore.createIndex('sessionType', 'sessionType', { unique: false });
            
            console.log('Sessions store created');
        }

        // Analyses store
        if (!this.db.objectStoreNames.contains(this.stores.analyses)) {
            const analysesStore = this.db.createObjectStore(this.stores.analyses, { 
                keyPath: 'id', 
                autoIncrement: true 
            });
            
            analysesStore.createIndex('sessionId', 'sessionId', { unique: false });
            analysesStore.createIndex('analysisType', 'analysisType', { unique: false });
            analysesStore.createIndex('createdAt', 'createdAt', { unique: false });
            
            console.log('Analyses store created');
        }

        // Settings store
        if (!this.db.objectStoreNames.contains(this.stores.settings)) {
            const settingsStore = this.db.createObjectStore(this.stores.settings, { 
                keyPath: 'key' 
            });
            
            console.log('Settings store created');
        }
    }

    // Patient Management
    async createPatient(patientData) {
        const patient = {
            name: patientData.name,
            email: patientData.email,
            dateOfBirth: patientData.dateOfBirth,
            gender: patientData.gender,
            height: patientData.height,
            weight: patientData.weight,
            medicalHistory: patientData.medicalHistory || [],
            notes: patientData.notes || '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isActive: true
        };

        const transaction = this.db.transaction([this.stores.patients], 'readwrite');
        const store = transaction.objectStore(this.stores.patients);
        
        return new Promise((resolve, reject) => {
            const request = store.add(patient);
            
            request.onsuccess = () => {
                patient.id = request.result;
                console.log('Patient created with ID:', patient.id);
                resolve(patient);
            };
            
            request.onerror = () => {
                console.error('Error creating patient:', request.error);
                reject(request.error);
            };
        });
    }

    async getPatient(patientId) {
        const transaction = this.db.transaction([this.stores.patients], 'readonly');
        const store = transaction.objectStore(this.stores.patients);
        
        return new Promise((resolve, reject) => {
            const request = store.get(patientId);
            
            request.onsuccess = () => {
                resolve(request.result);
            };
            
            request.onerror = () => {
                console.error('Error getting patient:', request.error);
                reject(request.error);
            };
        });
    }

    async getAllPatients() {
        const transaction = this.db.transaction([this.stores.patients], 'readonly');
        const store = transaction.objectStore(this.stores.patients);
        
        return new Promise((resolve, reject) => {
            const request = store.getAll();
            
            request.onsuccess = () => {
                const patients = request.result.filter(p => p.isActive);
                resolve(patients);
            };
            
            request.onerror = () => {
                console.error('Error getting patients:', request.error);
                reject(request.error);
            };
        });
    }

    async updatePatient(patientId, updates) {
        const patient = await this.getPatient(patientId);
        if (!patient) {
            throw new Error('Patient not found');
        }

        const updatedPatient = {
            ...patient,
            ...updates,
            updatedAt: new Date().toISOString()
        };

        const transaction = this.db.transaction([this.stores.patients], 'readwrite');
        const store = transaction.objectStore(this.stores.patients);
        
        return new Promise((resolve, reject) => {
            const request = store.put(updatedPatient);
            
            request.onsuccess = () => {
                console.log('Patient updated:', patientId);
                resolve(updatedPatient);
            };
            
            request.onerror = () => {
                console.error('Error updating patient:', request.error);
                reject(request.error);
            };
        });
    }

    async deletePatient(patientId) {
        return this.updatePatient(patientId, { isActive: false });
    }

    // Session Management
    async createSession(sessionData) {
        const session = {
            patientId: sessionData.patientId,
            date: new Date().toISOString(),
            muscleType: sessionData.muscleType,
            sessionType: sessionData.sessionType || 'cycling', // cycling, rehabilitation, assessment
            duration: sessionData.duration,
            cadence: sessionData.cadence,
            resistance: sessionData.resistance,
            emgData: sessionData.emgData,
            statistics: sessionData.statistics,
            notes: sessionData.notes || '',
            createdAt: new Date().toISOString()
        };

        const transaction = this.db.transaction([this.stores.sessions], 'readwrite');
        const store = transaction.objectStore(this.stores.sessions);
        
        return new Promise((resolve, reject) => {
            const request = store.add(session);
            
            request.onsuccess = () => {
                session.id = request.result;
                console.log('Session created with ID:', session.id);
                resolve(session);
            };
            
            request.onerror = () => {
                console.error('Error creating session:', request.error);
                reject(request.error);
            };
        });
    }

    async getPatientSessions(patientId) {
        const transaction = this.db.transaction([this.stores.sessions], 'readonly');
        const store = transaction.objectStore(this.stores.sessions);
        const index = store.index('patientId');
        
        return new Promise((resolve, reject) => {
            const request = index.getAll(patientId);
            
            request.onsuccess = () => {
                const sessions = request.result.sort((a, b) => 
                    new Date(b.date) - new Date(a.date)
                );
                resolve(sessions);
            };
            
            request.onerror = () => {
                console.error('Error getting patient sessions:', request.error);
                reject(request.error);
            };
        });
    }

    async getSession(sessionId) {
        const transaction = this.db.transaction([this.stores.sessions], 'readonly');
        const store = transaction.objectStore(this.stores.sessions);
        
        return new Promise((resolve, reject) => {
            const request = store.get(sessionId);
            
            request.onsuccess = () => {
                resolve(request.result);
            };
            
            request.onerror = () => {
                console.error('Error getting session:', request.error);
                reject(request.error);
            };
        });
    }

    // Analysis Management
    async createAnalysis(analysisData) {
        const analysis = {
            sessionId: analysisData.sessionId,
            analysisType: analysisData.analysisType, // symmetry, fatigue, efficiency, pattern
            results: analysisData.results,
            recommendations: analysisData.recommendations || [],
            createdAt: new Date().toISOString(),
            createdBy: analysisData.createdBy || 'system'
        };

        const transaction = this.db.transaction([this.stores.analyses], 'readwrite');
        const store = transaction.objectStore(this.stores.analyses);
        
        return new Promise((resolve, reject) => {
            const request = store.add(analysis);
            
            request.onsuccess = () => {
                analysis.id = request.result;
                console.log('Analysis created with ID:', analysis.id);
                resolve(analysis);
            };
            
            request.onerror = () => {
                console.error('Error creating analysis:', request.error);
                reject(request.error);
            };
        });
    }

    async getSessionAnalyses(sessionId) {
        const transaction = this.db.transaction([this.stores.analyses], 'readonly');
        const store = transaction.objectStore(this.stores.analyses);
        const index = store.index('sessionId');
        
        return new Promise((resolve, reject) => {
            const request = index.getAll(sessionId);
            
            request.onsuccess = () => {
                resolve(request.result);
            };
            
            request.onerror = () => {
                console.error('Error getting session analyses:', request.error);
                reject(request.error);
            };
        });
    }

    // Settings Management
    async setSetting(key, value) {
        const setting = { key, value, updatedAt: new Date().toISOString() };
        
        const transaction = this.db.transaction([this.stores.settings], 'readwrite');
        const store = transaction.objectStore(this.stores.settings);
        
        return new Promise((resolve, reject) => {
            const request = store.put(setting);
            
            request.onsuccess = () => {
                console.log('Setting saved:', key);
                resolve(setting);
            };
            
            request.onerror = () => {
                console.error('Error saving setting:', request.error);
                reject(request.error);
            };
        });
    }

    async getSetting(key, defaultValue = null) {
        const transaction = this.db.transaction([this.stores.settings], 'readonly');
        const store = transaction.objectStore(this.stores.settings);
        
        return new Promise((resolve, reject) => {
            const request = store.get(key);
            
            request.onsuccess = () => {
                const result = request.result;
                resolve(result ? result.value : defaultValue);
            };
            
            request.onerror = () => {
                console.error('Error getting setting:', request.error);
                reject(request.error);
            };
        });
    }

    // Data Export/Import
    async exportPatientData(patientId) {
        const patient = await this.getPatient(patientId);
        const sessions = await this.getPatientSessions(patientId);
        
        const exportData = {
            patient,
            sessions,
            exportDate: new Date().toISOString(),
            version: '1.0'
        };

        return exportData;
    }

    async exportAllData() {
        const patients = await this.getAllPatients();
        const allSessions = [];
        
        for (const patient of patients) {
            const sessions = await this.getPatientSessions(patient.id);
            allSessions.push(...sessions);
        }

        return {
            patients,
            sessions: allSessions,
            exportDate: new Date().toISOString(),
            version: '1.0'
        };
    }

    // Database Statistics
    async getStatistics() {
        const patients = await this.getAllPatients();
        const totalSessions = await this.getTotalSessions();
        
        return {
            totalPatients: patients.length,
            activePatients: patients.filter(p => p.isActive).length,
            totalSessions: totalSessions,
            databaseSize: await this.getDatabaseSize()
        };
    }

    async getTotalSessions() {
        const transaction = this.db.transaction([this.stores.sessions], 'readonly');
        const store = transaction.objectStore(this.stores.sessions);
        
        return new Promise((resolve, reject) => {
            const request = store.count();
            
            request.onsuccess = () => {
                resolve(request.result);
            };
            
            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    async getDatabaseSize() {
        // Estimate database size (IndexedDB doesn't provide exact size)
        if ('navigator' in window && 'storage' in navigator && 'estimate' in navigator.storage) {
            try {
                const estimate = await navigator.storage.estimate();
                return {
                    used: estimate.usage,
                    available: estimate.quota,
                    usedMB: (estimate.usage / (1024 * 1024)).toFixed(2),
                    availableMB: (estimate.quota / (1024 * 1024)).toFixed(2)
                };
            } catch (error) {
                console.warn('Storage estimate not available:', error);
                return null;
            }
        }
        return null;
    }

    // Search functionality
    async searchPatients(searchTerm) {
        const patients = await this.getAllPatients();
        const term = searchTerm.toLowerCase();
        
        return patients.filter(patient => 
            patient.name.toLowerCase().includes(term) ||
            patient.email.toLowerCase().includes(term) ||
            (patient.notes && patient.notes.toLowerCase().includes(term))
        );
    }

    // Cleanup methods
    async clearAllData() {
        const stores = Object.values(this.stores);
        const transaction = this.db.transaction(stores, 'readwrite');
        
        const promises = stores.map(storeName => {
            const store = transaction.objectStore(storeName);
            return new Promise((resolve, reject) => {
                const request = store.clear();
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        });

        await Promise.all(promises);
        console.log('All database data cleared');
    }

    async close() {
        if (this.db) {
            this.db.close();
            this.db = null;
            console.log('Database connection closed');
        }
    }
}

// Export for use in main application
window.KinesioEMGDatabase = KinesioEMGDatabase;