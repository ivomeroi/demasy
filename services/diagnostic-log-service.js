/** Persistent, low-overhead diagnostic recording for physical EMG sources. */
(function exposeDiagnosticLog(root, factory) {
    const exports = factory();
    if (typeof module !== 'undefined' && module.exports) module.exports = exports;
    if (root) Object.assign(root, exports);
})(typeof window !== 'undefined' ? window : null, function createDiagnosticLog() {
    class IndexedDbDiagnosticStorage {
        constructor(name = 'DEMASYDiagnostics', version = 1) {
            this.name = name;
            this.version = version;
            this.database = null;
        }

        initialize() {
            if (this.database) return Promise.resolve(this.database);
            return new Promise((resolve, reject) => {
                const request = indexedDB.open(this.name, this.version);
                request.onerror = () => reject(request.error);
                request.onupgradeneeded = () => {
                    const database = request.result;
                    if (!database.objectStoreNames.contains('runs')) {
                        database.createObjectStore('runs', { keyPath: 'id' });
                    }
                    if (!database.objectStoreNames.contains('chunks')) {
                        const store = database.createObjectStore('chunks', { keyPath: 'id', autoIncrement: true });
                        store.createIndex('runId', 'runId', { unique: false });
                    }
                };
                request.onsuccess = () => {
                    this.database = request.result;
                    resolve(this.database);
                };
            });
        }

        request(storeName, mode, operation) {
            return new Promise((resolve, reject) => {
                const transaction = this.database.transaction(storeName, mode);
                const request = operation(transaction.objectStore(storeName));
                let result;
                request.onsuccess = () => { result = request.result; };
                request.onerror = () => reject(request.error);
                transaction.oncomplete = () => resolve(result);
                transaction.onerror = () => reject(transaction.error);
                transaction.onabort = () => reject(transaction.error || new Error('Transacción diagnóstica abortada'));
            });
        }

        putRun(run) { return this.request('runs', 'readwrite', store => store.put(run)); }
        addChunk(chunk) { return this.request('chunks', 'readwrite', store => store.add(chunk)); }
        listRuns() { return this.request('runs', 'readonly', store => store.getAll()); }
        getChunks(runId) { return this.request('chunks', 'readonly', store => store.index('runId').getAll(runId)); }

        async clear() {
            await Promise.all([
                this.request('runs', 'readwrite', store => store.clear()),
                this.request('chunks', 'readwrite', store => store.clear())
            ]);
        }
    }

    class DiagnosticLogService {
        constructor(options = {}) {
            this.storage = options.storage || new IndexedDbDiagnosticStorage();
            this.flushIntervalMs = options.flushIntervalMs || 1000;
            this.maximumBufferedSamples = options.maximumBufferedSamples || 100;
            this.now = options.now || (() => Date.now());
            this.activeRun = null;
            this.samples = [];
            this.events = [];
            this.lastFlushAt = 0;
            this.flushPromise = null;
            this.initialized = false;
        }

        async initialize() {
            if (!this.initialized) {
                await this.storage.initialize?.();
                this.initialized = true;
            }
            return this;
        }

        beginRun(metadata = {}) {
            if (this.activeRun) {
                this.recordEvent('run-reused', metadata);
                return this.activeRun.id;
            }
            const timestamp = this.now();
            const id = `diag-${new Date(timestamp).toISOString().replace(/[:.]/g, '-')}-${Math.random().toString(36).slice(2, 8)}`;
            this.activeRun = {
                id,
                schemaVersion: 1,
                applicationVersion: typeof window !== 'undefined' ? window.DEMASY_CONFIG?.application?.version || '1.0.0' : '1.0.0',
                startedAt: new Date(timestamp).toISOString(),
                endedAt: null,
                status: 'recording',
                transport: metadata.transport || 'unknown',
                device: metadata.device || null,
                sampleCount: 0,
                eventCount: 0,
                chunkCount: 0
            };
            this.samples = [];
            this.events = [];
            this.lastFlushAt = timestamp;
            this.storage.putRun(this.clone(this.activeRun)).catch(error => console.error('No se pudo iniciar el diagnóstico:', error));
            this.recordEvent('run-started', metadata);
            return id;
        }

        ensureRun(metadata = {}) {
            if (!this.activeRun) this.beginRun(metadata);
            return this.activeRun;
        }

        recordEvent(type, details = {}) {
            const run = this.ensureRun({ trigger: 'event' });
            this.events.push({
                at: new Date(this.now()).toISOString(),
                elapsedMs: this.elapsedMs(run),
                type,
                details: this.clone(details)
            });
            this.maybeFlush();
        }

        recordSample(rawSample, calibratedSample = null, context = {}) {
            const run = this.ensureRun({ trigger: 'first-sample', transport: context.source });
            this.samples.push({
                at: new Date(this.now()).toISOString(),
                elapsedMs: this.elapsedMs(run),
                source: context.source || rawSample?.source || run.transport,
                paused: Boolean(context.paused),
                calibrationPhase: context.calibrationPhase || null,
                activeCalibrationChannels: [...(context.activeCalibrationChannels || [])],
                sensorStatus: this.clone(rawSample?.sensorStatus),
                batteryMv: this.clone(rawSample?.batteryMv),
                firmwareFrame: typeof rawSample?.raw === 'string' ? rawSample.raw : null,
                raw: this.compactSignal(rawSample, true),
                calibrated: calibratedSample ? this.compactSignal(calibratedSample, false) : null
            });
            if (this.samples.length >= this.maximumBufferedSamples) this.flush().catch(error => console.error('No se pudo guardar el bloque diagnóstico:', error));
            else this.maybeFlush();
        }

        compactSignal(sample, preferRaw = false) {
            if (!sample) return null;
            const side = value => ({
                amplitude: Number(preferRaw ? value?.rawAmplitude ?? value?.amplitude ?? 0 : value?.amplitude ?? 0),
                envelope: Number(preferRaw ? value?.rawEnvelope ?? value?.envelope ?? 0 : value?.envelope ?? 0),
                flags: Number(value?.flags || 0),
                ...(value?.calibration ? { calibration: this.clone(value.calibration) } : {})
            });
            return {
                time: Number(sample.time || 0),
                flexor: { left: side(sample.flexor?.left), right: side(sample.flexor?.right) },
                extensor: { left: side(sample.extensor?.left), right: side(sample.extensor?.right) }
            };
        }

        maybeFlush() {
            if (this.now() - this.lastFlushAt >= this.flushIntervalMs) {
                this.flush().catch(error => console.error('No se pudo guardar el diagnóstico:', error));
            }
        }

        async flush() {
            if (!this.activeRun) return;
            if (this.flushPromise) {
                await this.flushPromise;
                if (this.samples.length || this.events.length) return this.flush();
                return;
            }
            if (!this.samples.length && !this.events.length) return;
            const samples = this.samples.splice(0);
            const events = this.events.splice(0);
            const chunk = {
                runId: this.activeRun.id,
                createdAt: new Date(this.now()).toISOString(),
                samples,
                events
            };
            this.flushPromise = (async () => {
                await this.storage.addChunk(chunk);
                this.activeRun.sampleCount += samples.length;
                this.activeRun.eventCount += events.length;
                this.activeRun.chunkCount += 1;
                this.lastFlushAt = this.now();
                await this.storage.putRun(this.clone(this.activeRun));
            })();
            try {
                await this.flushPromise;
            } catch (error) {
                this.samples.unshift(...samples);
                this.events.unshift(...events);
                throw error;
            } finally {
                this.flushPromise = null;
            }
        }

        async endRun(reason = 'disconnected') {
            if (!this.activeRun) return;
            this.recordEvent('run-ended', { reason });
            await this.flush();
            this.activeRun.endedAt = new Date(this.now()).toISOString();
            this.activeRun.status = 'completed';
            await this.storage.putRun(this.clone(this.activeRun));
            this.activeRun = null;
        }

        async listRuns() {
            await this.initialize();
            if (this.activeRun) await this.flush();
            return (await this.storage.listRuns()).sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));
        }

        async exportLatest() {
            const runs = await this.listRuns();
            if (!runs.length) return null;
            const run = runs[0];
            const chunks = await this.storage.getChunks(run.id);
            const samples = chunks.flatMap(chunk => chunk.samples || []).sort((a, b) => a.elapsedMs - b.elapsedMs);
            const events = chunks.flatMap(chunk => chunk.events || []).sort((a, b) => a.elapsedMs - b.elapsedMs);
            return {
                application: 'DEMASY',
                reportType: 'hardware-diagnostics',
                schemaVersion: 1,
                exportedAt: new Date(this.now()).toISOString(),
                run,
                summary: this.summarize(run, samples, events),
                calibrationEvents: events.filter(event => event.type.startsWith('calibration-')),
                connectionEvents: events.filter(event => ['base-connection', 'sensor-status', 'source-error'].includes(event.type)),
                events,
                samples
            };
        }

        summarize(run, samples, events) {
            const start = new Date(run.startedAt).getTime();
            const end = run.endedAt ? new Date(run.endedAt).getTime() : this.now();
            const durationSeconds = Math.max(0, (end - start) / 1000);
            const activeSamples = [0, 1, 2, 3].map(index => samples.filter(sample => sample.sensorStatus?.[index]).length);
            return {
                durationSeconds,
                receivedSamples: samples.length,
                effectiveRateHz: durationSeconds > 0 ? Number((samples.length / durationSeconds).toFixed(2)) : 0,
                samplesWithSensorActive: activeSamples,
                eventCount: events.length,
                calibrationCount: events.filter(event => event.type === 'calibration-completed').length
            };
        }

        async clear() {
            if (this.activeRun) await this.endRun('cleared');
            await this.storage.clear();
        }

        getStatus() {
            return this.activeRun ? this.clone(this.activeRun) : null;
        }

        elapsedMs(run) { return Math.max(0, this.now() - new Date(run.startedAt).getTime()); }
        clone(value) { return value === undefined ? null : JSON.parse(JSON.stringify(value)); }
    }

    return { DiagnosticLogService, IndexedDbDiagnosticStorage };
});
