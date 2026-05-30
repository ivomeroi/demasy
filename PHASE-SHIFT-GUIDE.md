# 📊 Guía de Desfase de Señales EMG - Phase Shifting

## 🎯 **¿Qué es el Desfase de Señales?**

El **desfase (phase shifting)** te permite **desplazar temporalmente** una señal EMG para **superponer ambas piernas** y comparar directamente sus formas de onda. Es una técnica fundamental en análisis biomecánico.

---

## 🔧 **Controles Disponibles**

### **🎛️ Control Principal**
```
Desfase Derecho: [────●────] 0°
                -180°    +180°
```
- **Rango**: -180° a +180° (pasos de 5°)
- **Efecto**: Desplaza la señal del lado derecho
- **Tiempo real**: Los cambios se aplican inmediatamente

### **⚡ Botones Rápidos**

#### **🔮 Auto** - Alineación Automática
- Analiza el tipo de músculo actual
- Aplica el desfase óptimo automáticamente
- **Cuádriceps/Glúteos**: 0° (sincronizados)
- **Isquiotibiales**: 180° (opuestos)
- **Otros músculos**: 0° (mínimo desfase)

#### **🔄 Reset** - Restablecer
- Vuelve ambas señales a 0°
- Restaura el patrón natural de pedaleo
- Útil para volver al estado original

#### **↔️ 180°** - Inversión de Fase
- Invierte la fase de la señal derecha
- Si estaba en +90°, va a -90°
- Si estaba en -45°, va a +135°
- Útil para análisis de patrones opuestos

---

## 🧠 **¿Para Qué Sirve el Desfase?**

### **1. 📈 Comparación Directa de Formas de Onda**

**Sin Desfase (Natural):**
```
Tiempo →
        🔵 Izquierda:  ∿∿∿      ∿∿∿      ∿∿∿
        🔴 Derecha:       ∿∿∿      ∿∿∿      ∿∿∿
                     ↑ 180° desfasadas (natural)
```

**Con Desfase +180° (Superpuestas):**
```
Tiempo →  
        🔵 Izquierda:  ∿∿∿      ∿∿∿      ∿∿∿
        🔴 Derecha:    ∿∿∿      ∿∿∿      ∿∿∿
                     ↑ Ahora superpuestas - fácil comparación
```

### **2. 🔍 Detección de Asimetrías**

Con las señales superpuestas puedes detectar:
- **Diferencias de amplitud**: Una pierna más débil
- **Diferencias de forma**: Patrones de activación distintos  
- **Diferencias de timing**: Desfases anormales
- **Compensaciones**: Una pierna trabaja diferente

### **3. 📊 Análisis Biomecánico Avanzado**

**Casos de Uso Clínicos:**
- **Rehabilitación**: Comparar pierna lesionada vs sana
- **Evaluación**: Detectar compensaciones musculares
- **Entrenamiento**: Optimizar simetría bilateral
- **Investigación**: Analizar patrones de coordinación

---

## 💡 **Casos de Uso Prácticos**

### **🎯 Caso 1: Análisis de Cuádriceps**

```
1. Selecciona músculo: "Cuádriceps"
2. Inicia grabación
3. Observa las dos señales desfasadas naturalmente
4. Haz clic en "Auto" → Las señales se superponen
5. Analiza diferencias de amplitud y forma
```

**¿Qué buscar?**
- ✅ **Normal**: Formas similares, amplitudes parecidas
- ⚠️ **Asimetría**: Una señal más pequeña o diferente forma
- 🔴 **Patología**: Diferencias marcadas, activación irregular

### **🎯 Caso 2: Comparación de Isquiotibiales**

```
1. Selecciona músculo: "Isquiotibiales" 
2. Inicia grabación
3. Las señales están naturalmente sincronizadas
4. Usa desfase manual: +180° 
5. Ahora se ven los patrones de recuperación superpuestos
```

**¿Qué buscar?**
- ✅ **Normal**: Patrones de recuperación simétricos
- ⚠️ **Compensación**: Una pierna trabaja más en recuperación
- 🔴 **Fatiga**: Degradación asimétrica del patrón

### **🎯 Caso 3: Detección de Lesión**

```
1. Cualquier músculo
2. Inicia grabación  
3. Aplica "Auto" alineación
4. Ajusta manualmente si es necesario
5. Busca patrones anormales
```

**Signos de Alerta:**
- 🔴 **Amplitud reducida**: Posible debilidad
- 🔴 **Forma irregular**: Posible disfunción neuromuscular
- 🔴 **Timing anormal**: Posible compensación

---

## 🎛️ **Técnicas de Análisis**

### **📊 Método 1: Superposición Directa**
1. Aplicar desfase para superponer picos
2. Comparar amplitudes máximas
3. Evaluar duración de activación
4. Verificar simetría de forma

### **📊 Método 2: Análisis de Correlación**
1. Usar "Auto" para alineación óptima
2. Observar qué tan bien se superponen
3. Buscar áreas de diferencia sistemática
4. Evaluar patrones de compensación

### **📊 Método 3: Análisis Temporal**
1. Resetear desfase (0°)
2. Medir diferencias de timing natural
3. Aplicar desfase para alineación
4. Calcular diferencias temporales

---

## 🎯 **Interpretación de Resultados**

### **✅ Señales Normales y Simétricas**
- Formas de onda similares cuando están superpuestas
- Diferencias de amplitud <10%
- Patrones de activación coordinados
- Respuesta simétrica a cambios de cadencia

