# KinesioEMG - Plataforma de Análisis EMG para Bicicleta Fija

Una aplicación web especializada para monitoreo y análisis de señales EMG bilaterales durante ciclismo en bicicleta fija, diseñada específicamente para kinesiológos y profesionales de fisioterapia.

## 🚴‍♀️ Descripción del Proyecto

Esta aplicación se conecta a dispositivos ESP32 duales para recibir señales de electromiografía (EMG) de ambas piernas durante el pedaleo y proporciona:

- **Visualización de señales EMG bilaterales en tiempo real durante pedaleo**
- **Sistema completo de gestión de pacientes con base de datos local**
- **Análisis de patrones de pedaleo y eficiencia bilateral**
- **Detección de desequilibrios de potencia entre piernas**
- **Historial de sesiones y seguimiento de progreso**
- **Monitoreo de fases del pedaleo (180° desfasadas)**
- **Asistente IA especializado en biomecánica del ciclismo**
- **Control de cadencia y resistencia en tiempo real**
- **Exportación e importación de datos de pacientes**
- **Análisis de compensaciones durante el ejercicio**
- **Interfaz moderna e intuitiva en español**

## 🚀 Current Status: Prototype Phase

This is a working prototype with mock EMG signal generation for development and testing.

### ✅ Características Implementadas

#### 🎯 Sistema EMG
- [x] Simulación realista de EMG bilateral para ciclismo (desfase 180°)
- [x] 6 grupos musculares específicos de ciclismo (cuádriceps, gastrocnemio, isquiotibiales, tibial anterior, glúteo, sóleo)
- [x] Patrones de pedaleo realistas con fases de potencia y recuperación
- [x] Control interactivo de cadencia (50-120 RPM)  
- [x] Control de resistencia de bicicleta fija (10-100%)
- [x] **🔄 Desfase de señales bilateral (-180° a +180°)**
- [x] **🔮 Alineación automática de fases por músculo**
- [x] **📊 Superposición de señales para comparación directa**
- [x] Análisis de eficiencia de pedaleo bilateral
- [x] Detección de desequilibrios de potencia
- [x] Visualización de posición de pedales en tiempo real

#### 👥 Gestión de Pacientes  
- [x] **Base de datos local con IndexedDB**
- [x] **Registro completo de pacientes (datos personales, historial médico)**
- [x] **Sistema de búsqueda y filtrado de pacientes**
- [x] **Gestión de sesiones por paciente**
- [x] **Historial de sesiones con análisis temporal**
- [x] **Exportación/importación de datos de pacientes**
- [x] **Estadísticas de progreso y seguimiento**

#### 🤖 IA y Análisis
- [x] Asistente IA especializado en biomecánica del ciclismo
- [x] **Análisis automático de simetría bilateral**
- [x] **Análisis de eficiencia de pedaleo**
- [x] **Generación automática de recomendaciones**
- [x] Simulaciones de calentamiento, entrenamiento y enfriamiento
- [x] Patrones de compensación y fatiga unilateral

#### 💻 Interfaz y Experiencia
- [x] Interfaz profesional en español
- [x] Diseño responsive optimizado para análisis de ciclismo
- [x] **Modales interactivos para gestión de pacientes**
- [x] **Sistema de notificaciones contextual**

### 🚧 Características Planificadas

- [ ] **Integración ESP32 dual-canal (Web Serial API/Bluetooth)**
- [ ] **Procesamiento avanzado de señales en tiempo real** 
- [ ] **Filtros digitales personalizables (notch, pasa-altas, pasa-bajas)**
- [ ] **Análisis espectral de frecuencias EMG**
- [ ] **Calibración automática de sensores**
- [ ] **Reportes PDF profesionales**
- [ ] **Sistema de alertas en tiempo real**
- [ ] **Soporte para múltiples dispositivos ESP32**
- [ ] **Sincronización en la nube (opcional)**
- [ ] **Análisis comparativo entre sesiones**
- [ ] **Plantillas de ejercicios personalizables**

## 💾 Base de Datos y Almacenamiento

### IndexedDB Local Database
La aplicación utiliza **IndexedDB** para almacenar todos los datos localmente en el navegador del usuario, garantizando:

- **Privacidad total**: Los datos nunca salen del dispositivo del usuario
- **Acceso sin conexión**: Funciona completamente offline
- **Almacenamiento robusto**: Capacidad para miles de sesiones
- **Búsquedas eficientes**: Indexado para consultas rápidas

