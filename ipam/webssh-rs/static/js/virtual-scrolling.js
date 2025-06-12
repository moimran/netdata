/**
 * Virtual Scrolling for Terminal
 * Only renders visible lines for massive performance improvement
 */

class VirtualTerminalScrolling {
    constructor(terminal, options = {}) {
        this.terminal = terminal;
        this.options = {
            bufferSize: options.bufferSize || 100000, // 100K lines max
            visibleLines: options.visibleLines || 50, // Lines visible at once
            overscan: options.overscan || 10, // Extra lines to render for smooth scrolling
            lineHeight: options.lineHeight || 20, // Pixels per line
            ...options
        };
        
        this.virtualBuffer = [];
        this.scrollPosition = 0;
        this.totalLines = 0;
        this.visibleStart = 0;
        this.visibleEnd = 0;
        
        this.stats = {
            totalLines: 0,
            renderedLines: 0,
            scrollEvents: 0,
            renderCalls: 0,
            lastRenderTime: 0
        };
        
        this.isEnabled = false;
        this.scrollContainer = null;
        this.virtualContent = null;
        
        console.log('📜 Virtual scrolling initialized');
    }
    
    enable() {
        if (this.isEnabled) return;
        
        this.isEnabled = true;
        this.setupVirtualScrolling();
        console.log('✅ Virtual scrolling enabled');
    }
    
    disable() {
        if (!this.isEnabled) return;
        
        this.isEnabled = false;
        this.teardownVirtualScrolling();
        console.log('❌ Virtual scrolling disabled');
    }
    
    setupVirtualScrolling() {
        // Create virtual scroll container
        const terminalElement = this.terminal.element;
        if (!terminalElement) return;
        
        // Wrap terminal in virtual scroll container
        this.scrollContainer = document.createElement('div');
        this.scrollContainer.className = 'virtual-scroll-container';
        this.scrollContainer.style.cssText = `
            height: ${this.options.visibleLines * this.options.lineHeight}px;
            overflow-y: auto;
            position: relative;
        `;
        
        // Create virtual content area
        this.virtualContent = document.createElement('div');
        this.virtualContent.className = 'virtual-content';
        this.virtualContent.style.cssText = `
            position: relative;
            width: 100%;
        `;
        
        // Insert virtual container
        terminalElement.parentNode.insertBefore(this.scrollContainer, terminalElement);
        this.scrollContainer.appendChild(this.virtualContent);
        this.virtualContent.appendChild(terminalElement);
        
        // Setup scroll event listener
        this.scrollContainer.addEventListener('scroll', this.handleScroll.bind(this));
        
        // Setup resize observer
        this.setupResizeObserver();
        
        this.updateVirtualScrolling();
    }
    
    teardownVirtualScrolling() {
        if (this.scrollContainer) {
            const terminalElement = this.terminal.element;
            this.scrollContainer.parentNode.insertBefore(terminalElement, this.scrollContainer);
            this.scrollContainer.remove();
            this.scrollContainer = null;
            this.virtualContent = null;
        }
    }
    
    setupResizeObserver() {
        if (typeof ResizeObserver !== 'undefined') {
            this.resizeObserver = new ResizeObserver(() => {
                this.updateVisibleLines();
                this.updateVirtualScrolling();
            });
            
            this.resizeObserver.observe(this.scrollContainer);
        }
    }
    
    handleScroll(event) {
        this.stats.scrollEvents++;
        this.scrollPosition = event.target.scrollTop;
        
        // Throttle scroll updates for performance
        if (!this.scrollUpdatePending) {
            this.scrollUpdatePending = true;
            requestAnimationFrame(() => {
                this.updateVirtualScrolling();
                this.scrollUpdatePending = false;
            });
        }
    }
    
    updateVisibleLines() {
        if (!this.scrollContainer) return;
        
        const containerHeight = this.scrollContainer.clientHeight;
        this.options.visibleLines = Math.ceil(containerHeight / this.options.lineHeight);
    }
    
    updateVirtualScrolling() {
        if (!this.isEnabled || !this.scrollContainer) return;
        
        const startTime = performance.now();
        
        // Calculate visible range
        const scrollTop = this.scrollPosition;
        const startIndex = Math.floor(scrollTop / this.options.lineHeight);
        const endIndex = Math.min(
            startIndex + this.options.visibleLines + this.options.overscan,
            this.totalLines
        );
        
        // Apply overscan
        this.visibleStart = Math.max(0, startIndex - this.options.overscan);
        this.visibleEnd = endIndex;
        
        // Update virtual content height
        const totalHeight = this.totalLines * this.options.lineHeight;
        this.virtualContent.style.height = `${totalHeight}px`;
        
        // Render visible lines
        this.renderVisibleLines();
        
        // Update stats
        this.stats.renderCalls++;
        this.stats.lastRenderTime = performance.now() - startTime;
        this.stats.renderedLines = this.visibleEnd - this.visibleStart;
        
        console.log(`📜 Virtual scroll: rendered ${this.stats.renderedLines}/${this.totalLines} lines in ${this.stats.lastRenderTime.toFixed(2)}ms`);
    }
    
