class CipherApp {
    constructor() {
        this.initElements();
        this.initEvents();
        this.initChart();
    }

    initElements() {
        this.elements = {
            ciphertext: document.getElementById('ciphertext'),
            analyzeBtn: document.getElementById('analyze-btn'),
            cipherType: document.getElementById('cipher-type'),
            matrixSize: document.getElementById('matrix-size'),
            report: document.getElementById('report'),
            layers: document.getElementById('layers'),
            matrix: document.getElementById('matrix'),
            chart: document.getElementById('frequency-chart').getContext('2d')
        };
    }

    initEvents() {
        this.elements.analyzeBtn.addEventListener('click', () => this.startAnalysis());
        
        document.getElementById('load-k4').addEventListener('click', () => {
            this.elements.ciphertext.value = "OBKRUOXOGHULBSOLIFBBWFLRVQQPRNGKSSOTWTQSJQSSEKZZWATJKLUDIAWINFBNYPVTTMZFPKWGDKZXTJCDIGKUHUAUEKCAR";
            this.elements.cipherType.value = 'k4';
        });
    }

    startAnalysis() {
        const worker = new Worker('worker.js');
        
        worker.onmessage = (e) => {
            const { type, data } = e.data;
            
            switch (type) {
                case 'result':
                    this.displayResults(data);
                    break;
                case 'error':
                    this.showError(data);
                    break;
            }
            worker.terminate();
        };

        worker.postMessage({
            ciphertext: this.elements.ciphertext.value.trim(),
            options: {
                cipherType: this.elements.cipherType.value,
                matrixSize: parseInt(this.elements.matrixSize.value)
            }
        });

        this.elements.report.textContent = "Analyzing...";
    }

    displayResults(result) {
        this.elements.layers.innerHTML = '';
        
        // Display each step
        result.steps.forEach(step => {
            const layerEl = document.createElement('div');
            layerEl.className = 'layer';
            
            layerEl.innerHTML = `
                <h3>${step.method} 
                    <span class="confidence-${this.getConfidenceClass(step.confidence)}">
                        ${step.confidence}%
                    </span>
                </h3>
                <div class="result">${step.result.substring(0, 100)}...</div>
                ${step.matrix ? `<div class="matrix-preview">Matrix ${step.matrix.length}x${step.matrix[0].length}</div>` : ''}
                ${step.key ? `<div class="key">Key: ${step.key}</div>` : ''}
                <button class="details-btn">Show Details</button>
                <div class="details" style="display:none">
                    <pre>${JSON.stringify(step, null, 2)}</pre>
                </div>
            `;
            
            layerEl.querySelector('.details-btn').addEventListener('click', (e) => {
                const details = e.target.nextElementSibling;
                details.style.display = details.style.display === 'none' ? 'block' : 'none';
            });
            
            this.elements.layers.appendChild(layerEl);
        });

        // Display best guess
        this.elements.report.innerHTML = `
            <h3>🌟 Best Guess (${result.bestGuess.confidence}% confidence)</h3>
            <div class="best-result">${result.bestGuess.result}</div>
            <h4>Full Report:</h4>
            <pre>${JSON.stringify(result, null, 2)}</pre>
        `;

        // Visualize if available
        if (result.steps.some(s => s.matrix)) {
            const matrixStep = result.steps.find(s => s.matrix);
            this.renderMatrix(matrixStep.matrix);
        }
    }

    renderMatrix(matrix) {
        this.elements.matrix.innerHTML = '';
        this.elements.matrix.style.gridTemplateColumns = `repeat(${matrix[0].length}, 1fr)`;
        
        matrix.forEach(row => {
            row.forEach(cell => {
                const cellEl = document.createElement('div');
                cellEl.textContent = cell;
                this.elements.matrix.appendChild(cellEl);
            });
        });
    }

    getConfidenceClass(confidence) {
        if (confidence >= 80) return 'high';
        if (confidence >= 50) return 'medium';
        return 'low';
    }

    showError(message) {
        this.elements.report.innerHTML = `<div class="error">❌ ${message}</div>`;
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => new CipherApp());
