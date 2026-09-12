/** Canonical four-channel EMG contract used by capture, storage and analysis. */
(function exposeEmgChannelContract(root, factory) {
    const contract = factory();
    if (typeof module !== 'undefined' && module.exports) module.exports = contract;
    if (root) root.EMGChannelContract = contract;
})(typeof window !== 'undefined' ? window : null, function createEmgChannelContract() {
    const groups = Object.freeze(['flexor', 'extensor']);
    const sides = Object.freeze(['left', 'right']);
    const keys = Object.freeze(['flexorLeft', 'flexorRight', 'extensorLeft', 'extensorRight']);

    const number = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
    const channel = (value, envelope, flags) => ({
        amplitude: number(value?.amplitude ?? value?.emg ?? value),
        activation: number(value?.activation),
        envelope: number(value?.envelope ?? envelope),
        flags: number(value?.flags ?? flags)
    });

    function normalizeSample(sample = {}) {
        const legacy = !sample.flexor && !sample.extensor;
        const flexor = sample.flexor || { left: sample.left, right: sample.right };
        const extensor = sample.extensor || {};
        const flags = sample.flags || {};
        return {
            ...sample,
            time: number(sample.time ?? sample.timestamp),
            channelSchema: legacy ? 'legacy-2ch' : 'flexor-extensor-4ch',
            flexor: {
                left: channel(flexor.left, sample.envelopeLeft, flags.left),
                right: channel(flexor.right, sample.envelopeRight, flags.right)
            },
            extensor: {
                left: channel(extensor.left),
                right: channel(extensor.right)
            }
        };
    }

    function getChannel(sample, group, side) {
        return normalizeSample(sample)?.[group]?.[side];
    }

    return Object.freeze({ groups, sides, keys, normalizeSample, getChannel });
});
