# DEMASY v1

DEMASY es un prototipo académico para registrar, visualizar y comparar señales electromiográficas bilaterales durante pruebas funcionales de ciclismo. Puede completar todo el recorrido principal con señales simuladas, sin hardware, internet ni servicios externos.

> DEMASY no es un producto sanitario, no realiza diagnósticos y no reemplaza la evaluación de un profesional. Evita almacenar información identificatoria o sensible y conserva respaldos periódicos.

## Funciones incluidas

- simulación bilateral reproducible con distintos músculos y escenarios;
- adquisición opcional mediante Web Serial o Web Bluetooth desde ESP32;
- calibración basal y visualización de actividad corregida en vivo;
- configuración, pausa, recuperación y revisión de grabaciones;
- participantes identificados mediante código y persistencia local en `DEMASYDB`;
- historial, detalle, reproducción y ventana temporal desplazable;
- métricas temporales y comparación bilateral entre sesiones compatibles;
- respaldo completo, importación validada y estrategias `merge` y `replace`;
- asistente educativo remoto opcional mediante Gemini;
- navegación por subrutas y shell disponible sin conexión.

El análisis de fatiga, el diagnóstico clínico, los tratamientos personalizados, la sincronización en la nube y los reportes PDF quedan fuera de la v1.

## Requisitos

- Node.js 18 o superior;
- npm;
- Chrome o Edge actualizado para Web Serial/Web Bluetooth;
- Firefox y Safari pueden utilizar simulación, persistencia y análisis, pero no se consideran compatibles con las conexiones Web Serial/Bluetooth.

## Instalación y ejecución

```bash
git clone git@github.com:ivomeroi/demasy.git
cd demasy
npm ci
npm start
```

Abre `http://127.0.0.1:8000/emg-en-vivo`. El servidor muestra la URL efectiva y un error claro si el puerto está ocupado.

Para utilizar otro puerto:

```bash
npm start -- 8001
```

## Recorrido con simulación

1. Abre **Pacientes** y selecciona un participante demo o registra uno nuevo.
2. Regresa a **EMG en vivo** y elige **Configurar sesión**.
3. Selecciona músculo, escenario, duración, cadencia y resistencia.
4. Inicia la grabación; puedes pausarla y reanudarla.
5. Finaliza, revisa y guarda la sesión.
6. Desde **Pacientes → Historial**, abre el detalle y recorre la señal.
7. En **Análisis**, selecciona y compara sesiones compatibles.
8. En **Configuración**, exporta un respaldo completo.

Los datos demo se identifican explícitamente y no deben interpretarse como mediciones reales.

## ESP32 opcional

El firmware está en `ESP32/`:

- `esp_sensor.ino`: nodo sensor izquierdo o derecho mediante `SLAVE_ID`;
- `esp_base.ino`: agregador ESP-NOW y periférico BLE `DEMASY-Master`.

Para Bluetooth, carga ambos firmwares, abre DEMASY en Chrome/Edge sobre `localhost` o HTTPS y selecciona **Bluetooth**. Antes de medir, pulsa **Calibrar** y mantén los músculos relajados durante cinco segundos. La transformación visual no modifica las muestras persistidas.

Web Serial acepta líneas delimitadas por salto de línea. Bluetooth usa el servicio y característica declarados en `esp_base.ino`. Consulta [la guía USB](docs/esp32-usb-serial.md) para los formatos admitidos.

## Asistente Gemini opcional

El resto de DEMASY funciona sin clave. Para habilitar el asistente remoto:

```bash
cp .env.example .env.local
```

Completa localmente:

```env
GEMINI_API_KEY=tu_clave
GEMINI_MODEL=gemini-2.5-flash
```

Reinicia `npm start`. La clave se lee exclusivamente en el servidor Node y nunca debe confirmarse en Git ni introducirse en JavaScript del navegador.

Endpoints locales:

- `GET /api/health`: estado del servidor y configuración del asistente;
- `POST /api/chat`: proxy controlado hacia Gemini.

Un despliegue puramente estático no incluye `/api/chat`; la aplicación seguirá operativa excepto por el asistente remoto.

## Datos y respaldos

IndexedDB almacena participantes, sesiones, análisis y preferencias en `DEMASYDB`. Una instalación anterior puede migrarse de forma no destructiva desde `KinesioEMGDB`; ese nombre se conserva únicamente por compatibilidad.

Los datos son locales al perfil y origen del navegador. Borrar el perfil, almacenamiento del sitio o IndexedDB puede eliminarlos. Utiliza **Configuración → Exportar respaldo** y verifica periódicamente la restauración en un perfil limpio.

## Métricas v1

Por canal se calculan media y offset, RMS centrado, MAV, amplitud pico, mínimo, máximo, pico a pico, longitud de forma de onda, cruces por cero, entropía normalizada y activación media normalizada. La comparación bilateral utiliza:

```text
simetría (%) = min(RMS izquierda, RMS derecha) / max(RMS izquierda, RMS derecha) × 100
diferencia (%) = 100 − simetría
```

Los umbrales descriptivos están centralizados en `core/demasy-config.js`. Son orientativos y no clínicos. Las comparaciones porcentuales solo se muestran cuando las condiciones configuradas son equivalentes.

## Verificación

```bash
npm test
```

Ejecuta validación sintáctica, 55 pruebas unitarias y un smoke test HTTP sobre rutas, recursos locales, API de salud, cabeceras de seguridad y archivos privados.

## Despliegue

Consulta [deploy-guide.md](deploy-guide.md). Resumen:

- estático: interfaz, simulación, IndexedDB, análisis y funcionamiento offline, sin Gemini remoto;
- completo: servidor Node o función equivalente que implemente `/api/chat` y mantenga `GEMINI_API_KEY` fuera del frontend.

## Documentación

- [Arquitectura](CODE-ARCHITECTURE.md)
- [Desarrollo](docs/development.md)
- [Despliegue](deploy-guide.md)
- [Plan de DEMASY v1](docs/v1-implementation-plan.md)
- [Contexto del asistente](docs/ai-assistant-context.md)
- [Secciones para el informe](docs/software-thesis-sections.md)

## Licencia y estado

Versión objetivo: `1.0.0`. Proyecto académico; consulta `package.json` para sus metadatos actuales.
