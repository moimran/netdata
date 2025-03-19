use axum::extract::ws::{Message, WebSocket};
use bytes::Bytes;
use futures::{sink::SinkExt, stream::StreamExt};
use serde::Deserialize;
use serde_json::json;
use tokio::sync::mpsc;
use tracing::{error, info, debug};

#[derive(Debug, Deserialize)]
#[serde(tag = "type")]
pub enum WSCommand {
    #[serde(rename = "resize")]
    Resize { rows: u32, cols: u32 },
    #[serde(rename = "input")]
    Input { data: String },
    #[serde(rename = "ping")]
    Ping,
}

pub struct WebSocketHandler {
    socket: WebSocket,
    ssh_input_tx: mpsc::Sender<Bytes>,
    ssh_output_rx: mpsc::Receiver<Bytes>,
    resize_tx: Option<mpsc::Sender<(u32, u32)>>,
    session_id: String,
    portal_user_id: String,
}

impl WebSocketHandler {
    pub fn new(
        socket: WebSocket,
        ssh_input_tx: mpsc::Sender<Bytes>,
        ssh_output_rx: mpsc::Receiver<Bytes>,
        session_id: String,
        portal_user_id: String,
    ) -> Self {
        Self {
            socket,
            ssh_input_tx,
            ssh_output_rx,
            resize_tx: None,
            session_id,
            portal_user_id,
        }
    }
    
    pub fn set_resize_channel(&mut self, resize_tx: mpsc::Sender<(u32, u32)>) {
        self.resize_tx = Some(resize_tx);
    }