### Estructura de Datos

#### Pacientes (`patients`)
```javascript
{
  id: 1,
  name: "Juan Pérez",
  email: "juan@email.com", 
  dateOfBirth: "1990-01-15",
  gender: "male",
  height: 175,
  weight: 70,
  medicalHistory: ["Lesión LCA 2020", "Cirugía menisco 2021"],
  notes: "Rehabilitación post-cirugía",
  createdAt: "2026-03-04T10:00:00Z",
  isActive: true
}
```

#### Sesiones (`sessions`)  
```javascript
{
  id: 1,
  patientId: 1,
  date: "2026-03-04T14:30:00Z",
  muscleType: "quadriceps",
  sessionType: "cycling",
  duration: 1200, // seconds
  cadence: 85,
  resistance: 60,
  emgData: [...], // Array de datos EMG bilaterales
  statistics: {
    bilateral: {
      symmetryIndex: 92.5,
      asymmetryLevel: 7.5,
      difference: 8.2
    }
  }
}
```

#### Análisis (`analyses`)
```javascript
{
  id: 1,
  sessionId: 1,
  analysisType: "symmetry",
  results: {
    symmetryIndex: 92.5,
    interpretation: "Buena simetría bilateral"
  },
  recommendations: [
    "Mantener trabajo bilateral equilibrado",
    "Aumentar gradualmente resistencia"
  ]
}
```

### Exportación e Importación
- **Formato JSON**: Datos estructurados y legibles
- **Exportación por paciente**: Datos individuales completos
- **Exportación masiva**: Toda la base de datos
- **Importación segura**: Validación de integridad de datos

## 🛠️ Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Charts**: Chart.js for real-time visualization
- **Icons**: Font Awesome
- **Future**: Progressive Web App (PWA) capabilities

## 📁 Project Structure

```
tesis/
├── index.html              # Main application interface
├── styles.css              # Application styles
├── app.js                  # Main application logic
├── emg-simulator.js        # EMG signal simulation
├── ai-assistant.js         # AI chat functionality
├── package.json            # Dependencies and scripts
├── README.md               # This file
├── docs/                   # Documentation
│   └── development.md      # Development notes
└── assets/                 # Images and resources
    └── screenshots/        # Application screenshots
```

## 🚀 Getting Started

1. **Clone or download this repository**
2. **Open `index.html` in a modern browser** (Chrome recommended)
3. **Click "Start Recording" to begin EMG simulation**
4. **Explore the different sections** using the sidebar menu

## 🧪 Modo de Simulación de Ciclismo

La aplicación funciona en **modo simulación de bicicleta fija** con señales EMG bilaterales realistas que replican patrones específicos del pedaleo:

### Músculos Específicos de Ciclismo:
- **Cuádriceps**: Fase de potencia principal (0°-180°), mayor activación durante empuje hacia abajo
- **Gastrocnemio**: Flexión plantar durante fase de potencia, activación secundaria
- **Isquiotibiales**: Fase de recuperación (180°-360°), asistencia en elevación del pedal
- **Tibial Anterior**: Dorsiflexión durante recuperación, posicionamiento del pie
- **Glúteo**: Extensión de cadera durante fase temprana de potencia
- **Sóleo**: Estabilización continua durante todo el ciclo de pedaleo

### Patrones de Pedaleo Simulados:
- **Desfase 180°**: Las piernas trabajan en oposición perfecta
- **Fases del ciclo**: Potencia (0°-180°) vs Recuperación (180°-360°)
- **Puntos muertos**: Reducción natural de activación en 0° y 180°
- **Cadencia variable**: 50-120 RPM con patrones realistas
- **Resistencia adaptativa**: Ajuste de intensidad muscular según carga

### Simulación de Patologías del Ciclismo:
- **Desequilibrio de potencia**: Una pierna genera menos fuerza
- **Fatiga unilateral**: Deterioro progresivo de una pierna
- **Técnica ineficiente**: Pérdida de coordinación bilateral
- **Compensación post-lesión**: Adaptación tras lesión de rodilla/cadera

## 📋 Instrucciones de Uso

