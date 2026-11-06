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
            this.latestSensorStatus = data.sensorStatus;
            this.updateSensorConnectionIndicators(data.sensorStatus, data.batteryMv);
            if (!this.isPaused && this.signalSource === 'serial') {
                this.ingestSignalData(data);
            } else if (this.signalSource === 'serial') {
                this.diagnosticLog.recordSample(data, null, { source: 'serial', paused: true });
            }
        });

        this.serialManager.onStatsUpdate((stats) => {
            if (this.signalSource === 'serial') {
                this.ingestStats(stats);
            }
        });

        this.serialManager.onConnectionChange((status) => {
            const isConnected = status === 'connected';
            if (isConnected) {
                this.diagnosticLog.beginRun({ transport: 'serial', device: { type: 'ESP32 master USB' } });
                this.diagnosticLog.recordEvent('base-connection', { transport: 'serial', status });
            } else {
                this.diagnosticLog.recordEvent('base-connection', { transport: 'serial', status });
                this.diagnosticLog.endRun('serial-disconnected').catch(error => console.error('No se pudo cerrar el diagnóstico:', error));
            }
            this.updateSerialControls(isConnected);
            this.signalSource = isConnected ? 'serial' : 'simulator';
            if (!isConnected) this.updateSensorConnectionIndicators(null);
            this.updateConnectionStatus(isConnected ? 'serial' : 'mock');
            this.updateChartMode();
        });

        this.serialManager.onError((error) => {
            this.diagnosticLog.recordEvent('source-error', { transport: 'serial', message: error.message });
            console.error('ESP32 serial error:', error);
            this.showNotification(`Error de conexión ESP32: ${error.message}`, 'error');
            if (!this.serialManager.isConnected) {
                this.signalSource = 'simulator';
                this.updateConnectionStatus('mock');
                this.updateSerialControls(false);
            }
        });
        this.serialManager.onDiagnostic(event => this.diagnosticLog.recordEvent(event.type, { transport: 'serial', ...event }));
    }

    setupBluetoothManager() {
        appDebug('Setting up ESP32 Bluetooth callbacks...');

        this.bluetoothManager.onDataUpdate((data) => {
            this.latestSensorStatus = data.sensorStatus;
            this.updateSensorConnectionIndicators(data.sensorStatus, data.batteryMv);
            if (!this.isPaused && this.signalSource === 'bluetooth') {
                this.ingestSignalData(data);
            } else if (this.signalSource === 'bluetooth') {
                this.diagnosticLog.recordSample(data, null, { source: 'bluetooth', paused: true });
            }
        });

        this.bluetoothManager.onStatsUpdate((stats) => {
            if (this.signalSource === 'bluetooth') {
                this.ingestStats(stats);
            }
        });

        this.bluetoothManager.onConnectionChange((status) => {
            const isConnected = status === 'connected';
            if (isConnected) {
                this.diagnosticLog.beginRun({
                    transport: 'bluetooth',
                    device: { name: this.bluetoothManager.device?.name || 'DEMASY master' }
                });
                this.diagnosticLog.recordEvent('base-connection', { transport: 'bluetooth', status });
            } else {
                this.diagnosticLog.recordEvent('base-connection', { transport: 'bluetooth', status });
                this.diagnosticLog.endRun('bluetooth-disconnected').catch(error => console.error('No se pudo cerrar el diagnóstico:', error));
            }
            this.updateBluetoothControls(isConnected);
            this.signalSource = isConnected ? 'bluetooth' : 'simulator';
            if (!isConnected) this.updateSensorConnectionIndicators(null);
            this.updateConnectionStatus(isConnected ? 'bluetooth' : 'mock');
            this.updateChartMode();
        });

        this.bluetoothManager.onError((error) => {
            this.diagnosticLog.recordEvent('source-error', { transport: 'bluetooth', message: error.message });
            console.error('ESP32 Bluetooth error:', error);
            this.showNotification(`Error Bluetooth ESP32: ${error.message}`, 'error');
            if (!this.bluetoothManager.isConnected) {
                this.signalSource = 'simulator';
                this.updateConnectionStatus('mock');
                this.updateBluetoothControls(false);
            }
        });
        this.bluetoothManager.onDiagnostic(event => this.diagnosticLog.recordEvent(event.type, { transport: 'bluetooth', ...event }));
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

    batteryPercentageFromMv(millivolts) {
        const voltage = Number(millivolts);
        if (!Number.isFinite(voltage) || voltage < 2500 || voltage > 4350) return null;
        const curve = [
            [3300, 0], [3400, 5], [3500, 10], [3600, 20], [3700, 35],
            [3800, 50], [3900, 65], [4000, 80], [4100, 90], [4200, 100]
        ];
        if (voltage <= curve[0][0]) return 0;
        if (voltage >= curve[curve.length - 1][0]) return 100;
        for (let index = 1; index < curve.length; index++) {
            const [upperMv, upperPercent] = curve[index];
            const [lowerMv, lowerPercent] = curve[index - 1];
            if (voltage <= upperMv) {
                const position = (voltage - lowerMv) / (upperMv - lowerMv);
                return Math.round(lowerPercent + position * (upperPercent - lowerPercent));
            }
        }
        return null;
    }

    updateBatteryIndicator(id, millivolts, available) {
        const indicator = document.getElementById(id);
        if (!indicator) return;
        const voltage = Number(millivolts);
        const percentage = available ? this.batteryPercentageFromMv(voltage) : null;
        const value = indicator.querySelector('.battery-value');
        const meter = indicator.querySelector('.battery-meter-fill');
        const validVoltage = Number.isFinite(voltage) && voltage > 0;
        const invalid = available && validVoltage && percentage === null;
        const status = !available || !validVoltage
            ? 'unavailable'
            : invalid ? 'invalid'
                : percentage <= 10 ? 'critical'
                    : percentage <= 25 ? 'low' : 'good';
        indicator.dataset.batteryStatus = status;
        indicator.hidden = !available;
        if (value) {
            value.textContent = invalid ? 'Lectura inválida' : percentage === null ? '—' : `${percentage}%`;
        }
        if (meter) {
            meter.style.width = `${percentage ?? 0}%`;
            meter.parentElement?.setAttribute('aria-valuenow', percentage === null ? '0' : String(percentage));
        }
        const voltageLabel = validVoltage ? `${(voltage / 1000).toFixed(2)} V` : 'sin lectura';
        indicator.title = invalid
            ? `${voltageLabel}: fuera del rango esperado para una batería Li-ion de una celda`
            : `${percentage ?? 0}% · ${voltageLabel} (estimación)`;
        indicator.setAttribute('aria-label', indicator.title);
    }

    updateSensorConnectionIndicators(sensorStatus, batteryMv = null) {
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
            this.updateBatteryIndicator(`battery-s${index + 1}`, batteryMv?.sensors?.[index], active);
        });
        const baseAvailable = Array.isArray(sensorStatus) && Number(batteryMv?.base) > 0;
        this.updateBatteryIndicator('battery-base', batteryMv?.base, baseAvailable);
        if (Array.isArray(sensorStatus)) {
            const previous = this.previousDiagnosticSensorStatus;
            sensorStatus.forEach((active, index) => {
                if (!previous || previous[index] !== active) {
                    this.diagnosticLog.recordEvent('sensor-status', {
                        sensor: index + 1,
                        channel: ['flexor-left', 'flexor-right', 'extensor-left', 'extensor-right'][index],
                        status: active ? 'transmitting' : 'inactive'
                    });
                }
            });
            this.previousDiagnosticSensorStatus = [...sensorStatus];
        } else if (this.previousDiagnosticSensorStatus) {
            this.previousDiagnosticSensorStatus = null;
        }
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
