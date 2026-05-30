# KinesioEMG - Development Documentation

## Project Overview

KinesioEMG is a web-based platform designed for real-time EMG (electromyography) signal analysis and monitoring, specifically tailored for kinesiologists and physical therapy professionals.

## Current Architecture

### Technology Stack

- **Frontend**: Vanilla HTML5, CSS3, JavaScript (ES6+)
- **Visualization**: Chart.js for real-time signal plotting
- **Icons**: Font Awesome 6.0
- **Architecture**: Client-side only (no server required)

### File Structure

```
tesis/
├── index.html              # Main application interface
├── styles.css              # Complete CSS styling
├── app.js                  # Main application controller
├── emg-simulator.js        # EMG signal simulation engine
├── ai-assistant.js         # AI chat functionality
├── package.json            # Project configuration
├── README.md               # Project documentation
└── docs/
    └── development.md      # This file
```

### Core Components

#### 1. EMGSimulator (`emg-simulator.js`)
- **Purpose**: Generates realistic EMG signals for development and testing
- **Features**:
  - Multiple muscle profiles (biceps, triceps, quadriceps, gastrocnemius)
  - Realistic activation patterns (burst, sustained, variable, rhythmic)
  - Fatigue simulation with frequency and amplitude changes
  - Noise generation and artifact simulation
  - Real-time statistics calculation

#### 2. KinesiologyAIAssistant (`ai-assistant.js`)
- **Purpose**: Provides intelligent responses about EMG analysis and treatment
- **Features**:
  - Extensive knowledge base of muscle physiology
  - Context-aware responses based on current EMG data
  - Treatment recommendation engine
  - Signal interpretation assistance
  - Exercise prescription guidance

#### 3. KinesioEMGApp (`app.js`)
- **Purpose**: Main application controller coordinating all components
- **Features**:
  - Real-time chart updates using Chart.js
  - User interface management
  - Session recording and data export
  - Navigation and state management
  - Integration between simulator and AI assistant

## Development Workflow

### Phase 1: Prototype (Current)
**Status**: ✅ Complete
- [x] Mock EMG signal generation
- [x] Real-time visualization
- [x] Basic AI assistant
- [x] Professional UI/UX
- [x] Session recording

### Phase 2: Hardware Integration
**Status**: 🚧 Planned
- [ ] Web Serial API implementation for ESP32
- [ ] Device configuration interface
- [ ] Real signal processing pipeline
- [ ] Calibration procedures
- [ ] Multi-channel support

### Phase 3: Advanced Analytics
**Status**: 📋 Planned
- [ ] FFT analysis implementation
- [ ] Advanced fatigue detection algorithms
- [ ] Pattern recognition features
- [ ] Statistical analysis tools
- [ ] Signal filtering options

### Phase 4: Patient Management
**Status**: 📋 Planned
- [ ] Patient database (IndexedDB/SQLite)
- [ ] Session history and tracking
- [ ] Progress visualization
- [ ] Report generation
- [ ] Data export formats

### Phase 5: Professional Features
**Status**: 📋 Planned
- [ ] Professional report templates
- [ ] Treatment protocol library
- [ ] Multi-user support
- [ ] Cloud synchronization
- [ ] Mobile responsiveness

## Getting Started

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Python 3.x (for local development server)
- Text editor or IDE

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd tesis

# Start local development server
python -m http.server 8000

# Open browser
open http://localhost:8000
```

### Alternative using Node.js
```bash
# Install serve globally
npm install -g serve

# Serve the application
serve .

# Open browser
open http://localhost:3000
```

## EMG Signal Simulation

### Muscle Profiles
Each muscle type has specific characteristics:

```javascript
const muscleProfiles = {
    biceps: {
        baseFrequency: 50,      // Hz
        maxAmplitude: 1.5,      // mV
        activationPattern: 'burst'
    },
    // ... other muscles
};
```

### Activation Patterns
- **Burst**: Periodic contractions (biceps)
- **Sustained**: Continuous activation (triceps)
- **Variable**: Changing patterns (quadriceps)
- **Rhythmic**: Regular cycles (gastrocnemius)

### Fatigue Simulation
Progressive changes during sustained activity:
- Amplitude increase with maintained force
- Frequency shift toward lower values
- Increased variability in activation

## AI Assistant Architecture

### Knowledge Base Structure
```javascript
knowledgeBase: {
    emgBasics: { patterns, interpretation },
    muscles: { biceps, triceps, quadriceps, gastrocnemius },
    treatments: { strengthening, rehabilitation, prevention },
    signalQuality: { excellent, good, fair, poor },
    fatigueAssessment: { indicators, interpretation }
}
```

### Response Generation
1. Query classification (signal interpretation, treatment, etc.)
2. Context analysis (current EMG data, muscle type)
3. Knowledge base lookup
4. Personalized response generation

## Chart.js Integration

### Real-time Updates
- Data points added continuously during recording
- Sliding time window (10-second default)
- Dual datasets: raw signal + activation envelope
- Optimized for smooth 50ms updates

### Performance Optimization
- Buffer management (max 1000 points)
- Animation disabled for real-time performance
- Minimal DOM updates
- Efficient data structure usage

## Future Hardware Integration

### ESP32 Connection Methods

#### Web Serial API
```javascript
// Future implementation example
const port = await navigator.serial.requestPort();
await port.open({ baudRate: 115200 });

