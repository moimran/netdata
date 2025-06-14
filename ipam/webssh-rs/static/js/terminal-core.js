// Global variables
let term = null;
let ws = null;
let fitAddon = null;
let currentSessionId = null;
let isApiConnection = false;
let rendererType = 'canvas'; // Track current renderer type

// Performance monitoring for WebGL
let performanceStats = {
    frameCount: 0,
    lastFrameTime: 0,
    avgFPS: 0
};

// GPU information storage
let gpuInfo = {
    renderer: 'Unknown',
    vendor: 'Unknown',
    version: 'Unknown',
    shadingLanguageVersion: 'Unknown',
    maxTextureSize: 0,
    maxViewportDims: [0, 0],
    isWebGL2: false,
    extensions: []
};

// Show error message
function showError(message) {
    term.writeln('\x1b[1;31mError: ' + message + '\x1b[0m');
    console.error('Error:', message);
}

// Performance monitoring function (useful for WebGL optimization)
function monitorPerformance() {
    if (rendererType === 'webgl') {
        const now = performance.now();
        performanceStats.frameCount++;

        if (performanceStats.lastFrameTime) {
            const deltaTime = now - performanceStats.lastFrameTime;
            const fps = 1000 / deltaTime;
            performanceStats.avgFPS = (performanceStats.avgFPS * 0.9) + (fps * 0.1);
        }

        performanceStats.lastFrameTime = now;

        // Log performance stats every 5 seconds
        if (performanceStats.frameCount % 300 === 0) {
            console.log(`WebGL Performance: ${performanceStats.avgFPS.toFixed(1)} FPS average`);
        }
    }
}

// Enhanced terminal refresh with performance monitoring
function refreshTerminal() {
    if (term && document.hasFocus()) {
        monitorPerformance();
        term.refresh(0, term.rows - 1);
    }
}

// Display comprehensive GPU information with diagnostics
function displayGPUInfo() {
    if (!term) return;

    term.writeln('\x1b[1;36m' + '='.repeat(70) + '\x1b[0m');
    term.writeln('\x1b[1;36m🎮 GPU & WebGL Information with Diagnostics\x1b[0m');
    term.writeln('\x1b[1;36m' + '='.repeat(70) + '\x1b[0m');

    if (rendererType === 'webgl') {
        term.writeln(`\x1b[1;32m✅ Status: GPU Acceleration ACTIVE\x1b[0m`);
        term.writeln(`\x1b[1;33m🏷️  Renderer: ${gpuInfo.renderer}\x1b[0m`);
        term.writeln(`\x1b[1;33m🏢 Vendor: ${gpuInfo.vendor}\x1b[0m`);
        term.writeln(`\x1b[1;33m📋 WebGL Version: ${gpuInfo.version}\x1b[0m`);
        term.writeln(`\x1b[1;33m🔧 GLSL Version: ${gpuInfo.shadingLanguageVersion}\x1b[0m`);
        term.writeln(`\x1b[1;33m🖼️  Max Texture Size: ${gpuInfo.maxTextureSize}px\x1b[0m`);
        term.writeln(`\x1b[1;33m📐 Max Viewport: ${gpuInfo.maxViewportDims[0]}x${gpuInfo.maxViewportDims[1]}\x1b[0m`);
        term.writeln(`\x1b[1;33m🔢 Max Vertex Attributes: ${gpuInfo.maxVertexAttribs}\x1b[0m`);
        term.writeln(`\x1b[1;33m🎨 Max Texture Units: ${gpuInfo.maxTextureImageUnits}\x1b[0m`);
        term.writeln(`\x1b[1;33m🆕 WebGL 2.0 Support: ${gpuInfo.isWebGL2 ? 'Yes' : 'No'}\x1b[0m`);
        term.writeln(`\x1b[1;33m🔌 Extensions: ${gpuInfo.extensions.length} available\x1b[0m`);

        // Show important extensions
        if (gpuInfo.hasImportantExtensions) {
            term.writeln('\x1b[1;35m⭐ Important Extensions:\x1b[0m');
            Object.entries(gpuInfo.hasImportantExtensions).forEach(([ext, available]) => {
                const status = available ? '\x1b[1;32m✅' : '\x1b[1;31m❌';
                term.writeln(`   ${status} ${ext}\x1b[0m`);
            });
        }

        if (performanceStats.avgFPS > 0) {
            term.writeln(`\x1b[1;32m⚡ Average FPS: ${performanceStats.avgFPS.toFixed(1)}\x1b[0m`);
        }

        // Memory info (if available)
        if (performance.memory) {
            const memInfo = performance.memory;
            term.writeln(`\x1b[1;34m💾 JS Heap Used: ${(memInfo.usedJSHeapSize / 1024 / 1024).toFixed(1)} MB\x1b[0m`);
            term.writeln(`\x1b[1;34m💾 JS Heap Total: ${(memInfo.totalJSHeapSize / 1024 / 1024).toFixed(1)} MB\x1b[0m`);
            term.writeln(`\x1b[1;34m💾 JS Heap Limit: ${(memInfo.jsHeapSizeLimit / 1024 / 1024).toFixed(1)} MB\x1b[0m`);
        }

    } else {
        term.writeln(`\x1b[1;31m❌ Status: GPU Acceleration NOT AVAILABLE\x1b[0m`);
        term.writeln(`\x1b[1;31m🖥️  Using: CPU Canvas Rendering\x1b[0m`);

        // Show diagnostics if available
        if (window.webglDiagnostics) {
            const diag = window.webglDiagnostics;
            term.writeln(`\x1b[1;33m💡 Reason: ${diag.message}\x1b[0m`);
            term.writeln(`\x1b[1;33m🕒 Detected: ${new Date(diag.timestamp).toLocaleTimeString()}\x1b[0m`);
            term.writeln(`\x1b[1;33m🖥️  Platform: ${diag.platform}\x1b[0m`);
            term.writeln(`\x1b[1;33m🧠 CPU Cores: ${diag.hardwareConcurrency}\x1b[0m`);
            if (diag.deviceMemory !== 'Unknown') {
                term.writeln(`\x1b[1;33m💾 Device Memory: ${diag.deviceMemory} GB\x1b[0m`);
            }
        } else {
            term.writeln(`\x1b[1;33m💡 Reason: WebGL not supported or disabled\x1b[0m`);
        }

        // Provide troubleshooting tips
        term.writeln('\x1b[1;36m🔧 Troubleshooting Tips:\x1b[0m');
        term.writeln('   1. Check browser settings for hardware acceleration');
        term.writeln('   2. Update graphics drivers');
        term.writeln('   3. Try a different browser');
        term.writeln('   4. Check if running in VM or remote desktop');
        term.writeln('   5. Visit chrome://gpu/ or about:support for more info');
    }

    term.writeln('\x1b[1;36m' + '='.repeat(70) + '\x1b[0m');
    term.writeln('\x1b[1;32m💡 Commands: gpu-test (benchmark), webgl-debug (detailed diagnostics)\x1b[0m');
}

// Check if user typed a special command
function handleSpecialCommands(data) {
    const command = data.trim().toLowerCase();

    if (command === 'gpu-info') {
        displayGPUInfo();
        return true; // Command handled
    }

    if (command === 'gpu-test') {
        runGPUPerformanceTest();
        return true;
    }

    if (command === 'webgl-debug') {
        displayWebGLDebugInfo();
        return true;
    }

    if (command === 'webgl-retest') {
        retestWebGLSupport();
        return true;
    }

    if (command === 'renderer-info') {
        displayRendererInfo();
        return true;
    }

    if (command === 'perf-stats') {
        displayPerformanceStats();
        return true;
    }

    if (command === 'memory-stats') {
        displayMemoryStats();
        return true;
    }

    if (command === 'pool-stats') {
        displayPoolStats();
        return true;
    }

    if (command === 'clear-pools') {
        clearObjectPools();
        return true;
    }

    if (command === 'dashboard-toggle') {
        toggleLiveDashboard();
        return true;
    }

    if (command === 'dashboard-show') {
        showLiveDashboard();
        return true;
    }

    if (command === 'dashboard-hide') {
        hideLiveDashboard();
        return true;
    }

    if (command === 'virtual-scroll-enable') {
        enableVirtualScrolling();
        return true;
    }

    if (command === 'virtual-scroll-disable') {
        disableVirtualScrolling();
        return true;
    }

    if (command === 'virtual-scroll-stats') {
        displayVirtualScrollStats();
        return true;
    }

    if (command === 'font-atlas-generate') {
        generateFontAtlas();
        return true;
    }

    if (command === 'font-atlas-stats') {
        displayFontAtlasStats();
        return true;
    }

    if (command === 'optimization-status') {
        displayOptimizationStatus();
        return true;
    }

    if (command === 'ligatures-enable') {
        enableLigatures();
        return true;
    }

    if (command === 'ligatures-disable') {
        disableLigatures();
        return true;
    }

    if (command === 'ligatures-test') {
        testLigatures();
        return true;
    }

    if (command === 'ligatures-list') {
        listLigatures();
        return true;
    }

    if (command === 'text-shaping-stats') {
        displayTextShapingStats();
        return true;
    }

    if (command === 'batch-rendering-enable') {
        enableBatchRendering();
        return true;
    }

    if (command === 'batch-rendering-disable') {
        disableBatchRendering();
        return true;
    }

    if (command === 'batch-rendering-stats') {
        displayBatchRenderingStats();
        return true;
    }

    if (command === 'batch-rendering-test') {
        testBatchRendering();
        return true;
    }

    if (command === 'subpixel-rendering-enable') {
        enableSubpixelRendering();
        return true;
    }

    if (command === 'subpixel-rendering-disable') {
        disableSubpixelRendering();
        return true;
    }

    if (command === 'subpixel-rendering-test') {
        testSubpixelRendering();
        return true;
    }

    if (command === 'subpixel-rendering-stats') {
        displaySubpixelRenderingStats();
        return true;
    }

    if (command === 'worker-threads-enable') {
        enableWorkerThreads();
        return true;
    }

    if (command === 'worker-threads-disable') {
        disableWorkerThreads();
        return true;
    }

    if (command === 'worker-threads-test') {
        testWorkerThreads();
        return true;
    }

    if (command === 'worker-threads-stats') {
        displayWorkerThreadsStats();
        return true;
    }

    if (command === 'cache-stats') {
        displayCacheStats();
        return true;
    }

    if (command === 'cache-clear') {
        clearAdvancedCache();
        return true;
    }

    if (command === 'cache-optimize') {
        optimizeCache();
        return true;
    }

    if (command === 'cache-test') {
        testAdvancedCache();
        return true;
    }

    return false; // Command not handled
}

