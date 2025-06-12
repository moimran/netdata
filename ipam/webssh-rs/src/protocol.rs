use serde::{Deserialize, Serialize};
use bytes::Bytes;
use std::io::{Read, Write};
use flate2::{Compression, read::GzDecoder, write::GzEncoder};

/// High-performance binary message protocol for WebSocket communication
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum BinaryMessage {
    /// Terminal output data (compressed if large)
    TerminalOutput {
        data: Vec<u8>,
        compressed: bool,
    },
    /// Terminal input from user
    TerminalInput {
        data: String,
    },
    /// Terminal resize event
    Resize {
        cols: u16,
        rows: u16,
    },
    /// Ping for keepalive
    Ping,
    /// Pong response
    Pong,
    /// Session info
    SessionInfo {
        session_id: String,
        message: String,
    },
    /// Error message
    Error {
        code: String,
        message: String,
    },
}

impl BinaryMessage {
    /// Serialize message to binary format with optional compression
    pub fn to_binary(&self) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
        let serialized = bincode::serialize(self)?;
        
        // Compress if message is large (>1KB)
        if serialized.len() > 1024 {
            let mut encoder = GzEncoder::new(Vec::new(), Compression::fast());
            encoder.write_all(&serialized)?;
            let compressed = encoder.finish()?;
            
            // Only use compression if it actually reduces size
            if compressed.len() < serialized.len() {
                let mut result = vec![1u8]; // Compression flag
                result.extend_from_slice(&compressed);
                return Ok(result);
            }
        }
        
        // No compression
        let mut result = vec![0u8]; // No compression flag
        result.extend_from_slice(&serialized);
        Ok(result)
    }
    
    /// Deserialize message from binary format with decompression
    pub fn from_binary(data: &[u8]) -> Result<Self, Box<dyn std::error::Error>> {
        if data.is_empty() {
            return Err("Empty data".into());
        }
        
        let compressed = data[0] == 1;
        let payload = &data[1..];
        
        let serialized = if compressed {
            let mut decoder = GzDecoder::new(payload);
            let mut decompressed = Vec::new();
            decoder.read_to_end(&mut decompressed)?;
            decompressed
        } else {
            payload.to_vec()
        };
        
        let message = bincode::deserialize(&serialized)?;
        Ok(message)
    }
    
    /// Create terminal output message with automatic compression
    pub fn terminal_output(data: Bytes) -> Self {
        let data_vec = data.to_vec(); // Convert Bytes to Vec<u8>
        let compressed = data_vec.len() > 512; // Auto-compress if >512 bytes
        BinaryMessage::TerminalOutput { data: data_vec, compressed }
    }
    
    /// Create terminal input message
    pub fn terminal_input(data: String) -> Self {
        BinaryMessage::TerminalInput { data }
    }
    
    /// Create resize message
    pub fn resize(cols: u16, rows: u16) -> Self {
        BinaryMessage::Resize { cols, rows }
    }
    
    /// Create session info message
    pub fn session_info(session_id: String, message: String) -> Self {
        BinaryMessage::SessionInfo { session_id, message }
    }
    
    /// Create error message
    pub fn error(code: String, message: String) -> Self {
        BinaryMessage::Error { code, message }
    }
}

/// Performance statistics for monitoring
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerformanceStats {
    pub messages_sent: u64,
    pub messages_received: u64,
    pub bytes_sent: u64,
    pub bytes_received: u64,
    pub compression_ratio: f32,
    pub average_latency_ms: f32,
}

impl Default for PerformanceStats {
    fn default() -> Self {
        Self {
            messages_sent: 0,
            messages_received: 0,
            bytes_sent: 0,
            bytes_received: 0,
            compression_ratio: 1.0,
            average_latency_ms: 0.0,
        }
    }
}

impl PerformanceStats {
    pub fn record_sent(&mut self, original_size: usize, compressed_size: usize) {
        self.messages_sent += 1;
        self.bytes_sent += compressed_size as u64;
        
        // Update compression ratio (rolling average)
        let new_ratio = original_size as f32 / compressed_size as f32;
        self.compression_ratio = (self.compression_ratio * 0.9) + (new_ratio * 0.1);
    }
    
    pub fn record_received(&mut self, size: usize) {
        self.messages_received += 1;
        self.bytes_received += size as u64;
    }
    
    pub fn record_latency(&mut self, latency_ms: f32) {
        // Rolling average of latency
        self.average_latency_ms = (self.average_latency_ms * 0.9) + (latency_ms * 0.1);
    }
    
    pub fn get_throughput_mbps(&self) -> f32 {
        // Calculate throughput in Mbps (rough estimate)
        (self.bytes_sent + self.bytes_received) as f32 / (1024.0 * 1024.0 / 8.0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_binary_serialization() {
        let msg = BinaryMessage::terminal_output(Bytes::from("Hello, World!"));
        let binary = msg.to_binary().unwrap();
        let deserialized = BinaryMessage::from_binary(&binary).unwrap();
        
        match deserialized {
            BinaryMessage::TerminalOutput { data, .. } => {
                assert_eq!(data, "Hello, World!".as_bytes().to_vec());
            }
            _ => panic!("Wrong message type"),
        }
    }
    
    #[test]
    fn test_compression() {
        // Large message should be compressed
        let large_data = "A".repeat(2000);
        let msg = BinaryMessage::terminal_output(Bytes::from(large_data.clone()));
        let binary = msg.to_binary().unwrap();
        
        // Should be compressed (first byte = 1)
        assert_eq!(binary[0], 1);
        
        let deserialized = BinaryMessage::from_binary(&binary).unwrap();
        match deserialized {
            BinaryMessage::TerminalOutput { data, .. } => {
                assert_eq!(data, large_data.as_bytes().to_vec());
            }
            _ => panic!("Wrong message type"),
        }
    }
}
