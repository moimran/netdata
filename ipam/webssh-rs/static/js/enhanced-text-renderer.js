/**
 * Enhanced Terminal Text Renderer with Text Shaping
 * Integrates text shaping, ligatures, and optimized rendering
 */

class EnhancedTextRenderer {
    constructor(terminal, options = {}) {
        this.terminal = terminal;
        this.options = {
            enableTextShaping: options.enableTextShaping !== false,
            enableLigatures: options.enableLigatures !== false,
            enableSubpixelRendering: options.enableSubpixelRendering !== false,
            fontFamily: options.fontFamily || 'monospace',
            fontSize: options.fontSize || 16,
            lineHeight: options.lineHeight || 1.2,
            ...options
        };
        
        // Initialize text shaping engine
        this.textShaper = null;
        if (this.options.enableTextShaping && window.TextShapingEngine) {
            this.textShaper = new window.TextShapingEngine({
                enableLigatures: this.options.enableLigatures,
                cacheSize: 20000 // Larger cache for terminal use
            });
        }
        
        // Initialize font atlas
        this.fontAtlas = null;
        if (window.OptimizedFontAtlas) {
            this.fontAtlas = new window.OptimizedFontAtlas({
                fontFamily: this.options.fontFamily,
                fontSize: this.options.fontSize,
                atlasSize: 4096 // Larger atlas for ligatures
            });
        }
        
        // Rendering cache for shaped text
        this.renderCache = new Map();
        this.maxCacheSize = 50000;
        
        // Performance metrics
        this.stats = {
            linesRendered: 0,
            charactersRendered: 0,
            ligaturesRendered: 0,
            cacheHits: 0,
            cacheMisses: 0,
            averageRenderTime: 0,
            totalRenderTime: 0
        };
        
        this.isInitialized = false;
        
        console.log('🎨 Enhanced text renderer initialized');
    }
    
    async initialize() {
        if (this.isInitialized) return;
        
        console.log('🚀 Initializing enhanced text renderer...');
        
        // Generate font atlas with ligature support
        if (this.fontAtlas) {
            try {
                await this.fontAtlas.generateAtlas('unicode'); // Include ligature characters
                console.log('✅ Font atlas generated with ligature support');
            } catch (e) {
                console.warn('⚠️ Font atlas generation failed:', e);
            }
        }
        
        this.isInitialized = true;
        console.log('✅ Enhanced text renderer ready');
    }
    
    /**
     * Render a line of text with text shaping
     * @param {string} text - Text to render
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {Object} style - Text styling options
     * @returns {Object} Render result
     */
    renderLine(text, x, y, style = {}) {
        const startTime = performance.now();
        
        // Check render cache
        const cacheKey = this.getRenderCacheKey(text, x, y, style);
        if (this.renderCache.has(cacheKey)) {
            this.stats.cacheHits++;
            return this.renderCache.get(cacheKey);
        }
        
        this.stats.cacheMisses++;
        
        // Shape text if text shaping is enabled
        let shapedResult = null;
        let renderText = text;
        
        if (this.textShaper && this.options.enableTextShaping) {
            shapedResult = this.textShaper.shapeText(text, {
                enableLigatures: this.options.enableLigatures
            });
            renderText = shapedResult.shapedText;
            
            if (shapedResult.ligatures.length > 0) {
                this.stats.ligaturesRendered += shapedResult.ligatures.length;
            }
        }
        
        // Render the shaped text
        const renderResult = this.performRender(renderText, x, y, style);
        
        // Create result object
        const result = {
            originalText: text,
            renderedText: renderText,
            shapingResult: shapedResult,
            renderResult: renderResult,
            position: { x, y },
            style: style,
            hasLigatures: shapedResult ? shapedResult.ligatures.length > 0 : false,
            renderTime: performance.now() - startTime
        };
        
        // Cache the result
        this.cacheRenderResult(cacheKey, result);
        
        // Update stats
        this.updateStats(result);
        
        return result;
    }
    
    performRender(text, x, y, style) {
        // This would integrate with the terminal's actual rendering system
        // For now, we'll simulate the rendering process
        
        const characters = Array.from(text);
        const renderedChars = [];
        let currentX = x;
        
        for (const char of characters) {
            // Get glyph info from font atlas
            let glyph = null;
            if (this.fontAtlas) {
                glyph = this.fontAtlas.getGlyph(char);
            }
            
            // Render character
            const charResult = {
                character: char,
                position: { x: currentX, y: y },
                glyph: glyph,
                style: style,
                width: glyph ? glyph.charWidth : this.getCharacterWidth(char)
            };
            
            renderedChars.push(charResult);
            currentX += charResult.width;
        }
        
        return {
            characters: renderedChars,
            totalWidth: currentX - x,
            lineHeight: this.options.fontSize * this.options.lineHeight
        };
    }
    