// Simple GPU performance test
function runGPUPerformanceTest() {
    if (!term) return;

    term.writeln('\x1b[1;36m🧪 Running GPU Performance Test...\x1b[0m');

    if (rendererType !== 'webgl') {
        term.writeln('\x1b[1;31m❌ GPU acceleration not available for testing\x1b[0m');
        return;
    }

    const startTime = performance.now();
    let frameCount = 0;
    const testDuration = 3000; // 3 seconds

    const testInterval = setInterval(() => {
        frameCount++;
        term.refresh(0, term.rows - 1);

        if (performance.now() - startTime >= testDuration) {
            clearInterval(testInterval);
            const fps = frameCount / (testDuration / 1000);
            term.writeln(`\x1b[1;32m✅ Test Complete: ${fps.toFixed(1)} FPS average\x1b[0m`);

            if (fps > 30) {
                term.writeln('\x1b[1;32m🚀 Excellent GPU performance!\x1b[0m');
            } else if (fps > 15) {
                term.writeln('\x1b[1;33m⚡ Good GPU performance\x1b[0m');
            } else {
                term.writeln('\x1b[1;31m⚠️  GPU performance may be limited\x1b[0m');
            }
        }
    }, 16); // ~60 FPS target
}

// Display detailed WebGL debug information
function displayWebGLDebugInfo() {
    if (!term) return;

    term.writeln('\x1b[1;36m' + '='.repeat(70) + '\x1b[0m');
    term.writeln('\x1b[1;36m🔍 WebGL Debug Information\x1b[0m');
    term.writeln('\x1b[1;36m' + '='.repeat(70) + '\x1b[0m');

    // Browser information
    term.writeln('\x1b[1;35m🌐 Browser Environment:\x1b[0m');
    term.writeln(`   User Agent: ${navigator.userAgent}`);
    term.writeln(`   Platform: ${navigator.platform}`);
    term.writeln(`   Language: ${navigator.language}`);
    term.writeln(`   CPU Cores: ${navigator.hardwareConcurrency}`);
    if (navigator.deviceMemory) {
        term.writeln(`   Device Memory: ${navigator.deviceMemory} GB`);
    }

    // WebGL diagnostics
    if (window.webglDiagnostics) {
        const diag = window.webglDiagnostics;
        term.writeln('\x1b[1;35m🔍 WebGL Detection Results:\x1b[0m');
        term.writeln(`   Status: ${diag.status}`);
        term.writeln(`   Message: ${diag.message}`);
        term.writeln(`   Timestamp: ${new Date(diag.timestamp).toLocaleString()}`);
    }

    // Test WebGL availability right now
    term.writeln('\x1b[1;35m🧪 Live WebGL Test:\x1b[0m');
    try {
        const canvas = document.createElement('canvas');
        const gl2 = canvas.getContext('webgl2');
        const gl1 = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

        if (gl2) {
            term.writeln('   ✅ WebGL 2.0: Available');
            term.writeln(`   🎮 Renderer: ${gl2.getParameter(gl2.RENDERER)}`);
            term.writeln(`   🏢 Vendor: ${gl2.getParameter(gl2.VENDOR)}`);
        } else if (gl1) {
            term.writeln('   ⚡ WebGL 1.0: Available');
            term.writeln(`   🎮 Renderer: ${gl1.getParameter(gl1.RENDERER)}`);
            term.writeln(`   🏢 Vendor: ${gl1.getParameter(gl1.VENDOR)}`);
        } else {
            term.writeln('   ❌ WebGL: Not Available');
        }
    } catch (e) {
        term.writeln(`   ❌ WebGL Test Error: ${e.message}`);
    }

    // Current terminal renderer
    term.writeln('\x1b[1;35m🖥️  Current Terminal Renderer:\x1b[0m');
    term.writeln(`   Selected: ${rendererType}`);
    if (term._core && term._core._renderService) {
        const actualRenderer = term._core._renderService._renderer.constructor.name;
        term.writeln(`   Actual: ${actualRenderer}`);
    }

    term.writeln('\x1b[1;36m' + '='.repeat(70) + '\x1b[0m');
}

// Retest WebGL support
function retestWebGLSupport() {
    if (!term) return;

    term.writeln('\x1b[1;33m🔄 Retesting WebGL support...\x1b[0m');

    // Clear previous diagnostics
    window.webglDiagnostics = null;

    // Re-run detection
    const newRenderer = detectOptimalRenderer();

    term.writeln(`\x1b[1;32m✅ Retest complete. Detected renderer: ${newRenderer}\x1b[0m`);

    if (newRenderer !== rendererType) {
        term.writeln('\x1b[1;31m⚠️  Detected renderer differs from current renderer!\x1b[0m');
        term.writeln(`   Current: ${rendererType}`);
        term.writeln(`   Detected: ${newRenderer}`);
        term.writeln('\x1b[1;33m💡 Consider refreshing the page to use the new renderer\x1b[0m');
    } else {
        term.writeln('\x1b[1;32m✅ Renderer detection is consistent\x1b[0m');
    }
}

// Display current renderer information
function displayRendererInfo() {
    if (!term) return;

    term.writeln('\x1b[1;36m' + '='.repeat(50) + '\x1b[0m');
    term.writeln('\x1b[1;36m🖥️  Current Renderer Information\x1b[0m');
    term.writeln('\x1b[1;36m' + '='.repeat(50) + '\x1b[0m');

    term.writeln(`\x1b[1;33m📋 Selected Renderer: ${rendererType}\x1b[0m`);

    if (term._core && term._core._renderService && term._core._renderService._renderer) {
        const renderer = term._core._renderService._renderer;
        term.writeln(`\x1b[1;33m🔧 Actual Renderer: ${renderer.constructor.name}\x1b[0m`);

        // Try to get more renderer details
        if (renderer._gl) {
            term.writeln('\x1b[1;32m✅ WebGL Context Active\x1b[0m');
            term.writeln(`   Context Type: ${renderer._gl.constructor.name}`);
        } else if (renderer._ctx) {
            term.writeln('\x1b[1;31m🖥️  Canvas 2D Context Active\x1b[0m');
            term.writeln(`   Context Type: ${renderer._ctx.constructor.name}`);
        }
    }

    // Performance info
    if (performanceStats.avgFPS > 0) {
        term.writeln(`\x1b[1;32m⚡ Current FPS: ${performanceStats.avgFPS.toFixed(1)}\x1b[0m`);
    }

    term.writeln('\x1b[1;36m' + '='.repeat(50) + '\x1b[0m');
}

// Function to display diagnostics in terminal (called from displayWebGLDiagnostics)
window.displayWebGLDiagnosticsInTerminal = function(diagnostics) {
    if (!term) return;

    // Only show this once when terminal is first initialized
    if (window.diagnosticsShown) return;
    window.diagnosticsShown = true;

    setTimeout(() => {
        term.writeln('\x1b[1;34m🔍 WebGL Detection Summary:\x1b[0m');
        term.writeln(`   Status: ${diagnostics.status}`);
        term.writeln(`   ${diagnostics.message}`);
        if (diagnostics.status === 'canvas') {
            term.writeln('\x1b[1;33m💡 Type "webgl-debug" for detailed diagnostics\x1b[0m');
        }
    }, 1000);
};

// Display comprehensive performance statistics
function displayPerformanceStats() {
    if (!term) return;

    term.writeln('\x1b[1;36m' + '='.repeat(70) + '\x1b[0m');
    term.writeln('\x1b[1;36m📊 Performance Statistics\x1b[0m');
    term.writeln('\x1b[1;36m' + '='.repeat(70) + '\x1b[0m');

    // Get performance metrics
    if (window.performanceMonitor) {
        const metrics = window.performanceMonitor.getMetrics();

        term.writeln('\x1b[1;35m🎮 Rendering Performance:\x1b[0m');
        term.writeln(`   FPS: ${metrics.fps.toFixed(1)}`);
        term.writeln(`   Frame Time: ${metrics.frameTime.toFixed(2)}ms`);
        term.writeln(`   Memory Usage: ${metrics.memoryUsage.toFixed(1)} MB`);
        term.writeln(`   GC Count: ${metrics.gcCount}`);

        if (performanceStats.avgFPS > 0) {
            term.writeln(`   WebGL FPS: ${performanceStats.avgFPS.toFixed(1)}`);
        }
    }

    // WebSocket performance
    if (window.ws && window.ws.getStats) {
        const wsStats = window.ws.getStats();
        term.writeln('\x1b[1;35m🌐 Network Performance:\x1b[0m');
        term.writeln(`   Messages Sent: ${wsStats.messagesSent}`);
        term.writeln(`   Messages Received: ${wsStats.messagesReceived}`);
        term.writeln(`   Bytes Sent: ${(wsStats.bytesSent / 1024).toFixed(1)} KB`);
        term.writeln(`   Bytes Received: ${(wsStats.bytesReceived / 1024).toFixed(1)} KB`);
        term.writeln(`   Compression Ratio: ${wsStats.compressionRatio.toFixed(2)}x`);
        term.writeln(`   Average Latency: ${wsStats.averageLatency.toFixed(1)}ms`);
        term.writeln(`   Throughput: ${wsStats.throughputMbps.toFixed(2)} Mbps`);
    }

    term.writeln('\x1b[1;36m' + '='.repeat(70) + '\x1b[0m');
}

// Display memory statistics
function displayMemoryStats() {
    if (!term) return;

    term.writeln('\x1b[1;36m' + '='.repeat(60) + '\x1b[0m');
    term.writeln('\x1b[1;36m💾 Memory Statistics\x1b[0m');
    term.writeln('\x1b[1;36m' + '='.repeat(60) + '\x1b[0m');

    if (performance.memory) {
        const memory = performance.memory;
        term.writeln('\x1b[1;35m🧠 JavaScript Heap:\x1b[0m');
        term.writeln(`   Used: ${(memory.usedJSHeapSize / 1024 / 1024).toFixed(1)} MB`);
        term.writeln(`   Total: ${(memory.totalJSHeapSize / 1024 / 1024).toFixed(1)} MB`);
        term.writeln(`   Limit: ${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(1)} MB`);
        term.writeln(`   Usage: ${((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100).toFixed(1)}%`);
    }

    // Navigator memory info
    if (navigator.deviceMemory) {
        term.writeln('\x1b[1;35m🖥️  Device Memory:\x1b[0m');
        term.writeln(`   Total RAM: ${navigator.deviceMemory} GB`);
    }

    if (navigator.hardwareConcurrency) {
        term.writeln(`   CPU Cores: ${navigator.hardwareConcurrency}`);
    }

    term.writeln('\x1b[1;36m' + '='.repeat(60) + '\x1b[0m');
}

