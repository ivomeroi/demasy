(function initializeDemasyLogger(root) {
    function readDebugPreference() {
        const queryEnabled = root.location
            ? new URLSearchParams(root.location.search).get('debug') === '1'
            : false;
        let storedEnabled = false;
        try {
            storedEnabled = root.localStorage?.getItem('demasy.debug') === 'true';
        } catch {
            // Storage can be unavailable in private or restricted contexts.
        }
        return queryEnabled || storedEnabled;
    }

    const enabled = readDebugPreference();
    const logger = Object.freeze({
        enabled,
        debug(...args) {
            if (enabled) console.debug('[DEMASY]', ...args);
        }
    });

    root.DemasyLogger = logger;
    if (typeof module !== 'undefined' && module.exports) module.exports = logger;
}(typeof window !== 'undefined' ? window : globalThis));
