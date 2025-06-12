/**
 * Optimized Font Atlas for Terminal Rendering
 * Pre-generates and caches all character glyphs for maximum performance
 */

class OptimizedFontAtlas {
    constructor(options = {}) {
        this.options = {
            fontFamily: options.fontFamily || 'monospace',
            fontSize: options.fontSize || 16,
            fontWeight: options.fontWeight || 'normal',
            atlasSize: options.atlasSize || 2048, // 2048x2048 texture
            padding: options.padding || 2, // Padding between glyphs
            devicePixelRatio: options.devicePixelRatio || window.devicePixelRatio || 1,
            ...options
        };
        
        this.canvas = null;
        this.context = null;
        this.glyphCache = new Map();
        this.atlasTexture = null;
        this.currentX = 0;
        this.currentY = 0;
        this.rowHeight = 0;
        
        this.stats = {
            glyphsGenerated: 0,
            atlasUtilization: 0,
            cacheHits: 0,
            cacheMisses: 0,
            generationTime: 0
        };
        
        this.isGenerated = false;
        this.characterSets = {
            ascii: this.generateASCIIRange(),
            latin1: this.generateLatin1Range(),
            unicode: this.generateCommonUnicodeRanges()
        };
        
        console.log('🎨 Font atlas initialized');
    }
    
    generateASCIIRange() {
        const chars = [];
        for (let i = 32; i <= 126; i++) { // Printable ASCII
            chars.push(String.fromCharCode(i));
        }
        return chars;
    }
    
    generateLatin1Range() {
        const chars = [];
        for (let i = 160; i <= 255; i++) { // Latin-1 Supplement
            chars.push(String.fromCharCode(i));
        }
        return chars;
    }
    
    generateCommonUnicodeRanges() {
        const chars = [];
        
        // Common symbols and punctuation
        const ranges = [
            [0x2000, 0x206F], // General Punctuation
            [0x2070, 0x209F], // Superscripts and Subscripts
            [0x20A0, 0x20CF], // Currency Symbols
            [0x2100, 0x214F], // Letterlike Symbols
            [0x2190, 0x21FF], // Arrows
            [0x2200, 0x22FF], // Mathematical Operators
            [0x2300, 0x23FF], // Miscellaneous Technical
            [0x2500, 0x257F], // Box Drawing
            [0x2580, 0x259F], // Block Elements
        ];
        
        ranges.forEach(([start, end]) => {
            for (let i = start; i <= end; i++) {
                try {
                    const char = String.fromCharCode(i);
                    if (char && char.trim()) {
                        chars.push(char);
                    }
                } catch (e) {
                    // Skip invalid characters
                }
            }
        });
        
        return chars;
    }
    
    async generateAtlas(characterSet = 'ascii') {
        const startTime = performance.now();
        
        console.log(`🎨 Generating font atlas for ${characterSet} character set...`);
        
        // Create high-resolution canvas
        this.canvas = new OffscreenCanvas(
            this.options.atlasSize * this.options.devicePixelRatio,
            this.options.atlasSize * this.options.devicePixelRatio
        );
        
        this.context = this.canvas.getContext('2d');
        this.context.scale(this.options.devicePixelRatio, this.options.devicePixelRatio);
        
        // Setup font rendering
        this.setupFontRendering();
        
        // Get characters to render
        const characters = this.characterSets[characterSet] || this.characterSets.ascii;
        
        // Reset atlas state
        this.currentX = this.options.padding;
        this.currentY = this.options.padding;
        this.rowHeight = 0;
        this.glyphCache.clear();
        
        // Generate glyphs
        for (const char of characters) {
            await this.generateGlyph(char);
        }
        
        // Create texture from canvas
        this.atlasTexture = await createImageBitmap(this.canvas);
        
        this.isGenerated = true;
        this.stats.generationTime = performance.now() - startTime;
        this.stats.atlasUtilization = this.calculateAtlasUtilization();
        
        console.log(`✅ Font atlas generated in ${this.stats.generationTime.toFixed(2)}ms`);
        console.log(`📊 Atlas utilization: ${(this.stats.atlasUtilization * 100).toFixed(1)}%`);
        
        return this.atlasTexture;
    }
    
    setupFontRendering() {
        const ctx = this.context;
        
        // Setup font
        ctx.font = `${this.options.fontWeight} ${this.options.fontSize}px ${this.options.fontFamily}`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillStyle = '#ffffff';
        
        // Enable text rendering optimizations
        ctx.textRenderingOptimization = 'optimizeSpeed';
        
        // Measure character dimensions
        const metrics = ctx.measureText('M'); // Use 'M' as reference character
        this.charWidth = Math.ceil(metrics.width);
        this.charHeight = Math.ceil(this.options.fontSize * 1.2); // Add some line spacing
    }
    
