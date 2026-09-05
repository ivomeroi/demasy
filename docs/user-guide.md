# Manual de uso de DEMASY v1

## Antes de comenzar

Ejecuta `npm start`, abre `http://127.0.0.1:8000` y utiliza un código anónimo por participante. DEMASY guarda los datos en el navegador actual.

## Crear una sesión

1. En **Pacientes**, registra o selecciona un participante activo.
2. Pulsa **Nueva sesión**.
3. En **EMG en vivo**, abre **Configurar sesión**.
4. Completa músculo, escenario, duración, cadencia, resistencia, etiqueta y notas.
5. Inicia la grabación. **Pausar** detiene la captura, aunque la previsualización continúa y queda marcada.
6. Finaliza y revisa los resultados.
7. Guarda o descarta con confirmación.

Si la página se recarga durante una grabación, DEMASY ofrece recuperar el borrador para revisarlo.

## Usar un ESP32

Conecta por USB o Bluetooth desde los botones de **EMG en vivo**. Para Bluetooth selecciona `DEMASY-Master`. Ejecuta **Calibrar**, permanece relajado durante la cuenta regresiva de cinco segundos y luego comienza las contracciones. Recalibra si cambian los electrodos, el músculo o las condiciones de señal.

La curva de actividad corregida facilita la lectura visual, pero no reemplaza la señal original almacenada.

## Historial y análisis

Desde el historial puedes filtrar, archivar, restaurar, exportar y abrir una sesión. El detalle muestra la señal completa y permite mover o reproducir la ventana temporal. En **Análisis**, compara únicamente sesiones del mismo participante, músculo y tipo de prueba; DEMASY advierte cambios de condiciones.

## Respaldo y restauración

En **Configuración**:

- **Exportar respaldo** descarga todos los datos locales.
- **Combinar** conserva la base actual y evita duplicados.
- **Reemplazar todo** exige escribir `REEMPLAZAR` y elimina la base actual antes de importar.

Comprueba el respaldo en un perfil de navegador limpio antes de depender de él.

## Asistente

El asistente requiere que el servidor tenga Gemini configurado. Envía solamente contexto anonimizado y ofrece contenido educativo, no diagnósticos ni tratamientos. Una caída o límite de cuota no afecta las demás funciones.

## Resolución rápida de problemas

- Puerto ocupado: usa `npm start -- 8001`.
- Página antigua: recarga con `Ctrl+Shift+R` y revisa el service worker.
- Bluetooth no disponible: usa Chrome/Edge en `localhost` o HTTPS y revisa políticas del navegador.
- Dispositivo perdido: reinicia el ESP32, cierra otros clientes BLE y vuelve a seleccionarlo.
- Datos ausentes: verifica que estás usando el mismo perfil, protocolo, host y puerto.
- Espacio lleno: exporta un respaldo y archiva o elimina datos que ya estén protegidos.
