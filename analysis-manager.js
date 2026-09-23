/** Session analysis and comparison UI. All formulas live in AnalysisService. */
class AnalysisManager {
    constructor(database) {
        this.database = database;
        this.service = new AnalysisService();
        this.sessions = [];
        this.windowChart = null;
        this.progressCharts = [];
        this.currentLongitudinalEntries = [];
        this.asymmetryMetricSelection = new Set(['relativeAsymmetry', 'weightedUniversalAsymmetry']);
    }

    async render() {
        const participants = await this.database.listPatients();
        const container = document.getElementById('analysis-content');
        if (!container) return;
        container.innerHTML = `
            <div class="analysis-header"><div><h2>Análisis descriptivo de sesiones</h2><p>Resultados computacionales de apoyo; no constituyen diagnóstico clínico.</p></div></div>
            <div class="card analysis-selector">
                <label>Participante<select id="analysis-patient"><option value="">Seleccionar…</option>${participants.map(item => `<option value="${item.id}">${this.escape(item.participantCode)}${item.name ? ` · ${this.escape(item.name)}` : ''}</option>`).join('')}</select></label>
                <div class="analysis-session-field">
                    <span>Sesiones</span>
                    <details id="analysis-session-picker" class="analysis-multiselect">
                        <summary id="analysis-session-summary">Selecciona un participante</summary>
                        <div class="analysis-multiselect-panel">
                            <div class="analysis-multiselect-actions"><button type="button" id="analysis-select-all">Seleccionar todas</button><button type="button" id="analysis-clear-all">Limpiar</button></div>
                            <div id="analysis-session-options" class="analysis-session-options"><p>No hay sesiones disponibles.</p></div>
                        </div>
                    </details>
                </div>
                <button class="btn-control primary" id="analyze-session" disabled>Analizar selección</button>
            </div>
            <div id="analysis-results" class="analysis-results"><div class="empty-state"><h3>Selecciona una o más sesiones guardadas</h3><p>Se calcularán las métricas de cada sesión y su evolución cronológica.</p></div></div>`;
        document.getElementById('analysis-patient').addEventListener('change', event => this.loadParticipantSessions(event.target.value));
        document.getElementById('analysis-select-all').addEventListener('click', () => this.setAllSessions(true));
        document.getElementById('analysis-clear-all').addEventListener('click', () => this.setAllSessions(false));
        document.getElementById('analyze-session').addEventListener('click', () => this.analyzeSelected().catch(error => {
            window.app?.showNotification(`No se pudo guardar el análisis: ${error.message}`, 'error');
        }));
    }

    async loadParticipantSessions(patientId) {
        this.sessions = patientId ? await this.database.getPatientSessions(Number(patientId)) : [];
        this.sessions.sort((first, second) => this.sessionTime(second) - this.sessionTime(first));
        const options = this.sessions.map(session => `<label class="analysis-session-option"><input type="checkbox" value="${session.id}"><span><strong>${this.escape(session.label || `Sesión ${session.id}`)}</strong><small>${this.formatDate(session.startedAt || session.date)} · ${this.escape(session.muscleType || 'Músculo no registrado')}</small></span></label>`).join('');
        const picker = document.getElementById('analysis-session-picker');
        picker.classList.toggle('disabled', !this.sessions.length);
        picker.open = false;
        document.getElementById('analysis-session-options').innerHTML = options || '<p>No hay sesiones guardadas para este participante.</p>';
        document.querySelectorAll('#analysis-session-options input').forEach(input => input.addEventListener('change', () => this.updateControls()));
        this.updateControls();
    }

    updateControls() {
        const count = this.selectedSessions().length;
        document.getElementById('analyze-session').disabled = count === 0;
        document.getElementById('analysis-session-summary').textContent = count ? `${count} ${count === 1 ? 'sesión seleccionada' : 'sesiones seleccionadas'}` : (this.sessions.length ? 'Seleccionar sesiones…' : 'Sin sesiones disponibles');
    }

    selectedSessions() {
        const ids = new Set([...document.querySelectorAll('#analysis-session-options input:checked')].map(input => String(input.value)));
        return this.sessions.filter(session => ids.has(String(session.id)));
    }

    setAllSessions(selected) {
        document.querySelectorAll('#analysis-session-options input').forEach(input => { input.checked = selected; });
        this.updateControls();
    }

