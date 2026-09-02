# DEMASY v1 — Fase 7: asistente y servicios externos

**Estado:** Aprobada
**Rama:** `feature/demasy-v1-phase-7`

## Objetivo

Ofrecer orientación educativa sobre señales EMG mediante Gemini, manteniendo la clave fuera del navegador y aislando cualquier falla remota del resto de DEMASY.

## Arquitectura implementada

- `AssistantService`: evita solicitudes duplicadas y limita el historial a 20 mensajes.
- `RemoteAssistantAdapter`: consume `/api/chat`, cancela a los 8 segundos y expone `/api/health` para diagnóstico de configuración.
- La interfaz utiliza exclusivamente el adaptador remoto y muestra errores de conexión o cuota sin afectar las demás secciones.
- Los adaptadores local y mock permanecen disponibles únicamente para pruebas internas.

## Privacidad y seguridad

- El contexto se limita a métricas EMG y parámetros de la sesión mediante una lista explícita de campos permitidos.
- Identificadores, nombres, correos, teléfonos y notas no se envían como contexto.
- Cliente y servidor aplican anonimización independiente.
- Las respuestas se insertan como texto, no como HTML.
- Cada respuesta incluye un descargo educativo y muestra su origen.
- DEMASY v1 rechaza análisis de fatiga, diagnósticos, tratamientos y ejercicios personalizados.
- La clave Gemini se lee solo en el servidor y no forma parte de IndexedDB ni de los respaldos.

## Configuración

Copiar `.env.example` como `.env.local` y completar únicamente en el equipo local:

```env
# El asistente de la interfaz utiliza exclusivamente el servicio remoto.
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
```

Sin clave o sin conexión, la sección del asistente muestra un error; las demás funciones de DEMASY continúan disponibles. Ante un límite `429`, se informa el tiempo aproximado de reintento cuando Gemini lo proporciona.

## Validación solicitada

1. Preguntar por simetría y confirmar una respuesta remota identificada.
2. Preguntar por fatiga o por un tratamiento y confirmar que el asistente explica el límite de DEMASY.
3. Pulsar “Comprobar” y revisar el estado del servidor/Gemini.
4. Verificar que un error remoto o de cuota sea visible sin afectar otras secciones.
5. Enviar dos veces la misma consulta rápidamente y verificar que no se duplique.
6. Recargar y comprobar que el historial se conserva durante la sesión.
7. Limpiar el chat y confirmar que se conserva únicamente el mensaje inicial.

## Pruebas automatizadas

- Anonimización de contexto.
- Funcionamiento local sin red.
- Fallback automático.
- Duplicados simultáneos.
- Timeout remoto.
- Respuesta mock determinista.
- Historial limitado.
- Enrutamiento local diferenciado para simetría, métricas, calidad de señal, fisiología y límites clínicos.
- Conversación restaurada tras recargar mediante `sessionStorage`, limitada a 20 mensajes y excluida de los respaldos clínicos.
