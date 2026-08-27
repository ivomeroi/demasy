# DEMASY v1 — Fase 0: línea base y decisiones

**Estado:** Aprobada  
**Fecha del relevamiento:** 2026-08-26  
**Alcance:** únicamente Fase 0 de `docs/v1-implementation-plan.md`

## 1. Objetivo

Este documento registra el estado verificable del repositorio antes de comenzar la implementación de DEMASY v1, identifica funciones incompletas y presenta propuestas concretas para las decisiones de producto y arquitectura que condicionan las fases posteriores.

No implementa cambios de comportamiento. Las propuestas de la sección 8 requieren aprobación antes de iniciar la Fase 1.

## 2. Estado del repositorio

### 2.1 Control de versiones

- Rama actual: `main`.
- Commit base: `ab948b6 Add ESP32 dual EMG BLE integration`.
- El repositorio posee cambios previos del usuario sin confirmar.
- No se creó una rama automáticamente para evitar cambiar el contexto de trabajo del usuario con archivos pendientes.

Estado observado al iniciar la fase:

```text
 M CODE-ARCHITECTURE.md
?? docs/software-thesis-sections.md
?? docs/v1-implementation-plan.md
?? package-lock.json
```

Archivo agregado durante esta fase:

```text
docs/v1-phase-0-baseline.md
```

### 2.2 Entorno verificado

```text
Node.js: v18.18.2
npm:     9.8.1
```

`package.json` declara Node.js `>=14.0.0`. Para DEMASY v1 se propone actualizar el mínimo soportado; ver Decisión 10.

### 2.3 Línea base de pruebas

Comando ejecutado:

```bash
npm test
```

Resultado:

- validación sintáctica: aprobada;
- archivos JavaScript verificados: 11;
- smoke test HTTP: aprobado;
- URL temporal de la prueba: `http://127.0.0.1:8123`.

El primer intento dentro del sandbox no pudo abrir el puerto local (`EPERM`). La prueba se repitió con permiso para servidor local y finalizó correctamente. Esto es una restricción del entorno de ejecución del agente, no un error del proyecto.

### 2.4 Alcance real de las pruebas actuales

La línea base únicamente verifica:

- sintaxis de archivos JavaScript;
- disponibilidad del HTML principal;
- disponibilidad de archivos estáticos;
- respuesta del endpoint `/api/health`.

No verifica todavía:

- comportamiento del simulador;
- IndexedDB;
- gestión de participantes;
- grabación y guardado;
- navegación real;
- asistente local o remoto;
- importación/exportación;
- renderizado del gráfico;
- flujos end-to-end.

## 3. Recorrido funcional actual

### 3.1 Funciones operativas

- Carga de aplicación y dashboard.
- Simulación bilateral automática.
- Selección de músculo.
- Visualización de señal y RMS.
- Estadísticas bilaterales básicas.
- Controles de desfase en simulación.
- Congelar, reiniciar y limpiar gráfico.
- Creación básica de participantes.
- Búsqueda y selección de participante.
- Historial básico de sesiones.
- Guardado en IndexedDB si existe participante seleccionado.
- Descarga JSON si no existe participante seleccionado.
- Asistente local con intento previo de Gemini.
- Exportación de participante desde su historial.
- Utilidades de exportación total desde consola.

### 3.2 Problema central del flujo actual

El simulador comienza durante la inicialización de la aplicación. `ingestSignalData()` agrega muestras a `sessionData` aun cuando `isRecording` no controla esa captura. Como resultado:

- la aplicación mezcla previsualización y grabación;
- el botón Guardar se habilita por existencia de muestras, no por una sesión finalizada;
- `startRecording()` y `stopRecording()` existen, pero no están conectados a controles visibles de inicio/finalización;
- la duración puede medir tiempo desde la primera muestra recibida, no desde una acción explícita del usuario;
- no hay estado de revisión previo al guardado;
- no hay pausa de grabación diferenciada de congelar el gráfico.

