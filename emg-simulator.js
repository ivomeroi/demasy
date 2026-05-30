/**
 * Bilateral EMG Signal Simulator
 * Generates realistic bilateral electromyography signals for different muscle types
 * Simulates various conditions including asymmetries, normal activity, fatigue, and artifacts
 */

class EMGSimulator {
    constructor() {
        console.log('Initializing EMGSimulator...');
        
        this.isRunning = false;
        this.currentMuscle = 'quadriceps'; // Default to quadriceps for cycling
        this.sampleRate = 1000; // Hz
        this.time = 0;
        
        // Bilateral activation levels
        this.activationLevel = { left: 0, right: 0 };
        this.fatigueLevel = { left: 0, right: 0 };
        this.asymmetryFactor = 1.0; // 1.0 = perfect symmetry, 0.8 = 20% asymmetry
        this.noiseLevel = 0.05;
        
        // Temporal delay for signal alignment analysis (in seconds)
        this.timeDelay = { left: 0, right: 0 }; // seconds (-0.5 to +0.5)
        
        // Muscle-specific parameters for cycling (fixed bike)
        this.muscleProfiles = {
            quadriceps: {
                baseFrequency: 65, // Hz - Primary power muscle in cycling
                maxAmplitude: 2.5, // mV - High activation during cycling
                fatigueRate: 0.0002,
                activationPattern: 'cycling_power', // Main power phase 0°-180°
                frequencyRange: [30, 200],
                dominantSide: 'right',
                asymmetryTendency: 0.08, // Very symmetric in cycling
                cyclingPhase: {
                    peakActivation: 90, // degrees - peak at 3 o'clock position
                    activationRange: [330, 150], // degrees - when muscle is active
                    peakIntensity: 0.9
                }
            },
            gastrocnemius: {
                baseFrequency: 58,
                maxAmplitude: 2.2, // mV - Important for plantar flexion in pedaling
                fatigueRate: 0.0003,
                activationPattern: 'cycling_plantar', // Plantar flexion phase
                frequencyRange: [25, 180],
                dominantSide: 'right',
                asymmetryTendency: 0.06, // Highly symmetric in cycling
                cyclingPhase: {
                    peakActivation: 120, // degrees - late power phase
                    activationRange: [60, 180], // degrees
                    peakIntensity: 0.7
                }
            },
            hamstring: {
                baseFrequency: 55,
                maxAmplitude: 1.8, // mV - Pull-up phase and knee flexion
                fatigueRate: 0.00025,
                activationPattern: 'cycling_pullup', // Recovery phase assistance
                frequencyRange: [25, 160],
                dominantSide: 'right',
                asymmetryTendency: 0.12,
                cyclingPhase: {
                    peakActivation: 270, // degrees - top dead center to 9 o'clock
                    activationRange: [180, 360], // degrees - recovery phase
                    peakIntensity: 0.5
                }
            },
            tibialis: {
                baseFrequency: 50,
                maxAmplitude: 1.3, // mV - Dorsiflexion during recovery
                fatigueRate: 0.0004,
                activationPattern: 'cycling_dorsiflexion', // Recovery phase
                frequencyRange: [20, 140],
                dominantSide: 'right',
                asymmetryTendency: 0.10,
                cyclingPhase: {
                    peakActivation: 315, // degrees - late recovery phase
                    activationRange: [270, 30], // degrees - recovery to early power
                    peakIntensity: 0.4
                }
            },
            gluteus: {
                baseFrequency: 62,
                maxAmplitude: 2.0, // mV - Hip extension power
                fatigueRate: 0.0002,
                activationPattern: 'cycling_hip_extension',
                frequencyRange: [28, 180],
                dominantSide: 'right',
                asymmetryTendency: 0.09,
                cyclingPhase: {
                    peakActivation: 45, // degrees - early power phase
                    activationRange: [315, 135], // degrees - hip extension phase
                    peakIntensity: 0.8
                }
            },
            soleus: {
                baseFrequency: 52,
                maxAmplitude: 1.6, // mV - Deep calf muscle for sustained pedaling
                fatigueRate: 0.0003,
                activationPattern: 'cycling_sustained',
                frequencyRange: [22, 150],
                dominantSide: 'right',
                asymmetryTendency: 0.07,
                cyclingPhase: {
                    peakActivation: 135, // degrees - mid to late power phase
                    activationRange: [45, 200], // degrees - extended activation
                    peakIntensity: 0.6
                }
            }
        };

        // Cycling-specific parameters
        this.cyclingParams = {
            cadence: 80, // RPM (revolutions per minute)
            resistance: 0.5, // 0-1 scale
            pedalingEfficiency: 0.85, // How smooth the pedaling is
            phaseOffset: Math.PI, // 180° offset between legs
            pedalPosition: { left: 0, right: Math.PI } // Current pedal positions in radians
        };

        // Bilateral signal characteristics
        this.signalBuffer = {
            left: [],
            right: []
        };
        this.maxBufferSize = 10000; // 10 seconds at 1000Hz
        
        // Bilateral statistics tracking
        this.stats = {
            left: {
                rms: 0,
                peakAmplitude: 0,
                frequency: 0
            },
            right: {
                rms: 0,
                peakAmplitude: 0,
                frequency: 0
            },
            bilateral: {
                symmetryIndex: 100, // percentage
                asymmetryLevel: 'Normal',
                difference: 0, // percentage difference
                snr: 45.2,
                artifacts: 'Ninguno'
            }
        };

        this.callbacks = {
            onDataUpdate: null,
            onStatsUpdate: null
        };
        
        // Initialize with default asymmetry factor
        this.setAsymmetryFactor(0.95); // 5% natural asymmetry
        
        console.log('EMGSimulator initialized successfully with muscle:', this.currentMuscle);
    }

