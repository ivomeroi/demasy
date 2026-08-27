# Plan de implementación de DEMASY v1

## 1. Propósito del documento

Este documento define la planificación técnica y funcional necesaria para convertir el prototipo actual de DEMASY en una primera versión completa, demostrable y mantenible, utilizando señales simuladas como fuente principal de datos.

**Nombre oficial del producto:** DEMASY. El nombre `KinesioEMG` pertenece a una etapa anterior del proyecto y todavía puede aparecer en clases, variables, nombres de base de datos, textos de interfaz y documentación heredada. La migración de identidad deberá reemplazar progresivamente esas referencias sin provocar pérdida de datos existentes.

Está diseñado para cumplir tres funciones:

1. Servir como hoja de ruta validable por el responsable del proyecto.
2. Servir como entrada de trabajo para sesiones futuras con Codex, Claude u otro agente de desarrollo.
3. Mantener trazabilidad entre requisitos, implementación, pruebas, documentación y entrega.

La integración con hardware y la adquisición real de señales no forman parte del alcance principal de este plan. Los componentes existentes de USB, Bluetooth y firmware deben conservarse, pero no bloquearán la finalización de la versión simulada.

Toda funcionalidad que dependa de un servicio externo deberá disponer de uno de estos mecanismos:

- implementación local;
- adaptador simulado;
- respuesta determinista de prueba;
- degradación controlada que mantenga disponible el flujo principal.

## 2. Definición de producto para la v1

DEMASY v1 será una aplicación web en español para simular, registrar, visualizar, almacenar y analizar sesiones bilaterales de EMG durante ciclismo en bicicleta fija.

La versión se considerará terminada cuando un usuario pueda ejecutar, sin hardware ni servicios externos obligatorios, el siguiente recorrido:

1. Abrir la aplicación localmente.
2. Crear o seleccionar un participante.
3. Configurar una sesión simulada.
4. Elegir un escenario de simulación.
5. Previsualizar la señal.
6. Iniciar, pausar, reanudar y finalizar una grabación.
7. Revisar un resumen antes de guardar.
8. Guardar la sesión en la base local.
9. Consultar posteriormente la sesión.
10. Reproducir sus señales.
11. Revisar métricas e interpretación descriptiva.
12. Compararla con otra sesión compatible.
13. Exportar los datos.
14. Crear y restaurar una copia de seguridad.

El asistente remoto, el despliegue público y cualquier servicio en la nube serán complementarios. Su ausencia no deberá impedir ese recorrido.

## 3. Alcance

### 3.1 Incluido en la v1

- Aplicación web ejecutable localmente.
- Simulación bilateral configurable.
- Escenarios normales, asimétricos y de fatiga.
- Gestión completa de participantes.
- Ciclo explícito de grabación.
- Persistencia en IndexedDB.
- Historial y detalle de sesiones.
- Reproducción de sesiones guardadas.
- Métricas temporales bilaterales.
- Comparación básica entre sesiones.
- Exportación e importación con formato versionado.
- Asistente local y asistente remoto opcional.
- Configuración persistente de la aplicación.
- Estados de carga, error y funcionamiento degradado.
- Pruebas unitarias, de integración y de recorrido principal.
- Despliegue estático de la aplicación base.
- Despliegue opcional de la API del asistente.
- Documentación técnica y de usuario.

### 3.2 Fuera de alcance para la v1

- Certificación como dispositivo médico.
- Diagnóstico clínico automático.
- Recomendaciones terapéuticas prescriptivas.
- Autenticación multiusuario.
- Sincronización en la nube de pacientes o sesiones.
- Colaboración entre profesionales.
- Aplicación móvil nativa.
- Integración obligatoria con ESP32.
- Procesamiento clínico validado sobre señales reales.
- Facturación, turnos o gestión institucional.
- Reportes PDF con validez clínica.
- Algoritmos de aprendizaje automático entrenados con pacientes.

### 3.3 Principio de alcance

Cuando exista una función incompleta en la interfaz, se deberá elegir una de estas opciones antes de declarar terminada la v1:

1. implementarla completamente;
2. retirarla de la navegación principal;
3. mostrarla como función futura en la documentación, no como control interactivo.

No deben quedar botones principales que aparenten funcionar y no produzcan ninguna acción.

## 4. Estado inicial relevante

El repositorio ya contiene:

- interfaz HTML/CSS sin framework;
- controlador central en `app.js`;
- simulador bilateral en `emg-simulator.js`;
- persistencia con IndexedDB en `database.js`;
- gestión parcial de pacientes en `patient-manager.js`;
- asistente local con integración opcional a Gemini;
- servidor Node local con endpoint `/api/chat`;
- ingestión USB y Bluetooth que debe conservarse;
- scripts de validación sintáctica y smoke test;
- configuraciones de despliegue estático para Netlify y Vercel.

Las principales brechas del prototipo son:

- el simulador se ejecuta y captura datos de manera continua;
- no existe un ciclo de grabación explícito y coherente;
- la configuración de sesión no está consolidada;
- la gestión de pacientes y sesiones tiene caminos incompletos;
- las secciones Análisis y Configuración son principalmente marcadores de posición;
- no existe reproducción completa de una sesión;
- la importación y restauración no están cerradas;
- las pruebas actuales no cubren comportamiento funcional;
- la documentación no siempre coincide con el código.

## 5. Principios técnicos obligatorios

### 5.1 Funcionamiento local primero

La aplicación deberá funcionar con:

```bash
npm install
npm start
```

