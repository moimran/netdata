/**
 * Advanced Text Shaping Engine with Font Ligatures
 * Provides modern terminal typography with programming ligatures
 */

class TextShapingEngine {
    constructor(options = {}) {
        this.options = {
            enableLigatures: options.enableLigatures !== false, // Default enabled
            enableContextualAlternates: options.enableContextualAlternates !== false,
            cacheSize: options.cacheSize || 10000,
            ...options
        };
        
        // Programming ligatures mapping
        this.ligatureMap = new Map([
            // Equality and comparison
            ['==', '⩵'], ['===', '≡'], ['!=', '≠'], ['!==', '≢'],
            ['<=', '≤'], ['>=', '≥'], ['<>', '≠'],
            
            // Arrows and pointers
            ['->', '→'], ['=>', '⇒'], ['<-', '←'], ['<=', '⇐'],
            ['<->', '↔'], ['=>>', '⇉'], ['<<-', '↞'], ['->>', '↠'],
            
            // Logic operators
            ['&&', '∧'], ['||', '∨'], ['!', '¬'],
            
            // Mathematical
            ['++', '⧺'], ['--', '⸺'], ['**', '✱'], 
            ['/*', '⁄*'], ['*/', '*⁄'], ['//', '⁄⁄'],
            
            // Functional programming
            ['>>=', '≫='], ['=<<', '=≪'], ['<$>', '⊛'],
            ['<*>', '⊛'], ['<|>', '⊕'], ['|>', '▷'], ['<|', '◁'],
            
            // Pipes and composition
            ['|>', '▷'], ['<|', '◁'], ['>>', '≫'], ['<<', '≪'],
            
            // Special symbols
            ['...', '…'], ['..', '‥'], [':::', '⋮'], ['::', '∷'],
            [';;', '⸵'], ['??', '⁇'], ['?:', '⁈'], ['!?', '⁉'],
            
            // Brackets and delimiters
            ['[[', '⟦'], [']]', '⟧'], ['{{', '⦃'], ['}}', '⦄'],
            
            // Web and markup
            ['</>', '⟨/⟩'], ['</', '⟨/'], ['/>', '/⟩'],
            ['<!--', '⟨!--'], ['-->', '--⟩']
        ]);
        
        // Contextual alternates (character combinations that look better together)
        this.contextualMap = new Map([
            ['fi', 'ﬁ'], ['fl', 'ﬂ'], ['ff', 'ﬀ'], ['ffi', 'ﬃ'], ['ffl', 'ﬄ'],
            ['st', 'ﬆ'], ['ct', 'ﬅ']
        ]);
        
        // LRU Cache for shaped text
        this.shapingCache = new LRUCache(this.options.cacheSize);
        
        // Performance metrics
        this.stats = {
            cacheHits: 0,
            cacheMisses: 0,
            ligaturesApplied: 0,
            contextualAlternatesApplied: 0,
            totalShapingCalls: 0,
            averageShapingTime: 0
        };
        
        console.log('🎨 Text shaping engine initialized with', this.ligatureMap.size, 'ligatures');
    }
    
    /**
     * Shape text with ligatures and contextual alternates
     * @param {string} text - Input text to shape
     * @param {Object} options - Shaping options
     * @returns {Object} Shaped text result
     */
    shapeText(text, options = {}) {
        const startTime = performance.now();
        this.stats.totalShapingCalls++;
        
        // Check cache first
        const cacheKey = this.getCacheKey(text, options);
        const cached = this.shapingCache.get(cacheKey);
        if (cached) {
            this.stats.cacheHits++;
            return cached;
        }
        
        this.stats.cacheMisses++;
        
        // Perform text shaping
        const result = this.performShaping(text, options);
        
        // Cache the result
        this.shapingCache.set(cacheKey, result);
        
        // Update performance stats
        const shapingTime = performance.now() - startTime;
        this.stats.averageShapingTime = (this.stats.averageShapingTime + shapingTime) / 2;
        
        return result;
    }
    
    performShaping(text, options) {
        let shapedText = text;
        const appliedLigatures = [];
        const appliedContextual = [];
        
        // Apply ligatures if enabled
        if (this.options.enableLigatures && options.enableLigatures !== false) {
            const ligatureResult = this.applyLigatures(shapedText);
            shapedText = ligatureResult.text;
            appliedLigatures.push(...ligatureResult.applied);
        }
        
        // Apply contextual alternates if enabled
        if (this.options.enableContextualAlternates && options.enableContextualAlternates !== false) {
            const contextualResult = this.applyContextualAlternates(shapedText);
            shapedText = contextualResult.text;
            appliedContextual.push(...contextualResult.applied);
        }
        
        return {
            originalText: text,
            shapedText: shapedText,
            ligatures: appliedLigatures,
            contextualAlternates: appliedContextual,
            hasChanges: shapedText !== text,
            length: shapedText.length,
            originalLength: text.length
        };
    }
    
