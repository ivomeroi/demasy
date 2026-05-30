# 🏗️ Arquitectura del Código - KinesioEMG

## 📁 Estructura General del Proyecto

```
tesis/
├── 🌐 FRONTEND CORE
│   ├── index.html              # Estructura HTML principal
│   ├── styles.css              # Estilos y diseño responsive
│   └── app.js                  # Controlador principal de la aplicación
│
├── 🧠 BUSINESS LOGIC  
│   ├── emg-simulator.js        # Simulación de señales EMG bilaterales
│   ├── ai-assistant.js         # Asistente IA especializado
│   ├── database.js             # Sistema de base de datos local
│   └── patient-manager.js      # Gestión de pacientes y sesiones
│
├── 🔧 INITIALIZATION
│   └── database-init.js        # Datos de ejemplo y utilidades DB
│
├── 📚 DOCUMENTATION
│   ├── README.md               # Documentación principal
│   ├── cycling-demo.md         # Características de ciclismo
│   ├── deploy-guide.md         # Guía de despliegue
│   └── docs/
│       └── development.md      # Documentación técnica
│
├── ⚙️ CONFIGURATION  
│   ├── package.json            # Configuración del proyecto
│   ├── netlify.toml           # Config para Netlify
│   ├── vercel.json            # Config para Vercel
│   └── .github/workflows/     # CI/CD automático
│
└── 🚀 DEPLOYMENT
    ├── deploy.sh              # Script de despliegue
    └── run.sh                 # Servidor local
```

---

## 🧩 Componentes Principales y sus Funciones

### 1. **app.js** - 🎮 Controlador Principal

**Propósito:** Orquesta toda la aplicación, maneja la UI y coordina los componentes.

#### Clase Principal: `KinesioEMGApp`

```javascript
class KinesioEMGApp {
    constructor() {
        this.emgSimulator = new EMGSimulator();
        this.aiAssistant = new KinesiologyAIAssistant();
        this.database = new KinesioEMGDatabase();
        this.patientManager = new PatientManager(this.database);
        // ... configuración inicial
    }
}
```

#### 🔑 Métodos Clave:

**Inicialización:**
- `init()` - Inicializa toda la aplicación
- `initializeDatabase()` - Configura la base de datos
- `initializeChart()` - Configura gráficos Chart.js
- `setupEventListeners()` - Eventos de UI (botones, controles)

**Gestión de Sesiones:**
- `startRecording()` - Inicia grabación EMG
- `stopRecording()` - Detiene grabación
- `saveSession()` - Guarda en base de datos o archivo
- `pauseRecording()` - Pausa/reanuda sesión

**Navegación:**
- `handleNavigation()` - Cambio entre secciones
- `showSection()` - Muestra sección específica
- `loadPatientsSection()` - Carga gestión de pacientes

**Visualización:**
- `updateChart()` - Actualiza gráfico en tiempo real
- `updateStatistics()` - Muestra estadísticas bilaterales
- `updateSignalQuality()` - Indicadores de calidad

---

### 2. **emg-simulator.js** - ⚡ Motor de Simulación EMG

**Propósito:** Genera señales EMG bilaterales realistas para ciclismo con patrones biomecánicos auténticos.

#### Clase Principal: `EMGSimulator`

#### 🎯 Propiedades Clave:

```javascript
// Configuración bilateral
this.activationLevel = { left: 0.5, right: 0.5 };
this.fatigueLevel = { left: 0.0, right: 0.0 };

// Parámetros de ciclismo  
this.cyclingParams = {
    cadence: 80,              // RPM
    resistance: 0.5,          // 0-1
    pedalingEfficiency: 0.85, // 0-1
    phaseOffset: Math.PI,     // 180° entre piernas
    pedalPosition: { left: 0, right: Math.PI }
};

// Perfiles musculares específicos
this.muscleProfiles = {
    quadriceps: {
        cyclingPhase: { peakActivation: 45, activationRange: 90 },
        dominantSide: 'left',
        asymmetryTendency: 0.1
    },
    // ... más músculos
};
```

#### 🔧 Métodos Principales:

**Generación de Señales:**
- `generateSignal()` - Genera muestra bilateral actual
- `generateActivationPattern()` - Patrón de activación por músculo y lado
- `addCyclingVariations()` - Variaciones realistas de pedaleo
- `calculateCyclingActivation()` - Activación basada en ángulo del pedal

**Control de Parámetros:**
- `setActivationLevel()` - Nivel de activación por lado
- `setCadence()` - Cambio de cadencia en tiempo real
- `setResistance()` - Cambio de resistencia
- `setAsymmetryFactor()` - Control de asimetría

**Simulaciones Especiales:**
- `simulateWarmUp()` - Calentamiento progresivo
- `simulateSteadyStateCycling()` - Estado estable
- `simulateAsymmetricPedaling()` - Compensación unilateral
- `simulateUnilateralFatigue()` - Fatiga progresiva
- `simulateIntervalTraining()` - Entrenamiento por intervalos

