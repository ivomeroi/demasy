# Arquitectura de DEMASY v1

## Visión general

DEMASY es una aplicación web sin framework y offline-first. El navegador contiene la interfaz, la lógica de dominio y la persistencia IndexedDB. El servidor Node sirve los archivos, aplica cabeceras de seguridad y, si existe una clave, actúa como proxy del asistente Gemini.

```text
ESP32 / simulador
        │
        ▼
fuente de señal ──► app.js ──► gráfico y flujo de grabación
                         │
                         ├──► AnalysisService
                         ├──► DEMASYDatabase ──► IndexedDB (DEMASYDB)
                         ├──► PatientManager / AnalysisManager
                         └──► AssistantService ──► /api/chat ──► Gemini opcional
```

## Capas

### Presentación

- `index.html`: estructura de las cinco subrutas.
- `styles.css`: sistema visual, responsive, estados y accesibilidad.
- `app.js`: composición de servicios, navegación, gráfico y flujo de sesión.
- `patient-manager.js`, `analysis-manager.js`, `backup-manager.js`: controladores de pantallas dinámicas.

Las rutas `/emg-en-vivo`, `/analisis`, `/pacientes`, `/asistente-ia` y `/configuracion` comparten el shell de la SPA. `SectionRouter` mantiene URL, historial y recarga.

### Dominio y servicios

- `core/demasy-config.js`: versión, nombres de esquema, frecuencias, límites y umbrales.
- `core/signal-source-contract.js`: contrato común de fuentes.
- `core/recording-controller.js`: máquina de estados de grabación.
- `services/session-configuration-service.js`: validación de configuración.
- `services/analysis-service.js`: métricas temporales puras y comparación bilateral.
- `services/session-history-service.js`: filtros y compatibilidad histórica.
- `services/data-normalization-service.js`: normalización de participantes y sesiones.
- `services/backup-service.js`: validación y planificación de importaciones.
- `services/settings-service.js`: preferencias locales.
- `services/assistant-service.js`: anonimización, límites y adaptadores del asistente.

Los servicios de dominio no dependen del DOM, lo que permite probarlos con Node.

### Fuentes de señal

- `emg-simulator.js`: señal bilateral reproducible para demostración.
- `serial-manager.js`: Web Serial a 115200 baudios.
- `bluetooth-manager.js`: notificaciones BLE del ESP base.
- `services/replay-signal-source.js`: reproducción determinista de sesiones.

Toda fuente expone estado, inicio/parada, callbacks, estadísticas y buffers limitados. La visualización puede aplicar suavizado y corrección basal, pero las muestras persistidas conservan sus valores originales.

### Persistencia

`database.js` administra `DEMASYDB` con almacenes `patients`, `sessions`, `analyses` y `settings`. La migración desde `KinesioEMGDB` es no destructiva. `MemoryStorageAdapter` permite pruebas sin IndexedDB.

Los datos pertenecen al origen y perfil del navegador. No existe sincronización remota. Los respaldos JSON versionados son el mecanismo de portabilidad y recuperación.

### Servidor y servicios externos

`scripts/serve.mjs`:

- sirve recursos locales y fallback de rutas SPA;
- bloquea archivos ocultos, variables de entorno y `node_modules`;
- aplica CSP, `nosniff`, protección de frames y políticas restrictivas;
- expone `GET /api/health`;
- expone `POST /api/chat` sin revelar `GEMINI_API_KEY`.

Gemini es el único servicio remoto de la v1 y no participa en persistencia, grabación o análisis.

### Offline

`service-worker.js` precarga el shell y las dependencias visuales locales. Las navegaciones pueden recuperarse desde caché, pero `/api/*` siempre queda fuera del service worker.

## Flujo de grabación

```text
idle → configured → ready → recording ⇄ paused → review → saved
                                            └─────► discarded
```

La previsualización puede continuar durante una pausa; solamente se detiene la incorporación de muestras a la sesión. Un borrador se persiste periódicamente y puede recuperarse después de una recarga.

## Modelo de análisis

`AnalysisService` elimina el offset medio antes de calcular RMS, MAV, picos y métricas de forma. La simetría bilateral es `min(RMS) / max(RMS) × 100`. Los umbrales son descriptivos y centralizados. DEMASY v1 no implementa FFT ni análisis de fatiga.

## Seguridad y privacidad

- inserción segura de contenido dinámico y listeners sin JavaScript inline;
- CSP de scripts limitada a `'self'`;
- clave Gemini solo en el proceso servidor;
- anonimización redundante antes de solicitudes remotas;
- límites de archivo, memoria, historial y duración;
- confirmación de operaciones destructivas;
- alcance explícitamente académico y no diagnóstico.

## Verificación

`npm test` ejecuta validación sintáctica, pruebas unitarias y smoke test HTTP. La estrategia completa y los ensayos manuales están en `docs/v1-implementation-plan.md`.