El flujo principal no deberá requerir claves, cuentas, conexión a internet ni dispositivos físicos.

### 5.2 Dependencias externas opcionales

Cada dependencia externa deberá estar detrás de una interfaz estable. La interfaz consumidora no deberá saber si la respuesta provino de un servicio real o de un mock.

Ejemplos:

- `AssistantService`: Gemini o asistente local.
- `StorageService`: IndexedDB o memoria para pruebas.
- `SignalSource`: simulador, sesión reproducida o hardware.
- `ExportService`: descarga local; futuro almacenamiento externo.

### 5.3 Degradación controlada

Si un servicio remoto no está disponible:

- la aplicación no debe bloquearse;
- se debe informar el modo actual;
- se debe usar una alternativa local cuando exista;
- no se deben perder datos de la sesión;
- los errores técnicos deben registrarse sin exponer datos personales.

### 5.4 Separación entre dominio e interfaz

Las fórmulas, validaciones y transiciones de estado no deben depender directamente del DOM. Esto permitirá probarlas sin abrir un navegador.

Como mínimo, se deberán separar:

- máquina de estados de grabación;
- configuración de sesión;
- cálculo de métricas;
- validación de importaciones;
- comparación de sesiones;
- selección de adaptadores de servicios.

### 5.5 Datos simulados explícitos

Toda sesión deberá registrar su procedencia:

```javascript
source: {
    type: 'simulation',
    provider: 'built-in',
    scenario: 'left-fatigue',
    version: 1
}
```

La interfaz deberá mostrar de forma visible que se trabaja con datos simulados.

### 5.6 Privacidad por diseño

- Minimizar datos identificatorios.
- Permitir trabajar con código de participante.
- Mantener los datos localmente por defecto.
- No enviar datos de pacientes a la API del asistente.
- El contexto remoto deberá contener métricas anonimizadas, no nombres, correos ni notas clínicas.
- Advertir que IndexedDB no constituye almacenamiento cifrado.

## 6. Arquitectura objetivo

La v1 puede conservar JavaScript nativo, evitando una migración de framework que aumente el riesgo. Se recomienda reorganizar gradualmente la lógica mediante módulos o clases pequeñas.

```text
Interfaz de usuario
├── Dashboard y configuración de sesión
├── Participantes
├── Historial y detalle de sesión
├── Análisis y comparación
├── Asistente
└── Configuración
        ↓
Controladores de aplicación
├── RecordingController
├── SessionController
├── PatientController
├── AnalysisController
└── SettingsController
        ↓
Servicios de dominio
├── SimulationService
├── AnalysisService
├── SessionService
├── PatientService
├── ImportExportService
└── AssistantService
        ↓
Adaptadores
├── IndexedDBAdapter
├── MemoryStorageAdapter
├── LocalAssistantAdapter
├── GeminiAssistantAdapter
├── SimulatorSignalAdapter
└── ReplaySignalAdapter
```

No es obligatorio crear exactamente esos archivos en una única iteración. Sí es obligatorio respetar las responsabilidades y evitar que toda la nueva lógica se acumule en `app.js`.

## 7. Contratos de servicios

### 7.1 Fuente de señal

Todas las fuentes deberán cumplir un contrato equivalente:

```javascript
class SignalSource {
    start(config) {}
    pause() {}
    resume() {}
    stop() {}
    reset() {}
    getStats() {}
    onDataUpdate(callback) {}
    onStatsUpdate(callback) {}
    getStatus() {}
}
```

Adaptadores requeridos para la v1:

- `SimulatorSignalSource`: obligatorio.
- `ReplaySignalSource`: obligatorio para reproducir sesiones.
- `SerialSignalSource`: se conserva, fuera del criterio de cierre.
- `BluetoothSignalSource`: se conserva, fuera del criterio de cierre.

### 7.2 Persistencia

Contrato mínimo:

```javascript
class StorageService {
    initialize() {}
    createPatient(data) {}
    updatePatient(id, data) {}
    archivePatient(id) {}
    listPatients(filters) {}
    createSession(data) {}
    updateSession(id, data) {}
    archiveSession(id) {}
    listSessions(filters) {}
    getSession(id) {}
    exportAll() {}
    importAll(data, strategy) {}
}
```

Adaptadores:

- IndexedDB: implementación de producción local.
- Memoria: pruebas automatizadas y demostraciones aisladas.

### 7.3 Asistente

Contrato mínimo:

```javascript
class AssistantService {
    isAvailable() {}
    getMode() {} // local | remote
    ask(message, anonymizedContext) {}
    clearHistory() {}
}
```

Implementaciones:

- local determinista: obligatoria;
- Gemini: opcional;
- mock con respuestas configurables: obligatorio para pruebas.

La selección deberá seguir esta regla:

```text
API configurada y saludable → adaptador remoto
API ausente o con error      → adaptador local
entorno de pruebas           → adaptador mock
```

### 7.4 Exportación

La exportación será local mediante descarga del navegador. No deberá depender de Dropbox, Google Drive ni otro proveedor.

El diseño permitirá agregar un destino remoto en el futuro, pero no se implementará para cerrar la v1.

## 8. Modelo de datos propuesto

### 8.1 Participante

```javascript
{
    id: 1,
    participantCode: 'P-0001',
    name: 'Opcional',
    email: 'Opcional',
    dateOfBirth: '1990-01-01',
    gender: 'optional-value',
    height: 175,
    weight: 70,
    medicalHistory: [],
    notes: '',
    consentConfirmed: false,
    status: 'active',
    createdAt: 'ISO-8601',
    updatedAt: 'ISO-8601'
}
```