    renderVisibleLines() {
        // This would integrate with xterm.js rendering
        // For now, we'll update the terminal's visible buffer
        
        if (this.terminal._core && this.terminal._core.buffer) {
            const buffer = this.terminal._core.buffer.active;
            
            // Only render lines that are actually visible
            for (let i = this.visibleStart; i < this.visibleEnd; i++) {
                if (this.virtualBuffer[i]) {
                    // Render line if it's in the visible range
                    this.renderLine(i, this.virtualBuffer[i]);
                }
            }
        }
    }
    
    renderLine(index, lineData) {
        // Placeholder for line rendering
        // In a full implementation, this would update the terminal's display
        // without affecting the underlying buffer
    }
    
    addLine(lineData) {
        // Add line to virtual buffer
        this.virtualBuffer.push(lineData);
        this.totalLines = this.virtualBuffer.length;
        this.stats.totalLines = this.totalLines;
        
        // Limit buffer size
        if (this.virtualBuffer.length > this.options.bufferSize) {
            const removeCount = this.virtualBuffer.length - this.options.bufferSize;
            this.virtualBuffer.splice(0, removeCount);
            this.totalLines = this.virtualBuffer.length;
        }
        
        // Auto-scroll to bottom if user is at the bottom
        if (this.isAtBottom()) {
            this.scrollToBottom();
        }
        
        this.updateVirtualScrolling();
    }
    
    addLines(lines) {
        lines.forEach(line => this.addLine(line));
    }
    
    isAtBottom() {
        if (!this.scrollContainer) return true;
        
        const scrollTop = this.scrollContainer.scrollTop;
        const scrollHeight = this.scrollContainer.scrollHeight;
        const clientHeight = this.scrollContainer.clientHeight;
        
        return scrollTop + clientHeight >= scrollHeight - 10; // 10px threshold
    }
    
    scrollToBottom() {
        if (!this.scrollContainer) return;
        
        this.scrollContainer.scrollTop = this.scrollContainer.scrollHeight;
    }
    
    scrollToTop() {
        if (!this.scrollContainer) return;
        
        this.scrollContainer.scrollTop = 0;
    }
    
    scrollToLine(lineIndex) {
        if (!this.scrollContainer) return;
        
        const scrollTop = lineIndex * this.options.lineHeight;
        this.scrollContainer.scrollTop = scrollTop;
    }
    
    getVisibleRange() {
        return {
            start: this.visibleStart,
            end: this.visibleEnd,
            total: this.totalLines
        };
    }
    
    getStats() {
        return {
            ...this.stats,
            visibleRange: this.getVisibleRange(),
            bufferUtilization: this.totalLines / this.options.bufferSize,
            renderEfficiency: this.stats.renderedLines / this.totalLines
        };
    }
    
    clear() {
        this.virtualBuffer = [];
        this.totalLines = 0;
        this.scrollPosition = 0;
        this.visibleStart = 0;
        this.visibleEnd = 0;
        
        if (this.scrollContainer) {
            this.scrollContainer.scrollTop = 0;
        }
        
        this.updateVirtualScrolling();
    }
    
    search(query) {
        const results = [];
        const queryLower = query.toLowerCase();
        
        this.virtualBuffer.forEach((line, index) => {
            if (line && line.text && line.text.toLowerCase().includes(queryLower)) {
                results.push({
                    lineIndex: index,
                    line: line,
                    text: line.text
                });
            }
        });
        
        return results;
    }
    
    // Performance optimization: batch updates
    batchUpdate(callback) {
        const wasEnabled = this.isEnabled;
        if (wasEnabled) this.disable();
        
        callback();
        
        if (wasEnabled) this.enable();
    }
}

// Enhanced Terminal Buffer with Virtual Scrolling
class VirtualTerminalBuffer extends OptimizedTerminalBuffer {
    constructor(size = 100000) {
        super(size);
        this.virtualScrolling = null;
        this.isVirtualScrollingEnabled = false;
    }
    
    enableVirtualScrolling(terminal, options = {}) {
        if (!this.virtualScrolling) {
            this.virtualScrolling = new VirtualTerminalScrolling(terminal, {
                bufferSize: this.size,
                ...options
            });
        }
        
        this.virtualScrolling.enable();
        this.isVirtualScrollingEnabled = true;
        console.log('📜 Virtual scrolling enabled for terminal buffer');
    }
    
    disableVirtualScrolling() {
        if (this.virtualScrolling) {
            this.virtualScrolling.disable();
            this.isVirtualScrollingEnabled = false;
        }
    }
    
    addLine(text, attributes = []) {
        // Add to regular buffer
        super.addLine(text, attributes);
        
        // Add to virtual scrolling if enabled
        if (this.isVirtualScrollingEnabled && this.virtualScrolling) {
            this.virtualScrolling.addLine({
                text: text,
                attributes: attributes,
                timestamp: performance.now()
            });
        }
    }
    
    getVirtualScrollingStats() {
        if (this.virtualScrolling) {
            return this.virtualScrolling.getStats();
        }
        return null;
    }
}

// Export classes
window.VirtualTerminalScrolling = VirtualTerminalScrolling;
window.VirtualTerminalBuffer = VirtualTerminalBuffer;

console.log('📜 Virtual scrolling module loaded');