    setMuscle(muscleType) {
        if (this.muscleProfiles[muscleType]) {
            this.currentMuscle = muscleType;
            this.resetSignal();
        }
    }

    setActivationLevel(level, side = 'both') {
        // Level should be between 0 and 1
        level = Math.max(0, Math.min(1, level));
        
        if (side === 'both') {
            this.activationLevel.left = level;
            this.activationLevel.right = level * this.asymmetryFactor;
        } else if (side === 'left') {
            this.activationLevel.left = level;
        } else if (side === 'right') {
            this.activationLevel.right = level;
        }
    }

    setAsymmetryFactor(factor) {
        // Factor between 0.5 (severe asymmetry) and 1.0 (perfect symmetry)
        this.asymmetryFactor = Math.max(0.5, Math.min(1.0, factor));
    }

    // Temporal delay control methods for signal superposition
    setTimeDelay(degrees, side = 'right') {
        // Convert degrees to time delay based on cycling cadence
        // One full pedal cycle = 360° = 60/cadence seconds
        const cadence = this.cyclingParams?.cadence || 80; // RPM
        const cycleDuration = 60 / cadence; // seconds per cycle
        const delaySeconds = (degrees / 360) * cycleDuration;
        
        this.timeDelay[side] = Math.max(-0.5, Math.min(0.5, delaySeconds));
        console.log(`Time delay set: ${side} = ${this.timeDelay[side].toFixed(3)}s (${degrees}°)`);
    }

    getTimeDelay(side = 'right') {
        // Convert back to degrees for UI display
        const cadence = this.cyclingParams?.cadence || 80;
        const cycleDuration = 60 / cadence;
        const degrees = (this.timeDelay[side] / cycleDuration) * 360;
        return Math.round(degrees);
    }

    resetTimeDelay() {
        this.timeDelay.left = 0;
        this.timeDelay.right = 0;
        console.log('Time delay reset to 0s for both sides');
    }

    invertDelay(side = 'right') {
        // Invert delay (equivalent to 180° phase shift)
        const cadence = this.cyclingParams?.cadence || 80;
        const halfCycleDuration = (60 / cadence) / 2; // Half cycle in seconds
        
        this.timeDelay[side] = this.timeDelay[side] >= 0 ? 
                               this.timeDelay[side] - halfCycleDuration : 
                               this.timeDelay[side] + halfCycleDuration;
        
        // Keep within bounds
        this.timeDelay[side] = Math.max(-0.5, Math.min(0.5, this.timeDelay[side]));
        console.log(`Delay inverted: ${side} = ${this.timeDelay[side].toFixed(3)}s`);
    }

