mod ssh;
// The ssh module is now organized into submodules:
// - ssh/mod.rs: Main module file
// - ssh/error.rs: Error types
// - ssh/channel.rs: Channel setup functions
// - ssh/session.rs: SSHSession implementation
mod websocket;
mod settings;
mod session;

use axum::{
    extract::{
        ws::{WebSocket, WebSocketUpgrade},
        State,
    },
    response::{Html, IntoResponse, Response},
    routing::{get, post},
    Json, Router,
    http::{HeaderValue, Method},
};
use tower_http::cors::{CorsLayer, Any};
use bytes::Bytes;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use std::collections::{HashMap, HashSet};
use std::time::{Duration, Instant};
use tokio::sync::{mpsc, Mutex};
use tower_http::services::ServeDir;
use tracing::{error, info, debug, Level};
use tracing_subscriber::FmtSubscriber;

use crate::{settings::Settings, ssh::SSHSession, websocket::WebSocketHandler, session::SessionRegistry};

#[derive(Debug, Serialize, Deserialize)]
struct SSHCredentials {
    hostname: String,
    port: u16,
    username: String,
    password: Option<String>,
    private_key: Option<String>,
    device_type: Option<String>, // Optional field to explicitly specify device type
    auth_type: Option<String>,   // Optional field to specify auth type (password or private-key)
    portal_user_id: Option<String>, // Added field for portal user identification
}

#[derive(Debug, Serialize, Deserialize)]
struct ConnectResponse {
    success: bool,
    message: String,
    session_id: Option<String>,
    websocket_url: Option<String>,
    error_code: Option<String>,
}

#[derive(Clone)]
struct AppState {
    session_registry: Arc<Mutex<SessionRegistry>>,
    settings: Arc<Settings>,
}