    async generateGlyph(character) {
        const ctx = this.context;
        
        // Measure character
        const metrics = ctx.measureText(character);
        const width = Math.ceil(metrics.width) + this.options.padding * 2;
        const height = this.charHeight + this.options.padding * 2;
        
        // Check if we need to move to next row
        if (this.currentX + width > this.options.atlasSize) {
            this.currentX = this.options.padding;
            this.currentY += this.rowHeight + this.options.padding;
            this.rowHeight = 0;
        }
        
        // Check if we have space
        if (this.currentY + height > this.options.atlasSize) {
            console.warn('⚠️ Font atlas full, cannot add more characters');
            return null;
        }
        
        // Render character
        const x = this.currentX + this.options.padding;
        const y = this.currentY + this.options.padding;
        
        ctx.fillText(character, x, y);
        
        // Store glyph info
        const glyphInfo = {
            character: character,
            x: this.currentX,
            y: this.currentY,
            width: width,
            height: height,
            textureX: this.currentX / this.options.atlasSize,
            textureY: this.currentY / this.options.atlasSize,
            textureWidth: width / this.options.atlasSize,
            textureHeight: height / this.options.atlasSize,
            charWidth: this.charWidth,
            charHeight: this.charHeight
        };
        
        this.glyphCache.set(character, glyphInfo);
        
        // Update position
        this.currentX += width;
        this.rowHeight = Math.max(this.rowHeight, height);
        this.stats.glyphsGenerated++;
        
        return glyphInfo;
    }
    
    getGlyph(character) {
        if (this.glyphCache.has(character)) {
            this.stats.cacheHits++;
            return this.glyphCache.get(character);
        }
        
        this.stats.cacheMisses++;
        
        // Try to generate glyph on demand
        if (!this.isGenerated) {
            console.warn('⚠️ Font atlas not generated yet');
            return null;
        }
        
        // Generate missing glyph
        return this.generateGlyph(character);
    }
    
    calculateAtlasUtilization() {
        const totalPixels = this.options.atlasSize * this.options.atlasSize;
        let usedPixels = 0;
        
        this.glyphCache.forEach(glyph => {
            usedPixels += glyph.width * glyph.height;
        });
        
        return usedPixels / totalPixels;
    }
    
    getAtlasTexture() {
        return this.atlasTexture;
    }
    
    getAtlasCanvas() {
        return this.canvas;
    }
    
    getStats() {
        return {
            ...this.stats,
            cacheSize: this.glyphCache.size,
            hitRate: this.stats.cacheHits / (this.stats.cacheHits + this.stats.cacheMisses),
            atlasSize: this.options.atlasSize,
            charDimensions: {
                width: this.charWidth,
                height: this.charHeight
            }
        };
    }
    
    // Export atlas as data URL for debugging
    exportAtlas() {
        if (!this.canvas) return null;
        
        // Create regular canvas for export
        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = this.canvas.width;
        exportCanvas.height = this.canvas.height;
        
        const exportCtx = exportCanvas.getContext('2d');
        exportCtx.drawImage(this.canvas, 0, 0);
        
        return exportCanvas.toDataURL();
    }
    
    // Clear atlas and cache
    clear() {
        this.glyphCache.clear();
        this.currentX = 0;
        this.currentY = 0;
        this.rowHeight = 0;
        this.isGenerated = false;
        
        if (this.context) {
            this.context.clearRect(0, 0, this.options.atlasSize, this.options.atlasSize);
        }
        
        console.log('🧹 Font atlas cleared');
    }
}

// WebGL Font Renderer using the optimized atlas
class WebGLFontRenderer {
    constructor(gl, fontAtlas) {
        this.gl = gl;
        this.fontAtlas = fontAtlas;
        this.program = null;
        this.buffers = {};
        this.uniforms = {};
        this.attributes = {};
        
        this.initShaders();
        this.initBuffers();
        
        console.log('🎮 WebGL font renderer initialized');
    }
    