    autoAlignDelays() {
        // Automatically set optimal delay for signal superposition
        const cadence = this.cyclingParams?.cadence || 80;
        const halfCycleDuration = (60 / cadence) / 2;
        
        if (this.currentMuscle === 'quadriceps' || this.currentMuscle === 'gluteus') {
            // Power phase muscles - superpose by aligning power phases
            this.timeDelay.right = 0; // No delay - should be naturally aligned
        } else if (this.currentMuscle === 'hamstring') {
            // Recovery phase - offset by half cycle to align recovery patterns
            this.timeDelay.right = halfCycleDuration;
        } else {
            // Other muscles - minimal delay for best visual alignment
            this.timeDelay.right = 0;
        }
        
        console.log(`Auto-aligned delays for ${this.currentMuscle}: right = ${this.timeDelay.right.toFixed(3)}s`);
    }

    simulatePathology(type) {
        // Simulate common pathological patterns
        switch(type) {
            case 'hemiparesis':
                this.setAsymmetryFactor(0.6); // 40% weakness on one side
                break;
            case 'compensation':
                this.setAsymmetryFactor(0.7); // 30% compensation pattern
                break;
            case 'injury':
                this.setAsymmetryFactor(0.55); // Post-injury weakness
                break;
            case 'normal':
            default:
                this.setAsymmetryFactor(0.95); // 5% natural asymmetry
                break;
        }
    }

    start() {
        console.log('EMGSimulator.start() called');
        
        if (!this.isRunning) {
            console.log('Starting EMG simulation...');
            this.isRunning = true;
            this.time = 0;
            this.fatigueLevel = { left: 0, right: 0 };
            this.signalBuffer = { left: [], right: [] };
            
            console.log('Initial state set, starting signal generation...');
            try {
                this.generateSignal();
                console.log('Signal generation started successfully');
            } catch (error) {
                console.error('Error starting signal generation:', error);
                this.isRunning = false;
                throw error;
            }
        } else {
            console.log('EMG Simulator already running');
        }
    }

    stop() {
        this.isRunning = false;
    }

    reset() {
        this.stop();
        this.resetSignal();
    }

    resetSignal() {
        this.time = 0;
        this.fatigueLevel = { left: 0, right: 0 };
        this.signalBuffer = { left: [], right: [] };
        this.updateStats();
    }

    generateSignal() {
        if (!this.isRunning) return;

        try {
            const muscle = this.muscleProfiles[this.currentMuscle];
            if (!muscle) {
                console.error('Muscle profile not found:', this.currentMuscle);
                return;
            }
            
            const dt = 1 / this.sampleRate;
        
        // Generate bilateral signals
        const signals = { left: 0, right: 0 };
        const activations = { left: 0, right: 0 };
        
        // Generate base activation patterns for both sides
        activations.left = this.generateActivationPattern(muscle, 'left');
        activations.right = this.generateActivationPattern(muscle, 'right');
        
        // Generate EMG signal for each side
        ['left', 'right'].forEach(side => {
            const activation = activations[side];
            let signal = 0;
            
            // Apply temporal delay for signal superposition
            const delayedTime = this.time + this.timeDelay[side];
            
            if (activation > 0.1) {
                // Apply side-specific fatigue
                const fatigueEffect = 1 - this.fatigueLevel[side] * 0.3;
                
                // Primary frequency component with slight frequency variation between sides
                const freqVariation = side === 'left' ? 1.0 : 1.02; // 2% frequency difference
                signal += activation * muscle.maxAmplitude * 
                         Math.sin(2 * Math.PI * muscle.baseFrequency * freqVariation * delayedTime) * 
                         fatigueEffect;
                
                // Harmonic components (also temporally delayed)
                signal += activation * muscle.maxAmplitude * 0.3 * 
                         Math.sin(2 * Math.PI * muscle.baseFrequency * freqVariation * 2 * delayedTime);
                signal += activation * muscle.maxAmplitude * 0.1 * 
                         Math.sin(2 * Math.PI * muscle.baseFrequency * freqVariation * 3 * delayedTime);
                
                // High frequency components (motor unit firing) - different for each side
                for (let i = 0; i < 5; i++) {
                    const freq = muscle.frequencyRange[0] + Math.random() * 
                               (muscle.frequencyRange[1] - muscle.frequencyRange[0]);
                    const naturalPhaseShift = side === 'left' ? 0 : Math.PI * 0.1; // Slight natural phase difference
                    signal += activation * muscle.maxAmplitude * 0.05 * 
                             Math.sin(2 * Math.PI * freq * delayedTime + naturalPhaseShift + Math.random() * 2 * Math.PI);
                }
            }
            
            // Add side-specific physiological noise
            signal += this.generateNoise() * (side === 'left' ? 1.0 : 1.1); // Right side slightly noisier
            
            // Add artifacts occasionally (more common on dominant side)
            const artifactChance = side === muscle.dominantSide ? 0.0012 : 0.0008;
            if (Math.random() < artifactChance) {
                signal += this.generateArtifact();
            }
            
            // Apply fatigue effect
            if (activation > 0.5) {
                this.fatigueLevel[side] += muscle.fatigueRate * (side === muscle.dominantSide ? 1.2 : 1.0);
                this.fatigueLevel[side] = Math.min(this.fatigueLevel[side], 0.8);
            } else {
                this.fatigueLevel[side] *= 0.999; // Slow recovery
            }
            
            signals[side] = signal;
        });
        
        // Add to bilateral buffers
        ['left', 'right'].forEach(side => {
            this.signalBuffer[side].push({
                time: this.time,
                amplitude: signals[side],
                activation: activations[side]
            });
            
            // Maintain buffer size
            if (this.signalBuffer[side].length > this.maxBufferSize) {
                this.signalBuffer[side].shift();
            }
        });
        
        // Update bilateral statistics
        this.updateStats();
        
        // Trigger callbacks with bilateral data
        if (this.callbacks.onDataUpdate) {
            this.callbacks.onDataUpdate({
                time: this.time,
                left: {
                    amplitude: signals.left,
                    activation: activations.left
                },
                right: {
                    amplitude: signals.right,
                    activation: activations.right
                }
            });
        }
        
        if (this.callbacks.onStatsUpdate) {
            this.callbacks.onStatsUpdate(this.stats);
        }
        
            this.time += dt;
            
            // Continue generation
            setTimeout(() => this.generateSignal(), dt * 1000);
        } catch (error) {
            console.error('Error in generateSignal:', error);
            this.isRunning = false; // Stop on error
        }
    }

