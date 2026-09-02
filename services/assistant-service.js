/** Safe adapter orchestration for the optional DEMASY assistant. */
(function exposeAssistantService(root, factory) {
    const exports = factory();
    if (typeof module !== 'undefined' && module.exports) module.exports = exports;
    if (root) Object.assign(root, exports);
})(typeof window !== 'undefined' ? window : null, function createAssistantService() {
    const DISCLAIMER = 'Contenido educativo generado por DEMASY. No constituye diagnóstico ni reemplaza la evaluación de un profesional.';

    function redactText(value) {
        return String(value ?? '')
            .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, '[correo omitido]')
            .replace(/\+?\d[\d\s().-]{7,}\d/g, '[teléfono omitido]');
    }

    function normalizeOutput(value) {
        return String(value ?? '').replace(/^\s*[-*]\s+/gm, '• ').replace(/\*\*/g, '').replace(/\*/g, '').trim();
    }

    function anonymizeContext(context) {
        const allowedKeys = new Set([
            'activity', 'muscle', 'cadence', 'resistance', 'rms', 'mav', 'peakAmplitude',
            'peakToPeak', 'waveformLength', 'zeroCrossings', 'entropy', 'frequency', 'snr',
            'artifacts', 'symmetryIndex', 'difference', 'activationLevel', 'quality', 'left',
            'right', 'bilateral', 'cycling', 'pedalingEfficiency', 'powerImbalance'
        ]);
        const visit = value => {
            if (Array.isArray(value)) return value.slice(0, 50).map(visit);
            if (!value || typeof value !== 'object') return typeof value === 'string' ? redactText(value).slice(0, 120) : value;
            return Object.fromEntries(Object.entries(value)
                .filter(([key]) => allowedKeys.has(key))
                .map(([key, child]) => [key, visit(child)]));
        };
        return visit(context || {});
    }

    class LocalAssistantAdapter {
        constructor(responder) { this.responder = responder; }
        async request({ message, context }) {
            return { content: await this.responder(message, context), source: 'local' };
        }
    }

    class MockAssistantAdapter {
        async request({ context }) {
            const symmetry = Number(context?.bilateral?.symmetryIndex);
            const detail = Number.isFinite(symmetry) ? ` El índice de simetría disponible es ${symmetry.toFixed(1)}%.` : '';
            return { content: `Respuesta remota simulada para validar la integración.${detail}`, source: 'mock' };
        }
    }

    class RemoteAssistantAdapter {
        constructor(options = {}) {
            this.endpoint = options.endpoint || '/api/chat';
            this.healthEndpoint = options.healthEndpoint || '/api/health';
            this.timeoutMs = options.timeoutMs || 8000;
            const fetchImplementation = options.fetch || globalThis.fetch;
            if (typeof fetchImplementation !== 'function') throw new Error('Fetch no está disponible en este entorno');
            this.fetch = (...args) => fetchImplementation(...args);
        }

        async health() {
            const response = await this.withTimeout(signal => this.fetch(this.healthEndpoint, { signal }));
            if (!response.ok) throw new Error(`Health check remoto: HTTP ${response.status}`);
            return response.json();
        }

        async request({ message, context, history }) {
            const response = await this.withTimeout(signal => this.fetch(this.endpoint, {
                method: 'POST', signal, headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: redactText(message), emgContext: context, history })
            }));
            if (!response.ok) {
                const body = await response.json().catch(() => ({}));
                throw new Error(body.error || `Asistente remoto: HTTP ${response.status}`);
            }
            const data = await response.json();
            if (!data.response || typeof data.response !== 'string') throw new Error('El asistente remoto devolvió una respuesta vacía');
            return { content: data.response, source: 'remote', model: data.model || null };
        }

        async withTimeout(operation) {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), this.timeoutMs);
            try { return await operation(controller.signal); }
            catch (error) {
                if (error?.name === 'AbortError') throw new Error('El asistente remoto superó el tiempo de espera');
                throw error;
            } finally { clearTimeout(timer); }
        }
    }

    class AssistantService {
        constructor(options) {
            this.mode = options.mode || 'auto';
            this.local = options.local;
            this.remote = options.remote;
            this.mock = options.mock || new MockAssistantAdapter();
            this.maximumHistory = options.maximumHistory || 20;
            this.history = [];
            this.pending = new Map();
        }

        setMode(mode) {
            if (!['local', 'remote', 'auto', 'mock'].includes(mode)) throw new RangeError('Modo de asistente inválido');
            this.mode = mode;
        }

        request(message, context = {}) {
            const normalized = String(message || '').trim();
            if (!normalized) return Promise.reject(new TypeError('Escribe una consulta antes de enviar'));
            const key = normalized.toLocaleLowerCase('es');
            if (this.pending.has(key)) return this.pending.get(key);
            const operation = this.execute(normalized, anonymizeContext(context)).finally(() => this.pending.delete(key));
            this.pending.set(key, operation);
            return operation;
        }

        async execute(message, context) {
            this.addHistory({ type: 'user', content: redactText(message) });
            const history = this.history.slice(-6).map(entry => ({ ...entry, content: redactText(entry.content) }));
            let result;
            if (this.mode === 'local') result = await this.local.request({ message, context, history });
            else if (this.mode === 'mock') result = await this.mock.request({ message, context, history });
            else if (this.mode === 'remote') result = await this.remote.request({ message, context, history });
            else {
                try { result = await this.remote.request({ message, context, history }); }
                catch (error) {
                    result = await this.local.request({ message, context, history });
                    result.fallback = true;
                    result.remoteError = error.message;
                }
            }
            result.content = `${normalizeOutput(result.content)}\n\n${DISCLAIMER}`;
            this.addHistory({ type: 'assistant', content: result.content, source: result.source });
            return result;
        }

        addHistory(entry) {
            this.history.push({ ...entry, timestamp: new Date().toISOString() });
            if (this.history.length > this.maximumHistory) this.history.splice(0, this.history.length - this.maximumHistory);
        }

        clearHistory() { this.history = []; }
        getHistory() { return this.history.map(entry => ({ ...entry })); }
        restoreHistory(entries) {
            this.history = (Array.isArray(entries) ? entries : [])
                .filter(entry => ['user', 'assistant'].includes(entry?.type) && typeof entry.content === 'string')
                .slice(-this.maximumHistory)
                .map(entry => ({ type: entry.type, content: redactText(entry.content), source: entry.source || null, timestamp: new Date().toISOString() }));
            return this.getHistory();
        }
    }

    return { AssistantService, LocalAssistantAdapter, RemoteAssistantAdapter, MockAssistantAdapter, anonymizeContext, redactText, ASSISTANT_DISCLAIMER: DISCLAIMER };
});