#[tokio::main]
async fn main() {
    // Initialize logging
    let _ = FmtSubscriber::builder()
        .with_max_level(Level::DEBUG)
        .with_level(true)
        .with_thread_ids(true)
        .with_target(true)
        .with_file(true)
        .with_line_number(true)
        .init();

    // Load settings
    let settings = Arc::new(Settings::load());
    info!("Settings loaded");

    // Initialize session registry
    let session_registry = Arc::new(Mutex::new(SessionRegistry::new()));
    
    let state = AppState {
        session_registry: session_registry.clone(),
        settings: settings.clone(),
    };

    // Start session cleanup task
    let cleanup_state = state.clone();
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(Duration::from_secs(300)); // 5 minutes
        
        loop {
            interval.tick().await;
            
            let mut registry = cleanup_state.session_registry.lock().await;
            let count = registry.cleanup_stale_sessions(Duration::from_secs(3600)); // 1 hour
            
            if count > 0 {
                info!("Cleaned up {} stale sessions", count);
            }
            
            // Log session statistics
            info!("Session statistics: {} total sessions, {} portal users, {} devices",
                  registry.total_sessions(),
                  registry.total_portal_users(),
                  registry.total_devices());
        }
    });

    // Configure CORS
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods([Method::GET, Method::POST])
        .allow_headers(Any);

    // Create router
    let app = Router::new()
        .route("/", get(index_handler))
        .route("/ws/:session_id", get(ws_handler))
        .route("/connect", post(connect_handler))
        .route("/api/connect", post(api_connect_handler))
        .route("/api/sessions", post(session_status_handler))
        .nest_service("/static", ServeDir::new("static"))
        .layer(cors)
        .with_state(state);

    // Start server
    let addr = format!("{}:{}", settings.server.address, settings.server.port);
    info!("Starting server on {}", addr);
    
    // For now, we'll just use the non-TLS server
    // TLS support can be added later with a proper TLS implementation
    if settings.server.tls_enabled {
        info!("TLS is enabled in settings, but not implemented in this version");
        info!("Starting non-TLS server on {}", addr);
    }
    
    let listener = tokio::net::TcpListener::bind(&addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

async fn index_handler() -> impl IntoResponse {
    Html(include_str!("../static/index.html"))
}

async fn connect_handler(
    State(state): State<AppState>,
    Json(credentials): Json<SSHCredentials>,
) -> Json<ConnectResponse> {
    // Generate a unique portal user ID if not provided
    let portal_user_id = credentials.portal_user_id
        .unwrap_or_else(|| format!("anonymous-{}", uuid::Uuid::new_v4()));
    
    // Use hostname as device ID for now
    let device_id = credentials.hostname.clone();
    
    info!("Connection request from portal user {} to device {} with SSH user {}",
          portal_user_id, device_id, credentials.username);
    
    match SSHSession::new(
        &credentials.hostname,
        credentials.port,
        &credentials.username,
        credentials.password.as_deref(),
        credentials.private_key.as_deref(),
        credentials.device_type.as_deref(),
        &state.settings.ssh,
    ) {
        Ok(session) => {
            // Add session to registry
            let session_id = {
                let mut registry = state.session_registry.lock().await;
                registry.add_session(
                    &portal_user_id,
                    &device_id,
                    &credentials.username,
                    session
                )
            };
            
            let websocket_url = format!("ws://{}:{}/ws/{}",
                                       state.settings.server.address,
                                       state.settings.server.port,
                                       session_id);
            
            info!("Created session {} for portal user {}, device {}, SSH user {}",
                  session_id, portal_user_id, device_id, credentials.username);
            
            Json(ConnectResponse {
                success: true,
                message: "Connected successfully".to_string(),
                session_id: Some(session_id),
                websocket_url: Some(websocket_url),
                error_code: None,
            })
        }
        Err(e) => {
            error!("SSH connection error for portal user {}, device {}, SSH user {}: {}",
                   portal_user_id, device_id, credentials.username, e);
            
            // Determine error code based on error message
            let error_code = if e.to_string().contains("Authentication") {
                "AUTH_FAILED"
            } else if e.to_string().contains("Connection") || e.to_string().contains("connect") {
                "CONNECTION_FAILED"
            } else {
                "UNKNOWN_ERROR"
            };
            
            Json(ConnectResponse {
                success: false,
                message: format!("Failed to connect: {}", e),
                session_id: None,
                websocket_url: None,
                error_code: Some(error_code.to_string()),
            })
        }
    }
}

// New API endpoint for simplified connection
async fn api_connect_handler(
    State(state): State<AppState>,
    Json(credentials): Json<SSHCredentials>,
) -> Json<ConnectResponse> {
    // Set default port if not provided
    let port = if credentials.port == 0 { 22 } else { credentials.port };
    
    // Determine authentication method
    let (password, private_key) = match credentials.auth_type.as_deref() {
        Some("private-key") => (None, credentials.private_key.clone()),
        _ => (credentials.password.clone(), None), // Default to password auth
    };
    
    // Create a new credentials object with the processed values
    let processed_credentials = SSHCredentials {
        hostname: credentials.hostname.clone(),
        port,
        username: credentials.username.clone(),
        password,
        private_key,
        device_type: credentials.device_type.clone(),
        auth_type: credentials.auth_type.clone(),
        portal_user_id: credentials.portal_user_id.clone(),
    };
    
    // Use the existing connect_handler logic
    connect_handler(State(state), Json(processed_credentials)).await
}

async fn ws_handler(
    ws: WebSocketUpgrade,
    axum::extract::Path(session_id): axum::extract::Path<String>,
    State(state): State<AppState>,
) -> Response {
    let mut registry = state.session_registry.lock().await;
    
    if let Some(session_info) = registry.get_session(&session_id) {
        // Get session info
        let portal_user_id = session_info.portal_user_id.clone();
        let device_id = session_info.device_id.clone();
        let ssh_username = session_info.ssh_username.clone();
        
        // Clone the SSH session for this connection
        let session = session_info.ssh_session.clone();
        
        // Release the lock before upgrading
        drop(registry);
        
        info!("Starting WebSocket connection for session {} (portal user: {}, device: {}, SSH user: {})",
              session_id, portal_user_id, device_id, ssh_username);
        
        // Upgrade the connection with the cloned session
        ws.on_upgrade(move |socket| handle_socket(socket, session, session_id, portal_user_id, state))
    } else {
        error!("Session {} not found", session_id);
        "Session not found".into_response()
    }
}

async fn handle_socket(
    socket: WebSocket,
    mut session: SSHSession,
    session_id: String,
    portal_user_id: String,
    state: AppState,
) {
    // Create channels for SSH communication
    let (ssh_input_tx, ssh_input_rx) = mpsc::channel::<Bytes>(32);
    let (ssh_output_tx, ssh_output_rx) = mpsc::channel::<Bytes>(32);
    
    // Create resize channel
    let (resize_tx, resize_rx) = mpsc::channel::<(u32, u32)>(8);
    
    // Set resize channel on SSH session
    session.set_resize_channel(resize_rx);

    // Clone session_id for use in the closure
    let session_id_clone = session_id.clone();
    
    // Start SSH I/O in a separate thread
    tokio::task::spawn_blocking(move || {
        if let Err(e) = session.start_io(ssh_input_rx, ssh_output_tx) {
            error!("SSH I/O error for session {}: {}", session_id_clone, e);
        }
    });

    // Create WebSocket handler with session context
    let mut ws_handler = WebSocketHandler::new(
        socket,
        ssh_input_tx,
        ssh_output_rx,
        session_id.clone(),
        portal_user_id.clone(),
    );
    
    // Set resize channel on WebSocket handler
    ws_handler.set_resize_channel(resize_tx);
    
    // Start WebSocket handler
    ws_handler.handle().await;
    
    // Update last activity timestamp when the connection ends
    let mut registry = state.session_registry.lock().await;
    if let Some(session_info) = registry.get_session(&session_id) {
        info!("WebSocket connection ended for session {} (portal user: {})",
              session_id, portal_user_id);
    }
}

#[derive(Debug, Serialize, Deserialize)]
struct SessionStatusRequest {
    portal_user_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct SessionStatusResponse {
    active_sessions: usize,
    sessions: Vec<SessionInfo>,
}

#[derive(Debug, Serialize, Deserialize)]
struct SessionInfo {
    session_id: String,
    portal_user_id: String,
    device_id: String,
    ssh_username: String,
    last_activity: String,
}

async fn session_status_handler(
    State(state): State<AppState>,
    Json(request): Json<SessionStatusRequest>,
) -> Json<SessionStatusResponse> {
    let mut registry = state.session_registry.lock().await;
    
    let mut sessions_info = Vec::new();
    
    if let Some(portal_user_id) = request.portal_user_id.clone() {
        // Get sessions for a specific portal user
        let session_ids = registry.get_portal_user_sessions(&portal_user_id);
        
        for id in session_ids {
            if let Some(session_info) = registry.get_session(&id) {
                sessions_info.push(SessionInfo {
                    session_id: id.clone(),
                    portal_user_id: session_info.portal_user_id.clone(),
                    device_id: session_info.device_id.clone(),
                    ssh_username: session_info.ssh_username.clone(),
                    last_activity: format!("{:?}", session_info.last_activity),
                });
            }
        }
    } else {
        // For all sessions, we need to iterate through all portal users
        let total_sessions = registry.total_sessions();
        let total_portal_users = registry.total_portal_users();
        let total_devices = registry.total_devices();
        
        info!("Getting status for all sessions: {} total sessions, {} portal users, {} devices",
              total_sessions, total_portal_users, total_devices);
        
        // Since we can't directly access the sessions map, we'll use the portal_user_sessions map
        // to get all session IDs
        for portal_user_id in registry.get_all_portal_user_ids() {
            for id in registry.get_portal_user_sessions(&portal_user_id) {
                if let Some(session_info) = registry.get_session(&id) {
                    sessions_info.push(SessionInfo {
                        session_id: id.clone(),
                        portal_user_id: session_info.portal_user_id.clone(),
                        device_id: session_info.device_id.clone(),
                        ssh_username: session_info.ssh_username.clone(),
                        last_activity: format!("{:?}", session_info.last_activity),
                    });
                }
            }
        }
    }
    
    Json(SessionStatusResponse {
        active_sessions: sessions_info.len(),
        sessions: sessions_info,
    })
}
