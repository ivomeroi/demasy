# Desarrollo de DEMASY

## Preparación

Usa Node.js 18 o superior:

```bash
npm ci
npm start
```

No abras `index.html` directamente: las subrutas, el service worker, las cabeceras y Web Bluetooth requieren un servidor y un origen válido.

## Comandos

```bash
npm start          # servidor en 127.0.0.1:8000
npm start -- 8001  # puerto alternativo
npm run lint       # sintaxis JavaScript
npm run test:unit  # pruebas de dominio
npm run smoke      # servidor y rutas HTTP
npm test           # validación completa
```

## Convenciones

- Mantener lógica de dominio independiente del DOM en `core/` y `services/`.
- Toda fuente nueva debe satisfacer `SignalSourceContract`.
- Centralizar límites, versión y umbrales en `core/demasy-config.js`.
- No añadir eventos HTML inline ni relajar `script-src 'self'`.
- Limitar buffers y archivos antes de incorporarlos a IndexedDB.
- Conservar los datos originales cuando se apliquen transformaciones visuales.
- No añadir diagnósticos, tratamientos ni análisis de fatiga a la v1.
- No registrar señales, participantes, conversaciones ni secretos en producción.

## Datos de desarrollo

Configuración permite crear datos demo, exportar respaldos e importar con `merge` o `replace`. Las utilidades `window.dbUtils` sirven para diagnóstico local; el borrado total solicita confirmación.

## Variables de entorno

`.env.local` es opcional y está ignorado por Git. El servidor admite `GEMINI_API_KEY`, `GEMINI_MODEL`, `HOST` y `PORT`. No agregues secretos a `.env.example`.

## Checklist

1. Preservar cambios no relacionados.
2. Añadir o actualizar pruebas.
3. Ejecutar `npm test`.
4. Validar manualmente el flujo visible.
5. Actualizar documentación y la versión del caché si cambió el shell.
