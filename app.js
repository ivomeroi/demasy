/**
 * KinesioEMG - Main Application Controller
 * Manages EMG simulation, real-time visualization, AI assistant, and user interface
 */

class KinesioEMGApp {
    constructor() {
        console.log('Initializing KinesioEMG App...');
        
        try {
            // Initialize core components
            this.emgSimulator = new EMGSimulator();
            console.log('EMG Simulator created:', !!this.emgSimulator);

            this.serialManager = new EMGSerialManager();
            this.bluetoothManager = new EMGBluetoothManager();
            this.signalSource = 'simulator';
            console.log('Serial manager created:', !!this.serialManager);
            console.log('Bluetooth manager created:', !!this.bluetoothManager);
            
            this.aiAssistant = new KinesiologyAIAssistant();  
            console.log('AI Assistant created:', !!this.aiAssistant);
            
            // Initialize database and patient manager
            this.database = new DEMASYDatabase();
            this.patientManager = null; // Will be initialized after database
            this.analysisManager = null;
            this.backupManager = null;
            this.recordingController = new RecordingController();
            this.sessionConfigurationService = new SessionConfigurationService();
            this.sectionRouter = new SectionRouter();
            this.sessionReview = null;
            this.recordingTimerInterval = null;
            
            this.emgChart = null;
            this.isRecording = false;
            this.isPaused = false;
            this.sessionData = [];
            this.sessionStartTime = null;
            this.lastChartUpdateAt = 0;
            this.lastStatsUpdateAt = 0;
            this.lastSessionCaptureAt = 0;
            this.lastReadoutUpdateAt = 0;
            this.pendingChartData = [];
            this.signalExtremes = {
                min: null,
                max: null
            };
            
            console.log('KinesioEMG App constructor completed successfully');
        } catch (error) {
            console.error('Error in KinesioEMG App constructor:', error);
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
            yAxisAdcEquivalent: 1500,
            fixedYMin: -1500 * 3.3 * 1000 / 4095,
            fixedYMax: 1500 * 3.3 * 1000 / 4095,
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
            
            // Initialize other components
            await this.initializeChart();
            this.setupEventListeners();
            this.setupEMGSimulator();
            this.setupSerialManager();
            this.setupBluetoothManager();
            this.setupAIAssistant();
            await this.initializeUI();
            
            console.log('KinesioEMG application initialized successfully');
        } catch (error) {
            console.error('Failed to initialize application:', error);
            this.showError('Failed to initialize application. Please refresh and try again.');
        } finally {
            this.hideLoading();
        }
    }

