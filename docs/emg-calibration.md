# Calibración EMG de cuatro canales

La calibración de DEMASY separa la corrección instrumental de la
normalización fisiológica. No aplica una ganancia distinta a cada músculo,
porque hacerlo a partir de una contracción humana podría ocultar una asimetría
real.

## Procedimiento

1. La base debe indicar que todos los canales seleccionados están conectados y
   transmitiendo.
2. Durante cinco segundos de reposo se calcula por canal la mediana de la
   envolvente y una estimación robusta del ruido mediante
   `sigma = 1.4826 * MAD`.
3. El umbral individual se fija en `baseline + max(0.25 mV, 3 * sigma)`.
4. Durante cinco segundos de movimiento se verifica que exista una respuesta
   por encima del ruido y se obtiene un percentil robusto para el eje Y.
5. Los dos lados de cada grupo muscular comparten exactamente el mismo eje.

Las muestras nuevas conservan `rawAmplitude` y `rawEnvelope`. Los campos
`amplitude` y `envelope` contienen la señal corregida que utilizan los gráficos
y las métricas. Cada sesión guarda además el baseline, ruido, umbral, método y
cantidad de muestras de calibración.

## Qué corrige y qué no

La calibración elimina el nivel de reposo y el ruido pequeño específico de cada
canal. No iguala máximos ni aplica ganancia individual. Para compensar una
diferencia de ganancia electrónica hace falta medir los cuatro equipos con una
misma señal eléctrica conocida y obtener coeficientes de banco. Una
contracción voluntaria no permite separar con certeza sensibilidad electrónica
de capacidad muscular.

La normalización a MVC o a una contracción de referencia puede añadirse como
una vista relativa (`%MVC`), pero debe mantenerse separada de la amplitud
corregida absoluta porque responde una pregunta fisiológica diferente.

## Referencias

- Burden, A. (2010). *How should we normalize electromyograms obtained from
  healthy participants?* https://doi.org/10.1016/j.jelekin.2010.07.004
- Clancy, Morin y Merletti (2002). *Sampling, noise-reduction and amplitude
  estimation issues in surface electromyography.*
  https://pubmed.ncbi.nlm.nih.gov/11804807/
- SENIAM, recomendaciones de colocación y fijación:
  https://seniam.org/fixation.htm
- CEDE Project, consenso de diseño experimental y normalización:
  https://research.vu.nl/ws/portalfiles/portal/122516008/Consensus_for_experimental_design_in_electromyography_CEDE_project.pdf
