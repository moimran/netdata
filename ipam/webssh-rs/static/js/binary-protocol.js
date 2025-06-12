/**
 * High-performance binary protocol for WebSocket communication
 * Provides compression and efficient serialization
 */

// Message types (must match Rust enum)
const MessageType = {
    TERMINAL_OUTPUT: 0,
    TERMINAL_INPUT: 1,
    RESIZE: 2,
    PING: 3,
    PONG: 4,
    SESSION_INFO: 5,
    ERROR: 6
};

class BinaryProtocol {
    constructor() {
        this.stats = {
            messagesSent: 0,
            messagesReceived: 0,
            bytesSent: 0,
            bytesReceived: 0,
            compressionRatio: 1.0,
            averageLatency: 0
        };
        
        this.pendingPings = new Map();
        this.compressionThreshold = 512; // Compress messages > 512 bytes
        
        console.log('📡 Binary protocol initialized');
    }
    
    /**
     * Encode message to binary format with optional compression
     */
    encode(messageType, data) {
        const message = this.createMessage(messageType, data);
        const jsonStr = JSON.stringify(message);
        const jsonBytes = new TextEncoder().encode(jsonStr);
        
        // Try compression for large messages
        let compressed = false;
        let finalBytes = jsonBytes;
        
        if (jsonBytes.length > this.compressionThreshold) {
            try {
                const compressedBytes = this.compress(jsonBytes);
                if (compressedBytes.length < jsonBytes.length * 0.9) { // Only use if 10%+ savings
                    finalBytes = compressedBytes;
                    compressed = true;
                }
            } catch (e) {
                console.warn('Compression failed:', e);
            }
        }
        
        // Create final message with header
        const header = new Uint8Array(5);
        header[0] = compressed ? 1 : 0; // Compression flag
        header[1] = messageType; // Message type
        
        // Message length (3 bytes, little-endian)
        const length = finalBytes.length;
        header[2] = length & 0xFF;
        header[3] = (length >> 8) & 0xFF;
        header[4] = (length >> 16) & 0xFF;
        
        // Combine header and payload
        const result = new Uint8Array(header.length + finalBytes.length);
        result.set(header, 0);
        result.set(finalBytes, header.length);
        
        // Update stats
        this.stats.messagesSent++;
        this.stats.bytesSent += result.length;
        
        if (compressed) {
            const ratio = jsonBytes.length / finalBytes.length;
            this.stats.compressionRatio = (this.stats.compressionRatio * 0.9) + (ratio * 0.1);
        }
        
        return result;
    }
    
    /**
     * Decode binary message with decompression
     */
    decode(arrayBuffer) {
        const data = new Uint8Array(arrayBuffer);
        
        if (data.length < 5) {
            throw new Error('Invalid message: too short');
        }
        
        // Parse header
        const compressed = data[0] === 1;
        const messageType = data[1];
        const length = data[2] | (data[3] << 8) | (data[4] << 16);
        
        if (data.length < 5 + length) {
            throw new Error('Invalid message: incomplete');
        }
        
        // Extract payload
        let payload = data.slice(5, 5 + length);
        
        // Decompress if needed
        if (compressed) {
            try {
                payload = this.decompress(payload);
            } catch (e) {
                console.error('Decompression failed:', e);
                throw e;
            }
        }
        
        // Parse JSON
        const jsonStr = new TextDecoder().decode(payload);
        const message = JSON.parse(jsonStr);
        
        // Update stats
        this.stats.messagesReceived++;
        this.stats.bytesReceived += data.length;
        
        return { messageType, message };
    }
    
    /**
     * Simple compression using gzip-like algorithm (placeholder)
     * In production, you'd use a proper compression library
     */
    compress(data) {
        // For now, use a simple RLE-like compression for demonstration
        // In production, use pako.js or similar for gzip compression
        return this.simpleCompress(data);
    }
    
    decompress(data) {
        return this.simpleDecompress(data);
    }
    
    simpleCompress(data) {
        // Simple run-length encoding for repeated bytes
        const result = [];
        let i = 0;
        
        while (i < data.length) {
            const byte = data[i];
            let count = 1;
            
            // Count consecutive identical bytes
            while (i + count < data.length && data[i + count] === byte && count < 255) {
                count++;
            }
            
            if (count > 3) {
                // Use RLE for runs of 4 or more
                result.push(0xFF, byte, count);
            } else {
                // Copy bytes directly
                for (let j = 0; j < count; j++) {
                    result.push(byte);
                }
            }
            
            i += count;
        }
        
        return new Uint8Array(result);
    }
    
    simpleDecompress(data) {
        const result = [];
        let i = 0;
        
        while (i < data.length) {
            if (data[i] === 0xFF && i + 2 < data.length) {
                // RLE sequence
                const byte = data[i + 1];
                const count = data[i + 2];
                
                for (let j = 0; j < count; j++) {
                    result.push(byte);
                }
                
                i += 3;
            } else {
                // Regular byte
                result.push(data[i]);
                i++;
            }
        }
        
        return new Uint8Array(result);
    }
    
