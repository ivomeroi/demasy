# 🚴‍♀️ Demo de EMG en Bicicleta Fija - KinesioEMG

## Características Únicas de la Simulación

### 1. **Patrones de Pedaleo Realistas**
- **Desfase 180°**: Cuando la pierna izquierda está en fase de potencia (empujando hacia abajo), la derecha está en recuperación (subiendo)
- **Ciclo completo**: 360° dividido en fases específicas para cada músculo
- **Puntos muertos realistas**: Reducción automática de EMG en 0° y 180° (posiciones donde es difícil generar fuerza)

### 2. **6 Músculos Específicos de Ciclismo**

#### **Cuádriceps** (Músculo Principal)
- **Fase activa**: 330°-150° (fase de potencia)
- **Pico de activación**: 90° (posición de máxima fuerza)
- **Función**: Extensión de rodilla durante empuje del pedal

#### **Gastrocnemio** (Flexión Plantar)
- **Fase activa**: 60°-180° (final de fase de potencia)
- **Pico de activación**: 120° (empuje final)
- **Función**: Flexión plantar para transferir fuerza al pedal

#### **Isquiotibiales** (Recuperación)
- **Fase activa**: 180°-360° (fase de recuperación)
- **Pico de activación**: 270° (ayuda a elevar pedal)
- **Función**: Flexión de rodilla durante elevación

#### **Tibial Anterior** (Posicionamiento)
- **Fase activa**: 270°-30° (preparación para potencia)
- **Pico de activación**: 315° (dorsiflexión)
- **Función**: Posicionar pie para siguiente empuje

#### **Glúteo** (Potencia de Cadera)
- **Fase activa**: 315°-135° (extensión de cadera)
- **Pico de activación**: 45° (inicio de empuje)
- **Función**: Extensión de cadera para generar potencia

#### **Sóleo** (Estabilización)
- **Fase activa**: 45°-200° (estabilización sostenida)
- **Pico de activación**: 135° (soporte continuo)
- **Función**: Estabilización del tobillo durante pedaleo

### 3. **Parámetros Ajustables en Tiempo Real**

#### **Cadencia (RPM)**
- **50-70 RPM**: Pedaleo lento, alta resistencia
- **70-90 RPM**: Zona de confort, entrenamiento aeróbico
- **90-120 RPM**: Alta cadencia, entrenamiento de técnica

#### **Resistencia (%)**
- **10-30%**: Calentamiento, técnica
- **40-70%**: Entrenamiento moderado
- **70-100%**: Alta intensidad, desarrollo de potencia

### 4. **Simulaciones Automáticas Específicas**

#### **Calentamiento Ciclista** (2 minutos)
```javascript
Cadencia: 60 → 80 RPM (gradual)
Resistencia: 30% → 60% (progresiva)
Activación: 40% → 80% (incremental)
```

#### **Estado Estable** (1 minuto)
```javascript
Cadencia: 80 RPM (constante)
Resistencia: 60% (moderada)
Activación: 70% (sostenida)
```

#### **Pedaleo Asimétrico** (45 segundos)
```javascript
Simulación: Debilidad 35% en pierna derecha
Compensación: Aumento 5% en pierna izquierda
Patrón: Desequilibrio de potencia realista
```

#### **Fatiga Unilateral** (60 segundos)
```javascript
Progresión: Fatiga gradual en pierna derecha
Efecto: Reducción 0.5% cada segundo
Compensación: Aumento automático en pierna izquierda
```

### 5. **Métricas Específicas de Ciclismo**

#### **Eficiencia de Pedaleo**
- **Cálculo**: Basado en simetría bilateral y suavidad del pedaleo
- **Rango**: 70-95% (70% principiante, 95% profesional)
- **Factores**: Coordinación, puntos muertos, asimetría

#### **Desequilibrio de Potencia**
- **Medición**: Diferencia porcentual entre piernas
- **Normal**: < 5% (ciclistas experimentados)
- **Moderado**: 5-15% (necesita trabajo técnico)
- **Severo**: > 15% (posible lesión o debilidad)

#### **Análisis de Fases**
- **Fase de Potencia**: Detecta automáticamente cuando cada pierna genera fuerza
- **Fase de Recuperación**: Identifica momento de elevación del pedal
- **Transiciones**: Analiza suavidad entre fases

### 6. **Asistente IA Especializado**

El asistente tiene conocimiento específico sobre:
- **Biomecánica del pedaleo**
- **Patrones de compensación en ciclismo**
- **Técnicas para mejorar eficiencia**
- **Protocolos de entrenamiento bilateral**
- **Interpretación de desequilibrios de potencia**

#### Ejemplos de Consultas:
- *"¿Por qué mi pierna derecha genera menos potencia?"*
- *"¿Cómo puedo mejorar mi eficiencia de pedaleo?"*
- *"¿Es normal esta asimetría en el EMG durante ciclismo?"*
- *"¿Qué ejercicios ayudan con el desequilibrio bilateral?"*

## 🎯 Casos de Uso Clínicos

### **1. Rehabilitación Post-Lesión**
- Monitoreo de recuperación de fuerza bilateral
- Detección temprana de compensaciones
- Seguimiento de progreso en simetría

### **2. Entrenamiento Deportivo**
- Optimización de técnica de pedaleo
- Identificación de desequilibrios musculares
- Mejora de eficiencia energética

### **3. Evaluación Biomecánica**
- Análisis de patrones de movimiento
- Detección de problemas técnicos
- Evaluación de fatiga bilateral

### **4. Investigación**
- Estudios de simetría en ciclismo
- Análisis de patrones EMG durante pedaleo
- Investigación de compensaciones musculares

## 🚀 Próximos Pasos para ESP32

### **Hardware Requerido**
- 2 módulos ESP32 (uno por pierna)
- 12 electrodos EMG (6 por pierna)
- Amplificadores diferenciales
- Comunicación WiFi sincronizada

### **Implementación**
- Web Serial API para conexión dual
- Sincronización temporal entre dispositivos
- Calibración de posición de pedales
- Filtrado en tiempo real

---

**Esta simulación proporciona una base sólida para el desarrollo de un sistema real de EMG en bicicleta fija, con todos los patrones biomecánicos y métricas necesarias para análisis clínico profesional.**