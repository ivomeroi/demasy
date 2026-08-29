/** Session analysis and comparison UI. All formulas live in AnalysisService. */
class AnalysisManager {
    constructor(database) {
        this.database = database;
        this.service = new AnalysisService();
        this.sessions = [];
        this.windowChart = null;
    }

    async render() {
        const participants = await this.database.listPatients();
        const container = document.getElementById('analysis-content');
        if (!container) return;
        container.innerHTML = `
            <div class="analysis-header"><div><h2>Análisis descriptivo de sesiones</h2><p>Resultados computacionales de apoyo; no constituyen diagnóstico clínico.</p></div></div>
            <div class="card analysis-selector">
                <label>Participante<select id="analysis-patient"><option value="">Seleccionar…</option>${participants.map(item => `<option value="${item.id}">${this.escape(item.participantCode)}${item.name ? ` · ${this.escape(item.name)}` : ''}</option>`).join('')}</select></label>
                <label>Sesión A<select id="analysis-session-a" disabled><option value="">Seleccionar…</option></select></label>
                <label>Sesión B para comparar<select id="analysis-session-b" disabled><option value="">Opcional…</option></select></label>
                <button class="btn-control primary" id="analyze-session" disabled>Analizar sesión A</button>
                <button class="btn-outline" id="compare-sessions" disabled>Comparar A y B</button>
            </div>
            <div id="analysis-results" class="analysis-results"><div class="empty-state"><h3>Selecciona una sesión guardada</h3><p>Se calcularán métricas sobre la sesión completa y ventanas de un segundo.</p></div></div>`;
        document.getElementById('analysis-patient').addEventListener('change', event => this.loadParticipantSessions(event.target.value));
        document.getElementById('analysis-session-a').addEventListener('change', () => this.updateControls());
        document.getElementById('analysis-session-b').addEventListener('change', () => this.updateControls());
        document.getElementById('analyze-session').addEventListener('click', () => this.analyzeSelected().catch(error => {
            window.app?.showNotification(`No se pudo guardar el análisis: ${error.message}`, 'error');
        }));
        document.getElementById('compare-sessions').addEventListener('click', () => this.compareSelected());
    }

    async loadParticipantSessions(patientId) {
        this.sessions = patientId ? await this.database.getPatientSessions(Number(patientId)) : [];
        const options = this.sessions.map(session => `<option value="${session.id}">${this.escape(session.label || `Sesión ${session.id}`)} · ${this.formatDate(session.startedAt || session.date)} · ${this.escape(session.muscleType)}</option>`).join('');
        const first = document.getElementById('analysis-session-a');
        const second = document.getElementById('analysis-session-b');
        first.innerHTML = `<option value="">Seleccionar…</option>${options}`;
        second.innerHTML = `<option value="">Opcional…</option>${options}`;
        first.disabled = !this.sessions.length;
        second.disabled = !this.sessions.length;
        this.updateControls();
    }

    updateControls() {
        const first = document.getElementById('analysis-session-a')?.value;
        const second = document.getElementById('analysis-session-b')?.value;
        document.getElementById('analyze-session').disabled = !first;
        document.getElementById('compare-sessions').disabled = !first || !second || first === second;
    }

    getSelected(id) { return this.sessions.find(session => session.id === Number(document.getElementById(id)?.value)); }

