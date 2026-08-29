/**
 * Patient Management System
 * Handles patient registration, session management, and data visualization
 */

class PatientManager {
    constructor(database) {
        this.database = database;
        this.currentPatient = null;
        this.currentSession = null;
        this.includeArchived = false;
        this.historyService = new SessionHistoryService();
        this.replaySource = null;
    }

    // Patient Registration and Management
    async showPatientRegistrationForm(patientId = null) {
        const patient = patientId ? await this.database.getPatient(patientId) : null;
        const participantCode = patient?.participantCode || await this.database.generateParticipantCode();
        const formHTML = `
            <div class="modal-overlay" id="patient-modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>${patient ? 'Editar participante' : 'Registrar participante'}</h3>
                        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <form id="patient-form" class="patient-form">
                        <div class="form-row">
                            <div class="form-group">
                                <label for="participant-code">Código de participante *</label>
                                <input type="text" id="participant-code" name="participantCode" required maxlength="30"
                                    pattern="[A-Za-z0-9_-]{2,30}" value="${this.escapeHTML(participantCode)}">
                            </div>
                            <div class="form-group">
                                <label for="patient-name">Nombre completo (opcional)</label>
                                <input type="text" id="patient-name" name="name" value="${this.escapeHTML(patient?.name || '')}">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="patient-email">Email</label>
                                <input type="email" id="patient-email" name="email" value="${this.escapeHTML(patient?.email || '')}">
                            </div>
                            <div class="form-group">
                                <label for="patient-dob">Fecha de Nacimiento</label>
                                <input type="date" id="patient-dob" name="dateOfBirth" value="${this.escapeHTML(patient?.dateOfBirth || '')}">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="patient-gender">Género</label>
                                <select id="patient-gender" name="gender">
                                    <option value="">Seleccionar...</option>
                                    <option value="male" ${patient?.gender === 'male' ? 'selected' : ''}>Masculino</option>
                                    <option value="female" ${patient?.gender === 'female' ? 'selected' : ''}>Femenino</option>
                                    <option value="other" ${patient?.gender === 'other' ? 'selected' : ''}>Otro</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="patient-height">Altura (cm)</label>
                                <input type="number" id="patient-height" name="height" min="50" max="250" value="${patient?.height || ''}">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="patient-weight">Peso (kg)</label>
                                <input type="number" id="patient-weight" name="weight" min="10" max="300" value="${patient?.weight || ''}">
                            </div>
                            <div class="form-group">
                                <label class="checkbox-label">
                                    <input type="checkbox" name="consentConfirmed" ${patient?.consentConfirmed ? 'checked' : ''}>
                                    Consentimiento informado registrado
                                </label>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label for="patient-history">Historia Médica</label>
                            <textarea id="patient-history" name="medicalHistory" rows="3"
                                placeholder="Lesiones previas, cirugías, condiciones médicas relevantes...">${this.escapeHTML((patient?.medicalHistory || []).join('\n'))}</textarea>
                        </div>
                        
                        <div class="form-group">
                            <label for="patient-notes">Notas Adicionales</label>
                            <textarea id="patient-notes" name="notes" rows="2"
                                placeholder="Objetivos de rehabilitación, observaciones especiales...">${this.escapeHTML(patient?.notes || '')}</textarea>
                        </div>
                        
                        <div class="form-actions">
                            <button type="button" class="btn-outline" onclick="this.closest('.modal-overlay').remove()">
                                Cancelar
                            </button>
                            <button type="submit" class="btn-control primary">
                                ${patient ? 'Guardar cambios' : 'Registrar participante'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', formHTML);

        // Handle form submission
        document.getElementById('patient-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handlePatientRegistration(e.target, patientId);
        });
    }

    async handlePatientRegistration(form, patientId = null) {
        const formData = new FormData(form);
        const patientData = {
            participantCode: formData.get('participantCode'),
            name: formData.get('name'),
            email: formData.get('email'),
            dateOfBirth: formData.get('dateOfBirth'),
            gender: formData.get('gender'),
            height: parseInt(formData.get('height')) || null,
            weight: parseInt(formData.get('weight')) || null,
            medicalHistory: formData.get('medicalHistory')?.split('\n').filter(line => line.trim()),
            notes: formData.get('notes'),
            consentConfirmed: formData.get('consentConfirmed') === 'on'
        };

        try {
            const patient = patientId
                ? await this.database.updatePatient(patientId, patientData)
                : await this.database.createPatient(patientData);
            this.showNotification(
                `Participante ${patient.participantCode} ${patientId ? 'actualizado' : 'registrado'} correctamente`,
                'success'
            );
            
            // Close modal
            document.getElementById('patient-modal').remove();
            
            // Refresh patient list if visible
            await this.refreshPatientList();
            
            if (this.currentPatient?.id === patient.id) {
                this.currentPatient = patient;
                this.updateCurrentPatientUI();
            }
            return patient;
        } catch (error) {
            console.error('Error registering patient:', error);
            this.showNotification('Error al registrar paciente: ' + error.message, 'error');
        }
    }

    async showPatientList() {
        try {
            const patients = await this.database.listPatients({ includeArchived: this.includeArchived });
            const statistics = await this.database.getStatistics();
            
            const listHTML = `
                <div class="patients-container">
                    <div class="patients-header">
                        <h2>Gestión de participantes</h2>
                        <div class="patients-actions">
                            <input type="text" id="patient-search" placeholder="Buscar por código, nombre o email..." class="search-input">
                            <button class="btn-outline" onclick="window.patientManager.toggleArchivedPatients()">
                                ${this.includeArchived ? 'Ocultar archivados' : 'Mostrar archivados'}
                            </button>
                            <button class="btn-control primary" onclick="window.patientManager.showPatientRegistrationForm()">
                                <i class="fas fa-user-plus"></i> Nuevo participante
                            </button>
                        </div>
                    </div>
                    
                    <div class="patients-stats">
                        <div class="stat-card">
                            <h4>Total de participantes</h4>
                            <span class="stat-number">${statistics.totalPatients}</span>
                        </div>
                        <div class="stat-card">
                            <h4>Participantes activos</h4>
                            <span class="stat-number">${statistics.activePatients}</span>
                        </div>
                        <div class="stat-card">
                            <h4>Archivados</h4>
                            <span class="stat-number">${statistics.archivedPatients}</span>
                        </div>
                    </div>
                    
                    <div class="patients-grid" id="patients-grid">
                        ${await this.generatePatientCards(patients)}
                    </div>
                </div>
            `;

            return listHTML;
        } catch (error) {
            console.error('Error loading patients:', error);
            return `<div class="error-state">Error al cargar pacientes: ${error.message}</div>`;
        }
    }

    async generatePatientCards(patients) {
        if (patients.length === 0) {
            return `
                <div class="empty-state">
                    <i class="fas fa-users"></i>
                    <h3>${this.includeArchived ? 'No hay participantes para mostrar' : 'No hay participantes activos'}</h3>
                    <p>Registra un participante para comenzar</p>
                    <button class="btn-control primary" onclick="window.patientManager.showPatientRegistrationForm()">
                        Registrar Primer Paciente
                    </button>
                </div>
            `;
        }

        const cards = await Promise.all(patients.map(async (patient) => {
            const sessions = await this.database.getPatientSessions(patient.id);
            const lastSession = sessions[0]; // Most recent session
            
            return `
                <div class="patient-card ${patient.status === 'archived' ? 'archived' : ''}" data-patient-id="${patient.id}">
                    <div class="patient-header">
                        <div class="patient-avatar">
                            ${this.escapeHTML((patient.name || patient.participantCode).charAt(0).toUpperCase())}
                        </div>
                        <div class="patient-info">
                            <h4>${this.escapeHTML(patient.participantCode)}</h4>
                            <p>${this.escapeHTML(patient.name || 'Sin nombre identificatorio')}</p>
                            <p class="patient-email">${this.escapeHTML(patient.email || 'Sin email')}</p>
                        </div>
                        <div class="patient-menu">
                            <button class="btn-small" onclick="window.patientManager.showPatientMenu(${patient.id})">
                                <i class="fas fa-ellipsis-v"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div class="patient-details">
                        <div class="detail-row">
                            <span class="detail-label">Edad:</span>
                            <span>${this.calculateAge(patient.dateOfBirth)} años</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Sesiones:</span>
                            <span>${sessions.length}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Última sesión:</span>
                            <span>${lastSession ? this.formatDate(lastSession.date) : 'Nunca'}</span>
                        </div>
                    </div>
                    
                    <div class="patient-actions">
                        <button class="btn-outline" onclick="window.patientManager.selectPatient(${patient.id})" ${patient.status === 'archived' ? 'disabled' : ''}>
                            <i class="fas fa-play"></i> Nueva Sesión
                        </button>
                        <button class="btn-outline" onclick="window.patientManager.viewPatientHistory(${patient.id})">
                            <i class="fas fa-history"></i> Historial
                        </button>
                    </div>
                </div>
            `;
        }));

        return cards.join('');
    }

    async selectPatient(patientId) {
        try {
            const patient = await this.database.getPatient(patientId);
            if (!patient || patient.status === 'archived') throw new Error('El participante está archivado');
            this.currentPatient = patient;
            
            // Update UI to show selected patient
            this.updateCurrentPatientUI();
            
            // Switch to dashboard
            if (window.app) {
                window.app.showSection('dashboard');
                window.app.updatePageTitle('dashboard');
                
                // Update navigation
                document.querySelectorAll('.nav-item').forEach(item => {
                    item.classList.remove('active');
                });
                document.querySelector('[data-section="dashboard"]').classList.add('active');
            }
            
            this.showNotification(`Participante ${this.currentPatient.participantCode} seleccionado`, 'success');
        } catch (error) {
            console.error('Error selecting patient:', error);
            this.showNotification(error.message || 'Error al seleccionar participante', 'error');
        }
    }

    updateCurrentPatientUI() {
        const patientElement = document.getElementById('current-patient');
        if (patientElement && this.currentPatient) {
            const label = this.currentPatient.name
                ? `${this.currentPatient.participantCode} · ${this.currentPatient.name}`
                : this.currentPatient.participantCode;
            patientElement.textContent = `${label} - Sesión EMG`;
        }
    }

    async viewPatientHistory(patientId) {
        try {
            const patient = await this.database.getPatient(patientId);
            if (!patient) throw new Error('Participante no encontrado');
            const sessions = await this.database.getPatientSessions(patientId, { includeArchived: true });
            this.historyPatientId = patientId;
            this.historySessions = sessions;
            
            const historyHTML = `
                <div class="modal-overlay" id="history-modal">
                    <div class="modal-content large-modal">
                        <div class="modal-header">
                            <h3>Historial de ${this.escapeHTML(patient.participantCode)}</h3>
                            <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        
                        <div class="patient-summary">
                            <div class="summary-grid">
                                <div class="summary-item">
                                    <label>Total de Sesiones:</label>
                                    <span>${sessions.length}</span>
                                </div>
                                <div class="summary-item">
                                    <label>Primera Sesión:</label>
                                    <span>${sessions.length ? this.formatDate(sessions[sessions.length - 1].date) : 'N/A'}</span>
                                </div>
                                <div class="summary-item">
                                    <label>Última Sesión:</label>
                                    <span>${sessions.length ? this.formatDate(sessions[0].date) : 'N/A'}</span>
                                </div>
                                <div class="summary-item">
                                    <label>Progreso:</label>
                                    <span>${this.calculateProgress(sessions)}%</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="sessions-history">
                            <h4>Historial de Sesiones</h4>
                            <div class="history-filters">
                                <input type="date" id="history-date-from" aria-label="Fecha desde">
                                <input type="date" id="history-date-to" aria-label="Fecha hasta">
                                <select id="history-muscle"><option value="">Todos los músculos</option>${this.generateFilterOptions(sessions, 'muscleType')}</select>
                                <select id="history-scenario"><option value="">Todos los escenarios</option>${this.generateScenarioOptions(sessions)}</select>
                                <select id="history-status"><option value="">Todos los estados</option><option value="completed">Guardadas</option><option value="archived">Archivadas</option></select>
                                <button class="btn-outline" onclick="window.patientManager.applyHistoryFilters()">Aplicar</button>
                                <button class="btn-small" onclick="window.patientManager.clearHistoryFilters()">Limpiar</button>
                            </div>
                            <div id="session-history-results">${this.generateSessionHistory(sessions)}</div>
                        </div>
                        
                        <div class="modal-actions">
                            <button class="btn-outline" onclick="window.patientManager.exportPatientData(${patientId})">
                                <i class="fas fa-download"></i> Exportar Datos
                            </button>
                            <button class="btn-control primary" onclick="window.patientManager.selectPatient(${patientId}); this.closest('.modal-overlay').remove();">
                                Nueva Sesión
                            </button>
                        </div>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', historyHTML);
        } catch (error) {
            console.error('Error loading patient history:', error);
            this.showNotification('Error al cargar historial del paciente', 'error');
        }
    }

    generateSessionHistory(sessions) {
        if (sessions.length === 0) {
            return '<div class="empty-sessions">No hay sesiones registradas para este paciente.</div>';
        }

        return `
            <div class="sessions-table">
                <table>
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Tipo de Músculo</th>
                            <th>Duración</th>
                            <th>Simetría</th>
                            <th>Escenario</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sessions.map(session => `
                            <tr>
                                <td>${this.formatDate(session.startedAt || session.date)}</td>
                                <td>${this.escapeHTML(this.capitalize(session.muscleType))}</td>
                                <td>${this.formatDuration(session.durationSeconds ?? session.duration)}</td>
                                <td>${Number.isFinite(session.statistics?.bilateral?.symmetryIndex) ? `${session.statistics.bilateral.symmetryIndex.toFixed(0)}%` : 'N/A'}</td>
                                <td>${this.escapeHTML(this.formatScenario(this.historyService.getScenario(session)))}</td>
                                <td>${session.status === 'archived' ? 'Archivada' : 'Guardada'}</td>
                                <td>
                                    <button class="btn-small" title="Ver detalle" onclick="window.patientManager.viewSessionDetails(${session.id})">
                                        <i class="fas fa-eye"></i><span class="sr-only">Ver detalle</span>
                                    </button>
                                    <button class="btn-small" title="Exportar" onclick="window.patientManager.downloadSession(${session.id})">
                                        <i class="fas fa-download"></i><span class="sr-only">Exportar</span>
                                    </button>
                                    ${session.status === 'archived'
                                        ? `<button class="btn-small" title="Restaurar" onclick="window.patientManager.restoreSession(${session.id})"><i class="fas fa-undo"></i><span class="sr-only">Restaurar</span></button>`
                                        : `<button class="btn-small" title="Archivar" onclick="window.patientManager.archiveSession(${session.id})"><i class="fas fa-archive"></i><span class="sr-only">Archivar</span></button>`}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    generateFilterOptions(sessions, property) {
        return [...new Set(sessions.map(session => session[property]).filter(Boolean))]
            .sort().map(value => `<option value="${this.escapeHTML(value)}">${this.escapeHTML(this.capitalize(value))}</option>`).join('');
    }

    generateScenarioOptions(sessions) {
        return [...new Set(sessions.map(session => this.historyService.getScenario(session)).filter(value => value !== 'unknown'))]
            .sort().map(value => `<option value="${this.escapeHTML(value)}">${this.escapeHTML(this.formatScenario(value))}</option>`).join('');
    }

    applyHistoryFilters() {
        const filters = {
            dateFrom: document.getElementById('history-date-from')?.value,
            dateTo: document.getElementById('history-date-to')?.value,
            muscleType: document.getElementById('history-muscle')?.value,
            scenario: document.getElementById('history-scenario')?.value,
            status: document.getElementById('history-status')?.value
        };
        const results = document.getElementById('session-history-results');
        if (results) results.innerHTML = this.generateSessionHistory(this.historyService.filter(this.historySessions, filters));
    }

    clearHistoryFilters() {
        ['history-date-from', 'history-date-to', 'history-muscle', 'history-scenario', 'history-status']
            .forEach(id => { const input = document.getElementById(id); if (input) input.value = ''; });
        this.applyHistoryFilters();
    }

    async refreshHistory() {
        if (!this.historyPatientId || !document.getElementById('history-modal')) return;
        this.historySessions = await this.database.getPatientSessions(this.historyPatientId, { includeArchived: true });
        this.applyHistoryFilters();
    }

    async viewSessionDetails(sessionId) {
        try {
            const session = await this.database.getSession(sessionId);
            if (!session) throw new Error('Sesión no encontrada');
            const samples = this.historyService.getSamples(session);
            const symmetry = session.statistics?.bilateral?.symmetryIndex;
            document.getElementById('session-detail-modal')?.remove();
            document.body.insertAdjacentHTML('beforeend', `
                <div class="modal-overlay" id="session-detail-modal">
                    <div class="modal-content large-modal">
                        <div class="modal-header"><h3>${this.escapeHTML(session.label || `Sesión ${session.id}`)}</h3><button class="modal-close" onclick="window.patientManager.closeSessionDetails()"><i class="fas fa-times"></i></button></div>
                        <div class="session-detail-grid">
                            <div><label>Fecha</label><strong>${this.formatDate(session.startedAt || session.date)}</strong></div>
                            <div><label>Duración</label><strong>${this.formatDuration(session.durationSeconds ?? session.duration)}</strong></div>
                            <div><label>Músculo</label><strong>${this.escapeHTML(this.capitalize(session.muscleType))}</strong></div>
                            <div><label>Escenario</label><strong>${this.escapeHTML(this.formatScenario(this.historyService.getScenario(session)))}</strong></div>
                            <div><label>Origen</label><strong>${this.escapeHTML(`${session.source?.type || 'simulation'} · ${session.source?.provider || 'local'}`)}</strong></div>
                            <div><label>Muestras</label><strong>${samples.length}</strong></div>
                            <div><label>Cadencia</label><strong>${Number(session.cadence || 0)} rpm</strong></div>
                            <div><label>Resistencia</label><strong>${this.formatResistance(session.resistance)}</strong></div>
                            <div><label>Simetría</label><strong>${Number.isFinite(symmetry) ? `${symmetry.toFixed(1)}%` : 'N/A'}</strong></div>
                            <div><label>Estado</label><strong>${session.status === 'archived' ? 'Archivada' : 'Guardada'}</strong></div>
                        </div>
                        <div class="session-notes"><label>Notas</label><p>${this.escapeHTML(session.notes || 'Sin notas')}</p></div>
                        ${this.generateReplayPanel(session, samples)}
                        <div class="modal-actions"><button class="btn-outline" onclick="window.patientManager.downloadSession(${session.id})">Exportar JSON</button></div>
                    </div>
                </div>`);
        } catch (error) {
            this.showNotification(`No se pudo abrir la sesión: ${error.message}`, 'error');
        }
    }

    generateReplayPanel(session, samples) {
        if (!samples.length) return '<div class="empty-sessions">Esta sesión no contiene muestras reproducibles.</div>';
        return `<div class="replay-panel" data-session-id="${session.id}">
            <div class="replay-values"><strong id="replay-status">Lista para reproducir</strong><span id="replay-time">0.00 s</span><span id="replay-left">Izq: —</span><span id="replay-right">Der: —</span></div>
            <div class="replay-chart-container"><canvas id="replay-chart" aria-label="Señal EMG bilateral grabada"></canvas></div>
            <div class="replay-track"><div id="replay-progress" class="replay-progress"></div></div>
            <div class="replay-controls">
                <button class="btn-control primary" id="replay-toggle" onclick="window.patientManager.toggleReplay(${session.id})">Reproducir</button>
                <button class="btn-outline" onclick="window.patientManager.resetReplay(${session.id})">Reiniciar</button>
                <label>Velocidad <select id="replay-speed" onchange="window.patientManager.setReplaySpeed(this.value)"><option value="0.5">0.5×</option><option value="1" selected>1×</option><option value="2">2×</option></select></label>
            </div>
        </div>`;
    }

    async toggleReplay(sessionId) {
        const session = await this.database.getSession(sessionId);
        const samples = this.historyService.getSamples(session);
        if (!samples.length) return;
        if (!this.replaySource || this.replaySessionId !== sessionId || ['stopped', 'completed'].includes(this.replaySource.getStatus())) {
            this.createReplaySource(sessionId, samples);
            this.replaySource.start({ speed: Number(document.getElementById('replay-speed')?.value || 1) });
        } else if (this.replaySource.getStatus() === 'running') this.replaySource.pause();
        else this.replaySource.resume();
    }

    createReplaySource(sessionId, samples) {
        this.replaySource?.stop();
        this.replaySessionId = sessionId;
        this.createReplayChart();
        this.replaySource = new ReplaySignalSource(samples);
        this.replaySource.onDataUpdate(sample => {
            const time = Number(sample.time ?? sample.timestamp ?? 0);
            const left = Number(sample.left?.amplitude ?? sample.left?.emg ?? sample.left ?? 0);
            const right = Number(sample.right?.amplitude ?? sample.right?.emg ?? sample.right ?? 0);
            if (document.getElementById('replay-time')) document.getElementById('replay-time').textContent = `${time.toFixed(2)} s`;
            if (document.getElementById('replay-left')) document.getElementById('replay-left').textContent = `Izq: ${left.toFixed(3)} mV`;
            if (document.getElementById('replay-right')) document.getElementById('replay-right').textContent = `Der: ${right.toFixed(3)} mV`;
            this.appendReplayChartSample(time, left, right);
        });
        this.replaySource.onProgress(progress => { if (document.getElementById('replay-progress')) document.getElementById('replay-progress').style.width = `${progress.percent}%`; });
        this.replaySource.onStatusChange(status => this.updateReplayUI(status));
    }

    createReplayChart() {
        this.replayChart?.destroy();
        this.replayChart = null;
        this.lastReplayChartRenderTime = Number.NEGATIVE_INFINITY;
        const canvas = document.getElementById('replay-chart');
        if (!canvas || typeof Chart === 'undefined') {
            this.showNotification('No se pudo inicializar el gráfico de reproducción', 'warning');
            return;
        }
        this.replayChart = new Chart(canvas.getContext('2d'), {
            type: 'line',
            data: {
                datasets: [
                    { label: 'Izquierda', data: [], borderColor: '#3b82f6', backgroundColor: 'transparent', borderWidth: 2, pointRadius: 0 },
                    { label: 'Derecha', data: [], borderColor: '#ef4444', backgroundColor: 'transparent', borderWidth: 2, pointRadius: 0 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                parsing: false,
                normalized: true,
                interaction: { intersect: false, mode: 'index' },
                scales: {
                    x: { type: 'linear', title: { display: true, text: 'Tiempo (s)' } },
                    y: { title: { display: true, text: 'Amplitud (mV)' } }
                }
            }
        });
    }

    appendReplayChartSample(time, left, right) {
        if (!this.replayChart || !Number.isFinite(time) || !Number.isFinite(left) || !Number.isFinite(right)) return;
        const datasets = this.replayChart.data.datasets;
        datasets[0].data.push({ x: time, y: left });
        datasets[1].data.push({ x: time, y: right });
        const windowStart = Math.max(0, time - 5);
        while (datasets[0].data[0]?.x < windowStart) datasets[0].data.shift();
        while (datasets[1].data[0]?.x < windowStart) datasets[1].data.shift();
        this.replayChart.options.scales.x.min = windowStart;
        this.replayChart.options.scales.x.max = Math.max(5, time);
        if (time - this.lastReplayChartRenderTime >= 0.05) {
            this.lastReplayChartRenderTime = time;
            this.replayChart.update('none');
        }
    }

    updateReplayUI(status) {
        const labels = { running: 'Reproduciendo', paused: 'Pausada', stopped: 'Detenida', completed: 'Finalizada' };
        const statusElement = document.getElementById('replay-status');
        const toggle = document.getElementById('replay-toggle');
        if (statusElement) statusElement.textContent = labels[status] || status;
        if (toggle) toggle.textContent = status === 'running' ? 'Pausar' : status === 'paused' ? 'Continuar' : 'Reproducir';
    }

    setReplaySpeed(speed) {
        try { this.replaySource?.setSpeed(Number(speed)); }
        catch (error) { this.showNotification(error.message, 'error'); }
    }

    async resetReplay(sessionId) {
        this.replaySource?.reset();
        this.replaySource = null;
        this.replaySessionId = null;
        this.replayChart?.destroy();
        this.replayChart = null;
        ['replay-time', 'replay-left', 'replay-right'].forEach((id, index) => {
            const element = document.getElementById(id);
            if (element) element.textContent = index === 0 ? '0.00 s' : index === 1 ? 'Izq: —' : 'Der: —';
        });
        if (document.getElementById('replay-progress')) document.getElementById('replay-progress').style.width = '0%';
        this.updateReplayUI('stopped');
    }

    closeSessionDetails() {
        this.replaySource?.stop();
        this.replaySource = null;
        this.replayChart?.destroy();
        this.replayChart = null;
        document.getElementById('session-detail-modal')?.remove();
    }

    async downloadSession(sessionId) {
        try {
            const session = await this.database.getSession(sessionId);
            if (!session) throw new Error('Sesión no encontrada');
            this.downloadJSON({ application: 'DEMASY', schemaVersion: 1, exportedAt: new Date().toISOString(), session }, `demasy-session-${session.id}.json`);
            this.showNotification('Sesión exportada correctamente', 'success');
        } catch (error) { this.showNotification(`No se pudo exportar: ${error.message}`, 'error'); }
    }

    async archiveSession(sessionId) {
        if (!window.confirm('¿Archivar esta sesión? Los datos se conservarán.')) return;
        try {
            await this.database.archiveSession(sessionId);
            await this.refreshHistory();
            this.showNotification('Sesión archivada', 'success');
        } catch (error) { this.showNotification(`No se pudo archivar: ${error.message}`, 'error'); }
    }

    async restoreSession(sessionId) {
        try {
            await this.database.restoreSession(sessionId);
            await this.refreshHistory();
            this.showNotification('Sesión restaurada', 'success');
        } catch (error) { this.showNotification(`No se pudo restaurar: ${error.message}`, 'error'); }
    }

    // Session Management
    async saveCurrentSession(sessionData) {
        if (!this.currentPatient) {
            this.showNotification('Selecciona un paciente antes de guardar la sesión', 'warning');
            return null;
        }

        try {
            const session = await this.database.createSession({
                patientId: this.currentPatient.id,
                ...sessionData
            });

            // Create automatic analysis
            await this.createAutomaticAnalysis(session);

            this.showNotification('Sesión guardada exitosamente', 'success');
            return session;
        } catch (error) {
            console.error('Error saving session:', error);
            this.showNotification('Error al guardar la sesión: ' + error.message, 'error');
            return null;
        }
    }

    async createAutomaticAnalysis(session) {
        const stats = session.statistics;
        if (!stats) return;

        // Symmetry Analysis
        const symmetryAnalysis = {
            sessionId: session.id,
            analysisType: 'symmetry',
            results: {
                symmetryIndex: stats.bilateral.symmetryIndex,
                asymmetryLevel: stats.bilateral.asymmetryLevel,
                difference: stats.bilateral.difference,
                interpretation: this.interpretSymmetry(stats.bilateral.symmetryIndex)
            },
            recommendations: this.generateSymmetryRecommendations(stats.bilateral)
        };

        await this.database.createAnalysis(symmetryAnalysis);

        // Efficiency Analysis (for cycling)
        if (session.sessionType === 'cycling') {
            const efficiencyAnalysis = {
                sessionId: session.id,
                analysisType: 'efficiency',
                results: {
                    pedalingEfficiency: session.statistics.pedalingEfficiency || 85,
                    cadence: session.cadence,
                    resistance: session.resistance,
                    powerBalance: 100 - stats.bilateral.difference
                },
                recommendations: this.generateEfficiencyRecommendations(session)
            };

            await this.database.createAnalysis(efficiencyAnalysis);
        }
    }

    // Utility Methods
    calculateAge(dateOfBirth) {
        if (!dateOfBirth) return 'N/A';
        const today = new Date();
        const birthDate = new Date(dateOfBirth);
        const age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            return age - 1;
        }
        return age;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    formatDuration(duration) {
        if (!duration) return 'N/A';
        const minutes = Math.floor(duration / 60);
        const seconds = duration % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    formatScenario(value) {
        const labels = {
            symmetric: 'Pedaleo simétrico',
            'left-weakness': 'Menor activación izquierda',
            'right-weakness': 'Menor activación derecha',
            'left-fatigue': 'Patrón simulado de fatiga izquierda',
            'right-fatigue': 'Patrón simulado de fatiga derecha',
            'phase-delay': 'Retraso de fase',
            intervals: 'Intervalos', custom: 'Personalizado', unknown: 'No registrado'
        };
        return labels[value] || this.capitalize(value);
    }

    formatResistance(value) {
        const numeric = Number(value);
        if (!Number.isFinite(numeric)) return 'N/A';
        return `${numeric <= 1 ? Math.round(numeric * 100) : Math.round(numeric)}%`;
    }

    capitalize(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    calculateProgress(sessions) {
        if (sessions.length < 2) return 0;
        
        const recent = sessions.slice(0, 3);
        const older = sessions.slice(-3);
        
        const recentAvg = recent.reduce((sum, s) => sum + (s.statistics?.bilateral?.symmetryIndex || 0), 0) / recent.length;
        const olderAvg = older.reduce((sum, s) => sum + (s.statistics?.bilateral?.symmetryIndex || 0), 0) / older.length;
        
        return Math.max(0, Math.min(100, ((recentAvg - olderAvg) / olderAvg) * 100));
    }

    interpretSymmetry(symmetryIndex) {
        if (symmetryIndex >= 95) return 'Excelente simetría bilateral';
        if (symmetryIndex >= 90) return 'Buena simetría bilateral';
        if (symmetryIndex >= 80) return 'Simetría aceptable, ligero desequilibrio';
        if (symmetryIndex >= 70) return 'Desequilibrio moderado, requiere atención';
        return 'Desequilibrio significativo, evaluación clínica recomendada';
    }

    generateSymmetryRecommendations(bilateralStats) {
        const recommendations = [];
        
        if (bilateralStats.symmetryIndex < 90) {
            recommendations.push('Realizar ejercicios de fortalecimiento unilateral en el lado más débil');
            recommendations.push('Monitoreo semanal de progreso bilateral');
        }
        
        if (bilateralStats.difference > 15) {
            recommendations.push('Evaluación por especialista recomendada');
            recommendations.push('Considerar fisioterapia específica para corrección de asimetrías');
        }
        
        return recommendations;
    }

    generateEfficiencyRecommendations(session) {
        const recommendations = [];
        const efficiency = session.statistics?.pedalingEfficiency || 85;
        
        if (efficiency < 80) {
            recommendations.push('Mejorar técnica de pedaleo con cadencia controlada');
            recommendations.push('Ejercicios de coordinación bilateral');
        }
        
        if (session.cadence < 70) {
            recommendations.push('Incrementar gradualmente la cadencia de pedaleo');
        }
        
        return recommendations;
    }

    async refreshPatientList() {
        const patientsSection = document.getElementById('patients');
        if (patientsSection && patientsSection.classList.contains('active')) {
            patientsSection.innerHTML = await this.showPatientList();
            this.setupPatientSearch();
        }
    }

    async toggleArchivedPatients() {
        this.includeArchived = !this.includeArchived;
        await this.refreshPatientList();
    }

    async showPatientMenu(patientId) {
        const patient = await this.database.getPatient(patientId);
        if (!patient) return this.showNotification('Participante no encontrado', 'error');
        const action = patient.status === 'archived'
            ? `<button class="btn-control primary" onclick="window.patientManager.restorePatient(${patient.id})">Restaurar participante</button>`
            : `<button class="btn-outline" onclick="window.patientManager.archivePatient(${patient.id})">Archivar participante</button>`;
        document.body.insertAdjacentHTML('beforeend', `
            <div class="modal-overlay" id="patient-menu-modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>${this.escapeHTML(patient.participantCode)}</h3>
                        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()"><i class="fas fa-times"></i></button>
                    </div>
                    <div class="modal-actions">
                        <button class="btn-outline" onclick="window.patientManager.showPatientRegistrationForm(${patient.id}); this.closest('.modal-overlay').remove();">Editar datos</button>
                        ${action}
                    </div>
                </div>
            </div>`);
    }

    async archivePatient(patientId) {
        if (!window.confirm('¿Archivar este participante? Sus sesiones se conservarán.')) return;
        try {
            const patient = await this.database.archivePatient(patientId);
            if (this.currentPatient?.id === patient.id) {
                this.currentPatient = null;
                document.getElementById('current-patient')?.replaceChildren(document.createTextNode('Sin participante seleccionado'));
            }
            document.getElementById('patient-menu-modal')?.remove();
            await this.refreshPatientList();
            this.showNotification(`Participante ${patient.participantCode} archivado`, 'success');
        } catch (error) {
            this.showNotification(`No se pudo archivar: ${error.message}`, 'error');
        }
    }

    async restorePatient(patientId) {
        try {
            const patient = await this.database.restorePatient(patientId);
            document.getElementById('patient-menu-modal')?.remove();
            await this.refreshPatientList();
            this.showNotification(`Participante ${patient.participantCode} restaurado`, 'success');
        } catch (error) {
            this.showNotification(`No se pudo restaurar: ${error.message}`, 'error');
        }
    }

    setupPatientSearch() {
        const searchInput = document.getElementById('patient-search');
        if (searchInput) {
            searchInput.addEventListener('input', async (e) => {
                const searchTerm = e.target.value;
                if (searchTerm.length > 2 || searchTerm.length === 0) {
                    const patients = searchTerm.length > 0
                        ? await this.database.searchPatients(searchTerm, { includeArchived: this.includeArchived })
                        : await this.database.listPatients({ includeArchived: this.includeArchived });
                    
                    const grid = document.getElementById('patients-grid');
                    if (grid) {
                        grid.innerHTML = await this.generatePatientCards(patients);
                    }
                }
            });
        }
    }

    async exportPatientData(patientId) {
        try {
            const data = await this.database.exportPatientData(patientId);
            const patient = await this.database.getPatient(patientId);
            
            this.downloadJSON(data, `${patient.participantCode}_data_${new Date().toISOString().slice(0, 10)}.json`);
            
            this.showNotification('Datos del paciente exportados exitosamente', 'success');
        } catch (error) {
            console.error('Error exporting patient data:', error);
            this.showNotification('Error al exportar datos del paciente', 'error');
        }
    }

    downloadJSON(data, filename) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = filename;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
    }

    showNotification(message, type = 'info') {
        // Use the existing notification system from the main app
        if (window.app && window.app.showNotification) {
            window.app.showNotification(message, type);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }

    escapeHTML(value) {
        return String(value ?? '').replace(/[&<>'"]/g, character => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
        })[character]);
    }

    // Initialize patient manager
    async initialize() {
        console.log('Initializing Patient Manager...');
        window.patientManager = this;
        console.log('Patient Manager initialized');
    }
}

// Export for use in main application
window.PatientManager = PatientManager;
