/**
 * Advanced Worker Thread Manager
 * Offloads heavy computations to prevent UI blocking
 */

class WorkerThreadManager {
    constructor(options = {}) {
        this.options = {
            maxWorkers: options.maxWorkers || navigator.hardwareConcurrency || 4,
            workerTimeout: options.workerTimeout || 30000, // 30 seconds
            enableTextProcessing: options.enableTextProcessing !== false,
            enableCompression: options.enableCompression !== false,
            enableParsing: options.enableParsing !== false,
            ...options
        };
        
        // Worker pools for different tasks
        this.workers = {
            textProcessing: [],
            compression: [],
            parsing: [],
            general: []
        };
        
        // Task queues
        this.taskQueues = {
            textProcessing: [],
            compression: [],
            parsing: [],
            general: []
        };
        
        // Active tasks tracking
        this.activeTasks = new Map();
        this.taskIdCounter = 0;
        
        // Performance metrics
        this.stats = {
            tasksCompleted: 0,
            tasksQueued: 0,
            averageTaskTime: 0,
            totalProcessingTime: 0,
            workersCreated: 0,
            workersActive: 0,
            uiBlockingPrevented: 0
        };
        
        this.isInitialized = false;
        
        // Worker thread manager initialized
    }
    
    async initialize() {
        if (this.isInitialized) return;
        
        console.log('🚀 Initializing worker thread manager...');
        
        // Create worker pools
        await this.createWorkerPools();
        
        // Setup message handlers
        this.setupMessageHandlers();
        
        this.isInitialized = true;
        // Worker thread manager ready
    }
    
    async createWorkerPools() {
        const workerTypes = ['textProcessing', 'compression', 'parsing', 'general'];
        const workersPerType = Math.max(1, Math.floor(this.options.maxWorkers / workerTypes.length));
        
        for (const type of workerTypes) {
            for (let i = 0; i < workersPerType; i++) {
                try {
                    const worker = await this.createWorker(type);
                    this.workers[type].push(worker);
                    this.stats.workersCreated++;
                } catch (e) {
                    console.warn(`Failed to create ${type} worker:`, e);
                }
            }
        }
    }
    
    async createWorker(type) {
        // Create worker with inline script to avoid external file dependency
        const workerScript = this.generateWorkerScript(type);
        const blob = new Blob([workerScript], { type: 'application/javascript' });
        const workerUrl = URL.createObjectURL(blob);
        
        const worker = new Worker(workerUrl);
        worker.type = type;
        worker.isAvailable = true;
        worker.taskCount = 0;
        
        // Cleanup URL after worker creation
        URL.revokeObjectURL(workerUrl);
        
        return worker;
    }
    