### 8.2 Configuración de sesión

```javascript
{
    patientId: 1,
    label: 'Evaluación inicial',
    muscleType: 'quadriceps',
    testType: 'stationary-cycling',
    plannedDurationSeconds: 60,
    cadenceRpm: 80,
    resistancePercent: 50,
    scenario: 'symmetric',
    scenarioParameters: {
        asymmetryPercent: 0,
        affectedSide: null,
        fatigueRate: 0,
        phaseDelayDegrees: 0
    },
    notes: ''
}
```

### 8.3 Sesión guardada

```javascript
{
    id: 1,
    schemaVersion: 1,
    patientId: 1,
    label: 'Evaluación inicial',
    startedAt: 'ISO-8601',
    endedAt: 'ISO-8601',
    durationSeconds: 60,
    status: 'completed',
    source: {
        type: 'simulation',
        provider: 'built-in',
        scenario: 'symmetric',
        version: 1
    },
    configuration: {},
    samples: [],
    statistics: {},
    analysis: {},
    notes: '',
    createdAt: 'ISO-8601',
    updatedAt: 'ISO-8601'
}
```

### 8.4 Muestra normalizada

```javascript
{
    time: 0.125,
    left: {
        amplitude: 0.42,
        envelope: 0.31
    },
    right: {
        amplitude: 0.39,
        envelope: 0.29
    },
    pedal: {
        leftDegrees: 60,
        rightDegrees: 240
    }
}
```

### 8.5 Formato de respaldo

```javascript
{
    application: 'DEMASY',
    schemaVersion: 1,
    exportedAt: 'ISO-8601',
    metadata: {
        appVersion: '1.0.0',
        source: 'local-export'
    },
    data: {
        patients: [],
        sessions: [],
        analyses: [],
        settings: []
    }
}
```

## 9. Máquina de estados de grabación

La grabación no deberá administrarse mediante booleanos independientes sin reglas. Se implementará una máquina de estados:

```text
idle
  ↓ configurar
ready
  ↓ iniciar
recording
  ↔ paused
  ↓ finalizar
review
  ├── guardar → saved → ready
  └── descartar → ready
```

Reglas:

- `idle`: no existe una configuración válida.
- `ready`: existe paciente y configuración válida.
- `recording`: se capturan muestras para la sesión actual.
- `paused`: la previsualización puede continuar, pero no se agregan muestras.
- `review`: la captura terminó y se muestra el resumen.
- `saved`: la transacción de persistencia finalizó correctamente.
- ante error de guardado se permanece en `review` para evitar pérdida de datos.

Los controles habilitados deberán derivarse del estado y no de condiciones dispersas.

## 10. Escenarios de simulación requeridos

### 10.1 Escenarios mínimos

| Identificador | Descripción | Parámetros principales |
|---|---|---|
| `symmetric` | Pedaleo bilateral normal | cadencia, resistencia |
| `left-weakness` | Menor amplitud izquierda | porcentaje de reducción |
| `right-weakness` | Menor amplitud derecha | porcentaje de reducción |
| `left-fatigue` | Fatiga progresiva izquierda | tasa y duración |
| `right-fatigue` | Fatiga progresiva derecha | tasa y duración |
| `phase-delay` | Retraso de activación | lado y grados |
| `intervals` | Cambios periódicos de intensidad | trabajo, descanso, ciclos |
| `custom` | Parámetros manuales | todos los controles habilitados |

### 10.2 Reproducibilidad

El simulador deberá aceptar opcionalmente una semilla pseudoaleatoria. Una misma semilla y configuración deberá producir resultados comparables para pruebas automatizadas.

### 10.3 Validación del simulador

Para cada escenario se deberá verificar:

- que produce muestras finitas;
- que mantiene el desfase bilateral esperado;
- que respeta el lado afectado;
- que la métrica de asimetría reacciona en la dirección esperada;
- que la fatiga evoluciona progresivamente;
- que detener y reiniciar no mezcla datos de sesiones distintas.

## 11. Métricas de análisis v1

### 11.1 Métricas obligatorias por lado

- RMS.
- Amplitud pico absoluta.
- MAV o valor absoluto medio.
- Mínimo y máximo.
- Duración efectiva.
- Activación media normalizada.

### 11.2 Métricas bilaterales obligatorias

- Diferencia absoluta de RMS.
- Diferencia porcentual.
- Índice de simetría.
- Lado dominante.
- Diferencia de fase estimada o configurada.
- Evolución de la diferencia por ventanas temporales.

### 11.3 Exclusión del análisis de fatiga

DEMASY v1 no calculará ni presentará análisis de fatiga. Los escenarios de fatiga existentes podrán conservarse como patrones del simulador para producir señales de demostración, pero no generarán indicadores, diagnósticos ni interpretaciones específicas de fatiga.

Un eventual análisis de fatiga deberá tratarse como trabajo posterior a v1 y requerirá una definición metodológica y una validación independientes.

### 11.4 Requisitos de implementación

- Cada fórmula debe existir en una función pura.
- Cada fórmula debe incluir prueba automatizada.
- La documentación debe incluir definición, unidad y limitaciones.
- Los umbrales deben centralizarse en configuración.
- Ninguna métrica debe presentarse como diagnóstico.

## 12. Plan de ejecución por fases

