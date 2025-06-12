/**
 * Advanced Cache Management System
 * Sophisticated memory management with multiple cache strategies
 */

class AdvancedCacheManager {
    constructor(options = {}) {
        this.options = {
            maxMemoryMB: options.maxMemoryMB || 100, // 100MB default
            enableLRU: options.enableLRU !== false,
            enableLFU: options.enableLFU !== false,
            enableTTL: options.enableTTL !== false,
            enableCompression: options.enableCompression !== false,
            enablePredictive: options.enablePredictive !== false,
            gcInterval: options.gcInterval || 30000, // 30 seconds
            compressionThreshold: options.compressionThreshold || 1024, // 1KB
            ...options
        };
        
        // Multiple cache strategies
        this.caches = {
            lru: new AdvancedLRUCache(10000), // Least Recently Used
            lfu: new AdvancedLFUCache(5000),  // Least Frequently Used
            ttl: new AdvancedTTLCache(5000),  // Time To Live
            predictive: new AdvancedPredictiveCache(2000) // Predictive caching
        };
        
        // Memory tracking
        this.memoryUsage = {
            current: 0,
            peak: 0,
            allocated: 0,
            freed: 0
        };
        
        // Performance metrics
        this.stats = {
            hits: 0,
            misses: 0,
            evictions: 0,
            compressions: 0,
            decompressions: 0,
            gcRuns: 0,
            memoryReclaimed: 0,
            predictiveHits: 0
        };
        
        // Garbage collection timer
        this.gcTimer = null;
        
        // Memory pressure monitoring
        this.memoryPressure = 'low'; // low, medium, high, critical
        
        this.isInitialized = false;
        
        // Advanced cache manager initialized
    }
    
    async initialize() {
        if (this.isInitialized) return;
        
        console.log('🚀 Initializing advanced cache manager...');
        
        // Setup memory monitoring
        this.setupMemoryMonitoring();
        
        // Start garbage collection timer
        this.startGarbageCollection();
        
        // Setup performance observer if available
        this.setupPerformanceObserver();
        
        this.isInitialized = true;
        // Advanced cache manager ready
    }
    
    setupMemoryMonitoring() {
        // Monitor memory usage periodically
        setInterval(() => {
            this.updateMemoryUsage();
            this.assessMemoryPressure();
            this.handleMemoryPressure();
        }, 5000); // Every 5 seconds
    }
    
    updateMemoryUsage() {
        if (performance.memory) {
            const used = performance.memory.usedJSHeapSize;
            this.memoryUsage.current = used / (1024 * 1024); // Convert to MB
            this.memoryUsage.peak = Math.max(this.memoryUsage.peak, this.memoryUsage.current);
        }
    }
    
    assessMemoryPressure() {
        const usagePercent = this.memoryUsage.current / this.options.maxMemoryMB;
        
        if (usagePercent > 0.9) {
            this.memoryPressure = 'critical';
        } else if (usagePercent > 0.7) {
            this.memoryPressure = 'high';
        } else if (usagePercent > 0.5) {
            this.memoryPressure = 'medium';
        } else {
            this.memoryPressure = 'low';
        }
    }
    
    handleMemoryPressure() {
        switch (this.memoryPressure) {
            case 'critical':
                this.aggressiveCleanup();
                break;
            case 'high':
                this.moderateCleanup();
                break;
            case 'medium':
                this.lightCleanup();
                break;
            default:
                // No action needed for low pressure
                break;
        }
    }
    
    aggressiveCleanup() {
        console.log('🚨 Critical memory pressure - aggressive cleanup');
        
        // Clear least important caches first
        this.caches.predictive.clear();
        this.caches.ttl.clear();
        
        // Reduce other cache sizes
        this.caches.lru.resize(5000);
        this.caches.lfu.resize(2500);
        
        // Force garbage collection if available
        if (window.gc) {
            window.gc();
        }
        
        this.stats.gcRuns++;
    }
    
    moderateCleanup() {
        console.log('⚠️ High memory pressure - moderate cleanup');
        
        // Clear predictive cache
        this.caches.predictive.clear();
        
        // Reduce TTL cache
        this.caches.ttl.resize(2500);
        
        this.stats.gcRuns++;
    }
    
    lightCleanup() {
        // Just clean expired TTL entries
        this.caches.ttl.cleanExpired();
    }
    
    startGarbageCollection() {
        this.gcTimer = setInterval(() => {
            this.runGarbageCollection();
        }, this.options.gcInterval);
    }
    
