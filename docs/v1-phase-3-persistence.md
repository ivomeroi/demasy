# DEMASY v1 — Fase 3: participantes y persistencia

**Estado:** En validación  
**Rama:** `feature/demasy-v1-phase-3`  
**Fecha:** 2026-08-27

## 1. Objetivo

Completar la administración de participantes y asegurar que las sesiones simuladas revisadas se almacenen con un modelo consistente, manteniendo los datos existentes de la aplicación anterior.

## 2. Decisiones implementadas

- La base física v1 se llama `DEMASYDB`.
- `KinesioEMGDB` se trata únicamente como fuente histórica de migración.
- La migración es automática, idempotente y no destructiva: la base histórica no se elimina.
- Cada participante posee un código único obligatorio; nombre y email son opcionales.
- El borrado funcional se implementa como archivado reversible.
- Las sesiones y participantes se normalizan antes de persistirse.
- La aplicación sigue funcionando sin backend, cuenta externa ni conexión física.

## 3. Modelo persistido

### Participante

Campos principales:

- `id`: identificador local conservado durante la migración;
- `participantCode`: código anónimo único, normalizado a mayúsculas;
- `name`, `email`, `dateOfBirth`, `gender`, `height`, `weight`: datos opcionales;
- `medicalHistory`, `notes`, `consentConfirmed`;
- `status`: `active` o `archived`;
- `createdAt`, `updatedAt`.

Los códigos admiten entre 2 y 30 caracteres alfanuméricos, guion y guion bajo. Los registros históricos sin código reciben `P-XXXX` a partir de su identificador conservado.

### Sesión

Campos principales:

- `schemaVersion`, `patientId`, `label`;
- `startedAt`, `endedAt`, `date`, `durationSeconds`;
- `status`, `muscleType`, `sessionType`;
- `cadence`, `resistance`;
- `source`, `configuration`;
- `samples` y alias compatible `emgData`;
- `statistics`, `analysis`, `notes`;
- `createdAt`, `updatedAt`.

No se permite guardar una sesión para un participante inexistente o archivado.

## 4. Migración de datos históricos

Al iniciar:

1. se abre o crea `DEMASYDB`;
2. se consulta la marca `legacyMigration.v1`;
3. si la migración no fue completada, se detecta `KinesioEMGDB`;
4. se leen participantes, sesiones, análisis y preferencias disponibles;
5. se normalizan participantes y sesiones;
6. se copian todos los almacenes dentro de una única transacción;
7. se comparan cantidades de origen y destino;
8. se registra el resultado de la migración en preferencias.

Una falla aborta la transacción y evita marcar la migración como terminada. La base de origen permanece intacta para recuperación manual.

## 5. Administración de participantes

La interfaz permite:

- crear y editar participantes;
- generar automáticamente un código disponible;
- buscar por código, nombre, email o notas;
- mostrar u ocultar archivados;
- consultar el historial existente;
- archivar con confirmación y sin eliminar sesiones;
- restaurar un participante archivado;
- impedir nuevas sesiones para archivados;
- exportar los datos usando el código como nombre de archivo.

Los valores libres ingresados por el usuario se escapan antes de insertarlos en HTML.

## 6. Confiabilidad del guardado

- Las escrituras esperan la finalización de la transacción IndexedDB.
- Los errores de cuota y restricciones únicas producen mensajes comprensibles.
- El controlador solo marca una grabación como guardada después de una persistencia exitosa.
- Ante una falla, la sesión permanece en memoria y continúa disponible para reintento o descarga.
- La máquina de estados evita el guardado duplicado después de una operación exitosa.

## 7. Compatibilidad y datos de demostración

- Se conserva temporalmente el alias de clase `KinesioEMGDatabase` para código histórico, aunque la aplicación instancia `DEMASYDatabase`.
- Los tres participantes de demostración usan `DEMO-001`, `DEMO-002` y `DEMO-003`.
- La inicialización de demostración solo ocurre cuando no existe ningún participante, activo o archivado.
- La tarjeta visible de análisis de fatiga fue retirada según la decisión de alcance. Los patrones de fatiga permanecen únicamente como escenarios de señal simulada.

## 8. Pruebas ejecutadas

- Validación y normalización de participantes.
- Rechazo de códigos, email y medidas inválidas.
- Adaptación de participantes históricos conservando identificadores.
- Normalización de sesiones históricas y actuales.
- Rechazo de sesiones sin participante válido.
- Suite previa de configuración, grabación, simulación, análisis y servicios.
- Smoke test HTTP de todos los recursos de la aplicación.
- Carga real en Chrome headless con creación de IndexedDB y datos simulados.

Resultado automatizado: **23 pruebas aprobadas**, lint aprobado y smoke aprobado.

El navegador integrado de Codex no se encontraba conectado durante esta ejecución. La inspección de carga se realizó con Chrome headless local; la interacción manual completa queda incluida en el punto de validación.

## 9. Criterios de aceptación

| Criterio | Estado | Evidencia |
|---|---|---|
| Base física `DEMASYDB` | Cumplido | configuración y administrador IndexedDB |
| Migración automática no destructiva | Cumplido | lectura, normalización, transacción y marca idempotente |
| Código único de participante | Cumplido | índice único y validación previa |
| Crear y editar | Cumplido | formulario unificado |
| Archivar y restaurar | Cumplido | estado reversible y filtro visual |
| Buscar y filtrar | Cumplido | consulta por campos y selector de archivados |
| Guardar sesión normalizada | Cumplido | normalizador v1 y relación obligatoria |
| Recuperación ante error | Cumplido | datos en memoria hasta confirmar transacción |
| Pruebas automatizadas | Cumplido | 23 pruebas y smoke |
| Recarga y consulta manual | Pendiente de validación | recorrido indicado abajo |

## 10. Punto de validación 3

Validar manualmente en `http://127.0.0.1:8000`:

1. abrir **Pacientes** y comprobar los códigos de demostración;
2. crear un participante dejando el nombre vacío;
3. editarlo y agregar nombre, notas y consentimiento;
4. seleccionarlo y guardar una simulación corta;
5. recargar la página y verificar que la sesión figure en su historial;
6. exportar sus datos y revisar `schemaVersion`, `source`, `configuration` y `samples`;
7. archivar el participante y confirmar que no admita nuevas sesiones;
8. activar **Mostrar archivados**, restaurarlo y volver a seleccionarlo;
9. si existía una instalación anterior, comprobar en DevTools que `KinesioEMGDB` continúa presente y que `DEMASYDB` contiene sus registros.

La fase debe permanecer en validación hasta que el responsable confirme este recorrido. No iniciar la Fase 4 antes de esa aprobación.
