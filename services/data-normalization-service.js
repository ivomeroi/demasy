/**
 * Pure normalization and validation for persisted DEMASY entities.
 */
(function exposeDataNormalization(root, factory) {
    const DataNormalizationService = factory(
        root?.DEMASY_CONFIG || (typeof require === 'function' ? require('../core/demasy-config.js') : null)
    );
    if (typeof module !== 'undefined' && module.exports) module.exports = DataNormalizationService;
    if (root) root.DataNormalizationService = DataNormalizationService;
})(typeof window !== 'undefined' ? window : null, function createDataNormalization(config) {
    class DataNormalizationService {
        normalizeParticipant(input, existing = null) {
            const now = new Date().toISOString();
            const participantCode = String(input?.participantCode || existing?.participantCode || '').trim().toUpperCase();
            if (!/^[A-Z0-9_-]{2,30}$/.test(participantCode)) {
                throw new Error('El código debe tener entre 2 y 30 caracteres: letras, números, guion o guion bajo');
            }
            const email = String(input?.email ?? existing?.email ?? '').trim().toLowerCase();
            if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('El email no tiene un formato válido');
            const status = input?.status || existing?.status || (input?.isActive === false ? 'archived' : 'active');
            if (!['active', 'archived'].includes(status)) throw new Error('Estado de participante inválido');
            return {
                ...(existing || {}),
                participantCode,
                name: String(input?.name ?? existing?.name ?? '').trim(),
                email,
                dateOfBirth: String(input?.dateOfBirth ?? existing?.dateOfBirth ?? ''),
                gender: String(input?.gender ?? existing?.gender ?? ''),
                height: this.optionalNumber(input?.height ?? existing?.height, 50, 250, 'altura'),
                weight: this.optionalNumber(input?.weight ?? existing?.weight, 10, 300, 'peso'),
                medicalHistory: this.normalizeHistory(input?.medicalHistory ?? existing?.medicalHistory),
                notes: String(input?.notes ?? existing?.notes ?? '').trim(),
                consentConfirmed: Boolean(input?.consentConfirmed ?? existing?.consentConfirmed ?? false),
                status,
                isActive: status === 'active',
                createdAt: existing?.createdAt || input?.createdAt || now,
                updatedAt: now
            };
        }

        normalizeLegacyParticipant(input) {
            const fallbackCode = `P-${String(input.id || 0).padStart(4, '0')}`;
            return {
                ...this.normalizeParticipant({ ...input, participantCode: input.participantCode || fallbackCode }),
                id: input.id,
                createdAt: input.createdAt || new Date().toISOString(),
                updatedAt: input.updatedAt || input.createdAt || new Date().toISOString()
            };
        }

        normalizeSession(input) {
            const now = new Date().toISOString();
            const patientId = Number(input?.patientId);
            if (!Number.isInteger(patientId) || patientId <= 0) throw new Error('La sesión requiere un participante válido');
            const startedAt = input.startedAt || input.date || now;
            const durationSeconds = Math.max(0, Number(input.durationSeconds ?? input.duration ?? 0));
            const samples = Array.isArray(input.samples) ? input.samples : Array.isArray(input.emgData) ? input.emgData : [];
            return {
                ...(input.id !== undefined ? { id: input.id } : {}),
                schemaVersion: config.schema.version,
                patientId,
                label: String(input.label || input.configuration?.label || 'Sesión simulada').trim(),
                startedAt,
                endedAt: input.endedAt || new Date(new Date(startedAt).getTime() + durationSeconds * 1000).toISOString(),
                date: input.date || startedAt,
                durationSeconds,
                duration: durationSeconds,
                status: input.status || 'completed',
                muscleType: input.muscleType || input.configuration?.muscleType || 'quadriceps',
                sessionType: input.sessionType || input.configuration?.testType || 'cycling',
                cadence: Number(input.cadence ?? input.configuration?.cadenceRpm ?? 80),
                resistance: Number(input.resistance ?? input.configuration?.resistancePercent ?? 50),
                source: input.source || { type: input.sourceType || 'simulation', provider: 'legacy', scenario: 'unknown', version: 1 },
                configuration: input.configuration || {},
                samples,
                emgData: samples,
                statistics: input.statistics || {},
                analysis: input.analysis || {},
                notes: String(input.notes || '').trim(),
                createdAt: input.createdAt || now,
                updatedAt: now
            };
        }

        normalizeHistory(value) {
            if (Array.isArray(value)) return value.map(item => String(item).trim()).filter(Boolean);
            return String(value || '').split('\n').map(item => item.trim()).filter(Boolean);
        }

        optionalNumber(value, minimum, maximum, label) {
            if (value === '' || value === null || value === undefined) return null;
            const numeric = Number(value);
            if (!Number.isFinite(numeric) || numeric < minimum || numeric > maximum) {
                throw new Error(`El valor de ${label} debe estar entre ${minimum} y ${maximum}`);
            }
            return numeric;
        }
    }
    return DataNormalizationService;
});
