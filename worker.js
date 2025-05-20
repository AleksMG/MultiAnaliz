class CipherBreaker {
    constructor() {
        this.englishFreq = this._createFrequencyMap();
        this.commonWords = ["THE", "AND", "THAT", "HAVE", "WITH", "THIS"];
    }

    // Основной метод анализа
    async analyze(text, updateProgress, addLog) {
        const results = [];
        
        // 1. Проверка Base64
        await addLog('Checking for Base64 encoding...');
        const base64Result = this._testBase64(text);
        if (base64Result) {
            results.push(base64Result);
            await addLog(`Found Base64: ${base64Result.result.substring(0, 30)}...`);
        }
        await updateProgress(20);

        // 2. Анализ Цезаря
        await addLog('Starting Caesar cipher analysis...');
        const caesarResults = this._analyzeCaesar(text);
        results.push(...caesarResults);
        await addLog(`Caesar analysis complete (${caesarResults.length} variants)`);
        await updateProgress(40);

        // 3. Анализ Виженера (для текстов >15 символов)
        if (text.length > 15) {
            await addLog('Starting Vigenère analysis...');
            const vigenereResult = this._analyzeVigenere(text);
            results.push(vigenereResult);
            await addLog(`Vigenère analysis complete. Key: ${vigenereResult.details?.key || 'not found'}`);
        }
        await updateProgress(60);

        // 4. Анализ XOR
        await addLog('Starting XOR analysis...');
        const xorResults = this._analyzeXOR(text);
        results.push(...xorResults);
        await addLog(`XOR analysis complete (${xorResults.length} possible keys)`);
        await updateProgress(80);

        // 5. Проверка шаблона Kryptos K4
        if (text.includes('?') || text.includes('#')) {
            await addLog('Checking for Kryptos K4 pattern...');
            const k4Result = this._analyzeK4(text);
            if (k4Result) results.push(k4Result);
        }
        await updateProgress(100);

        return results.sort((a, b) => b.confidence - a.confidence);
    }

    // ■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■
    // ■■■■■■■■■■■■■■■■■■■■ РЕАЛЬНЫЕ МЕТОДЫ АНАЛИЗА ■■■■■■■■■■■■■■■■■■■■■■■■■■
    // ■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■

    _testBase64(text) {
        try {
            if (!/^[A-Za-z0-9+/=]+$/.test(text)) return null;
            const decoded = atob(text);
            if (this._isMeaningful(decoded)) {
                return {
                    method: "Base64 Decode",
                    result: decoded,
                    confidence: this._rateText(decoded),
                    details: {encoded: text}
                };
            }
        } catch (e) {}
        return null;
    }

    _analyzeCaesar(text) {
        const results = [];
        for (let shift = 1; shift < 26; shift++) {
            let decrypted = "";
            for (let i = 0; i < text.length; i++) {
                let char = text[i];
                if (/[A-Z]/i.test(char)) {
                    const base = char === char.toUpperCase() ? 65 : 97;
                    const code = ((char.charCodeAt(0) - base - shift + 26) % 26 + base;
                    decrypted += String.fromCharCode(code);
                } else {
                    decrypted += char;
                }
            }
            const confidence = this._rateText(decrypted);
            if (confidence > 50 || shift === 13) { // Всегда включаем ROT13
                results.push({
                    method: `Caesar Shift ${shift}`,
                    result: decrypted,
                    confidence,
                    details: {shift}
                });
            }
        }
        return results.sort((a, b) => b.confidence - a.confidence);
    }

    _analyzeVigenere(text) {
        const keyLength = this._findKeyLength(text);
        let key = '';
        
        for (let i = 0; i < keyLength; i++) {
            let segment = "";
            for (let j = i; j < text.length; j += keyLength) {
                segment += text[j];
            }
            const bestShift = this._analyzeCaesar(segment)[0].details.shift;
            key += String.fromCharCode(65 + (26 - bestShift) % 26);
        }
        
        const decrypted = this._vigenereDecrypt(text, key);
        return {
            method: "Vigenère Cipher",
            result: decrypted,
            confidence: this._rateText(decrypted),
            details: {
                key,
                keyLength,
                decryptionMethod: "Frequency analysis on each key position"
            }
        };
    }

    _analyzeXOR(text) {
        const results = [];
        // Проверяем 1-байтовые XOR ключи
        for (let key = 32; key < 127; key++) {
            let decrypted = "";
            for (let i = 0; i < text.length; i++) {
                decrypted += String.fromCharCode(text.charCodeAt(i) ^ key);
            }
            const confidence = this._rateText(decrypted);
            if (confidence > 50) {
                results.push({
                    method: `XOR (0x${key.toString(16).toUpperCase()})`,
                    result: decrypted,
                    confidence,
                    details: {key: `0x${key.toString(16).toUpperCase()}`}
                });
            }
        }
        return results.sort((a, b) => b.confidence - a.confidence);
    }

    _analyzeK4(text) {
        try {
            // 1. Замена символов
            const replaced = text.replace(/\?/g, 'F').replace(/#/g, 'H');
            
            // 2. Транспозиция 8x8
            const matrix = [];
            for (let i = 0; i < 8; i++) {
                matrix.push(replaced.substr(i * 8, 8).split(''));
            }
            
            // 3. Спиральное чтение
            const spiral = this._readSpiral(matrix);
            
            // 4. Виженер с координатным ключом
            const coordKey = this._generateCoordKey(matrix);
            const decrypted = this._vigenereDecrypt(spiral, coordKey);
            
            return {
                method: "Kryptos K4 Method",
                result: decrypted,
                confidence: this._rateText(decrypted),
                details: {
                    steps: [
                        {action: "Symbol replacement", result: replaced},
                        {action: "8x8 matrix transposition", matrix},
                        {action: "Spiral read", result: spiral},
                        {action: "Vigenère decryption", key: coordKey}
                    ]
                },
                matrix,
                highlight: this._getSpiralPath(8, 8)
            };
        } catch (e) {
            return null;
        }
    }

    // ■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■
    // ■■■■■■■■■■■■■■■■■■■■ ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ■■■■■■■■■■■■■■■■■■■■■■■■■■
    // ■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■

    _createFrequencyMap() {
        return {
            'E': 12.7, 'T': 9.1, 'A': 8.2, 'O': 7.5, 'I': 7.0, 'N': 6.7,
            'S': 6.3, 'H': 6.1, 'R': 6.0, 'D': 4.3, 'L': 4.0, 'C': 2.8,
            'U': 2.8, 'M': 2.4, 'W': 2.4, 'F': 2.2, 'G': 2.0, 'Y': 2.0,
            'P': 1.9, 'B': 1.5, 'V': 1.0, 'K': 0.8, 'J': 0.2, 'X': 0.2,
            'Q': 0.1, 'Z': 0.1
        };
    }

    _rateText(text) {
        let score = 0;
        const upper = text.toUpperCase();
        
        // Проверка общих слов
        for (const word of this.commonWords) {
            if (upper.includes(word)) score += word.length * 2;
        }
        
        // Частотный анализ
        const freq = {};
        let total = 0;
        for (const char of upper) {
            if (/[A-Z]/.test(char)) {
                freq[char] = (freq[char] || 0) + 1;
                total++;
            }
        }
        
        for (const char in freq) {
            freq[char] = (freq[char] / total) * 100;
            score += 1 - Math.abs((this.englishFreq[char] || 0) - freq[char]) / 100;
        }
        
        return Math.min(100, Math.max(0, score));
    }

    _isMeaningful(text) {
        return this._rateText(text) > 50;
    }

    _findKeyLength(text) {
        // Упрощенный метод Касиски
        const trigrams = {};
        for (let i = 0; i < text.length - 2; i++) {
            const trigram = text.substr(i, 3);
            if (!trigrams[trigram]) trigrams[trigram] = [];
            trigrams[trigram].push(i);
        }
        
        const distances = [];
        for (const trigram in trigrams) {
            if (trigrams[trigram].length > 1) {
                for (let i = 1; i < trigrams[trigram].length; i++) {
                    distances.push(trigrams[trigram][i] - trigrams[trigram][0]);
                }
            }
        }
        
        const gcd = (a, b) => b ? gcd(b, a % b) : a;
        return distances.reduce(gcd, distances[0]) || 3;
    }

    _vigenereDecrypt(text, key) {
        let result = '';
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            if (/[A-Z]/i.test(char)) {
                const base = char === char.toUpperCase() ? 65 : 97;
                const keyChar = key[i % key.length].toUpperCase();
                const shift = keyChar.charCodeAt(0) - 65;
                const code = ((char.charCodeAt(0) - base - shift + 26) % 26) + base;
                result += String.fromCharCode(code);
            } else {
                result += char;
            }
        }
        return result;
    }

    _readSpiral(matrix) {
        const result = [];
        let top = 0, bottom = matrix.length - 1;
        let left = 0, right = matrix[0].length - 1;
        
        while (top <= bottom && left <= right) {
            // Right
            for (let i = left; i <= right; i++) result.push(matrix[top][i]);
            top++;
            
            // Down
            for (let i = top; i <= bottom; i++) result.push(matrix[i][right]);
            right--;
            
            // Left
            if (top <= bottom) {
                for (let i = right; i >= left; i--) result.push(matrix[bottom][i]);
                bottom--;
            }
            
            // Up
            if (left <= right) {
                for (let i = bottom; i >= top; i--) result.push(matrix[i][left]);
                left++;
            }
        }
        
        return result.join('');
    }

    _getSpiralPath(size) {
        const path = [];
        let top = 0, bottom = size - 1;
        let left = 0, right = size - 1;
        
        while (top <= bottom && left <= right) {
            for (let i = left; i <= right; i++) path.push([top, i]);
            top++;
            
            for (let i = top; i <= bottom; i++) path.push([i, right]);
            right--;
            
            if (top <= bottom) {
                for (let i = right; i >= left; i--) path.push([bottom, i]);
                bottom--;
            }
            
            if (left <= right) {
                for (let i = bottom; i >= top; i--) path.push([i, left]);
                left++;
            }
        }
        
        return path;
    }

    _generateCoordKey(matrix) {
        let key = '';
        for (let i = 0; i < matrix.length; i++) {
            for (let j = 0; j < matrix[i].length; j++) {
                if ((i + j) % 3 === 0) {
                    key += String.fromCharCode(65 + (i * matrix.length + j) % 26);
                }
            }
        }
        return key;
    }
}

// Worker интерфейс
const breaker = new CipherBreaker();

self.onmessage = async function(e) {
    const { type, text } = e.data;
    
    const updateProgress = (percent) => {
        self.postMessage({ type: 'PROGRESS', data: percent });
    };
    
    const addLog = (message) => {
        self.postMessage({ type: 'LOG', data: message });
    };
    
    if (type === 'ANALYZE') {
        try {
            const results = await breaker.analyze(text, updateProgress, addLog);
            
            // Отправляем топ-5 результатов
            for (const result of results.slice(0, 5)) {
                self.postMessage({ type: 'RESULT', data: result });
            }
            
            self.postMessage({ type: 'COMPLETE' });
        } catch (error) {
            self.postMessage({ type: 'ERROR', data: error.message });
        }
    }
};
