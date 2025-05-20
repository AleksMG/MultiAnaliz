class CipherBreaker {
    constructor() {
        this.englishFreq = {
            'E': 12.7, 'T': 9.1, 'A': 8.2, 'O': 7.5, 'I': 7.0, 'N': 6.7,
            'S': 6.3, 'H': 6.1, 'R': 6.0, 'D': 4.3, 'L': 4.0, 'C': 2.8,
            'U': 2.8, 'M': 2.4, 'W': 2.4, 'F': 2.2, 'G': 2.0, 'Y': 2.0,
            'P': 1.9, 'B': 1.5, 'V': 1.0, 'K': 0.8, 'J': 0.2, 'X': 0.2,
            'Q': 0.1, 'Z': 0.1
        };
        this.commonWords = ["THE", "AND", "THAT", "HAVE", "WITH", "THIS"];
    }

    analyze(text) {
        const results = [];
        
        // 1. Check if it's Base64 encoded
        if (this.isBase64(text)) {
            const decoded = atob(text);
            if (this.isMeaningful(decoded)) {
                results.push({
                    method: "Base64 Decode",
                    result: decoded,
                    confidence: this.rateText(decoded),
                    details: {encoded: text}
                });
            }
        }

        // 2. Caesar cipher analysis
        results.push(...this.analyzeCaesar(text));

        // 3. Vigenère analysis (for longer texts)
        if (text.length > 15) {
            results.push(this.analyzeVigenere(text));
        }

        // 4. XOR analysis
        results.push(...this.analyzeXOR(text));

        // 5. Kryptos K4 specific pattern
        if (text.includes('?') || text.includes('#')) {
            const k4result = this.analyzeK4(text);
            if (k4result) results.push(k4result);
        }

        // Sort by confidence
        return results.sort((a, b) => b.confidence - a.confidence);
    }

    analyzeCaesar(text) {
        const results = [];
        for (let shift = 1; shift < 26; shift++) {
            let decrypted = "";
            for (let i = 0; i < text.length; i++) {
                let char = text[i];
                if (/[A-Z]/i.test(char)) {
                    const base = char === char.toUpperCase() ? 65 : 97;
                    const code = ((char.charCodeAt(0) - base - shift + 26) % 26) + base;
                    decrypted += String.fromCharCode(code);
                } else {
                    decrypted += char;
                }
            }
            const confidence = this.rateText(decrypted);
            results.push({
                method: `Caesar Shift ${shift}`,
                result: decrypted,
                confidence,
                details: {shift}
            });
        }
        return results;
    }

    analyzeVigenere(text) {
        // Simplified Kasiski examination
        const keyLength = this.findKeyLength(text);
        let key = "";
        
        // Find each key character
        for (let i = 0; i < keyLength; i++) {
            let segment = "";
            for (let j = i; j < text.length; j += keyLength) {
                segment += text[j];
            }
            
            // Find best shift for this segment
            const bestShift = this.analyzeCaesar(segment)[0].details.shift;
            key += String.fromCharCode(65 + (26 - bestShift) % 26);
        }
        
        // Decrypt with found key
        let decrypted = "";
        for (let i = 0; i < text.length; i++) {
            let char = text[i];
            if (/[A-Z]/i.test(char)) {
                const base = char === char.toUpperCase() ? 65 : 97;
                const keyChar = key[i % key.length].toUpperCase();
                const shift = keyChar.charCodeAt(0) - 65;
                const code = ((char.charCodeAt(0) - base - shift + 26) % 26 + base;
                decrypted += String.fromCharCode(code);
            } else {
                decrypted += char;
            }
        }
        
        return {
            method: "Vigenère Cipher",
            result: decrypted,
            confidence: this.rateText(decrypted),
            details: {
                key,
                keyLength,
                decryptionMethod: "Each key character found using frequency analysis"
            }
        };
    }

    analyzeXOR(text) {
        const results = [];
        // Test 1-byte XOR keys
        for (let key = 0; key < 256; key++) {
            let decrypted = "";
            for (let i = 0; i < text.length; i++) {
                decrypted += String.fromCharCode(text.charCodeAt(i) ^ key);
            }
            const confidence = this.rateText(decrypted);
            if (confidence > 50) { // Only keep plausible results
                results.push({
                    method: `XOR (0x${key.toString(16).padStart(2, '0')})`,
                    result: decrypted,
                    confidence,
                    details: {key: `0x${key.toString(16).toUpperCase()}`}
                });
            }
        }
        return results.sort((a, b) => b.confidence - a.score);
    }

    analyzeK4(text) {
        try {
            // 1. Symbol replacement
            const replaced = text.replace(/\?/g, 'F').replace(/#/g, 'H');
            
            // 2. 8x8 matrix transposition
            const matrix = [];
            for (let i = 0; i < 8; i++) {
                matrix.push(replaced.substr(i * 8, 8).split(''));
            }
            
            // 3. Spiral read
            const spiral = this.readSpiral(matrix);
            
            // 4. Vigenère with coordinate key
            const coordKey = this.generateCoordKey(matrix);
            const decrypted = this.vigenereDecrypt(spiral, coordKey);
            
            return {
                method: "Kryptos K4 Method",
                result: decrypted,
                confidence: this.rateText(decrypted),
                details: {
                    steps: [
                        {action: "Symbol replacement", result: replaced},
                        {action: "8x8 matrix transposition", matrix},
                        {action: "Spiral read", result: spiral},
                        {action: "Vigenère decryption", key: coordKey}
                    ]
                }
            };
        } catch (e) {
            return null;
        }
    }

    // Helper methods
    readSpiral(matrix) {
        const result = [];
        let top = 0, bottom = 7, left = 0, right = 7;
        
        while (top <= bottom && left <= right) {
            for (let i = left; i <= right; i++) result.push(matrix[top][i]);
            top++;
            
            for (let i = top; i <= bottom; i++) result.push(matrix[i][right]);
            right--;
            
            if (top <= bottom) {
                for (let i = right; i >= left; i--) result.push(matrix[bottom][i]);
                bottom--;
            }
            
            if (left <= right) {
                for (let i = bottom; i >= top; i--) result.push(matrix[i][left]);
                left++;
            }
        }
        
        return result.join('');
    }

    generateCoordKey(matrix) {
        let key = '';
        for (let i = 0; i < 8; i++) {
            for (let j = 0; j < 8; j++) {
                if ((i + j) % 3 === 0) {
                    key += String.fromCharCode(65 + (i * 8 + j) % 26);
                }
            }
        }
        return key;
    }

    vigenereDecrypt(text, key) {
        let result = '';
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            if (/[A-Z]/.test(char)) {
                const keyChar = key[i % key.length];
                const shift = keyChar.charCodeAt(0) - 65;
                const code = ((char.charCodeAt(0) - 65 - shift + 26) % 26) + 65;
                result += String.fromCharCode(code);
            } else {
                result += char;
            }
        }
        return result;
    }

    findKeyLength(text) {
        // Find repeated sequences
        const sequences = {};
        for (let i = 0; i < text.length - 2; i++) {
            const seq = text.substr(i, 3);
            if (!sequences[seq]) sequences[seq] = [];
            sequences[seq].push(i);
        }
        
        // Calculate distances between repeats
        const distances = [];
        for (const seq in sequences) {
            if (sequences[seq].length > 1) {
                for (let i = 1; i < sequences[seq].length; i++) {
                    distances.push(sequences[seq][i] - sequences[seq][0]);
                }
            }
        }
        
        // Find GCD of distances
        const gcd = (a, b) => b ? gcd(b, a % b) : a;
        return distances.reduce(gcd, distances[0]) || 3;
    }

    rateText(text) {
        let score = 0;
        const upper = text.toUpperCase();
        
        // Check for common words
        for (const word of this.commonWords) {
            if (upper.includes(word)) score += word.length * 2;
        }
        
        // Frequency analysis
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

    isBase64(str) {
        try {
            return btoa(atob(str)) === str;
        } catch (e) {
            return false;
        }
    }

    isMeaningful(text) {
        return this.rateText(text) > 50;
    }
}

// Worker interface
const breaker = new CipherBreaker();

self.onmessage = function(e) {
    const { id, text } = e.data;
    try {
        const results = breaker.analyze(text);
        self.postMessage({ id, results });
    } catch (error) {
        self.postMessage({ id, error: error.message });
    }
};
