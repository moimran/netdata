use axum::extract::ws::{Message, WebSocket};
use bytes::Bytes;
use futures::{sink::SinkExt, stream::StreamExt};
use serde::Deserialize;
use tokio::sync::mpsc;
use tracing::{error, info, debug};

#[derive(Debug, Deserialize)]
#[serde(tag = "type")]
pub enum WSCommand {
    #[serde(rename = "resize")]
    Resize { rows: u32, cols: u32 },
    #[serde(rename = "input")]
    Input { data: String },
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
        let (mut ws_sender, mut ws_receiver) = self.socket.split();

        // Handle incoming WebSocket messages
        let ssh_input_tx = self.ssh_input_tx.clone();
        let resize_tx = self.resize_tx.clone();
        let session_id = self.session_id.clone();
        let portal_user_id = self.portal_user_id.clone();
        
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
                                    if let Err(e) = ssh_input_tx.send(Bytes::from(data)).await {
                                        error!("[Session {}] Failed to send SSH input: {}",
                                               session_id, e);
                                        break;
                                    }
                                }
                                WSCommand::Resize { rows, cols } => {
                                    debug!("[Session {}] Processing resize command: {}x{}",
                                           session_id, cols, rows);
                                    if let Some(ref resize_tx) = resize_tx {
                                        if let Err(e) = resize_tx.send((rows, cols)).await {
                                            error!("[Session {}] Failed to send resize command: {}",
                                                   session_id, e);
                                        }
                                    } else {
                                        debug!("[Session {}] Resize channel not set, ignoring resize command",
                                               session_id);
                                    }
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

        // Forward SSH output to WebSocket
        debug!("Starting SSH output forwarder for session {}", self.session_id);
        while let Some(data) = self.ssh_output_rx.recv().await {
            debug!("[Session {}] Received {} bytes from SSH", self.session_id, data.len());
            match ws_sender.send(Message::Binary(data.to_vec())).await {
                Ok(_) => debug!("[Session {}] Sent {} bytes to WebSocket",
                                self.session_id, data.len()),
                Err(e) => {
                    error!("[Session {}] Failed to send WebSocket message: {}",
                           self.session_id, e);
                    break;
                }
            }
        }
        debug!("[Session {}] SSH output forwarder ended", self.session_id);
        info!("[Session {}] WebSocket handler completed for portal user {}",
              self.session_id, self.portal_user_id);
    }
}
