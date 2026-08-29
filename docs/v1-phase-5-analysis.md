# DEMASY v1 — Fase 5: análisis y comparación

**Estado:** Aprobada e integrada
**Rama:** `feature/demasy-v1-phase-5`
**Fecha:** 2026-08-29

## 1. Alcance

La sección `/analisis` reemplaza sus marcadores de posición por procesamiento temporal determinista y comparación de sesiones guardadas. La implementación toma como referencia las secciones 6.7, 8.8 y 9.8 del informe de software y las decisiones aprobadas en la línea base.

No se implementa FFT porque la frecuencia almacenada y su metodología clínica todavía no fueron validadas. Tampoco se calcula, muestra ni interpreta fatiga.

## 2. Secuencia de procesamiento

1. leer las muestras guardadas;
2. aceptar los formatos actuales `amplitude` e históricos `emg` o numéricos;
3. descartar valores no finitos;
4. calcular y remover el nivel medio o componente continua dentro de cada conjunto analizado;
5. extraer características sobre la sesión completa;
6. repetir el cálculo en ventanas no superpuestas de un segundo;
7. comparar los dos lados mediante la definición operacional de simetría;
8. persistir el resultado descriptivo dentro de la sesión.

No se aplica filtro notch ni pasabanda: hacerlo requeriría validar frecuencia de muestreo, respuesta del filtro y preservación de la banda útil.

## 3. Métricas por lado

| Métrica | Definición | Unidad | Limitación principal |
|---|---|---|---|
| Offset DC | media aritmética antes de centrar | mV | describe el desplazamiento del conjunto, no calidad del electrodo |
| RMS | raíz de la media de cuadrados de la señal centrada | mV | depende de colocación, ganancia y condiciones de prueba |
| MAV | media del valor absoluto de la señal centrada | mV | descriptor de amplitud, no fuerza muscular directa |
| Pico absoluto | máximo valor absoluto centrado | mV | sensible a artefactos |
| Pico a pico | máximo menos mínimo centrados | mV | sensible a valores extremos |
| WL | suma de diferencias absolutas consecutivas | mV | aumenta con duración y frecuencia de muestreo |
| ZC | cambios de signo consecutivos | conteo | sin umbral de ruido validado; uso descriptivo |
| Entropía de Shannon | entropía de histograma de 16 intervalos, normalizada por `log2(16)` | 0–1 | depende de discretización y longitud de ventana |
| Activación media normalizada | `MAV / pico absoluto × 100` | % | normalización interna; no permite comparación clínica universal |

La duración efectiva se obtiene del primer y último instante registrado; sin tiempo explícito se usa 100 Hz como frecuencia de respaldo.

## 4. Métricas bilaterales

```text
SI = min(RMS izquierda, RMS derecha) / max(RMS izquierda, RMS derecha) × 100
Asimetría = 100 - SI
Diferencia RMS absoluta = |RMS izquierda - RMS derecha|
```

El lado dominante es el de mayor RMS o `equilibrado` si ambos valores coinciden. Los umbrales demostrativos son:

- SI ≥ 90 %: simetría alta;
- 75–89.999 %: diferencia leve;
- 60–74.999 %: diferencia moderada;
- SI < 60 %: diferencia marcada.

Estas etiquetas no son diagnósticas ni estándares clínicos universales.

## 5. Evolución temporal

El gráfico muestra para cada ventana de un segundo:

- RMS izquierdo;
- RMS derecho;
- índice de simetría.

La diferencia de fase presentada corresponde únicamente al parámetro configurado en la simulación. No se afirma que sea una estimación fisiológica obtenida de la señal.

## 6. Comparación de sesiones

Para ser compatibles, ambas sesiones deben pertenecer al mismo participante y compartir músculo y tipo de prueba. Cadencia, resistencia, duración y escenario pueden diferir, pero se muestran explícitamente.

Si esas condiciones cambian:

- se muestran valores absolutos lado a lado;
- no se calcula una variación porcentual;
- no se utiliza lenguaje de progreso o deterioro.

Si son equivalentes, la variación se calcula como:

```text
(valor B - valor A) / |valor A| × 100
```

La comparación puede exportarse como JSON estructurado o CSV tabular.

## 7. Validación automatizada

- vectores conocidos para RMS, MAV, pico, WL y ZC;
- eliminación de offset DC;
- entropía acotada;
- simetría y lado dominante conocidos;
- datos vacíos y formatos históricos;
- análisis por ventanas;
- comparación compatible e incompatible;
- supresión de porcentaje cuando cambian las condiciones;
- carga directa de `/analisis` y eliminación de controles vacíos.

Resultado: **37 pruebas aprobadas**, lint y smoke aprobados, prueba con 180.000 muestras y carga en Chrome headless correcta.

## 8. Punto de validación 5

1. abrir `/analisis`;
2. seleccionar cada participante demo y analizar una sesión;
3. contrastar RMS dominante con el escenario registrado;
4. revisar tabla de características y gráfico por ventanas;
5. comparar las dos sesiones de María y confirmar la advertencia por condiciones diferentes;
6. intentar comparar sesiones de distinto músculo si existen y confirmar el rechazo;
7. exportar JSON y CSV;
8. verificar que no aparezcan análisis, conclusiones ni indicadores de fatiga;
9. revisar fórmulas, unidades, umbrales y lenguaje descriptivo de este documento.

El responsable aprobó la fase el 2026-08-29. La Fase 5 queda habilitada para integración y permite comenzar la Fase 6.

## 9. Controles contextuales

Los controles de conexión USB, Bluetooth, desconexión y guardado del encabezado se muestran únicamente en `/emg-en-vivo`. Las demás secciones conservan un encabezado limpio y no exponen acciones que no corresponden a su contexto.
