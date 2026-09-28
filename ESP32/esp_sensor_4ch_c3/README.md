# Sensor EMG BLE para ESP32-C3

Este sketch es compatible con `ESP32/esp_base_4ch_ble_c3/esp_base_4ch_ble_c3.ino`.

Antes de cargarlo en cada ESP32-C3, cambiar `SENSOR_NODE_ID`:

- `1`: flexor izquierdo.
- `2`: flexor derecho.
- `3`: extensor izquierdo.
- `4`: extensor derecho.

## Dependencia

Instalar **NimBLE-Arduino 2.5.x** desde el gestor de bibliotecas de Arduino
IDE. El sensor y el master deben utilizar la misma serie de la biblioteca.

## Pines predeterminados

- `GPIO 0`: entrada EMG.
- `GPIO 1`: medicion de bateria mediante divisor 47k/47k.
- `GPIO 3`: LED de estado de bateria.

Revisar estos pines contra la placa ESP32-C3 utilizada antes de energizar el
circuito. No conectar una bateria directamente a `GPIO 1`.

Cada sensor anuncia `DEMASY-S1` a `DEMASY-S4` y envia paquetes binarios de 16
bytes a 50 Hz. La adquisicion y el filtrado local se ejecutan a 1000 Hz. El
filtro digital pasa 20-450 Hz y rechaza la interferencia de red de 50 Hz; sus
coeficientes dependen de `SAMPLE_RATE_HZ = 1000` y no deben reutilizarse con
otra frecuencia.

La envolvente conserva una ventana de 256 ms. El promedio de ADC usa cuatro
lecturas por muestra: mantiene aproximadamente la misma carga de ADC que la
version anterior (ocho lecturas a 500 Hz) y deja tiempo de CPU para BLE.
El monitor serie informa `sampleHz`; debe mantenerse aproximadamente en 1000
durante una prueba con los cuatro sensores conectados.
