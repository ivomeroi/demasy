/**
 * Asistente IA para Análisis EMG de Kinesiología
 * Proporciona respuestas inteligentes sobre interpretación EMG bilateral, fisiología muscular y recomendaciones de tratamiento
 */

class KinesiologyAIAssistant {
    constructor() {
        this.conversationHistory = [];
        this.knowledgeBase = this.initializeKnowledgeBase();
        this.contextKeywords = new Set();
        this.currentEMGContext = null;
    }

    initializeKnowledgeBase() {
        return {
            emgBasics: {
                patterns: [
                    "Las señales EMG reflejan la actividad eléctrica de las fibras musculares durante la contracción",
                    "La amplitud EMG normal varía de 0.1-5 mV dependiendo del tipo de músculo y nivel de activación",
                    "El contenido de frecuencia EMG típicamente oscila entre 20-500 Hz, con la mayoría de energía entre 50-150 Hz",
                    "El EMG crudo es bifásico, pero el EMG superficial aparece como patrones de interferencia"
                ],
                interpretation: [
                    "Mayor amplitud indica mayor activación muscular",
                    "Cambios sostenidos de amplitud deben interpretarse junto con el contexto de la sesión",
                    "Patrones irregulares podrían sugerir trastornos neuromusculares",
                    "La asimetría bilateral puede indicar patrones de compensación o lesión"
                ]
            },
            
            bilateralAnalysis: {
                symmetryIndices: [
                    "Índice de simetría >90% se considera normal",
                    "Asimetría del 10-25% puede indicar compensación funcional",
                    "Asimetría >25% requiere evaluación clínica detallada",
                    "La simetría perfecta (100%) es rara en condiciones normales"
                ],
                asymmetryCauses: [
                    "Lesiones unilaterales (esguinces, fracturas, cirugías)",
                    "Dominancia lateral natural",
                    "Patrones de compensación por dolor",
                    "Debilidad neuromuscular unilateral",
                    "Diferencias en la longitud de extremidades"
                ],
                clinicalSignificance: [
                    "Asimetría persistente puede predecir futuras lesiones",
                    "Monitoreo bilateral ayuda en la rehabilitación",
                    "Comparación lado a lado mejora la descripción de diferencias",
                    "La progresión hacia simetría indica recuperación exitosa"
                ]
            },
            
            muscles: {
                biceps: {
                    function: "Flexor primario del codo, asiste en flexión de hombro y supinación del antebrazo",
                    normalValues: "EMG pico: 1.0-2.5 mV durante contracción voluntaria máxima",
                    bilateralNorms: "Asimetría normal <15%, dominante típicamente 5-10% mayor",
                    commonIssues: "Tendinitis del bíceps, desequilibrios musculares, lesiones por uso excesivo",
                    exercises: "Fortalecimiento excéntrico bilateral, entrenamiento de resistencia progresiva, estiramiento",
                    asymmetryRisks: "Trabajo unilateral repetitivo, lesiones de hombro previas"
                },
                triceps: {
                    function: "Extensor primario del codo, asiste en aducción y extensión de hombro",
                    normalValues: "EMG pico: 0.8-2.0 mV durante contracción voluntaria máxima",
                    bilateralNorms: "Asimetría normal <12%, lado dominante ligeramente mayor",
                    commonIssues: "Tendinopatía del tríceps, debilidad post-lesión, epicondilitis lateral",
                    exercises: "Carga progresiva bilateral, fondos de tríceps, extensiones superiores",
                    asymmetryRisks: "Deportes de lanzamiento, trabajo de empuje unilateral"
                },
                quadriceps: {
                    function: "Extensión de rodilla, flexión de cadera (recto femoral), estabilidad patelar",
                    normalValues: "EMG pico: 1.5-4.0 mV durante contracción voluntaria máxima",
                    bilateralNorms: "Asimetría normal <10%, alta demanda de simetría para marcha",
                    commonIssues: "Dolor patelofemoral, atrofia muscular, desequilibrios entre cabezas",
                    exercises: "Elevación de pierna recta bilateral, sentadillas en pared, step-ups, estiramiento de cuádriceps",
                    asymmetryRisks: "Lesiones de rodilla, cirugía previa, diferencias en longitud de piernas"
                },
                gastrocnemius: {
                    function: "Flexión plantar, asiste en flexión de rodilla durante descarga",
                    normalValues: "EMG pico: 1.2-3.5 mV durante contracción voluntaria máxima",
                    bilateralNorms: "Asimetría normal <8%, crucial para equilibrio y marcha",
                    commonIssues: "Tendinopatía de Aquiles, distensiones de pantorrilla, fascitis plantar",
                    exercises: "Elevación de talones bilateral, carga excéntrica, estiramiento de pantorrilla, entrenamiento de equilibrio",
                    asymmetryRisks: "Lesiones de tobillo, diferencias en flexibilidad, uso de calzado inadecuado"
                },
                tibialis: {
                    function: "Dorsiflexión del tobillo, inversión del pie, estabilización de arco medial",
                    normalValues: "EMG pico: 0.8-1.5 mV durante contracción voluntaria máxima",
                    bilateralNorms: "Asimetría normal <12%, importante para prevención de caídas",
                    commonIssues: "Síndrome de compartimento anterior, debilidad por inmovilización, tendinitis",
                    exercises: "Dorsiflexión resistida bilateral, caminar en talones, entrenamiento propioceptivo",
                    asymmetryRisks: "Uso de órtesis unilateral, lesiones de tobillo, neuropatía peroneal"
                },
                hamstring: {
                    function: "Flexión de rodilla, extensión de cadera, estabilización posterior del muslo",
                    normalValues: "EMG pico: 1.0-2.8 mV durante contracción voluntaria máxima",
                    bilateralNorms: "Asimetría normal <15%, mayor variabilidad que cuádriceps",
                    commonIssues: "Distensiones de isquiotibiales, desequilibrio cuádriceps/isquiotibiales, debilidad post-cirugía",
                    exercises: "Curls de isquiotibiales bilaterales, peso muerto rumano, fortalecimiento excéntrico nórdico",
                    asymmetryRisks: "Deportes con sprints, desequilibrios de flexibilidad, lesiones previas de rodilla"
                }
            },

            cyclingSpecific: {
                phases: {
                    powerPhase: "0°-180° - Fase de empuje hacia abajo, mayor activación de cuádriceps y glúteos",
                    recoveryPhase: "180°-360° - Fase de elevación, activación de isquiotibiales y tibial anterior",
                    deadSpots: "0° y 180° - Puntos muertos superior e inferior con mínima producción de fuerza"
                },
                patterns: {
                    normalCycling: "Activación alternada 180° desfasada entre piernas",
                    asymmetricPedaling: "Compensación en una pierna por debilidad o lesión en la otra",
                    inefficientPedaling: "Activación muscular descoordinada, pérdida de potencia en puntos muertos",
                    variablePedaling: "Variaciones progresivas de amplitud y coordinación bilateral"
                },
                parameters: {
                    cadence: {
                        recreational: "60-80 RPM - Pedaleo cómodo y sostenible",
                        training: "80-100 RPM - Zona de entrenamiento aeróbico",
                        competitive: "100-120+ RPM - Alta intensidad, requiere técnica refinada"
                    },
                    efficiency: {
                        beginner: "70-80% - Técnica básica de pedaleo",
                        intermediate: "80-90% - Buena coordinación bilateral",
                        advanced: "90-95% - Pedaleo altamente eficiente y simétrico"
                    }
                },
                commonIssues: {
                    powerImbalance: "Diferencias >10% entre piernas pueden indicar lesión o debilidad unilateral",
                    inefficiency: "Eficiencia <75% sugiere problemas de técnica o coordinación neuromuscular",
                    asymmetricFatigue: "Fatiga unilateral puede predecir lesiones por sobrecompensación",
                    pedalingAsymmetries: "Patrones EMG descoordinados entre fases de potencia y recuperación"
                }
            },

            treatments: {
                bilateralStrengthening: [
                    "Entrenamiento de resistencia progresiva bilateral con biofeedback EMG",
                    "Ejercicios isométricos bilaterales para fase inicial de fortalecimiento",
                    "Ejercicios excéntricos para salud tendinosa y ganancia de fuerza simétrica",
                    "Patrones de movimiento funcional con monitoreo EMG bilateral"
                ],
                asymmetryCorrection: [
                    "Fortalecimiento selectivo del lado más débil",
                    "Ejercicios unilaterales controlados con retroalimentación EMG",
                    "Reeducación neuromuscular usando feedback EMG bilateral",
                    "Protocolos de carga progresiva monitoreados bilateralmente"
                ],
                rehabilitation: [
                    "Movilización temprana basada en niveles de activación EMG",
                    "Reeducación neuromuscular usando retroalimentación EMG bilateral",
                    "Protocolos de carga progresiva monitoreados con EMG",
                    "Criterios de retorno a actividad basados en simetría EMG y fuerza"
                ],
                prevention: [
                    "Evaluación EMG bilateral regular para identificar desequilibrios",
                    "Protocolos de calentamiento monitoreados con EMG",
                    "Monitoreo de simetría bilateral durante sesiones de entrenamiento",
                    "Evaluación de calidad de movimiento usando análisis EMG bilateral"
                ]
            },

            signalQuality: {
                excelente: "SNR > 40 dB, artefactos mínimos, línea base estable, patrones de activación claros",
                buena: "SNR 30-40 dB, artefactos menores ocasionales, ruido de línea base aceptable",
                regular: "SNR 20-30 dB, artefactos moderados presentes, puede afectar interpretación",
                pobre: "SNR < 20 dB, artefactos significativos, inestabilidad de línea base, datos no confiables"
            }
        };
    }

