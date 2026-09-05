# Punto de reanudación de DEMASY

- **Actualizado:** 2026-09-05
- **Rama actual:** `feature/demasy-v1-phase-9`
- **Base integrada:** `feature/demasy-v1` en `d13c1d1`
- **Próxima fase:** Fase 10 — documentación y despliegue

## Estado general

- Fases 0 a 8 aprobadas e integradas en `feature/demasy-v1`.
- Fase 9 aprobada por el responsable después de las pruebas locales.
- Los cambios de Fase 9 están listos para commit, push e integración.
- Fase 10 permanece pendiente.
- El análisis de fatiga continúa fuera del alcance de DEMASY v1.

## Cierre de Fase 9

- Dependencias visuales servidas localmente y shell disponible sin conexión.
- Servidor endurecido contra acceso a archivos privados y rutas fuera del proyecto.
- Cabeceras de seguridad activas, incluida CSP estricta sin scripts inline.
- Eventos dinámicos migrados a listeners.
- Borrador de grabación recuperable después de una recarga.
- Marcadores visuales de pausa y reanudación.
- Cronómetro y eje temporal sincronizados mediante reloj monotónico.
- Límites de buffers, sesiones, importaciones y almacenamiento revisados.
- Confirmaciones presentes en operaciones destructivas.
- Captura Bluetooth con decimales, lotes seguros y nombre `DEMASY-Master`.
- Escala externa de ±50 mV y señal cruda atenuada.
- Actividad corregida respecto del basal con ganancia visual ×2,5.
- Calibración manual de cinco segundos con animación y cuenta regresiva.

## Validación

- `npm test`: aprobado.
- Lint: 28 archivos JavaScript aprobados.
- Pruebas unitarias: 55 aprobadas.
- Smoke test: aprobado.
- CSP estricta y ausencia de eventos inline verificadas por el smoke test.
- Pruebas manuales locales, funcionamiento sin conexión, respaldo limpio, recorrido end-to-end, accesibilidad básica y calibración ESP32 confirmados por el responsable.

## Estado de Git

La rama contiene cambios aún no confirmados. Antes de iniciar Fase 10:

1. revisar `git diff`;
2. crear el commit de cierre de Fase 9;
3. publicar `feature/demasy-v1-phase-9`;
4. integrar mediante PR o merge `--no-ff` en `feature/demasy-v1`;
5. crear `feature/demasy-v1-phase-10` desde la integración actualizada.

No incluir `/home/ivomeroi/.env.local` ni ninguna clave Gemini en Git.

## Inicio recomendado de Fase 10

1. actualizar README, arquitectura y guías heredadas;
2. retirar referencias documentales visibles a KinesioEMG, conservando únicamente identificadores de compatibilidad explícitamente documentados;
3. documentar instalación, simulación, hardware, calibración, DEMASYDB, respaldos, métricas, asistente y privacidad;
4. preparar despliegue estático y despliegue completo con `/api/chat`;
5. ejecutar una instalación limpia siguiendo solamente el README;
6. cerrar el checklist final y preparar la etiqueta `v1.0.0`.

## Servidor local

```bash
npm start
```

Aplicación: `http://127.0.0.1:8000/emg-en-vivo`

## Referencias principales

- `docs/v1-implementation-plan.md`
- `docs/v1-phase-9-quality.md`
- `ESP32/esp_base.ino`
- `app.js`
- `scripts/serve.mjs`
- `scripts/smoke.mjs`
