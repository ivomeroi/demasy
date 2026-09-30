# Punto de reanudación de DEMASY

- **Actualizado:** 2026-09-29
- **Rama actual:** `feature/demasy-v1`
- **Base integrada:** Fases 0 a 10 y mejoras posteriores de hardware, análisis y UX
- **Fase actual:** DEMASY v1 implementada y publicada; pendiente de etiqueta final

## Estado general

- Fases 0 a 10 aprobadas, confirmadas e integradas en `feature/demasy-v1`.
- Producción validada y disponible en `https://demasy.vercel.app`.
- La aplicación funciona íntegramente con simulación y persistencia local.
- El análisis permite seleccionar múltiples sesiones y muestra su evolución cronológica.
- La adquisición física vigente utiliza cuatro sensores ESP32-C3 y una base ESP32-C3.
- Gemini continúa siendo opcional y requiere un servidor que proteja `GEMINI_API_KEY`.
- El análisis de fatiga permanece fuera del alcance de DEMASY v1.

## Trabajo realizado en Fase 10

- README, arquitectura, documentación técnica y guía de desarrollo actualizados.
- Manual de usuario y guion de demostración incorporados.
- Guía y configuraciones de despliegue estático revisadas.
- Metadatos del paquete alineados con DEMASY `1.0.0`.
- Scripts heredados de ejecución y predespliegue reemplazados.
- Referencias documentales obsoletas y afirmaciones de fatiga retiradas.
- Plan maestro y checklist final actualizados.

## Validación automática

- `npm test`: aprobado.
- Lint: 38 archivos JavaScript y controles estáticos de HTML/CSS aprobados.
- Pruebas unitarias: 63 aprobadas.
- Smoke test HTTP: aprobado.
- Instalación limpia con `npm ci`: aprobada en un directorio temporal.
- JSON, sintaxis Bash y diferencias Git: validados.

## Pendiente para cerrar formalmente la versión

1. Ejecutar una última validación manual del recorrido completo y de cuatro sensores simultáneos.
2. Crear y publicar la etiqueta `v1.0.0`.

No incluir `/home/ivomeroi/.env.local` ni ninguna clave Gemini en Git.

## Ejecución local

```bash
npm ci
npm start
```

Aplicación: `http://127.0.0.1:8000/emg-en-vivo`

## Referencias principales

- `docs/v1-implementation-plan.md`
- `docs/v1-phase-10-delivery.md`
- `docs/user-guide.md`
- `deploy-guide.md`
- `README.md`
