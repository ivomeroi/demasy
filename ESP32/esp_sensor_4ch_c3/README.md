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
bytes a 100 Hz. La adquisicion y el filtrado local se ejecutan a 500 Hz.
