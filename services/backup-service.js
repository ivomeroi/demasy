/** Pure validation and merge planning for DEMASY backup files. */
(function exposeBackupService(root, factory) {
    const BackupService = factory();
    if (typeof module !== 'undefined' && module.exports) module.exports = BackupService;
    if (root) root.BackupService = BackupService;
})(typeof window !== 'undefined' ? window : null, function createBackupService() {
    class BackupService {
        constructor(options = {}) { this.maximumBytes = options.maximumBytes || 50 * 1024 * 1024; }

        validate(payload, options = {}) {
            const errors = [];
            const size = options.size ?? JSON.stringify(payload || {}).length;
            if (size > this.maximumBytes) errors.push(`El archivo supera el límite de ${this.maximumBytes} bytes`);
            if (!payload || payload.application !== 'DEMASY') errors.push('El archivo no pertenece a DEMASY');
            if (Number(payload?.schemaVersion) !== 1) errors.push('Versión de esquema no compatible');
            const data = payload?.data;
            for (const name of ['patients', 'sessions', 'analyses', 'settings']) {
                if (!Array.isArray(data?.[name])) errors.push(`Falta la colección ${name}`);
            }
            if (!errors.length) {
                for (const name of ['patients', 'sessions', 'analyses', 'settings']) {
                    data[name].forEach((item, index) => {
                        if (!item || typeof item !== 'object' || Array.isArray(item)) {
                            errors.push(`Registro inválido en ${name}, posición ${index + 1}`);
                        }
                    });
                }
            }
            if (!errors.length) {
                for (const name of ['patients', 'sessions', 'analyses']) {
                    const ids = new Set();
                    data[name].forEach(item => {
                        const id = Number(item.id);
                        if (!Number.isInteger(id) || id <= 0) errors.push(`ID inválido en ${name}`);
                        if (ids.has(id)) errors.push(`ID duplicado en ${name}: ${id}`);
                        ids.add(id);
                    });
                }
                const patientIds = new Set(data.patients.map(item => Number(item.id)));
                const sessionIds = new Set(data.sessions.map(item => Number(item.id)));
                const codes = new Set();
                data.patients.forEach(item => {
                    const code = String(item.participantCode || '').toUpperCase();
                    if (!/^[A-Z0-9_-]{2,30}$/.test(code)) errors.push(`Código de participante inválido: ${code || '(vacío)'}`);
                    if (codes.has(code)) errors.push(`Código duplicado: ${code}`);
                    codes.add(code);
                });
                data.sessions.forEach(item => { if (!patientIds.has(Number(item.patientId))) errors.push(`Sesión ${item.id} referencia un participante inexistente`); });
                data.analyses.forEach(item => { if (!sessionIds.has(Number(item.sessionId))) errors.push(`Análisis referencia una sesión inexistente: ${item.sessionId}`); });
            }
            return { valid: errors.length === 0, errors, size, preview: this.preview(payload) };
        }

        preview(payload) {
            const data = payload?.data || {};
            return { patients: data.patients?.length || 0, sessions: data.sessions?.length || 0, analyses: data.analyses?.length || 0, settings: data.settings?.length || 0 };
        }

        sessionKey(session, patientCode) {
            return [patientCode, session.startedAt || session.date, session.muscleType, session.label || ''].join('|');
        }

        planMerge(current, incoming) {
            const report = { created: { patients: 0, sessions: 0, analyses: 0, settings: 0 }, updated: { patients: 0 }, skipped: { patients: 0, sessions: 0, analyses: 0, settings: 0 }, failed: [] };
            const records = { patients: [], sessions: [], analyses: [], settings: [] };
            const currentPatients = new Map(current.patients.map(item => [String(item.participantCode).toUpperCase(), item]));
            const patientMap = new Map();
            let patientId = Math.max(0, ...current.patients.map(item => Number(item.id) || 0));
            for (const imported of incoming.patients) {
                const existing = currentPatients.get(String(imported.participantCode).toUpperCase());
                if (existing) { patientMap.set(Number(imported.id), existing.id); report.skipped.patients++; }
                else { const record = { ...imported, id: ++patientId }; records.patients.push(record); patientMap.set(Number(imported.id), record.id); report.created.patients++; }
            }
            const codeById = new Map([...current.patients, ...records.patients].map(item => [Number(item.id), item.participantCode]));
            const existingSessionKeys = new Map(current.sessions.map(item => [this.sessionKey(item, codeById.get(Number(item.patientId))), item]));
            const sessionMap = new Map();
            let sessionId = Math.max(0, ...current.sessions.map(item => Number(item.id) || 0));
            for (const imported of incoming.sessions) {
                const mappedPatientId = patientMap.get(Number(imported.patientId));
                const candidate = { ...imported, patientId: mappedPatientId };
                const existing = existingSessionKeys.get(this.sessionKey(candidate, codeById.get(mappedPatientId)));
                if (existing) { sessionMap.set(Number(imported.id), existing.id); report.skipped.sessions++; }
                else { candidate.id = ++sessionId; records.sessions.push(candidate); sessionMap.set(Number(imported.id), candidate.id); report.created.sessions++; }
            }
            const analysisKeys = new Set(current.analyses.map(item => `${item.sessionId}|${item.analysisType}`));
            let analysisId = Math.max(0, ...current.analyses.map(item => Number(item.id) || 0));
            for (const imported of incoming.analyses) {
                const mappedSessionId = sessionMap.get(Number(imported.sessionId));
                const key = `${mappedSessionId}|${imported.analysisType}`;
                if (analysisKeys.has(key)) report.skipped.analyses++;
                else { records.analyses.push({ ...imported, id: ++analysisId, sessionId: mappedSessionId }); analysisKeys.add(key); report.created.analyses++; }
            }
            const settingKeys = new Set(current.settings.map(item => item.key));
            for (const setting of incoming.settings) {
                if (settingKeys.has(setting.key)) report.skipped.settings++;
                else { records.settings.push(setting); report.created.settings++; }
            }
            return { records, report };
        }
    }
    return BackupService;
});