Este punto confirma que la Fase 2 debe priorizar la máquina de estados y el ciclo explícito de sesión.

## 4. Inventario de interfaz incompleta

### 4.1 Botones de marcador de posición

Existen ocho botones visibles con el texto `Próximamente`:

Sección Análisis:

1. Análisis de frecuencia.
2. Comparación bilateral.
3. Análisis de fatiga, que será retirado de la v1.
4. Generar reporte.

Sección Configuración:

5. Configuración de dispositivo.
6. Procesamiento de señal.
7. Tema de interfaz.
8. Preferencias de usuario.

Propuesta para v1:

- implementar comparación bilateral y análisis temporal básico, sin análisis de fatiga;
- implementar configuración útil para simulación, gráfico y preferencias;
- dejar análisis frecuencial validado y reporte profesional fuera de alcance;
- retirar controles de dispositivo de la experiencia principal simulada o mantenerlos separados como integración experimental;
- eliminar cualquier botón no funcional antes de v1.

### 4.2 Acciones invocadas pero no implementadas

`patient-manager.js` genera controles que llaman a estos métodos inexistentes:

- `showPatientMenu(patientId)`;
- `viewSessionDetails(sessionId)`;
- `downloadSession(sessionId)`.

Estas llamadas pueden provocar errores al interactuar con los controles correspondientes.

### 4.3 Gestión incompleta

Faltan recorridos visibles completos para:

- editar participante;
- consultar detalle completo;
- archivar y restaurar;
- listar archivados;
- eliminar o archivar una sesión;
- abrir detalle de sesión;
- reproducir una sesión;
- importar respaldo;
- comparar sesiones;
- configurar parámetros de simulación desde una sesión.

### 4.4 Datos de demostración

`database-init.js` carga datos de ejemplo automáticamente cuando detecta una base vacía. Esto resulta útil para desarrollo, pero puede confundir una demostración formal o una instalación destinada a registrar participantes reales.

Propuesta: reemplazar la carga automática por una acción explícita “Cargar datos de demostración”, habilitada en todos los entornos pero nunca ejecutada sin confirmación.

## 5. Inventario técnico

### 5.1 Captura y límites actuales

Configuración observada:

| Elemento | Valor actual |
|---|---:|
| Frecuencia del simulador | 1000 Hz |
| Intervalo de actualización del gráfico | 50 ms |
| Intervalo de captura de sesión | 5 ms |
| Frecuencia efectiva máxima almacenada | aproximadamente 200 Hz |
| Máximo de muestras de sesión | 120.000 |
| Máximo de puntos visibles | 1.000 por dataset |
| Ventana gráfica real | 1 segundo |
| Texto visible de ventana | 10 segundos |

Con 200 muestras almacenadas por segundo, 120.000 muestras representan aproximadamente 10 minutos. Cuando se supera el límite, actualmente se eliminan las muestras más antiguas, lo que puede producir una sesión cuya duración declarada no coincide con los datos conservados.

### 5.2 Fórmulas de simetría actuales

El simulador utiliza:

```text
SI = min(RMS izquierda, RMS derecha) / max(RMS izquierda, RMS derecha) × 100
diferencia = |RMS izquierda - RMS derecha| / max(RMS izquierda, RMS derecha) × 100
```

Clasificación del simulador:

| Simetría | Nivel |
|---:|---|
| ≥ 90 % | Normal |
| ≥ 75 % y < 90 % | Leve |
| ≥ 60 % y < 75 % | Moderada |
| < 60 % | Severa |

La fuente serial utiliza otra diferencia:

```text
diferencia = |RMS izquierda - RMS derecha| / promedio(RMS izquierda, RMS derecha) × 100
SI = max(0, 100 - diferencia)
```

Clasificación serial:

| Diferencia | Nivel |
|---:|---|
| < 10 % | Normal |
| < 25 % | Leve |
| < 40 % | Moderada |
| ≥ 40 % | Severa |

`patient-manager.js` agrega una tercera interpretación textual con cortes 95, 90, 80 y 70 %. Estas reglas deben unificarse antes de presentar comparaciones o conclusiones.

