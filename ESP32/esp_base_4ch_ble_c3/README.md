# DEMASY master BLE de cuatro canales (ESP32-C3)

Este firmware conecta simultaneamente cuatro sensores BLE (`DEMASY-S1` a
`DEMASY-S4`) y un navegador. Por lo tanto, necesita cinco conexiones BLE y no
funciona con el limite predeterminado de tres conexiones de NimBLE-Arduino.

## Configuracion obligatoria de NimBLE-Arduino

Antes de compilar, configura seis conexiones para dejar una posicion de margen:

```cpp
#define MYNEWT_VAL_BLE_MAX_CONNECTIONS 6
```

En Arduino IDE, abre `src/nimconfig.h` dentro de la biblioteca
NimBLE-Arduino instalada, busca `MYNEWT_VAL_BLE_MAX_CONNECTIONS`, descomenta la
linea y cambia su valor a `6`. Luego cierra Arduino IDE, vuelve a abrirlo y
compila el firmware nuevamente.

En PlatformIO, aplica la definicion a todas las unidades de compilacion:

```ini
build_flags =
  -DMYNEWT_VAL_BLE_MAX_CONNECTIONS=6
```

No basta con definirla solamente dentro del `.ino`, porque la biblioteca se
compila en unidades separadas.

## Comprobacion

Al iniciar, el monitor serie debe mostrar:

```text
NimBLE max connections: 6 (required: 5)
```

Si la configuracion sigue en tres, el `#error` del firmware detiene la
compilacion en lugar de permitir una version que solo acepte dos sensores mas
el navegador.

Cada sensor debe usar un `SENSOR_NODE_ID` unico:

- 1: flexor izquierdo
- 2: flexor derecho
- 3: extensor izquierdo
- 4: extensor derecho

Usar NimBLE-Arduino 2.5.x tanto en el master como en los sensores.

## Frecuencias y carga BLE

Cada sensor adquiere y filtra localmente a 1000 Hz, pero notifica a la base a
50 Hz. La base agrega los cuatro canales y notifica al navegador tambien a 50
Hz. Esta separacion conserva el procesamiento de la banda EMG y evita intentar
transportar cientos de notificaciones redundantes por cinco conexiones BLE.

El escaneo activo utiliza un ciclo de trabajo reducido mientras falta algun
sensor. Una vez conectados los cuatro, el escaneo se detiene automaticamente.
El estado serie muestra `drops=S1/S2/S3/S4`; durante una prueba estable los
contadores deben permanecer en cero o crecer solo de manera excepcional.

Cada trama enviada al navegador termina con una mascara de cuatro bits. Los
bits 0 a 3 representan S1 a S4 y solo se activan cuando el sensor esta
conectado y envio datos dentro de `STALE_TIMEOUT_MS`. La pagina utiliza esta
mascara para mostrar que sensores estan realmente transmitiendo, sin confundir
una medicion valida de cero con una desconexion.

## Indicador de bateria de la base

La base utiliza la misma medicion e indicacion que los sensores:

- `GPIO 1`: medicion mediante un divisor resistivo 47k/47k.
- `GPIO 3`: LED indicador de bateria.
- LED encendido fijo: bateria igual o superior a 3,40 V.
- LED parpadeando cada 500 ms: bateria inferior a 3,40 V.

El monitor serie informa el voltaje de la base como `base=...V`, junto con los
voltajes recibidos de los cuatro sensores. Para ajustar la lectura contra un
multimetro, modificar `BATTERY_CALIBRATION` en el sketch.

Revisar que estos GPIO sean apropiados para el modelo concreto de ESP32-C3. La
bateria no debe conectarse directamente al `GPIO 1`: el divisor 47k/47k es
obligatorio para mantener la tension del ADC dentro del rango permitido.