    applyLigatures(text) {
        let result = text;
        const applied = [];
        
        // Sort ligatures by length (longest first) to avoid conflicts
        const sortedLigatures = Array.from(this.ligatureMap.entries())
            .sort((a, b) => b[0].length - a[0].length);
        
        for (const [sequence, ligature] of sortedLigatures) {
            const regex = new RegExp(this.escapeRegex(sequence), 'g');
            let match;
            
            while ((match = regex.exec(result)) !== null) {
                applied.push({
                    sequence: sequence,
                    ligature: ligature,
                    position: match.index,
                    length: sequence.length
                });
                
                this.stats.ligaturesApplied++;
            }
            
            result = result.replace(regex, ligature);
        }
        
        return { text: result, applied };
    }
    
    applyContextualAlternates(text) {
        let result = text;
        const applied = [];
        
        for (const [sequence, alternate] of this.contextualMap.entries()) {
            const regex = new RegExp(this.escapeRegex(sequence), 'g');
            let match;
            
            while ((match = regex.exec(result)) !== null) {
                applied.push({
                    sequence: sequence,
                    alternate: alternate,
                    position: match.index,
                    length: sequence.length
                });
                
                this.stats.contextualAlternatesApplied++;
            }
            
            result = result.replace(regex, alternate);
        }
        
        return { text: result, applied };
    }
    
    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    
    getCacheKey(text, options) {
        return `${text}|${JSON.stringify(options)}`;
    }
    
    /**
     * Add custom ligature
     * @param {string} sequence - Character sequence
     * @param {string} ligature - Ligature character
     */
    addLigature(sequence, ligature) {
        this.ligatureMap.set(sequence, ligature);
        this.shapingCache.clear(); // Clear cache when ligatures change
        console.log(`➕ Added ligature: ${sequence} → ${ligature}`);
    }
    
    /**
     * Remove ligature
     * @param {string} sequence - Character sequence to remove
     */
    removeLigature(sequence) {
        if (this.ligatureMap.delete(sequence)) {
            this.shapingCache.clear();
            console.log(`➖ Removed ligature: ${sequence}`);
            return true;
        }
        return false;
    }
    
    /**
     * Get all available ligatures
     * @returns {Array} Array of ligature mappings
     */
    getLigatures() {
        return Array.from(this.ligatureMap.entries()).map(([seq, lig]) => ({
            sequence: seq,
            ligature: lig,
            unicode: lig.codePointAt(0).toString(16).toUpperCase()
        }));
    }
    
    /**
     * Test if text contains ligatures
     * @param {string} text - Text to test
     * @returns {boolean} True if text would be shaped
     */
    hasLigatures(text) {
        for (const sequence of this.ligatureMap.keys()) {
            if (text.includes(sequence)) {
                return true;
            }
        }
        return false;
    }
    
    /**
     * Get shaping statistics
     * @returns {Object} Performance and usage statistics
     */
    getStats() {
        const hitRate = this.stats.cacheHits / (this.stats.cacheHits + this.stats.cacheMisses);
        
        return {
            ...this.stats,
            cacheHitRate: hitRate,
            cacheSize: this.shapingCache.size,
            maxCacheSize: this.options.cacheSize,
            availableLigatures: this.ligatureMap.size,
            availableContextualAlternates: this.contextualMap.size
        };
    }
    
    /**
     * Clear shaping cache
     */
    clearCache() {
        this.shapingCache.clear();
        console.log('🧹 Text shaping cache cleared');
    }
    
    /**
     * Enable/disable ligatures
     * @param {boolean} enabled - Whether to enable ligatures
     */
    setLigaturesEnabled(enabled) {
        this.options.enableLigatures = enabled;
        this.shapingCache.clear(); // Clear cache when settings change
        console.log(`🎨 Ligatures ${enabled ? 'enabled' : 'disabled'}`);
    }
    
    /**
     * Enable/disable contextual alternates
     * @param {boolean} enabled - Whether to enable contextual alternates
     */
    setContextualAlternatesEnabled(enabled) {
        this.options.enableContextualAlternates = enabled;
        this.shapingCache.clear();
        console.log(`🎨 Contextual alternates ${enabled ? 'enabled' : 'disabled'}`);
    }
}

/**
 * Simple LRU Cache implementation
 */
class LRUCache {
    constructor(maxSize = 1000) {
        this.maxSize = maxSize;
        this.cache = new Map();
    }
    
    get(key) {
        if (this.cache.has(key)) {
            // Move to end (most recently used)
            const value = this.cache.get(key);
            this.cache.delete(key);
            this.cache.set(key, value);
            return value;
        }
        return null;
    }
    
    set(key, value) {
        if (this.cache.has(key)) {
            this.cache.delete(key);
        } else if (this.cache.size >= this.maxSize) {
            // Remove least recently used (first item)
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        
        this.cache.set(key, value);
    }
    
    clear() {
        this.cache.clear();
    }
    
    get size() {
        return this.cache.size;
    }
}

// Export classes
window.TextShapingEngine = TextShapingEngine;
window.LRUCache = LRUCache;

console.log('🎨 Text shaping module loaded');
