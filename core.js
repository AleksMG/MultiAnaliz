// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    const analyzeBtn = document.getElementById('analyze-btn');
    analyzeBtn.addEventListener('click', startAnalysis);
});

// Основная функция анализа
async function startAnalysis() {
    const ciphertext = document.getElementById('ciphertext').value.trim();
    if (!ciphertext) return alert('Please enter ciphertext!');

    const deepScan = document.getElementById('deep-scan').checked;
    const useNLP = document.getElementById('use-nlp').checked;

    // Запуск Web Worker для тяжелых вычислений
    const worker = new Worker('worker.js');
    worker.postMessage({
        ciphertext,
        options: { deepScan, useNLP }
    });

    worker.onmessage = (e) => {
        const { type, data } = e.data;
        
        if (type === 'progress') {
            updateProgress(data);
        } else if (type === 'result') {
            displayResults(data);
        }
    };
}

// Отображение результатов
function displayResults(result) {
    const layersDiv = document.getElementById('layers');
    layersDiv.innerHTML = '';
    
    result.layers.forEach(layer => {
        const layerEl = document.createElement('div');
        layerEl.className = 'layer';
        layerEl.innerHTML = `
            <h3>${layer.method} (confidence: <span class="confidence-${getConfidenceClass(layer.confidence)}">${layer.confidence}%</span>)</h3>
            <p>${layer.result.substring(0, 100)}...</p>
            <details>
                <summary>Details</summary>
                <pre>${JSON.stringify(layer.details, null, 2)}</pre>
            </details>
        `;
        layersDiv.appendChild(layerEl);
    });

    document.getElementById('report').textContent = JSON.stringify(result, null, 2);
    renderMatrix(result.matrix);
}

// Вспомогательные функции
function getConfidenceClass(confidence) {
    if (confidence > 80) return 'high';
    if (confidence > 50) return 'medium';
    return 'low';
}

function renderMatrix(matrix) {
    const matrixDiv = document.getElementById('matrix');
    matrixDiv.innerHTML = '';
    
    if (!matrix) return;
    
    const table = document.createElement('table');
    matrix.forEach(row => {
        const tr = document.createElement('tr');
        row.forEach(cell => {
            const td = document.createElement('td');
            td.textContent = cell;
            tr.appendChild(td);
        });
        table.appendChild(tr);
    });
    
    matrixDiv.appendChild(table);
}
