# DEMASY v1 — Fase 4: historial, detalle y reproducción

**Estado:** En validación
**Rama:** `feature/demasy-v1-phase-4`
**Fecha:** 2026-08-29

## 1. Objetivo

Permitir que una sesión simulada guardada pueda encontrarse, inspeccionarse, exportarse, archivarse y reproducirse sin depender de hardware ni servicios externos.

## 2. Historial y filtros

El historial del participante ahora incluye también las sesiones archivadas y presenta:

- fecha y hora;
- músculo;
- duración;
- índice de simetría disponible;
- escenario simulado;
- estado;
- acciones de detalle, exportación y archivo o restauración.

Los filtros combinables cubren fecha desde/hasta, músculo, escenario y estado. El filtrado y el orden cronológico se encuentran aislados en `SessionHistoryService` para poder probarlos sin DOM ni IndexedDB.

## 3. Detalle de sesión

El detalle muestra:

- etiqueta, fecha, duración y estado;
- músculo y escenario;
- tipo y proveedor de la fuente;
- cantidad de muestras;
- cadencia y resistencia;
- simetría guardada;
- notas;
- disponibilidad de reproducción.

Una sesión antigua o vacía continúa siendo consultable y exportable, pero muestra explícitamente que no contiene muestras reproducibles.

## 4. Reproducción

`ReplaySignalSource` reproduce las muestras respetando las diferencias de tiempo registradas. La interfaz permite:

- reproducir y pausar;
- continuar desde la posición pausada;
- reiniciar desde el comienzo;
- seleccionar 0.5×, 1× o 2× durante la reproducción;
- consultar tiempo, valores bilaterales y progreso;
- detectar la finalización automáticamente.

El cálculo de estadísticas durante la reproducción solo se ejecuta cuando existe un consumidor registrado, evitando trabajo cuadrático innecesario en sesiones extensas.

## 5. Gestión y exportación

- Cada sesión puede exportarse como JSON autocontenido con marca DEMASY, versión de esquema y fecha de exportación.
- El archivado requiere confirmación y conserva físicamente todos los datos.
- Las sesiones archivadas pueden restaurarse.
- Se implementaron los métodos que antes eran referencias inexistentes: `viewSessionDetails` y `downloadSession`.

## 6. Compatibilidad

- Se leen indistintamente `samples` o el campo histórico `emgData`.
- La reproducción acepta muestras bilaterales con `amplitude`, con `emg` o valores numéricos antiguos.
- Las sesiones sin escenario se identifican como “No registrado”.
- Las sesiones sin muestras no causan errores en el detalle.

## 7. Validación automatizada

- Orden descendente del historial.
- Combinación de filtros.
- Recuperación de muestras nuevas, históricas y ausentes.
- Contrato del reproductor.
- Pausa y continuación deterministas.
- Velocidades permitidas y rechazo de valores inválidos.
- Progreso y finalización.
- Suite completa previa de DEMASY.
- Smoke test de recursos HTTP.
- Carga inicial en Chrome headless.

Resultado: **27 pruebas aprobadas**, lint aprobado y smoke aprobado.

## 8. Criterios de aceptación

| Criterio | Estado |
|---|---|
| Listado y orden del historial | Cumplido |
| Filtros combinables | Cumplido |
| Detalle con configuración, procedencia y métricas | Cumplido |
| Reproducción, pausa, reinicio y finalización | Cumplido |
| Velocidades 0.5×, 1× y 2× | Cumplido |
| Compatibilidad con sesiones antiguas o vacías | Cumplido |
| Exportación individual | Cumplido |
| Archivado y restauración | Cumplido |
| Validación automatizada | Cumplido |
| Recorrido visual e interactivo | Pendiente de validación manual |

## 9. Punto de validación 4

En `http://127.0.0.1:8000`:

1. abrir **Pacientes** y entrar al historial de un participante con sesiones;
2. comprobar que las sesiones estén ordenadas de la más reciente a la más antigua;
3. combinar filtros de fecha, músculo, escenario y estado, y luego limpiarlos;
4. abrir un detalle y verificar configuración, procedencia, métricas y notas;
5. reproducir a 1×, pausar, continuar y reiniciar;
6. repetir a 0.5× y 2×;
7. dejar terminar una reproducción y comprobar el estado “Finalizada”;
8. exportar una sesión y revisar el JSON descargado;
9. archivar una sesión, filtrarla por estado y restaurarla;
10. abrir una sesión histórica o sin muestras, si existe, y comprobar el estado vacío.

La fase permanece en validación hasta la confirmación del responsable. No iniciar la Fase 5 antes de esa aprobación.
