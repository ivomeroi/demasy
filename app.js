/**
 * DEMASY - Main Application Controller
 * Manages EMG simulation, real-time visualization, AI assistant, and user interface
 */

const appDebug = (...args) => window.DemasyLogger?.debug(...args);

class KinesioEMGApp {
    constructor() {
        appDebug('Inicializando DEMASY…');
        
        try {
            // Initialize core components
            this.emgSimulator = new EMGSimulator();
            appDebug('EMG Simulator created:', !!this.emgSimulator);

            this.serialManager = new EMGSerialManager();
            this.bluetoothManager = new EMGBluetoothManager();
            this.signalSource = 'simulator';
            appDebug('Serial manager created:', !!this.serialManager);
            appDebug('Bluetooth manager created:', !!this.bluetoothManager);
            
            this.aiAssistant = new KinesiologyAIAssistant();  
            this.assistantService = null;
            this.chatPending = false;
            this.chatTranscriptService = new ChatTranscriptService(window.sessionStorage);
            this.chatTranscript = [];
            appDebug('AI Assistant created:', !!this.aiAssistant);
            
            // Initialize database and patient manager
            this.database = new DEMASYDatabase();
            this.patientManager = null; // Will be initialized after database
            this.analysisManager = null;
            this.backupManager = null;
            this.settingsService = null;
            this.displayPreferences = null;
            this.recordingController = new RecordingController();
            this.sessionConfigurationService = new SessionConfigurationService();
            this.analysisService = new AnalysisService();
            this.sectionRouter = new SectionRouter();
            this.onboardingTour = new OnboardingTour({
                onNavigate: section => this.navigateToSection(section, { replaceHistory: true })
            });
            this.sessionReview = null;
            this.recordingTimerInterval = null;
            
            this.emgChart = null;
            this.extensorChart = null;
            this.isRecording = false;
            this.isPaused = false;
            this.sessionData = [];
            this.sessionStartTime = null;
            this.lastChartUpdateAt = 0;
            this.lastStatsUpdateAt = 0;
            this.lastSessionCaptureAt = 0;
            this.lastReadoutUpdateAt = 0;
            this.pendingChartData = [];
            this.recordingMarkers = [];
            this.lastDraftPersistedAt = 0;
            this.draftPersistPending = false;
            this.signalExtremes = {
                min: null,
                max: null
            };
            this.envelopeDisplay = this.createEnvelopeDisplayMap();
            this.calibrationInProgress = false;
            this.calibrationTimer = null;
            this.calibrationDurationMs = 5000;
            this.calibrationPhase = null;
            this.calibrationPhaseStartedAt = null;
            this.activeCalibrationChannels = [];
            this.envelopeDisplaySource = null;
            this.latestSensorStatus = null;
            this.calibratedLiveBuffer = [];
            this.latestSourceStats = null;
            this.currentSection = 'dashboard';
            
            appDebug('Controlador DEMASY creado correctamente');
        } catch (error) {
            console.error('Error al crear el controlador DEMASY:', error);
        }
        
        // Chart configuration
        const signalConfig = window.DEMASY_CONFIG?.signal || {};
        const sessionConfig = window.DEMASY_CONFIG?.session || {};
        this.chartConfig = {
            maxDataPoints: 1000,
            updateInterval: signalConfig.chartUpdateIntervalMs || 50,
            readoutUpdateInterval: 100,
            statsUpdateInterval: 200,
            sessionCaptureInterval: 1000 / (signalConfig.storageRateHz || 100),
            maxSessionDataPoints: (signalConfig.storageRateHz || 100) * (sessionConfig.maximumDurationSeconds || 1800),
            rmsWindowPoints: 30,
            timeWindow: signalConfig.defaultChartWindowSeconds || 1,
            adcReferenceVoltage: 3.3,
            adcMaxCount: 4095,
            simulatorYRange: 3,
            externalYRange: 50,
            activityVisualGain: 2.5,
            fixedYMin: -3,
            fixedYMax: 3,
            calibratedYRanges: { flexor: null, extensor: null },
            signalUnit: 'mV'
        };
        
        // Initialize application
        this.init();
    }

