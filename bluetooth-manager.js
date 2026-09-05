/**
 * ESP32 master Web Bluetooth EMG Reader
 * Reads Nordic UART Service notifications from the BLE sketch.
 */

class EMGBluetoothManager extends EMGSerialManager {
    constructor() {
        super();
        this.device = null;
        this.server = null;
        this.txCharacteristic = null;
        this.pendingText = '';
        this.serviceUuid = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
        this.txUuid = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';
        this.sampleRate = 200;
        this.useFixedSampleClock = true;
    }

    isSupported() {
        return 'bluetooth' in navigator;
    }

    async connect() {
        if (!this.isSupported()) {
            throw new Error('Web Bluetooth no está disponible. Usa Chrome o Edge desde localhost/HTTPS.');
        }

        this.device = await navigator.bluetooth.requestDevice({
            filters: [
                { namePrefix: 'KinesioEMG' },
                { services: [this.serviceUuid] }
            ],
            optionalServices: [this.serviceUuid]
        });

        this.device.addEventListener('gattserverdisconnected', () => {
            this.handleDisconnected();
        });

        this.server = await this.device.gatt.connect();
        const service = await this.server.getPrimaryService(this.serviceUuid);
        this.txCharacteristic = await service.getCharacteristic(this.txUuid);

        this.txCharacteristic.addEventListener('characteristicvaluechanged', (event) => {
            this.handleNotification(event);
        });
        await this.txCharacteristic.startNotifications();

        this.isConnected = true;
        this.keepReading = true;
        this.time = 0;
        this.lastSampleAt = performance.now();
        this.notifyConnection('connected');
    }

    async disconnect() {
        this.keepReading = false;
        this.isSampling = false;

        if (this.txCharacteristic) {
            await this.txCharacteristic.stopNotifications().catch(() => {});
        }

        if (this.device?.gatt?.connected) {
            this.device.gatt.disconnect();
        }

        this.txCharacteristic = null;
        this.server = null;
        this.device = null;
        this.handleDisconnected();
    }

    handleNotification(event) {
        const value = event.target.value;
        const bytes = new Uint8Array(value.buffer);
        this.pendingText += new TextDecoder().decode(bytes);

        const lines = this.pendingText.split(/\r?\n/);
        this.pendingText = lines.pop() || '';

        for (const line of lines) {
            this.handleLine(line);
        }
    }

    handleDisconnected() {
        const wasConnected = this.isConnected;
        this.isConnected = false;
        this.keepReading = false;
        this.isSampling = false;

        if (wasConnected) {
            this.notifyConnection('disconnected');
        }
    }
}

window.EMGBluetoothManager = EMGBluetoothManager;
