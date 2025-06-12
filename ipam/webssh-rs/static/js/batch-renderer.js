/**
 * Advanced Batch Rendering System for Terminal
 * Renders thousands of characters in single WebGL draw calls
 */

class BatchRenderer {
    constructor(gl, options = {}) {
        this.gl = gl;
        this.options = {
            maxBatchSize: options.maxBatchSize || 2048, // Characters per batch
            maxBatches: options.maxBatches || 64, // Maximum concurrent batches
            enableInstancing: options.enableInstancing !== false,
            enableTextureAtlas: options.enableTextureAtlas !== false,
            bufferUsage: options.bufferUsage || gl.DYNAMIC_DRAW,
            ...options
        };
        
        // Batch management
        this.batches = [];
        this.currentBatch = null;
        this.batchPool = [];
        this.activeBatches = new Set();
        
        // WebGL resources
        this.program = null;
        this.buffers = {};
        this.uniforms = {};
        this.attributes = {};
        this.vao = null;
        
        // Vertex data arrays (pre-allocated for performance)
        this.positions = new Float32Array(this.options.maxBatchSize * 8); // 4 vertices * 2 coords
        this.texCoords = new Float32Array(this.options.maxBatchSize * 8); // 4 vertices * 2 coords
        this.colors = new Float32Array(this.options.maxBatchSize * 16); // 4 vertices * 4 components
        this.indices = new Uint16Array(this.options.maxBatchSize * 6); // 2 triangles * 3 vertices
        
        // Performance metrics
        this.stats = {
            batchesCreated: 0,
            batchesRendered: 0,
            charactersRendered: 0,
            drawCalls: 0,
            averageBatchSize: 0,
            renderTime: 0,
            gpuMemoryUsed: 0
        };
        
        this.isInitialized = false;
        
        console.log('🎨 Batch renderer initialized with max batch size:', this.options.maxBatchSize);
    }
    
    async initialize() {
        if (this.isInitialized) return;
        
        console.log('🚀 Initializing batch renderer...');
        
        // Create shader program
        this.createShaderProgram();
        
        // Create vertex array object
        if (this.gl.createVertexArray) {
            this.vao = this.gl.createVertexArray();
        }
        
        // Create and setup buffers
        this.createBuffers();
        
        // Pre-generate indices for quads
        this.generateQuadIndices();
        
        // Initialize batch pool
        this.initializeBatchPool();
        
        this.isInitialized = true;
        console.log('✅ Batch renderer ready');
    }
    
    createShaderProgram() {
        const gl = this.gl;
        
        const vertexShaderSource = `
            attribute vec2 a_position;
            attribute vec2 a_texCoord;
            attribute vec4 a_color;
            
            uniform vec2 u_resolution;
            uniform mat4 u_projection;
            
            varying vec2 v_texCoord;
            varying vec4 v_color;
            
            void main() {
                // Convert screen coordinates to clip space
                vec2 clipSpace = ((a_position / u_resolution) * 2.0) - 1.0;
                gl_Position = u_projection * vec4(clipSpace * vec2(1, -1), 0, 1);
                
                v_texCoord = a_texCoord;
                v_color = a_color;
            }
        `;
        
        const fragmentShaderSource = `
            precision mediump float;
            
            uniform sampler2D u_texture;
            uniform float u_opacity;
            
            varying vec2 v_texCoord;
            varying vec4 v_color;
            
            void main() {
                vec4 texColor = texture2D(u_texture, v_texCoord);
                gl_FragColor = vec4(v_color.rgb, texColor.a * v_color.a * u_opacity);
            }
        `;
        
        this.program = this.createProgram(vertexShaderSource, fragmentShaderSource);
        
        // Get attribute and uniform locations
        this.attributes.position = gl.getAttribLocation(this.program, 'a_position');
        this.attributes.texCoord = gl.getAttribLocation(this.program, 'a_texCoord');
        this.attributes.color = gl.getAttribLocation(this.program, 'a_color');
        
        this.uniforms.resolution = gl.getUniformLocation(this.program, 'u_resolution');
        this.uniforms.projection = gl.getUniformLocation(this.program, 'u_projection');
        this.uniforms.texture = gl.getUniformLocation(this.program, 'u_texture');
        this.uniforms.opacity = gl.getUniformLocation(this.program, 'u_opacity');
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
            console.error('Failed to link batch renderer program:', gl.getProgramInfoLog(program));
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
            console.error('Failed to compile batch renderer shader:', gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        
        return shader;
    }
    
    createBuffers() {
        const gl = this.gl;
        
        // Position buffer
        this.buffers.position = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.position);
        gl.bufferData(gl.ARRAY_BUFFER, this.positions, this.options.bufferUsage);
        
        // Texture coordinate buffer
        this.buffers.texCoord = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.texCoord);
        gl.bufferData(gl.ARRAY_BUFFER, this.texCoords, this.options.bufferUsage);
        
