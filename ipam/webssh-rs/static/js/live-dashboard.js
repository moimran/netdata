/**
 * Live Performance Dashboard
 * Real-time display of performance metrics in the header
 */

class LivePerformanceDashboard {
    constructor() {
        this.elements = {
            fps: document.getElementById('fps-counter'),
            memory: document.getElementById('memory-usage'),
            latency: document.getElementById('network-latency'),
            poolEfficiency: document.getElementById('pool-efficiency'),
            compressionRatio: document.getElementById('compression-ratio')
        };
        
        this.metrics = {
            fps: 0,
            memory: 0,
            latency: 0,
            poolHitRate: 0,
            compressionRatio: 1.0
        };
        
        this.updateInterval = null;
        this.isRunning = false;
        this.isUpdating = false; // Prevent recursive updates
        
        // Performance thresholds for color coding
        this.thresholds = {
            fps: { good: 45, warning: 25 },
            memory: { good: 100, warning: 200 }, // MB
            latency: { good: 50, warning: 150 }, // ms
            poolHitRate: { good: 80, warning: 60 }, // %
            compressionRatio: { good: 1.5, warning: 1.2 } // ratio
        };
        
        console.log('📊 Live Performance Dashboard initialized');
    }
    
    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.updateInterval = setInterval(() => {
            this.updateMetrics();
            this.updateDisplay();
        }, 1000); // Update every second
        
        console.log('▶️ Live dashboard started');
    }
    
    stop() {
        if (!this.isRunning) return;
        
        this.isRunning = false;
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        
        console.log('⏹️ Live dashboard stopped');
    }
    
    updateMetrics() {
        // Prevent recursive updates
        if (this.isUpdating) return;
        this.isUpdating = true;

        try {
            // Update FPS from performance monitor
            if (window.performanceMonitor) {
                const perfMetrics = window.performanceMonitor.getMetrics();
                this.metrics.fps = perfMetrics.fps || 0;
            }

            // Update WebGL FPS if available
            if (window.performanceStats && window.performanceStats.avgFPS > 0) {
                this.metrics.fps = window.performanceStats.avgFPS;
            }

            // Update memory usage
            if (performance.memory) {
                this.metrics.memory = performance.memory.usedJSHeapSize / (1024 * 1024); // Convert to MB
            }

            // Update network latency
            if (window.ws && window.ws.getStats) {
                const wsStats = window.ws.getStats();
                this.metrics.latency = wsStats.averageLatency || 0;
            }

            // Update pool efficiency
            if (window.performanceMonitor && window.performanceMonitor.metrics.poolStats) {
                const poolStats = window.performanceMonitor.metrics.poolStats;
                let totalHitRate = 0;
                let poolCount = 0;

                Object.values(poolStats).forEach(stats => {
                    if (stats.hitRate !== undefined) {
                        totalHitRate += stats.hitRate;
                        poolCount++;
                    }
                });

                this.metrics.poolHitRate = poolCount > 0 ? (totalHitRate / poolCount) * 100 : 0;
            }

            // Update compression ratio
            if (window.ws && window.ws.getStats) {
                const wsStats = window.ws.getStats();
                this.metrics.compressionRatio = wsStats.compressionRatio || 1.0;
            }
        } finally {
            this.isUpdating = false;
        }
        
        // Update WebGL FPS if available
        if (window.performanceStats && window.performanceStats.avgFPS > 0) {
            this.metrics.fps = window.performanceStats.avgFPS;
        }
        
        // Update memory usage
        if (performance.memory) {
            this.metrics.memory = performance.memory.usedJSHeapSize / (1024 * 1024); // Convert to MB
        }
        
        // Update network latency
        if (window.ws && window.ws.getStats) {
            const wsStats = window.ws.getStats();
            this.metrics.latency = wsStats.averageLatency || 0;
        }
        
        // Update pool efficiency
        if (window.performanceMonitor && window.performanceMonitor.metrics.poolStats) {
            const poolStats = window.performanceMonitor.metrics.poolStats;
            let totalHitRate = 0;
            let poolCount = 0;
            
            Object.values(poolStats).forEach(stats => {
                if (stats.hitRate !== undefined) {
                    totalHitRate += stats.hitRate;
                    poolCount++;
                }
            });
            
            this.metrics.poolHitRate = poolCount > 0 ? (totalHitRate / poolCount) * 100 : 0;
        }
        
        // Update compression ratio
        if (window.ws && window.ws.getStats) {
            const wsStats = window.ws.getStats();
            this.metrics.compressionRatio = wsStats.compressionRatio || 1.0;
        }
    }
    
    updateDisplay() {
        // Update FPS
        if (this.elements.fps) {
            const fps = this.metrics.fps.toFixed(0);
            this.elements.fps.textContent = fps;
            this.elements.fps.className = `perf-value ${this.getColorClass('fps', this.metrics.fps)}`;
        }
        
        // Update Memory
        if (this.elements.memory) {
            const memory = this.metrics.memory.toFixed(0);
            this.elements.memory.textContent = `${memory} MB`;
            this.elements.memory.className = `perf-value ${this.getColorClass('memory', this.metrics.memory)}`;
        }
        
        // Update Latency
        if (this.elements.latency) {
            const latency = this.metrics.latency.toFixed(0);
            this.elements.latency.textContent = `${latency} ms`;
            this.elements.latency.className = `perf-value ${this.getColorClass('latency', this.metrics.latency)}`;
        }
        
        // Update Pool Efficiency
        if (this.elements.poolEfficiency) {
            const efficiency = this.metrics.poolHitRate.toFixed(0);
            this.elements.poolEfficiency.textContent = `${efficiency}%`;
            this.elements.poolEfficiency.className = `perf-value ${this.getColorClass('poolHitRate', this.metrics.poolHitRate)}`;
        }
        
        // Update Compression Ratio
        if (this.elements.compressionRatio) {
            const ratio = this.metrics.compressionRatio.toFixed(1);
            this.elements.compressionRatio.textContent = `${ratio}x`;
            this.elements.compressionRatio.className = `perf-value ${this.getColorClass('compressionRatio', this.metrics.compressionRatio)}`;
        }
    }
    
    getColorClass(metric, value) {
        const threshold = this.thresholds[metric];
        if (!threshold) return 'good';
        
        switch (metric) {
            case 'fps':
            case 'poolHitRate':
            case 'compressionRatio':
                // Higher is better
                if (value >= threshold.good) return 'good';
                if (value >= threshold.warning) return 'warning';
                return 'critical';
                
            case 'memory':
            case 'latency':
                // Lower is better
                if (value <= threshold.good) return 'good';
                if (value <= threshold.warning) return 'warning';
                return 'critical';
                
            default:
                return 'good';
        }
    }
    
    // Manual update method for external calls
    forceUpdate() {
        this.updateMetrics();
        this.updateDisplay();
    }
    
    // Get current metrics for debugging
    getCurrentMetrics() {
        return { ...this.metrics };
    }
    
    // Update thresholds dynamically
    updateThresholds(newThresholds) {
        this.thresholds = { ...this.thresholds, ...newThresholds };
        console.log('🎯 Dashboard thresholds updated:', this.thresholds);
    }
    
    // Show/hide dashboard
    show() {
        const dashboard = document.querySelector('.performance-dashboard');
        if (dashboard) {
            dashboard.style.display = 'flex';
        }
    }
    
    hide() {
        const dashboard = document.querySelector('.performance-dashboard');
        if (dashboard) {
            dashboard.style.display = 'none';
        }
    }
    
    // Toggle dashboard visibility
    toggle() {
        const dashboard = document.querySelector('.performance-dashboard');
        if (dashboard) {
            const isVisible = dashboard.style.display !== 'none';
            if (isVisible) {
                this.hide();
            } else {
                this.show();
            }
        }
    }
}