Cada fase termina con un punto de validación. No se deberá comenzar una fase que dependa de decisiones pendientes de la anterior sin aprobación del responsable del proyecto.

### Estrategia de ramas aprobada

- Rama de integración de la versión: `feature/demasy-v1`.
- Cada fase se desarrolla desde esa rama en `feature/demasy-v1-phase-N`.
- Una rama de fase solo se integra en `feature/demasy-v1` después de cumplir sus criterios de aceptación y recibir aprobación en su punto de validación.
- La siguiente rama de fase parte de `feature/demasy-v1` ya actualizada con la fase anterior.
- `feature/demasy-v1` se integrará en `main` únicamente cuando la v1 completa haya sido aprobada.

### Fase 0 — Línea base y decisiones

#### Objetivo

Estabilizar el punto de partida y fijar decisiones de producto antes de modificar el comportamiento.

#### Tareas

- [ ] Crear una rama de trabajo para v1.
- [ ] Ejecutar y registrar `npm test`.
- [ ] Verificar manualmente el recorrido actual.
- [ ] Inventariar botones y funciones incompletas.
- [ ] Decidir si nombre, correo y fecha de nacimiento serán obligatorios u opcionales.
- [ ] Definir duración máxima de una sesión simulada.
- [ ] Definir frecuencia real de almacenamiento, separada de la frecuencia visual.
- [ ] Aprobar las fórmulas y umbrales de simetría.
- [ ] Decidir si la comparación v1 exige mismo músculo y mismo tipo de prueba.
- [ ] Definir navegadores soportados.
- [ ] Definir si los datos de ejemplo se cargan manualmente o solo en modo desarrollo.
- [ ] Inventariar todas las referencias heredadas a `KinesioEMG` en código, interfaz, base de datos, configuración, documentación y despliegues.
- [ ] Definir una estrategia de migración de nombre que preserve la base IndexedDB existente o importe sus datos en el nuevo esquema.

#### Entregables

- Registro de decisiones en este documento o en `docs/decisions/`.
- Lista de funcionalidades que se implementan y botones que se eliminan.
- Línea base de pruebas en verde.

#### Criterio de aceptación

El responsable aprueba alcance, decisiones pendientes y definición de v1.

#### Punto de validación 0

No avanzar sin aprobación explícita.

### Fase 1 — Fundaciones y contratos

#### Objetivo

Separar la lógica necesaria para que las siguientes funciones puedan probarse y evolucionar sin ampliar indefinidamente `app.js`.

#### Tareas

- [ ] Crear estructura para controladores, servicios y utilidades.
- [ ] Definir tipos mediante JSDoc o esquemas documentados.
- [ ] Crear contrato común de fuentes de señal.
- [ ] Adaptar el simulador al contrato sin cambiar su comportamiento visible.
- [ ] Crear fuente de reproducción.
- [ ] Crear servicio de análisis con funciones puras.
- [ ] Crear servicio de configuración persistente.
- [ ] Centralizar constantes, umbrales y unidades.
- [ ] Incorporar un identificador de versión de aplicación y esquema.
- [ ] Agregar entorno de pruebas unitarias si el actual no es suficiente.

#### Pruebas

- Contrato del simulador.
- Inicio, pausa, reanudación, detención y reinicio.
- Cálculos básicos con vectores conocidos.
- Adaptador de almacenamiento en memoria.
- Carga de configuración predeterminada.

#### Criterio de aceptación

El dashboard actual continúa funcionando y la nueva lógica de dominio puede probarse sin DOM.

#### Punto de validación 1

Revisión de arquitectura y nombres públicos antes de construir la experiencia completa.

### Fase 2 — Configuración y grabación

#### Objetivo

Implementar el recorrido principal desde configuración hasta revisión de una sesión aún no guardada.

#### Tareas de interfaz

- [ ] Crear panel o modal de nueva sesión.
- [ ] Seleccionar paciente.
- [ ] Elegir músculo y tipo de prueba.
- [ ] Configurar cadencia, resistencia y duración.
- [ ] Elegir escenario y parámetros.
- [ ] Mostrar validaciones en línea.
- [ ] Mostrar estado “Previsualización”.
- [ ] Incorporar botones Iniciar, Pausar, Reanudar, Finalizar y Descartar.
- [ ] Mostrar tiempo transcurrido y tiempo previsto.
- [ ] Confirmar abandono de una sesión activa.
- [ ] Crear pantalla/modal de revisión.

#### Tareas de lógica

- [ ] Implementar la máquina de estados.
- [ ] Separar previsualización de captura.
- [ ] Reiniciar buffers al iniciar.
- [ ] Evitar captura mientras está pausada.
- [ ] Calcular duración con un reloj monotónico.
- [ ] Limitar muestras según duración y política de almacenamiento.
- [ ] Conservar la sesión en memoria si falla el guardado.
- [ ] Generar resumen al finalizar.

#### Pruebas

- Transiciones válidas e inválidas.
- Pausa sin agregado de muestras.
- Reinicio sin contaminación entre sesiones.
- Finalización automática por duración.
- Finalización manual.
- Protección frente a doble clic.
- Conservación de datos ante error simulado de persistencia.

#### Criterio de aceptación

Se puede configurar, grabar, pausar, finalizar, revisar y descartar una simulación sin errores.

#### Punto de validación 2

Demostración manual completa antes de conectar el guardado definitivo.

### Fase 3 — Participantes y persistencia

#### Objetivo

Completar la administración de participantes y hacer confiable el guardado de sesiones.

#### Tareas de base de datos