// Display object pool statistics
function displayPoolStats() {
    if (!term) return;

    term.writeln('\x1b[1;36m' + '='.repeat(70) + '\x1b[0m');
    term.writeln('\x1b[1;36m📦 Object Pool Statistics\x1b[0m');
    term.writeln('\x1b[1;36m' + '='.repeat(70) + '\x1b[0m');

    if (window.performanceMonitor && window.performanceMonitor.metrics.poolStats) {
        const poolStats = window.performanceMonitor.metrics.poolStats;

        Object.entries(poolStats).forEach(([poolName, stats]) => {
            term.writeln(`\x1b[1;35m📦 ${poolName} Pool:\x1b[0m`);
            term.writeln(`   Pool Size: ${stats.poolSize}`);
            term.writeln(`   Created: ${stats.created}`);
            term.writeln(`   Acquired: ${stats.acquired}`);
            term.writeln(`   Released: ${stats.released}`);
            term.writeln(`   Hit Rate: ${(stats.hitRate * 100).toFixed(1)}%`);
            term.writeln(`   Efficiency: ${(stats.efficiency * 100).toFixed(1)}%`);
            term.writeln('');
        });
    }

    // Terminal buffer stats
    if (window.terminalBuffer && window.terminalBuffer.getStats) {
        const bufferStats = window.terminalBuffer.getStats();
        term.writeln('\x1b[1;35m📜 Terminal Buffer:\x1b[0m');
        term.writeln(`   Size: ${bufferStats.size}`);
        term.writeln(`   Count: ${bufferStats.count}`);
        term.writeln(`   Utilization: ${(bufferStats.utilization * 100).toFixed(1)}%`);
        term.writeln(`   Pushes: ${bufferStats.pushes}`);
        term.writeln(`   Overwrites: ${bufferStats.overwrites}`);
    }

    term.writeln('\x1b[1;36m' + '='.repeat(70) + '\x1b[0m');
}

// Clear object pools to free memory
function clearObjectPools() {
    if (!term) return;

    term.writeln('\x1b[1;33m🧹 Clearing object pools...\x1b[0m');

    let cleared = 0;

    if (window.terminalLinePool) {
        window.terminalLinePool.clear();
        cleared++;
    }

    if (window.messagePool) {
        window.messagePool.clear();
        cleared++;
    }

    if (window.bufferPool) {
        window.bufferPool.clear();
        cleared++;
    }

    if (window.uint8ArrayPool) {
        window.uint8ArrayPool.clear();
        cleared++;
    }

    // Force garbage collection if available
    if (window.gc) {
        window.gc();
        term.writeln('\x1b[1;32m♻️  Forced garbage collection\x1b[0m');
    }

    term.writeln(`\x1b[1;32m✅ Cleared ${cleared} object pools\x1b[0m`);
    term.writeln('\x1b[1;33m💡 Memory should be freed shortly\x1b[0m');
};

// Live dashboard control functions
function toggleLiveDashboard() {
    if (!term) return;

    if (window.liveDashboard) {
        window.liveDashboard.toggle();
        const dashboard = document.querySelector('.performance-dashboard');
        const isVisible = dashboard && dashboard.style.display !== 'none';

        if (isVisible) {
            term.writeln('\x1b[1;32m📊 Live dashboard shown\x1b[0m');
        } else {
            term.writeln('\x1b[1;33m📊 Live dashboard hidden\x1b[0m');
        }
    } else {
        term.writeln('\x1b[1;31m❌ Live dashboard not available\x1b[0m');
    }
}

function showLiveDashboard() {
    if (!term) return;

    if (window.liveDashboard) {
        window.liveDashboard.show();
        term.writeln('\x1b[1;32m📊 Live dashboard shown\x1b[0m');
    } else {
        term.writeln('\x1b[1;31m❌ Live dashboard not available\x1b[0m');
    }
}

function hideLiveDashboard() {
    if (!term) return;

    if (window.liveDashboard) {
        window.liveDashboard.hide();
        term.writeln('\x1b[1;33m📊 Live dashboard hidden\x1b[0m');
    } else {
        term.writeln('\x1b[1;31m❌ Live dashboard not available\x1b[0m');
    }
}

// Display current dashboard metrics
function displayDashboardMetrics() {
    if (!term) return;

    if (window.liveDashboard) {
        const metrics = window.liveDashboard.getCurrentMetrics();

        term.writeln('\x1b[1;36m' + '='.repeat(50) + '\x1b[0m');
        term.writeln('\x1b[1;36m📊 Live Dashboard Metrics\x1b[0m');
        term.writeln('\x1b[1;36m' + '='.repeat(50) + '\x1b[0m');

        term.writeln(`\x1b[1;32m🎮 FPS: ${metrics.fps.toFixed(1)}\x1b[0m`);
        term.writeln(`\x1b[1;32m💾 Memory: ${metrics.memory.toFixed(1)} MB\x1b[0m`);
        term.writeln(`\x1b[1;32m🌐 Latency: ${metrics.latency.toFixed(1)} ms\x1b[0m`);
        term.writeln(`\x1b[1;32m📊 Pool Hit Rate: ${metrics.poolHitRate.toFixed(1)}%\x1b[0m`);
        term.writeln(`\x1b[1;32m🗜️ Compression: ${metrics.compressionRatio.toFixed(2)}x\x1b[0m`);

        term.writeln('\x1b[1;36m' + '='.repeat(50) + '\x1b[0m');
    } else {
        term.writeln('\x1b[1;31m❌ Live dashboard not available\x1b[0m');
    }
};

// Virtual scrolling control functions
function enableVirtualScrolling() {
    if (!term) return;

    if (window.terminalBuffer && window.terminalBuffer.enableVirtualScrolling) {
        try {
            window.terminalBuffer.enableVirtualScrolling(term, {
                visibleLines: 50,
                bufferSize: 100000,
                overscan: 10
            });
            term.writeln('\x1b[1;32m📜 Virtual scrolling enabled\x1b[0m');
            term.writeln('\x1b[1;33m💡 Can now handle 100K+ lines efficiently\x1b[0m');
        } catch (e) {
            term.writeln('\x1b[1;31m❌ Failed to enable virtual scrolling\x1b[0m');
            console.error('Virtual scrolling error:', e);
        }
    } else {
        term.writeln('\x1b[1;31m❌ Virtual scrolling not available\x1b[0m');
    }
}

function disableVirtualScrolling() {
    if (!term) return;

    if (window.terminalBuffer && window.terminalBuffer.disableVirtualScrolling) {
        window.terminalBuffer.disableVirtualScrolling();
        term.writeln('\x1b[1;33m📜 Virtual scrolling disabled\x1b[0m');
    } else {
        term.writeln('\x1b[1;31m❌ Virtual scrolling not available\x1b[0m');
    }
}

function displayVirtualScrollStats() {
    if (!term) return;

    if (window.terminalBuffer && window.terminalBuffer.getVirtualScrollingStats) {
        const stats = window.terminalBuffer.getVirtualScrollingStats();

        if (stats) {
            term.writeln('\x1b[1;36m' + '='.repeat(60) + '\x1b[0m');
            term.writeln('\x1b[1;36m📜 Virtual Scrolling Statistics\x1b[0m');
            term.writeln('\x1b[1;36m' + '='.repeat(60) + '\x1b[0m');

            term.writeln(`\x1b[1;32m📊 Total Lines: ${stats.totalLines}\x1b[0m`);
            term.writeln(`\x1b[1;32m👁️  Rendered Lines: ${stats.renderedLines}\x1b[0m`);
            term.writeln(`\x1b[1;32m📈 Render Efficiency: ${(stats.renderEfficiency * 100).toFixed(1)}%\x1b[0m`);
            term.writeln(`\x1b[1;32m🎯 Buffer Utilization: ${(stats.bufferUtilization * 100).toFixed(1)}%\x1b[0m`);
            term.writeln(`\x1b[1;32m⏱️  Last Render Time: ${stats.lastRenderTime.toFixed(2)}ms\x1b[0m`);
            term.writeln(`\x1b[1;32m🖱️  Scroll Events: ${stats.scrollEvents}\x1b[0m`);

            if (stats.visibleRange) {
                term.writeln(`\x1b[1;33m👁️  Visible Range: ${stats.visibleRange.start}-${stats.visibleRange.end} of ${stats.visibleRange.total}\x1b[0m`);
            }

            term.writeln('\x1b[1;36m' + '='.repeat(60) + '\x1b[0m');
        } else {
            term.writeln('\x1b[1;33m⚠️ Virtual scrolling not active\x1b[0m');
        }
    } else {
        term.writeln('\x1b[1;31m❌ Virtual scrolling not available\x1b[0m');
    }
}

// Font atlas control functions
function generateFontAtlas() {
    if (!term) return;

    if (window.OptimizedFontAtlas) {
        term.writeln('\x1b[1;33m🎨 Generating optimized font atlas...\x1b[0m');

        try {
            const fontAtlas = new window.OptimizedFontAtlas({
                fontFamily: 'monospace',
                fontSize: 16,
                atlasSize: 2048
            });

            fontAtlas.generateAtlas('ascii').then(() => {
                const stats = fontAtlas.getStats();
                term.writeln('\x1b[1;32m✅ Font atlas generated successfully\x1b[0m');
                term.writeln(`\x1b[1;33m📊 Generated ${stats.glyphsGenerated} glyphs in ${stats.generationTime.toFixed(2)}ms\x1b[0m`);
                term.writeln(`\x1b[1;33m📈 Atlas utilization: ${(stats.atlasUtilization * 100).toFixed(1)}%\x1b[0m`);

                // Store globally for use
                window.globalFontAtlas = fontAtlas;
            }).catch(e => {
                term.writeln('\x1b[1;31m❌ Font atlas generation failed\x1b[0m');
                console.error('Font atlas error:', e);
            });
        } catch (e) {
            term.writeln('\x1b[1;31m❌ Failed to create font atlas\x1b[0m');
            console.error('Font atlas error:', e);
        }
    } else {
        term.writeln('\x1b[1;31m❌ Font atlas optimization not available\x1b[0m');
    }
}

function displayFontAtlasStats() {
    if (!term) return;

    if (window.globalFontAtlas) {
        const stats = window.globalFontAtlas.getStats();

        term.writeln('\x1b[1;36m' + '='.repeat(60) + '\x1b[0m');
        term.writeln('\x1b[1;36m🎨 Font Atlas Statistics\x1b[0m');
        term.writeln('\x1b[1;36m' + '='.repeat(60) + '\x1b[0m');

        term.writeln(`\x1b[1;32m📊 Glyphs Generated: ${stats.glyphsGenerated}\x1b[0m`);
        term.writeln(`\x1b[1;32m💾 Cache Size: ${stats.cacheSize}\x1b[0m`);
        term.writeln(`\x1b[1;32m🎯 Cache Hit Rate: ${(stats.hitRate * 100).toFixed(1)}%\x1b[0m`);
        term.writeln(`\x1b[1;32m📈 Atlas Utilization: ${(stats.atlasUtilization * 100).toFixed(1)}%\x1b[0m`);
        term.writeln(`\x1b[1;32m⏱️  Generation Time: ${stats.generationTime.toFixed(2)}ms\x1b[0m`);
        term.writeln(`\x1b[1;32m📏 Atlas Size: ${stats.atlasSize}x${stats.atlasSize}px\x1b[0m`);

        if (stats.charDimensions) {
            term.writeln(`\x1b[1;33m📐 Character Size: ${stats.charDimensions.width}x${stats.charDimensions.height}px\x1b[0m`);
        }

        term.writeln('\x1b[1;36m' + '='.repeat(60) + '\x1b[0m');
    } else {
        term.writeln('\x1b[1;33m⚠️ Font atlas not generated yet\x1b[0m');
        term.writeln('\x1b[1;32m💡 Use "font-atlas-generate" to create one\x1b[0m');
    }
}

