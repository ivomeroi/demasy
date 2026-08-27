# DEMASY v1 — Fase 2: configuración y grabación

**Estado:** En validación

**Fecha:** 2026-08-27

**Rama:** `feature/demasy-v1-phase-2`
**Base:** `feature/demasy-v1` con Fase 1 integrada

## 1. Objetivo

Transformar la simulación continua en un flujo explícito de sesión sin implementar todavía la migración definitiva de persistencia correspondiente a la Fase 3.

La aplicación mantiene una previsualización continua, pero solamente captura muestras cuando la máquina de estados se encuentra en `recording`.

## 2. Máquina de estados

Archivo: `core/recording-controller.js`

Flujo implementado:

```text
idle
  ↓ configurar
ready
  ↓ iniciar
recording
  ↔ paused
  ↓ finalizar
review
  ├── guardar → saved
  └── descartar → ready
saved
  ↓ nueva configuración o preparar siguiente
ready
```

Características:

- transiciones inválidas rechazadas;
- reloj monotónico inyectable;
- cálculo de duración efectiva sin tiempo pausado;
- configuración conservada al descartar para permitir repetir la prueba;
- observadores de cambio de estado;
- permisos de acciones derivados del estado;
- separación respecto del DOM y la fuente de señal.

## 3. Configuración de sesión

Archivo: `services/session-configuration-service.js`

Campos normalizados:

- participante;
- etiqueta;
- músculo;
- tipo de prueba;
- duración prevista;
- cadencia;
- resistencia;
- escenario;
- diferencia simulada;
- lado afectado;
- desfase;
- notas;
- procedencia simulada versionada.

Validaciones:

- participante entero válido;
- músculo y escenario dentro de catálogos;
- duración entre 10 y 1800 segundos;
- cadencia entre 30 y 200 RPM;
- resistencia entre 0 y 100 %;
- diferencia entre 0 y 80 %;
- desfase entre -180° y 180°.

La interfaz requiere seleccionar previamente un participante. La administración completa y migración de participantes corresponde a Fase 3.

## 4. Escenarios configurables

- Pedaleo simétrico.
- Menor activación izquierda.
- Menor activación derecha.
- Patrón de fatiga izquierda.
- Patrón de fatiga derecha.
- Retraso de fase.
- Intervalos.
- Personalizado.

Los patrones de fatiga solo afectan la generación simulada. DEMASY v1 no calcula ni presenta análisis de fatiga.

El simulador ahora conserva una configuración de escenario y actualiza los patrones progresivos durante la generación. La diferencia unilateral y el desfase se aplican antes de iniciar la captura.

## 5. Controles de interfaz

Se añadió un panel superior al dashboard con:

- estado de sesión;
- nombre y resumen de configuración;
- temporizador efectivo;
- Configurar sesión;
- Iniciar grabación;
- Pausar/Reanudar;
- Finalizar;
- Descartar.

Los botones se habilitan exclusivamente según la máquina de estados.

La pausa de sesión detiene la captura, pero permite que la previsualización continúe. El botón existente de congelar gráfico mantiene su responsabilidad puramente visual.

## 6. Captura y límites

- Simulación interna: 1000 Hz.
- Almacenamiento de sesión: objetivo de 100 Hz.
- Intervalo de captura: 10 ms.
- Máximo: 180.000 muestras para 30 minutos.
- El límite se calcula desde la configuración central.
- Al alcanzar el límite se finaliza la sesión y se informa al usuario.
- Ya no se eliminan silenciosamente muestras antiguas de una sesión larga.
- La duración efectiva excluye pausas.
- La sesión termina automáticamente al alcanzar la duración configurada.

## 7. Revisión previa al guardado

Al finalizar se muestra:

- etiqueta y escenario;
- duración efectiva;
- cantidad de muestras;
- RMS izquierdo y derecho;
- índice de simetría;
- diferencia porcentual;
- aviso de datos simulados y uso no diagnóstico.

Desde la revisión se puede guardar mediante el mecanismo existente o descartar con confirmación.

El guardado incorpora configuración, fuente, etiqueta y notas dentro del objeto de sesión. La estructura definitiva, la migración a `DEMASYDB` y el manejo transaccional se completarán en Fase 3.

## 8. Protección contra pérdida accidental

- Descartar requiere confirmación.
- Cerrar o recargar durante grabación, pausa o revisión activa dispara la advertencia del navegador.
- Si el guardado en base falla, se conserva el fallback de descarga JSON.
- Una sesión marcada como guardada ya no puede descartarse como si estuviera pendiente.

## 9. Pruebas

Archivos nuevos:

- `tests/recording-controller.test.cjs`;
- `tests/session-configuration-service.test.cjs`.

Pruebas ampliadas:

- contrato del simulador;
- progresión de escenario unilateral.

Casos cubiertos:

- recorrido completo;
- exclusión del tiempo pausado;
- transiciones inválidas;
- descarte y repetición;
- protección de sesión guardada;
- normalización de formulario;
- acumulación de errores de validación;
- duración máxima;
- aplicación de escenario.

## 10. Aspectos aplazados

- Migración real a `DEMASYDB`: Fase 3.
- Código anónimo obligatorio y CRUD completo: Fase 3.
- Detalle y reproducción persistida: Fase 4.
- Conexión de la nueva capa de métricas a la sección Análisis: Fase 5.
- Rediseño de identidad KinesioEMG → DEMASY: Fases 8 y 10.
- Persistencia de preferencias: Fase 8.

## 11. Criterios de aceptación

| Criterio | Estado | Evidencia |
|---|---|---|
| Configuración antes de grabar | Cumplido | modal validado |
| Paciente obligatorio | Cumplido | bloqueo y redirección a Pacientes |
| Previsualización separada | Cumplido | captura condicionada a `recording` |
| Iniciar grabación | Cumplido | máquina de estados y UI |
| Pausar/Reanudar | Cumplido | duración efectiva y captura separada |
| Finalizar manualmente | Cumplido | transición a revisión |
| Finalizar por duración | Cumplido | temporizador de aplicación |
| Revisar antes de guardar | Cumplido | modal de resumen |
| Descartar con confirmación | Cumplido | acción y estado `ready` |
| Límite seguro de muestras | Cumplido | configuración central y finalización |
| Estados y errores visibles | Cumplido | etiquetas, notificaciones y validación en línea |
| Pruebas automatizadas | Cumplido | suite Node y smoke |
| Revisión visual inicial | Cumplido | Chrome headless 1440×1000 |

## 12. Punto de validación 2

Antes de integrar esta rama, el responsable debe validar manualmente:

1. seleccionar un participante;
2. configurar una sesión corta;
3. iniciar;
4. pausar y comprobar que el temporizador efectivo se detiene;
5. reanudar;
6. finalizar;
7. revisar el resumen;
8. guardar o descartar;
9. repetir con otro escenario.

Después de la aprobación se integrará la Fase 2 en `feature/demasy-v1` y se creará `feature/demasy-v1-phase-3`.