// Enhanced Performance Monitor with Dashboard Integration
class EnhancedPerformanceMonitor extends PerformanceMonitor {
    constructor() {
        super();
        this.dashboard = null;
    }
    
    attachDashboard(dashboard) {
        this.dashboard = dashboard;
        console.log('🔗 Dashboard attached to performance monitor');
    }
    
    startMonitoring() {
        super.startMonitoring();
        
        // Start dashboard if attached
        if (this.dashboard) {
            this.dashboard.start();
        }
    }
    
    getMetrics() {
        const metrics = super.getMetrics();

        // Don't trigger dashboard update here to avoid circular dependency
        // Dashboard updates on its own schedule

        return metrics;
    }
}

// Global dashboard instance
let liveDashboard = null;

// Initialize dashboard when DOM is ready
function initializeLiveDashboard() {
    // Wait for DOM elements to be available
    if (document.getElementById('fps-counter')) {
        liveDashboard = new LivePerformanceDashboard();
        
        // Keep existing performance monitor, just start dashboard
        // No need for enhanced monitor to avoid circular dependencies
        
        // Start dashboard
        liveDashboard.start();
        
        // Make dashboard globally accessible
        window.liveDashboard = liveDashboard;
        
        console.log('🚀 Live performance dashboard ready');
    } else {
        // Retry in 100ms if elements not ready
        setTimeout(initializeLiveDashboard, 100);
    }
}

// Auto-initialize when script loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeLiveDashboard);
} else {
    initializeLiveDashboard();
}

// Export for use in other modules
window.LivePerformanceDashboard = LivePerformanceDashboard;
window.EnhancedPerformanceMonitor = EnhancedPerformanceMonitor;

console.log('📊 Live dashboard module loaded');
