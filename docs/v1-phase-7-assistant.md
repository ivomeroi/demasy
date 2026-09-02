# DEMASY v1 — Fase 7: asistente y servicios externos

**Estado:** En validación  
**Rama:** `feature/demasy-v1-phase-7`

## Objetivo

Ofrecer orientación educativa sobre señales EMG sin convertir el asistente ni la API externa en una dependencia de DEMASY. El modo local funciona sin internet y el modo automático lo utiliza como respaldo ante cualquier falla remota.

## Arquitectura implementada

- `AssistantService`: selecciona el adaptador, evita solicitudes duplicadas y limita el historial a 20 mensajes.
- `LocalAssistantAdapter`: utiliza la base de conocimiento incluida en el navegador y nunca llama a la red.
- `RemoteAssistantAdapter`: consume `/api/chat`, cancela a los 8 segundos y expone `/api/health` para diagnóstico de configuración.
- `MockAssistantAdapter`: genera una respuesta remota determinista sin utilizar servicios externos.
- Modo `auto`: intenta el remoto y devuelve una respuesta local identificada como respaldo si falla.

## Privacidad y seguridad

- El contexto se limita a métricas EMG y parámetros de la sesión mediante una lista explícita de campos permitidos.
- Identificadores, nombres, correos, teléfonos y notas no se envían como contexto.
- Cliente y servidor aplican anonimización independiente.
- Las respuestas se insertan como texto, no como HTML.
- Cada respuesta incluye un descargo educativo y muestra su origen.
- DEMASY v1 rechaza análisis de fatiga, diagnósticos, tratamientos y ejercicios personalizados.
- La clave Gemini se lee solo en el servidor y no forma parte de IndexedDB ni de los respaldos.

## Configuración opcional

Copiar `.env.example` como `.env.local` y completar únicamente en el equipo local:

```env
ASSISTANT_MODE=auto
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
```

Sin clave, `auto` cae al asistente local. `remote` muestra el error de configuración. `mock` permite validar toda la interfaz sin red ni credenciales.

## Validación solicitada

1. Seleccionar `Local`, preguntar por simetría y confirmar la etiqueta “Respuesta local”.
2. Preguntar por fatiga o por un tratamiento y confirmar que el asistente explica el límite de DEMASY.
3. Seleccionar `Automático` sin clave y confirmar “Asistente local · respaldo”.
4. Seleccionar `Remoto` sin clave y comprobar un error visible sin afectar otras secciones.
5. Seleccionar `Simulado` y comprobar una respuesta marcada como simulada.
6. Pulsar “Comprobar” y revisar el estado del servidor/Gemini.
7. Enviar dos veces la misma consulta rápidamente y verificar que no se duplique.
8. Limpiar el chat y confirmar que se conserva únicamente el mensaje inicial.

## Pruebas automatizadas

- Anonimización de contexto.
- Funcionamiento local sin red.
- Fallback automático.
- Duplicados simultáneos.
- Timeout remoto.
- Respuesta mock determinista.
- Historial limitado.
- Enrutamiento local diferenciado para simetría, métricas, calidad de señal, fisiología y límites clínicos.
