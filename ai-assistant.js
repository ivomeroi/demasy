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
                    "Desplazamientos de frecuencia hacia valores menores pueden indicar fatiga muscular",
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
                    "Comparación lado a lado mejora la precisión diagnóstica",
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
                    fatiguedPedaling: "Disminución progresiva de amplitud y coordinación bilateral"
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
                    "Monitoreo de fatiga bilateral durante sesiones de entrenamiento",
                    "Evaluación de calidad de movimiento usando análisis EMG bilateral"
                ]
            },

            signalQuality: {
                excelente: "SNR > 40 dB, artefactos mínimos, línea base estable, patrones de activación claros",
                buena: "SNR 30-40 dB, artefactos menores ocasionales, ruido de línea base aceptable",
                regular: "SNR 20-30 dB, artefactos moderados presentes, puede afectar interpretación",
                pobre: "SNR < 20 dB, artefactos significativos, inestabilidad de línea base, datos no confiables"
            },

            fatigueAssessment: {
                indicators: [
                    "Disminución en frecuencia mediana a lo largo del tiempo",
                    "Incremento en amplitud con niveles de fuerza mantenidos",
                    "Cambios en el tiempo de activación muscular y coordinación",
                    "Desplazamiento en espectro de potencia hacia frecuencias menores"
                ],
                bilateralIndicators: [
                    "Fatiga asimétrica puede indicar compensación",
                    "Diferencias en declive de frecuencia mediana entre lados",
                    "Variabilidad aumentada en activación bilateral",
                    "Pérdida progresiva de simetría durante ejercicio sostenido"
                ],
                interpretation: [
                    "Fatiga central: Reducción del impulso neural, reclutamiento reducido de unidades motoras",
                    "Fatiga periférica: Cambios metabólicos, alteración del acoplamiento excitación-contracción",
                    "Fatiga neuromuscular: Combinación de factores centrales y periféricos",
                    "Fatiga asimétrica: Posible indicador de disfunción unilateral o compensación"
                ]
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
            response = this.generateFatigueAnalysis(query);
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

        return response;
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
        const signalKeywords = ['pattern', 'signal', 'interpret', 'mean', 'indicate', 'amplitude', 'frequency'];
        return signalKeywords.some(keyword => query.includes(keyword));
    }

    isTreatmentQuery(query) {
        const treatmentKeywords = ['treatment', 'therapy', 'rehabilitation', 'protocol', 'help', 'fix'];
        return treatmentKeywords.some(keyword => query.includes(keyword));
    }

    isMusclePhysiologyQuery(query) {
        const physiologyKeywords = ['muscle', 'function', 'anatomy', 'physiology', 'work', 'role'];
        return physiologyKeywords.some(keyword => query.includes(keyword));
    }

    isExerciseQuery(query) {
        const exerciseKeywords = ['exercise', 'strengthen', 'workout', 'train', 'activity'];
        return exerciseKeywords.some(keyword => query.includes(keyword));
    }

    isFatigueQuery(query) {
        const fatigueKeywords = ['fatigue', 'tired', 'weak', 'endurance', 'exhausted'];
        return fatigueKeywords.some(keyword => query.includes(keyword));
    }

    isSignalQualityQuery(query) {
        const qualityKeywords = ['quality', 'noise', 'artifact', 'improve', 'better', 'clear'];
        return qualityKeywords.some(keyword => query.includes(keyword));
    }

    generateSignalInterpretation(query) {
        const responses = [
            `Basándome en los datos EMG bilaterales actuales, puedo observar ${this.describeCurrentSignal()}. ${this.getSignalInterpretationAdvice()}.`,
            
            `El patrón EMG bilateral muestra ${this.getCurrentActivationDescription()}. Esto sugiere ${this.getPhysiologicalInterpretation()}.`,
            
            `Analizando las características de señal bilateral: ${this.getDetailedSignalAnalysis()}. ${this.getInterpretationRecommendations()}.`
        ];
        
        return this.selectContextualResponse(responses) + this.addTechnicalDetails();
    }

    generateTreatmentRecommendation(query) {
        const muscle = this.identifyMuscleInQuery(query);
        const issue = this.identifyIssueInQuery(query);
        
        const treatments = this.knowledgeBase.treatments;
        const muscleInfo = this.knowledgeBase.muscles[muscle];
        
        let response = `Para ${muscle || 'el músculo objetivo'} con ${issue || 'las preocupaciones actuales'}, recomiendo:\n\n`;
        
        response += `**Intervenciones inmediatas:**\n`;
        response += `• ${treatments.bilateralStrengthening[0]}\n`;
        response += `• ${treatments.rehabilitation[0]}\n\n`;
        
        response += `**Enfoque de tratamiento progresivo:**\n`;
        response += `• ${treatments.bilateralStrengthening[1]}\n`;
        response += `• ${treatments.asymmetryCorrection[1]}\n`;
        response += `• ${treatments.bilateralStrengthening[2]}\n\n`;
        
        if (muscleInfo) {
            response += `**Ejercicios específicos para ${muscle} (bilateral):**\n${muscleInfo.exercises}\n\n`;
            response += `**Consideraciones de asimetría:**\n${muscleInfo.asymmetryRisks}\n\n`;
        }
        
        response += `**Pautas de monitoreo bilateral:**\n`;
        response += `• Usar retroalimentación EMG bilateral para asegurar niveles de activación apropiados\n`;
        response += `• Monitorear patrones de fatiga bilateral durante ejercicios\n`;
        response += `• Seguir progreso con comparaciones EMG bilaterales\n`;
        response += `• Objetivo: Mantener índice de simetría >90%`;
        
        return response;
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
                   `**Consideraciones de análisis EMG bilateral:**\nMonitorear patrones de activación durante movimientos funcionales, evaluar simetría bilateral, y analizar respuesta de fatiga durante contracciones sostenidas. La comparación lado a lado es esencial para detectar compensaciones tempranas.`;
        }
        
        return `La fisiología muscular bilateral involucra interacciones complejas entre control neural, reclutamiento de fibras y procesos metabólicos. El EMG bilateral proporciona información sobre:\n\n` +
               `• **Reclutamiento de unidades motoras:** Activación progresiva bilateral de unidades motoras pequeñas a grandes\n` +
               `• **Frecuencia de disparo:** Modulación de fuerza bilateral a través de codificación de tasa\n` +
               `• **Sincronización:** Coordinación entre unidades motoras y entre lados\n` +
               `• **Mecanismos de fatiga:** Factores centrales y periféricos que afectan el rendimiento bilateral\n` +
               `• **Simetría funcional:** Importancia del equilibrio bilateral para función óptima\n\n` +
               `Comprender estos principios ayuda a interpretar señales EMG bilaterales en contextos clínicos y detectar asimetrías patológicas.`;
    }

    generateExerciseRecommendation(query) {
        const muscle = this.identifyMuscleInQuery(query) || 'target muscle';
        const issue = this.identifyIssueInQuery(query);
        
        let response = `**EMG-Guided Exercise Protocol for ${muscle}:**\n\n`;
        
        response += `**Phase 1 - Activation (Weeks 1-2):**\n`;
        response += `• Isometric contractions at 30-50% EMG max\n`;
        response += `• Hold for 5-10 seconds, monitor EMG feedback\n`;
        response += `• Focus on proper activation patterns\n\n`;
        
        response += `**Phase 2 - Strengthening (Weeks 3-6):**\n`;
        response += `• Progressive resistance with EMG monitoring\n`;
        response += `• Target 70-85% EMG max during exercises\n`;
        response += `• Include both concentric and eccentric phases\n\n`;
        
        response += `**Phase 3 - Functional Integration (Weeks 7+):**\n`;
        response += `• Sport/activity-specific movements\n`;
        response += `• EMG analysis of movement patterns\n`;
        response += `• Fatigue resistance training with EMG monitoring\n\n`;
        
        response += `**EMG Targets:**\n`;
        response += `• Activation symmetry: >90% between sides\n`;
        response += `• Fatigue threshold: <20% amplitude increase over time\n`;
        response += `• Quality: Maintain clean signal patterns throughout exercises`;
        
        return response;
    }

    generateFatigueAnalysis(query) {
        const indicators = this.knowledgeBase.fatigueAssessment.indicators;
        const interpretation = this.knowledgeBase.fatigueAssessment.interpretation;
        
        let response = `**EMG Fatigue Analysis:**\n\n`;
        
        if (this.currentEMGContext) {
            response += `Current fatigue level appears to be ${this.currentEMGContext.fatigueLevel || 'low'} based on signal characteristics.\n\n`;
        }
        
        response += `**Key EMG Fatigue Indicators:**\n`;
        indicators.forEach(indicator => {
            response += `• ${indicator}\n`;
        });
        
        response += `\n**Clinical Interpretation:**\n`;
        interpretation.forEach(interp => {
            response += `• ${interp}\n`;
        });
        
        response += `\n**Recommendations:**\n`;
        response += `• Monitor median frequency trends during sustained contractions\n`;
        response += `• Use EMG amplitude normalization for fatigue assessment\n`;
        response += `• Consider work-to-rest ratios based on EMG fatigue patterns\n`;
        response += `• Implement fatigue-resistant training protocols`;
        
        return response;
    }

    generateSignalQualityAdvice(query) {
        let currentQuality = 'good';
        if (this.currentEMGContext) {
            const snr = parseFloat(this.currentEMGContext.snr) || 45;
            if (snr > 40) currentQuality = 'excellent';
            else if (snr > 30) currentQuality = 'good';
            else if (snr > 20) currentQuality = 'fair';
            else currentQuality = 'poor';
        }
        
        const qualityInfo = this.knowledgeBase.signalQuality[currentQuality];
        
        let response = `**Current Signal Quality Assessment:** ${currentQuality.toUpperCase()}\n`;
        response += `${qualityInfo}\n\n`;
        
        response += `**Signal Quality Optimization Tips:**\n`;
        response += `• **Electrode placement:** Clean skin, proper inter-electrode distance (2-3cm)\n`;
        response += `• **Skin preparation:** Light abrasion, alcohol cleaning, low impedance (<5kΩ)\n`;
        response += `• **Noise reduction:** Avoid power lines, mobile devices, fluorescent lights\n`;
        response += `• **Motion artifacts:** Secure electrode attachment, minimize cable movement\n`;
        response += `• **Baseline stability:** Allow signal settling time, check for drift\n\n`;
        
        response += `**Troubleshooting Common Issues:**\n`;
        response += `• High noise: Check electrode contact and environmental interference\n`;
        response += `• Baseline drift: Verify amplifier settings and electrode stability\n`;
        response += `• Low amplitude: Confirm muscle activation and electrode positioning\n`;
        response += `• Artifacts: Identify source (motion, electrical, physiological)`;
        
        return response;
    }

    generateGeneralResponse(query) {
        const generalResponses = [
            `Estoy aquí para ayudar con interpretación de señales EMG bilaterales, fisiología muscular y planificación de tratamientos. ¿Podrías proporcionar más detalles específicos sobre lo que te gustaría analizar?`,
            
            `Como tu asistente IA de kinesiología, puedo ayudarte a comprender patrones EMG bilaterales, desarrollar protocolos de tratamiento e interpretar datos de activación muscular. ¿Qué aspecto específico te gustaría explorar?`,
            
            `Puedo asistir con varios aspectos del análisis EMG bilateral incluyendo interpretación de señales, prescripción de ejercicios, evaluación de fatiga y planificación de tratamientos. ¿Cómo puedo ayudarte hoy?`
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
        if (freq < 40) return "potential fatigue or slow-twitch fiber dominance";
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
            'injury': 'injury recovery',
            'fatigue': 'fatigue issues'
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
        return `\n\n**Temas populares con los que puedo ayudar:**\n• Interpretación de señales EMG bilaterales\n• Fisiología y función muscular\n• Protocolos de ejercicio y rehabilitación\n• Evaluación y manejo de fatiga bilateral\n• Análisis de asimetrías y compensaciones`;
    }

    getInterpretationRecommendations() {
        const recommendations = [
            "Consider comparing bilateral signals for symmetry assessment",
            "Monitor fatigue patterns during sustained contractions",
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