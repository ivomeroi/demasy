/** Backup, preview and restore UI for local DEMASY data. */
class BackupManager {
    constructor(database, settingsService, onPreferencesChanged) { this.database = database; this.settingsService = settingsService; this.onPreferencesChanged = onPreferencesChanged; this.service = new BackupService(); this.pendingPayload = null; }

    async render() {
        const container = document.getElementById('settings-content');
        if (!container) return;
        const preferences = await this.settingsService.getAll();
        container.innerHTML = `<div class="settings-dashboard"><h2>Configuración y datos locales</h2><div class="settings-grid">
            <div class="card settings-preferences"><h3>Visualización de la señal</h3><p>Estas preferencias se guardan únicamente en este navegador.</p>
                <div class="form-group"><label for="setting-window">Ventana temporal</label><select id="setting-window"><option value="1">1 segundo</option><option value="5">5 segundos</option><option value="10">10 segundos</option><option value="30">30 segundos</option></select></div>
                <fieldset class="settings-fieldset"><legend>Escala vertical</legend><label><input type="radio" name="setting-scale" value="fixed"> Fija y comparable</label><label><input type="radio" name="setting-scale" value="auto"> Automática</label></fieldset>
                <fieldset class="settings-fieldset"><legend>Series visibles</legend><label><input type="checkbox" id="setting-left"> Señal izquierda</label><label><input type="checkbox" id="setting-right"> Señal derecha</label><label><input type="checkbox" id="setting-rms"> Curvas RMS</label></fieldset>
                <button class="btn-control primary" id="settings-save">Guardar preferencias</button>
            </div>
            <div class="card"><h3>Respaldo completo</h3><p>Exporta participantes, sesiones, análisis y configuración en un JSON versionado.</p><button class="btn-control primary" id="backup-export">Exportar respaldo</button></div>
            <div class="card"><h3>Importar o restaurar</h3><p>Máximo 50 MB. El contenido se valida antes de modificar IndexedDB.</p><label class="file-input-label" for="backup-file">Seleccionar respaldo JSON</label><input type="file" id="backup-file" accept="application/json,.json"><div id="backup-file-error" class="form-error" role="alert"></div></div>
            <div class="card"><h3>Datos de demostración</h3><p>Crea o actualiza únicamente los participantes DEMO-* y sus sesiones sintéticas.</p><button class="btn-outline" id="demo-data-action">Crear o actualizar demos</button></div>
            <div class="card"><h3>Guía de usuario</h3><p>Vuelve a recorrer las funciones principales de DEMASY paso a paso.</p><button class="btn-outline" id="onboarding-restart">Iniciar tutorial</button></div>
            <div class="card prototype-notice"><h3>Alcance de esta versión</h3><p>DEMASY v1 es un prototipo académico. Los datos se guardan localmente en este navegador y no están cifrados.</p><p>Utiliza códigos de participante, evita datos sensibles y conserva respaldos periódicos.</p></div>
        </div></div>`;
        document.getElementById('setting-window').value = String(preferences.chartWindowSeconds);
        document.querySelector(`input[name="setting-scale"][value="${preferences.chartScaleMode}"]`).checked = true;
        document.getElementById('setting-left').checked = preferences.showLeftSignal;
        document.getElementById('setting-right').checked = preferences.showRightSignal;
        document.getElementById('setting-rms').checked = preferences.showRms;
        document.getElementById('settings-save').addEventListener('click', () => this.savePreferences());
        document.getElementById('backup-export').addEventListener('click', () => this.exportBackup());
        document.getElementById('backup-file').addEventListener('change', event => this.readFile(event.target.files[0]));
        document.getElementById('demo-data-action').addEventListener('click', async () => {
            await window.dbUtils.initializeSampleData({ force: true });
            window.app?.showNotification('Datos demo creados o actualizados', 'success');
        });
        document.getElementById('onboarding-restart').addEventListener('click', () => window.app?.startUserGuide());
    }

