/** Maps DEMASY sections to stable browser paths. */
(function exposeSectionRouter(root, factory) {
    const SectionRouter = factory();
    if (typeof module !== 'undefined' && module.exports) module.exports = SectionRouter;
    if (root) root.SectionRouter = SectionRouter;
})(typeof window !== 'undefined' ? window : null, function createSectionRouter() {
    class SectionRouter {
        constructor() {
            this.routes = Object.freeze({
                dashboard: '/emg-en-vivo',
                analysis: '/analisis',
                patients: '/pacientes',
                'ai-assistant': '/asistente-ia',
                settings: '/configuracion'
            });
            this.sections = Object.freeze(Object.fromEntries(Object.entries(this.routes).map(([section, path]) => [path, section])));
        }

        getPath(section) { return this.routes[section] || this.routes.dashboard; }

        getSection(pathname) {
            const normalized = String(pathname || '/').replace(/\/+$/, '') || '/';
            if (normalized === '/' || normalized === '/index.html') return 'dashboard';
            return this.sections[normalized] || 'dashboard';
        }

        isAppPath(pathname) {
            const normalized = String(pathname || '/').replace(/\/+$/, '') || '/';
            return normalized === '/' || normalized === '/index.html' || Boolean(this.sections[normalized]);
        }
    }
    return SectionRouter;
});