### **⚠️ Asimetrías Leves (Normales)**  
- Pequeñas diferencias de amplitud (10-20%)
- Ligeras variaciones de forma
- Posible dominancia lateral normal
- Considerar contexto clínico

### **🔴 Asimetrías Significativas (Atención)**
- Diferencias de amplitud >20%
- Formas de onda marcadamente diferentes  
- Patrones de timing anormales
- Compensaciones evidentes
- **→ Requiere evaluación clínica**

---

## 🚀 **Workflow Recomendado**

### **🔄 Protocolo Estándar de Análisis**

1. **📋 Preparación**
   ```
   • Seleccionar músculo objetivo
   • Configurar cadencia estándar (80 RPM)
   • Iniciar grabación EMG
   ```

2. **📊 Análisis Natural**
   ```  
   • Observar patrones naturales (desfase 0°)
   • Identificar diferencias obvias
   • Documentar timing natural entre lados
   ```

3. **🔄 Análisis Superpuesto**
   ```
   • Aplicar "Auto" alineación
   • Ajustar manualmente si es necesario
   • Comparar formas de onda directamente
   ```

4. **🔍 Análisis Detallado**
   ```
   • Probar diferentes desfases (-90°, +90°, +180°)
   • Buscar el punto de máxima correlación
   • Documentar hallazgos anormales
   ```

5. **📝 Documentación**
   ```
   • Guardar sesión con paciente seleccionado
   • El análisis se guarda automáticamente
   • Revisar recomendaciones de IA
   ```

---

## ⚙️ **Configuración Avanzada**

### **🎛️ Desfases Específicos por Músculo**

| Músculo | Desfase Natural | Análisis Recomendado |
|---------|----------------|---------------------|
| **Cuádriceps** | 0° (sincronizado) | Auto → 0° para superposición |
| **Isquiotibiales** | 180° (opuesto) | +180° para alinear recuperación |
| **Gastrocnemio** | ~45° (ligero) | ±45° para análisis de empuje |
| **Tibial Anterior** | 180° (dorsiflexión) | +180° para análisis de elevación |
| **Glúteo** | 0° (sincronizado) | Auto → 0° para máxima potencia |
| **Sóleo** | Variable | Usar Auto y ajustar manualmente |

### **🔧 Ajustes Finos**
- **Pasos de 5°**: Permiten ajustes precisos
- **Rango completo**: -180° a +180° cubre todos los casos
- **Tiempo real**: Cambios inmediatos para análisis interactivo
- **Retroalimentación visual**: Notificaciones para cambios significativos

---

## 🎯 **Casos Clínicos de Ejemplo**

### **📋 Caso A: Rehabilitación Post-LCA**
```
Paciente: 6 meses post-cirugía LCA pierna derecha
Músculo: Cuádriceps
Protocolo:
1. Auto-alineación → Observar diferencias de amplitud
2. Desfase +90° → Verificar patrones de activación
3. Resultado: Pierna derecha 30% menos amplitud
4. Recomendación: Fortalecimiento específico bilateral
```

### **📋 Caso B: Análisis de Rendimiento**  
```
Paciente: Ciclista competitivo
Músculo: Gastrocnemio  
Protocolo:
1. Análisis natural → Detectar timing optimal
2. Auto-alineación → Comparar eficiencia
3. Resultado: Excelente simetría, timing perfecto
4. Recomendación: Mantener entrenamiento actual
```

### **📋 Caso C: Compensación por Lesión**
```
Paciente: Dolor crónico cadera izquierda
Músculo: Glúteo
Protocolo:  
1. Auto-alineación → Detectar compensaciones
2. Desfase manual fino → Buscar patrones anormales
3. Resultado: Sobreactivación pierna derecha
4. Recomendación: Terapia de reequilibrio bilateral
```

---

## 💭 **Consejos de Experto**

### **✅ Buenas Prácticas**
- Siempre analizar el patrón natural primero
- Usar "Auto" como punto de partida
- Probar múltiples desfases para análisis completo
- Documentar hallazgos sistemáticamente
- Considerar fatiga muscular durante sesiones largas

### **❌ Errores Comunes**
- No considerar el patrón natural de cada músculo
- Aplicar el mismo desfase a todos los músculos
- Ignorar el contexto clínico del paciente
- No documentar los hallazgos
- Interpretación aislada sin contexto biomecánico

### **🎯 Interpretación Clínica**
- Las diferencias pequeñas (<10%) suelen ser normales
- Las compensaciones pueden indicar adaptaciones
- Los patrones anormales requieren contexto clínico
- La simetría perfecta no siempre es el objetivo
- Considerar dominancia lateral natural

---

## 🚀 **¡Empezar a Usar!**

1. **Abre la aplicación** → Dashboard
2. **Selecciona un paciente** (o usa modo demo)
3. **Elige músculo** → Por ejemplo "Cuádriceps"
4. **Inicia grabación** → "Iniciar Grabación"  
5. **Busca los controles de desfase** → Debajo de cadencia/resistencia
6. **Experimenta con "Auto"** → Primer botón para probar
7. **Ajusta manualmente** → Usa el slider para afinar
8. **Observa las diferencias** → Compara formas de onda

¡Esta herramienta te convertirá en un **experto en análisis bilateral** de EMG para ciclismo! 🎯

---

**💡 Tip Final**: La clave está en la **práctica constante** y la **documentación sistemática** de patrones. ¡Con el tiempo desarrollarás un ojo clínico para detectar asimetrías sutiles que pueden ser clave para el tratamiento! 🔬