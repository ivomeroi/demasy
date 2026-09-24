# Métricas de simetría y asimetría de DEMASY

Este documento define las métricas que DEMASY presenta para comparar señales sEMG bilaterales. Los resultados son descriptivos: no establecen diagnóstico ni poseen, por sí solos, un umbral clínico universal.

## Requisitos previos de comparación

Las sesiones comparadas deben mantener el mismo músculo, tarea, cadencia, resistencia, colocación de electrodos, preparación de la piel, ganancia, filtrado, frecuencia de muestreo y método de normalización. Una diferencia bilateral puede reflejar activación neuromuscular, pero también diferencias de contacto, impedancia, tejido subcutáneo, movimiento o posicionamiento.

## Métricas implementadas

### Limb Symmetry Index (LSI)

`LSI = min(RMS izquierda, RMS derecha) / max(RMS izquierda, RMS derecha) × 100`

Su rango es 0–100 %. Un valor de 100 % representa igualdad de amplitudes RMS. DEMASY informa por separado qué lado tiene el RMS mayor. El cociente entre miembros se utiliza ampliamente para expresar simetría, pero no debe interpretarse como recuperación clínica completa sin información funcional adicional.

### Asimetría relativa

`AR = |RMS izquierda − RMS derecha| / max(RMS izquierda, RMS derecha) × 100`

Es el complemento porcentual del LSI utilizado por DEMASY: `AR = 100 − LSI`. Su rango es 0–100 % y no expresa dirección.

### Índice de simetría de Robinson

`SI = |RMS izquierda − RMS derecha| / ((RMS izquierda + RMS derecha) / 2) × 100`

Un valor de 0 % representa igualdad. DEMASY aplica el valor absoluto publicado y conserva la dirección en el campo categórico `dominantSide`, evitando convertir una fórmula de magnitud en un índice direccional no validado. Burnett et al. aplicaron índices de simetría a variables EMG bilaterales en 35 sujetos durante marcha y transiciones sentado-de pie.

### Normalized Symmetry Index aplicado a sEMG

Cada señal del intervalo se normaliza primero mediante `PN = (P − Pmin) / (Pmax − Pmin)`. DEMASY calcula la magnitud RMS de cada perfil normalizado y luego:

`NSI = |PN izquierda − PN derecha| / ((PN izquierda + PN derecha) / 2) × 100`

Un valor de 0 % representa perfiles normalizados de igual magnitud. Esta medida complementa, pero no reemplaza, la comparación de amplitud RMS: al normalizar cada lado por su propio rango reduce la información de amplitud absoluta. La publicación de referencia aplicó el NSI a sEMG bilateral de siete músculos durante pedaleo incremental y a potencia constante. DEMASY lo calcula sobre la ventana o sesión observada; por ello sólo deben compararse registros con igual duración y protocolo.

## Métrica retirada de la presentación principal

El wUSI adaptado dejó de calcularse y mostrarse en sesiones nuevas. Alves et al. validaron el wUSI con fuerzas de reacción tridimensionales durante la marcha, no con amplitudes sEMG. Los campos que puedan existir en exportaciones antiguas se conservan únicamente por compatibilidad histórica y no se presentan como métrica validada de DEMASY.

## Bibliografía científica

1. Robinson RO, Herzog W, Nigg BM. Use of force platform variables to quantify the effects of chiropractic manipulation on gait symmetry. *J Manipulative Physiol Ther.* 1987;10(4):172–176. PMID: 2958572.
2. Burnett DR, Campbell-Kyureghyan NH, Cerrito PB, Quesada PM. Symmetry of ground reaction forces and muscle activity in asymptomatic subjects during walking, sit-to-stand, and stand-to-sit tasks. *J Electromyogr Kinesiol.* 2011;21(4):610–615. doi:10.1016/j.jelekin.2011.03.006.
3. Queen R, Dickerson L, Ranganathan S, Schmitt D. A novel method for measuring asymmetry in kinematic and kinetic variables: The Normalized Symmetry Index. *J Biomech.* 2020;99:109531. doi:10.1016/j.jbiomech.2019.109531.
4. Heidary SH, Ahmadi R, Rasoulian S, et al. Variation of Lower-Limb Muscle Activation Asymmetry in Step Incremental and Constant-Power Pedaling Exercise. *Sensors.* 2026;26(2):587. doi:10.3390/s26020587. PMCID: PMC12845786.
5. Alves SA, Ehrig RM, Raffalt PC, Bender A, Duda GN, Agres AN. Quantifying Asymmetry in Gait: The Weighted Universal Symmetry Index to Evaluate 3D Ground Reaction Forces. *Front Bioeng Biotechnol.* 2020;8:579511. doi:10.3389/fbioe.2020.579511.
