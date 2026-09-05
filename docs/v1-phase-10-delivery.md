# DEMASY v1 — Fase 10: documentación y despliegue

**Estado:** Aprobada
**Rama:** `feature/demasy-v1-phase-10`

## Objetivo

Entregar una versión reproducible, documentada y desplegable que pueda recorrerse con simulación sin servicios externos.

## Trabajo iniciado

- README reescrito según el producto real y la versión 1.0.0.
- Arquitectura actualizada con capas, fuentes, persistencia, seguridad y servicios.
- Manual de uso y guía de demostración incorporados.
- Guías de desarrollo y despliegue actualizadas.
- Metadatos del paquete alineados con DEMASY y el repositorio real.
- Scripts heredados sustituidos por comandos basados en Node y `npm test`.
- Configuraciones estáticas endurecidas y caché sin políticas inmutables sobre archivos no versionados.
- Documentos heredados de arquitectura técnica consolidados en un índice mantenible.
- Secciones propuestas de la tesis alineadas con la exclusión del análisis de fatiga.

## Validación automática

- `package.json` y `vercel.json` validados como JSON.
- `run.sh` y `deploy.sh` validados sintácticamente por Bash.
- Lint aprobado sobre 28 archivos JavaScript.
- 55 pruebas unitarias aprobadas.
- Smoke test HTTP aprobado.
- Instalación limpia con `npm ci` aprobada en un directorio temporal.
- Configuración de Vercel contrastada con la documentación oficial vigente.
- Bundle estático reproducible en `dist/`, con Chart.js y Font Awesome copiados desde dependencias locales.
- Vercel y Netlify configurados para publicar únicamente el bundle, sin documentación, pruebas ni archivos de entorno.

## Pendiente de validación

- Confirmar que el deployment de producción queda en estado `Ready`.
- Crear la etiqueta `v1.0.0` después de validar producción.

## Aprobación manual

- Preview de Vercel validado por el responsable el 2026-09-05.
- Navegación, subrutas, simulación, persistencia, modo offline y conexión HTTPS comprobados.
- Fase autorizada para integración y despliegue de producción.
