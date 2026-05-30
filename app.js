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
            
            this.aiAssistant = new KinesiologyAIAssistant();  
            console.log('AI Assistant created:', !!this.aiAssistant);
            
            // Initialize database and patient manager
            this.database = new KinesioEMGDatabase();
            this.patientManager = null; // Will be initialized after database
            
            this.emgChart = null;
            this.isRecording = false;
            this.isPaused = false;
            this.sessionData = [];
            this.sessionStartTime = null;
            
            console.log('KinesioEMG App constructor completed successfully');
        } catch (error) {
            console.error('Error in KinesioEMG App constructor:', error);
        }
        
        // Chart configuration
        this.chartConfig = {
            maxDataPoints: 1000,
            updateInterval: 50, // ms
            timeWindow: 1 // seconds
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
            this.setupAIAssistant();
            this.initializeUI();
            
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
                }]
                // Datasets de activación temporalmente removidos completamente
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
                                return `${context.dataset.label}: ${context.parsed.y.toFixed(3)} mV`;
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
                        min: -3,
                        max: 3,
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

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                this.handleNavigation(e.target.closest('.nav-item'));
            });
        });

        // Recording controls
        const startBtn = document.getElementById('start-recording');
        const stopBtn = document.getElementById('stop-recording');
        const saveBtn = document.getElementById('save-session');
        
        console.log('Button elements found:', {
            start: !!startBtn,
            stop: !!stopBtn, 
            save: !!saveBtn
        });
        
        if (startBtn) {
            startBtn.addEventListener('click', () => {
                console.log('Start recording button clicked');
                
                // Test if button click is working
                this.showNotification('¡Botón funciona! Iniciando simulación EMG...', 'success');
                
                this.startRecording();
            });
        } else {
            console.error('Start recording button not found!');
        }

        if (stopBtn) {
            stopBtn.addEventListener('click', () => {
                this.stopRecording();
            });
        }

        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                this.saveSession();
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
            if (!this.isPaused && this.isRecording) {
                this.updateChart(data);
                this.sessionData.push(data);
            }
        });

        this.emgSimulator.onStatsUpdate((stats) => {
            this.updateStatistics(stats);
            this.updateSignalQuality(stats);
            this.aiAssistant.updateEMGContext(stats);
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
            console.log('EMG Simulator initialized successfully');
        } catch (error) {
            console.error('Error initializing EMG Simulator:', error);
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

    initializeUI() {
        // Set initial states
        this.updateConnectionStatus('mock');
        this.updateRecordingControls(false);
        
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

        // Set initial section
        this.showSection('dashboard');
    }

    async handleNavigation(navItem) {
        // Remove active class from all nav items
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });

        // Add active class to clicked item
        navItem.classList.add('active');

        // Show corresponding section
        const section = navItem.dataset.section;
        
        // Special handling for patients section
        if (section === 'patients') {
            await this.loadPatientsSection();
        }
        
        this.showSection(section);

        // Update page title
        this.updatePageTitle(section);
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
            this.isRecording = true;
            this.sessionData = [];
            this.sessionStartTime = new Date();
            
            console.log('Updating UI controls...');
            this.updateRecordingControls(true);
            this.updateConnectionStatus('recording');
            
            // Set initial activation for cycling
            console.log('Setting initial activation...');
            if (this.emgSimulator && typeof this.emgSimulator.setActivationLevel === 'function') {
                this.emgSimulator.setActivationLevel(0.4, 'both');
            }
            
            console.log('Starting EMG Simulator...');
            if (this.emgSimulator && typeof this.emgSimulator.start === 'function') {
                this.emgSimulator.start();
                console.log('EMG Simulator started successfully');
                
                // Show notification based on whether a patient is selected
                if (this.patientManager?.currentPatient) {
                    this.showNotification(`Sesión iniciada para ${this.patientManager.currentPatient.name}`, 'success');
                } else {
                    this.showNotification('Simulación EMG iniciada - Selecciona un paciente para guardar la sesión', 'info');
                }
                
                // Simple cycling patterns with error handling
                setTimeout(() => {
                    this.startCyclingSimulations();
                }, 1000);
                
            } else {
                throw new Error('EMG Simulator not properly initialized');
            }
            
        } catch (error) {
            console.error('Error starting recording:', error);
            this.showNotification('Error al iniciar la grabación: ' + error.message, 'error');
            this.isRecording = false;
            this.updateRecordingControls(false);
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
        this.emgSimulator.stop();
        
        this.updateRecordingControls(false);
        this.updateConnectionStatus('mock');
        
        console.log('EMG recording stopped');
    }

    async saveSession() {
        if (this.sessionData.length === 0) {
            this.showNotification('No hay datos para guardar', 'warning');
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
            const duration = this.sessionStartTime 
                ? Math.floor((Date.now() - this.sessionStartTime.getTime()) / 1000)
                : Math.floor(this.sessionData.length / this.emgSimulator.sampleRate);

            const sessionData = {
                muscleType: this.emgSimulator.currentMuscle,
                sessionType: 'cycling',
                duration: duration,
                cadence: this.emgSimulator.cyclingParams?.cadence || 80,
                resistance: this.emgSimulator.cyclingParams?.resistance || 0.5,
                emgData: this.sessionData,
                statistics: this.emgSimulator.getStats(),
                notes: ''
            };

            const session = await this.patientManager.saveCurrentSession(sessionData);
            
            if (session) {
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
        const sessionInfo = {
            timestamp: new Date().toISOString(),
            muscle: this.emgSimulator.currentMuscle,
            duration: this.sessionStartTime 
                ? Math.floor((Date.now() - this.sessionStartTime.getTime()) / 1000)
                : Math.floor(this.sessionData.length / this.emgSimulator.sampleRate),
            dataPoints: this.sessionData.length,
            stats: this.emgSimulator.getStats(),
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
        
        this.emgSimulator.reset();
        console.log('Chart reset');
    }

    // Cadence and resistance controls removed from UI
    // Internal values are set during initialization and remain constant

    // Temporal delay controls for signal superposition
    setPhaseShift(degrees) {
        this.emgSimulator.setTimeDelay(degrees, 'right');
        this.updateElement('phase-display', degrees);
        console.log(`Time delay set to ${degrees}° equivalent`);
        
        // Show notification for significant delays
        if (Math.abs(degrees) > 90) {
            this.showNotification(`Desfase temporal significativo aplicado: ${degrees}°`, 'info');
        }
    }

    autoAlignPhases() {
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
        const baseEfficiency = this.emgSimulator.cyclingParams.pedalingEfficiency * 100;
        const adjustedEfficiency = baseEfficiency * (symmetry / 100);
        
        this.updateElement('pedaling-efficiency', `${Math.round(adjustedEfficiency)}%`);
        
        // Power imbalance (same as bilateral difference but contextualized for cycling)
        this.updateElement('power-imbalance', `${stats.bilateral.difference.toFixed(1)}%`);
    }

    updatePedalPositions() {
        if (this.emgSimulator.cyclingParams) {
            const leftAngle = Math.round(this.emgSimulator.cyclingParams.pedalPosition.left * 180 / Math.PI);
            const rightAngle = Math.round(this.emgSimulator.cyclingParams.pedalPosition.right * 180 / Math.PI);
            
            this.updateElement('pedal-left', `Izq: ${leftAngle}°`);
            this.updateElement('pedal-right', `Der: ${rightAngle}°`);
        }
    }

    updateChart(data) {
        if (!this.emgChart || this.isPaused) return;

        const leftEMGDataset = this.emgChart.data.datasets[0];
        const rightEMGDataset = this.emgChart.data.datasets[1];
        // Activation datasets temporalmente removidos
        // const leftActivationDataset = this.emgChart.data.datasets[2];
        // const rightActivationDataset = this.emgChart.data.datasets[3];
        
        // const maxAmplitude = this.emgSimulator.muscleProfiles[this.emgSimulator.currentMuscle]?.maxAmplitude || 1.5;
        
        // Add new bilateral EMG data points only
        leftEMGDataset.data.push({
            x: data.time,
            y: data.left.amplitude
        });
        
        rightEMGDataset.data.push({
            x: data.time,
            y: data.right.amplitude
        });
        
        // Activation envelope updates temporalmente comentadas
        // leftActivationDataset.data.push({
        //     x: data.time,
        //     y: data.left.activation * maxAmplitude
        // });
        
        // rightActivationDataset.data.push({
        //     x: data.time,
        //     y: data.right.activation * maxAmplitude
        // });

        // Maintain data point limit for EMG datasets only
        const datasets = [leftEMGDataset, rightEMGDataset];
        datasets.forEach(dataset => {
            if (dataset.data.length > this.chartConfig.maxDataPoints) {
                dataset.data.shift();
            }
        });

        // Update time window
        const latestTime = data.time;
        this.emgChart.options.scales.x.min = Math.max(0, latestTime - this.chartConfig.timeWindow);
        this.emgChart.options.scales.x.max = Math.max(this.chartConfig.timeWindow, latestTime);

        // Update chart
        this.emgChart.update('none');
    }

    updateStatistics(stats) {
        // Update bilateral statistics
        this.updateElement('rms-left', `${stats.left.rms.toFixed(2)} mV`);
        this.updateElement('rms-right', `${stats.right.rms.toFixed(2)} mV`);
        this.updateElement('peak-left', `${stats.left.peakAmplitude.toFixed(2)} mV`);
        this.updateElement('peak-right', `${stats.right.peakAmplitude.toFixed(2)} mV`);
        
        // Update comparison statistics
        this.updateElement('symmetry-index', `${stats.bilateral.symmetryIndex.toFixed(0)}%`);
        this.updateElement('asymmetry-level', stats.bilateral.asymmetryLevel);
        this.updateElement('bilateral-difference', `${stats.bilateral.difference.toFixed(1)}%`);
        
        // Update activation levels for both sides
        const leftActivation = (stats.left.rms / 2.0) * 100; // Normalize to percentage
        const rightActivation = (stats.right.rms / 2.0) * 100;
        
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
        const startBtn = document.getElementById('start-recording');
        const stopBtn = document.getElementById('stop-recording');
        const saveBtn = document.getElementById('save-session');
        
        if (startBtn) startBtn.disabled = isRecording;
        if (stopBtn) stopBtn.disabled = !isRecording;
        if (saveBtn) saveBtn.disabled = isRecording || this.sessionData.length === 0;
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
                this.emgSimulator.getStats()
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