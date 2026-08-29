/** Pure filtering and presentation helpers for stored DEMASY sessions. */
(function exposeSessionHistory(root, factory) {
    const SessionHistoryService = factory();
    if (typeof module !== 'undefined' && module.exports) module.exports = SessionHistoryService;
    if (root) root.SessionHistoryService = SessionHistoryService;
})(typeof window !== 'undefined' ? window : null, function createSessionHistoryService() {
    class SessionHistoryService {
        filter(sessions, filters = {}) {
            const from = filters.dateFrom ? new Date(`${filters.dateFrom}T00:00:00`) : null;
            const to = filters.dateTo ? new Date(`${filters.dateTo}T23:59:59.999`) : null;
            return [...(sessions || [])].filter(session => {
                const date = new Date(session.startedAt || session.date);
                if (from && date < from) return false;
                if (to && date > to) return false;
                if (filters.muscleType && session.muscleType !== filters.muscleType) return false;
                if (filters.scenario && this.getScenario(session) !== filters.scenario) return false;
                if (filters.status && session.status !== filters.status) return false;
                return true;
            }).sort((a, b) => new Date(b.startedAt || b.date) - new Date(a.startedAt || a.date));
        }

        getScenario(session) {
            return session?.configuration?.scenario || session?.source?.scenario || 'unknown';
        }

        getSamples(session) {
            return Array.isArray(session?.samples) ? session.samples
                : Array.isArray(session?.emgData) ? session.emgData : [];
        }
    }
    return SessionHistoryService;
});