// Display comprehensive optimization status
function displayOptimizationStatus() {
    if (!term) return;

    term.writeln('\x1b[1;36m' + '='.repeat(70) + '\x1b[0m');
    term.writeln('\x1b[1;36m⚡ Performance Optimization Status\x1b[0m');
    term.writeln('\x1b[1;36m' + '='.repeat(70) + '\x1b[0m');

    // WebGL Status
    const webglStatus = rendererType === 'webgl' ? '✅ Active' : '❌ Inactive';
    term.writeln(`\x1b[1;35m🎮 WebGL GPU Acceleration: ${webglStatus}\x1b[0m`);

    // Object Pooling Status
    const poolingStatus = window.terminalLinePool ? '✅ Active' : '❌ Inactive';
    term.writeln(`\x1b[1;35m📦 Object Pooling: ${poolingStatus}\x1b[0m`);

    // Binary Protocol Status
    const binaryStatus = window.BinaryProtocol ? '✅ Available' : '❌ Unavailable';
    term.writeln(`\x1b[1;35m📡 Binary Protocol: ${binaryStatus}\x1b[0m`);

    // Virtual Scrolling Status
    const virtualStatus = window.terminalBuffer && window.terminalBuffer.isVirtualScrollingEnabled ? '✅ Active' : '❌ Inactive';
    term.writeln(`\x1b[1;35m📜 Virtual Scrolling: ${virtualStatus}\x1b[0m`);

    // Font Atlas Status
    const fontAtlasStatus = window.globalFontAtlas ? '✅ Generated' : '❌ Not Generated';
    term.writeln(`\x1b[1;35m🎨 Font Atlas: ${fontAtlasStatus}\x1b[0m`);

    // Text Shaping Status
    const textShapingStatus = window.enhancedTextRenderer ? '✅ Active' : '❌ Inactive';
    term.writeln(`\x1b[1;35m🎨 Text Shaping & Ligatures: ${textShapingStatus}\x1b[0m`);

    // Batch Rendering Status
    const batchRenderingStatus = window.batchRenderer ? '✅ Active' : '❌ Inactive';
    term.writeln(`\x1b[1;35m🎨 Batch Rendering: ${batchRenderingStatus}\x1b[0m`);

    // Subpixel Rendering Status
    const subpixelStatus = window.enhancedTextRenderer?.getSubpixelCapabilities()?.isEnabled ? '✅ Active' : '❌ Inactive';
    term.writeln(`\x1b[1;35m🎨 Subpixel Rendering: ${subpixelStatus}\x1b[0m`);

    // Worker Threads Status
    const workerThreadsStatus = window.workerThreadManager ? '✅ Active' : '❌ Inactive';
    term.writeln(`\x1b[1;35m🧵 Worker Threads: ${workerThreadsStatus}\x1b[0m`);

    // Advanced Caching Status
    const advancedCachingStatus = window.advancedCacheManager ? '✅ Active' : '❌ Inactive';
    term.writeln(`\x1b[1;35m💾 Advanced Caching: ${advancedCachingStatus}\x1b[0m`);

    // Live Dashboard Status
    const dashboardStatus = window.liveDashboard ? '✅ Active' : '❌ Inactive';
    term.writeln(`\x1b[1;35m📊 Live Dashboard: ${dashboardStatus}\x1b[0m`);

    term.writeln('\x1b[1;36m' + '='.repeat(70) + '\x1b[0m');
    term.writeln('\x1b[1;32m💡 Available Commands:\x1b[0m');
    term.writeln('   virtual-scroll-enable/disable - Control virtual scrolling');
    term.writeln('   font-atlas-generate - Generate optimized font atlas');
    term.writeln('   ligatures-enable/disable - Control font ligatures');
    term.writeln('   batch-rendering-enable/disable - Control batch rendering');
    term.writeln('   subpixel-rendering-test - Test subpixel rendering quality');
    term.writeln('   worker-threads-test - Test worker thread performance');
    term.writeln('   cache-stats - Show advanced cache statistics');
    term.writeln('   perf-stats - Show performance statistics');
    term.writeln('   optimization-status - Show this status');
};

// Text shaping and ligature control functions
function enableLigatures() {
    if (!term) return;

    if (window.enhancedTextRenderer) {
        window.enhancedTextRenderer.setTextShapingOptions({
            enableLigatures: true,
            enableTextShaping: true
        });
        term.writeln('\x1b[1;32m🎨 Font ligatures enabled\x1b[0m');
        term.writeln('\x1b[1;33m💡 Programming symbols like == -> >= will now render as ligatures\x1b[0m');
    } else {
        term.writeln('\x1b[1;31m❌ Enhanced text renderer not available\x1b[0m');
    }
}

function disableLigatures() {
    if (!term) return;

    if (window.enhancedTextRenderer) {
        window.enhancedTextRenderer.setTextShapingOptions({
            enableLigatures: false
        });
        term.writeln('\x1b[1;33m🎨 Font ligatures disabled\x1b[0m');
    } else {
        term.writeln('\x1b[1;31m❌ Enhanced text renderer not available\x1b[0m');
    }
}

function testLigatures() {
    if (!term) return;

    if (window.enhancedTextRenderer) {
        const testResults = window.enhancedTextRenderer.testTextShaping();

        term.writeln('\x1b[1;36m' + '='.repeat(70) + '\x1b[0m');
        term.writeln('\x1b[1;36m🎨 Font Ligature Test Results\x1b[0m');
        term.writeln('\x1b[1;36m' + '='.repeat(70) + '\x1b[0m');

        testResults.forEach((result, index) => {
            term.writeln(`\x1b[1;33m${index + 1}. Original:\x1b[0m ${result.original}`);
            if (result.hasLigatures) {
                term.writeln(`   \x1b[1;32mShaped:\x1b[0m   ${result.shaped}`);
                term.writeln(`   \x1b[1;35mLigatures:\x1b[0m ${result.ligatures.map(l => `${l.sequence}→${l.ligature}`).join(', ')}`);
            } else {
                term.writeln(`   \x1b[1;37mNo ligatures applied\x1b[0m`);
            }
            term.writeln('');
        });

        term.writeln('\x1b[1;36m' + '='.repeat(70) + '\x1b[0m');
    } else {
        term.writeln('\x1b[1;31m❌ Enhanced text renderer not available\x1b[0m');
    }
}

function listLigatures() {
    if (!term) return;

    if (window.enhancedTextRenderer) {
        const ligatures = window.enhancedTextRenderer.getAvailableLigatures();

        term.writeln('\x1b[1;36m' + '='.repeat(60) + '\x1b[0m');
        term.writeln('\x1b[1;36m🎨 Available Font Ligatures\x1b[0m');
        term.writeln('\x1b[1;36m' + '='.repeat(60) + '\x1b[0m');

        // Group ligatures by category
        const categories = {
            'Equality & Comparison': ['==', '===', '!=', '!==', '<=', '>=', '<>'],
            'Arrows & Pointers': ['->', '=>', '<-', '<=', '<->', '=>>', '<<-', '->>'],
            'Logic Operators': ['&&', '||', '!'],
            'Mathematical': ['++', '--', '**', '/*', '*/', '//'],
            'Functional Programming': ['>>=', '=<<', '<$>', '<*>', '<|>', '|>', '<|'],
            'Special Symbols': ['...', '..', ':::', '::', ';;', '??', '?:', '!?']
        };

        Object.entries(categories).forEach(([category, sequences]) => {
            term.writeln(`\x1b[1;35m${category}:\x1b[0m`);
            sequences.forEach(seq => {
                const ligature = ligatures.find(l => l.sequence === seq);
                if (ligature) {
                    term.writeln(`   ${seq} → ${ligature.ligature} (U+${ligature.unicode})`);
                }
            });
            term.writeln('');
        });

        term.writeln(`\x1b[1;32m📊 Total ligatures available: ${ligatures.length}\x1b[0m`);
        term.writeln('\x1b[1;36m' + '='.repeat(60) + '\x1b[0m');
    } else {
        term.writeln('\x1b[1;31m❌ Enhanced text renderer not available\x1b[0m');
    }
}

function displayTextShapingStats() {
    if (!term) return;

    if (window.enhancedTextRenderer) {
        const stats = window.enhancedTextRenderer.getStats();

        term.writeln('\x1b[1;36m' + '='.repeat(70) + '\x1b[0m');
        term.writeln('\x1b[1;36m🎨 Text Shaping Statistics\x1b[0m');
        term.writeln('\x1b[1;36m' + '='.repeat(70) + '\x1b[0m');

        term.writeln('\x1b[1;35m📊 Rendering Performance:\x1b[0m');
        term.writeln(`   Lines Rendered: ${stats.linesRendered}`);
        term.writeln(`   Characters Rendered: ${stats.charactersRendered}`);
        term.writeln(`   Ligatures Rendered: ${stats.ligaturesRendered}`);
        term.writeln(`   Average Render Time: ${stats.averageRenderTime.toFixed(2)}ms`);
        term.writeln(`   Cache Hit Rate: ${(stats.cacheHitRate * 100).toFixed(1)}%`);
        term.writeln(`   Cache Size: ${stats.cacheSize}/${stats.maxCacheSize}`);

        if (stats.textShaping) {
            term.writeln('\x1b[1;35m🎨 Text Shaping Engine:\x1b[0m');
            term.writeln(`   Shaping Calls: ${stats.textShaping.totalShapingCalls}`);
            term.writeln(`   Ligatures Applied: ${stats.textShaping.ligaturesApplied}`);
            term.writeln(`   Cache Hit Rate: ${(stats.textShaping.cacheHitRate * 100).toFixed(1)}%`);
            term.writeln(`   Available Ligatures: ${stats.textShaping.availableLigatures}`);
            term.writeln(`   Average Shaping Time: ${stats.textShaping.averageShapingTime.toFixed(2)}ms`);
        }

        if (stats.fontAtlas) {
            term.writeln('\x1b[1;35m🎨 Font Atlas:\x1b[0m');
            term.writeln(`   Glyphs Generated: ${stats.fontAtlas.glyphsGenerated}`);
            term.writeln(`   Atlas Utilization: ${(stats.fontAtlas.atlasUtilization * 100).toFixed(1)}%`);
            term.writeln(`   Generation Time: ${stats.fontAtlas.generationTime.toFixed(2)}ms`);
        }

        term.writeln('\x1b[1;36m' + '='.repeat(70) + '\x1b[0m');
    } else {
        term.writeln('\x1b[1;31m❌ Enhanced text renderer not available\x1b[0m');
    }
};

