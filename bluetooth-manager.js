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
        return window.isSecureContext && 'bluetooth' in navigator;
    }

    getSupportError() {
        if (!window.isSecureContext) {
            return 'Web Bluetooth requiere un origen seguro. Abre DEMASY mediante HTTPS, http://localhost o http://127.0.0.1; no abras index.html directamente ni uses una IP HTTP de la red local.';
        }

        if (!('bluetooth' in navigator)) {
            const platform = navigator.userAgentData?.platform || navigator.platform || '';
            if (/linux/i.test(platform)) {
                return 'Chrome en Linux no habilita Web Bluetooth de forma predeterminada. Activa una vez “Experimental Web Platform features” en chrome://flags/#enable-experimental-web-platform-features, reinicia Chrome y vuelve a intentarlo.';
            }
            return 'Este navegador no expone Web Bluetooth. Usa una versión compatible de Chrome o Edge y comprueba que Bluetooth no esté bloqueado por una política del navegador o de la organización.';
        }

        return null;
    }

    async connect() {
        const supportError = this.getSupportError();
        if (supportError) throw new Error(supportError);

        this.device = await navigator.bluetooth.requestDevice({
            filters: [
                { namePrefix: 'DEMASY' },
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
