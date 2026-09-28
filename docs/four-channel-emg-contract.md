# Contrato EMG de cuatro sensores

DEMASY mide simultáneamente un músculo flexor y su complementario extensor en ambos miembros. Son cuatro nodos ESP32-C3 independientes conectados por BLE a una base ESP32-C3.

| ID | Canal | Comparación válida |
|---:|---|---|
| 1 | Flexor izquierdo | Flexor derecho |
| 2 | Flexor derecho | Flexor izquierdo |
| 3 | Extensor izquierdo | Extensor derecho |
| 4 | Extensor derecho | Extensor izquierdo |

Cada nodo adquiere y filtra a 1000 Hz y transmite a 50 Hz `nodeId`, secuencia, señal filtrada, envolvente, ADC crudo, flags y batería. La base mantiene timeout y pérdidas por nodo y publica por BLE a 50 Hz una línea CSV estable:

`FL,envFL,flagsFL,FR,envFR,flagsFR,EL,envEL,flagsEL,ER,envER,flagsER,batBase,batS1,batS2,batS3,batS4`

Las muestras nuevas se almacenan con `channelSchema: flexor-extensor-4ch` y grupos `flexor.left/right` y `extensor.left/right`. La aplicación normaliza registros v1 `{left,right}` como `legacy-2ch`; estos continúan siendo visibles como flexor y muestran el extensor ausente en cero. No se inventan datos históricos.

Los índices de simetría se calculan de forma independiente para flexores y extensores. Nunca se utiliza flexor contra extensor para calcular simetría bilateral.

## Carga del firmware

- Base: `ESP32/esp_base_4ch_c3/esp_base_4ch_c3.ino`.
- Sensores: `ESP32/esp_sensor_4ch_c3/esp_sensor_4ch_c3.ino`.
- Antes de cargar cada sensor, definir `SENSOR_NODE_ID` entre 1 y 4 según la tabla.
- Configurar NimBLE para seis conexiones máximas en la base.
- Verificar que `EMG_PIN` sea ADC válido para el modelo exacto de ESP32-C3 utilizado.

La base anuncia el nombre BLE `DEMASY-C3`; los UUID no cambian, por lo que la página usa el mismo proceso de conexión.
