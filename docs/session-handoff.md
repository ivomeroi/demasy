# Punto de reanudación de DEMASY

- **Actualizado:** 2026-08-30
- **Rama actual:** `feature/demasy-v1-phase-7`
- **Último commit de trabajo:** `0085a0b Implement DEMASY v1 phase 7 assistant adapters`
**Última integración:** `3c09d04 Merge DEMASY v1 phase 8 UX and accessibility`

## Estado general

- Fases 0 a 6 aprobadas e integradas en `feature/demasy-v1`.
- Fase 8 aprobada e integrada antes de retomar la Fase 7.
- Fase 7 implementada y actualmente **En validación**.
- Fases 9 y 10 pendientes.
- El análisis de fatiga continúa excluido de DEMASY v1. Solo permanecen patrones del simulador, sin métricas ni conclusiones de fatiga.

## Estado de Git

- Rama de integración: `feature/demasy-v1` en `3c09d04`.
- Rama actual y remota: `feature/demasy-v1-phase-7` en `0085a0b`.
- La Fase 7 todavía no debe integrarse: falta aprobación manual de sus textos y modos.
- El árbol estaba limpio antes de actualizar este handoff.

## Fase 7 implementada

- Servicio desacoplado en `services/assistant-service.js`.
- Adaptadores `local`, `remote`, `auto` y `mock`.
- El modo automático intenta `/api/chat` y usa el asistente local ante error o timeout.
- Timeout remoto de 8 segundos y health check en `/api/health`.
- Estado visible: asistente local, remoto, simulado, respaldo o error.
- Indicador de carga sin demora artificial.
- Prevención de solicitudes simultáneas duplicadas.
- Historial limitado a 20 mensajes.
- Contexto anonimizado mediante lista explícita de métricas permitidas.
- Filtrado redundante en cliente y servidor; correos y teléfonos se redactan.
- Respuestas insertadas con `textContent`, sin HTML dinámico.
- Descargo de responsabilidad en todas las respuestas.
- Rechazo de diagnóstico, tratamientos, ejercicios personalizados y análisis de fatiga.
- Configuración opcional documentada en `.env.example`.

## Configuración remota opcional

Crear `.env.local` a partir de `.env.example`:

```env
ASSISTANT_MODE=auto
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
```

Las claves reales nunca deben confirmarse en Git, almacenarse en IndexedDB ni incluirse en respaldos.

## Validación automática obtenida

- `npm test`: aprobado.
- 44 pruebas unitarias aprobadas.
- Lint aprobado sobre 26 archivos JavaScript.
- Smoke test HTTP aprobado.
- `/api/health` respondió `ok`, modo `auto`, Gemini no configurado y modelo `gemini-2.5-flash`.
- `/asistente-ia` respondió HTTP 200.
- El navegador visual integrado no estaba disponible; falta la revisión visual manual.

## Validación manual pendiente de la Fase 7

Abrir `http://127.0.0.1:8000/asistente-ia` y seguir `docs/v1-phase-7-assistant.md`:

1. Probar una consulta de simetría en modo `Local`.
2. Preguntar por fatiga y tratamiento; verificar los límites de alcance.
3. Probar `Automático` sin clave y confirmar el respaldo local.
4. Probar `Remoto` sin clave y confirmar un error visible sin afectar otras rutas.
5. Probar `Simulado` y verificar su etiqueta.
6. Pulsar `Comprobar` y revisar el health check.
7. Intentar enviar rápidamente dos veces la misma consulta.
8. Limpiar el chat y comprobar que solo quede el mensaje inicial.
9. Revisar y aprobar los textos definitivos.

## Próximo paso al reanudar

Si la validación es aprobada:

1. cambiar Fase 7 a `Aprobada` en el plan y su documento;
2. confirmar y publicar la aprobación en `feature/demasy-v1-phase-7`;
3. integrar con merge `--no-ff` sobre `feature/demasy-v1`;
4. publicar la rama de integración;
5. crear `feature/demasy-v1-phase-9` desde la integración;
6. comenzar calidad, seguridad y rendimiento.

Si falla, corregir en `feature/demasy-v1-phase-7`, ejecutar `npm test` y repetir la validación.

## Servidor local

El servidor estaba ejecutándose en `http://127.0.0.1:8000` al cerrar la sesión. Después de apagar o reiniciar el equipo deberá levantarse nuevamente:

```bash
npm start
```

## Comandos recomendados mañana

```bash
git switch feature/demasy-v1-phase-7
git status --short
git log -1 --oneline
npm test
npm start
```

## Referencias principales

- `docs/v1-implementation-plan.md`
- `docs/v1-phase-7-assistant.md`
- `docs/v1-phase-8-ux.md`
- `services/assistant-service.js`
- `ai-assistant.js`
- `scripts/serve.mjs`
- `.env.example`
- `tests/assistant-service.test.cjs`