    createMessage(messageType, data) {
        const timestamp = performance.now();
        
        switch (messageType) {
            case MessageType.TERMINAL_OUTPUT:
                return {
                    type: 'terminal_output',
                    data: data,
                    timestamp
                };
            
            case MessageType.TERMINAL_INPUT:
                return {
                    type: 'terminal_input',
                    data: data,
                    timestamp
                };
            
            case MessageType.RESIZE:
                return {
                    type: 'resize',
                    cols: data.cols,
                    rows: data.rows,
                    timestamp
                };
            
            case MessageType.PING:
                const pingId = Math.random().toString(36).substr(2, 9);
                this.pendingPings.set(pingId, timestamp);
                return {
                    type: 'ping',
                    id: pingId,
                    timestamp
                };
            
            case MessageType.PONG:
                return {
                    type: 'pong',
                    id: data.id,
                    timestamp
                };
            
            case MessageType.SESSION_INFO:
                return {
                    type: 'session_info',
                    session_id: data.session_id,
                    message: data.message,
                    timestamp
                };
            
            case MessageType.ERROR:
                return {
                    type: 'error',
                    code: data.code,
                    message: data.message,
                    timestamp
                };
            
            default:
                throw new Error(`Unknown message type: ${messageType}`);
        }
    }
    
    /**
     * Handle received pong and calculate latency
     */
    handlePong(pongMessage) {
        const pingId = pongMessage.id;
        const pingTime = this.pendingPings.get(pingId);
        
        if (pingTime) {
            const latency = performance.now() - pingTime;
            this.stats.averageLatency = (this.stats.averageLatency * 0.9) + (latency * 0.1);
            this.pendingPings.delete(pingId);
            
            console.log(`🏓 Ping latency: ${latency.toFixed(2)}ms`);
        }
    }
    
    /**
     * Send ping to measure latency
     */
    sendPing(websocket) {
        const pingData = this.encode(MessageType.PING, {});
        websocket.send(pingData);
    }
    
    /**
     * Get performance statistics
     */
    getStats() {
        return {
            ...this.stats,
            throughputMbps: this.calculateThroughput(),
            pendingPings: this.pendingPings.size
        };
    }
    
    calculateThroughput() {
        // Rough throughput calculation in Mbps
        const totalBytes = this.stats.bytesSent + this.stats.bytesReceived;
        return (totalBytes * 8) / (1024 * 1024); // Convert to Mbps
    }
    
    /**
     * Reset statistics
     */
    resetStats() {
        this.stats = {
            messagesSent: 0,
            messagesReceived: 0,
            bytesSent: 0,
            bytesReceived: 0,
            compressionRatio: 1.0,
            averageLatency: 0
        };
        this.pendingPings.clear();
    }
}

// Enhanced WebSocket wrapper with binary protocol
class HighPerformanceWebSocket {
    constructor(url) {
        this.url = url;
        this.ws = null;
        this.protocol = new BinaryProtocol();
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.pingInterval = null;
        
        this.onMessage = null;
        this.onOpen = null;
        this.onClose = null;
        this.onError = null;
    }
    
    connect() {
        try {
            this.ws = new WebSocket(this.url);
            this.ws.binaryType = 'arraybuffer';
            
            this.ws.onopen = (event) => {
                console.log('🔗 High-performance WebSocket connected');
                this.reconnectAttempts = 0;
                this.startPingInterval();
                
                if (this.onOpen) {
                    this.onOpen(event);
                }
            };
            
            this.ws.onmessage = (event) => {
                try {
                    if (event.data instanceof ArrayBuffer) {
                        const { messageType, message } = this.protocol.decode(event.data);
                        
                        // Handle pong messages internally
                        if (message.type === 'pong') {
                            this.protocol.handlePong(message);
                            return;
                        }
                        
                        if (this.onMessage) {
                            this.onMessage(message);
                        }
                    } else {
                        // Fallback for text messages
                        const message = JSON.parse(event.data);
                        if (this.onMessage) {
                            this.onMessage(message);
                        }
                    }
                } catch (e) {
                    console.error('Failed to decode message:', e);
                }
            };
            
            this.ws.onclose = (event) => {
                console.log('🔌 WebSocket disconnected');
                this.stopPingInterval();
                
                if (this.reconnectAttempts < this.maxReconnectAttempts) {
                    this.scheduleReconnect();
                }
                
                if (this.onClose) {
                    this.onClose(event);
                }
            };
            
            this.ws.onerror = (event) => {
                console.error('❌ WebSocket error:', event);
                if (this.onError) {
                    this.onError(event);
                }
            };
            
        } catch (e) {
            console.error('Failed to create WebSocket:', e);
        }
    }
    
    send(messageType, data) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            const binaryData = this.protocol.encode(messageType, data);
            this.ws.send(binaryData);
        } else {
            console.warn('WebSocket not ready, message dropped');
        }
    }
    
    sendTerminalInput(data) {
        this.send(MessageType.TERMINAL_INPUT, data);
    }
    
    sendResize(cols, rows) {
        this.send(MessageType.RESIZE, { cols, rows });
    }
    
    startPingInterval() {
        this.pingInterval = setInterval(() => {
            this.protocol.sendPing(this.ws);
        }, 30000); // Ping every 30 seconds
    }
    
    stopPingInterval() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
    }
    
    scheduleReconnect() {
        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
        
        console.log(`🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
        
        setTimeout(() => {
            this.connect();
        }, delay);
    }
    
    close() {
        this.stopPingInterval();
        if (this.ws) {
            this.ws.close();
        }
    }
    
    getStats() {
        return this.protocol.getStats();
    }
}

// Export for use in other modules
window.BinaryProtocol = BinaryProtocol;
window.HighPerformanceWebSocket = HighPerformanceWebSocket;
window.MessageType = MessageType;

console.log('📡 High-performance binary protocol loaded');
