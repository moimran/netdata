/**
 * Advanced Subpixel Text Rendering System
 * Provides crystal-clear text with fractional positioning and RGB subpixel optimization
 */

class SubpixelRenderer {
    constructor(options = {}) {
        this.options = {
            enableSubpixelPositioning: options.enableSubpixelPositioning !== false,
            enableRGBSubpixels: options.enableRGBSubpixels !== false,
            enableClearType: options.enableClearType !== false,
            subpixelPrecision: options.subpixelPrecision || 3, // 1/3 pixel precision
            devicePixelRatio: options.devicePixelRatio || window.devicePixelRatio || 1,
            fontHinting: options.fontHinting || 'auto', // none, slight, medium, full, auto
            ...options
        };
        
        // Subpixel positioning offsets
        this.subpixelOffsets = this.generateSubpixelOffsets();
        
        // RGB subpixel weights for ClearType-style rendering
        this.rgbWeights = {
            red: [0.3, 0.6, 0.1],     // Red channel weights
            green: [0.1, 0.8, 0.1],   // Green channel weights  
            blue: [0.1, 0.6, 0.3]     // Blue channel weights
        };
        
        // Glyph cache with subpixel variants
        this.subpixelCache = new Map();
        this.maxCacheSize = 50000;
        
        // Performance metrics
        this.stats = {
            glyphsRendered: 0,
            subpixelHits: 0,
            subpixelMisses: 0,
            renderTime: 0,
            cacheSize: 0,
            sharpnessImprovement: 0
        };
        
        // Canvas for subpixel glyph generation
        this.glyphCanvas = null;
        this.glyphContext = null;
        
        this.isInitialized = false;
        
        console.log('🎨 Subpixel renderer initialized');
    }
    
    async initialize() {
        if (this.isInitialized) return;
        
        console.log('🚀 Initializing subpixel renderer...');
        
        // Create high-resolution canvas for glyph rendering
        this.createGlyphCanvas();
        
        // Detect display characteristics
        this.detectDisplayCharacteristics();
        
        // Setup font rendering context
        this.setupFontRendering();
        
        this.isInitialized = true;
        console.log('✅ Subpixel renderer ready');
    }
    
    createGlyphCanvas() {
        // Create canvas with high resolution for subpixel rendering
        const size = 256 * this.options.devicePixelRatio;
        this.glyphCanvas = new OffscreenCanvas(size, size);
        this.glyphContext = this.glyphCanvas.getContext('2d');
        
        // Scale context for device pixel ratio
        this.glyphContext.scale(this.options.devicePixelRatio, this.options.devicePixelRatio);
        
        console.log(`📐 Created ${size}x${size} glyph canvas for subpixel rendering`);
    }
    
    detectDisplayCharacteristics() {
        // Detect display DPI and subpixel layout
        const dpi = this.options.devicePixelRatio * 96;
        const isHighDPI = this.options.devicePixelRatio > 1;
        
        // Adjust subpixel precision based on display
        if (isHighDPI) {
            this.options.subpixelPrecision = 6; // Higher precision for high-DPI
        }
        
        console.log(`📱 Display: ${dpi} DPI, ${isHighDPI ? 'High-DPI' : 'Standard'}, ${this.options.subpixelPrecision}x subpixel precision`);
    }
    
    setupFontRendering() {
        const ctx = this.glyphContext;
        
        // Enable high-quality text rendering
        ctx.textRenderingOptimization = 'optimizeQuality';
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Configure font hinting
        if (this.options.fontHinting !== 'auto') {
            ctx.fontKerning = this.options.fontHinting;
        }
        
        console.log('🎨 Font rendering context configured for subpixel quality');
    }
    
    generateSubpixelOffsets() {
        const precision = this.options.subpixelPrecision;
        const offsets = [];
        
        for (let i = 0; i < precision; i++) {
            offsets.push(i / precision);
        }
        
        return offsets;
    }
    
