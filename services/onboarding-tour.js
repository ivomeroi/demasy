/** First-visit, browser-local guided tour for DEMASY. */
(function exposeOnboardingTour(root, factory) {
    const OnboardingTour = factory(root);
    if (typeof module !== 'undefined' && module.exports) module.exports = OnboardingTour;
    if (root) root.OnboardingTour = OnboardingTour;
})(typeof window !== 'undefined' ? window : null, function createOnboardingTour(root) {
class OnboardingTour {
    constructor(options = {}) {
        this.storage = options.storage || root?.localStorage;
        this.onNavigate = options.onNavigate || (() => Promise.resolve());
        this.storageKey = 'demasy:onboarding:v1:completed';
        this.currentIndex = 0;
        this.active = false;
        this.previousFocus = null;
        this.steps = [
            { title: 'Bienvenido a DEMASY', text: 'Este recorrido presenta el flujo principal. Los datos se guardan solamente en este navegador.', selector: '.logo' },
            { title: 'EMG en vivo', text: 'Aquí puedes simular señales o conectar el ESP32, calibrar el reposo y observar la actividad bilateral.', section: 'dashboard', selector: '[data-section="dashboard"]' },
            { title: 'Configura y registra', text: 'Selecciona un participante y las condiciones de la sesión antes de iniciar una grabación.', section: 'dashboard', selector: '#session-workflow' },
            { title: 'Análisis', text: 'Consulta métricas temporales, simetría, calidad y comparaciones entre sesiones compatibles.', section: 'analysis', selector: '[data-section="analysis"]' },
            { title: 'Pacientes', text: 'Administra participantes mediante códigos y accede a sus sesiones e historial.', section: 'patients', selector: '[data-section="patients"]' },
            { title: 'Asistente IA', text: 'Realiza consultas educativas sobre EMG. Sus respuestas no constituyen diagnóstico.', section: 'ai-assistant', selector: '[data-section="ai-assistant"]' },
            { title: 'Configuración y respaldo', text: 'Ajusta la visualización, exporta respaldos y vuelve a iniciar este tutorial cuando lo necesites.', section: 'settings', selector: '[data-section="settings"]' },
            { title: 'Todo listo', text: 'Puedes comenzar en EMG en vivo. Recuerda conservar respaldos periódicos de DEMASYDB.', section: 'dashboard', selector: '[data-section="dashboard"]' }
        ];
        this.handleKeydown = event => this.onKeydown(event);
        this.handleViewportChange = () => this.positionCurrentStep();
    }

    hasCompleted() {
        try { return this.storage.getItem(this.storageKey) === 'true'; } catch { return false; }
    }

    markCompleted() {
        try { this.storage.setItem(this.storageKey, 'true'); } catch { /* Storage can be unavailable in private contexts. */ }
    }

    async start({ force = false } = {}) {
        if (this.active || (!force && this.hasCompleted())) return false;
        this.active = true;
        this.currentIndex = 0;
        this.previousFocus = document.activeElement;
        this.render();
        document.addEventListener('keydown', this.handleKeydown);
        window.addEventListener('resize', this.handleViewportChange);
        window.addEventListener('scroll', this.handleViewportChange, true);
        await this.showStep();
        return true;
    }

    render() {
        document.getElementById('onboarding-tour')?.remove();
        document.body.insertAdjacentHTML('beforeend', `<div class="onboarding-tour" id="onboarding-tour">
            <div class="onboarding-backdrop"></div><div class="onboarding-highlight" aria-hidden="true"></div>
            <section class="onboarding-dialog" role="dialog" aria-modal="true" aria-labelledby="onboarding-title" aria-describedby="onboarding-text">
                <div class="onboarding-progress"><span id="onboarding-counter"></span><button type="button" class="onboarding-skip" id="onboarding-skip">Omitir</button></div>
                <h2 id="onboarding-title"></h2><p id="onboarding-text"></p>
                <div class="onboarding-actions"><button type="button" class="btn-outline" id="onboarding-previous">Anterior</button><button type="button" class="btn-control primary" id="onboarding-next">Siguiente</button></div>
            </section></div>`);
        document.getElementById('onboarding-skip').addEventListener('click', () => this.finish());
        document.getElementById('onboarding-previous').addEventListener('click', () => this.previous());
        document.getElementById('onboarding-next').addEventListener('click', () => this.next());
    }

    async showStep() {
        const step = this.steps[this.currentIndex];
        if (step.section) await this.onNavigate(step.section);
        document.getElementById('onboarding-title').textContent = step.title;
        document.getElementById('onboarding-text').textContent = step.text;
        document.getElementById('onboarding-counter').textContent = `Paso ${this.currentIndex + 1} de ${this.steps.length}`;
        document.getElementById('onboarding-previous').disabled = this.currentIndex === 0;
        const next = document.getElementById('onboarding-next');
        next.textContent = this.currentIndex === this.steps.length - 1 ? 'Finalizar' : 'Siguiente';
        this.positionCurrentStep();
        next.focus();
    }

    positionCurrentStep() {
        if (!this.active) return;
        const step = this.steps[this.currentIndex];
        const target = step.selector ? document.querySelector(step.selector) : null;
        const highlight = document.querySelector('.onboarding-highlight');
        const dialog = document.querySelector('.onboarding-dialog');
        if (!highlight || !dialog) return;
        if (!target) {
            highlight.hidden = true;
            dialog.classList.add('is-centered');
            dialog.removeAttribute('style');
            return;
        }
        highlight.hidden = false;
        dialog.classList.remove('is-centered');
        const rect = target.getBoundingClientRect();
        const visible = rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.right > 0 && rect.top < window.innerHeight && rect.left < window.innerWidth;
        if (!visible) {
            highlight.hidden = true;
            dialog.classList.add('is-centered');
            dialog.removeAttribute('style');
            return;
        }
        const padding = 8;
        highlight.style.cssText = `left:${Math.max(4, rect.left - padding)}px;top:${Math.max(4, rect.top - padding)}px;width:${Math.max(20, rect.width + padding * 2)}px;height:${Math.max(20, rect.height + padding * 2)}px`;
        const dialogWidth = Math.min(380, window.innerWidth - 32);
        const below = rect.bottom + 18;
        const top = below + 260 < window.innerHeight ? below : Math.max(16, rect.top - 278);
        const left = Math.min(Math.max(16, rect.left), window.innerWidth - dialogWidth - 16);
        dialog.style.cssText = `width:${dialogWidth}px;left:${left}px;top:${top}px`;
    }

    async next() {
        if (this.currentIndex >= this.steps.length - 1) return this.finish();
        this.currentIndex += 1;
        await this.showStep();
    }

    async previous() {
        if (this.currentIndex === 0) return;
        this.currentIndex -= 1;
        await this.showStep();
    }

    onKeydown(event) {
        if (event.key === 'Escape') this.finish();
        if (event.key === 'ArrowRight') this.next();
        if (event.key === 'ArrowLeft') this.previous();
    }

    finish() {
        if (!this.active) return;
        this.active = false;
        this.markCompleted();
        document.removeEventListener('keydown', this.handleKeydown);
        window.removeEventListener('resize', this.handleViewportChange);
        window.removeEventListener('scroll', this.handleViewportChange, true);
        document.getElementById('onboarding-tour')?.remove();
        this.previousFocus?.focus?.();
    }
}

return OnboardingTour;
});
