/**
 * Shared DEMASY application and domain constants.
 * Keep thresholds and schema identifiers centralized so every signal source
 * and analysis screen uses the same definitions.
 */
(function exposeConfig(root, factory) {
    const config = factory();

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = config;
    }

    if (root) {
        root.DEMASY_CONFIG = config;
    }
})(typeof window !== 'undefined' ? window : null, function createConfig() {
    const config = {
        application: {
            name: 'DEMASY',
            version: '1.0.0'
        },
        schema: {
            version: 1,
            databaseName: 'DEMASYDB',
            legacyDatabaseName: 'KinesioEMGDB'
        },
        signal: {
            simulationRateHz: 1000,
            storageRateHz: 100,
            chartUpdateIntervalMs: 50,
            defaultChartWindowSeconds: 1
        },
        session: {
            defaultDurationSeconds: 60,
            maximumDurationSeconds: 30 * 60
        },
        symmetry: {
            highMinimum: 90,
            mildMinimum: 75,
            moderateMinimum: 60,
            labels: {
                high: 'Simetría alta',
                mild: 'Diferencia leve',
                moderate: 'Diferencia moderada',
                marked: 'Diferencia marcada'
            }
        }
    };

    return Object.freeze(config);
});
