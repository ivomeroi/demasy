/** DEMASY IndexedDB manager with non-destructive legacy migration. */
class DEMASYDatabase {
    constructor(options = {}) {
        const schema = window.DEMASY_CONFIG.schema;
        this.dbName = options.dbName || schema.databaseName;
        this.legacyDbName = options.legacyDbName || schema.legacyDatabaseName;
        this.dbVersion = options.dbVersion || schema.version;
        this.db = null;
        this.normalizer = options.normalizer || new DataNormalizationService();
        this.stores = Object.freeze({ patients: 'patients', sessions: 'sessions', analyses: 'analyses', settings: 'settings' });
        this.migrationSettingKey = 'legacyMigration.v1';
    }

    async initialize() {
        console.log(`Inicializando base de datos ${this.dbName}...`);
        this.db = await this.openDatabase(this.dbName, this.dbVersion, database => this.createSchema(database));
        await this.migrateLegacyDatabaseIfNeeded();
        return this.db;
    }

    openDatabase(name, version, onUpgrade) {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(name, version);
            request.onerror = () => reject(request.error);
            request.onblocked = () => reject(new Error(`La base ${name} está bloqueada por otra pestaña`));
            request.onupgradeneeded = event => onUpgrade?.(event.target.result, event);
            request.onsuccess = () => resolve(request.result);
        });
    }

    createSchema(database) {
        if (!database.objectStoreNames.contains(this.stores.patients)) {
            const store = database.createObjectStore(this.stores.patients, { keyPath: 'id', autoIncrement: true });
            store.createIndex('participantCode', 'participantCode', { unique: true });
            store.createIndex('name', 'name', { unique: false });
            store.createIndex('email', 'email', { unique: false });
            store.createIndex('status', 'status', { unique: false });
            store.createIndex('createdAt', 'createdAt', { unique: false });
        }
        if (!database.objectStoreNames.contains(this.stores.sessions)) {
            const store = database.createObjectStore(this.stores.sessions, { keyPath: 'id', autoIncrement: true });
            store.createIndex('patientId', 'patientId', { unique: false });
            store.createIndex('date', 'date', { unique: false });
            store.createIndex('muscleType', 'muscleType', { unique: false });
            store.createIndex('sessionType', 'sessionType', { unique: false });
            store.createIndex('status', 'status', { unique: false });
        }
        if (!database.objectStoreNames.contains(this.stores.analyses)) {
            const store = database.createObjectStore(this.stores.analyses, { keyPath: 'id', autoIncrement: true });
            store.createIndex('sessionId', 'sessionId', { unique: false });
            store.createIndex('analysisType', 'analysisType', { unique: false });
            store.createIndex('createdAt', 'createdAt', { unique: false });
        }
        if (!database.objectStoreNames.contains(this.stores.settings)) {
            database.createObjectStore(this.stores.settings, { keyPath: 'key' });
        }
    }

    async migrateLegacyDatabaseIfNeeded() {
        const completed = await this.getSetting(this.migrationSettingKey, null);
        if (completed?.status === 'completed') return completed;
        const legacy = await this.openExistingDatabase(this.legacyDbName);
        if (!legacy) {
            const result = { status: 'completed', sourceFound: false, migratedAt: new Date().toISOString() };
            await this.setSetting(this.migrationSettingKey, result);
            return result;
        }
        try {
            const legacyData = await this.readLegacyData(legacy);
            const normalized = {
                patients: legacyData.patients.map(patient => this.normalizer.normalizeLegacyParticipant(patient)),
                sessions: legacyData.sessions.map(session => this.normalizer.normalizeSession(session)),
                analyses: legacyData.analyses,
                settings: legacyData.settings.filter(setting => setting.key !== this.migrationSettingKey)
            };
            await this.copyLegacyData(normalized);
            const counts = await this.getStoreCounts();
            for (const storeName of ['patients', 'sessions', 'analyses']) {
                if (counts[storeName] < normalized[storeName].length) throw new Error(`Verificación fallida para ${storeName}`);
            }
            const result = {
                status: 'completed', sourceFound: true, migratedAt: new Date().toISOString(),
                sourceCounts: Object.fromEntries(Object.entries(normalized).map(([key, values]) => [key, values.length])),
                targetCounts: counts
            };
            await this.setSetting(this.migrationSettingKey, result);
            console.log('Migración de KinesioEMGDB a DEMASYDB completada', result);
            return result;
        } catch (error) {
            throw new Error(`No se pudo migrar ${this.legacyDbName} a ${this.dbName}: ${error.message}`);
        } finally {
            legacy.close();
        }
    }

    async openExistingDatabase(name) {
        if (typeof indexedDB.databases === 'function') {
            const databases = await indexedDB.databases();
            if (!databases.some(database => database.name === name)) return null;
        }
        return new Promise((resolve, reject) => {
            let created = false;
            const request = indexedDB.open(name);
            request.onupgradeneeded = () => { created = true; };
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                const database = request.result;
                if (!created) return resolve(database);
                database.close();
                const deletion = indexedDB.deleteDatabase(name);
                deletion.onsuccess = () => resolve(null);
                deletion.onerror = () => reject(deletion.error);
            };
        });
    }

    async readLegacyData(database) {
        const result = {};
        for (const storeName of Object.values(this.stores)) {
            result[storeName] = database.objectStoreNames.contains(storeName)
                ? await this.getAllFromDatabase(database, storeName) : [];
        }
        return result;
    }

    getAllFromDatabase(database, storeName) {
        return new Promise((resolve, reject) => {
            const request = database.transaction(storeName, 'readonly').objectStore(storeName).getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    copyLegacyData(data) {
        return new Promise((resolve, reject) => {
            const storeNames = Object.values(this.stores);
            const transaction = this.db.transaction(storeNames, 'readwrite');
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
            transaction.onabort = () => reject(transaction.error || new Error('Migración abortada'));
            for (const storeName of storeNames) {
                const store = transaction.objectStore(storeName);
                for (const item of data[storeName] || []) store.put(item);
            }
        });
    }

    async createPatient(data) {
        const patient = this.normalizer.normalizeParticipant(data);
        if (await this.getPatientByCode(patient.participantCode)) throw new Error(`Ya existe el código ${patient.participantCode}`);
        patient.id = await this.add(this.stores.patients, patient);
        return patient;
    }

    async generateParticipantCode() {
        const patients = await this.listPatients({ includeArchived: true });
        const used = new Set(patients.map(patient => patient.participantCode));
        let number = patients.length + 1;
        let code;
        do code = `P-${String(number++).padStart(4, '0')}`; while (used.has(code));
        return code;
    }

    getPatient(id) { return this.get(this.stores.patients, Number(id)); }
    getPatientByCode(code) { return this.getByIndex(this.stores.patients, 'participantCode', String(code).trim().toUpperCase()); }
    getAllPatients() { return this.listPatients(); }

    async listPatients(filters = {}) {
        const patients = await this.getAll(this.stores.patients);
        const search = String(filters.search || '').trim().toLowerCase();
        return patients.filter(patient => {
            if (!filters.includeArchived && patient.status === 'archived') return false;
            if (!search) return true;
            return [patient.participantCode, patient.name, patient.email, patient.notes]
                .some(value => String(value || '').toLowerCase().includes(search));
        }).sort((a, b) => String(a.participantCode).localeCompare(String(b.participantCode)));
    }

    async updatePatient(id, updates) {
        const existing = await this.getPatient(id);
        if (!existing) throw new Error('Participante no encontrado');
        const patient = this.normalizer.normalizeParticipant(updates, existing);
        patient.id = existing.id;
        const duplicate = await this.getPatientByCode(patient.participantCode);
        if (duplicate && duplicate.id !== patient.id) throw new Error(`Ya existe el código ${patient.participantCode}`);
        await this.put(this.stores.patients, patient);
        return patient;
    }

    deletePatient(id) { return this.archivePatient(id); }
    archivePatient(id) { return this.updatePatient(id, { status: 'archived' }); }
    restorePatient(id) { return this.updatePatient(id, { status: 'active' }); }
    searchPatients(term, options = {}) { return this.listPatients({ ...options, search: term }); }

    async createSession(data) {
        const patient = await this.getPatient(data.patientId);
        if (!patient || patient.status === 'archived') throw new Error('El participante no existe o está archivado');
        const session = this.normalizer.normalizeSession(data);
        session.id = await this.add(this.stores.sessions, session);
        return session;
    }

    async getPatientSessions(patientId, options = {}) {
        const sessions = await this.getAllByIndex(this.stores.sessions, 'patientId', Number(patientId));
        return sessions.filter(session => options.includeArchived || session.status !== 'archived')
            .sort((a, b) => new Date(b.startedAt || b.date) - new Date(a.startedAt || a.date));
    }

    getSession(id) { return this.get(this.stores.sessions, Number(id)); }
    async updateSession(id, updates) {
        const existing = await this.getSession(id);
        if (!existing) throw new Error('Sesión no encontrada');
        const session = this.normalizer.normalizeSession({ ...existing, ...updates, id: existing.id });
        await this.put(this.stores.sessions, session);
        return session;
    }
    archiveSession(id) { return this.updateSession(id, { status: 'archived' }); }
    restoreSession(id) { return this.updateSession(id, { status: 'completed' }); }

    async createAnalysis(data) {
        const analysis = {
            sessionId: data.sessionId, analysisType: data.analysisType, results: data.results || {},
            recommendations: data.recommendations || [], createdAt: data.createdAt || new Date().toISOString(),
            createdBy: data.createdBy || 'system'
        };
        analysis.id = await this.add(this.stores.analyses, analysis);
        return analysis;
    }
    getSessionAnalyses(id) { return this.getAllByIndex(this.stores.analyses, 'sessionId', Number(id)); }

    async setSetting(key, value) {
        const setting = { key, value, updatedAt: new Date().toISOString() };
        await this.put(this.stores.settings, setting);
        return setting;
    }
    async getSetting(key, defaultValue = null) {
        const setting = await this.get(this.stores.settings, key);
        return setting ? setting.value : defaultValue;
    }

    async exportPatientData(id) {
        return {
            application: 'DEMASY', schemaVersion: 1, exportedAt: new Date().toISOString(),
            patient: await this.getPatient(id), sessions: await this.getPatientSessions(id, { includeArchived: true })
        };
    }
    async exportAllData() {
        return {
            application: 'DEMASY', schemaVersion: 1, exportedAt: new Date().toISOString(),
            data: {
                patients: await this.listPatients({ includeArchived: true }),
                sessions: await this.getAll(this.stores.sessions), analyses: await this.getAll(this.stores.analyses),
                settings: await this.getAll(this.stores.settings)
            }
        };
    }
    async getStatistics() {
        const patients = await this.listPatients({ includeArchived: true });
        return {
            totalPatients: patients.length,
            activePatients: patients.filter(patient => patient.status !== 'archived').length,
            archivedPatients: patients.filter(patient => patient.status === 'archived').length,
            totalSessions: await this.getTotalSessions(), databaseSize: await this.getDatabaseSize()
        };
    }
    async getStoreCounts() {
        const result = {};
        for (const storeName of Object.values(this.stores)) result[storeName] = await this.count(storeName);
        return result;
    }
    getTotalSessions() { return this.count(this.stores.sessions); }
    async getDatabaseSize() {
        if (!navigator.storage?.estimate) return null;
        const estimate = await navigator.storage.estimate();
        return {
            used: estimate.usage, available: estimate.quota,
            usedMB: (estimate.usage / 1048576).toFixed(2), availableMB: (estimate.quota / 1048576).toFixed(2)
        };
    }
    async clearAllData() { await Promise.all(Object.values(this.stores).map(name => this.clear(name))); }
    close() { this.db?.close(); this.db = null; }

    add(name, value) { return this.request(name, 'readwrite', store => store.add(value)); }
    put(name, value) { return this.request(name, 'readwrite', store => store.put(value)); }
    get(name, key) { return this.request(name, 'readonly', store => store.get(key)); }
    getAll(name) { return this.request(name, 'readonly', store => store.getAll()); }
    count(name) { return this.request(name, 'readonly', store => store.count()); }
    clear(name) { return this.request(name, 'readwrite', store => store.clear()); }
    getByIndex(name, index, key) { return this.request(name, 'readonly', store => store.index(index).get(key)); }
    getAllByIndex(name, index, key) { return this.request(name, 'readonly', store => store.index(index).getAll(key)); }
    request(name, mode, operation) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(name, mode);
            const request = operation(transaction.objectStore(name));
            let result;
            request.onsuccess = () => { result = request.result; };
            request.onerror = () => reject(this.normalizeStorageError(request.error));
            transaction.oncomplete = () => resolve(result);
            transaction.onerror = () => reject(this.normalizeStorageError(transaction.error));
            transaction.onabort = () => reject(this.normalizeStorageError(transaction.error));
        });
    }

    normalizeStorageError(error) {
        if (error?.name === 'QuotaExceededError') {
            return new Error('No hay espacio local suficiente para guardar los datos. Exporta o archiva sesiones e inténtalo nuevamente.');
        }
        if (error?.name === 'ConstraintError') return new Error('El registro duplica un valor que debe ser único');
        return error || new Error('Falló la transacción de almacenamiento local');
    }
}

window.DEMASYDatabase = DEMASYDatabase;
window.KinesioEMGDatabase = DEMASYDatabase;