// Batch rendering control functions
function enableBatchRendering() {
    if (!term) return;

    // Check if WebGL is available
    if (rendererType !== 'webgl') {
        term.writeln('\x1b[1;31m❌ Batch rendering requires WebGL acceleration\x1b[0m');
        term.writeln('\x1b[1;33m💡 WebGL is not active - batch rendering unavailable\x1b[0m');
        return;
    }

    if (window.BatchRenderer) {
        try {
            // Get WebGL context from terminal
            const canvas = document.querySelector('canvas');
            if (!canvas) {
                term.writeln('\x1b[1;31m❌ No WebGL canvas found\x1b[0m');
                return;
            }

            const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
            if (!gl) {
                term.writeln('\x1b[1;31m❌ Failed to get WebGL context\x1b[0m');
                return;
            }

            // Create batch renderer
            window.batchRenderer = new window.BatchRenderer(gl, {
                maxBatchSize: 2048,
                maxBatches: 64
            });

            // Initialize asynchronously
            window.batchRenderer.initialize().then(() => {
                term.writeln('\x1b[1;32m🎨 Batch rendering enabled\x1b[0m');
                term.writeln('\x1b[1;33m💡 Can now render 2000+ characters per draw call\x1b[0m');
                term.writeln('\x1b[1;33m📊 Expected 2-4x performance improvement\x1b[0m');
            }).catch(e => {
                term.writeln('\x1b[1;31m❌ Failed to initialize batch renderer\x1b[0m');
                console.error('Batch renderer initialization failed:', e);
            });

        } catch (e) {
            term.writeln('\x1b[1;31m❌ Failed to create batch renderer\x1b[0m');
            console.error('Batch renderer error:', e);
        }
    } else {
        term.writeln('\x1b[1;31m❌ Batch renderer not available\x1b[0m');
    }
}

function disableBatchRendering() {
    if (!term) return;

    if (window.batchRenderer) {
        window.batchRenderer.destroy();
        window.batchRenderer = null;
        term.writeln('\x1b[1;33m🎨 Batch rendering disabled\x1b[0m');
    } else {
        term.writeln('\x1b[1;31m❌ Batch renderer not active\x1b[0m');
    }
}

function displayBatchRenderingStats() {
    if (!term) return;

    if (window.batchRenderer) {
        const stats = window.batchRenderer.getStats();

        term.writeln('\x1b[1;36m' + '='.repeat(70) + '\x1b[0m');
        term.writeln('\x1b[1;36m🎨 Batch Rendering Statistics\x1b[0m');
        term.writeln('\x1b[1;36m' + '='.repeat(70) + '\x1b[0m');

        term.writeln('\x1b[1;35m📊 Rendering Performance:\x1b[0m');
        term.writeln(`   Batches Rendered: ${stats.batchesRendered}`);
        term.writeln(`   Characters Rendered: ${stats.charactersRendered}`);
        term.writeln(`   Draw Calls: ${stats.drawCalls}`);
        term.writeln(`   Average Batch Size: ${stats.averageBatchSize.toFixed(1)} characters`);
        term.writeln(`   Characters per Draw Call: ${stats.charactersPerDrawCall.toFixed(1)}`);
        term.writeln(`   Total Render Time: ${stats.renderTime.toFixed(2)}ms`);

        term.writeln('\x1b[1;35m📦 Batch Management:\x1b[0m');
        term.writeln(`   Active Batches: ${stats.activeBatches}`);
        term.writeln(`   Pooled Batches: ${stats.pooledBatches}`);
        term.writeln(`   Max Batch Size: ${stats.maxBatchSize} characters`);

        // Calculate efficiency metrics
        const efficiency = stats.charactersPerDrawCall / stats.maxBatchSize;
        const efficiencyColor = efficiency > 0.8 ? '\x1b[1;32m' : efficiency > 0.5 ? '\x1b[1;33m' : '\x1b[1;31m';

        term.writeln('\x1b[1;35m⚡ Efficiency Metrics:\x1b[0m');
        term.writeln(`   ${efficiencyColor}Batch Efficiency: ${(efficiency * 100).toFixed(1)}%\x1b[0m`);

        if (stats.charactersRendered > 0) {
            const avgTimePerChar = stats.renderTime / stats.charactersRendered;
            term.writeln(`   Time per Character: ${(avgTimePerChar * 1000).toFixed(3)}μs`);
        }

        term.writeln('\x1b[1;36m' + '='.repeat(70) + '\x1b[0m');
    } else {
        term.writeln('\x1b[1;31m❌ Batch renderer not active\x1b[0m');
        term.writeln('\x1b[1;32m💡 Use "batch-rendering-enable" to activate\x1b[0m');
    }
}

function testBatchRendering() {
    if (!term) return;

    if (!window.batchRenderer) {
        term.writeln('\x1b[1;31m❌ Batch renderer not active\x1b[0m');
        term.writeln('\x1b[1;32m💡 Use "batch-rendering-enable" first\x1b[0m');
        return;
    }

    if (!window.enhancedTextRenderer) {
        term.writeln('\x1b[1;31m❌ Enhanced text renderer not available\x1b[0m');
        return;
    }

    term.writeln('\x1b[1;36m🎨 Testing batch rendering performance...\x1b[0m');

    // Clear stats
    window.batchRenderer.clearStats();

    // Test data
    const testLines = [
        'function batchRenderTest() {',
        '    const data = [1, 2, 3, 4, 5];',
        '    return data.map(x => x * 2);',
        '}',
        '',
        'if (performance >= 75) {',
        '    console.log("Excellent!");',
        '} else if (performance >= 30) {',
        '    console.log("Good");',
        '} else {',
        '    console.log("Needs optimization");',
        '}',
        '',
        'const result = await fetch("/api/data");',
        'const json = await result.json();',
        'console.log("Data:", json);'
    ];

    const startTime = performance.now();

    // Render test lines using batch renderer
    window.enhancedTextRenderer.beginFrame();

    testLines.forEach((line, index) => {
        window.enhancedTextRenderer.renderTextBatch(line, 10, 50 + index * 20, {
            color: [0.8, 1.0, 0.8, 1.0],
            opacity: 1.0
        });
    });

    window.enhancedTextRenderer.endFrame();

    const renderTime = performance.now() - startTime;
    const stats = window.batchRenderer.getStats();

    term.writeln('\x1b[1;32m✅ Batch rendering test completed\x1b[0m');
    term.writeln(`\x1b[1;33m📊 Rendered ${testLines.length} lines in ${renderTime.toFixed(2)}ms\x1b[0m`);
    term.writeln(`\x1b[1;33m📦 Used ${stats.drawCalls} draw calls for ${stats.charactersRendered} characters\x1b[0m`);
    term.writeln(`\x1b[1;33m⚡ Efficiency: ${(stats.charactersPerDrawCall).toFixed(1)} chars/draw call\x1b[0m`);

    if (stats.charactersPerDrawCall > 100) {
        term.writeln('\x1b[1;32m🚀 Excellent batching efficiency!\x1b[0m');
    } else if (stats.charactersPerDrawCall > 50) {
        term.writeln('\x1b[1;33m👍 Good batching efficiency\x1b[0m');
    } else {
        term.writeln('\x1b[1;31m⚠️ Low batching efficiency - check implementation\x1b[0m');
    }
};

// Subpixel rendering control functions
function enableSubpixelRendering() {
    if (!term) return;

    if (window.enhancedTextRenderer) {
        const capabilities = window.enhancedTextRenderer.getSubpixelCapabilities();

        if (!capabilities.isAvailable) {
            term.writeln('\x1b[1;31m❌ Subpixel renderer not available\x1b[0m');
            return;
        }

        window.enhancedTextRenderer.setSubpixelRenderingOptions({
            enableSubpixelRendering: true,
            subpixelOptions: {
                enableSubpixelPositioning: true,
                enableRGBSubpixels: true,
                enableClearType: true
            }
        });

        term.writeln('\x1b[1;32m🎨 Subpixel rendering enabled\x1b[0m');
        term.writeln(`\x1b[1;33m📱 Device pixel ratio: ${capabilities.devicePixelRatio}x\x1b[0m`);
        term.writeln(`\x1b[1;33m📊 Display type: ${capabilities.isHighDPI ? 'High-DPI' : 'Standard'}\x1b[0m`);
        term.writeln('\x1b[1;33m💡 Text should now appear significantly sharper\x1b[0m');
    } else {
        term.writeln('\x1b[1;31m❌ Enhanced text renderer not available\x1b[0m');
    }
}

function disableSubpixelRendering() {
    if (!term) return;

    if (window.enhancedTextRenderer) {
        window.enhancedTextRenderer.setSubpixelRenderingOptions({
            enableSubpixelRendering: false
        });
        term.writeln('\x1b[1;33m🎨 Subpixel rendering disabled\x1b[0m');
    } else {
        term.writeln('\x1b[1;31m❌ Enhanced text renderer not available\x1b[0m');
    }
}

function testSubpixelRendering() {
    if (!term) return;

    if (!window.enhancedTextRenderer) {
        term.writeln('\x1b[1;31m❌ Enhanced text renderer not available\x1b[0m');
        return;
    }

    const capabilities = window.enhancedTextRenderer.getSubpixelCapabilities();

    if (!capabilities.isAvailable) {
        term.writeln('\x1b[1;31m❌ Subpixel renderer not available\x1b[0m');
        return;
    }

    term.writeln('\x1b[1;36m🎨 Testing subpixel rendering quality...\x1b[0m');

    try {
        const qualityResults = window.enhancedTextRenderer.testSubpixelQuality();

        if (qualityResults.error) {
            term.writeln(`\x1b[1;31m❌ Test failed: ${qualityResults.error}\x1b[0m`);
            return;
        }

        term.writeln('\x1b[1;36m' + '='.repeat(60) + '\x1b[0m');
        term.writeln('\x1b[1;36m🎨 Subpixel Rendering Quality Test\x1b[0m');
        term.writeln('\x1b[1;36m' + '='.repeat(60) + '\x1b[0m');

        let totalImprovement = 0;
        let testCount = 0;

        qualityResults.forEach((result, index) => {
            const improvementColor = result.improvement > 20 ? '\x1b[1;32m' :
                                   result.improvement > 10 ? '\x1b[1;33m' : '\x1b[1;31m';

            term.writeln(`\x1b[1;35m${index + 1}. Character '${result.character}':\x1b[0m`);
            term.writeln(`   Regular sharpness: ${result.regularSharpness.toFixed(0)}`);
            term.writeln(`   Subpixel sharpness: ${result.subpixelSharpness.toFixed(0)}`);
            term.writeln(`   ${improvementColor}Improvement: ${result.improvement.toFixed(1)}%\x1b[0m`);
            term.writeln('');

            totalImprovement += result.improvement;
            testCount++;
        });

        const avgImprovement = totalImprovement / testCount;
        const overallColor = avgImprovement > 20 ? '\x1b[1;32m' :
                           avgImprovement > 10 ? '\x1b[1;33m' : '\x1b[1;31m';

        term.writeln(`${overallColor}📊 Average sharpness improvement: ${avgImprovement.toFixed(1)}%\x1b[0m`);

        if (avgImprovement > 20) {
            term.writeln('\x1b[1;32m🚀 Excellent subpixel rendering quality!\x1b[0m');
        } else if (avgImprovement > 10) {
            term.writeln('\x1b[1;33m👍 Good subpixel rendering improvement\x1b[0m');
        } else {
            term.writeln('\x1b[1;31m⚠️ Limited subpixel rendering benefit\x1b[0m');
        }

        term.writeln('\x1b[1;36m' + '='.repeat(60) + '\x1b[0m');

    } catch (e) {
        term.writeln('\x1b[1;31m❌ Subpixel rendering test failed\x1b[0m');
        console.error('Subpixel rendering test error:', e);
    }
}