    async analyzeSelected() {
        const session = this.getSelected('analysis-session-a');
        if (!session) return;
        const analysis = this.service.analyzeSession(session, { windowSeconds: 1 });
        await this.database.updateSession(session.id, {
            analysis: { type: 'descriptive-v1', calculatedAt: new Date().toISOString(), ...analysis }
        });
        const metrics = analysis.metrics;
        document.getElementById('analysis-results').innerHTML = `
            <div class="analysis-notice">Interpretación descriptiva basada en umbrales demostrativos. Fórmula operacional: SI = min(RMS izq., RMS der.) / max(RMS izq., RMS der.) × 100.</div>
            <div class="analysis-metric-grid">
                ${this.metric('RMS izquierdo', metrics.left.rms, 'mV')}${this.metric('RMS derecho', metrics.right.rms, 'mV')}
                ${this.metric('MAV izquierdo', metrics.left.mav, 'mV')}${this.metric('MAV derecho', metrics.right.mav, 'mV')}
                ${this.metric('Simetría', metrics.bilateral.symmetryIndex, '%')}${this.metric('Diferencia', metrics.bilateral.percentageDifference, '%')}
                ${this.metric('Diferencia RMS', metrics.bilateral.absoluteRmsDifference, 'mV')}${this.metric('Duración efectiva', metrics.durationSeconds, 's')}
            </div>
            <div class="card"><h3>Características por lado</h3>${this.sideTable(metrics)}</div>
            <div class="card"><h3>Evolución por ventanas de 1 segundo</h3><div class="analysis-chart-container"><canvas id="analysis-window-chart"></canvas></div></div>
            <div class="analysis-notice">Lado dominante por RMS: <strong>${this.sideLabel(metrics.bilateral.dominantSide)}</strong>. ${this.escape(metrics.bilateral.asymmetryLevel)}. La fase mostrada es la configurada (${analysis.configuredPhaseDifferenceDegrees}°), no una estimación clínica.</div>`;
        this.renderWindowChart(analysis.windows);
    }

    compareSelected() {
        const first = this.getSelected('analysis-session-a');
        const second = this.getSelected('analysis-session-b');
        if (!first || !second) return;
        const comparison = this.service.compareSessions(first, second, { windowSeconds: 1 });
        const status = comparison.compatibility.compatible
            ? comparison.compatibility.equivalentConditions ? 'Compatible y con condiciones equivalentes' : 'Compatible, con condiciones diferentes: solo comparación lado a lado'
            : `No compatible: ${comparison.compatibility.reasons.join('. ')}`;
        document.getElementById('analysis-results').innerHTML = `
            <div class="analysis-notice ${comparison.compatibility.compatible ? '' : 'error-state'}"><strong>${this.escape(status)}</strong></div>
            ${this.configurationComparison(first, second)}
            <div class="card"><h3>Comparación de métricas</h3>${this.comparisonTable(comparison)}</div>
            <div class="modal-actions"><button class="btn-outline" id="export-comparison-json">Exportar JSON</button><button class="btn-outline" id="export-comparison-csv">Exportar CSV</button></div>
            <div class="analysis-notice">Los porcentajes solo se calculan si cadencia, resistencia, duración y escenario son equivalentes. Los resultados son descriptivos y no expresan diagnóstico ni progreso clínico.</div>`;
        document.getElementById('export-comparison-json').addEventListener('click', () => this.download(JSON.stringify(comparison, null, 2), 'demasy-comparison.json', 'application/json'));
        document.getElementById('export-comparison-csv').addEventListener('click', () => this.download(this.comparisonCSV(comparison), 'demasy-comparison.csv', 'text/csv'));
    }

    metric(label, value, unit) { return `<div class="analysis-metric"><span>${label}</span><strong>${this.number(value)} ${unit}</strong></div>`; }
    number(value) { return Number.isFinite(Number(value)) ? Number(value).toFixed(3) : 'N/A'; }
    sideLabel(value) { return ({ left: 'izquierdo', right: 'derecho', balanced: 'equilibrado' })[value] || value; }
    sideTable(metrics) {
        const rows = [
            ['Media / offset DC', 'dcOffset', 'mV'], ['Pico absoluto', 'peakAmplitude', 'mV'], ['Pico a pico', 'peakToPeak', 'mV'],
            ['Longitud de onda', 'waveformLength', 'mV'], ['Cruces por cero', 'zeroCrossings', ''],
            ['Entropía de Shannon normalizada', 'shannonEntropy', ''], ['Activación media normalizada', 'meanNormalizedActivation', '%']
        ];
        return `<table><thead><tr><th>Métrica</th><th>Izquierda</th><th>Derecha</th><th>Unidad</th></tr></thead><tbody>${rows.map(([label, key, unit]) => `<tr><td>${label}</td><td>${this.number(metrics.left[key])}</td><td>${this.number(metrics.right[key])}</td><td>${unit}</td></tr>`).join('')}</tbody></table>`;
    }

