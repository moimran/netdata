/**
 * High-performance object pooling for memory optimization
 * Reduces garbage collection pressure by reusing objects
 */

class ObjectPool {
    constructor(createFn, resetFn, initialSize = 50, maxSize = 1000) {
        this.createFn = createFn;
        this.resetFn = resetFn;
        this.maxSize = maxSize;
        this.pool = [];
        this.stats = {
            created: 0,
            acquired: 0,
            released: 0,
            poolHits: 0,
            poolMisses: 0
        };
        
        // Pre-populate pool
        for (let i = 0; i < initialSize; i++) {
            this.pool.push(this.createFn());
            this.stats.created++;
        }
        
        console.log(`📦 ObjectPool initialized with ${initialSize} objects`);
    }
    
    acquire() {
        this.stats.acquired++;
        
        if (this.pool.length > 0) {
            this.stats.poolHits++;
            return this.pool.pop();
        } else {
            this.stats.poolMisses++;
            this.stats.created++;
            return this.createFn();
        }
    }
    
    release(obj) {
        if (this.pool.length < this.maxSize) {
            this.resetFn(obj);
            this.pool.push(obj);
            this.stats.released++;
        }
        // If pool is full, let object be garbage collected
    }
    
    getStats() {
        return {
            ...this.stats,
            poolSize: this.pool.length,
            hitRate: this.stats.poolHits / (this.stats.poolHits + this.stats.poolMisses),
            efficiency: this.stats.released / this.stats.acquired
        };
    }
    
    clear() {
        this.pool.length = 0;
        console.log('🧹 ObjectPool cleared');
    }
}

// Terminal line object pool
const terminalLinePool = new ObjectPool(
    () => ({
        text: '',
        attributes: [],
        timestamp: 0,
        dirty: false
    }),
    (line) => {
        line.text = '';
        line.attributes.length = 0;
        line.timestamp = 0;
        line.dirty = false;
    },
    100, // Initial size
    2000 // Max size
);

// WebSocket message object pool
const messagePool = new ObjectPool(
    () => ({
        type: '',
        data: null,
        timestamp: 0,
        size: 0
    }),
    (msg) => {
        msg.type = '';
        msg.data = null;
        msg.timestamp = 0;
        msg.size = 0;
    },
    50,
    500
);

// Buffer pool for binary data
const bufferPool = new ObjectPool(
    () => new ArrayBuffer(8192), // 8KB buffers
    (buffer) => {
        // ArrayBuffers don't need reset, they're just memory
    },
    20,
    100
);

// Typed array pool for efficient data handling
const uint8ArrayPool = new ObjectPool(
    () => new Uint8Array(4096), // 4KB arrays
    (array) => {
        array.fill(0); // Clear the array
    },
    30,
    200
);

/**
 * Ring buffer for efficient terminal history management
 * Avoids array shifting operations for better performance
 */
class RingBuffer {
    constructor(size) {
        this.buffer = new Array(size);
        this.size = size;
        this.head = 0;
        this.tail = 0;
        this.count = 0;
        this.stats = {
            pushes: 0,
            pops: 0,
            overwrites: 0
        };
    }
    
    push(item) {
        this.stats.pushes++;
        
        if (this.count === this.size) {
            // Buffer is full, overwrite oldest
            this.stats.overwrites++;
            this.head = (this.head + 1) % this.size;
        } else {
            this.count++;
        }
        
        this.buffer[this.tail] = item;
        this.tail = (this.tail + 1) % this.size;
    }
    
    pop() {
        if (this.count === 0) return undefined;
        
        this.stats.pops++;
        this.tail = (this.tail - 1 + this.size) % this.size;
        const item = this.buffer[this.tail];
        this.buffer[this.tail] = undefined; // Help GC
        this.count--;
        return item;
    }
    
    get(index) {
        if (index >= this.count) return undefined;
        const actualIndex = (this.head + index) % this.size;
        return this.buffer[actualIndex];
    }
    
    getLatest(count = 10) {
        const result = [];
        const start = Math.max(0, this.count - count);
        
        for (let i = start; i < this.count; i++) {
            result.push(this.get(i));
        }
        
        return result;
    }
    
    clear() {
        for (let i = 0; i < this.size; i++) {
            this.buffer[i] = undefined;
        }
        this.head = 0;
        this.tail = 0;
        this.count = 0;
    }
    