### Configurar Sesión de Bicicleta Fija
1. **Seleccionar músculo objetivo** del menú desplegable (ej. Cuádriceps para análisis de potencia)
2. **Ajustar cadencia** usando el control deslizante (50-120 RPM)
3. **Configurar resistencia** según el nivel de entrenamiento (10-100%)
4. **Hacer clic en "Iniciar Grabación"** para comenzar análisis EMG bilateral
5. **Observar patrones de pedaleo** desfasados 180° entre piernas
6. **Monitorear eficiencia** y desequilibrios de potencia en tiempo real

### Análisis de Pedaleo Bilateral
- **Posición de pedales**: Seguimiento en tiempo real de ángulos de pedaleo
- **Fases del ciclo**: Identificación automática de potencia vs recuperación
- **Eficiencia bilateral**: Cálculo basado en simetría y coordinación
- **Desequilibrio de potencia**: Detección de compensaciones entre piernas
- **Estadísticas por pierna**: RMS y amplitud pico para cada lado

### Asistente IA de Biomecánica del Ciclismo
- Navegar a la sección "Asistente IA"
- Preguntar sobre **patrones de pedaleo** y técnica
- Obtener **recomendaciones para mejorar eficiencia**
- Recibir **análisis de desequilibrios de potencia**
- Consultar sobre **protocolos de entrenamiento bilateral**

### Simulaciones Automáticas
La aplicación ejecuta automáticamente:
- **2s**: Calentamiento progresivo (60→80 RPM)
- **10s**: Pedaleo en estado estable (80 RPM, 60% resistencia)
- **75s**: Patrón de pedaleo asimétrico (simulación de compensación)
- **120s**: Fatiga unilateral progresiva
- **180s**: Enfriamiento gradual

## 🚀 Cómo usar la aplicación

### Inicio Rápido

1. **Ejecutar la aplicación:**
   ```bash
   cd tesis
   python -m http.server 8000
   # O usa: npm start
   ```

2. **Abrir en navegador:**
   ```
   http://localhost:8000
   ```

3. **Primera vez:** La aplicación se inicializa automáticamente con datos de ejemplo

### 👥 Gestión de Pacientes

#### Registrar Nuevo Paciente
1. Ve a la sección **"Pacientes"** en el menú lateral
2. Haz clic en **"Nuevo Paciente"** 
3. Completa el formulario:
   - Datos personales (nombre, email, fecha nacimiento)
   - Información física (altura, peso)
   - Historia médica
   - Notas del kinesiológo

#### Trabajar con Pacientes Existentes
- **Buscar:** Usa la barra de búsqueda por nombre o email
- **Seleccionar:** Haz clic en "Nueva Sesión" para activar un paciente
- **Historial:** Revisa sesiones anteriores con "Historial"
- **Progreso:** Analiza la evolución bilateral del paciente

### 📊 Sesiones EMG

#### Iniciar una Sesión
1. **Selecciona un paciente** (o usa modo demo sin paciente)
2. Ve al **"Dashboard"**
3. Configura parámetros de ciclismo:
   - Tipo de músculo (cuádriceps, gastrocnemio, etc.)
   - Cadencia (50-120 RPM)
   - Resistencia (10-100%)
4. Haz clic en **"Iniciar Grabación"**

#### Durante la Sesión
- **Monitoreo en tiempo real:** Señales EMG bilaterales
- **Análisis automático:** Simetría, eficiencia, desequilibrios
- **Ajustes dinámicos:** Modifica cadencia y resistencia
- **Patrones automáticos:** Calentamiento, ejercicio, enfriamiento

#### Guardar y Analizar
- Las sesiones se **guardan automáticamente** si hay un paciente seleccionado
- **Análisis instantáneo** de simetría bilateral y eficiencia
- **Recomendaciones automáticas** basadas en IA

### 🤖 Asistente IA

- **Chat especializado** en biomecánica del ciclismo
- **Interpretación** de patrones EMG bilaterales
- **Recomendaciones** personalizadas por paciente
- **Conocimiento específico** de fases del pedaleo

### 💾 Gestión de Datos

#### Exportar Datos
```javascript
// En consola del navegador:
window.dbUtils.exportAllData()           // Exportar todo
window.patientManager.exportPatientData(id)  // Exportar paciente específico
```

#### Gestión de Base de Datos
```javascript
// Comandos de consola disponibles:
window.dbUtils.getDatabaseStats()        // Estadísticas
window.dbUtils.initializeSampleData()    // Datos de ejemplo
window.dbUtils.clearSampleData()         // Limpiar todo
```