    runGarbageCollection() {
        const startMemory = this.memoryUsage.current;
        
        // Clean expired entries
        this.caches.ttl.cleanExpired();
        
        // Compress large entries if enabled
        if (this.options.enableCompression) {
            this.compressLargeEntries();
        }
        
        // Update predictive cache
        if (this.options.enablePredictive) {
            this.caches.predictive.updatePredictions();
        }
        
        const endMemory = this.memoryUsage.current;
        const reclaimed = startMemory - endMemory;
        
        if (reclaimed > 0) {
            this.stats.memoryReclaimed += reclaimed;
            console.log(`♻️ GC reclaimed ${reclaimed.toFixed(1)}MB`);
        }
        
        this.stats.gcRuns++;
    }
    
    compressLargeEntries() {
        Object.values(this.caches).forEach(cache => {
            if (cache.compressLargeEntries) {
                const compressed = cache.compressLargeEntries(this.options.compressionThreshold);
                this.stats.compressions += compressed;
            }
        });
    }
    
    setupPerformanceObserver() {
        if (typeof PerformanceObserver !== 'undefined') {
            try {
                const observer = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        if (entry.entryType === 'measure') {
                            // Track performance measurements
                            this.trackPerformanceMeasure(entry);
                        }
                    }
                });
                
                observer.observe({ entryTypes: ['measure'] });
            } catch (e) {
                console.warn('Performance observer not available:', e);
            }
        }
    }
    
    trackPerformanceMeasure(entry) {
        // Use performance data to improve caching strategies
        if (entry.name.includes('cache')) {
            // Adjust cache strategies based on performance
            this.optimizeCacheStrategies(entry);
        }
    }
    
    optimizeCacheStrategies(entry) {
        // Dynamic optimization based on performance data
        if (entry.duration > 10) { // Slow operation
            // Increase cache sizes for slow operations
            this.caches.lru.increaseSize(1000);
        }
    }
    
    /**
     * Get value from cache with intelligent strategy selection
     * @param {string} key - Cache key
     * @param {Object} options - Cache options
     * @returns {*} Cached value or null
     */
    get(key, options = {}) {
        const { strategy = 'auto', ttl, priority = 'normal' } = options;
        
        let value = null;
        let hitCache = null;
        
        // Try different cache strategies
        if (strategy === 'auto' || strategy === 'lru') {
            value = this.caches.lru.get(key);
            if (value !== null) hitCache = 'lru';
        }
        
        if (value === null && (strategy === 'auto' || strategy === 'lfu')) {
            value = this.caches.lfu.get(key);
            if (value !== null) hitCache = 'lfu';
        }
        
        if (value === null && (strategy === 'auto' || strategy === 'ttl')) {
            value = this.caches.ttl.get(key);
            if (value !== null) hitCache = 'ttl';
        }
        
        if (value === null && (strategy === 'auto' || strategy === 'predictive')) {
            value = this.caches.predictive.get(key);
            if (value !== null) {
                hitCache = 'predictive';
                this.stats.predictiveHits++;
            }
        }
        
        // Update stats
        if (value !== null) {
            this.stats.hits++;
            console.log(`💾 Cache hit (${hitCache}): ${key}`);
        } else {
            this.stats.misses++;
        }
        
        return value;
    }
    
    /**
     * Set value in cache with intelligent strategy selection
     * @param {string} key - Cache key
     * @param {*} value - Value to cache
     * @param {Object} options - Cache options
     */
    set(key, value, options = {}) {
        const { 
            strategy = 'auto', 
            ttl = 300000, // 5 minutes default
            priority = 'normal',
            compress = false 
        } = options;
        
        // Calculate value size
        const size = this.calculateSize(value);
        
        // Compress if needed
        let finalValue = value;
        if (compress || (this.options.enableCompression && size > this.options.compressionThreshold)) {
            finalValue = this.compressValue(value);
            this.stats.compressions++;
        }
        
        // Store in appropriate caches based on strategy
        if (strategy === 'auto') {
            // Use multiple strategies for auto mode
            this.caches.lru.set(key, finalValue, { size });
            
            if (priority === 'high') {
                this.caches.lfu.set(key, finalValue, { size });
            }
            
            if (ttl) {
                this.caches.ttl.set(key, finalValue, { ttl, size });
            }
        } else {
            // Use specific strategy
            if (this.caches[strategy]) {
                this.caches[strategy].set(key, finalValue, { ttl, size, priority });
            }
        }
        
        // Update memory tracking
        this.memoryUsage.allocated += size;
        
        console.log(`💾 Cache set (${strategy}): ${key} (${size} bytes)`);
    }
    
    calculateSize(value) {
        // Estimate memory size of value
        if (typeof value === 'string') {
            return value.length * 2; // UTF-16
        } else if (typeof value === 'object') {
            return JSON.stringify(value).length * 2;
        } else {
            return 8; // Primitive types
        }
    }
    
    compressValue(value) {
        // Simple compression simulation
        if (typeof value === 'string') {
            // Use a simple compression algorithm
            return {
                compressed: true,
                data: value.replace(/(.{2,}?)\1+/g, '$1'), // Remove repeated patterns
                originalSize: value.length
            };
        }
        return value;
    }
    
    decompressValue(compressedValue) {
        if (compressedValue && compressedValue.compressed) {
            this.stats.decompressions++;
            return compressedValue.data;
        }
        return compressedValue;
    }
    
    /**
     * Delete from all caches
     * @param {string} key - Cache key
     */
    delete(key) {
        let deleted = false;
        
        Object.values(this.caches).forEach(cache => {
            if (cache.delete(key)) {
                deleted = true;
            }
        });
        
        return deleted;
    }
    
    /**
     * Clear all caches
     */
    clear() {
        Object.values(this.caches).forEach(cache => cache.clear());
        this.memoryUsage.allocated = 0;
        console.log('🧹 All caches cleared');
    }
    
    /**
     * Prefetch data predictively
     * @param {string} key - Key to prefetch
     * @param {Function} loader - Function to load data
     */
    async prefetch(key, loader) {
        if (this.options.enablePredictive && !this.get(key)) {
            try {
                const value = await loader();
                this.set(key, value, { strategy: 'predictive' });
                console.log(`🔮 Prefetched: ${key}`);
            } catch (e) {
                console.warn(`Failed to prefetch ${key}:`, e);
            }
        }
    }
    
    /**
     * Get comprehensive cache statistics
     * @returns {Object} Cache statistics
     */
    getStats() {
        const hitRate = this.stats.hits / (this.stats.hits + this.stats.misses);
        
        return {
            ...this.stats,
            hitRate: hitRate,
            memoryUsage: this.memoryUsage,
            memoryPressure: this.memoryPressure,
            cacheStats: {
                lru: this.caches.lru.getStats(),
                lfu: this.caches.lfu.getStats(),
                ttl: this.caches.ttl.getStats(),
                predictive: this.caches.predictive.getStats()
            },
            efficiency: {
                hitRate: hitRate,
                compressionRatio: this.stats.compressions > 0 ? 
                    this.stats.decompressions / this.stats.compressions : 0,
                memoryEfficiency: this.memoryUsage.allocated > 0 ? 
                    this.memoryUsage.freed / this.memoryUsage.allocated : 0
            }
        };
    }
    
    /**
     * Optimize cache configuration based on usage patterns
     */
    optimize() {
        const stats = this.getStats();
        
        // Adjust cache sizes based on hit rates
        if (stats.cacheStats.lru.hitRate > 0.8) {
            this.caches.lru.increaseSize(1000);
        }
        
        if (stats.cacheStats.predictive.hitRate > 0.6) {
            this.caches.predictive.increaseSize(500);
        }
        
        console.log('🎯 Cache configuration optimized');
    }
    
    /**
     * Cleanup resources
     */
    destroy() {
        if (this.gcTimer) {
            clearInterval(this.gcTimer);
        }
        
        this.clear();
        console.log('🧹 Advanced cache manager destroyed');
    }
}