- [ ] Crear `DEMASYDB` como nombre físico de la base v1.
- [ ] Detectar y migrar de forma no destructiva los datos existentes desde `KinesioEMGDB`.
- [ ] Incrementar versión de IndexedDB si cambia el esquema.
- [ ] Crear migración no destructiva.
- [ ] Añadir código de participante y estado.
- [ ] Definir índices necesarios.
- [ ] Normalizar fechas y valores numéricos.
- [ ] Manejar transacciones fallidas.
- [ ] Detectar cuota agotada.
- [ ] Evitar duplicados evidentes.

#### Tareas de participantes

- [ ] Crear participante.
- [ ] Editar participante.
- [ ] Consultar detalle.
- [ ] Archivar y restaurar.
- [ ] Buscar y filtrar.
- [ ] Seleccionar y cambiar participante actual.
- [ ] Añadir estados vacíos y confirmaciones.
- [ ] Escapar todo contenido mostrado.

#### Tareas de sesiones

- [ ] Guardar la sesión revisada.
- [ ] Asociarla al participante correcto.
- [ ] Guardar configuración, fuente, muestras, métricas y notas.
- [ ] Confirmar el guardado visualmente.
- [ ] Impedir guardados duplicados accidentales.
- [ ] Mantener una copia recuperable si la transacción falla.

#### Pruebas

- CRUD de participantes.
- Migración desde el esquema existente.
- Archivado sin pérdida física.
- Creación de sesión y relación con participante.
- Error de transacción simulado.
- Datos con caracteres especiales y contenido potencialmente peligroso.

#### Criterio de aceptación

El recorrido crear participante → grabar → guardar → recargar página → encontrar sesión funciona sin pérdida de datos.

#### Punto de validación 3

Validación del modelo de datos real almacenado mediante exportación de ejemplo.

### Fase 4 — Historial, detalle y reproducción

#### Objetivo

Permitir que los datos guardados vuelvan a utilizarse.

#### Tareas

- [ ] Crear listado de sesiones por participante.
- [ ] Agregar filtros por fecha, músculo, escenario y estado.
- [ ] Implementar detalle de sesión.
- [ ] Mostrar configuración y procedencia.
- [ ] Mostrar métricas guardadas.
- [ ] Implementar reproducción con controles.
- [ ] Añadir velocidad 0.5×, 1× y 2× si no compromete el alcance.
- [ ] Permitir pausar y reiniciar reproducción.
- [ ] Exportar sesión individual.
- [ ] Archivar sesión con confirmación.
- [ ] Corregir o retirar referencias actuales a métodos inexistentes.

#### Pruebas

- Orden y filtros del historial.
- Reproducción preservando la línea temporal.
- Finalización de reproducción.
- Sesión sin muestras o con datos antiguos.
- Archivo y restauración.

#### Criterio de aceptación

Una sesión guardada puede abrirse, comprenderse y reproducirse después de reiniciar la aplicación.

#### Punto de validación 4

Validación visual y funcional del detalle de sesión.

### Fase 5 — Análisis y comparación

#### Objetivo

Reemplazar la sección de marcador de posición por análisis reproducibles y comprensibles.

#### Tareas

- [ ] Implementar todas las métricas obligatorias.
- [ ] Calcular métricas por ventanas temporales.
- [ ] Mostrar evolución de activación y asimetría.
- [ ] Verificar que la interfaz no presente análisis ni conclusiones de fatiga.
- [ ] Mostrar lado dominante.
- [ ] Mostrar fórmula o ayuda contextual.
- [ ] Marcar las interpretaciones como descriptivas.
- [ ] Crear selector de dos sesiones compatibles.
- [ ] Definir reglas de compatibilidad.
- [ ] Comparar valores absolutos y diferencias porcentuales.
- [ ] Mostrar configuración de ambas sesiones para evitar comparaciones engañosas.
- [ ] Permitir exportar el resumen comparativo como JSON o CSV.

#### Pruebas

- Vectores simétricos conocidos.
- Asimetría izquierda y derecha conocida.
- Señales vacías, nulas y con valores no finitos.
- Comparación compatible e incompatible.
- Coherencia entre métricas mostradas y almacenadas.

#### Criterio de aceptación

La sección Análisis no contiene controles vacíos y explica claramente resultados de una o dos sesiones.

#### Punto de validación 5

Revisión de fórmulas, unidades, umbrales y textos interpretativos.

### Fase 6 — Importación, exportación y recuperación

#### Objetivo

Evitar que IndexedDB sea un punto único de pérdida de datos.

#### Tareas

- [ ] Implementar exportación total versionada.
- [ ] Implementar exportación por participante.
- [ ] Implementar exportación por sesión.
- [ ] Crear validación estructural de archivos importados.
- [ ] Limitar tamaño aceptado.
- [ ] Mostrar previsualización del contenido.
- [ ] Implementar estrategia `merge`.
- [ ] Implementar estrategia `replace` con confirmación reforzada.
- [ ] Detectar conflictos y duplicados.
- [ ] Informar creados, actualizados, omitidos y fallidos.
- [ ] Probar restauración sobre una base vacía.
- [ ] Probar migración de una versión anterior.
- [ ] Añadir acción explícita para datos de demostración.

#### Mock requerido

El selector de archivos puede probarse llamando directamente al servicio con objetos JavaScript. No debe requerir acceso a almacenamiento remoto.

#### Criterio de aceptación

Una exportación completa puede restaurarse en un navegador limpio y conservar participantes, sesiones, métricas y configuración.