    generateWorkerScript(type) {
        return `
            // Worker script for ${type}
            let taskCount = 0;
            
            // Text processing functions
            function processText(data) {
                const { text, operation, options } = data;
                
                switch (operation) {
                    case 'highlight':
                        return highlightSyntax(text, options);
                    case 'search':
                        return searchText(text, options);
                    case 'format':
                        return formatText(text, options);
                    case 'parse':
                        return parseText(text, options);
                    default:
                        return { error: 'Unknown text operation' };
                }
            }
            
            function highlightSyntax(text, options) {
                // Simple syntax highlighting
                const keywords = ['function', 'const', 'let', 'var', 'if', 'else', 'for', 'while', 'return'];
                let highlighted = text;
                
                keywords.forEach(keyword => {
                    const regex = new RegExp(\`\\\\b\${keyword}\\\\b\`, 'g');
                    highlighted = highlighted.replace(regex, \`<span class="keyword">\${keyword}</span>\`);
                });
                
                return { highlighted, lineCount: text.split('\\n').length };
            }
            
            function searchText(text, options) {
                const { query, caseSensitive, regex } = options;
                const results = [];
                const lines = text.split('\\n');
                
                lines.forEach((line, lineIndex) => {
                    let searchRegex;
                    // Create search regex
                    searchRegex = new RegExp(query, caseSensitive ? 'g' : 'gi');
                    
                    let match;
                    while ((match = searchRegex.exec(line)) !== null) {
                        results.push({
                            lineIndex,
                            columnIndex: match.index,
                            match: match[0],
                            line: line
                        });
                    }
                });
                
                return { results, totalMatches: results.length };
            }
            
            function formatText(text, options) {
                const { indentSize = 2, trimWhitespace = true } = options;
                const lines = text.split('\\n');
                
                const formatted = lines.map(line => {
                    let formattedLine = trimWhitespace ? line.trim() : line;
                    // Simple indentation logic
                    const indentLevel = (line.match(/^\\s*/)[0].length / indentSize) || 0;
                    return ' '.repeat(indentLevel * indentSize) + formattedLine.trim();
                });
                
                return { formatted: formatted.join('\\n'), lineCount: formatted.length };
            }
            
            function parseText(text, options) {
                const { type = 'json' } = options;
                
                try {
                    switch (type) {
                        case 'json':
                            const parsed = JSON.parse(text);
                            return { parsed, valid: true, type: 'json' };
                        case 'csv':
                            const lines = text.split('\\n');
                            const data = lines.map(line => line.split(','));
                            return { parsed: data, valid: true, type: 'csv' };
                        default:
                            return { error: 'Unsupported parse type' };
                    }
                } catch (e) {
                    return { error: e.message, valid: false };
                }
            }
            
            // Compression functions
            function compressData(data) {
                // Simple compression simulation (in real implementation, use proper compression)
                const { text, algorithm = 'gzip' } = data;
                
                // Simulate compression by removing repeated characters
                const compressed = text.replace(/(..)\\1+/g, '$1');
                const ratio = compressed.length / text.length;
                
                return {
                    compressed,
                    originalSize: text.length,
                    compressedSize: compressed.length,
                    ratio,
                    algorithm
                };
            }
            
            function decompressData(data) {
                // Simple decompression simulation
                const { compressed } = data;
                return { decompressed: compressed }; // Simplified
            }
            
            // Message handler
            self.onmessage = function(e) {
                const { taskId, type, operation, data, timestamp } = e.data;
                taskCount++;
                
                let result;
                const startTime = performance.now();
                
                try {
                    switch (type) {
                        case 'textProcessing':
                            result = processText({ ...data, operation });
                            break;
                        case 'compression':
                            if (operation === 'compress') {
                                result = compressData(data);
                            } else if (operation === 'decompress') {
                                result = decompressData(data);
                            }
                            break;
                        case 'parsing':
                            result = parseText(data, data.options || {});
                            break;
                        default:
                            result = { error: 'Unknown task type' };
                    }
                    
                    const processingTime = performance.now() - startTime;
                    
                    self.postMessage({
                        taskId,
                        success: true,
                        result,
                        processingTime,
                        workerTaskCount: taskCount,
                        timestamp: Date.now()
                    });
                    
                } catch (error) {
                    self.postMessage({
                        taskId,
                        success: false,
                        error: error.message,
                        timestamp: Date.now()
                    });
                }
            };
            
            // Worker ready signal
            self.postMessage({ ready: true, type: '${type}' });
        `;
    }
    
    setupMessageHandlers() {
        Object.values(this.workers).flat().forEach(worker => {
            worker.onmessage = (e) => {
                const { taskId, success, result, error, processingTime, ready } = e.data;
                
                if (ready) {
                    // Worker ready
                    return;
                }
                
                if (taskId && this.activeTasks.has(taskId)) {
                    const task = this.activeTasks.get(taskId);
                    
                    // Mark worker as available
                    worker.isAvailable = true;
                    this.stats.workersActive--;
                    
                    // Update stats
                    this.stats.tasksCompleted++;
                    if (processingTime) {
                        this.stats.totalProcessingTime += processingTime;
                        this.stats.averageTaskTime = this.stats.totalProcessingTime / this.stats.tasksCompleted;
                    }
                    
                    // Resolve task
                    if (success) {
                        task.resolve(result);
                    } else {
                        task.reject(new Error(error));
                    }
                    
                    // Cleanup
                    this.activeTasks.delete(taskId);
                    clearTimeout(task.timeout);
                    
                    // Process next task in queue
                    this.processNextTask(worker.type);
                }
            };
            
            worker.onerror = (error) => {
                console.error(`Worker error in ${worker.type}:`, error);
                worker.isAvailable = true;
                this.stats.workersActive--;
            };
        });
    }
    
