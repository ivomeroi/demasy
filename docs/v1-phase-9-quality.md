# DEMASY v1 — Fase 9: calidad, seguridad y rendimiento

**Estado:** Aprobada
**Rama:** `feature/demasy-v1-phase-9`

## Objetivo

Preparar una entrega repetible, resistente a errores y segura para datos locales y credenciales de servicios externos.

## Primera auditoría y cambios aplicados

- Se bloquea el acceso HTTP a archivos ocultos, `.env`, `.env.local` y `node_modules`.
- La resolución de rutas exige que el archivo permanezca dentro del directorio de la aplicación.
- Las respuestas incorporan CSP, protección contra iframes, `nosniff`, política de referencia y permisos restrictivos.
- Chart.js se sirve desde la dependencia local instalada; la visualización principal ya no depende de su CDN.
- Font Awesome y sus fuentes se sirven desde la dependencia local instalada.
- Se añadió favicon explícito y un Service Worker que conserva el shell local para recargas sin conexión.
- Los errores y promesas no controladas generan un aviso visible sin borrar datos persistidos.
- El smoke test verifica el recurso local, el bloqueo de rutas privadas y las rutas principales.
- Los manejadores inline se reemplazaron por delegación de eventos y la CSP de scripts volvió a aceptar exclusivamente recursos del mismo origen.
- El smoke test falla si reaparece un manejador inline o `unsafe-inline` en `script-src`.
- La eliminación total de datos requiere confirmación explícita y la restauración destructiva conserva la confirmación reforzada mediante texto.
- El flujo Bluetooth dejó de registrar cada muestra recibida en la consola.

## Controles ya presentes verificados

- Las sesiones están limitadas por duración y número máximo de muestras.
- Los buffers del simulador y de las conexiones están limitados a 10 000 muestras por lado.
- El gráfico limita sus puntos y procesa los datos pendientes por lotes.
- IndexedDB traduce `QuotaExceededError` a un mensaje accionable.
- La importación limita el archivo a 50 MB, valida su estructura y exige confirmación reforzada para reemplazar datos.
- El asistente anonimiza el contexto y mantiene la clave Gemini exclusivamente en el servidor.

## Validación automática actual

- Lint aprobado sobre 28 archivos JavaScript.
- 55 pruebas unitarias aprobadas, incluida la tolerancia a respaldos estructuralmente corruptos.
- Smoke test aprobado para la aplicación, subrutas, API de salud, recursos locales, cabeceras de seguridad y bloqueo de archivos privados.
- Auditoría de dependencias de npm: 0 vulnerabilidades conocidas.
- El smoke test también verifica la CSP estricta y la ausencia de eventos inline en los controladores dinámicos.

## Hallazgo durante validación manual

- La CSP inicial permitió descubrir eventos inline heredados en pacientes, historial, reproducción y respaldo.
- Esas acciones utilizan ahora listeners y delegación de eventos compatibles con contenido dinámico, sin `unsafe-inline` para scripts.
- Una grabación activa se conserva cada dos segundos como borrador local; tras una recarga se ofrece recuperarla en estado de revisión para guardarla o descartarla.
- La previsualización continúa durante una pausa y el gráfico marca con líneas verticales los instantes de pausa y reanudación.
- El eje temporal del simulador utiliza el mismo reloj monotónico real que el cronómetro; ya no supone que `setTimeout(1)` se ejecuta exactamente mil veces por segundo.
- La escala fija se adapta a la fuente: ±3 mV en simulación y ±50 mV para USB/Bluetooth.
- La visualización ESP32 destaca una envolvente corregida respecto del basal, con ganancia visual, histéresis e indicador de reposo/contracción. Los datos persistidos mantienen los valores originales.
- La calibración del nivel de reposo puede ejecutarse a demanda mediante un control de cinco segundos con cuenta regresiva y aviso animado.

## Validación manual completada

- Sesión prolongada y comportamiento de memoria/gráfico revisados localmente.
- Restauración real verificada en una base IndexedDB vacía.
- Casos de almacenamiento lleno y archivos corruptos revisados desde la interfaz.
- Recorrido principal end-to-end completado.
- Navegadores soportados, navegación por teclado y accesibilidad básica revisados.
- Gráficos, iconos, rutas y shell local verificados sin conexión.
- Conexión Bluetooth, calibración manual y discriminación visual de contracción validadas con el ESP32 base.

## Punto de validación 9

El responsable confirmó las pruebas locales y aprobó el cierre de la fase el 2026-09-05. La Fase 9 queda lista para commit, integración en `feature/demasy-v1` y apertura de la Fase 10.