// Base cache classes would be implemented here
// For brevity, showing simplified versions

class AdvancedLRUCache {
    constructor(maxSize) {
        this.maxSize = maxSize;
        this.cache = new Map();
        this.stats = { hits: 0, misses: 0, evictions: 0 };
    }
    
    get(key) {
        if (this.cache.has(key)) {
            const value = this.cache.get(key);
            this.cache.delete(key);
            this.cache.set(key, value); // Move to end
            this.stats.hits++;
            return value;
        }
        this.stats.misses++;
        return null;
    }
    
    set(key, value, options = {}) {
        if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
            this.stats.evictions++;
        }
        this.cache.set(key, value);
    }
    
    delete(key) { return this.cache.delete(key); }
    clear() { this.cache.clear(); }
    resize(newSize) { this.maxSize = newSize; }
    increaseSize(amount) { this.maxSize += amount; }
    getStats() { return { ...this.stats, size: this.cache.size, maxSize: this.maxSize, hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) }; }
}

class AdvancedLFUCache {
    constructor(maxSize) {
        this.maxSize = maxSize;
        this.cache = new Map();
        this.frequencies = new Map();
        this.stats = { hits: 0, misses: 0, evictions: 0 };
    }
    
    get(key) {
        if (this.cache.has(key)) {
            this.frequencies.set(key, (this.frequencies.get(key) || 0) + 1);
            this.stats.hits++;
            return this.cache.get(key);
        }
        this.stats.misses++;
        return null;
    }
    
