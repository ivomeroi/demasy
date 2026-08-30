# DEMASY v1 — Fase 8: configuración, UX y accesibilidad

**Estado:** Aprobada  
**Rama:** `feature/demasy-v1-phase-8`

## Objetivo

Cerrar las rutas principales con una experiencia coherente, configurable y utilizable sin servicios externos. La identidad visual parte del logo oficial `DEMASY-LOGO.jpeg`: azul marino, azul técnico, grises fríos y fondo blanco.

## Cambios implementados

- Logo oficial en la navegación lateral, metadatos DEMASY y paleta global alineada con la marca.
- Refinamiento visual con azul marino más profundo, fondos fríos, tarjetas con mayor jerarquía y controles de formulario personalizados.
- Selectores con flecha, separador, bordes, estados hover/focus y espaciado consistentes en todas las pantallas.
- Preferencias persistentes en IndexedDB para ventana temporal, escala vertical y series visibles.
- Ventanas de 1, 5, 10 y 30 segundos; el valor mostrado coincide con el gráfico real.
- Escala vertical fija o automática.
- Visibilidad independiente para señal izquierda, señal derecha y curvas RMS.
- Configuración útil junto con respaldo, restauración y datos demo.
- Aviso visible de prototipo académico, almacenamiento local sin cifrado y uso de códigos de participante.
- Estados de conexión en español.
- Navegación lateral mediante teclado, foco visible, ruta activa accesible y cierre de overlays con `Escape`.
- Menú navegable en pantallas móviles y ajustes para 1366×768, 1920×1080 y zoom elevado.
- Eliminación de afirmaciones de análisis de fatiga en el asistente local.

## Validación solicitada

1. Abrir `/emg-en-vivo` y comprobar logo, paleta y ventana indicada bajo el gráfico.
2. Ir a `/configuracion`, cambiar ventana a 5 segundos, escala automática y visibilidad RMS; guardar.
3. Volver a EMG en vivo y verificar el cambio. Recargar la página y confirmar que persiste.
4. Recorrer todas las rutas con `Tab`, activar una ruta con `Enter` o espacio y comprobar el foco visible.
5. En ancho móvil, abrir el menú lateral, navegar y cerrarlo con `Escape`.
6. Revisar la aplicación a 1366×768 y 1920×1080, y con zoom 125 % y 150 %.
7. Confirmar que respaldo, restauración, demos, pacientes, historial y análisis siguen funcionando.

## Límites mantenidos

- No se incorpora análisis de fatiga.
- No se requiere backend, nube ni API externa.
- La identidad antigua puede conservarse únicamente en nombres internos o mecanismos de compatibilidad/migración que no sean visibles para el usuario.