    async initializeDatabase() {
        try {
            console.log('Initializing database...');
            await this.database.initialize();
            
            // Initialize patient manager
            this.patientManager = new PatientManager(this.database);
            await this.patientManager.initialize();
            this.analysisManager = new AnalysisManager(this.database);
            this.backupManager = new BackupManager(this.database);
            
            console.log('Database and patient manager initialized successfully');
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

    initializeChart() {
        const canvas = document.getElementById('emg-chart');
        if (!canvas) throw new Error('Chart canvas not found');

        const ctx = canvas.getContext('2d');
        
        // Initialize with empty data
        const initialData = Array(100).fill().map((_, i) => ({
            x: i * 0.01,
            y: 0
        }));

        this.emgChart = new Chart(ctx, {
            type: 'line',
            data: {
                datasets: [{
                    label: 'EMG Lado Izquierdo',
                    data: [...initialData],
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    borderWidth: 2,
                    pointRadius: 0,
                    pointHoverRadius: 0,
                    tension: 0.1,
                    fill: false
                }, {
                    label: 'EMG Lado Derecho',
                    data: [...initialData],
                    borderColor: '#dc2626',
                    backgroundColor: 'rgba(220, 38, 38, 0.1)',
                    borderWidth: 2,
                    pointRadius: 0,
                    pointHoverRadius: 0,
                    tension: 0.1,
                    fill: false
                }, {
                    label: 'RMS Izquierdo',
                    data: [...initialData],
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 2,
                    pointRadius: 0,
                    pointHoverRadius: 0,
                    tension: 0.25,
                    fill: false
                }, {
                    label: 'RMS Derecho',
                    data: [...initialData],
                    borderColor: '#f59e0b',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    borderWidth: 2,
                    pointRadius: 0,
                    pointHoverRadius: 0,
                    tension: 0.25,
                    fill: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                interaction: {
                    intersect: false,
                    mode: 'nearest'
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            boxWidth: 12,
                            padding: 20
                        }
                    },
                    tooltip: {
                        enabled: true,
                        mode: 'nearest',
                        intersect: false,
                        callbacks: {
                            title: function(tooltipItems) {
                                return `Time: ${tooltipItems[0].parsed.x.toFixed(2)}s`;
                            },
                            label: function(context) {
                                return `${context.dataset.label}: ${context.parsed.y.toFixed(1)} mV`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'linear',
                        position: 'bottom',
                        title: {
                            display: true,
                            text: 'Tiempo (segundos)'
                        },
                        min: 0,
                        max: this.chartConfig.timeWindow,
                        ticks: {
                            maxTicksLimit: 10
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Amplitud (mV)'
                        },
                        min: this.chartConfig.fixedYMin,
                        max: this.chartConfig.fixedYMax,
                        ticks: {
                            maxTicksLimit: 8
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    }
                }
            }
        });
    }

    updateChartMode() {
        if (!this.emgChart) return;

        const isSerial = this.signalSource === 'serial';
        const isBluetooth = this.signalSource === 'bluetooth';
        const isExternal = isSerial || isBluetooth;
        this.emgChart.data.datasets[0].label = isExternal ? 'Señal ESP32' : 'EMG Lado Izquierdo';
        this.emgChart.data.datasets[1].hidden = false;
        this.emgChart.data.datasets[1].label = isExternal ? 'Señal ESP32 Derecha' : 'EMG Lado Derecho';
        this.emgChart.data.datasets[2].label = isExternal ? 'RMS ESP32 Izquierdo' : 'RMS Izquierdo';
        this.emgChart.data.datasets[3].label = isExternal ? 'RMS ESP32 Derecho' : 'RMS Derecho';
        this.emgChart.update('none');
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                this.handleNavigation(e.target.closest('.nav-item'));
            });
        });

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
        
        console.log('Button elements found:', {
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

    setupEMGSimulator() {
        console.log('Setting up EMG simulator callbacks...');
        
        // Configure EMG simulator callbacks
        this.emgSimulator.onDataUpdate((data) => {
            if (!this.isPaused && this.signalSource === 'simulator') {
                this.ingestSignalData(data);
            }
        });

        this.emgSimulator.onStatsUpdate((stats) => {
            this.ingestStats(stats);
        });
        
        console.log('EMG simulator callbacks configured');

        // Set initial cycling parameters
        // Validate EMG simulator methods
        console.log('Validating EMG Simulator methods...');
        const requiredMethods = ['setPedalingEfficiency', 'setActivationLevel', 'start', 'stop'];
        const missingMethods = requiredMethods.filter(method => typeof this.emgSimulator[method] !== 'function');
        
        if (missingMethods.length > 0) {
            console.error('Missing EMG Simulator methods:', missingMethods);
        } else {
            console.log('All EMG Simulator methods available');
        }

        // Set initial cycling parameters
        console.log('Setting initial cycling parameters...');
        try {
            this.emgSimulator.setCadence(80); // 80 RPM
            this.emgSimulator.setResistance(0.5); // 50% resistance  
            this.emgSimulator.setPedalingEfficiency(0.85); // 85% efficiency
            this.emgSimulator.setActivationLevel(0.3, 'both'); // Light baseline activation
            this.emgSimulator.start();
            console.log('EMG Simulator initialized successfully');
        } catch (error) {
            console.error('Error initializing EMG Simulator:', error);
        }
    }

    setupSerialManager() {
        console.log('Setting up ESP32 serial callbacks...');

        this.serialManager.onDataUpdate((data) => {
            if (!this.isPaused && this.signalSource === 'serial') {
                this.ingestSignalData(data);
            }
        });

        this.serialManager.onStatsUpdate((stats) => {
            if (this.signalSource === 'serial') {
                this.ingestStats(stats);
            }
        });

        this.serialManager.onConnectionChange((status) => {
            const isConnected = status === 'connected';
            this.updateSerialControls(isConnected);
            this.signalSource = isConnected ? 'serial' : 'simulator';
            this.updateConnectionStatus(isConnected ? 'serial' : 'mock');
            this.updateChartMode();
        });

        this.serialManager.onError((error) => {
            console.error('ESP32 serial error:', error);
            this.showNotification(`Error de conexión ESP32: ${error.message}`, 'error');
            if (!this.serialManager.isConnected) {
                this.signalSource = 'simulator';
                this.updateConnectionStatus('mock');
                this.updateSerialControls(false);
            }
        });
    }

    setupBluetoothManager() {
        console.log('Setting up ESP32 Bluetooth callbacks...');

        this.bluetoothManager.onDataUpdate((data) => {
            if (!this.isPaused && this.signalSource === 'bluetooth') {
                this.ingestSignalData(data);
            }
        });

        this.bluetoothManager.onStatsUpdate((stats) => {
            if (this.signalSource === 'bluetooth') {
                this.ingestStats(stats);
            }
        });

        this.bluetoothManager.onConnectionChange((status) => {
            const isConnected = status === 'connected';
            this.updateBluetoothControls(isConnected);
            this.signalSource = isConnected ? 'bluetooth' : 'simulator';
            this.updateConnectionStatus(isConnected ? 'bluetooth' : 'mock');
            this.updateChartMode();
        });

        this.bluetoothManager.onError((error) => {
            console.error('ESP32 Bluetooth error:', error);
            this.showNotification(`Error Bluetooth ESP32: ${error.message}`, 'error');
            if (!this.bluetoothManager.isConnected) {
                this.signalSource = 'simulator';
                this.updateConnectionStatus('mock');
                this.updateBluetoothControls(false);
            }
        });
    }

    async connectESP32() {
        try {
            if (!this.serialManager.isSupported()) {
                this.showNotification('Web Serial requiere Chrome o Edge en localhost/HTTPS', 'error');
                return;
            }

            if (this.bluetoothManager.isConnected) {
                await this.disconnectBluetoothESP32();
            }

            await this.serialManager.connect({ baudRate: 115200 });
            this.emgSimulator.stop();
            this.serialManager.reset();
            this.serialManager.start();
            this.showNotification('ESP32 conectado por USB', 'success');
        } catch (error) {
            console.error('Error connecting ESP32:', error);
            this.showNotification(`No se pudo conectar el ESP32: ${error.message}`, 'error');
        }
    }

    async disconnectESP32() {
        try {
            this.serialManager.stop();
            await this.serialManager.disconnect();
            this.signalSource = 'simulator';
            this.emgSimulator.start();
            this.showNotification('ESP32 desconectado. Volviendo a simulación.', 'info');
        } catch (error) {
            console.error('Error disconnecting ESP32:', error);
            this.showNotification(`Error al desconectar ESP32: ${error.message}`, 'error');
        }
    }

    async connectBluetoothESP32() {
        try {
            if (!this.bluetoothManager.isSupported()) {
                this.showNotification('Web Bluetooth requiere Chrome o Edge en localhost/HTTPS', 'error');
                return;
            }

            if (this.serialManager.isConnected) {
                await this.disconnectESP32();
            }

            await this.bluetoothManager.connect();
            this.emgSimulator.stop();
            this.bluetoothManager.reset();
            this.bluetoothManager.start();
            this.showNotification('ESP32 master conectado por Bluetooth', 'success');
        } catch (error) {
            console.error('Error connecting Bluetooth ESP32:', error);
            this.showNotification(`No se pudo conectar Bluetooth: ${error.message}`, 'error');
        }
    }

    async disconnectBluetoothESP32() {
        try {
            this.bluetoothManager.stop();
            await this.bluetoothManager.disconnect();
            this.signalSource = 'simulator';
            this.emgSimulator.start();
            this.showNotification('Bluetooth desconectado. Volviendo a simulación.', 'info');
        } catch (error) {
            console.error('Error disconnecting Bluetooth ESP32:', error);
            this.showNotification(`Error al desconectar Bluetooth: ${error.message}`, 'error');
        }
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
    }

    async navigateToSection(section, options = {}) {
        const target = this.sectionRouter.routes[section] ? section : 'dashboard';
        if (target === 'patients') await this.loadPatientsSection();
        if (target === 'analysis') await this.analysisManager?.render();
        if (target === 'settings') this.backupManager?.render();
        document.querySelectorAll('.nav-item').forEach(item => item.classList.toggle('active', item.dataset.section === target));
        this.showSection(target);
        this.updatePageTitle(target);
        const emgHeaderActions = document.getElementById('emg-header-actions');
        if (emgHeaderActions) emgHeaderActions.hidden = target !== 'dashboard';
        if (options.updateHistory !== false) {
            const method = options.replaceHistory ? 'replaceState' : 'pushState';
            window.history[method]({ section: target }, '', this.sectionRouter.getPath(target));
        }
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
                        <button class="btn-control" onclick="location.reload()">Reintentar</button>
                    </div>
                `;
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

    startRecording() {
        console.log('Starting EMG recording...');
        
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
            this.resetSignalReadout();
            this.signalSource = this.getConnectedSignalSource();
            const configuration = this.recordingController.configuration;
            this.applySessionConfiguration(configuration);
            
            console.log('Updating UI controls...');
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
            console.log('Setting initial activation...');
            if (this.emgSimulator && typeof this.emgSimulator.setActivationLevel === 'function') {
                this.emgSimulator.setActivationLevel(0.4, 'both');
            }
            
            console.log('Starting EMG Simulator...');
            if (this.emgSimulator && typeof this.emgSimulator.start === 'function') {
                this.emgSimulator.resetSignal();
                this.emgSimulator.start();
                console.log('EMG Simulator started successfully');
                
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
        console.log('Starting cycling simulation sequences...');
        
        // Simple warm-up
        setTimeout(() => {
            console.log('Phase 1: Warm-up');
            try {
                if (this.emgSimulator.simulateWarmUp) {
                    this.emgSimulator.simulateWarmUp();
                }
            } catch (e) {
                console.log('Warm-up simulation not available, using basic activation');
                this.emgSimulator.setActivationLevel(0.6, 'both');
            }
        }, 2000);
        
        // Steady state
        setTimeout(() => {
            console.log('Phase 2: Steady State');
            try {
                if (this.emgSimulator.simulateSteadyStateCycling) {
                    this.emgSimulator.simulateSteadyStateCycling(15);
                } else {
                    this.emgSimulator.setActivationLevel(0.7, 'both');
                }
            } catch (e) {
                console.log('Steady state simulation not available');
            }
        }, 8000);
        
        // Asymmetric pattern
        setTimeout(() => {
            console.log('Phase 3: Asymmetric Pattern');
            try {
                if (this.emgSimulator.simulateAsymmetricPedaling) {
                    this.emgSimulator.simulateAsymmetricPedaling();
                } else {
                    this.emgSimulator.setAsymmetryFactor(0.7);
                    this.emgSimulator.setActivationLevel(0.6, 'both');
                }
            } catch (e) {
                console.log('Asymmetric simulation not available');
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
        
        console.log('EMG recording stopped');
    }

    toggleRecordingPause() {
        try {
            if (this.recordingController.state === 'recording') {
                this.recordingController.pause();
                this.showNotification('Grabación pausada; la previsualización continúa', 'info');
            } else if (this.recordingController.state === 'paused') {
                this.recordingController.resume();
                this.showNotification('Grabación reanudada', 'success');
            }
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

        if (configure) configure.disabled = !this.recordingController.can('configure');
        if (start) start.disabled = !this.recordingController.can('start');
        if (pause) {
            pause.disabled = !['recording', 'paused'].includes(state);
            pause.textContent = state === 'paused' ? 'Reanudar' : 'Pausar';
        }
        if (finish) finish.disabled = !this.recordingController.can('finish');
        if (discard) discard.disabled = !this.recordingController.can('discard');
        if (save) save.disabled = !this.recordingController.can('save') || this.sessionData.length === 0;
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
                    <button class="modal-close" type="button" aria-label="Cerrar">&times;</button>
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
                            <label for="session-config-muscle">Músculo</label>
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
                    <div class="session-review-metric"><span>Simetría</span><strong>${review.statistics.bilateral.symmetryIndex.toFixed(1)}%</strong></div>
                    <div class="session-review-metric"><span>RMS izquierdo</span><strong>${review.statistics.left.rms.toFixed(2)} mV</strong></div>
                    <div class="session-review-metric"><span>RMS derecho</span><strong>${review.statistics.right.rms.toFixed(2)} mV</strong></div>
                    <div class="session-review-metric"><span>Diferencia</span><strong>${review.statistics.bilateral.difference.toFixed(1)}%</strong></div>
                </div>
                <p><small>Datos generados mediante simulación. Los resultados son descriptivos y no constituyen un diagnóstico.</small></p>
                <div class="modal-actions">
                    <button class="btn-outline danger" data-action="discard">Descartar</button>
                    <button class="btn-control primary" data-action="save">Guardar sesión</button>
                </div>
            </div>`;
        document.body.appendChild(modal);
        modal.querySelector('[data-action="discard"]').addEventListener('click', () => this.discardSession());
        modal.querySelector('[data-action="save"]').addEventListener('click', () => this.saveSession());
    }

    muscleOptions(selected = 'quadriceps') {
        const labels = {
            quadriceps: 'Cuádriceps', gastrocnemius: 'Gastrocnemio', hamstring: 'Isquiotibiales',
            tibialis: 'Tibial anterior', gluteus: 'Glúteo', soleus: 'Sóleo'
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
        const labels = { quadriceps: 'Cuádriceps', gastrocnemius: 'Gastrocnemio', hamstring: 'Isquiotibiales', tibialis: 'Tibial anterior', gluteus: 'Glúteo', soleus: 'Sóleo' };
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
                sessionType: 'cycling',
                duration: duration,
                cadence: provider.cyclingParams?.cadence || 80,
                resistance: provider.cyclingParams?.resistance || 0.5,
                emgData: this.sessionData,
                statistics: provider.getStats(),
                notes: configuration.notes,
                configuration,
                source: configuration.source,
                label: configuration.label
            };

            const session = await this.patientManager.saveCurrentSession(sessionData);
            
            if (session) {
                this.recordingController.markSaved();
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

    changeMuscle(muscleType) {
        this.emgSimulator.setMuscle(muscleType);
        this.serialManager.setMuscle(muscleType);
        this.bluetoothManager.setMuscle(muscleType);
        this.resetChart();
        
        console.log(`Muscle changed to: ${muscleType}`);
        
        // Update AI context
        this.aiAssistant.updateEMGContext({
            ...this.aiAssistant.currentEMGContext,
            muscle: muscleType
        });
    }

    toggleChartFreeze() {
        this.isPaused = !this.isPaused;
        const button = document.getElementById('freeze-chart');
        const icon = button?.querySelector('i');
        
        if (icon) {
            if (this.isPaused) {
                icon.className = 'fas fa-play';
                button.title = 'Resume';
            } else {
                icon.className = 'fas fa-pause';
                button.title = 'Pause';
            }
        }
        
        console.log(`Chart ${this.isPaused ? 'paused' : 'resumed'}`);
    }

    resetChart() {
        if (this.emgChart) {
            const emptyData = Array(100).fill().map((_, i) => ({
                x: i * 0.01,
                y: 0
            }));
            
            // Reset EMG datasets (left EMG, right EMG)
            this.emgChart.data.datasets.forEach(dataset => {
                dataset.data = [...emptyData];
            });
            
            this.emgChart.update('none');
        }
        
        this.getActiveSignalProvider().reset();
        console.log('Chart reset');
    }

    clearChart() {
        if (!this.emgChart) return;

        this.emgChart.data.datasets.forEach(dataset => {
            dataset.data = [];
        });

        this.pendingChartData = [];
        this.lastChartUpdateAt = 0;
        this.resetSignalReadout();
        this.emgChart.options.scales.x.min = 0;
        this.emgChart.options.scales.x.max = this.chartConfig.timeWindow;
        this.emgChart.update('none');

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
        console.log(`Time delay set to ${degrees}° equivalent`);
        
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
        console.log(`Auto-align completed: ${newPhase}° equivalent`);
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
        console.log('Time delay reset to 0°');
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
        console.log(`Time delay inverted: ${newPhase}° equivalent`);
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

        const leftEMGDataset = this.emgChart.data.datasets[0];
        const rightEMGDataset = this.emgChart.data.datasets[1];
        const leftRmsDataset = this.emgChart.data.datasets[2];
        const rightRmsDataset = this.emgChart.data.datasets[3];

        sampleList.forEach(data => {
            leftEMGDataset.data.push({
                x: data.time,
                y: data.left.amplitude
            });

            rightEMGDataset.data.push({
                x: data.time,
                y: Number.isFinite(data.right.amplitude) ? data.right.amplitude : null
            });

            leftRmsDataset.data.push({
                x: data.time,
                y: Number.isFinite(data.envelopeLeft) ? data.envelopeLeft : this.calculateRMSFromDataset(leftEMGDataset)
            });

            rightRmsDataset.data.push({
                x: data.time,
                y: Number.isFinite(data.envelopeRight) ? data.envelopeRight : this.calculateRMSFromDataset(rightEMGDataset)
            });
        });

        // Maintain data point limit for EMG datasets only
        const datasets = [leftEMGDataset, rightEMGDataset, leftRmsDataset, rightRmsDataset];
        datasets.forEach(dataset => {
            if (dataset.data.length > this.chartConfig.maxDataPoints) {
                dataset.data.shift();
            }
        });

        // Update time window
        const latestTime = sampleList[sampleList.length - 1].time;
        this.emgChart.options.scales.x.min = Math.max(0, latestTime - this.chartConfig.timeWindow);
        this.emgChart.options.scales.x.max = Math.max(this.chartConfig.timeWindow, latestTime);
        this.updateVisibleSignalRange(datasets);

        // Update chart
        this.emgChart.update('none');
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

        if (!this.sessionStartTime) {
            this.sessionStartTime = new Date();
        }

        this.trackSignalValue(data.left.amplitude);
        this.pendingChartData.push(data);

        if (
            this.recordingController.state === 'recording' &&
            now - this.lastSessionCaptureAt >= this.chartConfig.sessionCaptureInterval
        ) {
            this.lastSessionCaptureAt = now;
            this.sessionData.push(data);

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
            this.updateCurrentSignalReadout(data.left.amplitude);
        }
    }

    ingestStats(stats) {
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
        // Update bilateral statistics
        this.updateElement('rms-left', this.formatVoltageStat(stats.left.rms));
        this.updateElement('rms-right', this.formatVoltageStat(stats.right.rms));
        this.updateElement('peak-left', this.formatVoltageStat(stats.left.peakAmplitude));
        this.updateElement('peak-right', this.formatVoltageStat(stats.right.peakAmplitude));
        
        // Update comparison statistics
        this.updateElement('symmetry-index', `${stats.bilateral.symmetryIndex.toFixed(0)}%`);
        this.updateElement('asymmetry-level', stats.bilateral.asymmetryLevel);
        this.updateElement('bilateral-difference', `${stats.bilateral.difference.toFixed(1)}%`);
        
        // Update activation levels for both sides
        const activationReference = Math.max(1, this.chartConfig.fixedYMax);
        const leftActivation = (stats.left.rms / activationReference) * 100;
        const rightActivation = (stats.right.rms / activationReference) * 100;
        
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

    updateRecordingControls(isRecording) {
        this.isRecording = isRecording;
        this.updateRecordingWorkflowUI();
    }

    updateSerialControls(isConnected) {
        const connectBtn = document.getElementById('connect-esp32');
        const disconnectBtn = document.getElementById('disconnect-esp32');

        if (connectBtn) connectBtn.disabled = isConnected;
        if (disconnectBtn) disconnectBtn.disabled = !isConnected;
    }

    updateBluetoothControls(isConnected) {
        const connectBtn = document.getElementById('connect-ble');
        const disconnectBtn = document.getElementById('disconnect-ble');

        if (connectBtn) connectBtn.disabled = isConnected;
        if (disconnectBtn) disconnectBtn.disabled = !isConnected;
    }

    updateConnectionStatus(status) {
        const statusDot = document.querySelector('.status-dot');
        const statusText = document.querySelector('.connection-status span');
        
        if (statusDot) {
            statusDot.className = `status-dot ${status}`;
        }
        
        if (statusText) {
            const statusTexts = {
                mock: 'Mock Mode',
                recording: 'Recording',
                serial: 'ESP32 USB',
                bluetooth: 'ESP32 Bluetooth',
                'recording-serial': 'Recording ESP32',
                'recording-bluetooth': 'Recording Bluetooth',
                connected: 'ESP32 Connected',
                disconnected: 'Disconnected'
            };
            statusText.textContent = statusTexts[status] || 'Unknown';
        }
    }

    async sendChatMessage() {
        const input = document.getElementById('chat-input-field');
        const message = input?.value.trim();
        
        if (!message) return;
        
        // Add user message to chat
        this.addChatMessage('user', message);
        
        // Clear input
        if (input) {
            input.value = '';
            document.getElementById('send-chat').disabled = true;
        }
        
        try {
            // Get AI response
            const response = await this.aiAssistant.processQuery(
                message, 
                this.getActiveSignalProvider().getStats()
            );
            
            // Add AI response to chat
            setTimeout(() => {
                this.addChatMessage('ai', response);
            }, 1000); // Simulate thinking time
            
        } catch (error) {
            console.error('Error getting AI response:', error);
            this.addChatMessage('ai', 'I apologize, but I encountered an error processing your request. Please try again.');
        }
    }

    addChatMessage(type, content) {
        const messagesContainer = document.getElementById('chat-messages');
        if (!messagesContainer) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}-message`;
        
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.innerHTML = type === 'ai' ? '<i class="fas fa-robot"></i>' : '<i class="fas fa-user"></i>';
        
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        
        // Convert markdown-like formatting to HTML
        const formattedContent = content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br>');
        
        messageContent.innerHTML = `<p>${formattedContent}</p>`;
        
        messageDiv.appendChild(avatar);
        messageDiv.appendChild(messageContent);
        
        messagesContainer.appendChild(messageDiv);
        
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
        console.log('Chat cleared');
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
            transition: all 0.3s ease;
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

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new KinesioEMGApp();
});

// Export for global access
window.KinesioEMGApp = KinesioEMGApp;