    async processQuery(userInput, emgContext = null) {
        this.currentEMGContext = emgContext;
        const query = userInput.toLowerCase();
        
        // Add to conversation history
        this.conversationHistory.push({
            type: 'user',
            content: userInput,
            timestamp: new Date(),
            context: emgContext
        });

        // Extract keywords
        this.updateContextKeywords(query);

        // Generate response based on query type
        let response;
        
        if (this.isSignalInterpretationQuery(query)) {
            response = this.generateSignalInterpretation(query);
        } else if (this.isTreatmentQuery(query)) {
            response = this.generateTreatmentRecommendation(query);
        } else if (this.isMusclePhysiologyQuery(query)) {
            response = this.generateMusclePhysiologyResponse(query);
        } else if (this.isExerciseQuery(query)) {
            response = this.generateExerciseRecommendation(query);
        } else if (this.isFatigueQuery(query)) {
            response = 'DEMASY v1 no realiza análisis de fatiga. Puedo ayudarte a describir amplitud, simetría, activación y calidad de la señal sin generar conclusiones diagnósticas.';
        } else if (this.isSignalQualityQuery(query)) {
            response = this.generateSignalQualityAdvice(query);
        } else {
            response = this.generateGeneralResponse(query);
        }

        // Add to conversation history
        this.conversationHistory.push({
            type: 'assistant',
            content: response,
            timestamp: new Date(),
            context: emgContext
        });
        if (this.conversationHistory.length > 20) this.conversationHistory.splice(0, this.conversationHistory.length - 20);

        return response;
    }