### 5.3 Persistencia actual

- Motor: IndexedDB.
- Nombre actual: `KinesioEMGDB`.
- Versión actual: 1.
- Stores: `patients`, `sessions`, `analyses`, `settings`.
- Eliminación de participante: baja lógica mediante `isActive: false`.
- Exportación total actual: pacientes activos y sus sesiones; no incluye análisis ni configuración.
- Importación: no implementada como flujo completo.

La migración a DEMASY debe evitar perder la base existente. Cambiar directamente el nombre de `KinesioEMGDB` crearía una base vacía diferente.

### 5.4 Servicios externos actuales

- Chart.js desde CDN.
- Font Awesome desde CDN.
- Gemini mediante `/api/chat` y `GEMINI_API_KEY`.
- Netlify y Vercel configurados principalmente como hosting estático.

Los dos CDN contradicen el objetivo de funcionamiento completamente sin red. Gemini ya posee fallback local, aunque la selección de modo y su estado no son explícitos para el usuario.

## 6. Inventario del nombre heredado

Se detectaron 95 líneas con referencias a `KinesioEMG`, `kinesio-emg` o términos equivalentes, excluyendo el plan v1 y `package-lock.json`.

Archivos afectados:

- `CODE-ARCHITECTURE.md`;
- `ESP32/esp_base.ino`;
- `README.md`;
- `TECHNICAL-DOCUMENTATION.md`;
- `ai-assistant.js`;
- `app.js`;
- `bluetooth-manager.js`;
- `cycling-demo.md`;
- `database-init.js`;
- `database.js`;
- `deploy-guide.md`;
- `deploy.sh`;
- `docs/ai-assistant-context.md`;
- `docs/development.md`;
- `index.html`;
- `netlify.toml`;
- `package.json`;
- `run.sh`;
- `scripts/serve.mjs`;
- `scripts/smoke.mjs`;
- `styles.css`;
- `vercel.json`.

Algunas referencias son visibles y deben cambiar; otras son identificadores internos que pueden conservarse temporalmente para reducir riesgo.

### Estrategia propuesta de migración

1. Cambiar primero identidad visible, metadatos y nombres de exportación a DEMASY.
2. Mantener temporalmente clases JavaScript como `KinesioEMGApp` si renombrarlas no aporta valor funcional inmediato.
3. Mantener acceso a `KinesioEMGDB` durante una migración controlada.
4. Elegir entre:
   - conservar el nombre físico de IndexedDB como detalle interno heredado; o
   - crear `DEMASYDB`, copiar datos transaccionalmente y marcar la migración completada.
5. No cambiar UUID, nombre BLE ni firmware dentro del alcance simulado de v1 salvo decisión separada.
6. Actualizar smoke tests y documentación junto con la identidad visible.

Decisión aprobada para v1: utilizar `DEMASYDB` como nuevo nombre físico y migrar los datos existentes desde `KinesioEMGDB` mediante un proceso controlado y no destructivo.

## 7. Estrategia de rama

La Fase 0 solicitaba crear una rama de trabajo. No se creó todavía porque:

- el repositorio está sobre `main`;
- existen cambios previos no confirmados;
- cambiar de rama con esos archivos mantendría o mezclaría el estado pendiente;
- la decisión sobre cómo agrupar esos cambios pertenece al usuario.

Estrategia aprobada:

1. confirmar y subir a `main` todos los cambios actuales;
2. crear `feature/demasy-v1` desde ese estado actualizado de `main`;
3. crear una rama hija para cada fase, usando el patrón `feature/demasy-v1-phase-N`;
4. integrar cada rama de fase en `feature/demasy-v1` únicamente después de su punto de validación;
5. etiquetar la versión únicamente después del Punto de validación 10.

Esta estrategia fue aprobada por el responsable el 2026-08-26.

## 8. Propuestas para decisiones de la Fase 0

### Decisión 1 — Identificación del participante