    set(key, value) {
        if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
            const lfuKey = this.findLFUKey();
            this.cache.delete(lfuKey);
            this.frequencies.delete(lfuKey);
            this.stats.evictions++;
        }
        this.cache.set(key, value);
        this.frequencies.set(key, 1);
    }
    
    findLFUKey() {
        let minFreq = Infinity;
        let lfuKey = null;
        for (const [key, freq] of this.frequencies) {
            if (freq < minFreq) {
                minFreq = freq;
                lfuKey = key;
            }
        }
        return lfuKey;
    }
    
    delete(key) { this.frequencies.delete(key); return this.cache.delete(key); }
    clear() { this.cache.clear(); this.frequencies.clear(); }
    resize(newSize) { this.maxSize = newSize; }
    increaseSize(amount) { this.maxSize += amount; }
    getStats() { return { ...this.stats, size: this.cache.size, maxSize: this.maxSize, hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) }; }
}

class AdvancedTTLCache {
    constructor(maxSize) {
        this.maxSize = maxSize;
        this.cache = new Map();
        this.timers = new Map();
        this.stats = { hits: 0, misses: 0, evictions: 0, expired: 0 };
    }
    
    get(key) {
        if (this.cache.has(key)) {
            this.stats.hits++;
            return this.cache.get(key);
        }
        this.stats.misses++;
        return null;
    }
    
    set(key, value, options = {}) {
        const ttl = options.ttl || 300000; // 5 minutes default
        
        if (this.timers.has(key)) {
            clearTimeout(this.timers.get(key));
        }
        
        this.cache.set(key, value);
        
        const timer = setTimeout(() => {
            this.cache.delete(key);
            this.timers.delete(key);
            this.stats.expired++;
        }, ttl);
        
        this.timers.set(key, timer);
    }
    
    cleanExpired() {
        // Timers handle expiration automatically
    }
    
    delete(key) {
        if (this.timers.has(key)) {
            clearTimeout(this.timers.get(key));
            this.timers.delete(key);
        }
        return this.cache.delete(key);
    }
    
    clear() {
        this.timers.forEach(timer => clearTimeout(timer));
        this.cache.clear();
        this.timers.clear();
    }
    
    resize(newSize) { this.maxSize = newSize; }
    getStats() { return { ...this.stats, size: this.cache.size, maxSize: this.maxSize, hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) }; }
}

class AdvancedPredictiveCache {
    constructor(maxSize) {
        this.maxSize = maxSize;
        this.cache = new Map();
        this.accessPatterns = new Map();
        this.stats = { hits: 0, misses: 0, predictions: 0 };
    }
    
    get(key) {
        this.recordAccess(key);
        if (this.cache.has(key)) {
            this.stats.hits++;
            return this.cache.get(key);
        }
        this.stats.misses++;
        return null;
    }
    
    set(key, value) {
        this.cache.set(key, value);
    }
    
    recordAccess(key) {
        const now = Date.now();
        if (!this.accessPatterns.has(key)) {
            this.accessPatterns.set(key, []);
        }
        this.accessPatterns.get(key).push(now);
    }
    
    updatePredictions() {
        // Simple prediction based on access patterns
        this.stats.predictions++;
    }
    
    delete(key) { this.accessPatterns.delete(key); return this.cache.delete(key); }
    clear() { this.cache.clear(); this.accessPatterns.clear(); }
    increaseSize(amount) { this.maxSize += amount; }
    getStats() { return { ...this.stats, size: this.cache.size, maxSize: this.maxSize, hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) }; }
}

// Export classes
window.AdvancedCacheManager = AdvancedCacheManager;
window.AdvancedLRUCache = AdvancedLRUCache;
window.AdvancedLFUCache = AdvancedLFUCache;
window.AdvancedTTLCache = AdvancedTTLCache;
window.AdvancedPredictiveCache = AdvancedPredictiveCache;

// Advanced cache manager module loaded