        // Color buffer
        this.buffers.color = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.color);
        gl.bufferData(gl.ARRAY_BUFFER, this.colors, this.options.bufferUsage);
        
        // Index buffer
        this.buffers.index = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers.index);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indices, gl.STATIC_DRAW);
        
        console.log('📦 Batch renderer buffers created');
    }
    
    generateQuadIndices() {
        // Pre-generate indices for quad rendering (2 triangles per character)
        for (let i = 0; i < this.options.maxBatchSize; i++) {
            const baseVertex = i * 4;
            const baseIndex = i * 6;
            
            // First triangle
            this.indices[baseIndex] = baseVertex;
            this.indices[baseIndex + 1] = baseVertex + 1;
            this.indices[baseIndex + 2] = baseVertex + 2;
            
            // Second triangle
            this.indices[baseIndex + 3] = baseVertex + 2;
            this.indices[baseIndex + 4] = baseVertex + 1;
            this.indices[baseIndex + 5] = baseVertex + 3;
        }
    }
    
    initializeBatchPool() {
        // Pre-create batch objects to avoid allocation during rendering
        for (let i = 0; i < this.options.maxBatches; i++) {
            this.batchPool.push(this.createBatch());
        }
        console.log(`📦 Initialized batch pool with ${this.options.maxBatches} batches`);
    }
    
    createBatch() {
        return {
            characters: [],
            vertexCount: 0,
            indexCount: 0,
            texture: null,
            opacity: 1.0,
            isDirty: false,
            id: this.stats.batchesCreated++
        };
    }
    
    /**
     * Begin a new batch
     * @param {WebGLTexture} texture - Font atlas texture
     * @param {number} opacity - Batch opacity
     * @returns {Object} Batch object
     */
    beginBatch(texture, opacity = 1.0) {
        // Get batch from pool or create new one
        let batch = this.batchPool.pop();
        if (!batch) {
            batch = this.createBatch();
            console.warn('⚠️ Batch pool exhausted, creating new batch');
        }
        
        // Reset batch
        batch.characters.length = 0;
        batch.vertexCount = 0;
        batch.indexCount = 0;
        batch.texture = texture;
        batch.opacity = opacity;
        batch.isDirty = true;
        
        this.currentBatch = batch;
        this.activeBatches.add(batch);
        
        return batch;
    }
    
    /**
     * Add character to current batch
     * @param {Object} char - Character data {x, y, width, height, texX, texY, texW, texH, color}
     */
    addCharacter(char) {
        if (!this.currentBatch) {
            console.error('❌ No active batch - call beginBatch() first');
            return;
        }
        
        const batch = this.currentBatch;
        
        // Check if batch is full
        if (batch.characters.length >= this.options.maxBatchSize) {
            console.warn('⚠️ Batch full, auto-flushing');
            this.flushBatch(batch);
            this.beginBatch(batch.texture, batch.opacity);
        }
        
        batch.characters.push(char);
        batch.isDirty = true;
    }
    
    /**
     * Add multiple characters to batch efficiently
     * @param {Array} characters - Array of character data
     */
    addCharacters(characters) {
        for (const char of characters) {
            this.addCharacter(char);
        }
    }
    
    /**
     * Flush current batch and render it
     */
    flushCurrentBatch() {
        if (this.currentBatch) {
            this.flushBatch(this.currentBatch);
            this.currentBatch = null;
        }
    }
    
    /**
     * Flush specific batch and render it
     * @param {Object} batch - Batch to flush
     */
    flushBatch(batch) {
        if (!batch || batch.characters.length === 0) return;
        
        const startTime = performance.now();
        
        // Build vertex data
        this.buildVertexData(batch);
        
        // Upload to GPU and render
        this.renderBatch(batch);
        
        // Update stats
        this.stats.batchesRendered++;
        this.stats.charactersRendered += batch.characters.length;
        this.stats.drawCalls++;
        this.stats.renderTime += performance.now() - startTime;
        this.stats.averageBatchSize = this.stats.charactersRendered / this.stats.batchesRendered;
        
        // Return batch to pool
        this.activeBatches.delete(batch);
        this.batchPool.push(batch);
    }
    
    buildVertexData(batch) {
        const characters = batch.characters;
        let vertexIndex = 0;
        let colorIndex = 0;
        
        for (let i = 0; i < characters.length; i++) {
            const char = characters[i];
            const baseVertex = i * 8; // 4 vertices * 2 coords
            const baseColor = i * 16; // 4 vertices * 4 components
            
            // Quad vertices (2 triangles)
            // Top-left
            this.positions[baseVertex] = char.x;
            this.positions[baseVertex + 1] = char.y;
            this.texCoords[baseVertex] = char.texX;
            this.texCoords[baseVertex + 1] = char.texY;
            
            // Top-right
            this.positions[baseVertex + 2] = char.x + char.width;
            this.positions[baseVertex + 3] = char.y;
            this.texCoords[baseVertex + 2] = char.texX + char.texW;
            this.texCoords[baseVertex + 3] = char.texY;
            
            // Bottom-left
            this.positions[baseVertex + 4] = char.x;
            this.positions[baseVertex + 5] = char.y + char.height;
            this.texCoords[baseVertex + 4] = char.texX;
            this.texCoords[baseVertex + 5] = char.texY + char.texH;
            
            // Bottom-right
            this.positions[baseVertex + 6] = char.x + char.width;
            this.positions[baseVertex + 7] = char.y + char.height;
            this.texCoords[baseVertex + 6] = char.texX + char.texW;
            this.texCoords[baseVertex + 7] = char.texY + char.texH;
            
            // Colors for all 4 vertices
            const color = char.color || [1, 1, 1, 1];
            for (let v = 0; v < 4; v++) {
                const colorOffset = baseColor + v * 4;
                this.colors[colorOffset] = color[0];
                this.colors[colorOffset + 1] = color[1];
                this.colors[colorOffset + 2] = color[2];
                this.colors[colorOffset + 3] = color[3];
            }
        }
        
        batch.vertexCount = characters.length * 4;
        batch.indexCount = characters.length * 6;
    }
    
    renderBatch(batch) {
        const gl = this.gl;
        
        // Use shader program
        gl.useProgram(this.program);
        
        // Bind vertex array object if available
        if (this.vao) {
            gl.bindVertexArray(this.vao);
        }
        
        // Set uniforms
        gl.uniform2f(this.uniforms.resolution, gl.canvas.width, gl.canvas.height);
        gl.uniform1f(this.uniforms.opacity, batch.opacity);
        
        // Bind texture
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, batch.texture);
        gl.uniform1i(this.uniforms.texture, 0);
        
        // Upload vertex data
        this.uploadVertexData(batch);
        
        // Setup vertex attributes
        this.setupVertexAttributes();
        
        // Draw
        gl.drawElements(gl.TRIANGLES, batch.indexCount, gl.UNSIGNED_SHORT, 0);
        
        // Cleanup
        if (this.vao) {
            gl.bindVertexArray(null);
        }
    }
    
    uploadVertexData(batch) {
        const gl = this.gl;
        
        // Upload positions
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.position);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.positions, 0, batch.vertexCount * 2);
        
        // Upload texture coordinates
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.texCoord);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.texCoords, 0, batch.vertexCount * 2);
        
        // Upload colors
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.color);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.colors, 0, batch.vertexCount * 4);
    }
    
    setupVertexAttributes() {
        const gl = this.gl;
        
        // Position attribute
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.position);
        gl.enableVertexAttribArray(this.attributes.position);
        gl.vertexAttribPointer(this.attributes.position, 2, gl.FLOAT, false, 0, 0);
        
        // Texture coordinate attribute
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.texCoord);
        gl.enableVertexAttribArray(this.attributes.texCoord);
        gl.vertexAttribPointer(this.attributes.texCoord, 2, gl.FLOAT, false, 0, 0);
        
        // Color attribute
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.color);
        gl.enableVertexAttribArray(this.attributes.color);
        gl.vertexAttribPointer(this.attributes.color, 4, gl.FLOAT, false, 0, 0);
        
        // Bind index buffer
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers.index);
    }
    
    /**
     * Flush all active batches
     */
    flushAll() {
        const batches = Array.from(this.activeBatches);
        for (const batch of batches) {
            this.flushBatch(batch);
        }
        this.currentBatch = null;
    }
    
    /**
     * Get rendering statistics
     * @returns {Object} Performance statistics
     */
    getStats() {
        return {
            ...this.stats,
            activeBatches: this.activeBatches.size,
            pooledBatches: this.batchPool.length,
            maxBatchSize: this.options.maxBatchSize,
            averageDrawCallsPerFrame: this.stats.drawCalls / Math.max(1, this.stats.batchesRendered),
            charactersPerDrawCall: this.stats.charactersRendered / Math.max(1, this.stats.drawCalls)
        };
    }
    
    /**
     * Clear all statistics
     */
    clearStats() {
        this.stats = {
            batchesCreated: 0,
            batchesRendered: 0,
            charactersRendered: 0,
            drawCalls: 0,
            averageBatchSize: 0,
            renderTime: 0,
            gpuMemoryUsed: 0
        };
    }
    
    /**
     * Cleanup resources
     */
    destroy() {
        const gl = this.gl;
        
        // Delete buffers
        Object.values(this.buffers).forEach(buffer => {
            if (buffer) gl.deleteBuffer(buffer);
        });
        
        // Delete program
        if (this.program) {
            gl.deleteProgram(this.program);
        }
        
        // Delete VAO
        if (this.vao) {
            gl.deleteVertexArray(this.vao);
        }
        
        console.log('🧹 Batch renderer destroyed');
    }
}

// Export class
window.BatchRenderer = BatchRenderer;

console.log('🎨 Batch rendering module loaded');