    async tryRemoteAssistant(userInput, emgContext) {
        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: userInput,
                    emgContext,
                    history: this.conversationHistory.slice(-8)
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.warn('Remote AI unavailable:', errorData.error || response.statusText);
                return null;
            }

            const data = await response.json();
            return data.response || null;
        } catch (error) {
            console.warn('Remote AI request failed, using offline assistant:', error);
            return null;
        }
    }

    updateContextKeywords(query) {
        const keywords = [
            'emg', 'signal', 'muscle', 'activation', 'fatigue', 'strength', 
            'exercise', 'treatment', 'rehabilitation', 'therapy', 'biceps', 
            'triceps', 'quadriceps', 'gastrocnemius', 'amplitude', 'frequency',
            'rms', 'contraction', 'pattern', 'analysis'
        ];
        
        keywords.forEach(keyword => {
            if (query.includes(keyword)) {
                this.contextKeywords.add(keyword);
            }
        });
    }

    isSignalInterpretationQuery(query) {
        const signalKeywords = ['pattern', 'signal', 'interpret', 'mean', 'indicate', 'amplitude', 'frequency', 'patrón', 'señal', 'interpretar', 'indica', 'amplitud', 'frecuencia', 'asimetría', 'simetría'];
        return signalKeywords.some(keyword => query.includes(keyword));
    }

    isTreatmentQuery(query) {
        const treatmentKeywords = ['treatment', 'therapy', 'rehabilitation', 'protocol', 'help', 'fix', 'tratamiento', 'terapia', 'rehabilitación', 'protocolo'];
        return treatmentKeywords.some(keyword => query.includes(keyword));
    }

    isMusclePhysiologyQuery(query) {
        const physiologyKeywords = ['muscle', 'function', 'anatomy', 'physiology', 'work', 'role', 'músculo', 'función', 'anatomía', 'fisiología'];
        return physiologyKeywords.some(keyword => query.includes(keyword));
    }

    isExerciseQuery(query) {
        const exerciseKeywords = ['exercise', 'strengthen', 'workout', 'train', 'activity', 'ejercicio', 'fortalecer', 'entrenar', 'actividad'];
        return exerciseKeywords.some(keyword => query.includes(keyword));
    }

    isFatigueQuery(query) {
        const fatigueKeywords = ['fatigue', 'tired', 'endurance', 'exhausted', 'fatiga', 'cansancio', 'agotamiento'];
        return fatigueKeywords.some(keyword => query.includes(keyword));
    }

    isSignalQualityQuery(query) {
        const qualityKeywords = ['quality', 'noise', 'artifact', 'improve', 'better', 'clear', 'calidad', 'ruido', 'artefacto', 'mejorar', 'limpia'];
        return qualityKeywords.some(keyword => query.includes(keyword));
    }

    generateSignalInterpretation(query) {
        return `Descripción de los datos disponibles: ${this.describeCurrentSignal()}. Esta comparación es orientativa y debe revisarse junto con la calidad de señal, la colocación de electrodos y las condiciones de la sesión.` + this.addTechnicalDetails();
    }

    generateTreatmentRecommendation(query) {
        return 'No puedo prescribir tratamientos ni indicar ejercicios personalizados. DEMASY puede describir las métricas observadas y ayudarte a preparar preguntas para que un profesional defina la intervención según la evaluación completa.';
    }

    generateMusclePhysiologyResponse(query) {
        const muscle = this.identifyMuscleInQuery(query);
        
        if (muscle && this.knowledgeBase.muscles[muscle]) {
            const info = this.knowledgeBase.muscles[muscle];
            return `**Función del ${muscle.charAt(0).toUpperCase() + muscle.slice(1)}:**\n${info.function}\n\n` +
                   `**Valores EMG normales:**\n${info.normalValues}\n\n` +
                   `**Normas bilaterales:**\n${info.bilateralNorms}\n\n` +
                   `**Problemas clínicos comunes:**\n${info.commonIssues}\n\n` +
                   `**Factores de riesgo de asimetría:**\n${info.asymmetryRisks}\n\n` +
                   `**Consideraciones de análisis EMG bilateral:**\nMonitorear patrones de activación durante movimientos funcionales y evaluar simetría bilateral. La comparación lado a lado es esencial para detectar compensaciones tempranas.`;
        }
        
        return `La fisiología muscular bilateral involucra interacciones complejas entre control neural, reclutamiento de fibras y procesos metabólicos. El EMG bilateral proporciona información sobre:\n\n` +
               `• **Reclutamiento de unidades motoras:** Activación progresiva bilateral de unidades motoras pequeñas a grandes\n` +
               `• **Frecuencia de disparo:** Modulación de fuerza bilateral a través de codificación de tasa\n` +
               `• **Sincronización:** Coordinación entre unidades motoras y entre lados\n` +
               `• **Control neuromuscular:** Factores que afectan la coordinación bilateral\n` +
               `• **Simetría funcional:** Importancia del equilibrio bilateral para función óptima\n\n` +
               `Comprender estos principios ayuda a describir señales EMG bilaterales y sus diferencias observables.`;
    }

    generateExerciseRecommendation(query) {
        return this.generateTreatmentRecommendation(query);
    }

    generateSignalQualityAdvice(query) {
        let currentQuality = 'buena';
        if (this.currentEMGContext) {
            const snr = parseFloat(this.currentEMGContext.snr) || 45;
            if (snr > 40) currentQuality = 'excelente';
            else if (snr > 30) currentQuality = 'buena';
            else if (snr > 20) currentQuality = 'regular';
            else currentQuality = 'pobre';
        }
        
        const qualityInfo = this.knowledgeBase.signalQuality[currentQuality];
        
        return `Calidad actual de la señal: ${currentQuality.toUpperCase()}\n${qualityInfo}\n\n` +
            `Revisión sugerida:\n• Preparar y limpiar la piel antes de colocar electrodos.\n` +
            `• Verificar contacto, fijación y separación consistente entre electrodos.\n` +
            `• Alejar cables de fuentes eléctricas y reducir su movimiento.\n` +
            `• Comprobar deriva de línea base, saturación y artefactos antes de interpretar métricas.`;
    }

    generateGeneralResponse(query) {
        const generalResponses = [
            `Estoy aquí para ayudar con interpretación de señales EMG bilaterales, fisiología muscular y planificación de tratamientos. ¿Podrías proporcionar más detalles específicos sobre lo que te gustaría analizar?`,
            
            `Como tu asistente IA de kinesiología, puedo ayudarte a comprender patrones EMG bilaterales, desarrollar protocolos de tratamiento e interpretar datos de activación muscular. ¿Qué aspecto específico te gustaría explorar?`,
            
            `Puedo asistir con varios aspectos del análisis EMG bilateral, incluyendo interpretación de señales, asimetrías y planificación de tratamientos. ¿Cómo puedo ayudarte hoy?`
        ];
        
        return this.selectContextualResponse(generalResponses) + this.addSuggestionsFooter();
    }

    // Helper methods
    describeCurrentSignal() {
        if (!this.currentEMGContext) return "patrones de activación normales bilaterales";
        
        const leftRMS = parseFloat(this.currentEMGContext.left?.rms) || 0;
        const rightRMS = parseFloat(this.currentEMGContext.right?.rms) || 0;
        const symmetry = parseFloat(this.currentEMGContext.bilateral?.symmetryIndex) || 100;
        const activity = this.currentEMGContext.activity || 'general';
        
        let description = "";
        const avgRMS = (leftRMS + rightRMS) / 2;
        
        if (activity === 'cycling') {
            // Cycling-specific descriptions
            if (avgRMS < 0.3) description = "activación de pedaleo bilateral baja, posible fase de recuperación o punto muerto";
            else if (avgRMS < 0.8) description = "activación de pedaleo bilateral moderada con patrones cíclicos típicos";
            else description = "activación de pedaleo bilateral alta, posible fase de potencia intensa";
            
            if (symmetry < 75) description += " con desequilibrio significativo de potencia entre piernas";
            else if (symmetry < 90) description += " con leve desequilibrio en el pedaleo bilateral";
            else description += " con excelente simetría en el pedaleo";
            
            // Add cadence and efficiency context if available
            if (this.currentEMGContext.cycling) {
                const efficiency = this.currentEMGContext.cycling.pedalingEfficiency || 85;
                if (efficiency < 75) description += ", técnica de pedaleo ineficiente";
                else if (efficiency > 90) description += ", técnica de pedaleo muy eficiente";
            }
        } else {
            // General bilateral descriptions
            if (avgRMS < 0.1) description = "activación muscular bilateral baja con actividad EMG mínima";
            else if (avgRMS < 0.5) description = "activación muscular bilateral moderada con patrones EMG típicos";
            else description = "activación muscular bilateral alta con señales EMG fuertes";
            
            if (symmetry < 75) description += " con asimetría significativa";
            else if (symmetry < 90) description += " con asimetría leve a moderada";
            else description += " con buena simetría bilateral";
        }
        
        return description;
    }

    getCurrentActivationDescription() {
        if (!this.currentEMGContext) return "typical muscle activation";
        
        const activation = this.currentEMGContext.activationLevel || 0;
        if (activation < 0.2) return "minimal muscle activation";
        if (activation < 0.6) return "moderate muscle activation";
        return "high-level muscle activation";
    }

    getPhysiologicalInterpretation() {
        const interpretations = [
            "normal neuromuscular function with appropriate motor unit recruitment",
            "adequate muscle fiber activation for the current task demands",
            "proper coordination between neural drive and muscle response"
        ];
        return interpretations[Math.floor(Math.random() * interpretations.length)];
    }

    getDetailedSignalAnalysis() {
        if (!this.currentEMGContext) return "standard EMG characteristics";
        
        const rms = parseFloat(this.currentEMGContext.rms) || 0;
        const peak = parseFloat(this.currentEMGContext.peakAmplitude) || 0;
        const freq = parseFloat(this.currentEMGContext.frequency) || 0;
        
        return `RMS amplitude of ${rms.toFixed(2)} mV indicates ${this.interpretAmplitude(rms)}, ` +
               `peak amplitude of ${peak.toFixed(2)} mV shows ${this.interpretPeak(peak)}, ` +
               `and frequency content around ${freq.toFixed(1)} Hz suggests ${this.interpretFrequency(freq)}`;
    }

    interpretAmplitude(rms) {
        if (rms < 0.1) return "low muscle activation";
        if (rms < 0.5) return "moderate muscle activation";
        if (rms < 1.0) return "strong muscle activation";
        return "maximal muscle activation";
    }

    interpretPeak(peak) {
        if (peak < 0.5) return "controlled contraction patterns";
        if (peak < 2.0) return "normal peak activation";
        return "high-intensity muscle activation";
    }

    interpretFrequency(freq) {
        if (freq < 40) return "contenido predominante en frecuencias bajas";
        if (freq < 80) return "typical muscle fiber recruitment";
        return "fast-twitch fiber activation";
    }

    identifyMuscleInQuery(query) {
        const muscles = ['biceps', 'triceps', 'quadriceps', 'gastrocnemius'];
        return muscles.find(muscle => query.includes(muscle));
    }

    identifyIssueInQuery(query) {
        const issues = {
            'pain': 'pain management',
            'weak': 'weakness',
            'tight': 'tightness',
            'injury': 'injury recovery'
        };
        
        for (const [keyword, issue] of Object.entries(issues)) {
            if (query.includes(keyword)) return issue;
        }
        return null;
    }

    selectContextualResponse(responses) {
        return responses[Math.floor(Math.random() * responses.length)];
    }

    addTechnicalDetails() {
        return `\n\n*💡 Consejo: Considera los patrones temporales y la simetría bilateral al interpretar señales EMG para un análisis integral. La comparación lado a lado es clave para detectar compensaciones tempranas.*`;
    }

    addSuggestionsFooter() {
        return `\n\n**Temas populares con los que puedo ayudar:**\n• Interpretación de señales EMG bilaterales\n• Fisiología y función muscular\n• Protocolos de ejercicio y rehabilitación\n• Comparación de activación bilateral\n• Análisis de asimetrías y compensaciones`;
    }

    getInterpretationRecommendations() {
        const recommendations = [
            "Consider comparing bilateral signals for symmetry assessment",
            "Comparar patrones de activación entre ambos lados",
            "Evaluate signal quality and potential artifacts",
            "Assess activation timing relative to movement phases"
        ];
        return recommendations[Math.floor(Math.random() * recommendations.length)];
    }

    // Public API methods
    clearHistory() {
        this.conversationHistory = [];
        this.contextKeywords.clear();
    }

    getConversationHistory() {
        return [...this.conversationHistory];
    }

    updateEMGContext(emgData) {
        this.currentEMGContext = emgData;
    }
}

// Export for use in main application
window.KinesiologyAIAssistant = KinesiologyAIAssistant;