    generateActivationPattern(muscle, side) {
        // Apply temporal delay to this side's time reference
        const t = this.time + this.timeDelay[side];
        let activation = 0;
        const baseActivation = this.activationLevel[side];

        // Calculate current pedal position for this side using delayed time
        const currentCadenceRPS = this.cyclingParams.cadence / 60; // Revolutions per second
        const angularVelocity = 2 * Math.PI * currentCadenceRPS; // Radians per second
        
        // Calculate pedal positions with individual time delays for proper superposition
        const leftTime = this.time + this.timeDelay.left;
        const rightTime = this.time + this.timeDelay.right;
        
        this.cyclingParams.pedalPosition.left = (angularVelocity * leftTime) % (2 * Math.PI);
        this.cyclingParams.pedalPosition.right = (angularVelocity * rightTime + Math.PI) % (2 * Math.PI);
        
        const currentAngle = this.cyclingParams.pedalPosition[side];
        const currentAngleDegrees = (currentAngle * 180 / Math.PI) % 360;

        // Generate cycling-specific activation patterns
        switch (muscle.activationPattern) {
            case 'cycling_power':
                // Quadriceps: Main power phase (downstroke)
                activation = this.calculateCyclingActivation(
                    currentAngleDegrees,
                    muscle.cyclingPhase,
                    baseActivation
                );
                break;
                
            case 'cycling_plantar':
                // Gastrocnemius: Plantar flexion during power phase
                activation = this.calculateCyclingActivation(
                    currentAngleDegrees,
                    muscle.cyclingPhase,
                    baseActivation
                ) * 0.8; // Less intense than quad
                break;
                
            case 'cycling_pullup':
                // Hamstring: Recovery phase and knee flexion
                activation = this.calculateCyclingActivation(
                    currentAngleDegrees,
                    muscle.cyclingPhase,
                    baseActivation
                ) * 0.6; // Recovery assistance
                break;

            case 'cycling_dorsiflexion':
                // Tibialis: Dorsiflexion during recovery
                activation = this.calculateCyclingActivation(
                    currentAngleDegrees,
                    muscle.cyclingPhase,
                    baseActivation
                ) * 0.4; // Low intensity for foot positioning
                break;

            case 'cycling_hip_extension':
                // Gluteus: Hip extension power
                activation = this.calculateCyclingActivation(
                    currentAngleDegrees,
                    muscle.cyclingPhase,
                    baseActivation
                ) * 0.75;
                break;

            case 'cycling_sustained':
                // Soleus: Sustained low-level activation
                activation = this.calculateCyclingActivation(
                    currentAngleDegrees,
                    muscle.cyclingPhase,
                    baseActivation
                ) * 0.5 + 0.2; // Base level + cycling component
                break;
                
            default:
                // Fallback to basic cycling pattern
                activation = Math.max(0, Math.sin(currentAngle)) * baseActivation;
        }

        // Add cycling-specific variations
        activation = this.addCyclingVariations(activation, side, currentAngleDegrees);
        
        // Add side-specific variation and natural asymmetry
        const sideVariation = side === muscle.dominantSide ? 1.0 : (1.0 - muscle.asymmetryTendency);
        activation *= sideVariation;
        
        // Add pedaling efficiency and resistance effects
        activation *= this.cyclingParams.pedalingEfficiency;
        activation *= (0.5 + 0.5 * this.cyclingParams.resistance);
        
        return Math.max(0, Math.min(1, activation));
    }