function displaySubpixelRenderingStats() {
    if (!term) return;

    if (!window.enhancedTextRenderer) {
        term.writeln('\x1b[1;31m❌ Enhanced text renderer not available\x1b[0m');
        return;
    }

    const stats = window.enhancedTextRenderer.getStats();
    const capabilities = window.enhancedTextRenderer.getSubpixelCapabilities();

    term.writeln('\x1b[1;36m' + '='.repeat(70) + '\x1b[0m');
    term.writeln('\x1b[1;36m🎨 Subpixel Rendering Statistics\x1b[0m');
    term.writeln('\x1b[1;36m' + '='.repeat(70) + '\x1b[0m');

    term.writeln('\x1b[1;35m📱 Display Information:\x1b[0m');
    term.writeln(`   Device Pixel Ratio: ${capabilities.devicePixelRatio}x`);
    term.writeln(`   Display Type: ${capabilities.isHighDPI ? 'High-DPI' : 'Standard'}`);
    term.writeln(`   Subpixel Rendering: ${capabilities.isEnabled ? 'Enabled' : 'Disabled'}`);

    if (stats.subpixelRendering) {
        const subStats = stats.subpixelRendering;

        term.writeln('\x1b[1;35m📊 Rendering Performance:\x1b[0m');
        term.writeln(`   Glyphs Rendered: ${subStats.glyphsRendered}`);
        term.writeln(`   Cache Hit Rate: ${(subStats.cacheHitRate * 100).toFixed(1)}%`);
        term.writeln(`   Cache Size: ${subStats.cacheSize}`);
        term.writeln(`   Average Render Time: ${subStats.averageRenderTime.toFixed(2)}ms`);
        term.writeln(`   Subpixel Precision: ${subStats.subpixelPrecision}x`);

        term.writeln('\x1b[1;35m🎨 Quality Features:\x1b[0m');
        term.writeln(`   RGB Optimization: ${subStats.rgbOptimizationEnabled ? 'Enabled' : 'Disabled'}`);
        term.writeln(`   ClearType: ${subStats.clearTypeEnabled ? 'Enabled' : 'Disabled'}`);

        if (subStats.sharpnessImprovement > 0) {
            term.writeln(`   Sharpness Improvement: ${subStats.sharpnessImprovement.toFixed(1)}%`);
        }
    } else {
        term.writeln('\x1b[1;33m⚠️ Subpixel rendering not active\x1b[0m');
    }

    term.writeln('\x1b[1;36m' + '='.repeat(70) + '\x1b[0m');
};

// Worker thread control functions
function enableWorkerThreads() {
    if (!term) return;

    if (window.WorkerThreadManager) {
        if (!window.workerThreadManager) {
            try {
                window.workerThreadManager = new window.WorkerThreadManager({
                    maxWorkers: navigator.hardwareConcurrency || 4,
                    enableTextProcessing: true,
                    enableCompression: true,
                    enableParsing: true
                });

                window.workerThreadManager.initialize().then(() => {
                    const stats = window.workerThreadManager.getStats();
                    term.writeln('\x1b[1;32m🧵 Worker threads enabled\x1b[0m');
                    term.writeln(`\x1b[1;33m👥 Created ${stats.totalWorkers} workers\x1b[0m`);
                    term.writeln('\x1b[1;33m💡 Heavy computations will now run in background\x1b[0m');
                }).catch(e => {
                    term.writeln('\x1b[1;31m❌ Failed to initialize worker threads\x1b[0m');
                    console.error('Worker thread initialization failed:', e);
                });

            } catch (e) {
                term.writeln('\x1b[1;31m❌ Failed to create worker thread manager\x1b[0m');
                console.error('Worker thread manager error:', e);
            }
        } else {
            term.writeln('\x1b[1;33m⚠️ Worker threads already enabled\x1b[0m');
        }
    } else {
        term.writeln('\x1b[1;31m❌ Worker thread manager not available\x1b[0m');
    }
}

function disableWorkerThreads() {
    if (!term) return;

    if (window.workerThreadManager) {
        window.workerThreadManager.destroy();
        window.workerThreadManager = null;
        term.writeln('\x1b[1;33m🧵 Worker threads disabled\x1b[0m');
    } else {
        term.writeln('\x1b[1;31m❌ Worker threads not active\x1b[0m');
    }
}

function testWorkerThreads() {
    if (!term) return;

    if (!window.workerThreadManager) {
        term.writeln('\x1b[1;31m❌ Worker threads not active\x1b[0m');
        term.writeln('\x1b[1;32m💡 Use "worker-threads-enable" first\x1b[0m');
        return;
    }

    term.writeln('\x1b[1;36m🧵 Testing worker thread performance...\x1b[0m');

    const testData = `
        function fibonacci(n) {
            if (n <= 1) return n;
            return fibonacci(n - 1) + fibonacci(n - 2);
        }

        const result = fibonacci(30);
        console.log("Result:", result);
    `;

    const startTime = performance.now();

    // Test text processing in worker
    window.workerThreadManager.processTextAsync(testData, 'highlight', { language: 'javascript' })
        .then(result => {
            const processingTime = performance.now() - startTime;

            term.writeln('\x1b[1;32m✅ Worker thread test completed\x1b[0m');
            term.writeln(`\x1b[1;33m⏱️ Processing time: ${processingTime.toFixed(2)}ms\x1b[0m`);
            term.writeln(`\x1b[1;33m📊 Highlighted ${result.lineCount} lines\x1b[0m`);
            term.writeln('\x1b[1;33m🎯 UI thread remained responsive during processing\x1b[0m');
        })
        .catch(e => {
            term.writeln('\x1b[1;31m❌ Worker thread test failed\x1b[0m');
            console.error('Worker thread test error:', e);
        });

    // Test compression in worker
    window.workerThreadManager.compressAsync(testData)
        .then(result => {
            term.writeln(`\x1b[1;33m🗜️ Compression ratio: ${result.ratio.toFixed(2)}x\x1b[0m`);
        })
        .catch(e => {
            console.error('Compression test error:', e);
        });
}

function displayWorkerThreadsStats() {
    if (!term) return;

    if (!window.workerThreadManager) {
        term.writeln('\x1b[1;31m❌ Worker threads not active\x1b[0m');
        return;
    }

    const stats = window.workerThreadManager.getStats();

    term.writeln('\x1b[1;36m' + '='.repeat(70) + '\x1b[0m');
    term.writeln('\x1b[1;36m🧵 Worker Thread Statistics\x1b[0m');
    term.writeln('\x1b[1;36m' + '='.repeat(70) + '\x1b[0m');

    term.writeln('\x1b[1;35m👥 Worker Pool:\x1b[0m');
    term.writeln(`   Total Workers: ${stats.totalWorkers}`);
    term.writeln(`   Active Workers: ${stats.workersActive}`);
    term.writeln(`   Worker Utilization: ${(stats.workerUtilization * 100).toFixed(1)}%`);

    term.writeln('\x1b[1;35m📊 Task Performance:\x1b[0m');
    term.writeln(`   Tasks Completed: ${stats.tasksCompleted}`);
    term.writeln(`   Tasks Queued: ${stats.queuedTasks}`);
    term.writeln(`   Active Tasks: ${stats.activeTasks}`);
    term.writeln(`   Average Task Time: ${stats.averageTaskTime.toFixed(2)}ms`);

    term.writeln('\x1b[1;35m⚡ Performance Impact:\x1b[0m');
    term.writeln(`   UI Blocking Prevented: ${stats.uiBlockingPrevented} times`);
    term.writeln(`   Total Processing Time: ${stats.totalProcessingTime.toFixed(2)}ms`);

    const efficiency = stats.tasksCompleted > 0 ?
        (stats.uiBlockingPrevented / stats.tasksCompleted * 100) : 0;
    term.writeln(`   Threading Efficiency: ${efficiency.toFixed(1)}%`);

    term.writeln('\x1b[1;36m' + '='.repeat(70) + '\x1b[0m');
}

// Advanced cache control functions
function displayCacheStats() {
    if (!term) return;

    if (!window.advancedCacheManager) {
        term.writeln('\x1b[1;31m❌ Advanced cache manager not active\x1b[0m');
        return;
    }

    const stats = window.advancedCacheManager.getStats();

    term.writeln('\x1b[1;36m' + '='.repeat(70) + '\x1b[0m');
    term.writeln('\x1b[1;36m💾 Advanced Cache Statistics\x1b[0m');
    term.writeln('\x1b[1;36m' + '='.repeat(70) + '\x1b[0m');

    term.writeln('\x1b[1;35m📊 Overall Performance:\x1b[0m');
    term.writeln(`   Cache Hit Rate: ${(stats.hitRate * 100).toFixed(1)}%`);
    term.writeln(`   Total Hits: ${stats.hits}`);
    term.writeln(`   Total Misses: ${stats.misses}`);
    term.writeln(`   Evictions: ${stats.evictions}`);

    term.writeln('\x1b[1;35m💾 Memory Management:\x1b[0m');
    term.writeln(`   Current Usage: ${stats.memoryUsage.current.toFixed(1)} MB`);
    term.writeln(`   Peak Usage: ${stats.memoryUsage.peak.toFixed(1)} MB`);
    term.writeln(`   Memory Pressure: ${stats.memoryPressure}`);
    term.writeln(`   Memory Reclaimed: ${stats.memoryReclaimed.toFixed(1)} MB`);

    term.writeln('\x1b[1;35m🗜️ Compression:\x1b[0m');
    term.writeln(`   Compressions: ${stats.compressions}`);
    term.writeln(`   Decompressions: ${stats.decompressions}`);
    term.writeln(`   Compression Ratio: ${stats.efficiency.compressionRatio.toFixed(2)}x`);

    term.writeln('\x1b[1;35m🎯 Cache Strategies:\x1b[0m');
    Object.entries(stats.cacheStats).forEach(([strategy, strategyStats]) => {
        term.writeln(`   ${strategy.toUpperCase()}: ${strategyStats.size}/${strategyStats.maxSize} (${(strategyStats.hitRate * 100).toFixed(1)}% hit rate)`);
    });

    term.writeln('\x1b[1;35m🔮 Predictive Caching:\x1b[0m');
    term.writeln(`   Predictive Hits: ${stats.predictiveHits}`);
    term.writeln(`   GC Runs: ${stats.gcRuns}`);

    term.writeln('\x1b[1;36m' + '='.repeat(70) + '\x1b[0m');
}

function clearAdvancedCache() {
    if (!term) return;

    if (window.advancedCacheManager) {
        const beforeStats = window.advancedCacheManager.getStats();
        window.advancedCacheManager.clear();

        term.writeln('\x1b[1;32m🧹 Advanced cache cleared\x1b[0m');
        term.writeln(`\x1b[1;33m📊 Freed ${beforeStats.memoryUsage.current.toFixed(1)} MB\x1b[0m`);
    } else {
        term.writeln('\x1b[1;31m❌ Advanced cache manager not active\x1b[0m');
    }
}