    async savePreferences() {
        const preferences = {
            chartWindowSeconds: Number(document.getElementById('setting-window').value),
            chartScaleMode: document.querySelector('input[name="setting-scale"]:checked').value,
            showLeftSignal: document.getElementById('setting-left').checked,
            showRightSignal: document.getElementById('setting-right').checked,
            showRms: document.getElementById('setting-rms').checked
        };
        await Promise.all(Object.entries(preferences).map(([key, value]) => this.settingsService.set(key, value)));
        this.onPreferencesChanged?.(preferences);
        window.app?.showNotification('Preferencias guardadas', 'success');
    }

    async exportBackup() {
        const data = await this.database.exportAllData();
        this.download(JSON.stringify(data, null, 2), `demasy-backup-${new Date().toISOString().slice(0, 10)}.json`);
    }

    async readFile(file) {
        if (!file) return;
        const errorElement = document.getElementById('backup-file-error');
        try {
            if (file.size > this.service.maximumBytes) throw new Error('El archivo supera el límite de 50 MB');
            const payload = JSON.parse(await file.text());
            const validation = this.service.validate(payload, { size: file.size });
            if (!validation.valid) throw new Error(validation.errors.join('. '));
            this.pendingPayload = payload;
            this.showPreview(validation.preview, file.name);
            if (errorElement) errorElement.textContent = '';
        } catch (error) {
            if (errorElement) errorElement.textContent = error.message;
        }
    }

    showPreview(preview, filename) {
        document.getElementById('backup-preview-modal')?.remove();
        document.body.insertAdjacentHTML('beforeend', `<div class="modal-overlay" id="backup-preview-modal" role="dialog" aria-modal="true" aria-labelledby="backup-preview-title"><div class="modal-content">
            <div class="modal-header"><h3 id="backup-preview-title">Previsualizar respaldo</h3><button class="modal-close" id="backup-preview-close" aria-label="Cerrar previsualización"><i class="fas fa-times" aria-hidden="true"></i></button></div>
            <p>${this.escape(filename)}</p><div class="summary-grid">
                <div class="summary-item"><label>Participantes</label><strong>${preview.patients}</strong></div><div class="summary-item"><label>Sesiones</label><strong>${preview.sessions}</strong></div>
                <div class="summary-item"><label>Análisis</label><strong>${preview.analyses}</strong></div><div class="summary-item"><label>Preferencias</label><strong>${preview.settings}</strong></div>
            </div><div class="analysis-notice">Combinar conserva los registros actuales y omite duplicados. Reemplazar elimina primero todos los datos locales.</div>
            <div class="modal-actions"><button class="btn-outline" id="backup-merge">Combinar</button><button class="btn-outline danger" id="backup-replace">Reemplazar todo</button></div>
        </div></div>`);
        document.getElementById('backup-merge').addEventListener('click', () => this.importPending('merge'));
        document.getElementById('backup-replace').addEventListener('click', () => this.confirmReplace());
        document.getElementById('backup-preview-close').addEventListener('click', () => document.getElementById('backup-preview-modal')?.remove());
    }

    async confirmReplace() {
        const answer = window.prompt('Esta acción reemplazará todos los datos locales. Escribe REEMPLAZAR para continuar.');
        if (answer !== 'REEMPLAZAR') return window.app?.showNotification('Reemplazo cancelado', 'info');
        await this.importPending('replace');
    }

    async importPending(strategy) {
        try {
            const report = await this.database.importAllData(this.pendingPayload, strategy);
            document.getElementById('backup-preview-modal')?.remove();
            const total = values => Object.values(values || {}).reduce((sum, value) => sum + Number(value || 0), 0);
            window.app?.showNotification(`Importación ${strategy} completada: ${total(report.created)} creados y ${total(report.skipped)} omitidos`, 'success');
        } catch (error) { window.app?.showNotification(`Importación fallida: ${error.message}`, 'error'); }
    }

    download(content, filename) { const url = URL.createObjectURL(new Blob([content], { type: 'application/json' })); const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename; anchor.click(); URL.revokeObjectURL(url); }
    escape(value) { return String(value ?? '').replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]); }
}
window.BackupManager = BackupManager;
