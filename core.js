class CipherApp {
    constructor() {
        this.worker = new Worker('worker.js');
        this.initElements();
        this.initEvents();
        this.resetState();
    }

    initElements() {
        this.elements = {
            ciphertext: document.getElementById('ciphertext'),
            analyzeBtn: document.getElementById('analyze-btn'),
            progressBar: document.getElementById('progress-bar'),
            status: document.getElementById('status'),
            analysisLog: document.getElementById('analysis-log'),
            results: document.getElementById('results')
        };
    }

    initEvents() {
        this.elements.analyzeBtn.addEventListener('click', () => this.startAnalysis());
        
        this.worker.onmessage = (e) => {
            const { type, data } = e.data;
            
            switch (type) {
                case 'PROGRESS':
                    this.updateProgress(data);
                    break;
                case 'LOG':
                    this.addLogEntry(data);
                    break;
                case 'RESULT':
                    this.displayResult(data);
                    break;
                case 'ERROR':
                    this.showError(data);
                    break;
                case 'COMPLETE':
                    this.analysisComplete();
                    break;
            }
        };
    }

    resetState() {
        this.elements.progressBar.style.width = '0%';
        this.elements.status.textContent = 'Ready';
        this.elements.analyzeBtn.disabled = false;
        this.elements.analysisLog.innerHTML = '';
        this.elements.results.innerHTML = '';
    }

    startAnalysis() {
        const text = this.elements.ciphertext.value.trim();
        if (!text) return this.showError('Please enter ciphertext');
        
        this.resetState();
        this.elements.analyzeBtn.disabled = true;
        this.elements.status.textContent = 'Starting analysis...';
        
        this.worker.postMessage({
            type: 'ANALYZE',
            text
        });
    }

    updateProgress(percent) {
        this.elements.progressBar.style.width = `${percent}%`;
        this.elements.status.textContent = `Analyzing... ${Math.round(percent)}%`;
    }

    addLogEntry(message) {
        const entry = document.createElement('div');
        entry.className = 'log-entry';
        entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        this.elements.analysisLog.appendChild(entry);
        this.elements.analysisLog.scrollTop = this.elements.analysisLog.scrollHeight;
    }

    displayResult(result) {
        const resultEl = document.createElement('div');
        resultEl.className = 'result-section';
        
        let content = `
            <h3>${result.method} <span class="confidence">${Math.round(result.confidence)}% confidence</span></h3>
            <div class="result">${result.result}</div>
        `;
        
        if (result.details) {
            content += `<div class="details"><pre>${JSON.stringify(result.details, null, 2)}</pre></div>`;
        }
        
        if (result.matrix) {
            content += `<h4>Transposition Matrix</h4><div class="matrix">`;
            for (let i = 0; i < result.matrix.length; i++) {
                content += `<div class="matrix-row">`;
                for (let j = 0; j < result.matrix[i].length; j++) {
                    const cell = result.matrix[i][j] || ' ';
                    const highlight = result.highlight?.some(pos => pos[0] === i && pos[1] === j) ? 'highlight' : '';
                    content += `<div class="matrix-cell ${highlight}">${cell}</div>`;
                }
                content += `</div>`;
            }
            content += `</div>`;
        }
        
        resultEl.innerHTML = content;
        this.elements.results.appendChild(resultEl);
    }

    analysisComplete() {
        this.elements.status.textContent = 'Analysis complete';
        this.elements.analyzeBtn.disabled = false;
        this.addLogEntry('Analysis completed successfully');
    }

    showError(message) {
        this.elements.status.textContent = `Error: ${message}`;
        this.elements.status.style.color = 'red';
        this.elements.analyzeBtn.disabled = false;
        this.addLogEntry(`ERROR: ${message}`);
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => new CipherApp());
