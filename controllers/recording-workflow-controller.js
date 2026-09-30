(function registerRecordingWorkflowControllerMethods() {
    const AppController = window.KinesioEMGApp;
    if (!AppController) throw new Error('KinesioEMGApp debe cargarse antes que RecordingWorkflowControllerMethods');

    class RecordingWorkflowControllerMethods {
    startRecording() {
        appDebug('Starting EMG recording...');
        
        try {
            if (!this.recordingController.can('start')) {
                this.showNotification('Configura una sesión válida antes de iniciar', 'warning');
                return;
            }

            this.recordingController.start();
            this.isRecording = true;
            this.sessionData = [];
            this.sessionStartTime = new Date();
            this.lastChartUpdateAt = 0;
            this.lastStatsUpdateAt = 0;
            this.lastSessionCaptureAt = 0;
            this.lastReadoutUpdateAt = 0;
            this.pendingChartData = [];
            this.recordingMarkers = [];
            this.resetSignalReadout();
            this.signalSource = this.getConnectedSignalSource();
            const configuration = this.recordingController.configuration;
            this.applySessionConfiguration(configuration);
            
            appDebug('Updating UI controls...');
            this.updateRecordingControls(true);
            this.updateSerialControls(this.serialManager.isConnected);
            this.updateBluetoothControls(this.bluetoothManager.isConnected);
            this.updateConnectionStatus(this.signalSource === 'serial' ? 'recording-serial' : this.signalSource === 'bluetooth' ? 'recording-bluetooth' : 'recording');

            if (this.signalSource === 'serial') {
                this.emgSimulator.stop();
                this.serialManager.reset();
                this.updateChartMode();
                this.serialManager.start();
                this.showNotification('Lectura EMG iniciada desde ESP32 USB', 'success');
                return;
            }

            if (this.signalSource === 'bluetooth') {
                this.emgSimulator.stop();
                this.bluetoothManager.reset();
                this.updateChartMode();
                this.bluetoothManager.start();
                this.showNotification('Lectura EMG iniciada por Bluetooth', 'success');
                return;
            }
            
            // Set initial activation for cycling
            appDebug('Setting initial activation...');
            if (this.emgSimulator && typeof this.emgSimulator.setActivationLevel === 'function') {
                this.emgSimulator.setActivationLevel(0.4, 'both');
            }
            
            appDebug('Starting EMG Simulator...');
            if (this.emgSimulator && typeof this.emgSimulator.start === 'function') {
                this.emgSimulator.resetSignal();
                this.emgSimulator.start();
                appDebug('EMG Simulator started successfully');
                
                // Show notification based on whether a patient is selected
                if (this.patientManager?.currentPatient) {
                    this.showNotification(`Sesión iniciada para ${this.patientManager.currentPatient.name}`, 'success');
                } else {
                    this.showNotification('Simulación EMG iniciada - Selecciona un paciente para guardar la sesión', 'info');
                }
                
            } else {
                throw new Error('EMG Simulator not properly initialized');
            }
            
        } catch (error) {
            console.error('Error starting recording:', error);
            this.showNotification('Error al iniciar la grabación: ' + error.message, 'error');
            this.isRecording = false;
            if (this.recordingController.state === 'recording') {
                this.recordingController.finish();
            }
            this.updateRecordingControls(false);
            this.updateSerialControls(this.serialManager.isConnected);
        }
    }

    startCyclingSimulations() {
        appDebug('Starting cycling simulation sequences...');
        
        // Simple warm-up
        setTimeout(() => {
            appDebug('Phase 1: Warm-up');
            try {
                if (this.emgSimulator.simulateWarmUp) {
                    this.emgSimulator.simulateWarmUp();
                }
            } catch (e) {
                appDebug('Warm-up simulation not available, using basic activation');
                this.emgSimulator.setActivationLevel(0.6, 'both');
            }
        }, 2000);
        
        // Steady state
        setTimeout(() => {
            appDebug('Phase 2: Steady State');
            try {
                if (this.emgSimulator.simulateSteadyStateCycling) {
                    this.emgSimulator.simulateSteadyStateCycling(15);
                } else {
                    this.emgSimulator.setActivationLevel(0.7, 'both');
                }
            } catch (e) {
                appDebug('Steady state simulation not available');
            }
        }, 8000);
        
        // Asymmetric pattern
        setTimeout(() => {
            appDebug('Phase 3: Asymmetric Pattern');
            try {
                if (this.emgSimulator.simulateAsymmetricPedaling) {
                    this.emgSimulator.simulateAsymmetricPedaling();
                } else {
                    this.emgSimulator.setAsymmetryFactor(0.7);
                    this.emgSimulator.setActivationLevel(0.6, 'both');
                }
            } catch (e) {
                appDebug('Asymmetric simulation not available');
            }
        }, 20000);
    }

    stopRecording() {
        this.isRecording = false;
        if (this.signalSource === 'serial') {
            this.serialManager.stop();
        } else if (this.signalSource === 'bluetooth') {
            this.bluetoothManager.stop();
        } else {
            this.emgSimulator.stop();
        }
        
        this.updateRecordingControls(false);
        this.updateSerialControls(this.serialManager.isConnected);
        this.updateBluetoothControls(this.bluetoothManager.isConnected);
        this.updateConnectionStatus(this.serialManager.isConnected ? 'serial' : this.bluetoothManager.isConnected ? 'bluetooth' : 'mock');
        this.updateChartMode();
        
        appDebug('EMG recording stopped');
    }

    toggleRecordingPause() {
        try {
            const lastPoint = this.emgChart?.data.datasets[0]?.data.at(-1);
            const markerTime = Number(lastPoint?.x);
            if (this.recordingController.state === 'recording') {
                this.recordingController.pause();
                if (Number.isFinite(markerTime)) this.recordingMarkers.push({ type: 'pause', time: markerTime });
                this.showNotification('Grabación pausada; la previsualización continúa', 'info');
            } else if (this.recordingController.state === 'paused') {
                this.recordingController.resume();
                if (Number.isFinite(markerTime)) this.recordingMarkers.push({ type: 'resume', time: markerTime });
                this.showNotification('Grabación reanudada', 'success');
            }
            this.emgChart?.update('none');
            this.persistRecordingDraft(true);
        } catch (error) {
            this.showNotification(error.message, 'error');
        }
    }

    finishRecording() {
        try {
            if (!this.recordingController.can('finish')) return;
            this.recordingController.finish();
            this.isRecording = false;

            if (this.signalSource === 'serial') this.serialManager.stop();
            if (this.signalSource === 'bluetooth') this.bluetoothManager.stop();

            this.sessionReview = this.createSessionReview();
            this.persistRecordingDraft(true);
            this.updateConnectionStatus(this.getConnectedSignalSource() === 'simulator' ? 'mock' : this.getConnectedSignalSource());
            this.showSessionReview();
            this.showNotification('Grabación finalizada. Revisa los resultados antes de guardar.', 'success');
        } catch (error) {
            this.showNotification(`No se pudo finalizar: ${error.message}`, 'error');
        }
    }

    discardSession() {
        if (!this.recordingController.can('discard')) return;
        if (!window.confirm('¿Descartar los datos de esta sesión? Esta acción no se puede deshacer.')) return;

        document.getElementById('session-review-modal')?.remove();
        this.recordingController.discard();
        this.sessionData = [];
        this.sessionReview = null;
        this.sessionStartTime = null;
        this.recordingMarkers = [];
        this.clearRecordingDraft();
        this.resetSignalReadout();
        this.showNotification('Sesión descartada', 'info');
    }

    startRecordingTimer() {
        if (this.recordingTimerInterval) clearInterval(this.recordingTimerInterval);
        this.recordingTimerInterval = setInterval(() => {
            this.updateSessionTimer();
            const configuration = this.recordingController.configuration;
            if (
                this.recordingController.state === 'recording' &&
                configuration &&
                this.recordingController.getElapsedSeconds() >= configuration.plannedDurationSeconds
            ) {
                this.finishRecording();
            }
        }, 100);
    }

    updateSessionTimer() {
        const timer = document.getElementById('session-timer');
        if (!timer) return;
        const totalSeconds = this.recordingController.getElapsedSeconds();
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = Math.floor(totalSeconds % 60);
        const tenths = Math.floor((totalSeconds % 1) * 10);
        timer.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${tenths}`;
    }

    updateRecordingWorkflowUI() {
        const state = this.recordingController.state;
        const configuration = this.recordingController.configuration;
        const stateLabels = {
            idle: 'Sin configurar',
            ready: 'Lista',
            recording: 'Grabando',
            paused: 'Pausada',
            review: 'En revisión',
            saved: 'Guardada'
        };
        const stateElement = document.getElementById('session-state');
        if (stateElement) {
            stateElement.textContent = stateLabels[state] || state;
            stateElement.className = `session-state ${state}`;
        }

        this.updateElement('session-label', configuration?.label || 'Configura una sesión simulada');
        this.updateElement(
            'session-configuration-summary',
            configuration
                ? `${this.formatMuscle(configuration.muscleType)} · ${configuration.cadenceRpm} RPM · ${configuration.resistancePercent}% · ${configuration.plannedDurationSeconds}s`
                : 'Selecciona primero un participante'
        );

        const configure = document.getElementById('configure-session');
        const start = document.getElementById('start-session');
        const pause = document.getElementById('pause-session');
        const finish = document.getElementById('finish-session');
        const discard = document.getElementById('discard-session');
        const save = document.getElementById('save-session');

        this.setActionAvailability(configure, this.recordingController.can('configure'));
        this.setActionAvailability(start, this.recordingController.can('start'));
        if (pause) {
            this.setActionAvailability(pause, ['recording', 'paused'].includes(state));
            pause.textContent = state === 'paused' ? 'Reanudar' : 'Pausar';
        }
        this.setActionAvailability(finish, this.recordingController.can('finish'));
        this.setActionAvailability(discard, this.recordingController.can('discard'));
        this.setActionAvailability(save, this.recordingController.can('save') && this.sessionData.length > 0);
        this.updateSessionTimer();
    }

    showSessionConfigurationForm() {
        const patient = this.patientManager?.currentPatient;
        if (!patient) {
            this.showNotification('Selecciona un participante desde la sección Pacientes', 'warning');
            this.navigateToSection('patients');
            return;
        }

        document.getElementById('session-config-modal')?.remove();
        const current = this.recordingController.configuration || {};
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.id = 'session-config-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Configurar sesión simulada</h2>
                    <button type="button" class="modal-close" aria-label="Cerrar">&times;</button>
                </div>
                <form id="session-config-form" class="patient-form session-config-form">
                    <div class="form-grid">
                        <div class="form-group full-width">
                            <label>Participante</label>
                            <input value="${this.escapeHTML(patient.name || `Participante ${patient.id}`)}" disabled>
                        </div>
                        <div class="form-group full-width">
                            <label for="session-config-label">Nombre de la sesión</label>
                            <input id="session-config-label" name="label" maxlength="80" value="${this.escapeHTML(current.label || 'Sesión simulada')}">
                        </div>
                        <div class="form-group">
                            <label for="session-config-muscle">Par muscular flexor ↔ extensor</label>
                            <select id="session-config-muscle" name="muscleType">${this.muscleOptions(current.muscleType)}</select>
                            <small class="form-error" data-error="muscleType"></small>
                        </div>
                        <div class="form-group">
                            <label for="session-config-scenario">Escenario</label>
                            <select id="session-config-scenario" name="scenario">${this.scenarioOptions(current.scenario)}</select>
                            <small class="form-error" data-error="scenario"></small>
                        </div>
                        <div class="form-group">
                            <label for="session-config-duration">Duración (segundos)</label>
                            <input id="session-config-duration" name="plannedDurationSeconds" type="number" min="10" max="1800" value="${current.plannedDurationSeconds || 60}">
                            <small class="form-error" data-error="plannedDurationSeconds"></small>
                        </div>
                        <div class="form-group">
                            <label for="session-config-cadence">Cadencia (RPM)</label>
                            <input id="session-config-cadence" name="cadenceRpm" type="number" min="30" max="200" value="${current.cadenceRpm || 80}">
                            <small class="form-error" data-error="cadenceRpm"></small>
                        </div>
                        <div class="form-group">
                            <label for="session-config-resistance">Resistencia (%)</label>
                            <input id="session-config-resistance" name="resistancePercent" type="number" min="0" max="100" value="${current.resistancePercent ?? 50}">
                            <small class="form-error" data-error="resistancePercent"></small>
                        </div>
                        <div class="form-group">
                            <label for="session-config-asymmetry">Diferencia simulada (%)</label>
                            <input id="session-config-asymmetry" name="asymmetryPercent" type="number" min="0" max="80" value="${current.scenarioParameters?.asymmetryPercent || 0}">
                            <small class="form-error" data-error="asymmetryPercent"></small>
                        </div>
                        <div class="form-group">
                            <label for="session-config-phase">Desfase derecho (°)</label>
                            <input id="session-config-phase" name="phaseDelayDegrees" type="number" min="-180" max="180" value="${current.scenarioParameters?.phaseDelayDegrees || 0}">
                            <small class="form-error" data-error="phaseDelayDegrees"></small>
                        </div>
                        <div class="form-group full-width">
                            <label for="session-config-notes">Notas</label>
                            <textarea id="session-config-notes" name="notes" rows="2">${this.escapeHTML(current.notes || '')}</textarea>
                        </div>
                    </div>
                    <div class="modal-actions">
                        <button type="button" class="btn-outline" data-action="cancel">Cancelar</button>
                        <button type="submit" class="btn-control primary">Guardar configuración</button>
                    </div>
                </form>
            </div>`;
        document.body.appendChild(modal);
        const close = () => modal.remove();
        modal.querySelector('.modal-close').addEventListener('click', close);
        modal.querySelector('[data-action="cancel"]').addEventListener('click', close);
        modal.querySelector('form').addEventListener('submit', event => this.handleSessionConfiguration(event, patient.id, modal));
    }

    handleSessionConfiguration(event, patientId, modal) {
        event.preventDefault();
        const form = event.currentTarget;
        const raw = Object.fromEntries(new FormData(form).entries());
        raw.patientId = patientId;

        form.querySelectorAll('.form-error').forEach(element => { element.textContent = ''; });
        try {
            const configuration = this.sessionConfigurationService.normalize(raw);
            this.recordingController.configure(configuration);
            this.applySessionConfiguration(configuration);
            modal.remove();
            this.showNotification('Sesión configurada y lista para grabar', 'success');
        } catch (error) {
            Object.entries(error.validationErrors || {}).forEach(([field, message]) => {
                const target = form.querySelector(`[data-error="${field}"]`);
                if (target) target.textContent = message;
            });
        }
    }

    applySessionConfiguration(configuration) {
        if (!configuration) return;
        const simulator = this.emgSimulator;
        simulator.setMuscle(configuration.muscleType);
        simulator.setCadence(configuration.cadenceRpm);
        simulator.setResistance(configuration.resistancePercent / 100);
        simulator.resetTimeDelay();
        simulator.setAsymmetryFactor(1);
        simulator.setActivationLevel(0.4, 'both');
        simulator.setScenario(
            configuration.scenario,
            configuration.scenarioParameters,
            configuration.plannedDurationSeconds
        );

        const difference = configuration.scenarioParameters.asymmetryPercent || 25;
        if (configuration.scenario.includes('weakness')) {
            const factor = Math.max(0.2, 1 - difference / 100);
            if (configuration.scenario.startsWith('right')) {
                simulator.setActivationLevel(0.4, 'left');
                simulator.setActivationLevel(0.4 * factor, 'right');
            } else {
                simulator.setActivationLevel(0.4 * factor, 'left');
                simulator.setActivationLevel(0.4, 'right');
            }
        }
        if (configuration.scenario === 'phase-delay') {
            simulator.setTimeDelay(configuration.scenarioParameters.phaseDelayDegrees || 30, 'right');
        }

        const muscleSelect = document.getElementById('muscle-select');
        if (muscleSelect) muscleSelect.value = configuration.muscleType;
    }

    createSessionReview() {
        const configuration = this.recordingController.configuration;
        const statistics = new AnalysisService().analyzeSamples(this.sessionData);
        return {
            configuration,
            durationSeconds: this.recordingController.getElapsedSeconds(),
            sampleCount: this.sessionData.length,
            statistics
        };
    }

    showSessionReview() {
        const review = this.sessionReview;
        if (!review) return;
        document.getElementById('session-review-modal')?.remove();
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.id = 'session-review-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header"><h2>Revisión de sesión</h2></div>
                <p><strong>${this.escapeHTML(review.configuration.label)}</strong></p>
                <p>${this.formatMuscle(review.configuration.muscleType)} · ${this.escapeHTML(this.formatScenario(review.configuration.scenario))}</p>
                <div class="session-review-grid">
                    <div class="session-review-metric"><span>Duración efectiva</span><strong>${review.durationSeconds.toFixed(1)} s</strong></div>
                    <div class="session-review-metric"><span>Muestras guardables</span><strong>${review.sampleCount}</strong></div>
                    <div class="session-review-metric"><span>Simetría flexor</span><strong>${review.statistics.flexor.bilateral.symmetryIndex.toFixed(1)}%</strong></div>
                    <div class="session-review-metric"><span>Simetría extensor</span><strong>${review.statistics.extensor.bilateral.symmetryIndex.toFixed(1)}%</strong></div>
                    <div class="session-review-metric"><span>Asimetría relativa flexor/extensor</span><strong>${review.statistics.flexor.bilateral.relativeAsymmetry.toFixed(1)}% / ${review.statistics.extensor.bilateral.relativeAsymmetry.toFixed(1)}%</strong></div>
                    <div class="session-review-metric"><span>NSI flexor/extensor</span><strong>${this.formatPercent(review.statistics.flexor.bilateral.normalizedSymmetryIndex)} / ${this.formatPercent(review.statistics.extensor.bilateral.normalizedSymmetryIndex)}</strong></div>
                    <div class="session-review-metric"><span>RMS flexor izq./der.</span><strong>${review.statistics.flexor.left.rms.toFixed(2)} / ${review.statistics.flexor.right.rms.toFixed(2)} mV</strong></div>
                    <div class="session-review-metric"><span>RMS extensor izq./der.</span><strong>${review.statistics.extensor.left.rms.toFixed(2)} / ${review.statistics.extensor.right.rms.toFixed(2)} mV</strong></div>
                </div>
                <p><small>Datos generados mediante simulación. Los resultados son descriptivos y no constituyen un diagnóstico.</small></p>
                <div class="modal-actions">
                    <button type="button" class="btn-outline danger" data-action="discard">Descartar</button>
                    <button type="button" class="btn-control primary" data-action="save">Guardar sesión</button>
                </div>
            </div>`;
        document.body.appendChild(modal);
        modal.querySelector('[data-action="discard"]').addEventListener('click', () => this.discardSession());
        modal.querySelector('[data-action="save"]').addEventListener('click', () => this.saveSession());
    }

    muscleOptions(selected = 'quadriceps') {
        const labels = {
            quadriceps: 'Cuádriceps ↔ Isquiotibiales', gastrocnemius: 'Gastrocnemio ↔ Tibial anterior',
            hamstring: 'Isquiotibiales ↔ Cuádriceps', tibialis: 'Tibial anterior ↔ Gastrocnemio',
            gluteus: 'Glúteo ↔ Flexores de cadera', soleus: 'Sóleo ↔ Tibial anterior'
        };
        return this.sessionConfigurationService.getMuscles()
            .map(value => `<option value="${value}" ${value === selected ? 'selected' : ''}>${labels[value]}</option>`)
            .join('');
    }

    scenarioOptions(selected = 'symmetric') {
        const labels = {
            symmetric: 'Pedaleo simétrico', 'left-weakness': 'Menor activación izquierda',
            'right-weakness': 'Menor activación derecha', 'left-fatigue': 'Patrón de fatiga izquierda',
            'right-fatigue': 'Patrón de fatiga derecha', 'phase-delay': 'Retraso de fase',
            intervals: 'Intervalos', custom: 'Personalizado'
        };
        return this.sessionConfigurationService.getScenarios()
            .map(value => `<option value="${value}" ${value === selected ? 'selected' : ''}>${labels[value]}</option>`)
            .join('');
    }

    formatMuscle(value) {
        const labels = {
            quadriceps: 'Cuádriceps ↔ Isquiotibiales', gastrocnemius: 'Gastrocnemio ↔ Tibial anterior',
            hamstring: 'Isquiotibiales ↔ Cuádriceps', tibialis: 'Tibial anterior ↔ Gastrocnemio',
            gluteus: 'Glúteo ↔ Flexores de cadera', soleus: 'Sóleo ↔ Tibial anterior'
        };
        return labels[value] || value;
    }

    formatScenario(value) {
        const labels = { symmetric: 'Pedaleo simétrico', 'left-weakness': 'Menor activación izquierda', 'right-weakness': 'Menor activación derecha', 'left-fatigue': 'Patrón de fatiga izquierda', 'right-fatigue': 'Patrón de fatiga derecha', 'phase-delay': 'Retraso de fase', intervals: 'Intervalos', custom: 'Personalizado' };
        return labels[value] || value;
    }

    escapeHTML(value) {
        return String(value).replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
    }

    async saveSession() {
        if (this.sessionData.length === 0) {
            this.showNotification('No hay datos para guardar', 'warning');
            return;
        }

        if (!this.recordingController.can('save')) {
            this.showNotification('Finaliza y revisa la sesión antes de guardarla', 'warning');
            return;
        }

        // Check if patient is selected for database storage
        if (this.patientManager?.currentPatient) {
            await this.saveSessionToDatabase();
        } else {
            // Fallback to file download if no patient selected
            this.downloadSessionFile();
        }
    }

    async saveSessionToDatabase() {
        try {
            const provider = this.getActiveSignalProvider();
            const duration = this.recordingController.getElapsedSeconds();
            const configuration = this.recordingController.configuration;

            const sessionData = {
                muscleType: provider.currentMuscle,
                flexorMuscleType: configuration.flexorMuscleType || provider.currentMuscle,
                extensorMuscleType: configuration.extensorMuscleType,
                channelSchema: 'flexor-extensor-4ch',
                sessionType: 'cycling',
                duration: duration,
                cadence: provider.cyclingParams?.cadence || 80,
                resistance: provider.cyclingParams?.resistance || 0.5,
                emgData: this.sessionData,
                statistics: this.sessionReview?.statistics || this.analysisService.analyzeSamples(this.sessionData),
                notes: configuration.notes,
                configuration,
                calibration: this.getCalibrationSnapshot(),
                source: configuration.source,
                label: configuration.label
            };

            const session = await this.patientManager.saveCurrentSession(sessionData);
            
            if (session) {
                this.recordingController.markSaved();
                await this.clearRecordingDraft();
                document.getElementById('session-review-modal')?.remove();
                // Reset save button
                setTimeout(() => {
                    const saveBtn = document.getElementById('save-session');
                    if (saveBtn) saveBtn.disabled = true;
                }, 1000);
            }
            
        } catch (error) {
            console.error('Error saving session to database:', error);
            this.showNotification('Error al guardar en base de datos, descargando archivo...', 'warning');
            this.downloadSessionFile();
        }
    }

    downloadSessionFile() {
        const provider = this.getActiveSignalProvider();
        const sessionInfo = {
            timestamp: new Date().toISOString(),
            muscle: provider.currentMuscle,
            source: this.signalSource,
            duration: this.sessionStartTime 
                ? Math.floor((Date.now() - this.sessionStartTime.getTime()) / 1000)
                : Math.floor(this.sessionData.length / provider.sampleRate),
            dataPoints: this.sessionData.length,
            stats: provider.getStats(),
            calibration: this.getCalibrationSnapshot(),
            patient: this.patientManager?.currentPatient?.name || 'Sin paciente'
        };

        // Create downloadable file
        const dataToSave = {
            sessionInfo,
            data: this.sessionData
        };

        const blob = new Blob([JSON.stringify(dataToSave, null, 2)], {
            type: 'application/json'
        });

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `emg-session-${sessionInfo.timestamp.slice(0, 19).replace(/:/g, '-')}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        if (this.recordingController.can('save')) {
            this.recordingController.markSaved();
            this.clearRecordingDraft();
            document.getElementById('session-review-modal')?.remove();
        }
        URL.revokeObjectURL(url);

        this.showNotification('Sesión guardada como archivo', 'success');
        
        // Reset save button
        setTimeout(() => {
            const saveBtn = document.getElementById('save-session');
            if (saveBtn) saveBtn.disabled = true;
        }, 1000);
    }

    }

    for (const method of Object.getOwnPropertyNames(RecordingWorkflowControllerMethods.prototype)) {
        if (method === 'constructor') continue;
        Object.defineProperty(
            AppController.prototype,
            method,
            Object.getOwnPropertyDescriptor(RecordingWorkflowControllerMethods.prototype, method)
        );
    }
}());