**Propuesta:** `participantCode` obligatorio y único; nombre real, correo y fecha de nacimiento opcionales.

Justificación:

- favorece anonimización;
- permite demostraciones sin datos personales;
- mantiene la posibilidad de uso académico con información adicional;
- reduce el riesgo al exportar respaldos.

Valor predeterminado sugerido: generación automática `P-0001`, editable antes de guardar.

### Decisión 2 — Duración máxima

**Propuesta:** máximo de 30 minutos por sesión; duración predeterminada de 60 segundos.

Duraciones seleccionables sugeridas:

- 30 segundos;
- 60 segundos;
- 2 minutos;
- 5 minutos;
- 10 minutos;
- personalizada hasta 30 minutos.

La interfaz deberá advertir el tamaño estimado antes de iniciar sesiones largas.

### Decisión 3 — Frecuencia de almacenamiento

**Propuesta:** simulación interna a 1000 Hz, gráfico actualizado a 20 FPS y almacenamiento normalizado a 100 Hz por lado.

Justificación:

- 100 Hz resulta suficiente para reproducir visualmente los escenarios simulados de la v1;
- reduce a la mitad el volumen actual;
- 30 minutos producen aproximadamente 180.000 muestras normalizadas;
- la señal interna puede conservar 1000 Hz para generar patrones y métricas en tiempo real.

Si el trabajo académico exige exportar señal simulada a 1000 Hz, deberá aprobarse una política alternativa de almacenamiento por bloques o exportación en streaming.

### Decisión 4 — Fórmula de simetría

**Propuesta:** para v1 usar la razón entre el menor y el mayor RMS:

```text
SI = min(RMS izquierda, RMS derecha) / max(RMS izquierda, RMS derecha) × 100
Asimetría = 100 - SI
```

Ventajas:

- rango natural entre 0 y 100 %;
- interpretación simple;
- coincide con el simulador actual;
- evita diferencias superiores a 100 %.

Debe calcularse sobre ventanas y sobre la sesión completa. La fórmula debe presentarse como definición operacional del prototipo, no como estándar clínico universal.

### Decisión 5 — Umbrales

**Propuesta provisional para simulación:**

| SI | Etiqueta descriptiva |
|---:|---|
| ≥ 90 % | Simetría alta |
| ≥ 75 % y < 90 % | Diferencia leve |
| ≥ 60 % y < 75 % | Diferencia moderada |
| < 60 % | Diferencia marcada |

Cambiar `Normal/Leve/Moderada/Severa` por términos descriptivos reduce la apariencia diagnóstica.

Estos cortes deberán identificarse como umbrales demostrativos hasta contar con respaldo bibliográfico específico y validación experimental.

### Decisión 6 — Compatibilidad de comparaciones

**Propuesta:** exigir mismo participante, músculo y tipo de prueba. Permitir distinta cadencia, resistencia, duración o escenario, pero mostrar una advertencia y las diferencias de configuración.

No calcular una única variación porcentual de “progreso” cuando las condiciones difieran. En ese caso se presentarán métricas lado a lado.

### Decisión 7 — Formatos de exportación

**Propuesta:** incluir JSON y CSV en v1.

- JSON: respaldo completo, restauración y conservación de estructura.
- CSV: una sesión por archivo para análisis externo de muestras y métricas.

La importación se limitará a JSON versionado. CSV será solo de salida.

### Decisión 8 — Análisis de fatiga

**Decisión aprobada:** eliminar el análisis de fatiga del alcance de DEMASY v1.

Esto implica:

- retirar el botón de análisis de fatiga;
- no calcular pendientes ni indicadores de fatiga;
- no generar interpretaciones fisiológicas relacionadas con fatiga;
- mantener cualquier capacidad existente del simulador solo como escenario de generación de señal, sin presentar un resultado de análisis de fatiga;
- trasladar un eventual análisis de fatiga al backlog posterior a v1.

### Decisión 9 — Dependencias visuales

**Propuesta:** distribuir Chart.js localmente y reemplazar Font Awesome por SVG locales o una copia local controlada.

