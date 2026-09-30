(function registerLiveChartControllerMethods() {
    const AppController = window.KinesioEMGApp;
    if (!AppController) throw new Error('KinesioEMGApp debe cargarse antes que LiveChartControllerMethods');

    class LiveChartControllerMethods {
    initializeChart() {
        const canvas = document.getElementById('emg-chart');
        if (!canvas) throw new Error('Chart canvas not found');

        const ctx = canvas.getContext('2d');
        
        // Initialize with empty data
        const initialData = Array(100).fill().map((_, i) => ({
            x: i * 0.01,
            y: 0
        }));

        const recordingMarkerPlugin = {
            id: 'recordingMarkers',
            afterDraw: chart => {
                if (!this.recordingMarkers.length || !chart.chartArea) return;
                const { ctx: chartContext, chartArea, scales } = chart;
                chartContext.save();
                this.recordingMarkers.forEach(marker => {
                    const x = scales.x.getPixelForValue(marker.time);
                    if (x < chartArea.left || x > chartArea.right) return;
                    chartContext.strokeStyle = marker.type === 'pause' ? '#b45309' : '#047857';
                    chartContext.fillStyle = chartContext.strokeStyle;
                    chartContext.setLineDash([5, 4]);
                    chartContext.beginPath();
                    chartContext.moveTo(x, chartArea.top);
                    chartContext.lineTo(x, chartArea.bottom);
                    chartContext.stroke();
                    chartContext.setLineDash([]);
                    chartContext.font = '11px sans-serif';
                    chartContext.fillText(marker.type === 'pause' ? 'Pausa' : 'Reanudación', x + 4, chartArea.top + 13);
                });
                chartContext.restore();
            }
        };
        this.emgChart = new Chart(ctx, {
            type: 'line',
            data: {
                datasets: [{
                    label: 'EMG Lado Izquierdo',
                    data: [...initialData],
                    borderColor: 'rgba(37, 99, 235, 0.32)',
                    backgroundColor: 'rgba(37, 99, 235, 0.04)',
                    borderWidth: 1,
                    pointRadius: 0,
                    pointHoverRadius: 0,
                    tension: 0.1,
                    fill: false,
                    hidden: true
                }, {
                    label: 'EMG Lado Derecho',
                    data: [...initialData],
                    borderColor: 'rgba(220, 38, 38, 0.30)',
                    backgroundColor: 'rgba(220, 38, 38, 0.04)',
                    borderWidth: 1,
                    pointRadius: 0,
                    pointHoverRadius: 0,
                    tension: 0.1,
                    fill: false,
                    hidden: true
                }, {
                    label: 'Envolvente izquierda',
                    data: [...initialData],
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 3,
                    pointRadius: 0,
                    pointHoverRadius: 0,
                    tension: 0.35,
                    fill: 'origin'
                }, {
                    label: 'Envolvente derecha',
                    data: [...initialData],
                    borderColor: '#f59e0b',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    borderWidth: 3,
                    pointRadius: 0,
                    pointHoverRadius: 0,
                    tension: 0.35,
                    fill: 'origin'
                }]
            },
            plugins: [recordingMarkerPlugin],
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                interaction: {
                    intersect: false,
                    mode: 'nearest'
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            boxWidth: 12,
                            padding: 20
                        }
                    },
                    tooltip: {
                        enabled: true,
                        mode: 'nearest',
                        intersect: false,
                        callbacks: {
                            title: function(tooltipItems) {
                                return `Tiempo: ${tooltipItems[0].parsed.x.toFixed(2)} s`;
                            },
                            label: function(context) {
                                return `${context.dataset.label}: ${context.parsed.y.toFixed(1)} mV`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'linear',
                        position: 'bottom',
                        title: {
                            display: true,
                            text: 'Tiempo (segundos)'
                        },
                        min: 0,
                        max: this.chartConfig.timeWindow,
                        ticks: {
                            maxTicksLimit: 10
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Amplitud (mV)'
                        },
                        min: this.chartConfig.fixedYMin,
                        max: this.chartConfig.fixedYMax,
                        ticks: {
                            maxTicksLimit: 8
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    }
                }
            }
        });
        const extensorCanvas = document.getElementById('extensor-chart');
        if (!extensorCanvas) throw new Error('Extensor chart canvas not found');
        this.extensorChart = new Chart(extensorCanvas.getContext('2d'), {
            type: 'line',
            data: { datasets: this.emgChart.data.datasets.map(dataset => ({
                label: dataset.label, data: [...initialData], borderColor: dataset.borderColor,
                backgroundColor: dataset.backgroundColor, borderWidth: dataset.borderWidth,
                pointRadius: 0, pointHoverRadius: 0, tension: dataset.tension, fill: dataset.fill,
                hidden: dataset.hidden
            })) },
            plugins: [recordingMarkerPlugin],
            options: this.createLiveChartOptions()
        });
        this.applyDisplayPreferences(this.displayPreferences);
    }

    createLiveChartOptions() {
        return {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            interaction: { intersect: false, mode: 'nearest' },
            plugins: {
                legend: { display: true, position: 'top', labels: { boxWidth: 12, padding: 20 } },
                tooltip: {
                    enabled: true,
                    mode: 'nearest',
                    intersect: false,
                    callbacks: {
                        title: items => `Tiempo: ${items[0].parsed.x.toFixed(2)} s`,
                        label: context => `${context.dataset.label}: ${context.parsed.y.toFixed(1)} mV`
                    }
                }
            },
            scales: {
                x: {
                    type: 'linear', position: 'bottom', min: 0, max: this.chartConfig.timeWindow,
                    title: { display: true, text: 'Tiempo (segundos)' },
                    ticks: { maxTicksLimit: 10 }, grid: { color: 'rgba(0, 0, 0, 0.1)' }
                },
                y: {
                    min: this.chartConfig.fixedYMin, max: this.chartConfig.fixedYMax,
                    title: { display: true, text: 'Amplitud (mV)' },
                    ticks: { maxTicksLimit: 8 }, grid: { color: 'rgba(0, 0, 0, 0.1)' }
                }
            }
        };
    }

    applyDisplayPreferences(preferences = {}) {
        this.displayPreferences = { ...(this.displayPreferences || {}), ...preferences };
        this.chartConfig.timeWindow = Number(this.displayPreferences.chartWindowSeconds || 1);
        const label = document.getElementById('chart-window-label');
        if (label) label.textContent = `Ventana temporal: ${this.chartConfig.timeWindow} s`;
        if (!this.emgChart) return;
        const fixed = this.displayPreferences.chartScaleMode !== 'auto';
        this.getLiveCharts().forEach(chart => {
            const range = this.getChartYRange(chart);
            chart.options.scales.y.min = fixed ? -range : undefined;
            chart.options.scales.y.max = fixed ? range : undefined;
            chart.data.datasets[0].hidden = this.displayPreferences.showRawSignal !== true || this.displayPreferences.showLeftSignal === false;
            chart.data.datasets[1].hidden = this.displayPreferences.showRawSignal !== true || this.displayPreferences.showRightSignal === false;
            chart.data.datasets[2].hidden = this.displayPreferences.showRms === false || this.displayPreferences.showLeftSignal === false;
            chart.data.datasets[3].hidden = this.displayPreferences.showRms === false || this.displayPreferences.showRightSignal === false;
            chart.options.scales.x.max = this.chartConfig.timeWindow;
            chart.update('none');
        });
    }

    updateChartMode() {
        if (!this.emgChart) return;

        const isSerial = this.signalSource === 'serial';
        const isBluetooth = this.signalSource === 'bluetooth';
        const isExternal = isSerial || isBluetooth;
        const yRange = isExternal ? this.chartConfig.externalYRange : this.chartConfig.simulatorYRange;
        this.chartConfig.fixedYMin = -yRange;
        this.chartConfig.fixedYMax = yRange;
        this.chartConfig.calibratedYRanges = { flexor: null, extensor: null };
        this.getLiveCharts().forEach(chart => {
            chart.data.datasets[0].borderColor = isExternal ? 'rgba(37, 99, 235, 0.32)' : '#2563eb';
            chart.data.datasets[0].borderWidth = isExternal ? 1 : 2;
            chart.data.datasets[1].borderColor = isExternal ? 'rgba(220, 38, 38, 0.30)' : '#dc2626';
            chart.data.datasets[1].borderWidth = isExternal ? 1 : 2;
            chart.data.datasets[0].label = isExternal ? 'Señal izquierda ESP32' : 'EMG lado izquierdo';
            chart.data.datasets[1].label = isExternal ? 'Señal derecha ESP32' : 'EMG lado derecho';
            chart.data.datasets[2].label = isExternal ? 'Actividad corregida izquierda (×2,5)' : 'Envolvente izquierda';
            chart.data.datasets[3].label = isExternal ? 'Actividad corregida derecha (×2,5)' : 'Envolvente derecha';
        });
        if (this.envelopeDisplaySource !== this.signalSource) {
            this.envelopeDisplaySource = this.signalSource;
            this.resetEnvelopeDisplay();
        }
        this.applyDisplayPreferences(this.displayPreferences);
    }

    }

    for (const method of Object.getOwnPropertyNames(LiveChartControllerMethods.prototype)) {
        if (method === 'constructor') continue;
        Object.defineProperty(
            AppController.prototype,
            method,
            Object.getOwnPropertyDescriptor(LiveChartControllerMethods.prototype, method)
        );
    }
}());