    async init() {
        this.showLoading();
        
        try {
            // Initialize database first
            await this.initializeDatabase();
            this.displayPreferences = await this.settingsService.getAll();
            this.chartConfig.timeWindow = this.displayPreferences.chartWindowSeconds;
            
            // Initialize other components
            await this.initializeChart();
            this.setupEventListeners();
            this.setupEMGSimulator();
            this.setupSerialManager();
            this.setupBluetoothManager();
            this.setupAIAssistant();
            await this.initializeUI();
            await this.restoreRecordingDraft();
            await this.onboardingTour.start();
            
            appDebug('DEMASY se inicializó correctamente');
        } catch (error) {
            console.error('No se pudo inicializar la aplicación:', error);
            this.showError('No se pudo inicializar DEMASY. Recarga la página e inténtalo nuevamente.');
        } finally {
            this.hideLoading();
        }
    }

    async initializeDatabase() {
        try {
            appDebug('Initializing database...');
            await this.database.initialize();
            
            // Initialize patient manager
            this.patientManager = new PatientManager(this.database);
            await this.patientManager.initialize();
            this.analysisManager = new AnalysisManager(this.database);
            this.settingsService = new SettingsService(this.database);
            this.backupManager = new BackupManager(this.database, this.settingsService, preferences => this.applyDisplayPreferences(preferences));
            
            appDebug('Database and patient manager initialized successfully');
        } catch (error) {
            console.error('Error initializing database:', error);
            throw error;
        }
    }

    showLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.classList.add('show');
        }
    }

    hideLoading() {
        setTimeout(() => {
            const overlay = document.getElementById('loading-overlay');
            if (overlay) {
                overlay.classList.remove('show');
            }
        }, 1000);
    }


    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                this.handleNavigation(e.target.closest('.nav-item'));
            });
            item.addEventListener('keydown', event => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    this.handleNavigation(item);
                }
            });
        });

        document.getElementById('mobile-menu-button')?.addEventListener('click', event => {
            const open = document.querySelector('.sidebar')?.classList.toggle('open') || false;
            event.currentTarget.setAttribute('aria-expanded', String(open));
            event.currentTarget.setAttribute('aria-label', open ? 'Cerrar menú principal' : 'Abrir menú principal');
        });

        document.getElementById('sidebar-collapse')?.addEventListener('click', event => {
            this.toggleSidebarCollapse();
            // A pointer click leaves focus on the button, which would keep the
            // focus-within preview open after the pointer exits. Preserve focus
            // only for keyboard activation.
            if (event.detail > 0) event.currentTarget.blur();
        });
        let sidebarCollapsed = false;
        try { sidebarCollapsed = window.localStorage.getItem('demasy.sidebarCollapsed') === 'true'; } catch {}
        this.setSidebarCollapsed(sidebarCollapsed, { persist: false });

        document.addEventListener('keydown', event => {
            if (event.key !== 'Escape') return;
            if (document.getElementById('ai-assistant')?.classList.contains('assistant-drawer-open')) {
                this.toggleAssistantPanel(false);
                return;
            }
            const modal = [...document.querySelectorAll('.modal-overlay')].at(-1);
            if (modal) modal.remove();
            document.querySelector('.sidebar')?.classList.remove('open');
            const menuButton = document.getElementById('mobile-menu-button');
            menuButton?.setAttribute('aria-expanded', 'false');
            menuButton?.setAttribute('aria-label', 'Abrir menú principal');
        });

        const annotateModal = modal => {
            modal.setAttribute('role', 'dialog');
            modal.setAttribute('aria-modal', 'true');
            const closeButton = modal.querySelector('.modal-close');
            if (closeButton && !closeButton.hasAttribute('aria-label')) closeButton.setAttribute('aria-label', 'Cerrar diálogo');
        };
        new MutationObserver(mutations => mutations.forEach(mutation => mutation.addedNodes.forEach(node => {
            if (!(node instanceof Element)) return;
            if (node.matches('.modal-overlay')) annotateModal(node);
            node.querySelectorAll?.('.modal-overlay').forEach(annotateModal);
        }))).observe(document.body, { childList: true, subtree: true });

        window.addEventListener('popstate', () => {
            this.navigateToSection(this.sectionRouter.getSection(window.location.pathname), { updateHistory: false });
        });

        window.addEventListener('beforeunload', event => {
            if (['recording', 'paused', 'review'].includes(this.recordingController.state)) {
                event.preventDefault();
                event.returnValue = '';
            }
        });

        // Recording controls
        const saveBtn = document.getElementById('save-session');
        const connectBtn = document.getElementById('connect-esp32');
        const disconnectBtn = document.getElementById('disconnect-esp32');
        const connectBleBtn = document.getElementById('connect-ble');
        const disconnectBleBtn = document.getElementById('disconnect-ble');
        
        appDebug('Button elements found:', {
            save: !!saveBtn,
            connect: !!connectBtn,
            disconnect: !!disconnectBtn,
            connectBle: !!connectBleBtn,
            disconnectBle: !!disconnectBleBtn
        });

        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                this.saveSession();
            });
        }

        document.getElementById('configure-session')?.addEventListener('click', () => {
            this.showSessionConfigurationForm();
        });

        document.getElementById('start-session')?.addEventListener('click', () => {
            this.startRecording();
        });

        document.getElementById('pause-session')?.addEventListener('click', () => {
            this.toggleRecordingPause();
        });

        document.getElementById('finish-session')?.addEventListener('click', () => {
            this.finishRecording();
        });

        document.getElementById('discard-session')?.addEventListener('click', () => {
            this.discardSession();
        });

        if (connectBtn) {
            connectBtn.addEventListener('click', () => {
                document.getElementById('esp32-connection-menu')?.removeAttribute('open');
                this.connectESP32();
            });
        }

        if (disconnectBtn) {
            disconnectBtn.addEventListener('click', () => {
                this.disconnectESP32();
            });
        }

        if (connectBleBtn) {
            connectBleBtn.addEventListener('click', () => {
                document.getElementById('esp32-connection-menu')?.removeAttribute('open');
                this.connectBluetoothESP32();
            });
        }

        if (disconnectBleBtn) {
            disconnectBleBtn.addEventListener('click', () => {
                this.disconnectBluetoothESP32();
            });
        }

        // Chart controls
        document.getElementById('muscle-select')?.addEventListener('change', (e) => {
            this.changeMuscle(e.target.value);
        });

        document.getElementById('freeze-chart')?.addEventListener('click', () => {
            this.toggleChartFreeze();
        });

        document.getElementById('reset-chart')?.addEventListener('click', () => {
            this.resetChart();
        });

        document.getElementById('clear-chart')?.addEventListener('click', () => {
            this.clearChart();
        });

        document.getElementById('calibrate-signal')?.addEventListener('click', () => {
            this.startSignalCalibration();
        });

        // Phase shifting controls
        document.getElementById('phase-shift-control')?.addEventListener('input', (e) => {
            this.setPhaseShift(parseInt(e.target.value));
        });

        document.getElementById('phase-auto-align')?.addEventListener('click', () => {
            this.autoAlignPhases();
        });

        document.getElementById('phase-reset')?.addEventListener('click', () => {
            this.resetPhaseShift();
        });

        document.getElementById('phase-invert')?.addEventListener('click', () => {
            this.invertPhase();
        });

        // AI Assistant
        document.getElementById('chat-input-field')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendChatMessage();
            }
        });

        document.getElementById('chat-input-field')?.addEventListener('input', (e) => {
            const sendButton = document.getElementById('send-chat');
            if (sendButton) {
                sendButton.disabled = e.target.value.trim() === '';
            }
        });

        document.getElementById('send-chat')?.addEventListener('click', () => {
            this.sendChatMessage();
        });

        document.getElementById('clear-chat')?.addEventListener('click', () => {
            this.clearChat();
        });

        document.getElementById('assistant-health')?.addEventListener('click', async () => {
            try {
                const health = await this.assistantService.remote.health();
                const message = health.geminiConfigured ? `Servicio remoto disponible (${health.model})` : 'Servidor disponible, pero Gemini no está configurado';
                this.showNotification(message, health.geminiConfigured ? 'success' : 'warning');
            } catch (error) { this.showNotification(`Servicio remoto no disponible: ${error.message}`, 'warning'); }
        });

        document.getElementById('assistant-launcher')?.addEventListener('click', () => this.toggleAssistantPanel());
        document.getElementById('assistant-panel-close')?.addEventListener('click', () => this.toggleAssistantPanel(false));
        document.getElementById('assistant-panel-backdrop')?.addEventListener('click', () => this.toggleAssistantPanel(false));

        // Chat suggestions
        document.querySelectorAll('.suggestion-chip').forEach(chip => {
            chip.addEventListener('click', (e) => {
                const suggestion = e.target.closest('.suggestion-chip').dataset.suggestion;
                if (suggestion) {
                    document.getElementById('chat-input-field').value = suggestion;
                    this.sendChatMessage();
                }
            });
        });
    }


    setupAIAssistant() {
        // Initialize AI assistant with cycling EMG context
        this.aiAssistant.updateEMGContext({
            muscle: 'quadriceps',
            activity: 'cycling',
            cadence: 80,
            resistance: 50,
            left: {
                rms: 0,
                peakAmplitude: 0,
                frequency: 65
            },
            right: {
                rms: 0,
                peakAmplitude: 0,
                frequency: 65
            },
            bilateral: {
                symmetryIndex: 100,
                asymmetryLevel: 'Normal',
                difference: 0,
                snr: 45.2,
                artifacts: 'Ninguno'
            },
            cycling: {
                pedalingEfficiency: 85,
                powerImbalance: 0,
                phase: 'Inicio'
            }
        });
        this.assistantService = new AssistantService({
            mode: 'remote',
            local: new LocalAssistantAdapter((message, context) => this.aiAssistant.processQuery(message, context)),
            remote: new RemoteAssistantAdapter({ timeoutMs: 8000 }),
            mock: new MockAssistantAdapter(),
            maximumHistory: 20
        });
        this.chatTranscript = this.chatTranscriptService.load();
        this.assistantService.restoreHistory(this.chatTranscript);
        this.chatTranscript.forEach(entry => this.addChatMessage(entry.type === 'assistant' ? 'ai' : 'user', entry.content, {
            source: entry.source,
            fallback: entry.fallback,
            restoring: true
        }));
        this.updateAssistantSource('remote');
    }

    async initializeUI() {
        // Set initial states
        this.updateConnectionStatus('mock');
        this.updateRecordingControls(false);
        this.updateSerialControls(false);
        this.updateBluetoothControls(false);
        this.recordingController.subscribe(() => this.updateRecordingWorkflowUI());
        this.startRecordingTimer();
        this.updateRecordingWorkflowUI();
        
        // Initialize bilateral statistics display
        this.updateStatistics({
            left: {
                rms: 0,
                peakAmplitude: 0,
                frequency: 0
            },
            right: {
                rms: 0,
                peakAmplitude: 0,
                frequency: 0
            },
            bilateral: {
                symmetryIndex: 100,
                asymmetryLevel: 'Normal',
                difference: 0,
                snr: 45.2,
                artifacts: 'Ninguno'
            }
        });

        // Initialize signal quality display
        this.updateSignalQuality({
            bilateral: {
                snr: 45.2,
                artifacts: 'Ninguno',
                asymmetryLevel: 'Normal'
            }
        });

        const initialSection = this.sectionRouter.getSection(window.location.pathname);
        await this.navigateToSection(initialSection, { replaceHistory: true });
    }

    async handleNavigation(navItem) {
        await this.navigateToSection(navItem.dataset.section);
        document.querySelector('.sidebar')?.classList.remove('open');
        const menuButton = document.getElementById('mobile-menu-button');
        menuButton?.setAttribute('aria-expanded', 'false');
        menuButton?.setAttribute('aria-label', 'Abrir menú principal');
    }

    async navigateToSection(section, options = {}) {
        const target = this.sectionRouter.routes[section] ? section : 'dashboard';
        this.currentSection = target;
        if (target === 'patients') await this.loadPatientsSection();
        if (target === 'analysis') await this.analysisManager?.render();
        if (target === 'settings') await this.backupManager?.render();
        document.querySelectorAll('.nav-item').forEach(item => {
            const active = item.dataset.section === target;
            item.classList.toggle('active', active);
            if (active) item.setAttribute('aria-current', 'page'); else item.removeAttribute('aria-current');
        });
        this.showSection(target);
        this.updatePageTitle(target);
        const emgHeaderActions = document.getElementById('emg-header-actions');
        if (emgHeaderActions) emgHeaderActions.hidden = target !== 'dashboard';
        const assistantLauncher = document.getElementById('assistant-launcher');
        if (assistantLauncher) assistantLauncher.hidden = target === 'ai-assistant';
        if (target === 'ai-assistant') this.toggleAssistantPanel(false);
        if (options.updateHistory !== false) {
            const method = options.replaceHistory ? 'replaceState' : 'pushState';
            window.history[method]({ section: target }, '', this.sectionRouter.getPath(target));
        }
    }

    toggleAssistantPanel(forceOpen) {
        const panel = document.getElementById('ai-assistant');
        const launcher = document.getElementById('assistant-launcher');
        const backdrop = document.getElementById('assistant-panel-backdrop');
        if (!panel || panel.classList.contains('active')) return;
        const open = typeof forceOpen === 'boolean'
            ? forceOpen
            : !panel.classList.contains('assistant-drawer-open');
        panel.classList.toggle('assistant-drawer-open', open);
        document.body.classList.toggle('assistant-panel-open', open);
        launcher?.setAttribute('aria-expanded', String(open));
        launcher?.setAttribute('aria-label', open ? 'Cerrar asistente DEMASY' : 'Abrir asistente DEMASY');
        if (backdrop) backdrop.hidden = !open;
        if (open) {
            window.setTimeout(() => {
                document.getElementById('chat-input-field')?.focus();
                const messages = document.getElementById('chat-messages');
                if (messages) messages.scrollTop = messages.scrollHeight;
            }, 50);
        } else {
            launcher?.focus({ preventScroll: true });
        }
    }

    startUserGuide() {
        return this.onboardingTour?.start({ force: true });
    }

    async loadPatientsSection() {
        const patientsContent = document.getElementById('patients-content');
        if (patientsContent && this.patientManager) {
            try {
                patientsContent.innerHTML = await this.patientManager.showPatientList();
                this.patientManager.setupPatientSearch();
            } catch (error) {
                console.error('Error loading patients section:', error);
                patientsContent.innerHTML = `
                    <div class="error-state">
                        <i class="fas fa-exclamation-triangle"></i>
                        <h3>Error al cargar pacientes</h3>
                        <p>${error.message}</p>
                        <button type="button" class="btn-control" id="retry-patients">Reintentar</button>
                    </div>
                `;
                document.getElementById('retry-patients')?.addEventListener('click', () => window.location.reload());
            }
        }
    }

    showSection(sectionId) {
        // Hide all sections
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });

        // Show target section
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.classList.add('active');
        }
    }

    updatePageTitle(section) {
        const titles = {
            dashboard: 'Monitoreo EMG Bilateral en Vivo',
            analysis: 'Análisis Avanzado',
            patients: 'Gestión de Pacientes',
            'ai-assistant': 'Asistente IA de Kinesiología',
            settings: 'Configuración de la Aplicación'
        };

        const titleElement = document.getElementById('section-title');
        if (titleElement && titles[section]) {
            titleElement.textContent = titles[section];
        }
    }



    updateRecordingControls(isRecording) {
        this.isRecording = isRecording;
        this.updateRecordingWorkflowUI();
    }

    setActionAvailability(element, available) {
        if (!element) return;
        element.disabled = !available;
        element.hidden = !available;
    }

    setElementVisibility(element, visible) {
        if (element) element.hidden = !visible;
    }

    updateConnectionControls() {
        const serialConnected = Boolean(this.serialManager?.isConnected);
        const bluetoothConnected = Boolean(this.bluetoothManager?.isConnected);
        const disconnected = !serialConnected && !bluetoothConnected;

        const connectionMenu = document.getElementById('esp32-connection-menu');
        const connectBtn = document.getElementById('connect-esp32');
        const disconnectBtn = document.getElementById('disconnect-esp32');
        const connectBleBtn = document.getElementById('connect-ble');
        const disconnectBleBtn = document.getElementById('disconnect-ble');

        this.setElementVisibility(connectionMenu, disconnected);
        this.setActionAvailability(connectBtn, disconnected);
        this.setActionAvailability(connectBleBtn, disconnected);
        this.setActionAvailability(disconnectBtn, serialConnected);
        this.setActionAvailability(disconnectBleBtn, bluetoothConnected);
        if (!disconnected) connectionMenu?.removeAttribute('open');
    }

    updateSerialControls() {
        this.updateConnectionControls();
    }

    updateBluetoothControls() {
        this.updateConnectionControls();
    }

    updateConnectionStatus(status) {
        const statusDot = document.querySelector('.status-dot');
        const statusText = document.querySelector('.connection-status span');
        
        if (statusDot) {
            statusDot.className = `status-dot ${status}`;
        }
        
        if (statusText) {
            const statusTexts = {
                mock: 'Modo simulación',
                recording: 'Grabando simulación',
                serial: 'ESP32 USB',
                bluetooth: 'ESP32 Bluetooth',
                'recording-serial': 'Grabando ESP32',
                'recording-bluetooth': 'Grabando Bluetooth',
                connected: 'ESP32 conectado',
                disconnected: 'Desconectado'
            };
            statusText.textContent = statusTexts[status] || 'Estado desconocido';
        }
    }

    async sendChatMessage() {
        const input = document.getElementById('chat-input-field');
        const message = input?.value.trim();
        
        if (!message || this.chatPending) return;
        
        // Add user message to chat
        this.addChatMessage('user', message);
        
        // Clear input
        if (input) {
            input.value = '';
            document.getElementById('send-chat').disabled = true;
        }
        
        this.chatPending = true;
        const sendButton = document.getElementById('send-chat');
        if (sendButton) sendButton.disabled = true;
        const loading = this.addChatLoading();

        try {
            const result = await this.assistantService.request(message, {
                ...this.getActiveSignalProvider().getStats(),
                activeSection: this.currentSection
            });
            if (result.remoteErrorCode === 'RATE_LIMIT') {
                this.addChatMessage('ai', this.formatAssistantRateLimit(result.retryAfterSeconds), { source: 'error' });
            }
            this.addChatMessage('ai', result.content, { source: result.source, fallback: result.fallback });
            this.updateAssistantSource(result.source, result.fallback, result.model);
        } catch (error) {
            console.error('Error getting AI response:', error);
            const content = error.code === 'RATE_LIMIT'
                ? this.formatAssistantRateLimit(error.retryAfterSeconds)
                : `No pude procesar la solicitud: ${error.message}`;
            this.addChatMessage('ai', content, { source: 'error' });
            this.updateAssistantSource('error');
        } finally {
            loading?.remove();
            this.chatPending = false;
            if (sendButton) sendButton.disabled = !input?.value.trim();
        }
    }

    formatAssistantRateLimit(retryAfterSeconds) {
        const seconds = Number(retryAfterSeconds);
        if (!Number.isFinite(seconds) || seconds <= 0) {
            return 'Se alcanzó el límite de uso del asistente remoto. Vuelve a intentarlo más tarde.';
        }
        const roundedMinutes = Math.ceil(seconds / 60);
        const wait = seconds < 60
            ? `${Math.ceil(seconds)} segundo${Math.ceil(seconds) === 1 ? '' : 's'}`
            : `${roundedMinutes} minuto${roundedMinutes === 1 ? '' : 's'}`;
        return `Se alcanzó el límite de uso del asistente remoto. Vuelve a intentarlo en aproximadamente ${wait}.`;
    }

    addChatLoading() {
        const messagesContainer = document.getElementById('chat-messages');
        if (!messagesContainer) return null;
        const element = document.createElement('div');
        element.className = 'message ai-message assistant-loading';
        element.setAttribute('role', 'status');
        element.innerHTML = '<div class="message-avatar"><i class="fas fa-robot"></i></div><div class="message-content"><span></span><span></span><span></span><em>Procesando consulta…</em></div>';
        messagesContainer.appendChild(element);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        return element;
    }

    updateAssistantSource(source, fallback = false, detail = null) {
        const badge = document.getElementById('assistant-source');
        if (!badge) return;
        const labels = { auto: 'Modo automático', local: fallback ? 'Asistente local · respaldo' : 'Asistente local', remote: 'Asistente remoto', mock: 'Asistente simulado', error: 'Error del asistente' };
        badge.textContent = detail && source === 'remote' ? `${labels[source]} · ${detail}` : labels[source] || 'Asistente local';
        badge.className = `assistant-source-badge ${source}`;
    }

    addChatMessage(type, content, metadata = {}) {
        const messagesContainer = document.getElementById('chat-messages');
        if (!messagesContainer) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}-message`;
        
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.innerHTML = type === 'ai' ? '<i class="fas fa-robot"></i>' : '<i class="fas fa-user"></i>';
        
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        
        const paragraph = document.createElement('p');
        paragraph.textContent = String(content ?? '');
        messageContent.appendChild(paragraph);
        if (type === 'ai' && metadata.source) {
            const source = document.createElement('small');
            source.className = 'message-source';
            source.textContent = metadata.fallback ? 'Respuesta local de respaldo' : ({ local: 'Respuesta local', remote: 'Respuesta remota', mock: 'Respuesta simulada', error: 'Error' }[metadata.source] || 'Respuesta local');
            messageContent.appendChild(source);
        }
        
        messageDiv.appendChild(avatar);
        messageDiv.appendChild(messageContent);
        
        messagesContainer.appendChild(messageDiv);

        if (!metadata.restoring) {
            this.chatTranscript.push({
                type: type === 'ai' ? 'assistant' : 'user',
                content: String(content ?? ''),
                source: metadata.source || null,
                fallback: Boolean(metadata.fallback)
            });
            this.chatTranscript = this.chatTranscriptService.save(this.chatTranscript);
        }
        
        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    clearChat() {
        const messagesContainer = document.getElementById('chat-messages');
        if (messagesContainer) {
            // Keep the initial welcome message
            const welcomeMessage = messagesContainer.querySelector('.ai-message');
            messagesContainer.innerHTML = '';
            if (welcomeMessage) {
                messagesContainer.appendChild(welcomeMessage);
            }
        }
        
        this.aiAssistant.clearHistory();
        this.assistantService?.clearHistory();
        this.chatTranscript = [];
        this.chatTranscriptService.clear();
        appDebug('Chat cleared');
    }

    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }

    getActiveSignalProvider() {
        if (this.signalSource === 'serial') return this.serialManager;
        if (this.signalSource === 'bluetooth') return this.bluetoothManager;
        return this.emgSimulator;
    }

    getConnectedSignalSource() {
        if (this.serialManager.isConnected) return 'serial';
        if (this.bluetoothManager.isConnected) return 'bluetooth';
        return 'simulator';
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Style the notification
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            border-radius: 0.5rem;
            color: white;
            font-weight: 500;
            z-index: 10000;
            transition: opacity 0.3s ease, transform 0.3s ease;
        `;
        
        // Set background color based on type
        const colors = {
            success: '#10b981',
            error: '#ef4444',
            warning: '#f59e0b',
            info: '#3b82f6'
        };
        notification.style.backgroundColor = colors[type] || colors.info;
        
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }

    showError(message) {
        this.showNotification(message, 'error');
    }
}


// Export for global access
window.KinesioEMGApp = KinesioEMGApp;