Objetivo: dashboard, reproducción y análisis completamente funcionales sin internet.

### Decisión 10 — Navegadores y Node.js soportados

**Propuesta:**

- simulación: últimas dos versiones estables de Chrome, Edge y Firefox;
- Safari: mejor esfuerzo, no bloqueante para v1;
- integración física: Chrome/Edge, fuera del criterio simulado;
- Node.js local: mínimo 18, recomendado 20 LTS o superior compatible.

La CI o validación manual debe cubrir al menos Chrome y Firefox para el flujo simulado.

### Decisión 11 — Datos de demostración

**Propuesta:** no cargar datos automáticamente. Mostrar una base vacía con acciones:

- “Crear participante”;
- “Cargar datos de demostración”.

La carga demo deberá pedir confirmación, utilizar identificadores ficticios claros y poder eliminarse sin afectar datos creados por el usuario.

### Decisión 12 — Despliegue y asistente

**Propuesta:** publicar primero una demo estática completa con asistente local. Mantener Gemini como despliegue opcional separado.

Entornos:

- local: asistente `auto`;
- pruebas: asistente `mock`;
- demo pública estática: asistente `local`;
- demo completa opcional: asistente `auto` mediante función serverless o servidor Node.

Esto evita que la disponibilidad o el costo de una API condicione la presentación de DEMASY.

## 9. Decisiones adicionales propuestas

### 9.1 Nombre físico de IndexedDB

**Decisión aprobada:** utilizar `DEMASYDB` como nombre físico de IndexedDB en v1.

La implementación deberá:

- detectar la base heredada `KinesioEMGDB`;
- copiar participantes, sesiones, análisis y configuración a `DEMASYDB`;
- validar cantidades y relaciones antes de marcar la migración como completa;
- conservar inicialmente la base anterior como respaldo recuperable;
- evitar repetir o duplicar la migración en cada inicio;
- informar un error accionable si la migración no puede completarse.

### 9.2 Reporte PDF

**Propuesta:** fuera de v1. Ofrecer exportación JSON/CSV y exportación de gráfico como imagen si entra en el alcance de UX.

### 9.3 Análisis frecuencial

**Propuesta:** fuera de v1 hasta definir método, frecuencia de muestreo almacenada y validación. Retirar el botón `Próximamente` de la navegación funcional.

### 9.4 Configuración de hardware

**Propuesta:** conservar los controles actuales sin ampliarlos, separados del recorrido simulado. No constituye criterio de cierre de v1.

## 10. Criterios de aceptación de Fase 0

| Criterio | Estado | Evidencia |
|---|---|---|
| Línea base ejecutada | Cumplido | `npm test` aprobado |
| Recorrido actual relevado | Cumplido | Secciones 3 y 4 |
| Funciones incompletas inventariadas | Cumplido | Sección 4 |
| Referencias heredadas inventariadas | Cumplido | Sección 6 |
| Configuración de captura registrada | Cumplido | Sección 5.1 |
| Fórmulas actuales comparadas | Cumplido | Sección 5.2 |
| Decisiones abiertas con propuesta | Cumplido | Secciones 8 y 9 |
| Rama de trabajo creada | En ejecución | Sección 7 |
| Decisiones aprobadas por responsable | Cumplido | Aprobación del 2026-08-26 |

## 11. Punto de validación 0

El responsable aprobó el Punto de validación 0 el 2026-08-26 con estas modificaciones:

1. se aceptan las propuestas de la sección 8, excepto que el análisis de fatiga se elimina de v1;
2. se aceptan las propuestas de la sección 9, utilizando `DEMASYDB` en lugar de conservar el nombre físico anterior;
3. todos los cambios actuales se confirman y suben a `main`;
4. se crea `feature/demasy-v1` desde `main` actualizado;
5. cada fase posterior se desarrolla en una rama hija propia.

La Fase 0 queda aprobada. La Fase 1 solo deberá comenzar en su rama hija correspondiente.