**Análisis:**
- `getStats()` - Estadísticas bilaterales completas
- `updateStats()` - Actualiza métricas en tiempo real

---

### 3. **database.js** - 💾 Sistema de Base de Datos

**Propósito:** Gestiona almacenamiento local persistente con IndexedDB para pacientes, sesiones y análisis.

#### Clase Principal: `KinesioEMGDatabase`

#### 🗃️ Esquema de Base de Datos:

```javascript
// Tabla: patients
{
    id: 1,
    name: "Juan Pérez",
    email: "juan@email.com",
    dateOfBirth: "1990-01-15", 
    height: 175, weight: 70,
    medicalHistory: ["Lesión LCA 2020"],
    notes: "Rehabilitación post-cirugía",
    createdAt: "2026-03-04T10:00:00Z",
    isActive: true
}

// Tabla: sessions
{
    id: 1, patientId: 1,
    date: "2026-03-04T14:30:00Z",
    muscleType: "quadriceps",
    sessionType: "cycling", 
    duration: 1200,
    cadence: 85, resistance: 60,
    emgData: [...],  // Array de datos EMG
    statistics: { bilateral: {...} }
}

// Tabla: analyses  
{
    id: 1, sessionId: 1,
    analysisType: "symmetry",
    results: { symmetryIndex: 92.5 },
    recommendations: ["Mantener trabajo bilateral"]
}
```

#### 🔧 Métodos por Categoría:

**Gestión de Pacientes:**
- `createPatient()` - Registra nuevo paciente
- `getPatient()` - Obtiene paciente por ID
- `getAllPatients()` - Lista todos los pacientes activos
- `updatePatient()` - Actualiza información
- `deletePatient()` - Desactiva paciente (soft delete)
- `searchPatients()` - Búsqueda por texto

**Gestión de Sesiones:**
- `createSession()` - Guarda nueva sesión EMG
- `getPatientSessions()` - Sesiones de un paciente
- `getSession()` - Sesión específica por ID

**Análisis Automático:**
- `createAnalysis()` - Guarda análisis de IA
- `getSessionAnalyses()` - Análisis de una sesión

**Utilidades:**
- `exportPatientData()` - Exporta datos de paciente
- `exportAllData()` - Exporta toda la base de datos
- `getStatistics()` - Estadísticas generales
- `clearAllData()` - Limpia toda la base de datos

---

### 4. **patient-manager.js** - 👥 Gestión de Pacientes

**Propósito:** Maneja la interfaz y lógica de negocio para pacientes, sesiones y progreso.

#### Clase Principal: `PatientManager`

#### 🎨 Métodos de UI:

**Formularios:**
- `showPatientRegistrationForm()` - Modal de registro
- `handlePatientRegistration()` - Procesa formulario
- `showPatientList()` - Lista de pacientes con tarjetas
- `generatePatientCards()` - Genera HTML de tarjetas

**Navegación:**
- `selectPatient()` - Activa paciente para sesiones
- `viewPatientHistory()` - Modal de historial
- `generateSessionHistory()` - Tabla de sesiones

**Sesiones:**
- `saveCurrentSession()` - Guarda sesión con análisis automático
- `createAutomaticAnalysis()` - Genera análisis de IA

#### 🔍 Análisis y Reportes:

**Interpretación:**
- `interpretSymmetry()` - Interpreta índice de simetría
- `calculateProgress()` - Calcula progreso entre sesiones
- `generateSymmetryRecommendations()` - Recomendaciones automáticas
- `generateEfficiencyRecommendations()` - Recomendaciones de eficiencia

**Utilidades:**
- `calculateAge()` - Calcula edad del paciente
- `formatDate()` / `formatDuration()` - Formateo de datos
- `exportPatientData()` - Exporta datos específicos

---

### 5. **ai-assistant.js** - 🤖 Asistente IA Especializado

**Propósito:** Proporciona conocimiento especializado en biomecánica del ciclismo y análisis EMG bilateral.

#### Clase Principal: `KinesiologyAIAssistant`

#### 🧠 Base de Conocimiento:

```javascript
this.knowledgeBase = {
    // Anatomía y fisiología muscular
    anatomy: {
        quadriceps: "Grupo muscular principal en extensión de rodilla...",
        gastrocnemius: "Músculo biarticular, plantiflexión y flexión..."
    },

    // Biomecánica específica del ciclismo
    cyclingSpecific: {
        phases: {
            powerPhase: "0°-180° - Fase de empuje hacia abajo",
            recoveryPhase: "180°-360° - Fase de elevación"
        },
        patterns: {
            normalCycling: "Activación alternada 180° desfasada",
            asymmetricPedaling: "Compensación por debilidad"
        }
    },

    // Análisis bilateral
    bilateralAnalysis: {
        symmetryInterpretation: {
            excellent: "> 95% - Simetría excelente",
            good: "90-95% - Buena simetría"
        },
        asymmetryCauses: ["Lesión previa", "Dominancia lateral"]
    }
};
```