    calculateCyclingActivation(angleDegrees, cyclingPhase, baseActivation) {
        const { peakActivation, activationRange, peakIntensity } = cyclingPhase;
        
        // Handle activation ranges that cross 0° (e.g., [330, 30])
        let inActiveRange = false;
        if (activationRange[0] > activationRange[1]) {
            // Range crosses 0°
            inActiveRange = angleDegrees >= activationRange[0] || angleDegrees <= activationRange[1];
        } else {
            // Normal range
            inActiveRange = angleDegrees >= activationRange[0] && angleDegrees <= activationRange[1];
        }
        
        if (!inActiveRange) {
            return 0.05 * baseActivation; // Minimal activation outside range
        }
        
        // Calculate distance from peak activation angle
        let angleFromPeak = Math.abs(angleDegrees - peakActivation);
        if (angleFromPeak > 180) {
            angleFromPeak = 360 - angleFromPeak; // Shorter arc distance
        }
        
        // Create bell curve around peak activation
        const bellCurve = Math.exp(-Math.pow(angleFromPeak / 45, 2)); // 45° standard deviation
        
        return bellCurve * peakIntensity * baseActivation;
    }

    addCyclingVariations(activation, side, angleDegrees) {
        // Add realistic cycling variations
        
        // 1. Pedaling smoothness variation (less smooth = more variation)
        const smoothnessVariation = (2 - this.cyclingParams.pedalingEfficiency) * 0.1;
        activation *= (1 + (Math.random() - 0.5) * smoothnessVariation);
        
        // 2. Cadence-related harmonics (natural rhythm variations)
        const cadenceEffect = Math.sin(angleDegrees * Math.PI / 180 * 3) * 0.05; // 3rd harmonic
        activation += cadenceEffect * activation;
        
        // 3. Fatigue-related variations (affects peak power)
        const fatigueEffect = 1 - (this.fatigueLevel[side] * 0.3);
        activation *= fatigueEffect;
        
        // 4. Dead spots in pedal stroke (realistic power gaps)
        const deadSpotReduction = this.calculateDeadSpotEffect(angleDegrees);
        activation *= deadSpotReduction;
        
        return Math.max(0, activation);
    }

    calculateDeadSpotEffect(angleDegrees) {
        // Realistic dead spots in pedaling cycle
        // Top dead center (0°) and bottom dead center (180°) have reduced power
        const topDeadCenter = Math.abs(angleDegrees) < 15 || Math.abs(angleDegrees - 360) < 15;
        const bottomDeadCenter = Math.abs(angleDegrees - 180) < 15;
        
        if (topDeadCenter || bottomDeadCenter) {
            return 0.3; // 70% power reduction in dead spots
        }
        
        return 1.0; // No reduction in power zones
    }

    generateNoise() {
        // Physiological noise (mostly thermal and amplifier noise)
        return this.noiseLevel * (Math.random() - 0.5) * 2;
    }

    generateArtifact() {
        // Simulate various artifacts
        const artifactType = Math.random();
        
        if (artifactType < 0.3) {
            // Motion artifact (low frequency, high amplitude)
            return 0.5 * Math.sin(2 * Math.PI * 2 * this.time);
        } else if (artifactType < 0.6) {
            // Power line interference (50/60 Hz)
            return 0.1 * Math.sin(2 * Math.PI * 60 * this.time);
        } else {
            // Electrode contact artifact (sudden spike)
            return 1.0 * (Math.random() - 0.5);
        }
    }