    renderWindowChart(windows) {
        this.windowChart?.destroy();
        const canvas = document.getElementById('analysis-window-chart');
        if (!canvas || typeof Chart === 'undefined') return;
        this.windowChart = new Chart(canvas, { type: 'line', data: { labels: windows.map(item => item.startSeconds.toFixed(0)), datasets: [
            { label: 'RMS izquierda (mV)', data: windows.map(item => item.left.rms), borderColor: '#3b82f6', pointRadius: 1 },
            { label: 'RMS derecha (mV)', data: windows.map(item => item.right.rms), borderColor: '#ef4444', pointRadius: 1 },
            { label: 'Simetría (%)', data: windows.map(item => item.bilateral.symmetryIndex), borderColor: '#10b981', pointRadius: 1, yAxisID: 'percentage' }
        ] }, options: { responsive: true, maintainAspectRatio: false, animation: false, scales: { x: { title: { display: true, text: 'Tiempo (s)' } }, percentage: { position: 'right', min: 0, max: 100, grid: { drawOnChartArea: false } } } } });
    }

    configurationComparison(first, second) {
        const value = (session, field) => field === 'scenario' ? session.configuration?.scenario || session.source?.scenario || 'No registrado' : session[field] ?? 'No registrado';
        const rows = [['Músculo', 'muscleType'], ['Prueba', 'sessionType'], ['Cadencia (rpm)', 'cadence'], ['Resistencia (%)', 'resistance'], ['Duración (s)', 'durationSeconds'], ['Escenario', 'scenario']];
        return `<div class="card"><h3>Condiciones registradas</h3><table><thead><tr><th>Condición</th><th>Sesión A</th><th>Sesión B</th></tr></thead><tbody>${rows.map(([label, field]) => `<tr><td>${label}</td><td>${this.escape(value(first, field))}</td><td>${this.escape(value(second, field))}</td></tr>`).join('')}</tbody></table></div>`;
    }

    comparisonTable(comparison) {
        const labels = { leftRms: 'RMS izquierdo', rightRms: 'RMS derecho', leftMav: 'MAV izquierdo', rightMav: 'MAV derecho', symmetryIndex: 'Índice de simetría' };
        return `<table><thead><tr><th>Métrica</th><th>Sesión A</th><th>Sesión B</th><th>Diferencia</th><th>Variación</th></tr></thead><tbody>${Object.entries(comparison.differences).map(([key, difference]) => `<tr><td>${labels[key]}</td><td>${this.number(key === 'symmetryIndex' ? comparison.first.metrics.bilateral.symmetryIndex : this.comparisonMetric(comparison.first.metrics, key))}</td><td>${this.number(key === 'symmetryIndex' ? comparison.second.metrics.bilateral.symmetryIndex : this.comparisonMetric(comparison.second.metrics, key))}</td><td>${this.number(difference.absolute)}</td><td>${difference.percentage === null ? 'No calculada' : `${this.number(difference.percentage)}%`}</td></tr>`).join('')}</tbody></table>`;
    }

    comparisonMetric(metrics, key) { const side = key.startsWith('left') ? metrics.left : metrics.right; return key.endsWith('Rms') ? side.rms : side.mav; }
    comparisonCSV(comparison) {
        const value = (analysis, key) => key === 'symmetryIndex' ? analysis.metrics.bilateral.symmetryIndex : this.comparisonMetric(analysis.metrics, key);
        return [
            'metric,session_a,session_b,absolute_difference,percentage_change',
            ...Object.entries(comparison.differences).map(([key, difference]) => `${key},${value(comparison.first, key)},${value(comparison.second, key)},${difference.absolute},${difference.percentage ?? ''}`)
        ].join('\n');
    }
    download(content, filename, type) { const url = URL.createObjectURL(new Blob([content], { type })); const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename; anchor.click(); URL.revokeObjectURL(url); }
    formatDate(value) { return new Date(value).toLocaleDateString('es-AR'); }
    escape(value) { return String(value ?? '').replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]); }
}

window.AnalysisManager = AnalysisManager;
