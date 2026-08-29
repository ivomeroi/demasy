# Punto de reanudación de DEMASY

**Actualizado:** 2026-08-29  
**Rama actual:** `feature/demasy-v1-phase-3`  
**Último commit publicado:** `200b2de Add DEMASY v1 persistence and participant management`

## Estado del trabajo

- Fase 0 aprobada.
- Fase 1 aprobada e integrada en `feature/demasy-v1`.
- Fase 2 aprobada e integrada en `feature/demasy-v1`.
- Fase 3 aprobada manualmente por el responsable el 2026-08-29.
- Próximo trabajo: integrar la Fase 3 y comenzar la Fase 4.

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

## Próximo paso

Si el responsable aprueba la validación:

1. actualizar Fase 3 a `Aprobada` en la documentación;
2. hacer commit del resultado documental en `feature/demasy-v1-phase-3`;
3. integrar la rama en `feature/demasy-v1` con merge `--no-ff`;
4. publicar `feature/demasy-v1`;
5. crear y publicar `feature/demasy-v1-phase-4` desde la rama de integración;
6. implementar la Fase 4: historial, detalle y reproducción.

Si la validación falla, corregir primero sobre `feature/demasy-v1-phase-3`, repetir `npm test` y volver al mismo punto de validación.

## Referencias principales

- `docs/v1-implementation-plan.md`
- `docs/v1-phase-3-persistence.md`
- `docs/v1-phase-2-recording.md`
- `services/data-normalization-service.js`
- `database.js`
- `patient-manager.js`

## Comando recomendado al reanudar

```bash
git switch feature/demasy-v1-phase-3
git status --short
git log -1 --oneline
npm test
```

Este archivo se versiona junto con la aprobación documental de la Fase 3.