    updateStats() {
        if (this.signalBuffer.left.length < 100 || this.signalBuffer.right.length < 100) return;

        // Calculate statistics for each side
        ['left', 'right'].forEach(side => {
            const recentData = this.signalBuffer[side].slice(-1000); // Last 1 second
            const amplitudes = recentData.map(d => d.amplitude);
            
            // RMS calculation
            const squaredSum = amplitudes.reduce((sum, amp) => sum + amp * amp, 0);
            this.stats[side].rms = Math.sqrt(squaredSum / amplitudes.length);
            
            // Peak amplitude
            this.stats[side].peakAmplitude = Math.max(...amplitudes.map(Math.abs));
            
            // Dominant frequency (simplified FFT alternative)
            this.stats[side].frequency = this.muscleProfiles[this.currentMuscle].baseFrequency + 
                                        (Math.random() - 0.5) * 10;
        });
        
        // Calculate bilateral comparison statistics
        const leftRMS = this.stats.left.rms;
        const rightRMS = this.stats.right.rms;
        
        // Symmetry Index (0-100%, where 100% is perfect symmetry)
        if (leftRMS > 0 || rightRMS > 0) {
            const maxRMS = Math.max(leftRMS, rightRMS);
            const minRMS = Math.min(leftRMS, rightRMS);
            this.stats.bilateral.symmetryIndex = (minRMS / maxRMS) * 100;
        } else {
            this.stats.bilateral.symmetryIndex = 100;
        }
        
        // Bilateral difference percentage
        if (leftRMS > 0 || rightRMS > 0) {
            this.stats.bilateral.difference = Math.abs(leftRMS - rightRMS) / 
                                            Math.max(leftRMS, rightRMS) * 100;
        } else {
            this.stats.bilateral.difference = 0;
        }
        
        // Asymmetry level assessment
        if (this.stats.bilateral.symmetryIndex >= 90) {
            this.stats.bilateral.asymmetryLevel = 'Normal';
        } else if (this.stats.bilateral.symmetryIndex >= 75) {
            this.stats.bilateral.asymmetryLevel = 'Leve';
        } else if (this.stats.bilateral.symmetryIndex >= 60) {
            this.stats.bilateral.asymmetryLevel = 'Moderada';
        } else {
            this.stats.bilateral.asymmetryLevel = 'Severa';
        }
        
        // Signal-to-noise ratio (average of both sides)
        const avgSignalPower = (leftRMS + rightRMS) / 2;
        const noisePower = this.noiseLevel;
        if (avgSignalPower > 0) {
            this.stats.bilateral.snr = 20 * Math.log10(avgSignalPower / noisePower);
        } else {
            this.stats.bilateral.snr = 45.2; // Default when no signal
        }
        
        // Artifacts detection (check both sides)
        const leftHasArtifacts = this.stats.left.peakAmplitude > 3.0;
        const rightHasArtifacts = this.stats.right.peakAmplitude > 3.0;
        
        if (leftHasArtifacts && rightHasArtifacts) {
            this.stats.bilateral.artifacts = 'Bilateral';
        } else if (leftHasArtifacts) {
            this.stats.bilateral.artifacts = 'Lado Izquierdo';
        } else if (rightHasArtifacts) {
            this.stats.bilateral.artifacts = 'Lado Derecho';
        } else {
            this.stats.bilateral.artifacts = 'Ninguno';
        }
    }

    // Simulate different bilateral contraction types
    simulateIsometricContraction(duration = 5, intensity = 0.8, asymmetric = false) {
        const leftIntensity = intensity;
        const rightIntensity = asymmetric ? intensity * this.asymmetryFactor : intensity;
        
        this.setActivationLevel(leftIntensity, 'left');
        this.setActivationLevel(rightIntensity, 'right');
        
        setTimeout(() => {
            this.setActivationLevel(0.1, 'both');
        }, duration * 1000);
    }

    simulateIsotonicContraction(cycles = 3, intensity = 0.9, asymmetric = false) {
        let cycle = 0;
        const intervalId = setInterval(() => {
            if (cycle >= cycles) {
                clearInterval(intervalId);
                this.setActivationLevel(0.1, 'both');
                return;
            }
            
            // Contraction phase with potential asymmetry
            const leftIntensity = intensity;
            const rightIntensity = asymmetric ? intensity * this.asymmetryFactor : intensity;
            
            this.setActivationLevel(leftIntensity, 'left');
            this.setActivationLevel(rightIntensity, 'right');
            
            setTimeout(() => {
                // Relaxation phase
                this.setActivationLevel(0.2, 'both');
                cycle++;
            }, 1000);
        }, 2000);
    }

