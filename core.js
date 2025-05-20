class CipherApp {
    constructor() {
        this.worker = new Worker('worker.js');
        this.currentId = 0;
        this.init();
    }

    init() {
        this.elements = {
            ciphertext: document.getElementById('ciphertext'),
            analyzeBtn: document.getElementById('analyze-btn'),
            results: document.getElementById('results')
        };

        this.elements.analyzeBtn.addEventListener('click', () => this.analyze());
        
        this.worker.onmessage = (e) => {
            if (e.data.id !== this.currentId) return;
            
            if (e.data.error) {
                this.showError(e.data.error);
            } else {
                this.displayResults(e.data.results);
            }
        };
    }

    analyze() {
        const text = this.elements.ciphertext.value.trim();
        if (!text) return alert('Please enter ciphertext!');
        
        this.currentId = Date.now();
        this.elements.results.innerHTML = '<p>Analyzing...</p>';
        
        this.worker.postMessage({
            id: this.currentId,
            text
        });
    }

    displayResults(results) {
        if (!results || results.length === 0) {
            this.elements.results.innerHTML = '<p>No meaningful results found</p>';
            return;
        }

        let html = '';
        
        // Best result
        const best = results[0];
        html += `
            <div class="result-section">
                <h3>Best Guess <span class="confidence">${Math.round(best.confidence)}%</span></h3>
                <div class="decrypted">${best.result}</div>
                <p><strong>Method:</strong> ${best.method}</p>
                ${best.details.key ? `<p><strong>Key:</strong> ${best.details.key}</p>` : ''}
            </div>
        `;

        // For K4 show matrix if available
        if (best.method === "Kryptos K4 Method" && best.details.steps[1]?.matrix) {
            html += `<div class="result-section">
                <h3>Transposition Matrix</h3>
                <div class="matrix">`;
            
            const matrix = best.details.steps[1].matrix;
            for (let i = 0; i < 8; i++) {
                html += `<div class="matrix-row">`;
                for (let j = 0; j < 8; j++) {
                    const cell = matrix[i][j] || ' ';
                    html += `<div class="matrix-cell">${cell}</div>`;
                }
                html += `</div>`;
            }
            
            html += `</div></div>`;
        }

        // All possible methods
        html += `<div class="result-section">
            <h3>All Attempted Methods</h3>
            <table>
                <tr>
                    <th>Method</th>
                    <th>Confidence</th>
                    <th>Result Preview</th>
                </tr>`;
        
        results.slice(0, 10).forEach(res => {
            html += `
                <tr>
                    <td>${res.method}</td>
                    <td>${Math.round(res.confidence)}%</td>
                    <td>${res.result.substring(0, 30)}${res.result.length > 30 ? '...' : ''}</td>
                </tr>`;
        });
        
        html += `</table></div>`;
        
        // Analysis details
        html += `<div class="result-section">
            <h3>Analysis Details</h3>
            <p><strong>Possible cipher types detected:</strong> ${results.map(r => r.method.split(' ')[0]).filter((v,i,a) => a.indexOf(v) === i).join(', ')}</p>
            <p><strong>Recommended decryption method:</strong> ${best.method}</p>
            ${best.details.decryptionMethod ? `<p>${best.details.decryptionMethod}</p>` : ''}
        </div>`;
        
        this.elements.results.innerHTML = html;
    }

    showError(message) {
        this.elements.results.innerHTML = `
            <div class="error">
                <p>Analysis failed:</p>
                <p>${message}</p>
            </div>
        `;
    }
}

// Initialize
new CipherApp();
