# Despliegue de DEMASY v1

## Comprobación previa

```bash
npm ci
npm test
npm start
```

Completa el recorrido indicado en el README antes de publicar. Nunca subas `.env.local` ni una clave Gemini.

## Modalidades

### Servidor local completo

Es la modalidad recomendada para desarrollo y defensa porque incluye rutas SPA, cabeceras de seguridad, funcionamiento offline y proxy Gemini opcional.

```bash
HOST=127.0.0.1 PORT=8000 npm start
```

Para acceder desde otros equipos de una red confiable:

```bash
HOST=0.0.0.0 PORT=8000 npm start
```

Web Bluetooth requiere un contexto seguro: `localhost` o HTTPS. Una dirección HTTP de red local no se considera equivalente a `localhost`.

### Publicación estática

Vercel, Netlify u otro host estático ejecutan `npm run build` y publican `dist/`. El bundle incorpora las dependencias visuales locales y excluye documentación, pruebas, firmware y archivos de entorno. Esta modalidad incluye simulación, IndexedDB, análisis, respaldo y shell offline, pero no implementa `/api/chat`. El asistente remoto informará que el servicio no está disponible sin afectar el resto.

Netlify:

```bash
npx netlify deploy --prod --dir .
```

Vercel:

```bash
npx vercel --prod
```

Las configuraciones `netlify.toml` y `vercel.json` incluyen fallback SPA y cabeceras de seguridad. Verifica después del despliegue las cinco subrutas mediante recarga directa.

### Publicación completa con Gemini

Requiere desplegar `scripts/serve.mjs` como proceso Node persistente o adaptar `POST /api/chat` y `GET /api/health` a funciones serverless. Configura en el proveedor:

```env
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-2.5-flash
```

No uses variables públicas ni prefijos que incorporen la clave al frontend. Restringe logs, tamaño de solicitudes y acceso al entorno.

## Persistencia

La información reside en IndexedDB dentro del navegador del usuario, no en el servidor del despliegue. Cambiar de dominio, subdominio o protocolo crea otro origen y, por tanto, otro almacenamiento. Exporta un respaldo antes de cambiar la URL publicada.

## Verificación posterior

1. Recarga directamente cada subruta.
2. Crea y guarda una sesión simulada.
3. Consulta historial, reproducción y análisis.
4. Exporta e importa un respaldo en un perfil limpio.
5. Desconecta la red y recarga una ruta visitada.
6. Confirma en DevTools que no se solicitan recursos CDN.
7. Comprueba las cabeceras CSP y `X-Content-Type-Options`.
8. Si existe backend, comprueba `/api/health` y un error controlado de cuota.

## Reversión

Conserva la etiqueta Git de la última versión estable. Si una publicación falla, vuelve a desplegar ese commit; los datos IndexedDB existentes permanecen en el navegador mientras se conserve el mismo origen y no cambie el esquema de forma incompatible.