function optimizeCache() {
    if (!term) return;

    if (window.advancedCacheManager) {
        window.advancedCacheManager.optimize();
        term.writeln('\x1b[1;32m🎯 Cache configuration optimized\x1b[0m');
        term.writeln('\x1b[1;33m💡 Cache sizes adjusted based on usage patterns\x1b[0m');
    } else {
        term.writeln('\x1b[1;31m❌ Advanced cache manager not active\x1b[0m');
    }
}

function testAdvancedCache() {
    if (!term) return;

    if (!window.advancedCacheManager) {
        term.writeln('\x1b[1;31m❌ Advanced cache manager not active\x1b[0m');
        return;
    }

    term.writeln('\x1b[1;36m💾 Testing advanced cache performance...\x1b[0m');

    const testData = {
        small: 'Small test data',
        medium: 'Medium test data '.repeat(100),
        large: 'Large test data '.repeat(1000)
    };

    const startTime = performance.now();

    // Test different cache strategies
    Object.entries(testData).forEach(([size, data], index) => {
        const key = `test-${size}-${index}`;

        // Set with different strategies
        window.advancedCacheManager.set(key, data, {
            strategy: 'auto',
            ttl: 60000,
            compress: size === 'large'
        });

        // Immediate retrieval test
        const retrieved = window.advancedCacheManager.get(key);
        if (retrieved) {
            term.writeln(`\x1b[1;32m✅ ${size} data cached and retrieved successfully\x1b[0m`);
        }
    });

    const testTime = performance.now() - startTime;
    const stats = window.advancedCacheManager.getStats();

    term.writeln(`\x1b[1;33m⏱️ Cache test completed in ${testTime.toFixed(2)}ms\x1b[0m`);
    term.writeln(`\x1b[1;33m📊 Hit rate: ${(stats.hitRate * 100).toFixed(1)}%\x1b[0m`);
    term.writeln(`\x1b[1;33m💾 Memory usage: ${stats.memoryUsage.current.toFixed(1)} MB\x1b[0m`);
};

// Update GPU status indicator in the UI (production interface has no status indicators)
function updateGPUStatusIndicator(isGPUActive) {
    // GPU status indicator removed for production interface
    return;

    if (isGPUActive) {
        if (gpuInfo.isWebGL2) {
            gpuStatus.textContent = '🚀 WebGL 2.0';
            gpuStatus.className = 'gpu-status gpu-webgl2';
            gpuStatus.title = `GPU: ${gpuInfo.renderer} | WebGL 2.0 | Max Texture: ${gpuInfo.maxTextureSize}px`;
        } else {
            gpuStatus.textContent = '⚡ WebGL 1.0';
            gpuStatus.className = 'gpu-status gpu-active';
            gpuStatus.title = `GPU: ${gpuInfo.renderer} | WebGL 1.0 | Max Texture: ${gpuInfo.maxTextureSize}px`;
        }
    } else {
        gpuStatus.textContent = '🖥️ CPU';
        gpuStatus.className = 'gpu-status gpu-inactive';
        gpuStatus.title = 'GPU acceleration not available - using CPU canvas rendering';
    }
}

// Make functions globally available
window.displayGPUInfo = displayGPUInfo;
window.updateGPUStatusIndicator = updateGPUStatusIndicator;

// Auto-initialize all performance optimizations
async function initializePerformanceOptimizations() {
    // Initialize optimizations silently

    // Initialize optimizations silently

    // 1. Initialize Enhanced Text Renderer with Ligatures
    if (window.EnhancedTextRenderer) {
        try {
            window.enhancedTextRenderer = new window.EnhancedTextRenderer(term, {
                enableTextShaping: true,
                enableLigatures: true,
                enableSubpixelRendering: true, // Auto-enable subpixel rendering
                fontFamily: 'monospace',
                fontSize: 16
            });

            await window.enhancedTextRenderer.initialize();
        } catch (e) {
            console.error('Failed to initialize enhanced text renderer:', e);
        }
    }

    // 2. Auto-enable Batch Rendering (if WebGL is available)
    if (window.BatchRenderer && rendererType === 'webgl') {
        try {
            const canvas = document.querySelector('canvas');
            if (canvas) {
                const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
                if (gl) {
                    window.batchRenderer = new window.BatchRenderer(gl, {
                        maxBatchSize: 2048,
                        maxBatches: 64
                    });

                    await window.batchRenderer.initialize();
                }
            }
        } catch (e) {
            console.error('Failed to initialize batch renderer:', e);
        }
    }

    // 3. Virtual Scrolling (disabled for production - can cause layout issues)
    // Virtual scrolling disabled to prevent layout problems

    // 4. Auto-generate Font Atlas with Ligatures
    if (window.OptimizedFontAtlas && !window.globalFontAtlas) {
        try {
            const fontAtlas = new window.OptimizedFontAtlas({
                fontFamily: 'monospace',
                fontSize: 16,
                atlasSize: 4096 // Larger for ligatures
            });

            await fontAtlas.generateAtlas('unicode');
            window.globalFontAtlas = fontAtlas;

            const stats = fontAtlas.getStats();
        } catch (e) {
            console.error('Failed to generate font atlas:', e);
        }
    }

    // 5. Auto-enable Worker Threads
    if (window.WorkerThreadManager) {
        try {
            window.workerThreadManager = new window.WorkerThreadManager({
                maxWorkers: navigator.hardwareConcurrency || 4,
                enableTextProcessing: true,
                enableCompression: true,
                enableParsing: true
            });

            await window.workerThreadManager.initialize();
            const workerStats = window.workerThreadManager.getStats();
        } catch (e) {
            console.error('Failed to initialize worker thread manager:', e);
        }
    }

    // 6. Auto-enable Advanced Caching
    if (window.AdvancedCacheManager) {
        try {
            window.advancedCacheManager = new window.AdvancedCacheManager({
                maxMemoryMB: 100,
                enableLRU: true,
                enableLFU: true,
                enableTTL: true,
                enableCompression: true,
                enablePredictive: true
            });

            await window.advancedCacheManager.initialize();
        } catch (e) {
            console.error('Failed to initialize advanced cache manager:', e);
        }
    }

    // 7. Performance Summary
    setTimeout(() => {
        const activeOptimizations = [];
        if (window.enhancedTextRenderer) {
            activeOptimizations.push('Text Shaping');
            const capabilities = window.enhancedTextRenderer.getSubpixelCapabilities();
            if (capabilities?.isEnabled) activeOptimizations.push('Subpixel Rendering');
        }
        if (window.batchRenderer) activeOptimizations.push('Batch Rendering');
        if (window.terminalBuffer?.isVirtualScrollingEnabled) activeOptimizations.push('Virtual Scrolling');
        if (window.globalFontAtlas) activeOptimizations.push('Font Atlas');
        if (window.workerThreadManager) activeOptimizations.push('Worker Threads');
        if (window.advancedCacheManager) activeOptimizations.push('Advanced Caching');
        if (window.liveDashboard) activeOptimizations.push('Live Dashboard');

        // All optimizations initialized silently

        // All optimizations initialized
    }, 1000);
}

