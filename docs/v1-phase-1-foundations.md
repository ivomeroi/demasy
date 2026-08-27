# DEMASY v1 — Fase 1: fundaciones y contratos

**Estado:** En validación  
**Fecha:** 2026-08-27  
**Rama:** `feature/demasy-v1-phase-1`  
**Base:** `feature/demasy-v1`

## 1. Objetivo

Crear una base modular y comprobable para las fases posteriores sin rediseñar todavía el flujo visible de grabación, pacientes o análisis.

## 2. Componentes incorporados

### 2.1 Configuración central

Archivo: `core/demasy-config.js`

Centraliza:

- nombre y versión objetivo de DEMASY;
- versión de esquema;
- nombres `DEMASYDB` y `KinesioEMGDB`;
- frecuencia interna del simulador;
- frecuencia objetivo de almacenamiento;
- intervalo de actualización del gráfico;
- ventana temporal predeterminada;
- duración de sesión predeterminada y máxima;
- umbrales y etiquetas aprobados de simetría.

En esta fase solamente se conectaron al comportamiento existente la frecuencia del simulador y los parámetros ya utilizados por el gráfico. La migración de base y el reemplazo de etiquetas se harán en sus fases específicas para no mezclar responsabilidades.

### 2.2 Contrato de fuentes de señal

Archivo: `core/signal-source-contract.js`

Define y valida en ejecución estos métodos:

- `start`;
- `pause`;
- `resume`;
- `stop`;
- `reset`;
- `getStats`;
- `getStatus`;
- `onDataUpdate`;
- `onStatsUpdate`.

El contrato permite que el controlador futuro utilice simulación y reproducción sin conocer su implementación.

### 2.3 Servicio de análisis temporal

Archivo: `services/analysis-service.js`

Implementa funciones independientes del DOM para:

- RMS;
- MAV;
- amplitud pico;
- mínimo y máximo;
- índice de simetría aprobado;
- diferencia porcentual acotada;
- lado dominante;
- clasificación descriptiva.

No contiene análisis de fatiga, de acuerdo con la decisión de Fase 0.

### 2.4 Servicio de configuración

Archivo: `services/settings-service.js`

Proporciona:

- valores predeterminados;
- lectura y escritura mediante un adaptador;
- validación de rangos;
- modos `local`, `remote`, `auto` y `mock` para el asistente.

Su conexión con la pantalla Configuración corresponde a la Fase 8.

### 2.5 Adaptador de memoria

Archivo: `services/memory-storage-adapter.js`

Permite probar y demostrar sin IndexedDB:

- participantes;
- sesiones;
- archivado;
- filtros básicos;
- configuración;
- exportación e importación en memoria.

El adaptador clona sus entradas y salidas para evitar mutaciones accidentales desde los consumidores.

### 2.6 Fuente de reproducción

Archivo: `services/replay-signal-source.js`

Implementa el contrato común para reproducir muestras normalizadas:

- inicio;
- pausa;
- reanudación;
- detención;
- reinicio;
- velocidad configurable;
- emisión de muestras y estadísticas;
- estado `completed` al terminar.

La interfaz visual de reproducción se implementará en la Fase 4.

### 2.7 Adaptación del simulador

`EMGSimulator` ahora:

- cumple el contrato común;
- expone `pause`, `resume` y `getStatus`;
- conserva tiempo y buffers al pausar;
- utiliza la frecuencia centralizada;
- puede cargarse tanto en navegador como en pruebas Node.

El simulador continúa iniciándose como antes. La separación entre previsualización y captura pertenece a la Fase 2.

## 3. Pruebas incorporadas

Archivos:

- `tests/analysis-service.test.cjs`;
- `tests/foundation-services.test.cjs`;
- `tests/emg-simulator-contract.test.cjs`.

Cobertura funcional inicial:

- métricas conocidas;
- fórmula aprobada de simetría;
- señales vacías;
- constantes de aplicación y esquema;
- aislamiento del adaptador de memoria;
- valores predeterminados y validación de configuración;
- contrato de fuente de reproducción;
- pausa y reanudación deterministas;
- contrato y preservación de estado del simulador.

El comando general ahora ejecuta:

```text
lint → pruebas unitarias → smoke test
```

## 4. Compatibilidad

Los nuevos archivos usan un patrón de exposición dual:

- globales del navegador para conservar la aplicación sin build;
- `module.exports` para pruebas con Node.js.

No se agregó un framework ni un bundler.

## 5. Decisiones deliberadamente aplazadas

- La máquina de estados de grabación se implementará en Fase 2.
- La creación y migración real a `DEMASYDB` se implementará en Fase 3.
- La reproducción visual se conectará en Fase 4.
- La nueva sección de análisis utilizará `AnalysisService` en Fase 5.
- La pantalla de preferencias utilizará `SettingsService` en Fase 8.
- Las fuentes USB/Bluetooth se conservan, pero no se adaptan en esta fase porque no forman parte del criterio simulado de v1.
- La semilla pseudoaleatoria del simulador requiere intervenir todas las llamadas a `Math.random`; queda asociada a la configuración de escenarios, no a esta extracción inicial.

## 6. Criterios de aceptación

| Criterio | Estado | Evidencia |
|---|---|---|
| Estructura para servicios y utilidades | Cumplido | `core/`, `services/` |
| Tipos y contratos documentados | Cumplido | comentarios JSDoc y contrato de fuente |
| Contrato común de fuentes | Cumplido | `signal-source-contract.js` |
| Simulador adaptado sin rediseñar UI | Cumplido | métodos y pruebas de contrato |
| Fuente de reproducción creada | Cumplido | `replay-signal-source.js` |
| Servicio de análisis puro | Cumplido | `analysis-service.js` |
| Servicio de configuración | Cumplido | `settings-service.js` |
| Constantes y unidades centralizadas | Cumplido para fundaciones | `demasy-config.js` |
| Versión de aplicación y esquema | Cumplido | `1.0.0` y esquema `1` |
| Pruebas unitarias disponibles | Cumplido | `npm run test:unit` |
| Dashboard mantiene su funcionamiento | Cumplido | smoke test y revisión visual en Chrome headless, 1440×1000 |

## 7. Resultado de validación técnica

Comandos ejecutados:

```bash
npm test
```

Resultado:

- 17 archivos JavaScript con sintaxis válida;
- 10 pruebas unitarias aprobadas;
- 0 pruebas fallidas;
- smoke test HTTP aprobado;
- dashboard inicializado y renderizado correctamente en Chrome headless a 1440×1000;
- simulador, gráfico y estadísticas actualizándose después de la carga.

## 8. Punto de validación 1

Antes de integrar esta rama en `feature/demasy-v1`, el responsable debe revisar:

1. la división entre `core/` y `services/`;
2. el contrato común de fuentes;
3. las métricas puras disponibles;
4. las decisiones aplazadas de la sección 5;
5. el resultado de las pruebas y la revisión visual.

Después de la aprobación se integrará la rama de Fase 1 y recién entonces se creará `feature/demasy-v1-phase-2`.
