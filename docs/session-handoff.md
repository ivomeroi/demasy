# Punto de reanudación de DEMASY

**Actualizado:** 2026-08-29  
**Rama actual:** `feature/demasy-v1-phase-4`
**Última integración:** `da49b3b Merge DEMASY v1 phase 3 persistence`

## Estado del trabajo

- Fase 0 aprobada.
- Fase 1 aprobada e integrada en `feature/demasy-v1`.
- Fase 2 aprobada e integrada en `feature/demasy-v1`.
- Fase 3 aprobada manualmente por el responsable el 2026-08-29.
- Fase 3 integrada en `feature/demasy-v1`.
- Fase 4 implementada y pendiente de validación manual.

## Qué incluye la Fase 3

- Base física `DEMASYDB`.
- Migración automática, idempotente y no destructiva desde `KinesioEMGDB`.
- Normalización de participantes y sesiones.
- Código único de participante.
- Creación, edición, búsqueda, selección, archivado y restauración.
- Guardado transaccional de sesiones simuladas.
- Manejo de errores de cuota y conservación de la sesión en memoria ante fallas.
- Datos de demostración compatibles con el nuevo esquema.
- Cambio de referencias visibles principales a DEMASY.
- Eliminación de la tarjeta visible de análisis de fatiga; los patrones de fatiga permanecen solo como escenarios del simulador.

## Validación obtenida

- `npm test`: aprobado.
- 23 pruebas unitarias aprobadas.
- Lint aprobado.
- Smoke test aprobado.
- Carga inicial comprobada con Chrome headless.
- El navegador integrado de Codex no estaba conectado.
- El árbol de trabajo estaba limpio después del commit y push.

## Validación manual completada

El responsable confirmó el punto de validación 3 de `docs/v1-phase-3-persistence.md` el 2026-08-29.

1. abrir **Pacientes** y comprobar los códigos de demostración;
2. crear un participante sin nombre;
3. editarlo y agregar datos;
4. seleccionarlo y guardar una simulación corta;
5. recargar y comprobar que la sesión permanezca;
6. exportar y revisar el esquema;
7. archivar y verificar que no acepte nuevas sesiones;
8. mostrar archivados, restaurar y volver a seleccionar;
9. si existía información histórica, comprobar que ambas bases y sus registros permanezcan.

## Próximo paso después de validar la Fase 4

Si el responsable aprueba la validación de la Fase 4:

1. actualizar Fase 4 a `Aprobada` en la documentación;
2. integrar `feature/demasy-v1-phase-4` en `feature/demasy-v1` con merge `--no-ff`;
3. publicar `feature/demasy-v1`;
4. crear y publicar `feature/demasy-v1-phase-5` desde la rama de integración;
5. implementar la Fase 5: análisis determinista y comparación.

Si la validación falla, corregir primero sobre `feature/demasy-v1-phase-4`, repetir `npm test` y volver al mismo punto de validación.

## Referencias principales

- `docs/v1-implementation-plan.md`
- `docs/v1-phase-3-persistence.md`
- `docs/v1-phase-4-history-replay.md`
- `docs/v1-phase-2-recording.md`
- `services/data-normalization-service.js`
- `services/session-history-service.js`
- `services/replay-signal-source.js`
- `database.js`
- `patient-manager.js`

## Comando recomendado al reanudar

```bash
git switch feature/demasy-v1-phase-4
git status --short
git log -1 --oneline
npm test
```

Este archivo se actualiza en cada punto de validación para facilitar la reanudación.
