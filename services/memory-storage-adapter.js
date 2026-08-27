/**
 * In-memory persistence adapter for unit tests and isolated demonstrations.
 */
(function exposeMemoryStorage(root, factory) {
    const MemoryStorageAdapter = factory();

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = MemoryStorageAdapter;
    }

    if (root) {
        root.MemoryStorageAdapter = MemoryStorageAdapter;
    }
})(typeof window !== 'undefined' ? window : null, function createMemoryStorage() {
    class MemoryStorageAdapter {
        constructor(seed = {}) {
            this.patients = [...(seed.patients || [])];
            this.sessions = [...(seed.sessions || [])];
            this.analyses = [...(seed.analyses || [])];
            this.settings = new Map(Object.entries(seed.settings || {}));
            this.nextIds = {
                patient: this.nextId(this.patients),
                session: this.nextId(this.sessions),
                analysis: this.nextId(this.analyses)
            };
        }

        async initialize() {
            return this;
        }

        nextId(items) {
            return items.reduce((maximum, item) => Math.max(maximum, Number(item.id) || 0), 0) + 1;
        }

        clone(value) {
            return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
        }

        async createPatient(data) {
            const patient = { ...this.clone(data), id: this.nextIds.patient++, isActive: data.isActive !== false };
            this.patients.push(patient);
            return this.clone(patient);
        }

        async updatePatient(id, updates) {
            const index = this.patients.findIndex(patient => patient.id === id);
            if (index < 0) throw new Error(`Patient ${id} not found`);
            this.patients[index] = { ...this.patients[index], ...this.clone(updates) };
            return this.clone(this.patients[index]);
        }

        async archivePatient(id) {
            return this.updatePatient(id, { isActive: false });
        }

        async listPatients(filters = {}) {
            return this.clone(this.patients.filter(patient => {
                if (!filters.includeArchived && patient.isActive === false) return false;
                if (filters.search) {
                    const text = `${patient.participantCode || ''} ${patient.name || ''}`.toLowerCase();
                    if (!text.includes(String(filters.search).toLowerCase())) return false;
                }
                return true;
            }));
        }

        async createSession(data) {
            const session = { ...this.clone(data), id: this.nextIds.session++, status: data.status || 'completed' };
            this.sessions.push(session);
            return this.clone(session);
        }

        async updateSession(id, updates) {
            const index = this.sessions.findIndex(session => session.id === id);
            if (index < 0) throw new Error(`Session ${id} not found`);
            this.sessions[index] = { ...this.sessions[index], ...this.clone(updates) };
            return this.clone(this.sessions[index]);
        }

        async archiveSession(id) {
            return this.updateSession(id, { status: 'archived' });
        }

        async listSessions(filters = {}) {
            return this.clone(this.sessions.filter(session => {
                if (filters.patientId !== undefined && session.patientId !== filters.patientId) return false;
                if (!filters.includeArchived && session.status === 'archived') return false;
                return true;
            }));
        }

        async getSession(id) {
            return this.clone(this.sessions.find(session => session.id === id));
        }

        async setSetting(key, value) {
            this.settings.set(key, this.clone(value));
            return value;
        }

        async getSetting(key, defaultValue = null) {
            return this.settings.has(key) ? this.clone(this.settings.get(key)) : defaultValue;
        }

        async exportAll() {
            return this.clone({
                patients: this.patients,
                sessions: this.sessions,
                analyses: this.analyses,
                settings: Object.fromEntries(this.settings)
            });
        }

        async importAll(data, strategy = 'merge') {
            if (strategy === 'replace') {
                this.patients = [];
                this.sessions = [];
                this.analyses = [];
                this.settings.clear();
            }

            for (const patient of data.patients || []) this.patients.push(this.clone(patient));
            for (const session of data.sessions || []) this.sessions.push(this.clone(session));
            for (const analysis of data.analyses || []) this.analyses.push(this.clone(analysis));
            for (const [key, value] of Object.entries(data.settings || {})) this.settings.set(key, this.clone(value));

            this.nextIds.patient = this.nextId(this.patients);
            this.nextIds.session = this.nextId(this.sessions);
            this.nextIds.analysis = this.nextId(this.analyses);
            return this.exportAll();
        }
    }

    return MemoryStorageAdapter;
});