const reader = port.readable.getReader();
while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    processEMGData(value);
}
```

#### Web Bluetooth API
```javascript
// Alternative connection method
const device = await navigator.bluetooth.requestDevice({
    filters: [{ services: ['emg-service-uuid'] }]
});
const server = await device.gatt.connect();
```

### Signal Processing Pipeline
1. **Acquisition**: Raw ADC values from ESP32
2. **Preprocessing**: DC offset removal, baseline correction
3. **Filtering**: Bandpass (20-500 Hz), notch (50/60 Hz)
4. **Feature Extraction**: RMS, frequency analysis, peak detection
5. **Visualization**: Real-time plotting and statistics

## Code Quality Standards

### JavaScript Style
- ES6+ features (arrow functions, destructuring, async/await)
- Modular class-based architecture
- Comprehensive error handling
- Extensive inline documentation

### CSS Organization
- CSS Custom Properties (CSS Variables)
- Mobile-first responsive design
- Semantic class naming
- Performance-optimized animations

### HTML Structure
- Semantic HTML5 elements
- Accessibility considerations (ARIA labels, keyboard navigation)
- Progressive enhancement approach
- Valid W3C markup

## Testing Strategy

### Manual Testing Checklist
- [ ] EMG signal simulation accuracy
- [ ] Chart performance during long recording sessions
- [ ] AI assistant response quality
- [ ] UI responsiveness across devices
- [ ] Data export functionality
- [ ] Navigation and state management

### Future Automated Testing
- Unit tests for signal processing functions
- Integration tests for EMG-AI workflow
- Performance tests for real-time updates
- Cross-browser compatibility tests
- Accessibility audits

## Performance Considerations

### Memory Management
- Circular buffer implementation for signal data
- Efficient chart data structure updates
- Periodic cleanup of old conversation history
- Optimized CSS animations

### Network Optimization
- CDN usage for external libraries
- Minimal HTTP requests
- Local storage for user preferences
- Offline capability preparation

## Security Considerations

### Data Privacy
- All processing happens client-side (no server transmission)
- Local storage for session data
- No external API calls for sensitive data
- Future: encryption for stored patient data

### Input Validation
- Sanitization of user chat inputs
- Validation of EMG simulation parameters
- Protection against XSS in dynamic content
- Safe data export handling

## Deployment Options

### Current (Static Hosting)
- GitHub Pages
- Netlify
- Vercel
- Any static file server

### Future (Full Application)
- Docker containerization
- Progressive Web App (PWA)
- Electron for desktop application
- Cloud platforms (AWS, Azure, GCP)

## Contributing Guidelines

### Code Contributions
1. Follow existing code style and conventions
2. Add comprehensive comments for complex functions
3. Test thoroughly across different browsers
4. Update documentation for new features

### Feature Requests
1. Create detailed GitHub issues
2. Include use case descriptions
3. Consider backward compatibility
4. Propose implementation approach

### Bug Reports
1. Include browser version and OS
2. Provide steps to reproduce
3. Include console error messages
4. Suggest potential fixes if known

## Roadmap

### Short Term (1-2 months)
- ESP32 integration prototype
- Improved signal processing algorithms
- Enhanced AI responses with more medical knowledge
- Better mobile responsiveness

### Medium Term (3-6 months)
- Patient management system
- Advanced analytics dashboard
- Professional report generation
- Multi-channel EMG support

### Long Term (6+ months)
- Cloud synchronization
- Machine learning integration
- Clinical validation studies
- Regulatory compliance preparation

## Resources

### EMG/Kinesiology References
- [Muscle Physiology Textbooks]
- [EMG Analysis Standards]
- [Clinical Guidelines]
- [Research Papers]

### Technical Documentation
- [Web Serial API Specification]
- [Chart.js Documentation]
- [ESP32 Programming Guide]
- [PWA Development Guide]

---

**Note**: This is a living document that should be updated as the project evolves. All developers should contribute to maintaining accurate and current documentation.