#### Punto de validación 6

Ensayo documentado de respaldo y restauración.

### Fase 7 — Asistente y servicios externos

#### Objetivo

Hacer que el asistente sea opcional, transparente y seguro.

#### Tareas del asistente

- [ ] Crear selector automático de adaptador.
- [ ] Mostrar “Asistente local” o “Asistente remoto”.
- [ ] Añadir estado de carga.
- [ ] Evitar mensajes duplicados.
- [ ] Eliminar la demora artificial.
- [ ] Sanitizar formato de salida.
- [ ] Enviar únicamente contexto anonimizado.
- [ ] Agregar descargo de responsabilidad.
- [ ] Evitar afirmaciones diagnósticas.
- [ ] Probar caída y tiempo de espera de la API.
- [ ] Añadir health check opcional.
- [ ] Mantener el historial limitado.

#### Servicio remoto

La API local de Gemini deberá configurarse mediante variables:

```env
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
ASSISTANT_MODE=auto
```

Modos previstos:

- `local`: nunca llama a la red.
- `remote`: intenta la API y muestra error si no está configurada.
- `auto`: intenta remoto y usa local ante error.
- `mock`: respuestas predefinidas para pruebas.

#### Criterio de aceptación

El asistente funciona sin internet, y una falla remota no afecta el resto de la aplicación ni expone información personal.

#### Punto de validación 7

Revisar ejemplos de respuestas locales y remotas antes de aprobar textos definitivos.

### Fase 8 — Configuración, UX y accesibilidad

#### Objetivo

Eliminar inconsistencias visuales y cerrar todas las rutas principales.

#### Tareas

- [ ] Implementar configuración útil o retirar tarjetas pendientes.
- [ ] Persistir preferencias locales.
- [ ] Unificar todos los textos en español.
- [ ] Reemplazar la identidad visual y los textos heredados de `KinesioEMG` por `DEMASY`.
- [ ] Actualizar título del documento, encabezados, nombre de aplicación, metadatos y mensajes visibles.
- [ ] Reemplazar “Mock Mode” por “Modo simulación”.
- [ ] Corregir la ventana temporal declarada y real.
- [ ] Revisar unidades y formatos numéricos.
- [ ] Añadir escalas automática y fija.
- [ ] Controlar datasets visibles.
- [ ] Revisar diseño en 1366×768 y 1920×1080.
- [ ] Revisar zoom 125 % y 150 %.
- [ ] Asegurar navegación por teclado.
- [ ] Añadir etiquetas accesibles.
- [ ] Verificar contraste y estados de foco.
- [ ] Mejorar estados vacíos, carga y error.
- [ ] Asegurar que el overlay de carga siempre se cierre o muestre error.

#### Criterio de aceptación

No existen pantallas principales vacías, botones falsos, textos mezclados ni bloqueos silenciosos.

#### Punto de validación 8

Recorrido visual completo aprobado por el responsable.

### Fase 9 — Calidad, seguridad y rendimiento

#### Objetivo

Preparar el proyecto para una entrega repetible.

#### Tareas

- [ ] Sanitizar datos dinámicos.
- [ ] Eliminar información sensible de logs.
- [ ] Revisar límites de memoria de sesiones largas.
- [ ] Medir actualización del gráfico.
- [ ] Evitar crecimiento ilimitado de arrays.
- [ ] Probar almacenamiento lleno.
- [ ] Probar datos corruptos.
- [ ] Añadir manejo global de errores no controlados.
- [ ] Verificar que las operaciones destructivas tengan confirmación.
- [ ] Ejecutar pruebas en navegadores soportados.
- [ ] Completar prueba end-to-end del recorrido principal.
- [ ] Ejecutar auditoría básica de accesibilidad.
- [ ] Revisar dependencias CDN.

#### Estrategia CDN

Para evitar que Chart.js o los iconos bloqueen el funcionamiento sin internet, elegir una opción:

1. instalar y servir dependencias desde el repositorio o `node_modules` mediante un build;
2. conservar CDN con fallback local;
3. declarar internet como requisito de interfaz, lo cual no es recomendado para esta v1.

La opción recomendada es distribuir localmente Chart.js y disponer de iconos locales o reemplazos CSS/SVG.

#### Criterio de aceptación

Todas las pruebas pasan, el recorrido principal funciona sin red y una sesión de duración máxima no degrada la aplicación de manera inaceptable.

#### Punto de validación 9

Go/no-go técnico previo a documentación final y despliegue.

### Fase 10 — Documentación y despliegue

#### Objetivo

Entregar una versión reproducible localmente y desplegable.

#### Documentación

- [ ] Actualizar README.
- [ ] Actualizar nombres de paquete, despliegue y metadatos públicos para utilizar DEMASY.
- [ ] Actualizar arquitectura.
- [ ] Documentar instalación y ejecución.
- [ ] Documentar modo simulación.
- [ ] Documentar escenarios.
- [ ] Documentar fórmulas y limitaciones.
- [ ] Documentar base de datos y respaldos.
- [ ] Documentar asistente local/remoto.
- [ ] Documentar variables de entorno.
- [ ] Documentar privacidad y alcance no clínico.
- [ ] Alinear la tesis con el estado real de implementación.
- [ ] Preparar una guía de demostración.

#### Despliegue local

- Debe funcionar con Node compatible declarado en `package.json`.
- Debe existir un endpoint de salud.
- Debe mostrarse claramente la URL al iniciar.
- Debe fallar con mensajes útiles si el puerto está ocupado.