    async analyzeSelected() {
        const sessions = this.selectedSessions();
        if (!sessions.length) return;
        const longitudinal = this.service.analyzeSessions(sessions, { windowSeconds: 1 });
        const calculatedAt = new Date().toISOString();
        await Promise.all(sessions.map(session => {
            const entry = longitudinal.newestFirst.find(item => String(item.session.id) === String(session.id));
            return this.database.updateSession(session.id, { analysis: { type: 'descriptive-v1', calculatedAt, ...entry.analysis } });
        }));
        document.getElementById('analysis-results').innerHTML = `
            <div class="analysis-notice">Se analizaron <strong>${sessions.length}</strong> ${sessions.length === 1 ? 'sesión' : 'sesiones'}. La tabla muestra primero la más reciente; los gráficos avanzan cronológicamente de izquierda a derecha.</div>
            <div class="analysis-progress-grid">
                <div class="card"><h3>Evolución de RMS</h3><div class="analysis-chart-container"><canvas id="analysis-rms-progress"></canvas></div></div>
                <div class="card"><h3>Evolución de asimetrías</h3>${this.asymmetryMetricControls()}<div class="analysis-chart-container"><canvas id="analysis-symmetry-progress"></canvas></div></div>
            </div>
            <div class="card"><h3>Métricas por sesión</h3><div class="analysis-table-scroll">${this.longitudinalTable(longitudinal.newestFirst)}</div></div>
            ${this.metricGlossary()}
            <div class="analysis-notice">Los resultados son descriptivos y no constituyen diagnóstico. El wUSI es una adaptación experimental a amplitudes RMS de EMG.</div>`;
        this.currentLongitudinalEntries = longitudinal.chronological;
        document.querySelectorAll('[data-asymmetry-metric]').forEach(input => input.addEventListener('change', event => this.toggleAsymmetryMetric(event.target)));
        this.renderProgressCharts(longitudinal.chronological);
    }

    longitudinalTable(entries) {
        return `<table><thead><tr><th>Fecha</th><th>Sesión</th><th>Par muscular</th><th>Flexor izq./der. RMS</th><th>Asimetría relativa flexor</th><th>Robinson flexor</th><th>wUSI flexor</th><th>Extensor izq./der. RMS</th><th>Asimetría relativa extensor</th><th>Robinson extensor</th><th>wUSI extensor</th></tr></thead><tbody>${entries.map(({ session, analysis }) => {
            const metrics = analysis.metrics;
            const musclePair = [session.flexorMuscleType || session.muscleType, session.extensorMuscleType].filter(Boolean).join(' / ') || 'No registrado';
            return `<tr><td>${this.formatDateTime(session.startedAt)}</td><td>${this.escape(session.label || `Sesión ${session.id}`)}</td><td>${this.escape(musclePair)}</td><td>${this.number(metrics.flexor.left.rms)} / ${this.number(metrics.flexor.right.rms)} mV</td>${this.asymmetryCells(metrics.flexor.bilateral)}<td>${this.number(metrics.extensor.left.rms)} / ${this.number(metrics.extensor.right.rms)} mV</td>${this.asymmetryCells(metrics.extensor.bilateral)}</tr>`;
        }).join('')}</tbody></table>`;
    }

    asymmetryCells(bilateral) {
        return `<td>${this.number(bilateral.relativeAsymmetry)}%</td><td>${this.signed(bilateral.robinsonAsymmetry)}%</td><td>${this.signed(bilateral.weightedUniversalAsymmetry)}%</td>`;
    }

    asymmetryMetricControls() {
        return `<fieldset class="analysis-metric-controls"><legend>Medidas visibles</legend>${this.asymmetryMetricCatalog().map(metric => `<label><input type="checkbox" data-asymmetry-metric value="${metric.key}" ${this.asymmetryMetricSelection.has(metric.key) ? 'checked' : ''}>${metric.shortLabel}</label>`).join('')}</fieldset>`;
    }

    asymmetryMetricCatalog() {
        return [
            { key: 'relativeAsymmetry', shortLabel: 'Relativa', label: 'Asimetría relativa', flexorColor: '#059669', extensorColor: '#0f766e' },
            { key: 'robinsonAsymmetry', shortLabel: 'Robinson', label: 'Índice de Robinson', flexorColor: '#2563eb', extensorColor: '#1e40af' },
            { key: 'weightedUniversalAsymmetry', shortLabel: 'wUSI', label: 'wUSI adaptado', flexorColor: '#d97706', extensorColor: '#b45309' }
        ];
    }

    toggleAsymmetryMetric(input) {
        if (input.checked) this.asymmetryMetricSelection.add(input.value);
        else if (this.asymmetryMetricSelection.size > 1) this.asymmetryMetricSelection.delete(input.value);
        else input.checked = true;
        this.renderProgressCharts(this.currentLongitudinalEntries);
    }

