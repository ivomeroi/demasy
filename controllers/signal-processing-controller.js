(function registerSignalProcessingControllerMethods() {
    const AppController = window.KinesioEMGApp;
    if (!AppController) throw new Error('KinesioEMGApp debe cargarse antes que SignalProcessingControllerMethods');

    class SignalProcessingControllerMethods {
    changeMuscle(muscleType) {
        this.emgSimulator.setMuscle(muscleType);
        this.serialManager.setMuscle(muscleType);
        this.bluetoothManager.setMuscle(muscleType);
        this.resetChart({ resetProvider: false });
        
        appDebug(`Muscle changed to: ${muscleType}`);
        
        // Update AI context
        this.aiAssistant.updateEMGContext({
            ...this.aiAssistant.currentEMGContext,
            muscle: muscleType,
            musclePair: this.getMusclePair(muscleType)
        });
    }

    getMusclePair(flexor) {
        const pairs = {
            quadriceps: 'hamstring', hamstring: 'quadriceps', gastrocnemius: 'tibialis',
            tibialis: 'gastrocnemius', gluteus: 'hip-flexor', soleus: 'tibialis'
        };
        return { flexor, extensor: pairs[flexor] || 'complementary' };
    }

    toggleSidebarCollapse() {
        this.setSidebarCollapsed(!document.body.classList.contains('sidebar-collapsed'));
    }

    setSidebarCollapsed(collapsed, options = {}) {
        document.body.classList.toggle('sidebar-collapsed', collapsed);
        document.querySelector('.app-container')?.classList.toggle('sidebar-collapsed', collapsed);
        const button = document.getElementById('sidebar-collapse');
        const icon = button?.querySelector('i');
        if (button) {
            button.setAttribute('aria-expanded', String(!collapsed));
            button.setAttribute('aria-label', collapsed ? 'Expandir menú lateral' : 'Contraer menú lateral');
            button.title = collapsed ? 'Expandir menú lateral' : 'Contraer menú lateral';
        }
        if (icon) icon.className = collapsed ? 'fas fa-chevron-right' : 'fas fa-chevron-left';
        if (options.persist !== false) {
            try { window.localStorage.setItem('demasy.sidebarCollapsed', String(collapsed)); } catch {}
        }
        window.setTimeout(() => this.getLiveCharts().forEach(chart => chart.resize()), 220);
    }

    toggleChartFreeze() {
        this.isPaused = !this.isPaused;
        const button = document.getElementById('freeze-chart');
        const icon = button?.querySelector('i');

        if (button) {
            const action = this.isPaused ? 'Reanudar gráfico' : 'Pausar gráfico';
            button.setAttribute('aria-pressed', String(this.isPaused));
            button.setAttribute('aria-label', action);
            button.title = action;
        }

        if (icon) {
            icon.className = this.isPaused ? 'fas fa-play' : 'fas fa-pause';
        }
        
        appDebug(`Chart ${this.isPaused ? 'paused' : 'resumed'}`);
    }

    resetChart(options = {}) {
        if (this.emgChart) {
            const emptyData = Array(100).fill().map((_, i) => ({
                x: i * 0.01,
                y: 0
            }));
            
            // Reset EMG datasets (left EMG, right EMG)
            this.getLiveCharts().forEach(chart => {
                chart.data.datasets.forEach(dataset => { dataset.data = [...emptyData]; });
                chart.update('none');
            });
        }
        
        if (options.resetProvider !== false) this.getActiveSignalProvider().reset();
        appDebug('Chart reset');
    }

    clearChart() {
        if (!this.emgChart) return;

        this.getLiveCharts().forEach(chart => chart.data.datasets.forEach(dataset => { dataset.data = []; }));

        this.pendingChartData = [];
        this.lastChartUpdateAt = 0;
        this.resetSignalReadout();
        this.getLiveCharts().forEach(chart => {
            chart.options.scales.x.min = 0;
            chart.options.scales.x.max = this.chartConfig.timeWindow;
            chart.update('none');
        });

        this.showNotification('Gráfico limpiado', 'success');
    }

    // Cadence and resistance controls removed from UI
    // Internal values are set during initialization and remain constant

    // Temporal delay controls for signal superposition
    setPhaseShift(degrees) {
        if (this.signalSource === 'serial') {
            this.showNotification('El desfase visual solo aplica al modo simulación por ahora', 'info');
            return;
        }

        if (this.signalSource === 'bluetooth') {
            this.showNotification('El desfase visual solo aplica al modo simulación por ahora', 'info');
            return;
        }

        this.emgSimulator.setTimeDelay(degrees, 'right');
        this.updateElement('phase-display', degrees);
        appDebug(`Time delay set to ${degrees}° equivalent`);
        
        // Show notification for significant delays
        if (Math.abs(degrees) > 90) {
            this.showNotification(`Desfase temporal significativo aplicado: ${degrees}°`, 'info');
        }
    }

    autoAlignPhases() {
        if (this.signalSource === 'serial') {
            this.showNotification('La alineación automática solo aplica al modo simulación por ahora', 'info');
            return;
        }

        if (this.signalSource === 'bluetooth') {
            this.showNotification('La alineación automática solo aplica al modo simulación por ahora', 'info');
            return;
        }

        this.emgSimulator.autoAlignDelays();
        const newPhase = this.emgSimulator.getTimeDelay('right');
        
        // Update UI controls
        const phaseControl = document.getElementById('phase-shift-control');
        const phaseDisplay = document.getElementById('phase-display');
        
        if (phaseControl) phaseControl.value = newPhase;
        if (phaseDisplay) phaseDisplay.textContent = newPhase;
        
        this.showNotification(`Alineación automática completada: ${newPhase}°`, 'success');
        appDebug(`Auto-align completed: ${newPhase}° equivalent`);
    }

    resetPhaseShift() {
        if (this.signalSource === 'serial') {
            this.showNotification('El desfase visual solo aplica al modo simulación por ahora', 'info');
            return;
        }

        if (this.signalSource === 'bluetooth') {
            this.showNotification('El desfase visual solo aplica al modo simulación por ahora', 'info');
            return;
        }

        this.emgSimulator.resetTimeDelay();
        
        // Update UI controls
        const phaseControl = document.getElementById('phase-shift-control');
        const phaseDisplay = document.getElementById('phase-display');
        
        if (phaseControl) phaseControl.value = 0;
        if (phaseDisplay) phaseDisplay.textContent = '0';
        
        this.showNotification('Desfase temporal restablecido a 0°', 'success');
        appDebug('Time delay reset to 0°');
    }

    invertPhase() {
        if (this.signalSource === 'serial') {
            this.showNotification('El desfase visual solo aplica al modo simulación por ahora', 'info');
            return;
        }

        if (this.signalSource === 'bluetooth') {
            this.showNotification('El desfase visual solo aplica al modo simulación por ahora', 'info');
            return;
        }

        this.emgSimulator.invertDelay('right');
        const newPhase = this.emgSimulator.getTimeDelay('right');
        
        // Update UI controls
        const phaseControl = document.getElementById('phase-shift-control');
        const phaseDisplay = document.getElementById('phase-display');
        
        if (phaseControl) phaseControl.value = newPhase;
        if (phaseDisplay) phaseDisplay.textContent = newPhase;
        
        this.showNotification(`Desfase temporal invertido: ${newPhase}°`, 'success');
        appDebug(`Time delay inverted: ${newPhase}° equivalent`);
    }

    updateCyclingAnalysis(stats, leftActivation, rightActivation) {
        // Determine pedaling phase based on current activations
        let pedalingPhase = 'Inicio';
        const maxActivation = Math.max(leftActivation, rightActivation);
        
        if (maxActivation > 70) {
            pedalingPhase = 'Fase de Potencia';
        } else if (maxActivation > 40) {
            pedalingPhase = 'Transición';
        } else if (maxActivation > 15) {
            pedalingPhase = 'Fase de Recuperación';
        } else {
            pedalingPhase = 'Punto Muerto';
        }
        
        this.updateElement('pedaling-phase', pedalingPhase);
        
        // Calculate pedaling efficiency (based on symmetry and smoothness)
        const symmetry = stats.bilateral.symmetryIndex;
        const baseEfficiency = this.getActiveSignalProvider().cyclingParams.pedalingEfficiency * 100;
        const adjustedEfficiency = baseEfficiency * (symmetry / 100);
        
        this.updateElement('pedaling-efficiency', `${Math.round(adjustedEfficiency)}%`);
        
        // Power imbalance (same as bilateral difference but contextualized for cycling)
        this.updateElement('power-imbalance', `${stats.bilateral.difference.toFixed(1)}%`);
    }

    updatePedalPositions() {
        const provider = this.getActiveSignalProvider();

        if (provider.cyclingParams) {
            const leftAngle = Math.round(provider.cyclingParams.pedalPosition.left * 180 / Math.PI);
            const rightAngle = Math.round(provider.cyclingParams.pedalPosition.right * 180 / Math.PI);
            
            this.updateElement('pedal-left', `Izq: ${leftAngle}°`);
            this.updateElement('pedal-right', `Der: ${rightAngle}°`);
        }
    }

    updateChart(samples) {
        if (!this.emgChart || this.isPaused) return;

        const sampleList = Array.isArray(samples) ? samples : [samples];
        if (sampleList.length === 0) return;

        const allDatasets = [];
        ['flexor', 'extensor'].forEach((group, index) => {
            const chart = this.getLiveCharts()[index];
            const [leftSignal, rightSignal, leftEnvelopeData, rightEnvelopeData] = chart.data.datasets;
            sampleList.forEach(raw => {
                const data = window.EMGChannelContract.normalizeSample(raw);
                leftSignal.data.push({ x: data.time, y: data[group].left.amplitude });
                rightSignal.data.push({ x: data.time, y: data[group].right.amplitude });
                const leftEnvelope = Number.isFinite(data[group].left.envelope)
                    ? data[group].left.envelope : this.calculateRMSFromDataset(leftSignal);
                const rightEnvelope = Number.isFinite(data[group].right.envelope)
                    ? data[group].right.envelope : this.calculateRMSFromDataset(rightSignal);
                const visualGain = this.isExternalSignalSource() ? this.chartConfig.activityVisualGain : 1;
                leftEnvelopeData.data.push({ x: data.time, y: leftEnvelope * visualGain });
                rightEnvelopeData.data.push({ x: data.time, y: rightEnvelope * visualGain });
            });
            chart.data.datasets.forEach(dataset => { while (dataset.data.length > this.chartConfig.maxDataPoints) dataset.data.shift(); });
            allDatasets.push(...chart.data.datasets);
        });

        // Update time window
        const latestTime = sampleList[sampleList.length - 1].time;
        this.getLiveCharts().forEach(chart => {
            chart.options.scales.x.min = Math.max(0, latestTime - this.chartConfig.timeWindow);
            chart.options.scales.x.max = Math.max(this.chartConfig.timeWindow, latestTime);
        });
        this.updateVisibleSignalRange(allDatasets);

        // Update chart
        this.getLiveCharts().forEach(chart => chart.update('none'));
    }

    getLiveCharts() {
        return [this.emgChart, this.extensorChart].filter(Boolean);
    }

    getChartYRange(chart) {
        const group = chart === this.extensorChart ? 'extensor' : 'flexor';
        return this.chartConfig.calibratedYRanges[group] || Math.abs(this.chartConfig.fixedYMax);
    }

    createEnvelopeDisplayState() {
        return {
            smoothed: null,
            baselineSamples: [],
            movementSamples: [],
            baseline: null,
            noiseSigma: null,
            threshold: null,
            calibrated: false,
            active: false,
            candidate: null,
            candidateSince: null,
            calibrationSampleCount: 0,
            calibrationClippedCount: 0,
            lastCorrected: 0
        };
    }

    resetEnvelopeDisplay() {
        this.envelopeDisplay = this.createEnvelopeDisplayMap();
        this.calibratedLiveBuffer = [];
        Object.keys(this.envelopeDisplay).forEach(key => this.updateActivityBadge(key, 'uncalibrated'));
    }

    getCalibrationSnapshot() {
        return Object.fromEntries(Object.entries(this.envelopeDisplay).map(([channel, state]) => [channel, {
            calibrated: state.calibrated,
            baseline: state.baseline,
            noiseSigma: state.noiseSigma,
            threshold: state.threshold,
            sampleCount: state.calibrationSampleCount,
            method: 'median-mad-3sigma',
            gainApplied: 1
        }]));
    }

    createEnvelopeDisplayMap() {
        return Object.fromEntries(['flexor-left', 'flexor-right', 'extensor-left', 'extensor-right'].map(key => [key, this.createEnvelopeDisplayState()]));
    }

    getCalibrationChannels(target = 'all') {
        const groups = {
            all: ['flexor-left', 'flexor-right', 'extensor-left', 'extensor-right'],
            flexor: ['flexor-left', 'flexor-right'],
            extensor: ['extensor-left', 'extensor-right']
        };
        if (groups[target]) return groups[target];
        return this.envelopeDisplay[target] ? [target] : groups.all;
    }

    setCalibrationOverlayVisibility(channels, visible) {
        const groups = new Set(channels.map(channel => channel.split('-')[0]));
        document.querySelectorAll('[data-calibration-group]').forEach(overlay => {
            overlay.hidden = !visible || !groups.has(overlay.dataset.calibrationGroup);
        });
    }

    startSignalCalibration() {
        if (!this.isExternalSignalSource()) {
            this.showNotification('Conecta el ESP32 por USB o Bluetooth antes de calibrar.', 'warning');
            return;
        }
        if (this.calibrationInProgress) return;

        const target = document.getElementById('calibration-target')?.value || 'all';
        this.activeCalibrationChannels = this.getCalibrationChannels(target);
        if (Array.isArray(this.latestSensorStatus)) {
            const channelIndex = { 'flexor-left': 0, 'flexor-right': 1, 'extensor-left': 2, 'extensor-right': 3 };
            const unavailable = this.activeCalibrationChannels.filter(channel => !this.latestSensorStatus[channelIndex[channel]]);
            if (unavailable.length) {
                this.showNotification(`No se puede calibrar: ${unavailable.map(channel => `S${channelIndex[channel] + 1}`).join(', ')} no transmite datos recientes.`, 'warning');
                return;
            }
        }
        this.activeCalibrationChannels.forEach(channel => {
            this.envelopeDisplay[channel] = this.createEnvelopeDisplayState();
        });
        this.calibratedLiveBuffer = [];
        this.calibrationInProgress = true;
        this.calibrationPhase = 'rest';
        this.calibrationPhaseStartedAt = performance.now();
        const button = document.getElementById('calibrate-signal');
        const selector = document.getElementById('calibration-target');
        this.setCalibrationOverlayVisibility(this.activeCalibrationChannels, true);
        this.updateCalibrationOverlay('rest');
        if (button) button.disabled = true;
        if (selector) selector.disabled = true;
        this.activeCalibrationChannels.forEach(key => this.updateActivityBadge(key, 'calibrating'));

        const updateCountdown = () => {
            const elapsed = performance.now() - this.calibrationPhaseStartedAt;
            const remaining = Math.max(0, this.calibrationDurationMs - elapsed);
            document.querySelectorAll('.calibration-countdown').forEach(countdown => {
                countdown.textContent = `${(remaining / 1000).toFixed(1)} s`;
            });
            document.querySelectorAll('.calibration-progress-fill').forEach(progress => {
                progress.style.width = `${Math.min(100, elapsed / this.calibrationDurationMs * 100)}%`;
            });
            if (remaining <= 0) {
                if (this.calibrationPhase === 'rest') this.startMovementCalibrationPhase();
                else this.finishSignalCalibration();
            }
        };

        updateCountdown();
        this.calibrationTimer = window.setInterval(updateCountdown, 100);
    }

    startMovementCalibrationPhase() {
        let channelsWithBaseline = 0;
        this.activeCalibrationChannels.forEach(channel => {
            const state = this.envelopeDisplay[channel];
            if (this.finalizeRestCalibration(state)) {
                channelsWithBaseline++;
            }
            state.baselineSamples = [];
            state.movementSamples = [];
        });
        if (!channelsWithBaseline) {
            this.finishSignalCalibration();
            return;
        }
        this.calibrationPhase = 'movement';
        this.calibrationPhaseStartedAt = performance.now();
        this.updateCalibrationOverlay('movement');
    }

    updateCalibrationOverlay(phase) {
        const movement = phase === 'movement';
        document.querySelectorAll('[data-calibration-group]').forEach(overlay => {
            overlay.dataset.phase = phase;
            const title = overlay.querySelector('.calibration-title');
            const instruction = overlay.querySelector('.calibration-instruction');
            if (title) title.textContent = movement ? 'Calibrando rango de movimiento' : 'Calibrando nivel de reposo';
            if (instruction) instruction.textContent = movement
                ? 'Realiza contracciones y movimientos normales durante cinco segundos.'
                : 'Mantén los músculos relajados y evita movimientos.';
        });
        document.querySelectorAll('.calibration-progress-fill').forEach(progress => { progress.style.width = '0%'; });
        document.querySelectorAll('.calibration-countdown').forEach(countdown => { countdown.textContent = '5.0 s'; });
    }

    finishSignalCalibration() {
        if (!this.calibrationInProgress) return;
        this.calibrationInProgress = false;
        window.clearInterval(this.calibrationTimer);
        this.calibrationTimer = null;

        let calibratedChannels = 0;
        let channelsWithMovement = 0;
        this.activeCalibrationChannels.forEach(channel => {
            const state = this.envelopeDisplay[channel];
            if (!state.calibrated) this.finalizeRestCalibration(state);
            if (state.calibrated) calibratedChannels++;
            if (this.hasValidCalibrationMovement(state)) channelsWithMovement++;
            this.updateActivityBadge(channel, state.calibrated ? 'rest' : 'uncalibrated');
            state.baselineSamples = [];
        });

        const calibratedRanges = this.applyCalibrationChartRanges(this.activeCalibrationChannels);

        const button = document.getElementById('calibrate-signal');
        const selector = document.getElementById('calibration-target');
        this.setCalibrationOverlayVisibility([], false);
        this.calibrationPhase = null;
        this.calibrationPhaseStartedAt = null;
        if (button) button.disabled = false;
        if (selector) selector.disabled = false;
        const expectedChannels = this.activeCalibrationChannels.length;
        this.activeCalibrationChannels = [];
        this.showNotification(
            calibratedChannels === expectedChannels && channelsWithMovement === expectedChannels
                ? `Calibración completada en ${calibratedChannels} sensor${calibratedChannels === 1 ? '' : 'es'}. Escala ajustada a ${calibratedRanges.join(' / ')} mV.`
                : calibratedChannels > 0
                    ? `Calibración parcial: reposo ${calibratedChannels}/${expectedChannels}, movimiento ${channelsWithMovement}/${expectedChannels}.`
                    : 'No se recibieron datos para calibrar.',
            calibratedChannels === expectedChannels && channelsWithMovement === expectedChannels ? 'success' : 'warning'
        );
    }

    captureCalibrationMovement(channel, rawAmplitude, displayedEnvelope) {
        if (!this.calibrationInProgress || this.calibrationPhase !== 'movement' || !this.activeCalibrationChannels.includes(channel)) return;
        const state = this.envelopeDisplay[channel];
        const value = Math.abs(Number(displayedEnvelope));
        if (Number.isFinite(value)) state.movementSamples.push(value);
    }

    median(values) {
        const ordered = values.map(Number).filter(Number.isFinite).sort((a, b) => a - b);
        if (!ordered.length) return null;
        const middle = Math.floor(ordered.length / 2);
        return ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2;
    }

    finalizeRestCalibration(state) {
        const minimumSamples = Math.max(50, Math.min(100, Math.floor((this.getActiveSignalProvider()?.sampleRate || 50) * 2)));
        if (state.baselineSamples.length < minimumSamples) return false;
        const baseline = this.median(state.baselineSamples);
        const mad = this.median(state.baselineSamples.map(value => Math.abs(value - baseline)));
        if (!Number.isFinite(baseline) || !Number.isFinite(mad)) return false;
        state.baseline = baseline;
        state.noiseSigma = Math.max(0.05, mad * 1.4826);
        state.threshold = baseline + Math.max(0.25, state.noiseSigma * 3);
        state.calibrationSampleCount = state.baselineSamples.length;
        state.calibrated = state.calibrationClippedCount / state.calibrationSampleCount < 0.05;
        return state.calibrated;
    }

    hasValidCalibrationMovement(state) {
        if (!state.calibrated || state.movementSamples.length < 50) return false;
        const ordered = [...state.movementSamples].filter(Number.isFinite).sort((a, b) => a - b);
        if (!ordered.length) return false;
        const peak95 = ordered[Math.min(ordered.length - 1, Math.floor(ordered.length * 0.95))];
        return peak95 >= Math.max(0.5, state.noiseSigma * 3);
    }

    applyCalibrationChartRanges(channels) {
        const groups = [...new Set(channels.map(channel => channel.split('-')[0]))];
        const labels = [];
        groups.forEach(group => {
            const values = channels
                .filter(channel => channel.startsWith(`${group}-`))
                .flatMap(channel => this.envelopeDisplay[channel].movementSamples)
                .filter(value => Number.isFinite(value) && value >= 0)
                .sort((a, b) => a - b);
            if (!values.length) return;
            const robustPeak = values[Math.min(values.length - 1, Math.floor(values.length * 0.99))];
            const displayedPeak = robustPeak * this.chartConfig.activityVisualGain;
            const range = Math.max(3, Math.ceil(displayedPeak * 1.2 / 5) * 5);
            this.chartConfig.calibratedYRanges[group] = range;
            labels.push(`${group === 'flexor' ? 'flexor' : 'extensor'} ±${range}`);
        });
        this.applyDisplayPreferences(this.displayPreferences);
        return labels.length ? labels : ['sin ajuste'];
    }

    smoothEnvelope(channel, value, time) {
        const state = this.envelopeDisplay[channel];
        const alpha = 0.08;
        state.smoothed = state.smoothed === null
            ? Math.max(0, value)
            : state.smoothed + alpha * (Math.max(0, value) - state.smoothed);

        if (this.calibrationInProgress && this.calibrationPhase === 'rest' && this.activeCalibrationChannels.includes(channel)) {
            state.baselineSamples.push(Math.max(0, Number(value)));
            this.updateActivityBadge(channel, 'calibrating');
            return 0;
        }

        if (!state.calibrated || state.baseline === null) {
            this.updateActivityBadge(channel, 'uncalibrated');
            return this.isExternalSignalSource() ? 0 : state.smoothed;
        }

        const activationThreshold = state.threshold;
        const releaseThreshold = state.baseline + Math.max(0.15, state.noiseSigma * 1.5);
        const desiredState = state.active
            ? state.smoothed > releaseThreshold
            : state.smoothed >= activationThreshold;

        if (desiredState !== state.active) {
            if (state.candidate !== desiredState) {
                state.candidate = desiredState;
                state.candidateSince = time;
            } else if (time - state.candidateSince >= 0.2) {
                state.active = desiredState;
                state.candidate = null;
                state.candidateSince = null;
            }
        } else {
            state.candidate = null;
            state.candidateSince = null;
        }

        if (!(this.calibrationInProgress && this.calibrationPhase === 'movement' && this.activeCalibrationChannels.includes(channel))) {
            this.updateActivityBadge(channel, state.active ? 'active' : 'rest');
        }
        if (!this.isExternalSignalSource()) return state.smoothed;

        // Display-only transformation. The original sample and envelope remain
        // untouched for recording, export and analysis.
        state.lastCorrected = Math.max(0, state.smoothed - state.threshold);
        return state.lastCorrected;
    }

    applyCalibrationToSample(sample) {
        if (!this.isExternalSignalSource()) return sample;
        const calibrated = { ...sample, calibrationApplied: true };
        ['flexor', 'extensor'].forEach(group => {
            calibrated[group] = { ...sample[group] };
            ['left', 'right'].forEach(side => {
                const key = `${group}-${side}`;
                const original = sample[group][side];
                const state = this.envelopeDisplay[key];
                if (this.calibrationInProgress && this.calibrationPhase === 'rest' && (original.flags & 0x01)) {
                    state.calibrationClippedCount++;
                }
                const correctedEnvelope = this.smoothEnvelope(key, original.envelope, sample.time);
                if (this.calibrationPhase === 'movement') {
                    this.captureCalibrationMovement(key, original.amplitude, correctedEnvelope);
                }
                calibrated[group][side] = {
                    ...original,
                    rawAmplitude: original.rawAmplitude ?? original.amplitude,
                    rawEnvelope: original.rawEnvelope ?? original.envelope,
                    amplitude: state.calibrated && correctedEnvelope <= 0 ? 0 : original.amplitude,
                    envelope: correctedEnvelope,
                    calibration: state.calibrated ? {
                        baseline: state.baseline,
                        noiseSigma: state.noiseSigma,
                        threshold: state.threshold
                    } : null
                };
            });
        });
        return calibrated;
    }

    isExternalSignalSource() {
        return this.signalSource === 'serial' || this.signalSource === 'bluetooth';
    }

    updateActivityBadge(channel, status) {
        const badge = document.getElementById(`activity-state-${channel}`);
        if (!badge || badge.dataset.status === status) return;
        badge.dataset.status = status;
        badge.textContent = status === 'active'
            ? 'Contracción'
            : status === 'rest' ? 'Reposo'
                : status === 'calibrating' ? 'Calibrando…' : 'Sin calibrar';
        const state = this.envelopeDisplay[channel];
        badge.title = state?.calibrated
            ? `Baseline ${state.baseline.toFixed(2)} mV · ruido σ ${state.noiseSigma.toFixed(2)} mV · umbral ${state.threshold.toFixed(2)} mV`
            : 'Este canal todavía no tiene una calibración válida';
    }

    calculateRMSFromDataset(dataset) {
        const values = dataset.data
            .slice(-this.chartConfig.rmsWindowPoints)
            .map(point => point.y)
            .filter(value => Number.isFinite(value));

        if (values.length === 0) return 0;

        const meanSquare = values.reduce((sum, value) => sum + value * value, 0) / values.length;
        return Math.sqrt(meanSquare);
    }

    ingestSignalData(data) {
        const now = performance.now();
        data = window.EMGChannelContract.normalizeSample(data);
        data = this.applyCalibrationToSample(data);

        this.calibratedLiveBuffer.push(data);
        if (this.calibratedLiveBuffer.length > 500) this.calibratedLiveBuffer.shift();

        if (!this.sessionStartTime) {
            this.sessionStartTime = new Date();
        }

        this.trackSignalValue(data.flexor.left.amplitude);
        this.trackSignalValue(data.flexor.right.amplitude);
        this.trackSignalValue(data.extensor.left.amplitude);
        this.trackSignalValue(data.extensor.right.amplitude);
        this.pendingChartData.push(data);

        if (
            this.recordingController.state === 'recording' &&
            now - this.lastSessionCaptureAt >= this.chartConfig.sessionCaptureInterval
        ) {
            this.lastSessionCaptureAt = now;
            this.sessionData.push(data);
            this.persistRecordingDraft();

            if (this.sessionData.length > this.chartConfig.maxSessionDataPoints) {
                this.sessionData.length = this.chartConfig.maxSessionDataPoints;
                this.showNotification('Se alcanzó el límite seguro de muestras; la grabación finalizará.', 'warning');
                this.finishRecording();
            }
        }

        if (now - this.lastChartUpdateAt >= this.chartConfig.updateInterval) {
            this.lastChartUpdateAt = now;
            const pendingSamples = this.pendingChartData.splice(0);
            this.updateChart(pendingSamples);
        }

        if (now - this.lastReadoutUpdateAt >= this.chartConfig.readoutUpdateInterval) {
            this.lastReadoutUpdateAt = now;
            this.updateCurrentSignalReadout(Math.max(
                Math.abs(data.flexor.left.amplitude), Math.abs(data.flexor.right.amplitude),
                Math.abs(data.extensor.left.amplitude), Math.abs(data.extensor.right.amplitude)
            ));
        }

        if (this.isExternalSignalSource() && now - this.lastStatsUpdateAt >= this.chartConfig.statsUpdateInterval) {
            this.lastStatsUpdateAt = now;
            const stats = this.analysisService.analyzeSamples(this.calibratedLiveBuffer.slice(-250));
            stats.bilateral.snr = this.latestSourceStats?.bilateral?.snr ?? 0;
            stats.bilateral.artifacts = this.latestSourceStats?.bilateral?.artifacts ?? 'Ninguno';
            this.updateStatistics(stats);
            this.updateSignalQuality(stats);
            this.aiAssistant.updateEMGContext(stats);
        }
    }

    persistRecordingDraft(force = false) {
        if (!this.settingsService || !['recording', 'paused', 'review'].includes(this.recordingController.state)) return;
        const now = Date.now();
        if (!force && (now - this.lastDraftPersistedAt < 2000 || this.draftPersistPending)) return;
        this.lastDraftPersistedAt = now;
        this.draftPersistPending = true;
        const draft = {
            version: 2,
            patientId: this.patientManager?.currentPatient?.id || null,
            configuration: this.recordingController.configuration,
            elapsedSeconds: this.recordingController.getElapsedSeconds(),
            samples: this.sessionData.slice(),
            markers: this.recordingMarkers.slice(),
            updatedAt: new Date().toISOString()
        };
        this.settingsService.storage.setSetting('activeRecordingDraft', draft)
            .catch(error => console.error('No se pudo conservar el borrador de grabación:', error.message))
            .finally(() => { this.draftPersistPending = false; });
    }

    async restoreRecordingDraft() {
        const draft = await this.settingsService?.storage.getSetting('activeRecordingDraft', null);
        if (!draft?.configuration || !Array.isArray(draft.samples) || draft.samples.length === 0) return;
        if (!window.confirm(`Se encontró una grabación interrumpida con ${draft.samples.length} muestras. ¿Quieres recuperarla para revisarla y guardarla?`)) {
            await this.clearRecordingDraft();
            return;
        }
        const patient = draft.patientId ? await this.database.getPatient(draft.patientId) : null;
        if (patient) {
            this.patientManager.currentPatient = patient;
            this.patientManager.updateCurrentPatientUI();
        }
        this.sessionData = draft.samples.slice(0, this.chartConfig.maxSessionDataPoints);
        this.recordingMarkers = Array.isArray(draft.markers) ? draft.markers : [];
        this.recordingController.restoreReview(draft.configuration, draft.elapsedSeconds);
        this.sessionReview = this.createSessionReview();
        this.showSessionReview();
        this.showNotification('Grabación interrumpida recuperada para revisión', 'success');
    }

    async clearRecordingDraft() {
        try { await this.settingsService?.storage.setSetting('activeRecordingDraft', null); }
        catch (error) { console.error('No se pudo limpiar el borrador:', error.message); }
    }

    ingestStats(stats) {
        this.latestSourceStats = stats;
        if (this.isExternalSignalSource()) return;
        const now = performance.now();
        if (now - this.lastStatsUpdateAt < this.chartConfig.statsUpdateInterval) return;

        this.lastStatsUpdateAt = now;
        this.updateStatistics(stats);
        this.updateSignalQuality(stats);
        this.aiAssistant.updateEMGContext(stats);
    }

    updateVisibleSignalRange(datasets) {
        const xMin = this.emgChart.options.scales.x.min;
        const xMax = this.emgChart.options.scales.x.max;
        const values = datasets
            .filter(dataset => !dataset.hidden)
            .flatMap(dataset => dataset.data)
            .filter(point => point.x >= xMin && point.x <= xMax && Number.isFinite(point.y))
            .map(point => point.y);

        if (values.length === 0) {
            this.updateElement('signal-min', 'Min: 0');
            this.updateElement('signal-max', 'Max: 0');
            return;
        }

        const minValue = Math.min(...values);
        const maxValue = Math.max(...values);
        this.updateElement('signal-min', `Min: ${this.formatSignalValue(minValue)}`);
        this.updateElement('signal-max', `Max: ${this.formatSignalValue(maxValue)}`);
    }

    updateCurrentSignalReadout(value) {
        if (!Number.isFinite(value)) return;

        this.trackSignalValue(value);
        this.updateElement('signal-current', `Actual: ${this.formatSignalValue(value)}`);
        this.updateElement('signal-peak-max', `Pico max: ${this.formatSignalValue(this.signalExtremes.max)}`);
    }

    trackSignalValue(value) {
        if (!Number.isFinite(value)) return;

        if (this.signalExtremes.min === null || value < this.signalExtremes.min) {
            this.signalExtremes.min = value;
        }

        if (this.signalExtremes.max === null || value > this.signalExtremes.max) {
            this.signalExtremes.max = value;
        }
    }

    resetSignalReadout() {
        this.signalExtremes = {
            min: null,
            max: null
        };
        this.updateElement('signal-current', `Actual: 0.0 ${this.chartConfig.signalUnit}`);
        this.updateElement('signal-min', `Min: 0.0 ${this.chartConfig.signalUnit}`);
        this.updateElement('signal-max', `Max: 0.0 ${this.chartConfig.signalUnit}`);
        this.updateElement('signal-peak-max', `Pico max: 0.0 ${this.chartConfig.signalUnit}`);
    }

    formatSignalValue(value) {
        const absValue = Math.abs(value);
        const formatted = absValue >= 100 ? value.toFixed(0) : value.toFixed(1);
        return `${formatted} ${this.chartConfig.signalUnit}`;
    }

    updateStatistics(stats) {
        const flexor = stats.flexor || { left: stats.left, right: stats.right, bilateral: stats.bilateral };
        const extensor = stats.extensor || flexor;
        this.enrichAsymmetryMetrics(flexor, stats.bilateral);
        this.enrichAsymmetryMetrics(extensor, stats.bilateral);
        ['flexor', 'extensor'].forEach(group => ['left', 'right'].forEach(side => {
            const value = group === 'flexor' ? flexor[side] : extensor[side];
            this.updateElement(`rms-${group}-${side}`, this.formatVoltageStat(value?.rms || 0));
            this.updateElement(`peak-${group}-${side}`, this.formatVoltageStat(value?.peakAmplitude || 0));
        }));
        
        // Update comparison statistics
        this.updateElement('symmetry-flexor', `${flexor.bilateral.symmetryIndex.toFixed(0)}%`);
        this.updateElement('symmetry-extensor', `${extensor.bilateral.symmetryIndex.toFixed(0)}%`);
        this.updateAsymmetryReadout('flexor', flexor.bilateral);
        this.updateAsymmetryReadout('extensor', extensor.bilateral);
        this.updateElement('bilateral-difference', `${stats.bilateral.difference.toFixed(1)}%`);
        
        // Update activation levels for both sides
        const activationReference = Math.max(1, this.chartConfig.fixedYMax);
        const leftActivation = (flexor.left.rms / activationReference) * 100;
        const rightActivation = (flexor.right.rms / activationReference) * 100;
        
        this.updateElement('activation-percent-left', `${Math.min(100, leftActivation).toFixed(0)}%`);
        this.updateElement('activation-percent-right', `${Math.min(100, rightActivation).toFixed(0)}%`);
        
        const leftActivationBar = document.getElementById('activation-left');
        const rightActivationBar = document.getElementById('activation-right');
        
        if (leftActivationBar) {
            leftActivationBar.style.width = `${Math.min(100, leftActivation)}%`;
            leftActivationBar.style.backgroundColor = '#3b82f6';
        }
        
        if (rightActivationBar) {
            rightActivationBar.style.width = `${Math.min(100, rightActivation)}%`;
            rightActivationBar.style.backgroundColor = '#ef4444';
        }

        // Update cycling-specific information
        this.updateCyclingAnalysis(stats, leftActivation, rightActivation);
        
        // Update pedal positions
        this.updatePedalPositions();
    }

    enrichAsymmetryMetrics(group, aggregate = {}) {
        if (!group?.left || !group?.right) return;
        if (['relativeAsymmetry', 'robinsonAsymmetry'].every(key => Number.isFinite(Number(group.bilateral?.[key])))) return;
        group.bilateral = { ...group.bilateral, ...this.analysisService.calculateBilateral(group.left.rms, group.right.rms, group.bilateral?.normalizedSymmetryIndex) };
    }

    updateAsymmetryReadout(group, bilateral) {
        this.updateElement(`relative-asymmetry-${group}`, `${Number(bilateral.relativeAsymmetry || 0).toFixed(1)}%`);
        this.updateElement(`robinson-asymmetry-${group}`, this.formatPercent(bilateral.robinsonAsymmetry));
        this.updateElement(`nsi-asymmetry-${group}`, this.formatPercent(bilateral.normalizedSymmetryIndex));
    }

    formatPercent(value) {
        return value !== null && value !== undefined && Number.isFinite(Number(value)) ? `${Number(value).toFixed(1)}%` : 'N/D';
    }

    formatVoltageStat(value) {
        if (!Number.isFinite(value)) return `0.0 ${this.chartConfig.signalUnit}`;
        return `${value.toFixed(1)} ${this.chartConfig.signalUnit}`;
    }

    updateSignalQuality(stats) {
        const snr = parseFloat(stats.bilateral.snr) || 45;
        let quality = 100;
        let qualityText = 'Excelente';
        
        if (snr < 20) {
            quality = 40;
            qualityText = 'Pobre';
        } else if (snr < 30) {
            quality = 60;
            qualityText = 'Regular';
        } else if (snr < 40) {
            quality = 80;
            qualityText = 'Buena';
        }
        
        // Reduce quality if artifacts are present
        if (stats.bilateral.artifacts !== 'Ninguno') {
            quality -= 20;
            qualityText = quality > 60 ? 'Buena' : 'Regular';
        }
        
        // Reduce quality based on asymmetry
        if (stats.bilateral.asymmetryLevel === 'Severa') {
            quality -= 25;
            qualityText = 'Pobre';
        } else if (stats.bilateral.asymmetryLevel === 'Moderada') {
            quality -= 15;
            if (quality <= 60) qualityText = 'Regular';
        }
        
        this.updateElement('quality-text', qualityText);
        this.updateElement('snr-value', `${snr.toFixed(1)} dB`);
        this.updateElement('artifacts', stats.bilateral.artifacts);
        this.updateElement('impedance', '< 5kΩ'); // Simulated
        
        const qualityFill = document.getElementById('quality-fill');
        if (qualityFill) {
            qualityFill.style.width = `${quality}%`;
            
            // Change color based on quality
            if (quality > 80) qualityFill.style.background = '#10b981';
            else if (quality > 60) qualityFill.style.background = '#f59e0b';
            else qualityFill.style.background = '#ef4444';
        }
    }

    }

    for (const method of Object.getOwnPropertyNames(SignalProcessingControllerMethods.prototype)) {
        if (method === 'constructor') continue;
        Object.defineProperty(
            AppController.prototype,
            method,
            Object.getOwnPropertyDescriptor(SignalProcessingControllerMethods.prototype, method)
        );
    }
}());