    /**
     * Render character with subpixel positioning
     * @param {string} char - Character to render
     * @param {number} x - X position (can be fractional)
     * @param {number} y - Y position (can be fractional)
     * @param {Object} style - Font style options
     * @returns {Object} Rendered glyph data
     */
    renderCharacterSubpixel(char, x, y, style = {}) {
        const startTime = performance.now();
        
        // Calculate subpixel position
        const subpixelX = this.options.enableSubpixelPositioning ? 
            this.getSubpixelOffset(x) : 0;
        const subpixelY = this.options.enableSubpixelPositioning ? 
            this.getSubpixelOffset(y) : 0;
        
        // Create cache key
        const cacheKey = this.getSubpixelCacheKey(char, subpixelX, subpixelY, style);
        
        // Check cache
        if (this.subpixelCache.has(cacheKey)) {
            this.stats.subpixelHits++;
            return this.subpixelCache.get(cacheKey);
        }
        
        this.stats.subpixelMisses++;
        
        // Render glyph with subpixel positioning
        const glyphData = this.renderGlyphSubpixel(char, subpixelX, subpixelY, style);
        
        // Apply RGB subpixel optimization if enabled
        if (this.options.enableRGBSubpixels) {
            this.applyRGBSubpixelOptimization(glyphData);
        }
        
        // Cache the result
        this.cacheSubpixelGlyph(cacheKey, glyphData);
        
        // Update stats
        this.stats.glyphsRendered++;
        this.stats.renderTime += performance.now() - startTime;
        
        return glyphData;
    }
    
    getSubpixelOffset(position) {
        const fractional = position - Math.floor(position);
        const offsetIndex = Math.round(fractional * this.options.subpixelPrecision);
        return this.subpixelOffsets[offsetIndex] || 0;
    }
    
    renderGlyphSubpixel(char, subpixelX, subpixelY, style) {
        const ctx = this.glyphContext;
        const fontSize = style.fontSize || 16;
        const fontFamily = style.fontFamily || 'monospace';
        
        // Clear canvas
        ctx.clearRect(0, 0, 256, 256);
        
        // Setup font
        ctx.font = `${style.fontWeight || 'normal'} ${fontSize}px ${fontFamily}`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillStyle = '#ffffff';
        
        // Render at subpixel position
        const renderX = 50 + subpixelX;
        const renderY = 50 + subpixelY;
        
        ctx.fillText(char, renderX, renderY);
        
        // Get image data
        const imageData = ctx.getImageData(0, 0, 256, 256);
        
        // Measure character dimensions
        const metrics = ctx.measureText(char);
        const width = Math.ceil(metrics.width);
        const height = fontSize;
        
        return {
            character: char,
            imageData: imageData,
            width: width,
            height: height,
            subpixelX: subpixelX,
            subpixelY: subpixelY,
            metrics: metrics,
            style: style
        };
    }
    
    applyRGBSubpixelOptimization(glyphData) {
        const imageData = glyphData.imageData;
        const data = imageData.data;
        
        // Apply RGB subpixel weights for ClearType-style rendering
        for (let i = 0; i < data.length; i += 4) {
            const alpha = data[i + 3] / 255;
            
            if (alpha > 0) {
                // Apply RGB weights
                data[i] = Math.min(255, data[i] * this.rgbWeights.red[1] * alpha); // Red
                data[i + 1] = Math.min(255, data[i + 1] * this.rgbWeights.green[1] * alpha); // Green
                data[i + 2] = Math.min(255, data[i + 2] * this.rgbWeights.blue[1] * alpha); // Blue
                
                // Enhance edge sharpness
                if (alpha < 1.0) {
                    const sharpness = 1.2; // Sharpness factor
                    data[i] *= sharpness;
                    data[i + 1] *= sharpness;
                    data[i + 2] *= sharpness;
                }
            }
        }
        
        glyphData.isRGBOptimized = true;
    }
    
    getSubpixelCacheKey(char, subpixelX, subpixelY, style) {
        return `${char}|${subpixelX.toFixed(3)}|${subpixelY.toFixed(3)}|${JSON.stringify(style)}`;
    }
    
    cacheSubpixelGlyph(key, glyphData) {
        // Implement LRU cache eviction
        if (this.subpixelCache.size >= this.maxCacheSize) {
            const firstKey = this.subpixelCache.keys().next().value;
            this.subpixelCache.delete(firstKey);
        }
        
        this.subpixelCache.set(key, glyphData);
        this.stats.cacheSize = this.subpixelCache.size;
    }
    