    metricGlossary() {
        return `<details class="metric-glossary card"><summary>Glosario de métricas de asimetría</summary><div class="metric-glossary-content"><dl><dt>Simetría bilateral</dt><dd>RMS menor dividido por RMS mayor. 100% representa amplitudes iguales.</dd><dt>Asimetría relativa</dt><dd>|L−R| / max(L,R) × 100. Va de 0% a 100% y no conserva dirección.</dd><dt>Índice de Robinson</dt><dd>(L−R) / promedio(L,R) × 100. Positivo: mayor RMS izquierdo; negativo: mayor RMS derecho.</dd><dt>wUSI adaptado</dt><dd>Índice universal ponderado por el piso de ruido estimado. El signo conserva la dirección y la ponderación reduce resultados inflados cuando las amplitudes son pequeñas.</dd></dl></div></details>`;
    }

    renderProgressCharts(entries) {
        this.progressCharts.forEach(chart => chart.destroy());
        this.progressCharts = [];
        if (typeof Chart === 'undefined') return;
        const labels = entries.map(({ session }) => this.formatDate(session.startedAt));
        const line = (label, selector, color) => ({ label, data: entries.map(({ analysis }) => selector(analysis.metrics)), borderColor: color, backgroundColor: color, tension: 0.2, pointRadius: 4 });
        const rmsCanvas = document.getElementById('analysis-rms-progress');
        const symmetryCanvas = document.getElementById('analysis-symmetry-progress');
        if (rmsCanvas) this.progressCharts.push(new Chart(rmsCanvas, { type: 'line', data: { labels, datasets: [
            line('Flexor izquierdo', metrics => metrics.flexor.left.rms, '#2563eb'), line('Flexor derecho', metrics => metrics.flexor.right.rms, '#dc2626'),
            line('Extensor izquierdo', metrics => metrics.extensor.left.rms, '#0891b2'), line('Extensor derecho', metrics => metrics.extensor.right.rms, '#d97706')
        ] }, options: this.progressChartOptions('RMS (mV)') }));
        const asymmetryDatasets = this.asymmetryMetricCatalog().filter(metric => this.asymmetryMetricSelection.has(metric.key)).flatMap(metric => [
            line(`${metric.label} · flexor`, metrics => metrics.flexor.bilateral[metric.key], metric.flexorColor),
            line(`${metric.label} · extensor`, metrics => metrics.extensor.bilateral[metric.key], metric.extensorColor)
        ]);
        if (symmetryCanvas) this.progressCharts.push(new Chart(symmetryCanvas, { type: 'line', data: { labels, datasets: asymmetryDatasets }, options: this.progressChartOptions('Asimetría (%)') }));
    }

    progressChartOptions(title, min, max) {
        return { responsive: true, maintainAspectRatio: false, animation: false, interaction: { mode: 'index', intersect: false }, scales: { x: { title: { display: true, text: 'Fecha de sesión' } }, y: { title: { display: true, text: title }, ...(min !== undefined ? { min, max } : {}) } } };
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
    signed(value) { return Number.isFinite(Number(value)) ? `${Number(value) >= 0 ? '+' : ''}${Number(value).toFixed(3)}` : 'N/A'; }
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
            { label: 'RMS flexor izquierdo', data: windows.map(item => item.flexor.left.rms), borderColor: '#3b82f6', pointRadius: 1 },
            { label: 'RMS flexor derecho', data: windows.map(item => item.flexor.right.rms), borderColor: '#ef4444', pointRadius: 1 },
            { label: 'RMS extensor izquierdo', data: windows.map(item => item.extensor.left.rms), borderColor: '#06b6d4', pointRadius: 1 },
            { label: 'RMS extensor derecho', data: windows.map(item => item.extensor.right.rms), borderColor: '#f59e0b', pointRadius: 1 },
            { label: 'Simetría flexor (%)', data: windows.map(item => item.flexor.bilateral.symmetryIndex), borderColor: '#10b981', pointRadius: 1, yAxisID: 'percentage' },
            { label: 'Simetría extensor (%)', data: windows.map(item => item.extensor.bilateral.symmetryIndex), borderColor: '#8b5cf6', pointRadius: 1, yAxisID: 'percentage' }
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
    formatDateTime(value) { const date = new Date(value); return Number.isNaN(date.getTime()) ? 'Fecha no registrada' : date.toLocaleString('es-AR'); }
    sessionTime(session) { const value = new Date(session?.startedAt || session?.date || 0).getTime(); return Number.isFinite(value) ? value : 0; }
    escape(value) { return String(value ?? '').replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]); }
}

window.AnalysisManager = AnalysisManager;
