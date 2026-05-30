/**
 * Patient Management System
 * Handles patient registration, session management, and data visualization
 */

class PatientManager {
    constructor(database) {
        this.database = database;
        this.currentPatient = null;
        this.currentSession = null;
    }

    // Patient Registration and Management
    async showPatientRegistrationForm() {
        const formHTML = `
            <div class="modal-overlay" id="patient-modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Registrar Nuevo Paciente</h3>
                        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <form id="patient-form" class="patient-form">
                        <div class="form-row">
                            <div class="form-group">
                                <label for="patient-name">Nombre Completo *</label>
                                <input type="text" id="patient-name" name="name" required>
                            </div>
                            <div class="form-group">
                                <label for="patient-email">Email</label>
                                <input type="email" id="patient-email" name="email">
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="patient-dob">Fecha de Nacimiento</label>
                                <input type="date" id="patient-dob" name="dateOfBirth">
                            </div>
                            <div class="form-group">
                                <label for="patient-gender">Género</label>
                                <select id="patient-gender" name="gender">
                                    <option value="">Seleccionar...</option>
                                    <option value="male">Masculino</option>
                                    <option value="female">Femenino</option>
                                    <option value="other">Otro</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="patient-height">Altura (cm)</label>
                                <input type="number" id="patient-height" name="height" min="50" max="250">
                            </div>
                            <div class="form-group">
                                <label for="patient-weight">Peso (kg)</label>
                                <input type="number" id="patient-weight" name="weight" min="10" max="300">
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label for="patient-history">Historia Médica</label>
                            <textarea id="patient-history" name="medicalHistory" rows="3" 
                                placeholder="Lesiones previas, cirugías, condiciones médicas relevantes..."></textarea>
                        </div>
                        
                        <div class="form-group">
                            <label for="patient-notes">Notas Adicionales</label>
                            <textarea id="patient-notes" name="notes" rows="2" 
                                placeholder="Objetivos de rehabilitación, observaciones especiales..."></textarea>
                        </div>
                        
                        <div class="form-actions">
                            <button type="button" class="btn-outline" onclick="this.closest('.modal-overlay').remove()">
                                Cancelar
                            </button>
                            <button type="submit" class="btn-control primary">
                                Registrar Paciente
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', formHTML);

        // Handle form submission
        document.getElementById('patient-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handlePatientRegistration(e.target);
        });
    }

    async handlePatientRegistration(form) {
        const formData = new FormData(form);
        const patientData = {
            name: formData.get('name'),
            email: formData.get('email'),
            dateOfBirth: formData.get('dateOfBirth'),
            gender: formData.get('gender'),
            height: parseInt(formData.get('height')) || null,
            weight: parseInt(formData.get('weight')) || null,
            medicalHistory: formData.get('medicalHistory')?.split('\n').filter(line => line.trim()),
            notes: formData.get('notes')
        };

        try {
            const patient = await this.database.createPatient(patientData);
            this.showNotification(`Paciente ${patient.name} registrado exitosamente`, 'success');
            
            // Close modal
            document.getElementById('patient-modal').remove();
            
            // Refresh patient list if visible
            await this.refreshPatientList();
            
            return patient;
        } catch (error) {
            console.error('Error registering patient:', error);
            this.showNotification('Error al registrar paciente: ' + error.message, 'error');
        }
    }

    async showPatientList() {
        try {
            const patients = await this.database.getAllPatients();
            
            const listHTML = `
                <div class="patients-container">
                    <div class="patients-header">
                        <h2>Gestión de Pacientes</h2>
                        <div class="patients-actions">
                            <input type="text" id="patient-search" placeholder="Buscar pacientes..." class="search-input">
                            <button class="btn-control primary" onclick="window.patientManager.showPatientRegistrationForm()">
                                <i class="fas fa-user-plus"></i> Nuevo Paciente
                            </button>
                        </div>
                    </div>
                    
                    <div class="patients-stats">
                        <div class="stat-card">
                            <h4>Total Pacientes</h4>
                            <span class="stat-number">${patients.length}</span>
                        </div>
                        <div class="stat-card">
                            <h4>Sesiones Activas</h4>
                            <span class="stat-number" id="active-sessions">-</span>
                        </div>
                        <div class="stat-card">
                            <h4>Último Mes</h4>
                            <span class="stat-number" id="monthly-patients">-</span>
                        </div>
                    </div>
                    
                    <div class="patients-grid" id="patients-grid">
                        ${await this.generatePatientCards(patients)}
                    </div>
                </div>
            `;

            return listHTML;
        } catch (error) {
            console.error('Error loading patients:', error);
            return `<div class="error-state">Error al cargar pacientes: ${error.message}</div>`;
        }
    }

    async generatePatientCards(patients) {
        if (patients.length === 0) {
            return `
                <div class="empty-state">
                    <i class="fas fa-users"></i>
                    <h3>No hay pacientes registrados</h3>
                    <p>Registra tu primer paciente para comenzar</p>
                    <button class="btn-control primary" onclick="window.patientManager.showPatientRegistrationForm()">
                        Registrar Primer Paciente
                    </button>
                </div>
            `;
        }

        const cards = await Promise.all(patients.map(async (patient) => {
            const sessions = await this.database.getPatientSessions(patient.id);
            const lastSession = sessions[0]; // Most recent session
            
            return `
                <div class="patient-card" data-patient-id="${patient.id}">
                    <div class="patient-header">
                        <div class="patient-avatar">
                            ${patient.name.charAt(0).toUpperCase()}
                        </div>
                        <div class="patient-info">
                            <h4>${patient.name}</h4>
                            <p class="patient-email">${patient.email || 'Sin email'}</p>
                        </div>
                        <div class="patient-menu">
                            <button class="btn-small" onclick="window.patientManager.showPatientMenu(${patient.id})">
                                <i class="fas fa-ellipsis-v"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div class="patient-details">
                        <div class="detail-row">
                            <span class="detail-label">Edad:</span>
                            <span>${this.calculateAge(patient.dateOfBirth)} años</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Sesiones:</span>
                            <span>${sessions.length}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Última sesión:</span>
                            <span>${lastSession ? this.formatDate(lastSession.date) : 'Nunca'}</span>
                        </div>
                    </div>
                    
                    <div class="patient-actions">
                        <button class="btn-outline" onclick="window.patientManager.selectPatient(${patient.id})">
                            <i class="fas fa-play"></i> Nueva Sesión
                        </button>
                        <button class="btn-outline" onclick="window.patientManager.viewPatientHistory(${patient.id})">
                            <i class="fas fa-history"></i> Historial
                        </button>
                    </div>
                </div>
            `;
        }));

        return cards.join('');
    }

    async selectPatient(patientId) {
        try {
            this.currentPatient = await this.database.getPatient(patientId);
            
            // Update UI to show selected patient
            this.updateCurrentPatientUI();
            
            // Switch to dashboard
            if (window.app) {
                window.app.showSection('dashboard');
                window.app.updatePageTitle('dashboard');
                
                // Update navigation
                document.querySelectorAll('.nav-item').forEach(item => {
                    item.classList.remove('active');
                });
                document.querySelector('[data-section="dashboard"]').classList.add('active');
            }
            
            this.showNotification(`Paciente ${this.currentPatient.name} seleccionado`, 'success');
        } catch (error) {
            console.error('Error selecting patient:', error);
            this.showNotification('Error al seleccionar paciente', 'error');
        }
    }

    updateCurrentPatientUI() {
        const patientElement = document.getElementById('current-patient');
        if (patientElement && this.currentPatient) {
            patientElement.textContent = `${this.currentPatient.name} - Sesión EMG`;
        }
    }

    async viewPatientHistory(patientId) {
        try {
            const patient = await this.database.getPatient(patientId);
            const sessions = await this.database.getPatientSessions(patientId);
            
            const historyHTML = `
                <div class="modal-overlay" id="history-modal">
                    <div class="modal-content large-modal">
                        <div class="modal-header">
                            <h3>Historial de ${patient.name}</h3>
                            <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        
                        <div class="patient-summary">
                            <div class="summary-grid">
                                <div class="summary-item">
                                    <label>Total de Sesiones:</label>
                                    <span>${sessions.length}</span>
                                </div>
                                <div class="summary-item">
                                    <label>Primera Sesión:</label>
                                    <span>${sessions.length ? this.formatDate(sessions[sessions.length - 1].date) : 'N/A'}</span>
                                </div>
                                <div class="summary-item">
                                    <label>Última Sesión:</label>
                                    <span>${sessions.length ? this.formatDate(sessions[0].date) : 'N/A'}</span>
                                </div>
                                <div class="summary-item">
                                    <label>Progreso:</label>
                                    <span>${this.calculateProgress(sessions)}%</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="sessions-history">
                            <h4>Historial de Sesiones</h4>
                            ${this.generateSessionHistory(sessions)}
                        </div>
                        
                        <div class="modal-actions">
                            <button class="btn-outline" onclick="window.patientManager.exportPatientData(${patientId})">
                                <i class="fas fa-download"></i> Exportar Datos
                            </button>
                            <button class="btn-control primary" onclick="window.patientManager.selectPatient(${patientId}); this.closest('.modal-overlay').remove();">
                                Nueva Sesión
                            </button>
                        </div>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', historyHTML);
        } catch (error) {
            console.error('Error loading patient history:', error);
            this.showNotification('Error al cargar historial del paciente', 'error');
        }
    }

    generateSessionHistory(sessions) {
        if (sessions.length === 0) {
            return '<div class="empty-sessions">No hay sesiones registradas para este paciente.</div>';
        }

        return `
            <div class="sessions-table">
                <table>
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Tipo de Músculo</th>
                            <th>Duración</th>
                            <th>Simetría</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sessions.map(session => `
                            <tr>
                                <td>${this.formatDate(session.date)}</td>
                                <td>${this.capitalize(session.muscleType)}</td>
                                <td>${this.formatDuration(session.duration)}</td>
                                <td>${session.statistics?.bilateral?.symmetryIndex?.toFixed(0) || 'N/A'}%</td>
                                <td>
                                    <button class="btn-small" onclick="window.patientManager.viewSessionDetails(${session.id})">
                                        <i class="fas fa-eye"></i>
                                    </button>
                                    <button class="btn-small" onclick="window.patientManager.downloadSession(${session.id})">
                                        <i class="fas fa-download"></i>
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    // Session Management
    async saveCurrentSession(sessionData) {
        if (!this.currentPatient) {
            this.showNotification('Selecciona un paciente antes de guardar la sesión', 'warning');
            return null;
        }

        try {
            const session = await this.database.createSession({
                patientId: this.currentPatient.id,
                ...sessionData
            });

            // Create automatic analysis
            await this.createAutomaticAnalysis(session);

            this.showNotification('Sesión guardada exitosamente', 'success');
            return session;
        } catch (error) {
            console.error('Error saving session:', error);
            this.showNotification('Error al guardar la sesión: ' + error.message, 'error');
            return null;
        }
    }

    async createAutomaticAnalysis(session) {
        const stats = session.statistics;
        if (!stats) return;

        // Symmetry Analysis
        const symmetryAnalysis = {
            sessionId: session.id,
            analysisType: 'symmetry',
            results: {
                symmetryIndex: stats.bilateral.symmetryIndex,
                asymmetryLevel: stats.bilateral.asymmetryLevel,
                difference: stats.bilateral.difference,
                interpretation: this.interpretSymmetry(stats.bilateral.symmetryIndex)
            },
            recommendations: this.generateSymmetryRecommendations(stats.bilateral)
        };

        await this.database.createAnalysis(symmetryAnalysis);

        // Efficiency Analysis (for cycling)
        if (session.sessionType === 'cycling') {
            const efficiencyAnalysis = {
                sessionId: session.id,
                analysisType: 'efficiency',
                results: {
                    pedalingEfficiency: session.statistics.pedalingEfficiency || 85,
                    cadence: session.cadence,
                    resistance: session.resistance,
                    powerBalance: 100 - stats.bilateral.difference
                },
                recommendations: this.generateEfficiencyRecommendations(session)
            };

            await this.database.createAnalysis(efficiencyAnalysis);
        }
    }

    // Utility Methods
    calculateAge(dateOfBirth) {
        if (!dateOfBirth) return 'N/A';
        const today = new Date();
        const birthDate = new Date(dateOfBirth);
        const age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            return age - 1;
        }
        return age;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    formatDuration(duration) {
        if (!duration) return 'N/A';
        const minutes = Math.floor(duration / 60);
        const seconds = duration % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    capitalize(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    calculateProgress(sessions) {
        if (sessions.length < 2) return 0;
        
        const recent = sessions.slice(0, 3);
        const older = sessions.slice(-3);
        
        const recentAvg = recent.reduce((sum, s) => sum + (s.statistics?.bilateral?.symmetryIndex || 0), 0) / recent.length;
        const olderAvg = older.reduce((sum, s) => sum + (s.statistics?.bilateral?.symmetryIndex || 0), 0) / older.length;
        
        return Math.max(0, Math.min(100, ((recentAvg - olderAvg) / olderAvg) * 100));
    }

    interpretSymmetry(symmetryIndex) {
        if (symmetryIndex >= 95) return 'Excelente simetría bilateral';
        if (symmetryIndex >= 90) return 'Buena simetría bilateral';
        if (symmetryIndex >= 80) return 'Simetría aceptable, ligero desequilibrio';
        if (symmetryIndex >= 70) return 'Desequilibrio moderado, requiere atención';
        return 'Desequilibrio significativo, evaluación clínica recomendada';
    }

    generateSymmetryRecommendations(bilateralStats) {
        const recommendations = [];
        
        if (bilateralStats.symmetryIndex < 90) {
            recommendations.push('Realizar ejercicios de fortalecimiento unilateral en el lado más débil');
            recommendations.push('Monitoreo semanal de progreso bilateral');
        }
        
        if (bilateralStats.difference > 15) {
            recommendations.push('Evaluación por especialista recomendada');
            recommendations.push('Considerar fisioterapia específica para corrección de asimetrías');
        }
        
        return recommendations;
    }

    generateEfficiencyRecommendations(session) {
        const recommendations = [];
        const efficiency = session.statistics?.pedalingEfficiency || 85;
        
        if (efficiency < 80) {
            recommendations.push('Mejorar técnica de pedaleo con cadencia controlada');
            recommendations.push('Ejercicios de coordinación bilateral');
        }
        
        if (session.cadence < 70) {
            recommendations.push('Incrementar gradualmente la cadencia de pedaleo');
        }
        
        return recommendations;
    }

    async refreshPatientList() {
        const patientsSection = document.getElementById('patients');
        if (patientsSection && patientsSection.classList.contains('active')) {
            patientsSection.innerHTML = await this.showPatientList();
            this.setupPatientSearch();
        }
    }

    setupPatientSearch() {
        const searchInput = document.getElementById('patient-search');
        if (searchInput) {
            searchInput.addEventListener('input', async (e) => {
                const searchTerm = e.target.value;
                if (searchTerm.length > 2 || searchTerm.length === 0) {
                    const patients = searchTerm.length > 0 
                        ? await this.database.searchPatients(searchTerm)
                        : await this.database.getAllPatients();
                    
                    const grid = document.getElementById('patients-grid');
                    if (grid) {
                        grid.innerHTML = await this.generatePatientCards(patients);
                    }
                }
            });
        }
    }

    async exportPatientData(patientId) {
        try {
            const data = await this.database.exportPatientData(patientId);
            const patient = await this.database.getPatient(patientId);
            
            const blob = new Blob([JSON.stringify(data, null, 2)], {
                type: 'application/json'
            });
            
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${patient.name.replace(/\s+/g, '_')}_data_${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.showNotification('Datos del paciente exportados exitosamente', 'success');
        } catch (error) {
            console.error('Error exporting patient data:', error);
            this.showNotification('Error al exportar datos del paciente', 'error');
        }
    }

    showNotification(message, type = 'info') {
        // Use the existing notification system from the main app
        if (window.app && window.app.showNotification) {
            window.app.showNotification(message, type);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }

    // Initialize patient manager
    async initialize() {
        console.log('Initializing Patient Manager...');
        window.patientManager = this;
        console.log('Patient Manager initialized');
    }
}

// Export for use in main application
window.PatientManager = PatientManager;