// Initialize terminal
function initTerminal() {
    // Initialize terminal silently

    // Initialize terminal with improved settings for command output
    const xtermjsTheme = {
        foreground: '#F8F8F8',
        background: '#2D2E2C',
        selectionBackground: '#5DA5D533',
        selectionInactiveBackground: '#555555AA',
        black: '#1E1E1D',
        brightBlack: '#262625',
        red: '#CE5C5C',
        brightRed: '#FF7272',
        green: '#5BCC5B',
        brightGreen: '#72FF72',
        yellow: '#CCCC5B',
        brightYellow: '#FFFF72',
        blue: '#5D5DD3',
        brightBlue: '#7279FF',
        magenta: '#BC5ED1',
        brightMagenta: '#E572FF',
        cyan: '#5DA5D5',
        brightCyan: '#72F0FF',
        white: '#F8F8F8',
        brightWhite: '#FFFFFF'
      };
    // Enhanced WebGL detection with comprehensive diagnostics
    function detectOptimalRenderer() {
        // Detect optimal renderer silently

        // Step 1: Check if WebGL is disabled by browser settings
        const webglDisabled = checkWebGLDisabled();
        if (webglDisabled) {
            displayWebGLDiagnostics('disabled', 'WebGL is disabled in browser settings');
            return 'canvas';
        }

        try {
            const canvas = document.createElement('canvas');

            // Step 2: Test WebGL 2.0
            let gl = canvas.getContext('webgl2');
            let isWebGL2 = false;

            if (gl) {
                isWebGL2 = true;
                gpuInfo.isWebGL2 = true;

                // Test if WebGL 2.0 is actually functional
                if (testWebGLFunctionality(gl)) {
                    collectGPUInfo(gl);
                    displayWebGLDiagnostics('webgl2', 'WebGL 2.0 active');
                    return 'webgl';
                }
            }

            // Step 3: Test WebGL 1.0
            gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            if (gl) {
                // Test if WebGL 1.0 is actually functional
                if (testWebGLFunctionality(gl)) {
                    collectGPUInfo(gl);
                    displayWebGLDiagnostics('webgl1', 'WebGL 1.0 active');
                    return 'webgl';
                } else {
                    displayWebGLDiagnostics('context_lost', 'WebGL context created but not functional');
                }
            } else {
                displayWebGLDiagnostics('not_supported', 'WebGL not supported by browser/hardware');
            }

        } catch (e) {
            displayWebGLDiagnostics('error', `WebGL detection failed: ${e.message}`);
        }

        displayWebGLDiagnostics('canvas', 'Using Canvas renderer (CPU-based)');
        return 'canvas';
    }

    // Check if WebGL is disabled in browser
    function checkWebGLDisabled() {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            return !gl;
        } catch (e) {
            return true;
        }
    }

    // Test if WebGL context is actually functional
    function testWebGLFunctionality(gl) {
        try {
            // Test basic WebGL operations
            gl.clearColor(0.0, 0.0, 0.0, 1.0);
            gl.clear(gl.COLOR_BUFFER_BIT);

            // Check for context loss
            if (gl.isContextLost()) {
                return false;
            }

            // Test shader compilation (basic test)
            const vertexShader = gl.createShader(gl.VERTEX_SHADER);
            if (!vertexShader) {
                return false;
            }

            gl.shaderSource(vertexShader, `
                attribute vec2 position;
                void main() {
                    gl_Position = vec4(position, 0.0, 1.0);
                }
            `);
            gl.compileShader(vertexShader);

            if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
                gl.deleteShader(vertexShader);
                return false;
            }

            gl.deleteShader(vertexShader);
            return true;

        } catch (e) {
            return false;
        }
    }

    // Collect detailed GPU and WebGL information with diagnostics
    function collectGPUInfo(gl) {
        try {

            // Basic WebGL info
            gpuInfo.version = gl.getParameter(gl.VERSION);
            gpuInfo.shadingLanguageVersion = gl.getParameter(gl.SHADING_LANGUAGE_VERSION);

            // Try to get GPU renderer info (may be blocked for privacy)
            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            if (debugInfo) {
                gpuInfo.renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
                gpuInfo.vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
            } else {
                gpuInfo.renderer = gl.getParameter(gl.RENDERER);
                gpuInfo.vendor = gl.getParameter(gl.VENDOR);
            }

            // WebGL capabilities
            gpuInfo.maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
            gpuInfo.maxViewportDims = gl.getParameter(gl.MAX_VIEWPORT_DIMS);

            // Additional diagnostic info
            gpuInfo.maxVertexAttribs = gl.getParameter(gl.MAX_VERTEX_ATTRIBS);
            gpuInfo.maxTextureImageUnits = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS);
            gpuInfo.maxRenderbufferSize = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE);

            // Available extensions
            gpuInfo.extensions = gl.getSupportedExtensions() || [];

            // Check for important extensions
            const importantExtensions = [
                'WEBGL_debug_renderer_info',
                'OES_texture_float',
                'WEBGL_lose_context',
                'ANGLE_instanced_arrays'
            ];

            gpuInfo.hasImportantExtensions = {};
            importantExtensions.forEach(ext => {
                gpuInfo.hasImportantExtensions[ext] = gpuInfo.extensions.includes(ext);
            });

            // GPU information collected silently

        } catch (e) {
            console.warn('⚠️ Could not collect complete GPU information:', e.message);
            gpuInfo.error = e.message;
        }
    }

    // Display WebGL diagnostics in terminal and UI
    function displayWebGLDiagnostics(status, message) {
        const diagnostics = {
            timestamp: new Date().toISOString(),
            status: status,
            message: message,
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            hardwareConcurrency: navigator.hardwareConcurrency,
            deviceMemory: navigator.deviceMemory || 'Unknown',
            connection: navigator.connection ? {
                effectiveType: navigator.connection.effectiveType,
                downlink: navigator.connection.downlink
            } : 'Unknown'
        };

        // Store diagnostics globally for access
        window.webglDiagnostics = diagnostics;

        // WebGL diagnostics collected

        // Display in terminal when it's ready
        if (window.displayWebGLDiagnosticsInTerminal) {
            window.displayWebGLDiagnosticsInTerminal(diagnostics);
        }
    }

    const optimalRenderer = detectOptimalRenderer();
    rendererType = optimalRenderer; // Store globally for reference

    term = new Terminal({
        cursorBlink: true,
        scrollback: 2000, // Increased for better WebGL utilization
        tabStopWidth: 8,
        bellStyle: 'sound',
        fontFamily: 'monospace',
        fontSize: 16,
        theme: xtermjsTheme,
        allowTransparency: false,
        disableStdin: false,
        cursorStyle: 'block',
        convertEol: true,
        // Note: rendererType removed - we use addons instead
        allowProposedApi: true,
        // WebGL-specific optimizations
        ...(optimalRenderer === 'webgl' && {
            smoothScrollDuration: 120, // Smoother scrolling with WebGL
            fastScrollModifier: 'alt',  // Alt+scroll for fast scrolling
            fastScrollSensitivity: 5
        })
    });

    // Terminal created
    
    // Create and load basic addons
    fitAddon = new FitAddon.FitAddon();
    term.loadAddon(fitAddon);
    
    // Fix for canvas readback warning
    // Set willReadFrequently attribute on the canvas to improve performance
    setTimeout(() => {
        const canvasElements = document.querySelectorAll('canvas');
        canvasElements.forEach(canvas => {
            // Get context with willReadFrequently for better performance
            try {
                const ctx = canvas.getContext('2d', { willReadFrequently: true });
                // Canvas context optimized
            } catch (e) {
                // Canvas optimization failed silently
            }
        });

        // Renderer configured
    }, 100);
    
    // Add web links addon
    const webLinksAddon = new WebLinksAddon.WebLinksAddon();
    term.loadAddon(webLinksAddon);
    
    // Open terminal
    const terminalElement = document.getElementById('terminal');
    if (!terminalElement) {
        console.error('❌ Terminal element not found!');
        return;
    }

    term.open(terminalElement);

    // Add CSS classes for enhanced typography
    setTimeout(() => {
        const terminalScreen = document.querySelector('.xterm-screen');
        if (terminalScreen) {
            terminalScreen.classList.add('terminal-with-ligatures', 'enhanced-text-rendering');
        }
    }, 100);

    // Load WebGL addon AFTER terminal is opened (correct pattern from examples)
    if (optimalRenderer === 'webgl') {
        try {
            if (typeof WebglAddon !== 'undefined') {
                const webglAddon = new WebglAddon.WebglAddon();
                term.loadAddon(webglAddon);
            }
        } catch (e) {
            // WebGL addon failed, fallback to canvas
        }
    }

    // Renderer detection completed silently
    
    // Set terminal options for better compatibility
    term.options.cursorBlink = true;
    term.options.disableStdin = false;
    term.options.cursorStyle = 'block';
    term.options.scrollOnUserInput = true;
    
    // Set environment variables that help with terminal compatibility
    const envData = btoa(JSON.stringify({
        data: {
            TERM: 'xterm-256color',
            COLORTERM: 'truecolor',
            TERM_PROGRAM: 'webssh-rs'
        }
    }));
    
    // Focus the terminal
    term.focus();
    
    // Apply fit to ensure terminal size is correct initially
    setTimeout(() => {
        fitAddon.fit();
        
        // Add a mutation observer to detect changes to the terminal container
        // This helps with dynamic layouts and ensures the terminal always fits correctly
        const terminalElement = document.getElementById('terminal');
        const resizeObserver = new ResizeObserver(entries => {
            for (let entry of entries) {
                if (fitAddon) {
                    fitAddon.fit();
                    if (ws && ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({
                            type: 'resize',
                            cols: term.cols,
                            rows: term.rows
                        }));
                    }
                }
            }
        });
        
        // Start observing the terminal container
        resizeObserver.observe(terminalElement);
    }, 100);
    
    // Handle window resize events with debounce for better performance
    let resizeTimeout;
    window.addEventListener('resize', () => {
        // Clear previous timeout to implement debounce
        clearTimeout(resizeTimeout);
        
        // Set a new timeout to resize after a short delay
        resizeTimeout = setTimeout(() => {
            if (fitAddon) {
                fitAddon.fit();
                
                // Send updated terminal size to server
                if (ws && ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({
                        type: 'resize',
                        cols: term.cols,
                        rows: term.rows
                    }));
                    
                    // Force a refresh after resize to ensure display is updated
                    term.clearSelection();
                    term.refresh(0, term.rows - 1);
                }
            }
        }, 100); // 100ms debounce
    });
    
    // Fit terminal to container and set size
    setTimeout(() => {
        fitAddon.fit();
        // Send terminal size to server
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                type: 'resize',
                cols: term.cols,
                rows: term.rows
            }));
        }
        // Terminal ready for SSH connection
        // Initialize optimized terminal buffer with virtual scrolling support
        if (window.VirtualTerminalBuffer) {
            try {
                window.terminalBuffer = new window.VirtualTerminalBuffer(100000); // 100K lines

            } catch (e) {
                console.error('Failed to initialize virtual buffer:', e);
            }
        } else if (window.OptimizedTerminalBuffer) {
            try {
                window.terminalBuffer = new window.OptimizedTerminalBuffer(20000); // 20K lines
            } catch (e) {
                console.error('Failed to initialize optimized buffer:', e);
            }
        }

        // GPU acceleration configured silently
        if (optimalRenderer === 'webgl') {
            updateGPUStatusIndicator(true);
        } else {
            updateGPUStatusIndicator(false);
        }

        // Show performance optimization status
        term.writeln('\x1b[1;32m⚡ Performance optimizations active:\x1b[0m');

        // Auto-initialize all performance optimizations after a short delay
        // This ensures all modules are loaded and WebGL context is ready
        setTimeout(() => {
            initializePerformanceOptimizations();
        }, 2000); // 2 second delay to ensure everything is ready

        // Check which optimizations are available
        const optimizations = [];
        if (window.terminalLinePool) optimizations.push('📦 Object pooling');
        if (window.BinaryProtocol) optimizations.push('📡 Binary protocol');
        if (window.performanceMonitor) optimizations.push('📊 Performance monitoring');
        if (window.VirtualTerminalBuffer) optimizations.push('📜 Virtual scrolling');
        if (window.OptimizedFontAtlas) optimizations.push('🎨 Font atlas optimization');
        if (window.TextShapingEngine) optimizations.push('🎨 Text shaping & ligatures');
        if (window.BatchRenderer) optimizations.push('🎨 Batch rendering system');
        if (window.SubpixelRenderer) optimizations.push('🎨 Subpixel rendering');
        if (window.WorkerThreadManager) optimizations.push('🧵 Worker thread offloading');
        if (window.AdvancedCacheManager) optimizations.push('💾 Advanced caching system');
        if (window.liveDashboard) optimizations.push('📊 Live dashboard');

        if (optimizations.length > 0) {
            optimizations.forEach(opt => term.writeln(`   ${opt} available`));
            term.writeln('\x1b[1;32m💡 All optimizations will auto-enable in 2 seconds...\x1b[0m');
            term.writeln('\x1b[1;33m💡 Commands: optimization-status, worker-threads-test, cache-stats\x1b[0m');
        } else {
            term.writeln('\x1b[1;33m⚠️ Performance modules not loaded properly\x1b[0m');
        }
        
        // Set up a periodic refresh for the terminal
        // This helps with commands like 'top' that need regular updates
        // WebGL renderer benefits from more frequent updates
        const refreshRate = rendererType === 'webgl' ? 1000 : 2000; // 1s for WebGL, 2s for canvas
        const refreshInterval = setInterval(() => {
            refreshTerminal(); // Use enhanced refresh function
        }, refreshRate);
        
        // Clean up the interval when the page is unloaded
        window.addEventListener('beforeunload', () => {
            clearInterval(refreshInterval);
        });
        
        // Add event listener for terminal focus using the DOM element
        // since term.onFocus is not available in this version
        const terminalElement = document.getElementById('terminal');
        terminalElement.addEventListener('focus', () => {
            // When terminal gets focus, ensure it's properly sized
            if (fitAddon) {
                fitAddon.fit();
                if (ws && ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({
                        type: 'resize',
                        cols: term.cols,
                        rows: term.rows
                    }));
                }
            }
        });
        
        // Check URL parameters for API-initiated connection
        const urlParams = new URLSearchParams(window.location.search);
        let sessionId = urlParams.get('session_id');
        const hostname = urlParams.get('hostname');
        const username = urlParams.get('username');
        const deviceName = urlParams.get('device_name');
        
        if (sessionId) {
            // Extract just the session ID without any additional parameters
            if (sessionId.includes('&')) {
                sessionId = sessionId.split('&')[0];
            }
            
            term.writeln('\x1b[1;34mConnecting to session: ' + sessionId + '\x1b[0m');
            isApiConnection = true;
            
            // UI elements removed for production interface
            
            // Connect directly to WebSocket without checking status
            connectWebSocket(sessionId);
        }
    }, 100);
}