    initShaders() {
        const gl = this.gl;
        
        const vertexShaderSource = `
            attribute vec2 a_position;
            attribute vec2 a_texCoord;
            
            uniform vec2 u_resolution;
            uniform vec2 u_translation;
            
            varying vec2 v_texCoord;
            
            void main() {
                vec2 position = (a_position + u_translation) / u_resolution * 2.0 - 1.0;
                gl_Position = vec4(position * vec2(1, -1), 0, 1);
                v_texCoord = a_texCoord;
            }
        `;
        
        const fragmentShaderSource = `
            precision mediump float;
            
            uniform sampler2D u_texture;
            uniform vec4 u_color;
            
            varying vec2 v_texCoord;
            
            void main() {
                vec4 texColor = texture2D(u_texture, v_texCoord);
                gl_FragColor = vec4(u_color.rgb, texColor.a * u_color.a);
            }
        `;
        
        this.program = this.createProgram(vertexShaderSource, fragmentShaderSource);
        
        // Get attribute and uniform locations
        this.attributes.position = gl.getAttribLocation(this.program, 'a_position');
        this.attributes.texCoord = gl.getAttribLocation(this.program, 'a_texCoord');
        
        this.uniforms.resolution = gl.getUniformLocation(this.program, 'u_resolution');
        this.uniforms.translation = gl.getUniformLocation(this.program, 'u_translation');
        this.uniforms.texture = gl.getUniformLocation(this.program, 'u_texture');
        this.uniforms.color = gl.getUniformLocation(this.program, 'u_color');
    }
    
    createProgram(vertexSource, fragmentSource) {
        const gl = this.gl;
        
        const vertexShader = this.createShader(gl.VERTEX_SHADER, vertexSource);
        const fragmentShader = this.createShader(gl.FRAGMENT_SHADER, fragmentSource);
        
        const program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error('Failed to link shader program:', gl.getProgramInfoLog(program));
            return null;
        }
        
        return program;
    }
    
    createShader(type, source) {
        const gl = this.gl;
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('Failed to compile shader:', gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        
        return shader;
    }
    
    initBuffers() {
        const gl = this.gl;
        
        // Create buffers for position and texture coordinates
        this.buffers.position = gl.createBuffer();
        this.buffers.texCoord = gl.createBuffer();
    }
    
    renderText(text, x, y, color = [1, 1, 1, 1]) {
        const gl = this.gl;
        
        if (!this.fontAtlas.isGenerated) {
            console.warn('⚠️ Font atlas not ready for rendering');
            return;
        }
        
        gl.useProgram(this.program);
        
        // Set uniforms
        gl.uniform2f(this.uniforms.resolution, gl.canvas.width, gl.canvas.height);
        gl.uniform2f(this.uniforms.translation, x, y);
        gl.uniform4f(this.uniforms.color, ...color);
        
        // Bind atlas texture
        const atlasTexture = this.createTextureFromAtlas();
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, atlasTexture);
        gl.uniform1i(this.uniforms.texture, 0);
        
        // Render each character
        let currentX = 0;
        for (const char of text) {
            const glyph = this.fontAtlas.getGlyph(char);
            if (glyph) {
                this.renderGlyph(glyph, currentX, 0);
                currentX += glyph.charWidth;
            }
        }
    }
    
    renderGlyph(glyph, x, y) {
        const gl = this.gl;
        
        // Create quad vertices
        const positions = new Float32Array([
            x, y,
            x + glyph.width, y,
            x, y + glyph.height,
            x + glyph.width, y + glyph.height
        ]);
        
        const texCoords = new Float32Array([
            glyph.textureX, glyph.textureY,
            glyph.textureX + glyph.textureWidth, glyph.textureY,
            glyph.textureX, glyph.textureY + glyph.textureHeight,
            glyph.textureX + glyph.textureWidth, glyph.textureY + glyph.textureHeight
        ]);
        
        // Bind and upload position data
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.position);
        gl.bufferData(gl.ARRAY_BUFFER, positions, gl.DYNAMIC_DRAW);
        gl.enableVertexAttribArray(this.attributes.position);
        gl.vertexAttribPointer(this.attributes.position, 2, gl.FLOAT, false, 0, 0);
        
        // Bind and upload texture coordinate data
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.texCoord);
        gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.DYNAMIC_DRAW);
        gl.enableVertexAttribArray(this.attributes.texCoord);
        gl.vertexAttribPointer(this.attributes.texCoord, 2, gl.FLOAT, false, 0, 0);
        
        // Draw quad
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    
    createTextureFromAtlas() {
        const gl = this.gl;
        const texture = gl.createTexture();
        
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.fontAtlas.getAtlasTexture());
        
        // Set texture parameters
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        
        return texture;
    }
}

// Export classes
window.OptimizedFontAtlas = OptimizedFontAtlas;
window.WebGLFontRenderer = WebGLFontRenderer;

console.log('🎨 Font atlas optimization module loaded');
