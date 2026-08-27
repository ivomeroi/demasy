/**
 * Runtime contract shared by live, simulated and replayed signal sources.
 */
(function exposeContract(root, factory) {
    const contract = factory();

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = contract;
    }

    if (root) {
        root.SignalSourceContract = contract;
    }
})(typeof window !== 'undefined' ? window : null, function createContract() {
    const requiredMethods = Object.freeze([
        'start',
        'pause',
        'resume',
        'stop',
        'reset',
        'getStats',
        'getStatus',
        'onDataUpdate',
        'onStatsUpdate'
    ]);

    function getMissingMethods(source) {
        if (!source) return [...requiredMethods];
        return requiredMethods.filter(method => typeof source[method] !== 'function');
    }

    function assert(source, label = 'Signal source') {
        const missing = getMissingMethods(source);

        if (missing.length > 0) {
            throw new TypeError(`${label} does not implement: ${missing.join(', ')}`);
        }

        return source;
    }

    return Object.freeze({
        requiredMethods,
        getMissingMethods,
        assert
    });
});
