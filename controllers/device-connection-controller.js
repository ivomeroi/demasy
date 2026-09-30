(function registerDeviceConnectionControllerMethods() {
    const AppController = window.KinesioEMGApp;
    if (!AppController) throw new Error('KinesioEMGApp debe cargarse antes que DeviceConnectionControllerMethods');

    class DeviceConnectionControllerMethods {
    setupEMGSimulator() {
        appDebug('Setting up EMG simulator callbacks...');
        
        // Configure EMG simulator callbacks
        this.emgSimulator.onDataUpdate((data) => {
            if (!this.isPaused && this.signalSource === 'simulator') {
                this.ingestSignalData(data);
            }
        });

        this.emgSimulator.onStatsUpdate((stats) => {
            this.ingestStats(stats);
        });
        
        appDebug('EMG simulator callbacks configured');

        // Set initial cycling parameters
        // Validate EMG simulator methods
        appDebug('Validating EMG Simulator methods...');
        const requiredMethods = ['setPedalingEfficiency', 'setActivationLevel', 'start', 'stop'];
        const missingMethods = requiredMethods.filter(method => typeof this.emgSimulator[method] !== 'function');
        
        if (missingMethods.length > 0) {
            console.error('Missing EMG Simulator methods:', missingMethods);
        } else {
            appDebug('All EMG Simulator methods available');
        }

        // Set initial cycling parameters
        appDebug('Setting initial cycling parameters...');
        try {
            this.emgSimulator.setCadence(80); // 80 RPM
            this.emgSimulator.setResistance(0.5); // 50% resistance  
            this.emgSimulator.setPedalingEfficiency(0.85); // 85% efficiency
            this.emgSimulator.setActivationLevel(0.3, 'both'); // Light baseline activation
            this.emgSimulator.start();
            appDebug('EMG Simulator initialized successfully');
        } catch (error) {
            console.error('Error initializing EMG Simulator:', error);
        }
    }

    setupSerialManager() {
        appDebug('Setting up ESP32 serial callbacks...');

        this.serialManager.onDataUpdate((data) => {
            this.updateSensorConnectionIndicators(data.sensorStatus);
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
            if (!isConnected) this.updateSensorConnectionIndicators(null);
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
        appDebug('Setting up ESP32 Bluetooth callbacks...');

        this.bluetoothManager.onDataUpdate((data) => {
            this.updateSensorConnectionIndicators(data.sensorStatus);
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
            if (!isConnected) this.updateSensorConnectionIndicators(null);
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
            const supportError = this.bluetoothManager.getSupportError();
            if (supportError) {
                this.showNotification(supportError, 'error');
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

    updateSensorConnectionIndicators(sensorStatus) {
        const labels = [
            'S1 · Flexor izquierdo',
            'S2 · Flexor derecho',
            'S3 · Extensor izquierdo',
            'S4 · Extensor derecho'
        ];
        labels.forEach((label, index) => {
            const indicator = document.getElementById(`sensor-link-${index + 1}`);
            if (!indicator) return;
            const active = Array.isArray(sensorStatus) ? sensorStatus[index] === true : false;
            indicator.dataset.connected = active ? 'true' : 'false';
            indicator.title = `${label}: ${active ? 'conectado y transmitiendo' : 'sin datos recientes'}`;
            indicator.setAttribute('aria-label', indicator.title);
            const state = indicator.querySelector('.sensor-link-state');
            if (state) state.textContent = active ? 'Activo' : 'Sin señal';
        });
    }

    }

    for (const method of Object.getOwnPropertyNames(DeviceConnectionControllerMethods.prototype)) {
        if (method === 'constructor') continue;
        Object.defineProperty(
            AppController.prototype,
            method,
            Object.getOwnPropertyDescriptor(DeviceConnectionControllerMethods.prototype, method)
        );
    }
}());
