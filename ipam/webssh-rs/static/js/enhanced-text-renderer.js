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

        // Initialize subpixel renderer
        this.subpixelRenderer = null;
        if (this.options.enableSubpixelRendering && window.SubpixelRenderer) {
            this.subpixelRenderer = new window.SubpixelRenderer({
                enableSubpixelPositioning: true,
                enableRGBSubpixels: true,
                enableClearType: true,
                devicePixelRatio: window.devicePixelRatio || 1
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
        
        // Enhanced text renderer initialized
    }
    
    async initialize() {
        if (this.isInitialized) return;
        
        // Initializing enhanced text renderer
        
        // Generate font atlas with ligature support
        if (this.fontAtlas) {
            try {
                await this.fontAtlas.generateAtlas('unicode'); // Include ligature characters
                // Font atlas generated
            } catch (e) {
                console.warn('⚠️ Font atlas generation failed:', e);
            }
        }

        // Initialize subpixel renderer
        if (this.subpixelRenderer) {
            try {
                await this.subpixelRenderer.initialize();
                console.log('✅ Subpixel renderer initialized');
            } catch (e) {
                console.warn('⚠️ Subpixel renderer initialization failed:', e);
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
        const characters = Array.from(text);
        const renderedChars = [];
        let currentX = x;

        // Check if we have subpixel rendering available
        if (this.subpixelRenderer && this.options.enableSubpixelRendering) {
            return this.performSubpixelRender(text, x, y, style);
        }

        // Check if we have batch renderer available
        if (window.batchRenderer && this.fontAtlas && this.fontAtlas.getAtlasTexture()) {
            return this.performBatchRender(text, x, y, style);
        }

        // Fallback to individual character rendering
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
            lineHeight: this.options.fontSize * this.options.lineHeight,
            renderMethod: 'individual'
        };
    }

    performSubpixelRender(text, x, y, style) {
        // Use subpixel renderer for crystal-clear text
        const subpixelChars = this.subpixelRenderer.renderTextSubpixel(text, x, y, {
            fontSize: this.options.fontSize,
            fontFamily: this.options.fontFamily,
            fontWeight: style.fontWeight || 'normal',
            ...style
        });

        const renderedChars = [];
        let totalWidth = 0;

        for (const subpixelChar of subpixelChars) {
            const charResult = {
                character: subpixelChar.character,
                position: subpixelChar.position,
                subpixelPosition: subpixelChar.subpixelPosition,
                glyphData: subpixelChar.glyphData,
                style: style,
                width: subpixelChar.glyphData.width,
                isSubpixelRendered: true
            };

            renderedChars.push(charResult);
            totalWidth += charResult.width;
        }

        return {
            characters: renderedChars,
            totalWidth: totalWidth,
            lineHeight: this.options.fontSize * this.options.lineHeight,
            renderMethod: 'subpixel',
            subpixelOptimized: true
        };
    }

    performBatchRender(text, x, y, style) {
        const characters = Array.from(text);
        const batchChars = [];
        let currentX = x;

        // Prepare characters for batch rendering
        for (const char of characters) {
            const glyph = this.fontAtlas.getGlyph(char);
            if (!glyph) {
                currentX += this.getCharacterWidth(char);
                continue;
            }

            // Convert style color to array format
            const color = this.styleToColor(style);

            // Create batch character data
            const batchChar = {
                x: currentX,
                y: y,
                width: glyph.charWidth,
                height: glyph.charHeight,
                texX: glyph.textureX,
                texY: glyph.textureY,
                texW: glyph.textureWidth,
                texH: glyph.textureHeight,
                color: color,
                character: char,
                glyph: glyph
            };

            batchChars.push(batchChar);
            currentX += glyph.charWidth;
        }

        // Add to batch renderer
        if (batchChars.length > 0) {
            // Begin batch if not already started
            if (!window.batchRenderer.currentBatch) {
                window.batchRenderer.beginBatch(this.fontAtlas.getAtlasTexture(), style.opacity || 1.0);
            }

            // Add characters to batch
            window.batchRenderer.addCharacters(batchChars);
        }

        return {
            characters: batchChars,
            totalWidth: currentX - x,
            lineHeight: this.options.fontSize * this.options.lineHeight,
            renderMethod: 'batch',
            batchSize: batchChars.length
        };
    }

    styleToColor(style) {
        // Convert CSS color or style to RGBA array
        if (style.color) {
            if (Array.isArray(style.color)) {
                return style.color;
            }

            // Parse CSS color (simplified)
            if (typeof style.color === 'string') {
                if (style.color.startsWith('#')) {
                    return this.hexToRgba(style.color);
                }
                if (style.color.startsWith('rgb')) {
                    return this.rgbStringToArray(style.color);
                }
            }
        }

        // Default white color
        return [1.0, 1.0, 1.0, style.opacity || 1.0];
    }

    hexToRgba(hex) {
        const r = parseInt(hex.slice(1, 3), 16) / 255;
        const g = parseInt(hex.slice(3, 5), 16) / 255;
        const b = parseInt(hex.slice(5, 7), 16) / 255;
        return [r, g, b, 1.0];
    }

    rgbStringToArray(rgbString) {
        const matches = rgbString.match(/\d+/g);
        if (matches && matches.length >= 3) {
            return [
                parseInt(matches[0]) / 255,
                parseInt(matches[1]) / 255,
                parseInt(matches[2]) / 255,
                matches[3] ? parseInt(matches[3]) / 255 : 1.0
            ];
        }
        return [1.0, 1.0, 1.0, 1.0];
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
     * Render multiple lines efficiently with batch rendering
     * @param {Array} lines - Array of line objects {text, x, y, style}
     * @returns {Array} Array of render results
     */
    renderLines(lines) {
        const results = [];

        // Use batch rendering if available
        if (window.batchRenderer && this.fontAtlas && this.fontAtlas.getAtlasTexture()) {
            return this.renderLinesBatch(lines);
        }

        // Fallback to individual line rendering
        for (const line of lines) {
            const result = this.renderLine(line.text, line.x, line.y, line.style);
            results.push(result);
        }

        return results;
    }

    /**
     * Render multiple lines using batch rendering
     * @param {Array} lines - Array of line objects
     * @returns {Array} Array of render results
     */
    renderLinesBatch(lines) {
        const results = [];
        const startTime = performance.now();

        // Begin batch
        window.batchRenderer.beginBatch(this.fontAtlas.getAtlasTexture(), 1.0);

        // Process all lines
        for (const line of lines) {
            const result = this.renderLine(line.text, line.x, line.y, line.style);
            results.push(result);
        }

        // Flush batch
        window.batchRenderer.flushCurrentBatch();

        // Update stats
        const renderTime = performance.now() - startTime;
        this.stats.totalRenderTime += renderTime;

        console.log(`🎨 Batch rendered ${lines.length} lines in ${renderTime.toFixed(2)}ms`);

        return results;
    }

    /**
     * Start a new rendering frame
     */
    beginFrame() {
        if (window.batchRenderer) {
            // Clear any previous batches
            window.batchRenderer.flushAll();
        }
    }

    /**
     * End current rendering frame
     */
    endFrame() {
        if (window.batchRenderer) {
            // Flush all pending batches
            window.batchRenderer.flushAll();
        }
    }

    /**
     * Render text with automatic batching
     * @param {string} text - Text to render
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {Object} style - Style options
     * @returns {Object} Render result
     */
    renderTextBatch(text, x, y, style = {}) {
        if (!window.batchRenderer || !this.fontAtlas) {
            return this.renderLine(text, x, y, style);
        }

        // Ensure batch is started
        if (!window.batchRenderer.currentBatch) {
            window.batchRenderer.beginBatch(this.fontAtlas.getAtlasTexture(), style.opacity || 1.0);
        }

        return this.renderLine(text, x, y, style);
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
     * Enable/disable subpixel rendering features
     * @param {Object} options - Subpixel options
     */
    setSubpixelRenderingOptions(options) {
        if (options.enableSubpixelRendering !== undefined) {
            this.options.enableSubpixelRendering = options.enableSubpixelRendering;
        }

        if (this.subpixelRenderer && options.subpixelOptions) {
            this.subpixelRenderer.setSubpixelOptions(options.subpixelOptions);
        }

        this.clearCache(); // Clear cache when settings change
    }

    /**
     * Test subpixel rendering quality
     * @returns {Object} Quality test results
     */
    testSubpixelQuality() {
        if (!this.subpixelRenderer) {
            return { error: 'Subpixel renderer not available' };
        }

        return this.subpixelRenderer.testSubpixelQuality();
    }

    /**
     * Get subpixel rendering capabilities
     * @returns {Object} Capability information
     */
    getSubpixelCapabilities() {
        return {
            isAvailable: !!this.subpixelRenderer,
            isEnabled: this.options.enableSubpixelRendering,
            devicePixelRatio: window.devicePixelRatio || 1,
            isHighDPI: (window.devicePixelRatio || 1) > 1,
            supportedFeatures: {
                subpixelPositioning: true,
                rgbSubpixels: true,
                clearType: true
            }
        };
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

        // Add subpixel rendering stats if available
        if (this.subpixelRenderer) {
            stats.subpixelRendering = this.subpixelRenderer.getStats();
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