    getStats() {
        return {
            ...this.stats,
            size: this.size,
            count: this.count,
            utilization: this.count / this.size,
            efficiency: this.stats.overwrites / this.stats.pushes
        };
    }
}

/**
 * Performance-optimized terminal buffer
 */
class OptimizedTerminalBuffer extends RingBuffer {
    constructor(size = 10000) {
        super(size);
        this.searchIndex = new Map(); // For fast text search
        this.lastSearchUpdate = 0;
    }
    
    addLine(text, attributes = []) {
        const line = terminalLinePool.acquire();
        line.text = text;
        line.attributes = attributes;
        line.timestamp = performance.now();
        line.dirty = true;
        
        this.push(line);
        
        // Update search index periodically
        if (performance.now() - this.lastSearchUpdate > 1000) {
            this.updateSearchIndex();
        }
    }
    
    updateSearchIndex() {
        this.searchIndex.clear();
        
        for (let i = 0; i < this.count; i++) {
            const line = this.get(i);
            if (line && line.text) {
                const words = line.text.toLowerCase().split(/\s+/);
                words.forEach(word => {
                    if (word.length > 2) { // Only index meaningful words
                        if (!this.searchIndex.has(word)) {
                            this.searchIndex.set(word, []);
                        }
                        this.searchIndex.get(word).push(i);
                    }
                });
            }
        }
        
        this.lastSearchUpdate = performance.now();
        console.log(`🔍 Search index updated: ${this.searchIndex.size} unique words`);
    }
    
    search(query) {
        const results = [];
        const queryLower = query.toLowerCase();
        
        if (this.searchIndex.has(queryLower)) {
            const lineIndices = this.searchIndex.get(queryLower);
            lineIndices.forEach(index => {
                const line = this.get(index);
                if (line) {
                    results.push({ line, index });
                }
            });
        }
        
        return results;
    }
    
    releaseLine(line) {
        if (line) {
            terminalLinePool.release(line);
        }
    }
}

/**
 * Performance monitoring and statistics
 */
class PerformanceMonitor {
    constructor() {
        this.metrics = {
            fps: 0,
            frameTime: 0,
            memoryUsage: 0,
            gcCount: 0,
            poolStats: {},
            bufferStats: {}
        };
        
        this.frameCount = 0;
        this.lastFrameTime = performance.now();
        this.lastGCCount = 0;
        
        this.startMonitoring();
    }
    
    startMonitoring() {
        // Monitor FPS
        const measureFPS = () => {
            this.frameCount++;
            const now = performance.now();
            const deltaTime = now - this.lastFrameTime;
            
            if (deltaTime >= 1000) { // Update every second
                this.metrics.fps = (this.frameCount * 1000) / deltaTime;
                this.metrics.frameTime = deltaTime / this.frameCount;
                this.frameCount = 0;
                this.lastFrameTime = now;
            }
            
            requestAnimationFrame(measureFPS);
        };
        requestAnimationFrame(measureFPS);
        
        // Monitor memory usage
        setInterval(() => {
            if (performance.memory) {
                this.metrics.memoryUsage = performance.memory.usedJSHeapSize / (1024 * 1024); // MB
                
                // Detect GC cycles
                if (performance.memory.usedJSHeapSize < this.lastMemoryUsage * 0.9) {
                    this.metrics.gcCount++;
                }
                this.lastMemoryUsage = performance.memory.usedJSHeapSize;
            }
            
            // Collect pool statistics
            this.metrics.poolStats = {
                terminalLines: terminalLinePool.getStats(),
                messages: messagePool.getStats(),
                buffers: bufferPool.getStats(),
                uint8Arrays: uint8ArrayPool.getStats()
            };
            
        }, 2000);
    }
    
    getMetrics() {
        return { ...this.metrics };
    }
    
    logStats() {
        console.log('📊 Performance Metrics:', this.getMetrics());
    }
}

// Global instances
window.terminalLinePool = terminalLinePool;
window.messagePool = messagePool;
window.bufferPool = bufferPool;
window.uint8ArrayPool = uint8ArrayPool;
window.OptimizedTerminalBuffer = OptimizedTerminalBuffer;
window.RingBuffer = RingBuffer;
window.PerformanceMonitor = PerformanceMonitor;

// Initialize performance monitoring
const performanceMonitor = new PerformanceMonitor();
window.performanceMonitor = performanceMonitor;

console.log('🚀 High-performance object pools and buffers initialized');