    simulateFatigueTest(duration = 30, initialIntensity = 0.9, asymmetric = false) {
        const startTime = this.time;
        
        const fatigueInterval = setInterval(() => {
            const elapsed = this.time - startTime;
            if (elapsed >= duration) {
                clearInterval(fatigueInterval);
                this.setActivationLevel(0.1, 'both');
                return;
            }
            
            // Gradually decrease activation due to fatigue (potentially asymmetric)
            const fatigueDecay = 1 - (elapsed / duration) * 0.6;
            const leftIntensity = initialIntensity * fatigueDecay;
            const rightIntensity = asymmetric ? 
                                  initialIntensity * fatigueDecay * this.asymmetryFactor :
                                  initialIntensity * fatigueDecay;
            
            this.setActivationLevel(leftIntensity, 'left');
            this.setActivationLevel(rightIntensity, 'right');
        }, 100);
    }

    // Cycling-specific simulation methods
    setCadence(rpm) {
        // Set cycling cadence (typical range: 50-120 RPM)
        this.cyclingParams.cadence = Math.max(30, Math.min(150, rpm));
    }

    setResistance(level) {
        // Set bike resistance (0.0 = no resistance, 1.0 = maximum)
        this.cyclingParams.resistance = Math.max(0, Math.min(1, level));
    }

    setPedalingEfficiency(efficiency) {
        // Set pedaling smoothness (0.0 = very rough, 1.0 = perfectly smooth)
        this.cyclingParams.pedalingEfficiency = Math.max(0.3, Math.min(1.0, efficiency));
    }

    simulateWarmUp() {
        console.log('Starting warm-up simulation');
        try {
            // Simulate cycling warm-up: gradual increase in intensity
            this.setCadence(60);
            this.setResistance(0.3);
            this.setActivationLevel(0.4, 'both');
            
            // Gradually increase over 10 seconds (shortened for demo)
            let iterations = 0;
            const maxIterations = 10;
            const warmUpInterval = setInterval(() => {
                iterations++;
                const currentCadence = this.cyclingParams.cadence;
                const currentResistance = this.cyclingParams.resistance;
                
                if (iterations < maxIterations && currentCadence < 80) {
                    this.setCadence(Math.min(80, currentCadence + 2));
                    this.setResistance(Math.min(0.6, currentResistance + 0.03));
                    const newActivation = Math.min(0.7, this.activationLevel.left + 0.03);
                    this.setActivationLevel(newActivation, 'both');
                } else {
                    clearInterval(warmUpInterval);
                    console.log('Warm-up completed');
                }
            }, 1000);
        } catch (error) {
            console.error('Error in simulateWarmUp:', error);
        }
    }

    simulateIntervalTraining() {
        // High-intensity interval training simulation
        let isHighIntensity = true;
        let intervalCount = 0;
        const maxIntervals = 6;
        
        const intervalTimer = setInterval(() => {
            if (intervalCount >= maxIntervals) {
                clearInterval(intervalTimer);
                this.simulateCoolDown();
                return;
            }
            
            if (isHighIntensity) {
                // High intensity phase (30 seconds)
                this.setCadence(95);
                this.setResistance(0.8);
                this.setActivationLevel(0.9, 'both');
                setTimeout(() => {
                    isHighIntensity = false;
                }, 30000);
            } else {
                // Recovery phase (60 seconds)
                this.setCadence(70);
                this.setResistance(0.4);
                this.setActivationLevel(0.5, 'both');
                setTimeout(() => {
                    isHighIntensity = true;
                    intervalCount++;
                }, 60000);
            }
        }, 90000); // Total cycle: 90 seconds
    }

    simulateCoolDown() {
        // Simulate cycling cool-down: gradual decrease
        const coolDownInterval = setInterval(() => {
            const currentCadence = this.cyclingParams.cadence;
            const currentResistance = this.cyclingParams.resistance;
            
            if (currentCadence > 50 || currentResistance > 0.2) {
                this.setCadence(Math.max(50, currentCadence - 3));
                this.setResistance(Math.max(0.2, currentResistance - 0.03));
                this.setActivationLevel(Math.max(0.2, this.activationLevel.left - 0.03), 'both');
            } else {
                clearInterval(coolDownInterval);
            }
        }, 2000);
    }

