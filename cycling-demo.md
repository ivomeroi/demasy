# Guía de demostración de DEMASY

## Objetivo

Demostrar el recorrido completo sin ESP32, internet ni Gemini. Los resultados son sintéticos y educativos.

## Guion recomendado

1. Inicia con `npm start` y abre `/pacientes`.
2. Selecciona un participante `DEMO-*` o crea uno con código anónimo.
3. En `/emg-en-vivo`, configura una sesión de cuádriceps de 60 segundos.
4. Ejecuta un escenario estable y guarda la sesión.
5. Ejecuta un escenario asimétrico bajo condiciones equivalentes y guárdalo.
6. Abre el historial, muestra la señal completa y desplaza la ventana temporal.
7. En `/analisis`, compara las sesiones y explica RMS, MAV y simetría.
8. Exporta un respaldo desde `/configuracion`.
9. Desconecta la red y recarga una ruta ya visitada.
10. Explica que Gemini y el ESP32 son integraciones opcionales.

La interfaz ofrece seis músculos, cadencia, resistencia y desfase bilateral. Los datos demo siempre se identifican como simulados. DEMASY v1 no presenta conclusiones de fatiga, diagnósticos ni tratamientos.
