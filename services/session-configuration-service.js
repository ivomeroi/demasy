/**
 * Validation and normalization for simulated session configuration.
 */
(function exposeSessionConfigurationService(root, factory) {
    const SessionConfigurationService = factory(
        root?.DEMASY_CONFIG || (typeof require === 'function' ? require('../core/demasy-config.js') : null)
    );

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = SessionConfigurationService;
    }

    if (root) root.SessionConfigurationService = SessionConfigurationService;
})(typeof window !== 'undefined' ? window : null, function createSessionConfigurationService(config) {
    const muscles = Object.freeze([
        'quadriceps', 'gastrocnemius', 'hamstring', 'tibialis', 'gluteus', 'soleus'
    ]);
    const scenarios = Object.freeze([
        'symmetric', 'left-weakness', 'right-weakness', 'left-fatigue',
        'right-fatigue', 'phase-delay', 'intervals', 'custom'
    ]);

    class SessionConfigurationService {
        validate(input) {
            const errors = {};
            const patientId = Number(input?.patientId);
            const duration = Number(input?.plannedDurationSeconds);
            const cadence = Number(input?.cadenceRpm);
            const resistance = Number(input?.resistancePercent);
            const asymmetry = Number(input?.asymmetryPercent ?? 0);
            const phaseDelay = Number(input?.phaseDelayDegrees ?? 0);

            if (!Number.isInteger(patientId) || patientId <= 0) errors.patientId = 'Selecciona un participante';
            if (!muscles.includes(input?.muscleType)) errors.muscleType = 'Selecciona un músculo válido';
            if (!scenarios.includes(input?.scenario)) errors.scenario = 'Selecciona un escenario válido';
            if (!Number.isFinite(duration) || duration < 10 || duration > config.session.maximumDurationSeconds) {
                errors.plannedDurationSeconds = `La duración debe estar entre 10 y ${config.session.maximumDurationSeconds} segundos`;
            }
            if (!Number.isFinite(cadence) || cadence < 30 || cadence > 200) {
                errors.cadenceRpm = 'La cadencia debe estar entre 30 y 200 RPM';
            }
            if (!Number.isFinite(resistance) || resistance < 0 || resistance > 100) {
                errors.resistancePercent = 'La resistencia debe estar entre 0 y 100 %';
            }
            if (!Number.isFinite(asymmetry) || asymmetry < 0 || asymmetry > 80) {
                errors.asymmetryPercent = 'La diferencia debe estar entre 0 y 80 %';
            }
            if (!Number.isFinite(phaseDelay) || phaseDelay < -180 || phaseDelay > 180) {
                errors.phaseDelayDegrees = 'El desfase debe estar entre -180° y 180°';
            }

            return { valid: Object.keys(errors).length === 0, errors };
        }

        normalize(input) {
            const validation = this.validate(input);
            if (!validation.valid) {
                const error = new Error('La configuración de sesión no es válida');
                error.validationErrors = validation.errors;
                throw error;
            }

            return {
                patientId: Number(input.patientId),
                label: String(input.label || '').trim() || 'Sesión simulada',
                muscleType: input.muscleType,
                testType: 'stationary-cycling',
                plannedDurationSeconds: Number(input.plannedDurationSeconds),
                cadenceRpm: Number(input.cadenceRpm),
                resistancePercent: Number(input.resistancePercent),
                scenario: input.scenario,
                scenarioParameters: {
                    asymmetryPercent: Number(input.asymmetryPercent || 0),
                    affectedSide: this.affectedSide(input.scenario),
                    phaseDelayDegrees: Number(input.phaseDelayDegrees || 0)
                },
                notes: String(input.notes || '').trim(),
                source: { type: 'simulation', provider: 'built-in', version: 1 }
            };
        }

        affectedSide(scenario) {
            if (scenario.startsWith('left-')) return 'left';
            if (scenario.startsWith('right-')) return 'right';
            return null;
        }

        getMuscles() {
            return [...muscles];
        }

        getScenarios() {
            return [...scenarios];
        }
    }

    return SessionConfigurationService;
});