    /**
     * Execute task in worker thread
     * @param {string} type - Task type (textProcessing, compression, parsing, general)
     * @param {string} operation - Specific operation
     * @param {Object} data - Task data
     * @param {Object} options - Task options
     * @returns {Promise} Task result
     */
    executeTask(type, operation, data, options = {}) {
        return new Promise((resolve, reject) => {
            const taskId = ++this.taskIdCounter;
            const task = {
                taskId,
                type,
                operation,
                data,
                options,
                resolve,
                reject,
                timestamp: Date.now(),
                timeout: null
            };
            
            // Set timeout
            task.timeout = setTimeout(() => {
                this.activeTasks.delete(taskId);
                reject(new Error(`Task ${taskId} timed out`));
            }, this.options.workerTimeout);
            
            this.activeTasks.set(taskId, task);
            this.stats.tasksQueued++;
            
            // Try to execute immediately or queue
            const worker = this.getAvailableWorker(type);
            if (worker) {
                this.executeTaskOnWorker(worker, task);
            } else {
                this.taskQueues[type].push(task);
            }
        });
    }
    
    getAvailableWorker(type) {
        // Try specific type first
        let worker = this.workers[type]?.find(w => w.isAvailable);
        
        // Fallback to general workers
        if (!worker) {
            worker = this.workers.general?.find(w => w.isAvailable);
        }
        
        return worker;
    }
    
    executeTaskOnWorker(worker, task) {
        worker.isAvailable = false;
        worker.taskCount++;
        this.stats.workersActive++;
        this.stats.uiBlockingPrevented++;
        
        worker.postMessage({
            taskId: task.taskId,
            type: task.type,
            operation: task.operation,
            data: task.data,
            timestamp: task.timestamp
        });
    }
    
    processNextTask(type) {
        const queue = this.taskQueues[type];
        if (queue.length > 0) {
            const worker = this.getAvailableWorker(type);
            if (worker) {
                const task = queue.shift();
                this.executeTaskOnWorker(worker, task);
            }
        }
    }
    
    // Convenience methods for common operations
    async processTextAsync(text, operation, options = {}) {
        return this.executeTask('textProcessing', operation, { text, options });
    }
    
    async compressAsync(text, algorithm = 'gzip') {
        return this.executeTask('compression', 'compress', { text, algorithm });
    }
    
    async parseAsync(text, type = 'json') {
        return this.executeTask('parsing', 'parse', { text, options: { type } });
    }
    
    async searchAsync(text, query, options = {}) {
        return this.executeTask('textProcessing', 'search', { text, options: { query, ...options } });
    }
    
    getTotalWorkers() {
        return Object.values(this.workers).flat().length;
    }
    
    getStats() {
        return {
            ...this.stats,
            totalWorkers: this.getTotalWorkers(),
            queuedTasks: Object.values(this.taskQueues).reduce((sum, queue) => sum + queue.length, 0),
            activeTasks: this.activeTasks.size,
            workerUtilization: this.stats.workersActive / this.getTotalWorkers()
        };
    }
    
    /**
     * Cleanup all workers
     */
    destroy() {
        Object.values(this.workers).flat().forEach(worker => {
            worker.terminate();
        });
        
        this.activeTasks.clear();
        Object.values(this.taskQueues).forEach(queue => queue.length = 0);
        
        // Worker thread manager destroyed
    }
}

// Export class
window.WorkerThreadManager = WorkerThreadManager;

// Worker thread manager module loaded
