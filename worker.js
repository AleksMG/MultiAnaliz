// ====================== CORE CIPHER METHODS ======================
const CipherCore = {
    // ======== BASE64 & BINARY ========
    tryBase64(text) {
        if (!/^[A-Za-z0-9+/=]+$/.test(text)) return null;
        try {
            const decoded = atob(text);
            return decoded.length > 0 ? decoded : null;
        } catch (e) {
            return null;
        }
    },

    // ======== CAESAR & ROT ========
    caesarDecrypt(text, shift, alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
        return text.split('').map(c => {
            const idx = alphabet.indexOf(c.toUpperCase());
            if (idx === -1) return c;
            const newIdx = (idx - shift + alphabet.length) % alphabet.length;
            return alphabet[newIdx];
        }).join('');
    },

    // ======== VIGENÈRE ========
    vigenereDecrypt(text, key, alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
        return text.split('').map((c, i) => {
            const textIdx = alphabet.indexOf(c.toUpperCase());
            if (textIdx === -1) return c;
            const keyChar = key[i % key.length].toUpperCase();
            const keyIdx = alphabet.indexOf(keyChar);
            return alphabet[(textIdx - keyIdx + alphabet.length) % alphabet.length];
        }).join('');
    },

    // ======== XOR ========
    xorDecrypt(text, key) {
        let result = '';
        for (let i = 0; i < text.length; i++) {
            const charCode = text.charCodeAt(i) ^ key.charCodeAt(i % key.length);
            result += String.fromCharCode(charCode);
        }
        return result;
    },

    // ======== TRANSPOSITION ========
    createMatrix(text, rows, cols) {
        const matrix = [];
        for (let i = 0; i < rows; i++) {
            matrix.push(text.substr(i * cols, cols).split(''));
        }
        return matrix;
    },

    readColumnar(matrix, key) {
        const order = key.split('').map((c, i) => ({ c, i }))
            .sort((a, b) => a.c.localeCompare(b.c))
            .map(x => x.i);
        
        let result = '';
        for (const col of order) {
            for (let row = 0; row < matrix.length; row++) {
                if (matrix[row][col]) result += matrix[row][col];
            }
        }
        return result;
    },

    // ======== POLYBIUS ========
    polybiusDecrypt(text, square = [
        ['A', 'B', 'C', 'D', 'E'],
        ['F', 'G', 'H', 'I', 'K'],
        ['L', 'M', 'N', 'O', 'P'],
        ['Q', 'R', 'S', 'T', 'U'],
        ['V', 'W', 'X', 'Y', 'Z']
    ]) {
        const coords = text.match(/.{1,2}/g) || [];
        return coords.map(coord => {
            const [row, col] = coord.split('').map(Number);
            return square[row - 1]?.[col - 1] || '?';
        }).join('');
    },

    // ======== HILL CIPHER ========
    hillDecrypt(text, keyMatrix) {
        // Реализация матричного дешифрования
        const n = keyMatrix.length;
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const vector = text.split('').map(c => chars.indexOf(c));
        let result = '';
        
        for (let i = 0; i < vector.length; i += n) {
            const block = vector.slice(i, i + n);
            const decrypted = keyMatrix.map(row => 
                row.reduce((sum, val, j) => sum + val * block[j], 0) % 26
            );
            result += decrypted.map(idx => chars[idx]).join('');
        }
        return result;
    }
};

// ====================== ANALYSIS METHODS ======================
const CipherAnalysis = {
    // ======== KRYPTOS K4 SPECIAL ========
    analyzeK4(text) {
        const steps = [];
        
        // 1. Symbol replacement
        const replaced = text.replace(/\?/g, 'F').replace(/#/g, 'H');
        steps.push({
            method: "K4 Symbol Replacement",
            result: replaced,
            confidence: 85
        });

        // 2. 8x8 Transposition
        const matrix = CipherCore.createMatrix(replaced, 8, 8);
        const spiral = this.readSpiral(matrix);
        steps.push({
            method: "Spiral Transposition",
            result: spiral,
            matrix,
            confidence: 75
        });

        // 3. Vigenère with coordinate key
        const coordKey = this.generateCoordKey(matrix);
        const vigenereDecrypted = CipherCore.vigenereDecrypt(spiral, coordKey);
        steps.push({
            method: "Vigenère with Coordinate Key",
            result: vigenereDecrypted,
            key: coordKey,
            confidence: 70
        });

        return {
            steps,
            decrypted: vigenereDecrypted,
            bestGuess: steps[steps.length - 1]
        };
    },

    // ======== AUTOMATIC ANALYSIS ========
    fullAnalysis(text) {
        const steps = [];
        
        // 1. Check encodings
        const base64 = CipherCore.tryBase64(text);
        if (base64) {
            steps.push({
                method: "Base64 Decode",
                result: base64,
                confidence: 90
            });
        }

        // 2. Frequency analysis
        const freqAnalysis = this.frequencyAnalysis(text);
        steps.push(freqAnalysis);

        // 3. Caesar brute force
        const caesarResults = this.caesarBruteForce(text);
        steps.push(...caesarResults);

        // 4. Vigenère analysis
        if (text.length > 20) {
            const vigenereResult = this.vigenereAutoSolve(text);
            steps.push(vigenereResult);
        }

        // 5. XOR analysis
        const xorResult = this.xorAutoAnalyze(text);
        steps.push(xorResult);

        return {
            steps,
            bestGuess: this.selectBestResult(steps)
        };
    },

    // ======== UTILITY METHODS ========
    selectBestResult(steps) {
        return steps.reduce((best, current) => 
            (current.confidence > (best?.confidence || 0)) ? current : best
        );
    },

    englishScore(text) {
        const commonWords = ['THE', 'AND', 'FOR', 'ARE', 'YOU'];
        return commonWords.reduce((score, word) => 
            score + (text.includes(word) ? word.length : 0), 0
        );
    }
};

// ====================== WORKER INTERFACE ======================
self.onmessage = function(e) {
    const { ciphertext, options } = e.data;
    
    try {
        let result;
        if (options.cipherType === 'k4') {
            result = CipherAnalysis.analyzeK4(ciphertext);
        } else {
            result = CipherAnalysis.fullAnalysis(ciphertext);
        }
        
        self.postMessage({ 
            type: 'result', 
            data: result 
        });
    } catch (error) {
        self.postMessage({ 
            type: 'error', 
            data: error.message 
        });
    }
};