#### Despliegue estático

Netlify o Vercel pueden publicar:

- HTML, CSS y JavaScript;
- simulador;
- IndexedDB;
- participantes y sesiones locales;
- análisis;
- asistente local.

El endpoint Node `/api/chat` no debe asumirse disponible en un despliegue puramente estático.

#### Despliegue con asistente remoto

Opciones aceptables:

- función serverless compatible con el proveedor;
- pequeño servicio Node separado;
- proxy controlado por una infraestructura propia.

Nunca se debe incluir `GEMINI_API_KEY` en JavaScript del navegador.

#### Entornos

| Entorno | Persistencia | Asistente | Uso |
|---|---|---|---|
| local | IndexedDB | local o Gemini vía Node | desarrollo y defensa |
| test | memoria/IndexedDB aislada | mock | CI |
| demo estática | IndexedDB | local | publicación sin secretos |
| demo completa | IndexedDB | remoto con fallback local | demostración opcional |

#### Criterio de aceptación

Una persona puede clonar el repositorio, seguir el README, ejecutar la aplicación y completar el recorrido v1 sin asistencia del desarrollador.

#### Punto de validación 10

Aprobación final de versión y creación de etiqueta `v1.0.0`.

## 13. Estrategia de pruebas

### 13.1 Pruebas unitarias

Cubrirán:

- métricas;
- validaciones;
- máquina de estados;
- escenarios del simulador;
- comparación;
- validación de importación;
- selección de adaptadores;
- anonimización del contexto del asistente.

### 13.2 Pruebas de integración

Cubrirán:

- servicios con IndexedDB;
- grabación y guardado;
- migraciones;
- exportación e importación;
- fallback remoto-local;
- reproducción desde una sesión persistida.

### 13.3 Pruebas end-to-end

Recorridos mínimos:

1. Crear participante y guardar sesión simétrica.
2. Guardar sesión con fatiga unilateral.
3. Abrir y reproducir una sesión.
4. Comparar dos sesiones.
5. Exportar, limpiar e importar respaldo.
6. Usar asistente con API ausente.
7. Recargar durante estados seguros y verificar persistencia.

### 13.4 Pruebas manuales

- Responsive y zoom.
- Navegación por teclado.
- Mensajes de error.
- Claridad de estados de grabación.
- Coherencia de términos.
- Calidad visual de gráficos.
- Funcionamiento sin red.

### 13.5 Definición de terminado por tarea

Una tarea se considera terminada únicamente si:

- el código está implementado;
- no rompe pruebas existentes;
- incluye pruebas proporcionales al riesgo;
- maneja estados vacíos y errores;
- no introduce texto sin traducir;
- actualiza documentación si modifica contratos o comportamiento;
- tiene criterio de aceptación verificable;
- fue validada por el responsable cuando pertenece a un punto de control.

## 14. Seguridad, privacidad y límites de uso

Antes de la entrega deben existir avisos visibles que indiquen:

- que se trata de un prototipo académico;
- que no sustituye evaluación ni diagnóstico profesional;
- que los datos simulados no representan mediciones reales;
- que los datos se guardan en el navegador;
- que limpiar el almacenamiento del navegador puede eliminarlos;
- que se recomienda exportar respaldos;
- que el almacenamiento local no está cifrado por la aplicación.

Para llamadas al asistente remoto:

- excluir nombre, correo, fecha de nacimiento, historia médica y notas;
- enviar solamente métricas necesarias;
- registrar el modo del asistente, no el contenido sensible;
- permitir desactivar completamente llamadas remotas.

## 15. Riesgos y mitigaciones

| Riesgo | Impacto | Mitigación |
|---|---|---|
| `app.js` continúa creciendo | mantenimiento difícil | extraer controladores y servicios por fase |
| pérdida de datos en IndexedDB | alta | exportación versionada y restauración probada |
| sesión demasiado grande | alta | muestreo de almacenamiento, límites y advertencias |
| métricas mal interpretadas | alta | fórmulas documentadas y lenguaje no diagnóstico |
| API remota caída | medio | fallback local y estado visible |
| clave expuesta | alta | proxy servidor; nunca incluir secreto en frontend |
| CDN no disponible | medio | dependencias locales o fallback |
| migración rompe datos existentes | alta | migración no destructiva y respaldo previo |
| escenarios no reproducibles | medio | semilla pseudoaleatoria configurable |
| alcance crece durante desarrollo | alta | puntos de validación y backlog posterior separado |
| documentación queda obsoleta | medio | actualizarla dentro de la definición de terminado |

## 16. Decisiones pendientes de validación

Estas decisiones deben resolverse durante la Fase 0:

1. ¿El nombre real del participante será obligatorio o se priorizará un código anónimo?
2. ¿Cuál será la duración máxima de una sesión?
3. ¿Con qué frecuencia se guardarán muestras para equilibrar detalle y tamaño?
4. ¿Qué fórmula exacta se utilizará para simetría bilateral?
5. ¿Qué umbrales se mostrarán y con qué respaldo?
6. ¿Se permitirá comparar sesiones con diferente cadencia o resistencia?
7. ¿La v1 incluirá CSV además de JSON?
8. El análisis de fatiga queda excluido de DEMASY v1.
9. ¿Se distribuirá Chart.js localmente?
10. ¿La demostración pública tendrá asistente remoto o solo local?
11. ¿Se requiere soporte para Firefox en simulación, aunque hardware no sea compatible?
12. ¿Los datos de demostración estarán disponibles en producción?