#### Scripts NPM
```bash
npm run db:backup    # Instrucciones para backup
npm run db:clear     # Instrucciones para limpiar 
npm run db:init      # Instrucciones para inicializar
npm run db:stats     # Instrucciones para estadísticas
```

### 📱 Navegación de la Interfaz

- **Dashboard:** Análisis EMG en tiempo real
- **Pacientes:** Gestión completa de pacientes
- **IA Chat:** Asistente especializado  
- **Configuración:** Ajustes de la aplicación

## 🌐 Despliegue Web

### 🚀 Métodos de Despliegue Disponibles

Tu aplicación está **lista para publicación web** y puede desplegarse fácilmente:

#### 1. **Despliegue Automático** ⭐
```bash
# Método más fácil - script interactivo
./deploy.sh
```

#### 2. **GitHub Pages** (Recomendado)
- ✅ **Gratuito para siempre**
- ✅ **HTTPS automático**
- ✅ **Despliegue automático** con GitHub Actions
- ✅ **URL profesional**: `https://tu-usuario.github.io/kinesio-emg/`

#### 3. **Netlify/Vercel** (Ultra rápido)
```bash
npm run deploy:netlify    # Drag & drop también disponible
npm run deploy:vercel     # Edge computing global
```

#### 4. **Hosting Manual**
- Cualquier servidor web estático
- Simplemente subir los archivos a tu servidor

### 🔄 Múltiples Dispositivos

#### ⚠️ **Consideración Importante: Datos Locales**
- **IndexedDB** almacena datos localmente en cada navegador
- Los datos **NO se sincronizan** automáticamente entre dispositivos
- Cada dispositivo mantiene su propia base de datos de pacientes

#### 💡 **Soluciones Actuales**

**Opción A: Exportar/Importar Manual**
```javascript
// En PC principal:
window.dbUtils.exportAllData()    // Descargar JSON

// En tablet/móvil: 
// Importar el archivo (funcionalidad a implementar)
```

**Opción B: Instancias Independientes**
- Cada dispositivo/kinesiológo tiene su propia base de datos
- Ideal para múltiples profesionales
- Exportación individual por dispositivo

#### 🔮 **Mejoras Futuras Disponibles**
- **Sincronización en la nube** (Firebase/Supabase)
- **Backup automático** (Google Drive API)
- **PWA instalable** (como app nativa)
- **QR Code sharing** entre dispositivos

### 📊 Archivos de Configuración Incluidos
- ✅ `netlify.toml` - Configuración optimizada para Netlify
- ✅ `vercel.json` - Configuración para Vercel
- ✅ `.github/workflows/deploy.yml` - CI/CD automático
- ✅ `deploy.sh` - Script interactivo de despliegue

### 🌟 **URL de Ejemplo**
Una vez desplegada, tu aplicación estará disponible 24/7 desde cualquier dispositivo:
```
https://tu-usuario.github.io/kinesio-emg/
https://kinesio-emg-123.netlify.app/
https://kinesio-emg.vercel.app/
```

### 📖 **Guía Completa**
Para instrucciones detalladas paso a paso: **[deploy-guide.md](deploy-guide.md)**

## 🔄 Next Development Iterations

### Phase 1: Hardware Integration
- Implement Web Serial API for ESP32 connection
- Add device configuration interface
- Handle real signal processing

### Phase 2: Advanced Analytics  
- Implement FFT analysis
- Add muscle fatigue detection algorithms
- Create pattern recognition features

### Phase 3: Professional Features ✅ **COMPLETADO**
- ✅ Build patient database (IndexedDB)
- ✅ Add session history and management
- ✅ Implement progress tracking
- ✅ Export/import functionality

### Phase 4: Enhanced Features
- Generate professional PDF reports
- Add treatment protocol templates
- Implement cloud synchronization (optional)
- Advanced signal filtering and processing

## 🤝 Contributing

This is a thesis project repository. For collaboration:

1. Document all changes in commit messages
2. Test thoroughly before committing
3. Update README with new features
4. Keep the prototype simple and functional

## 📄 License

Academic/Thesis Project - All rights reserved.

## 📞 Contact

For questions about this thesis project, please contact the development team.

---

**Note**: This is a prototype for educational and research purposes. Not intended for clinical use without proper validation and regulatory approval.