    /**
     * Render text with subpixel positioning
     * @param {string} text - Text to render
     * @param {number} x - Starting X position
     * @param {number} y - Starting Y position
     * @param {Object} style - Text style
     * @returns {Array} Array of rendered characters
     */
    renderTextSubpixel(text, x, y, style = {}) {
        const characters = Array.from(text);
        const renderedChars = [];
        let currentX = x;
        
        for (const char of characters) {
            const glyphData = this.renderCharacterSubpixel(char, currentX, y, style);
            
            renderedChars.push({
                character: char,
                glyphData: glyphData,
                position: { x: currentX, y: y },
                subpixelPosition: { 
                    x: currentX + glyphData.subpixelX, 
                    y: y + glyphData.subpixelY 
                }
            });
            
            currentX += glyphData.width;
        }
        
        return renderedChars;
    }
    
    /**
     * Create WebGL texture from subpixel glyph
     * @param {WebGLRenderingContext} gl - WebGL context
     * @param {Object} glyphData - Glyph data with image
     * @returns {WebGLTexture} WebGL texture
     */
    createSubpixelTexture(gl, glyphData) {
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        
        // Upload image data
        gl.texImage2D(
            gl.TEXTURE_2D, 0, gl.RGBA, 
            glyphData.imageData.width, glyphData.imageData.height, 0,
            gl.RGBA, gl.UNSIGNED_BYTE, glyphData.imageData.data
        );
        
        // Set texture parameters for crisp rendering
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        
        return texture;
    }
    
    /**
     * Get rendering statistics
     * @returns {Object} Performance and quality statistics
     */
    getStats() {
        const hitRate = this.stats.subpixelHits / (this.stats.subpixelHits + this.stats.subpixelMisses);
        
        return {
            ...this.stats,
            cacheHitRate: hitRate,
            averageRenderTime: this.stats.renderTime / Math.max(1, this.stats.glyphsRendered),
            subpixelPrecision: this.options.subpixelPrecision,
            devicePixelRatio: this.options.devicePixelRatio,
            isHighDPI: this.options.devicePixelRatio > 1,
            rgbOptimizationEnabled: this.options.enableRGBSubpixels,
            clearTypeEnabled: this.options.enableClearType
        };
    }
    
    /**
     * Enable/disable subpixel features
     * @param {Object} options - Feature options
     */
    setSubpixelOptions(options) {
        Object.assign(this.options, options);
        
        // Clear cache when settings change
        this.subpixelCache.clear();
        this.stats.cacheSize = 0;
        
        console.log('🎨 Subpixel options updated:', options);
    }
    
    /**
     * Clear subpixel cache
     */
    clearCache() {
        this.subpixelCache.clear();
        this.stats.cacheSize = 0;
        console.log('🧹 Subpixel cache cleared');
    }
    
    /**
     * Test subpixel rendering quality
     * @returns {Object} Quality test results
     */
    testSubpixelQuality() {
        const testChars = ['A', 'g', 'M', 'i', 'l', '1', '0'];
        const results = [];
        
        for (const char of testChars) {
            // Render with and without subpixel positioning
            const regular = this.renderCharacterSubpixel(char, 0, 0, { fontSize: 16 });
            const subpixel = this.renderCharacterSubpixel(char, 0.33, 0.33, { fontSize: 16 });
            
            results.push({
                character: char,
                regularSharpness: this.calculateSharpness(regular.imageData),
                subpixelSharpness: this.calculateSharpness(subpixel.imageData),
                improvement: 0 // Will be calculated
            });
        }
        
        // Calculate improvements
        results.forEach(result => {
            result.improvement = (result.subpixelSharpness / result.regularSharpness - 1) * 100;
        });
        
        return results;
    }
    
    calculateSharpness(imageData) {
        // Simple edge detection for sharpness measurement
        const data = imageData.data;
        const width = imageData.width;
        let edgeStrength = 0;
        
        for (let y = 1; y < imageData.height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const i = (y * width + x) * 4;
                const current = data[i + 3]; // Alpha channel
                const right = data[i + 4 + 3];
                const bottom = data[(y + 1) * width * 4 + x * 4 + 3];
                
                edgeStrength += Math.abs(current - right) + Math.abs(current - bottom);
            }
        }
        
        return edgeStrength;
    }
    
    /**
     * Cleanup resources
     */
    destroy() {
        this.subpixelCache.clear();
        this.glyphCanvas = null;
        this.glyphContext = null;
        console.log('🧹 Subpixel renderer destroyed');
    }
}

// Export class
window.SubpixelRenderer = SubpixelRenderer;

console.log('🎨 Subpixel rendering module loaded');
