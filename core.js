class CipherApp {
    constructor() {
        // Инициализация состояния
        this.state = {
            currentAnalysis: null,
            history: [],
            settings: {
                deepScan: true,
                useNLP: true,
                saveResults: false
            }
        };

        // Инициализация элементов
        this.initDOM();
        this.initEvents();
        this.initWorker();
        this.initChart();
        this.updateClock();

        // Загрузка сохраненных данных
        this.loadSettings();
    }

    initDOM() {
        // Основные элементы
        this.elements = {
            appContainer: document.querySelector('.app-container'),
            ciphertext: document.getElementById('ciphertext'),
            analyzeBtn: document.getElementById('analyze-btn'),
            loadK4Btn: document.getElementById('load-k4'),
            loadZodiacBtn: document.getElementById('load-zodiac'),
            cipherPreset: document.getElementById('cipher-preset'),
            matrixView: document.getElementById('matrix-view'),
            layerContainer: document.getElementById('layer-container'),
            frequencyChart: document.getElementById('frequency-chart'),
            jsonReport: document.getElementById('json-report'),
            cpuStatus: document.getElementById('cpu-status'),
            timeStatus: document.getElementById('time-status'),
            memoryStatus: document.getElementById('memory-status')
        };

        // Элементы вкладок
        this.tabs = {
            summary: document.getElementById('summary-tab'),
            layers: document.getElementById('layers-tab'),
            visualization: document.getElementById('visualization-tab'),
            fullReport: document.getElementById('full-report-tab'),
            buttons: document.querySelectorAll('.tab-btn')
        };
    }

    initEvents() {
        // Кнопки управления
        this.elements.analyzeBtn.addEventListener('click', () => this.analyze());
        this.elements.loadK4Btn.addEventListener('click', () => this.loadSample('k4'));
        this.elements.loadZodiacBtn.addEventListener('click', () => this.loadSample('zodiac'));
        
        // Переключение вкладок
        this.tabs.buttons.forEach(btn => {
            btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
        });

        // Настройки
        document.getElementById('deep-scan').addEventListener('change', (e) => {
            this.state.settings.deepScan = e.target.checked;
            this.saveSettings();
        });

        // Другие обработчики событий...
    }

    initWorker() {
        this.worker = new Worker('worker.js');
        this.worker.onmessage = (e) => this.handleWorkerMessage(e.data);
        this.worker.onerror = (err) => this.handleWorkerError(err);
    }

    initChart() {
        this.chart = new Chart(this.elements.frequencyChart, {
            type: 'bar',
            data: { labels: [], datasets: [] },
            options: {
                responsive: true,
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    }

    analyze() {
        const text = this.elements.ciphertext.value.trim();
        if (!text) return this.showError('Please enter ciphertext');

        const preset = this.elements.cipherPreset.value;
        const requestId = Date.now();

        // Показать состояние загрузки
        this.setAnalyzingState(true);

        // Отправить задание воркеру
        this.worker.postMessage({
            id: requestId,
            type: 'ANALYZE',
            payload: {
                text,
                preset,
                options: this.state.settings
            }
        });

        // Сохранить информацию о запросе
        this.state.currentAnalysis = {
            id: requestId,
            startTime: performance.now(),
            status: 'processing'
        };
    }

    handleWorkerMessage(data) {
        if (data.type === 'PROGRESS') {
            this.updateProgress(data.message);
            return;
        }

        if (data.type === 'RESULT') {
            const analysisTime = ((performance.now() - this.state.currentAnalysis.startTime) / 1000).toFixed(2);
            this.displayResults(data.result, analysisTime);
            this.setAnalyzingState(false);
            return;
        }

        if (data.type === 'ERROR') {
            this.showError(data.message);
            this.setAnalyzingState(false);
            return;
        }
    }

    handleWorkerError(error) {
        console.error('Worker error:', error);
        this.showError('Analysis worker failed');
        this.setAnalyzingState(false);
    }

    displayResults(result, analysisTime) {
        // Обновить интерфейс с результатами
        this.updateSummaryTab(result.bestGuess, analysisTime);
        this.updateLayersTab(result.steps);
        this.updateVisualizationTab(result.visualization);
        this.updateFullReportTab(result);

        // Переключиться на вкладку сводки
        this.switchTab('summary');

        // Обновить историю
        this.state.history.unshift({
            timestamp: new Date(),
            result,
            analysisTime
        });
    }

    updateSummaryTab(bestGuess, time) {
        const summaryCard = document.querySelector('.summary-card');
        
        // Обновляем содержимое карточки
        summaryCard.querySelector('.best-guess-result').textContent = 
            `"${bestGuess.text}"`;
        
        summaryCard.querySelector('.confidence-badge').className = 
            `confidence-badge ${this.getConfidenceClass(bestGuess.confidence)}`;
        
        summaryCard.querySelector('.confidence-badge span').textContent = 
            `${bestGuess.confidence}% Confidence`;
        
        // Обновляем детали
        const detailsContainer = summaryCard.querySelector('.summary-details');
        detailsContainer.innerHTML = `
            <div class="detail-item">
                <span class="detail-label">Method:</span>
                <span class="detail-value">${bestGuess.method}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Key Found:</span>
                <span class="detail-value">${bestGuess.key || 'N/A'}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Time:</span>
                <span class="detail-value">${time}s</span>
            </div>
        `;
    }

    updateLayersTab(steps) {
        this.elements.layerContainer.innerHTML = '';
        
        steps.forEach((step, index) => {
            const layerEl = document.createElement('div');
            layerEl.className = 'layer-card';
            layerEl.innerHTML = `
                <div class="layer-header">
                    <h3>${index + 1}. ${step.method}</h3>
                    <div class="layer-confidence ${this.getConfidenceClass(step.confidence)}">
                        ${step.confidence}%
                    </div>
                </div>
                <div class="layer-result">
                    ${step.result.substring(0, 100)}${step.result.length > 100 ? '...' : ''}
                </div>
                <button class="layer-details-btn">
                    <i class="fas fa-chevron-down"></i> Details
                </button>
                <div class="layer-details" style="display:none;">
                    <pre>${JSON.stringify(step.details, null, 2)}</pre>
                </div>
            `;
            
            // Добавляем обработчик для кнопки деталей
            layerEl.querySelector('.layer-details-btn').addEventListener('click', (e) => {
                const details = e.target.nextElementSibling;
                const icon = e.target.querySelector('i');
                
                if (details.style.display === 'none') {
                    details.style.display = 'block';
                    icon.className = 'fas fa-chevron-up';
                } else {
                    details.style.display = 'none';
                    icon.className = 'fas fa-chevron-down';
                }
            });
            
            this.elements.layerContainer.appendChild(layerEl);
        });
    }

    updateVisualizationTab(data) {
        // Обновляем матрицу
        this.renderMatrix(data.matrix, data.path);
        
        // Обновляем частотный анализ
        this.updateFrequencyChart(data.frequency);
    }

    updateFullReportTab(result) {
        this.elements.jsonReport.textContent = JSON.stringify(result, null, 2);
    }

    renderMatrix(matrix, path = []) {
        this.elements.matrixView.innerHTML = '';
        
        if (!matrix || matrix.length === 0) return;
        
        // Устанавливаем правильное количество колонок
        this.elements.matrixView.style.gridTemplateColumns = `repeat(${matrix[0].length}, 1fr)`;
        
        // Заполняем матрицу
        matrix.forEach((row, rowIndex) => {
            row.forEach((cell, colIndex) => {
                const cellEl = document.createElement('div');
                cellEl.className = 'matrix-cell';
                cellEl.textContent = cell;
                
                // Подсвечиваем ячейки, которые входят в путь
                if (path.some(pos => pos[0] === rowIndex && pos[1] === colIndex)) {
                    cellEl.classList.add('highlight');
                }
                
                this.elements.matrixView.appendChild(cellEl);
            });
        });
    }

    updateFrequencyChart(freqData) {
        const labels = Object.keys(freqData);
        const values = Object.values(freqData);
        
        this.chart.data.labels = labels;
        this.chart.data.datasets = [{
            label: 'Character Frequency',
            data: values,
            backgroundColor: '#4361ee',
            borderColor: '#3a0ca3',
            borderWidth: 1
        }];
        
        this.chart.update();
    }

    switchTab(tabName) {
        // Скрыть все вкладки
        Object.values(this.tabs).forEach(tab => {
            if (tab.classList) tab.classList.remove('active');
        });
        
        // Показать выбранную вкладку
        document.getElementById(`${tabName}-tab`).classList.add('active');
        
        // Обновить активные кнопки
        this.tabs.buttons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });
    }

    setAnalyzingState(isAnalyzing) {
        const btn = this.elements.analyzeBtn;
        
        if (isAnalyzing) {
            btn.classList.add('analyzing');
            btn.disabled = true;
            this.elements.cpuStatus.textContent = 'Analyzing...';
        } else {
            btn.classList.remove('analyzing');
            btn.disabled = false;
            this.elements.cpuStatus.textContent = 'Ready';
        }
    }

    updateProgress(message) {
        this.elements.cpuStatus.textContent = message;
    }

    updateClock() {
        const now = new Date();
        const timeStr = now.toLocaleTimeString();
        this.elements.timeStatus.textContent = timeStr;
        setTimeout(() => this.updateClock(), 1000);
    }

    loadSample(type) {
        const samples = {
            k4: "OBKRUOXOGHULBSOLIFBBWFLRVQQPRNGKSSOTWTQSJQSSEKZZWATJKLUDIAWINFBNYPVTTMZFPKWGDKZXTJCDIGKUHUAUEKCAR",
            zodiac: "HER>pl^VPk|1LTG2dNp+B(#O%DWY.<*Kf)By:cM+UZGW()L#zHJ(Spp7^l8*V3pO++RK2_9M+ztjd|5FP+&4k/p8R^FlO-*dCkF>2Df#6+L@G7"
        };
        
        this.elements.ciphertext.value = samples[type];
        this.elements.cipherPreset.value = type;
    }

    showError(message) {
        // Реализация показа ошибок...
    }

    getConfidenceClass(confidence) {
        if (confidence >= 80) return 'high';
        if (confidence >= 50) return 'medium';
        return 'low';
    }

    loadSettings() {
        // Загрузка настроек из localStorage...
    }

    saveSettings() {
        // Сохранение настроек в localStorage...
    }
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    const app = new CipherApp();
});