## 17. Backlog posterior a v1

No incorporar durante la ejecución salvo nueva aprobación:

- autenticación;
- base de datos remota;
- sincronización multiusuario;
- reportes PDF profesionales;
- integración con historias clínicas;
- FFT clínicamente interpretada;
- entrenamiento de modelos propios;
- notificaciones externas;
- almacenamiento en Drive o Dropbox;
- aplicación móvil;
- actualización remota del firmware;
- análisis conjunto de más de dos sesiones;
- panel institucional.
- análisis de fatiga;

## 18. Plantilla para ejecutar una fase con Codex o Claude

Usar una solicitud similar a la siguiente:

```text
Trabaja únicamente en la Fase N del archivo
docs/v1-implementation-plan.md.

Antes de editar:
1. Revisa el estado actual del repositorio.
2. Identifica cambios existentes del usuario y no los sobrescribas.
3. Enumera las decisiones de esa fase que ya están resueltas y las que bloquean.
4. Propón un plan corto de ejecución.

Durante la implementación:
- Mantén el alcance de la fase.
- Conserva el funcionamiento sin hardware ni servicios externos.
- Usa mocks/adaptadores para dependencias externas.
- Añade pruebas proporcionales al cambio.
- No declares implementada una función que solo tenga interfaz.

Al finalizar:
- Ejecuta las pruebas relevantes.
- Resume archivos modificados.
- Informa riesgos y deuda pendiente.
- Verifica los criterios de aceptación de la fase uno por uno.
- Detente en el punto de validación y espera aprobación antes de avanzar.
```

## 19. Registro de avance

Actualizar esta tabla al cerrar cada punto de validación:

| Fase | Estado | Fecha | Responsable | Evidencia | Observaciones |
|---|---|---|---|---|---|
| 0. Línea base | Aprobada | 2026-08-26 | Codex + responsable | `docs/v1-phase-0-baseline.md` | Decisiones aprobadas; análisis de fatiga excluido y base renombrada a DEMASYDB |
| 1. Fundaciones | En validación | 2026-08-27 | Codex | `docs/v1-phase-1-foundations.md` | Implementación en `feature/demasy-v1-phase-1` |
| 2. Grabación | Pendiente | | | | |
| 3. Persistencia | Pendiente | | | | |
| 4. Historial | Pendiente | | | | |
| 5. Análisis | Pendiente | | | | |
| 6. Importación/exportación | Pendiente | | | | |
| 7. Asistente | Pendiente | | | | |
| 8. UX | Pendiente | | | | |
| 9. Calidad | Pendiente | | | | |
| 10. Entrega | Pendiente | | | | |

Estados permitidos: `Pendiente`, `En curso`, `En validación`, `Aprobada`, `Bloqueada`.

## 20. Checklist final de DEMASY v1

### Producto

- [ ] El flujo principal funciona completamente con simulación.
- [ ] Se puede trabajar sin internet.
- [ ] Se puede trabajar sin claves de API.
- [ ] Se puede trabajar sin ESP32.
- [ ] No hay botones principales sin función.
- [ ] Toda sesión indica que su origen es simulado.
- [ ] No quedan referencias visibles al nombre anterior `KinesioEMG`.
- [ ] Los datos creados con el nombre anterior pueden conservarse o migrarse.

### Datos

- [ ] CRUD de participantes completo.
- [ ] Guardado y recuperación de sesiones probado.
- [ ] Migraciones probadas.
- [ ] Exportación e importación probadas.
- [ ] Respaldo restaurado en una base limpia.
- [ ] Operaciones destructivas confirmadas.

### Análisis

- [ ] Fórmulas centralizadas.
- [ ] Métricas probadas con datos conocidos.
- [ ] Unidades coherentes.
- [ ] Umbrales documentados.
- [ ] Interpretaciones no diagnósticas.
- [ ] Comparaciones muestran condiciones de ambas sesiones.

### Servicios

- [ ] IndexedDB posee adaptador de memoria para pruebas.
- [ ] Gemini posee fallback local.
- [ ] Pruebas usan asistente mock.
- [ ] Ningún secreto llega al frontend.
- [ ] Despliegue estático funciona sin API.
- [ ] El modo de cada servicio es visible o diagnosticable.

### Calidad

- [ ] Pruebas unitarias en verde.
- [ ] Pruebas de integración en verde.
- [ ] Smoke test en verde.
- [ ] Recorrido end-to-end en verde.
- [ ] Funcionamiento sin red verificado.
- [ ] Sesión máxima verificada.
- [ ] Navegación por teclado revisada.
- [ ] Pantallas objetivo revisadas.

### Documentación y entrega

- [ ] README actualizado.
- [ ] Arquitectura actualizada.
- [ ] Manual de uso disponible.
- [ ] Limitaciones visibles.
- [ ] Guía de respaldo disponible.
- [ ] Guía de despliegue actualizada.
- [ ] Documento de tesis alineado con la implementación.
- [ ] Versión `1.0.0` definida y etiquetada.

## 21. Condición final de aceptación

DEMASY v1 será aceptada cuando el responsable del proyecto pueda completar el recorrido principal en una instalación limpia, usando únicamente la simulación y sin configurar servicios externos, y cuando los datos generados puedan guardarse, recuperarse, analizarse, compararse, exportarse y restaurarse sin errores conocidos de severidad alta.

Los servicios externos deberán enriquecer la experiencia, nunca determinar si la aplicación base funciona.
