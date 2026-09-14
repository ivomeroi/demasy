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