#### 🎯 Métodos Principales:

**Procesamiento de Consultas:**
- `processQuery()` - Analiza y responde consultas
- `findRelevantKnowledge()` - Busca información relevante
- `analyzeContext()` - Comprende contexto de la consulta

**Respuestas Especializadas:**
- `generateEMGAnalysisResponse()` - Análisis de señales EMG
- `generateCyclingAdviceResponse()` - Consejos de ciclismo
- `generateBilateralAnalysisResponse()` - Análisis bilateral
- `generateRehabilitationResponse()` - Recomendaciones de rehabilitación

**Conocimiento Contextual:**
- `getAnatomyInfo()` - Información anatómica
- `getCyclingBiomechanics()` - Biomecánica del pedaleo
- `getBilateralAnalysisGuidance()` - Guía de análisis bilateral

---

### 6. **styles.css** - 🎨 Sistema de Diseño

**Propósito:** Interfaz moderna, profesional y responsive con temas consistentes.

#### 🎨 Arquitectura CSS:

**Variables CSS (Design System):**
```css
:root {
    --primary-color: #2563eb;
    --secondary-color: #10b981;  
    --bg-primary: #ffffff;
    --text-primary: #1f2937;
    --border-color: #e5e7eb;
    /* ... más variables */
}
```

**Componentes Principales:**
- `.sidebar` - Navegación lateral
- `.dashboard` - Panel principal  
- `.patient-card` - Tarjetas de pacientes
- `.modal-*` - Sistema de modales
- `.chart-container` - Contenedor de gráficos
- `.form-*` - Componentes de formularios

**Responsive Design:**
- Mobile-first approach
- Breakpoints: 768px, 1024px, 1280px
- Grid layouts adaptativos
- Tipografía fluida

---

## 🔄 Flujo de Datos y Arquitectura

### 1. **Inicialización de la Aplicación**
```
app.js init() → 
├── database.js initialize() 
├── emg-simulator.js setup()
├── ai-assistant.js load()  
└── patient-manager.js initialize()
```

### 2. **Flujo de Sesión EMG**
```
Usuario selecciona paciente →
app.js startRecording() →
emg-simulator.js start() →
├── generateSignal() cada 20ms
├── updateChart() en app.js
├── updateStatistics() bilateral
└── saveSession() en database.js
```

### 3. **Gestión de Pacientes**
```
patient-manager.js showPatientList() →
database.js getAllPatients() →
generatePatientCards() →
selectPatient() →
app.js updateCurrentPatientUI()
```

### 4. **Análisis con IA**
```
Usuario hace pregunta →
ai-assistant.js processQuery() →
findRelevantKnowledge() →
generateResponse() →
Mostrar en chat UI
```

---

## 🧪 Datos de Ejemplo y Testing

### **database-init.js** - Inicialización Automática

**Funciones Principales:**
- `initializeSampleData()` - Crea 3 pacientes de prueba
- `createSampleSessions()` - Sesiones EMG de ejemplo
- `generateSampleEMGData()` - Datos EMG sintéticos
- `clearSampleData()` - Limpia base de datos
- `exportAllData()` - Backup completo
- `getDatabaseStats()` - Estadísticas de uso

---

## 🔧 Configuración y Deployment

### **package.json** - Configuración del Proyecto
- Scripts de desarrollo y despliegue
- Dependencias (Chart.js)
- Metadata del proyecto
- Configuración de browserslist

### **Archivos de Deploy**
- `deploy.sh` - Script interactivo
- `netlify.toml` - Config de Netlify
- `vercel.json` - Config de Vercel  
- `.github/workflows/deploy.yml` - CI/CD

---

## 🎯 Puntos Clave de la Arquitectura

### ✅ **Fortalezas del Diseño:**
1. **Modularidad:** Cada componente tiene responsabilidad específica
2. **Escalabilidad:** Fácil añadir nuevas características
3. **Mantenibilidad:** Código organizado y documentado
4. **Testabilidad:** Componentes independientes
5. **Responsive:** Funciona en todos los dispositivos
6. **Offline-first:** Base de datos local, no requiere servidor

### 🔄 **Interacciones Clave:**
- `app.js` coordina todo
- `database.js` persiste datos
- `emg-simulator.js` genera datos realistas
- `patient-manager.js` maneja UI de pacientes  
- `ai-assistant.js` proporciona conocimiento

### 📊 **Flujo de Datos Bilateral:**
1. EMG Simulator genera datos left/right
2. App.js actualiza gráficos bilaterales
3. Statistics calcula simetría automáticamente
4. Database guarda todo con análisis automático
5. IA interpreta y recomienda

Esta arquitectura te permite **escalar fácilmente** añadiendo nuevos músculos, análisis más complejos, o diferentes tipos de ejercicios manteniendo la estructura base.