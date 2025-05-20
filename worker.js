class CipherBreaker {
    constructor() {
        this.englishFreq = this.createFrequencyMap();
        this.commonWords = ["THE", "AND", "THAT", "HAVE", "WITH", "THIS"];
    }

    createFrequencyMap() {
        return {
            'E': 12.7, 'T': 9.1, 'A': 8.2, 'O': 7.5, 'I': 7.0, 'N': 6.7,
            'S': 6.3, 'H': 6.1, 'R': 6.0, 'D': 4.3, 'L': 4.0, 'C': 2.8,
            'U': 2.8, 'M': 2.4, 'W': 2.4, 'F': 2.2, 'G': 2.0, 'Y': 2.0,
            'P': 1.9, 'B': 1.5, 'V': 1.0, 'K': 0.8, 'J': 0.2, 'X': 0.2,
            'Q': 0.1, 'Z': 0.1
        };
    }

    async analyze(text, updateProgress, addLog) {
        const results = [];
        const totalSteps = 5;
        let currentStep = 0;

        // 1. Check Base64
        await addLog('Checking for Base64 encoding...');
        const base64Result = this.checkBase64(text);
        if (base64Result) {
            results.push(base64Result);
            await addLog(`Found Base64 encoded content: ${base64Result.result.substring(0, 30)}...`);
        }
        await updateProgress(++currentStep / totalSteps * 100);

        // 2. Caesar cipher analysis
        await addLog('Starting Caesar cipher analysis...');
        const caesarResults = await this.analyzeCaesar(text, addLog);
        results.push(...caesarResults);
        await addLog(`Completed Caesar analysis (${caesarResults.length} variants)`);
        await updateProgress(++currentStep / totalSteps * 100);

        // 3. Vigenère analysis
        if (text.length > 15) {
            await addLog('Starting Vigenère cipher analysis...');
            const vigenereResult = await this.analyzeVigenere(text, addLog);
            results.push(vigenereResult);
            await addLog(`Vigenère analysis completed. Key: ${vigenereResult.details?.key || 'not found'}`);
        }
        await updateProgress(++currentStep / totalSteps * 100);

        // 4. XOR analysis
        await addLog('Starting XOR analysis...');
        const xorResults = await this.analyzeXOR(text, addLog);
        results.push(...xorResults);
        await addLog(`XOR analysis completed (${xorResults.length} possible keys)`);
        await updateProgress(++currentStep / totalSteps * 100);

        // 5. Kryptos K4 pattern
        if (text.includes('?') || text.includes('#')) {
            await addLog('Checking for Kryptos K4 pattern...');
            const k4Result = await this.analyzeK4(text, addLog);
            if (k4Result) results.push(k4Result);
        }
        await updateProgress(++currentStep / totalSteps * 100);

        // Sort by confidence
        return results.sort((a, b) => b.confidence - a.confidence);
    }

    async analyzeCaesar(text, addLog) {
        const results = [];
        const totalShifts = 26;
        
        for (let shift = 1; shift < totalShifts; shift++) {
            const decrypted = this.caesarDecrypt(text, shift);
            const confidence = this.rateText(decrypted);
            
            if (confidence > 50 || shift === 13) { // Always include ROT13
                results.push({
                    method: `Caesar Shift ${shift}`,
                    result: decrypted,
                    confidence,
                    details: { shift }
                });
            }
            
            if (shift % 5 === 0) {
                await addLog(`Testing Caesar shift ${shift}/${totalShifts}...`);
            }
        }
        
        return results.sort((a, b) => b.confidence - a.confidence);
    }

    async analyzeVigenere(text, addLog) {
        await addLog('Determining likely key length...');
        const keyLength = this.findKeyLength(text);
        await addLog(`Probable key length: ${keyLength}`);
        
        let key = '';
        await addLog('Finding key characters...');
        
        for (let i = 0; i < keyLength; i++) {
            const segment = this.getTextSegment(text, i, keyLength);
            const bestShift = (await this.analyzeCaesar(segment, () => {}))[0].details.shift;
            key += String.fromCharCode(65 + (26 - bestShift) % 26);
            
            if (i % 2 === 0) {
                await addLog(`Found key character ${i+1}/${keyLength}: ${key[i]}`);
            }
        }
        
        const decrypted = this.vigenereDecrypt(text, key);
        return {
            method: "Vigenère Cipher",
            result: decrypted,
            confidence: this.rateText(decrypted),
            details: {
                key,
                keyLength,
                decryptionMethod: "Frequency analysis on each key position"
            }
        };
    }

    // ... (остальные методы анализа)

    // Helper methods
    postMessage(type, data) {
        self.postMessage({ type, data });
    }

    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Worker interface
const breaker = new CipherBreaker();

self.onmessage = async function(e) {
    const { type, text } = e.data;
    
    const updateProgress = (percent) => {
        self.postMessage({ type: 'PROGRESS', data: percent });
    };
    
    const addLog = async (message) => {
        self.postMessage({ type: 'LOG', data: message });
        await breaker.sleep(100); // Small delay for UI updates
    };
    
    if (type === 'ANALYZE') {
        try {
            const results = await breaker.analyze(text, updateProgress, addLog);
            
            for (const result of results.slice(0, 5)) {
                self.postMessage({ type: 'RESULT', data: result });
                await breaker.sleep(300); // Delay between results for better visualization
            }
            
            self.postMessage({ type: 'COMPLETE' });
        } catch (error) {
            self.postMessage({ type: 'ERROR', data: error.message });
        }
    }
};
