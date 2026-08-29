/** Backup, preview and restore UI for local DEMASY data. */
class BackupManager {
    constructor(database) { this.database = database; this.service = new BackupService(); this.pendingPayload = null; }

    render() {
        const container = document.getElementById('settings-content');
        if (!container) return;
        container.innerHTML = `<div class="settings-dashboard"><h2>Configuración y datos locales</h2><div class="settings-grid">
            <div class="card"><h3>Respaldo completo</h3><p>Exporta participantes, sesiones, análisis y configuración en un JSON versionado.</p><button class="btn-control primary" id="backup-export">Exportar respaldo</button></div>
            <div class="card"><h3>Importar o restaurar</h3><p>Máximo 50 MB. El contenido se valida antes de modificar IndexedDB.</p><input type="file" id="backup-file" accept="application/json,.json"><div id="backup-file-error" class="form-error"></div></div>
            <div class="card"><h3>Datos de demostración</h3><p>Crea o actualiza únicamente los participantes DEMO-* y sus sesiones sintéticas.</p><button class="btn-outline" id="demo-data-action">Crear o actualizar demos</button></div>
        </div></div>`;
        document.getElementById('backup-export').addEventListener('click', () => this.exportBackup());
        document.getElementById('backup-file').addEventListener('change', event => this.readFile(event.target.files[0]));
        document.getElementById('demo-data-action').addEventListener('click', async () => {
            await window.dbUtils.initializeSampleData({ force: true });
            window.app?.showNotification('Datos demo creados o actualizados', 'success');
        });
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
        document.body.insertAdjacentHTML('beforeend', `<div class="modal-overlay" id="backup-preview-modal"><div class="modal-content">
            <div class="modal-header"><h3>Previsualizar respaldo</h3><button class="modal-close" onclick="this.closest('.modal-overlay').remove()"><i class="fas fa-times"></i></button></div>
            <p>${this.escape(filename)}</p><div class="summary-grid">
                <div class="summary-item"><label>Participantes</label><strong>${preview.patients}</strong></div><div class="summary-item"><label>Sesiones</label><strong>${preview.sessions}</strong></div>
                <div class="summary-item"><label>Análisis</label><strong>${preview.analyses}</strong></div><div class="summary-item"><label>Preferencias</label><strong>${preview.settings}</strong></div>
            </div><div class="analysis-notice">Combinar conserva los registros actuales y omite duplicados. Reemplazar elimina primero todos los datos locales.</div>
            <div class="modal-actions"><button class="btn-outline" id="backup-merge">Combinar</button><button class="btn-outline danger" id="backup-replace">Reemplazar todo</button></div>
        </div></div>`);
        document.getElementById('backup-merge').addEventListener('click', () => this.importPending('merge'));
        document.getElementById('backup-replace').addEventListener('click', () => this.confirmReplace());
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
            window.app?.showNotification(`Importación ${strategy} completada`, 'success');
            console.log('DEMASY import report', report);
        } catch (error) { window.app?.showNotification(`Importación fallida: ${error.message}`, 'error'); }
    }

    download(content, filename) { const url = URL.createObjectURL(new Blob([content], { type: 'application/json' })); const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename; anchor.click(); URL.revokeObjectURL(url); }
    escape(value) { return String(value ?? '').replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]); }
}
window.BackupManager = BackupManager;