    simulateAsymmetricPedaling() {
        console.log('Starting asymmetric pedaling simulation');
        try {
            // Simulate compensatory pedaling (e.g., after leg injury)
            this.setAsymmetryFactor(0.65); // 35% weakness in one leg
            this.setCadence(70); // Slower cadence to compensate
            this.setResistance(0.5);
            this.setActivationLevel(0.6, 'both');
            
            console.log('Asymmetric pedaling started - 35% weakness in right leg');
        } catch (error) {
            console.error('Error in simulateAsymmetricPedaling:', error);
        }
    }

    simulateUnilateralFatigue() {
        // Simulate progressive fatigue in one leg during cycling
        let fatigueLevel = 0;
        const fatigueInterval = setInterval(() => {
            fatigueLevel += 0.01;
            if (fatigueLevel > 0.5) {
                clearInterval(fatigueInterval);
                return;
            }
            
            // Apply progressive fatigue to right leg
            this.fatigueLevel.right += 0.005;
            
            // Compensation: slightly increase left leg activation
            this.setActivationLevel(this.activationLevel.left * 1.02, 'left');
        }, 1000);
    }

    simulateSteadyStateCycling(duration = 30) {
        console.log('Starting steady state cycling for', duration, 'seconds');
        try {
            // Simulate steady-state cycling
            this.setCadence(80);
            this.setResistance(0.6);
            this.setActivationLevel(0.7, 'both');
            this.setPedalingEfficiency(0.9);
            
            setTimeout(() => {
                console.log('Steady state cycling completed');
            }, duration * 1000);
        } catch (error) {
            console.error('Error in simulateSteadyStateCycling:', error);
        }
    }

    // Getters
    getCurrentData() {
        return {
            left: this.signalBuffer.left.slice(-100), // Last 100 samples each side
            right: this.signalBuffer.right.slice(-100)
        };
    }

    getStats() {
        return JSON.parse(JSON.stringify(this.stats)); // Deep copy
    }

    getSignalQuality() {
        let quality = 100;
        
        // Reduce quality based on noise
        if (this.stats.bilateral.snr < 30) quality -= 20;
        if (this.stats.bilateral.snr < 20) quality -= 30;
        
        // Reduce quality based on artifacts
        if (this.stats.bilateral.artifacts !== 'Ninguno') quality -= 25;
        
        // Reduce quality based on signal amplitude (average both sides)
        const avgRMS = (this.stats.left.rms + this.stats.right.rms) / 2;
        if (avgRMS < 0.1) quality -= 15;
        
        // Reduce quality based on asymmetry
        if (this.stats.bilateral.asymmetryLevel === 'Severa') quality -= 30;
        else if (this.stats.bilateral.asymmetryLevel === 'Moderada') quality -= 15;
        else if (this.stats.bilateral.asymmetryLevel === 'Leve') quality -= 5;
        
        return Math.max(0, quality);
    }

    // Additional bilateral-specific getters
    getAsymmetryAnalysis() {
        return {
            symmetryIndex: this.stats.bilateral.symmetryIndex,
            asymmetryLevel: this.stats.bilateral.asymmetryLevel,
            difference: this.stats.bilateral.difference,
            recommendations: this.getAsymmetryRecommendations()
        };
    }

    getAsymmetryRecommendations() {
        const level = this.stats.bilateral.asymmetryLevel;
        
        switch(level) {
            case 'Severa':
                return [
                    'Evaluación neurológica recomendada',
                    'Ejercicios de activación selectiva',
                    'Trabajo de simetría con biofeedback EMG'
                ];
            case 'Moderada':
                return [
                    'Fortalecimiento del lado más débil',
                    'Ejercicios bilaterales controlados',
                    'Monitoreo de progreso semanal'
                ];
            case 'Leve':
                return [
                    'Ejercicios de mantenimiento bilateral',
                    'Prevención de compensaciones'
                ];
            default:
                return ['Continuar con ejercicios regulares'];
        }
    }

    // Event handlers
    onDataUpdate(callback) {
        this.callbacks.onDataUpdate = callback;
    }

    onStatsUpdate(callback) {
        this.callbacks.onStatsUpdate = callback;
    }
}

// Export for use in other files
window.EMGSimulator = EMGSimulator;