    pub async fn handle(mut self) {
        debug!("Starting WebSocket handler for session {} (portal user: {})",
               self.session_id, self.portal_user_id);
        let (ws_sender, mut ws_receiver) = self.socket.split();

        // Create a channel for sending messages to the WebSocket
        let (ws_msg_tx, mut ws_msg_rx) = mpsc::channel::<Message>(100);
        
        // Clone the sender for use in the receiver task
        let ws_msg_tx_clone = ws_msg_tx.clone();

        // Handle incoming WebSocket messages
        let ssh_input_tx = self.ssh_input_tx.clone();
        let resize_tx = self.resize_tx.clone();
        let session_id = self.session_id.clone();
        let portal_user_id = self.portal_user_id.clone();
        
        // Spawn a task to handle incoming WebSocket messages
        tokio::spawn(async move {
            debug!("Starting WebSocket receiver task for session {} (portal user: {})",
                   session_id, portal_user_id);
            while let Some(Ok(msg)) = ws_receiver.next().await {
                match msg {
                    Message::Text(text) => {
                        debug!("[Session {}] Received text message: {}", session_id, text);
                        if let Ok(cmd) = serde_json::from_str::<WSCommand>(&text) {
                            match cmd {
                                WSCommand::Input { data } => {
                                    debug!("[Session {}] Processing input command: {} bytes",
                                           session_id, data.len());
                                    
                                    match ssh_input_tx.send(Bytes::from(data)).await {
                                        Ok(_) => {}, // Successfully sent data to SSH channel
                                        Err(e) => {
                                            // Check if this is a channel closed error
                                            let error_msg = e.to_string();
                                            let is_channel_closed = error_msg.contains("channel closed");
                                            
                                            error!("[Session {}] Failed to send SSH input: {}",
                                                   session_id, e);
                                            
                                            // If channel is closed, send a notification to the client
                                            if is_channel_closed {
                                                debug!("[Session {}] SSH channel is closed, notifying client", session_id);
                                                let _ = ws_msg_tx_clone.send(Message::Text(json!({
                                                    "type": "error",
                                                    "message": "SSH connection has been closed. Please reconnect."
                                                }).to_string())).await;
                                                
                                                // Short delay to allow the message to be sent
                                                tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
                                            }
                                            
                                            // Break the loop to close the WebSocket
                                            break;
                                        }
                                    }
                                }
                                WSCommand::Resize { rows, cols } => {
                                    debug!("[Session {}] Processing resize command: {}x{}",
                                           session_id, cols, rows);
                                    
                                    // Validate terminal dimensions
                                    let rows = std::cmp::max(rows, 24); // Minimum 24 rows
                                    let cols = std::cmp::max(cols, 80); // Minimum 80 columns
                                    
                                    if let Some(ref resize_tx) = resize_tx {
                                        debug!("[Session {}] Sending resize command with validated dimensions: {}x{}",
                                               session_id, cols, rows);
                                               
                                        if let Err(e) = resize_tx.send((rows, cols)).await {
                                            error!("[Session {}] Failed to send resize command: {}",
                                                   session_id, e);
                                        } else {
                                            // Send acknowledgment to client that resize was processed
                                            let _ = ws_msg_tx_clone.send(Message::Text(json!({
                                                "type": "info",
                                                "message": format!("Terminal resized to {}x{}", cols, rows)
                                            }).to_string())).await;
                                        }
                                    } else {
                                        debug!("[Session {}] Resize channel not set, ignoring resize command",
                                               session_id);
                                    }
                                }
                                WSCommand::Ping => {
                                    // Handle ping message from client (used for connection health check)
                                    debug!("[Session {}] Received ping from client", session_id);
                                    
                                    // Send a pong response back to the client
                                    let _ = ws_msg_tx_clone.send(Message::Text(json!({
                                        "type": "pong"
                                    }).to_string())).await;
                                }
                            }
                        } else {
                            error!("[Session {}] Failed to parse WebSocket command: {}",
                                   session_id, text);
                        }
                    }
                    Message::Binary(data) => {
                        debug!("[Session {}] Received binary message: {} bytes",
                               session_id, data.len());
                        if let Err(e) = ssh_input_tx.send(Bytes::from(data)).await {
                            error!("[Session {}] Failed to send SSH binary input: {}",
                                   session_id, e);
                            break;
                        }
                    }
                    Message::Close(_) => {
                        info!("[Session {}] WebSocket close message received", session_id);
                        break;
                    }
                    msg => {
                        debug!("[Session {}] Received other message type: {:?}",
                               session_id, msg);
                    }
                }
            }
            debug!("[Session {}] WebSocket receiver task ended", session_id);
        });

        // Spawn a task to forward messages from the channel to the WebSocket
        let session_id_clone = self.session_id.clone();
        let sender_task = tokio::spawn(async move {
            debug!("[Session {}] Starting WebSocket sender task", session_id_clone);
            let mut ws_sender = ws_sender;
            
            while let Some(msg) = ws_msg_rx.recv().await {
                if let Err(e) = ws_sender.send(msg).await {
                    error!("[Session {}] Failed to send WebSocket message: {}", session_id_clone, e);
                    break;
                }
            }
            
            debug!("[Session {}] WebSocket sender task ended", session_id_clone);
        });
        
        // Forward SSH output to WebSocket with improved handling for terminal applications
        debug!("Starting SSH output forwarder for session {}", self.session_id);
        
        // Track when we've seen certain command patterns to provide better refresh handling
        let mut saw_top_command = false;
        let mut saw_fullscreen_app = false;
        
        while let Some(data) = self.ssh_output_rx.recv().await {
            debug!("[Session {}] Received {} bytes from SSH", self.session_id, data.len());
            
            // Check for patterns in the output that indicate a full-screen application
            // This helps us provide better handling for commands like 'top'
            if !saw_fullscreen_app {
                // Look for clear screen sequences or cursor positioning that indicate full-screen apps
                if data.windows(3).any(|w| w == b"\x1b[H" || w == b"\x1b[2J") {
                    saw_fullscreen_app = true;
                    debug!("[Session {}] Detected full-screen application", self.session_id);
                }
            }
            
            // Check for 'top' command in the output
            if !saw_top_command {
                let data_str = String::from_utf8_lossy(&data);
                if data_str.contains("top -") || data_str.contains("Tasks:") || data_str.contains("Cpu(s):") {
                    saw_top_command = true;
                    debug!("[Session {}] Detected 'top' command output", self.session_id);
                }
            }
            
            // Send the data to the WebSocket
            if let Err(e) = ws_msg_tx.send(Message::Binary(data.to_vec())).await {
                error!("[Session {}] Failed to queue WebSocket message: {}",
                       self.session_id, e);
                break;
            } else {
                debug!("[Session {}] Queued {} bytes to WebSocket", self.session_id, data.len());
                
                // For full-screen applications like 'top', send a refresh notification
                // This helps the client know when to refresh the terminal display
                if saw_fullscreen_app || saw_top_command {
                    // Small delay to allow the data to be processed
                    tokio::time::sleep(tokio::time::Duration::from_millis(10)).await;
                    
                    // Send a notification to trigger a client-side refresh
                    let _ = ws_msg_tx.send(Message::Text(json!({
                        "type": "refresh",
                        "fullscreen": saw_fullscreen_app
                    }).to_string())).await;
                }
            }
        }
        
        // Close the message channel to signal the sender task to end
        drop(ws_msg_tx);
        
        // Wait for the sender task to complete
        if let Err(e) = sender_task.await {
            error!("[Session {}] WebSocket sender task failed: {}", self.session_id, e);
        }
        
        debug!("[Session {}] SSH output forwarder ended", self.session_id);
        info!("[Session {}] WebSocket handler completed for portal user {}",
              self.session_id, self.portal_user_id);
    }
}
