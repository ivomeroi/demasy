# DEMASY v1 — Fase 6: respaldo y recuperación

**Estado:** En validación
**Rama:** `feature/demasy-v1-phase-6`
**Fecha:** 2026-08-29

## Alcance implementado

- Respaldo total JSON con aplicación, versión de esquema y fecha.
- Exportaciones por participante y sesión conservadas de fases anteriores.
- Selector local de archivos, sin nube ni cuenta externa.
- Límite previo a lectura de 50 MB.
- Validación de aplicación, versión, colecciones, IDs, códigos únicos y referencias.
- Previsualización de cantidades antes de importar.
- Estrategia `merge` no destructiva con remapeo de IDs.
- Estrategia `replace` transaccional con confirmación escrita `REEMPLAZAR`.
- Informe de creados, omitidos y fallidos disponible en consola.
- Acción explícita para crear o actualizar datos demo.

## Reglas de merge

- Participantes: se identifican por `participantCode`; un código existente se conserva.
- Sesiones: se consideran duplicadas por participante, fecha de inicio, músculo y etiqueta.
- Análisis: se consideran duplicados por sesión y tipo.
- Preferencias: las claves locales existentes se conservan.
- Los IDs de nuevos participantes, sesiones y análisis se reasignan y sus referencias se actualizan.

La planificación se construye antes de abrir la transacción. Todos los registros resultantes se escriben juntos; una falla aborta la operación.

## Reglas de replace

El archivo se valida y normaliza antes de modificar la base. Luego se vacían y restauran los cuatro almacenes dentro de una única transacción IndexedDB. La acción solo comienza después de escribir exactamente `REEMPLAZAR`.

## Validación automatizada

- estructura válida;
- referencias rotas;
- límite de tamaño;
- remapeo de participante al combinar;
- omisión de duplicados;
- suite completa de fases anteriores;
- smoke HTTP.

Resultado: **39 pruebas aprobadas**, lint y smoke aprobados.

## Punto de validación 6

1. abrir `/configuracion` y exportar un respaldo;
2. revisar que el JSON incluya las cuatro colecciones y `schemaVersion: 1`;
3. importar el mismo archivo con **Combinar** y comprobar que se omitan duplicados;
4. crear un participante temporal y exportar otro respaldo;
5. usar un perfil de navegador limpio para importar con **Reemplazar**;
6. recargar y comprobar participantes, sesiones, métricas y configuraciones;
7. intentar un JSON inválido y otro con referencias rotas;
8. cancelar la confirmación reforzada y comprobar que nada cambie;
9. ejecutar la acción de datos demo y comprobar que no duplique sesiones.

No integrar la fase ni comenzar la Fase 7 hasta recibir aprobación del responsable.
