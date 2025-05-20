class CipherApp {
    constructor() {
        this.worker = new Worker('worker.js');
        this.currentAnalysis = null;
        this.initUI();
        this.initEvents();
    }

    initUI() {
        // Инициализация всех элементов интерфейса
        this.elements = {
            // Input
            cipherInput: document.getElementById('ciphertext'),
            cipherType: document.getElementById('cipher-type'),
            
            // Controls
            analyzeBtn: document.getElementById('analyze-btn'),
            benchmarkBtn: document.getElementById('benchmark-btn'),
            deepScan: document.getElementById('deep-scan'),
            useNLP: document.getElementById('use-nlp'),
            
            // Results
            resultTabs: document.getElementById('result-tabs'),
            summaryTab: document.getElementById('summary-tab'),
            layersTab: document.getElementById('layers-tab'),
            visualizationTab: document.getElementById('visualization-tab'),
            fullReportTab: document.getElementById('full-report-tab'),
            
            // Visualization
            matrixView: document.getElementById('matrix-view'),
            freqChart: new Chart(document.getElementById('freq-chart'), {
                type: 'bar',
                data: { labels: [], datasets: [] },
                options: { responsive: true }
            }),
            
            // Status
            statusBar: document.getElementById('status-bar'),
            progressBar: document.getElementById('progress-bar')
        };
    }

    initEvents() {
        // Основные кнопки
        this.elements.analyzeBtn.addEventListener('click', () => this.startAnalysis());
        this.elements.benchmarkBtn.addEventListener('click', () => this.runBenchmark());
        
        // Вкладки результатов
        this.elements.resultTabs.addEventListener('click', (e) => {
            if (e.target.classList.contains('tab-btn')) {
                this.switchTab(e.target.dataset.tab);
            }
        });
        
        // Обработчик сообщений от Worker
        this.worker.onmessage = (e) => this.handleWorkerMessage(e.data);
    }

    startAnalysis() {
        const text = this.elements.cipherInput.value.trim();
        if (!text) return this.showStatus('Please enter ciphertext', 'error');
        
        const cipherType = this.elements.cipherType.value;
        const options = {
            deepScan: this.elements.deepScan.checked,
            useNLP: this.elements.useNLP.checked
        };
        
        this.currentAnalysis = {
            id: Date.now(),
            type: cipherType,
            startTime: performance.now()
        };
        
        this.showStatus('Analyzing...', 'processing');
        this.updateProgress(0);
        
        this.worker.postMessage({
            id: this.currentAnalysis.id,
            type: 'ANALYZE',
            payload: { cipherType, text, options }
        });
    }

    handleWorkerMessage(data) {
        if (data.id !== this.currentAnalysis?.id) return;
        
        if (data.type === 'PROGRESS') {
            this.updateProgress(data.value);
            this.showStatus(data.message, 'processing');
            return;
        }
        
        if (data.type === 'RESULT') {
            const analysisTime = ((performance.now() - this.currentAnalysis.startTime) / 1000).toFixed(2);
            this.displayResults(data.result, analysisTime);
            this.showStatus(`Analysis completed in ${analysisTime}s`, 'success');
            return;
        }
        
        if (data.type === 'ERROR') {
            this.showStatus(data.error, 'error');
            console.error('Worker error:', data.error);
        }
    }

    displayResults(result, analysisTime) {
        // Очищаем предыдущие результаты
        this.clearResults();
        
        // Обновляем все вкладки
        this.updateSummaryTab(result, analysisTime);
        this.updateLayersTab(result.steps || []);
        this.updateVisualizationTab(result.visualization || {});
        this.updateFullReportTab(result);
        
        // Показываем вкладку с суммарными результатами
        this.switchTab('summary');
    }

    updateSummaryTab(result, time) {
        let content;
        
        if (result.bestGuess) {
            content = `
                <div class="best-guess">
                    <h3>Best Guess</h3>
                    <div class="confidence ${this.getConfidenceClass(result.confidence)}">
                        ${result.confidence}% confidence
                    </div>
                    <div class="result-text">${result.bestGuess}</div>
                    ${result.key ? `<div class="cipher-key">Key: ${result.key}</div>` : ''}
                    <div class="analysis-time">Time: ${time}s</div>
                </div>
            `;
        } else if (Array.isArray(result)) {
            content = `
                <h3>Top Results</h3>
                <div class="top-results">
                    ${result.slice(0, 5).map(res => `
                        <div class="result-item">
                            <div class="result-meta">
                                ${res.shift ? `Shift: ${res.shift}` : ''}
                                ${res.key ? `Key: ${res.key}` : ''}
                                <span class="score">Score: ${res.score.toFixed(1)}</span>
                            </div>
                            <div class="result-text">${res.decrypted || res.text}</div>
                        </div>
                    `).join('')}
                </div>
            `;
        }
        
        this.elements.summaryTab.innerHTML = content;
    }

    // ... (остальные методы updateLayersTab, updateVisualizationTab и т.д.)

    switchTab(tabName) {
        // Скрываем все вкладки
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Показываем нужную вкладку
        document.getElementById(`${tabName}-tab`).classList.add('active');
        
        // Обновляем активную кнопку
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });
    }

    showStatus(message, type = 'info') {
        this.elements.statusBar.textContent = message;
        this.elements.statusBar.className = `status-bar ${type}`;
    }

    updateProgress(value) {
        this.elements.progressBar.style.width = `${value * 100}%`;
    }

    getConfidenceClass(confidence) {
        if (confidence >= 80) return 'high';
        if (confidence >= 50) return 'medium';
        return 'low';
    }
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => new CipherApp());