    getCharacterWidth(char) {
        // Fallback character width calculation
        // In a real implementation, this would measure the character
        return this.options.fontSize * 0.6; // Approximate monospace width
    }
    
    getRenderCacheKey(text, x, y, style) {
        return `${text}|${x}|${y}|${JSON.stringify(style)}`;
    }
    
    cacheRenderResult(key, result) {
        // Implement LRU cache eviction
        if (this.renderCache.size >= this.maxCacheSize) {
            const firstKey = this.renderCache.keys().next().value;
            this.renderCache.delete(firstKey);
        }
        
        this.renderCache.set(key, result);
    }
    
    updateStats(result) {
        this.stats.linesRendered++;
        this.stats.charactersRendered += result.originalText.length;
        this.stats.totalRenderTime += result.renderTime;
        this.stats.averageRenderTime = this.stats.totalRenderTime / this.stats.linesRendered;
    }
    
    /**
     * Render multiple lines efficiently
     * @param {Array} lines - Array of line objects {text, x, y, style}
     * @returns {Array} Array of render results
     */
    renderLines(lines) {
        const results = [];
        
        for (const line of lines) {
            const result = this.renderLine(line.text, line.x, line.y, line.style);
            results.push(result);
        }
        
        return results;
    }
    
    /**
     * Preview text shaping without rendering
     * @param {string} text - Text to preview
     * @returns {Object} Shaping preview
     */
    previewShaping(text) {
        if (!this.textShaper) {
            return { originalText: text, shapedText: text, hasChanges: false };
        }
        
        return this.textShaper.shapeText(text);
    }
    
    /**
     * Get available ligatures
     * @returns {Array} Array of ligature mappings
     */
    getAvailableLigatures() {
        if (!this.textShaper) return [];
        return this.textShaper.getLigatures();
    }
    
    /**
     * Add custom ligature
     * @param {string} sequence - Character sequence
     * @param {string} ligature - Ligature character
     */
    addLigature(sequence, ligature) {
        if (this.textShaper) {
            this.textShaper.addLigature(sequence, ligature);
            this.clearCache(); // Clear cache when ligatures change
        }
    }
    
    /**
     * Enable/disable text shaping features
     * @param {Object} options - Feature options
     */
    setTextShapingOptions(options) {
        if (options.enableLigatures !== undefined) {
            this.options.enableLigatures = options.enableLigatures;
            if (this.textShaper) {
                this.textShaper.setLigaturesEnabled(options.enableLigatures);
            }
        }
        
        if (options.enableTextShaping !== undefined) {
            this.options.enableTextShaping = options.enableTextShaping;
        }
        
        this.clearCache(); // Clear cache when settings change
    }
    
    /**
     * Clear render cache
     */
    clearCache() {
        this.renderCache.clear();
        if (this.textShaper) {
            this.textShaper.clearCache();
        }
        console.log('🧹 Enhanced text renderer cache cleared');
    }
    
    /**
     * Get rendering statistics
     * @returns {Object} Performance and usage statistics
     */
    getStats() {
        const cacheHitRate = this.stats.cacheHits / (this.stats.cacheHits + this.stats.cacheMisses);
        
        const stats = {
            ...this.stats,
            cacheHitRate: cacheHitRate,
            cacheSize: this.renderCache.size,
            maxCacheSize: this.maxCacheSize,
            isInitialized: this.isInitialized
        };
        
        // Add text shaping stats if available
        if (this.textShaper) {
            stats.textShaping = this.textShaper.getStats();
        }
        
        // Add font atlas stats if available
        if (this.fontAtlas) {
            stats.fontAtlas = this.fontAtlas.getStats();
        }
        
        return stats;
    }
    
    /**
     * Test text shaping with sample text
     * @returns {Object} Test results
     */
    testTextShaping() {
        const testTexts = [
            'if (x == y) { return true; }',
            'const arrow = () => value;',
            'x >= y && y <= z',
            'array.map(x => x * 2)',
            'console.log("Hello World");',
            '/* Comment */ // Another comment',
            'x !== undefined || y === null'
        ];
        
        const results = [];
        
        for (const text of testTexts) {
            const shaped = this.previewShaping(text);
            results.push({
                original: text,
                shaped: shaped.shapedText,
                hasLigatures: shaped.hasChanges,
                ligatures: shaped.ligatures || []
            });
        }
        
        return results;
    }
}

// Export class
window.EnhancedTextRenderer = EnhancedTextRenderer;

console.log('🎨 Enhanced text renderer module loaded');
