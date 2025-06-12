mod ssh;
// The ssh module is now organized into submodules:
// - ssh/mod.rs: Main module file
// - ssh/error.rs: Error types
// - ssh/channel.rs: Channel setup functions
// - ssh/session.rs: SSHSession implementation
mod websocket;
mod settings;
mod session;
mod protocol;

use axum::{
    extract::{
        ws::{WebSocket, WebSocketUpgrade},
        State,
    },
    response::{Html, IntoResponse, Response},
    routing::{get, post},
    Json, Router,
    http::Method,
};
use tower_http::cors::{CorsLayer, Any};
use bytes::Bytes;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
// Collections removed - not used in current implementation
use std::time::Duration;
use tokio::sync::{mpsc, Mutex};
use tower_http::services::ServeDir;
use tracing::{error, info, debug, Level};
use tracing_subscriber::FmtSubscriber;

use crate::{settings::Settings, ssh::SSHSession, websocket::WebSocketHandler, session::SessionRegistry};

#[derive(Debug, Clone, Serialize, Deserialize)]
struct SSHCredentials {
    hostname: String,
    port: u16,
    username: String,
    password: Option<String>,
    private_key: Option<String>,
    device_type: Option<String>, // Optional field to explicitly specify device type
    auth_type: Option<String>,   // Optional field to specify auth type (password or private-key)
    portal_user_id: Option<String>, // Added field for portal user identification
    enable_password: Option<String>, // Added field for enable password for network devices
    device_name: Option<String>, // Added field for friendly device name display
    session_id: Option<String>,  // Added field for session ID from backend
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
    // Initialize logging with production-ready configuration
    let log_level = std::env::var("RUST_LOG")
        .unwrap_or_else(|_| "info".to_string())
        .parse::<Level>()
        .unwrap_or(Level::INFO);

    FmtSubscriber::builder()
        .with_max_level(log_level)
        .with_level(false)  // Hide log levels in production
        .with_thread_ids(false)  // Hide thread IDs in production
        .with_target(false)  // Hide targets in production
        .with_file(false)  // Hide file names in production
        .with_line_number(false)  // Hide line numbers in production
        .compact()  // Use compact format for production
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
        .route("/api/session/:session_id/status", get(session_status_single_handler))
        .route("/api/session/:session_id/terminate", post(session_terminate_handler))
        .nest_service("/static", ServeDir::new("static"))
        .fallback_service(ServeDir::new("static").append_index_html_on_directories(true))
        .layer(cors)
        .with_state(state);

    // Get server address and port from environment variables if available
    let address = std::env::var("WEBSSH_SERVER_ADDRESS")
        .unwrap_or_else(|_| settings.server.address.clone());
    let port = std::env::var("WEBSSH_SERVER_PORT")
        .unwrap_or_else(|_| settings.server.port.to_string())
        .parse::<u16>()
        .unwrap_or(settings.server.port);
    
    let addr = format!("{0}:{1}", address, port);
    info!("Starting server on {}", addr);
    
    // For now, we'll just use the non-TLS server
    // TLS support can be added later with a proper TLS implementation
    if settings.server.tls_enabled {
        info!("TLS is enabled in settings, but not implemented in this version");
        info!("Starting non-TLS server on {}", addr);
    }
    
    // Log the available routes
    info!("Available routes:");
    info!("  GET  / - HTML interface");
    info!("  GET  /ws/:session_id - WebSocket endpoint");
    info!("  POST /connect - Connect endpoint");
    info!("  POST /api/connect - API connect endpoint");
    info!("  POST /api/session/:session_id/terminate - Terminate session endpoint");
    
    let listener = tokio::net::TcpListener::bind(&addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

async fn index_handler() -> impl IntoResponse {
    // We're using the static HTML file with client-side JavaScript that will parse URL parameters
    // The JavaScript in the HTML will handle the session_id and other parameters
    info!("Serving index.html with client-side parameter handling");
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

// Enhanced API endpoint for backend integration with improved security
async fn api_connect_handler(
    State(state): State<AppState>,
    Json(credentials): Json<SSHCredentials>,
) -> Json<ConnectResponse> {
    // Log the connection attempt with limited information (no passwords)
    info!("API connection request for hostname: {}, username: {}, device_name: {}", 
          credentials.hostname, 
          credentials.username, 
          credentials.device_name.as_deref().unwrap_or("Unknown"));
    
    // Set default port if not provided
    let port = if credentials.port == 0 { 22 } else { credentials.port };
    
    // Determine authentication method
    let (password, private_key) = match credentials.auth_type.as_deref() {
        Some("private-key") => (None, credentials.private_key.clone()),
        _ => (credentials.password.clone(), None), // Default to password auth
    };
    
    // Generate a unique session ID if not provided
    let session_id = credentials.session_id.clone().unwrap_or_else(|| {
        uuid::Uuid::new_v4().to_string()
    });
    
    // Use the device name as portal_user_id if not provided
    let portal_user_id = credentials.portal_user_id.clone().unwrap_or_else(|| {
        credentials.device_name.clone().unwrap_or_else(|| format!("device-{}", uuid::Uuid::new_v4()))
    });
    
    // Create a new credentials object with the processed values
    let processed_credentials = SSHCredentials {
        hostname: credentials.hostname.clone(),
        port,
        username: credentials.username.clone(),
        password,
        private_key,
        device_type: credentials.device_type.clone(),
        auth_type: credentials.auth_type.clone(),
        portal_user_id: Some(portal_user_id),
        enable_password: credentials.enable_password.clone(),
        device_name: credentials.device_name.clone(),
        session_id: Some(session_id),
    };
    
    // Use the existing connect_handler logic
    let mut response = connect_handler(State(state), Json(processed_credentials.clone())).await;
    
    // Enhance the response with additional information for the frontend
    if let Some(websocket_url) = &response.websocket_url {
        // Create a URL with query parameters for the frontend
        let device_name = processed_credentials.device_name.unwrap_or_else(|| processed_credentials.hostname.clone());
        let enhanced_url = format!("{}&hostname={}&username={}&device_name={}", 
                                 websocket_url,
                                 urlencoding::encode(&processed_credentials.hostname),
                                 urlencoding::encode(&processed_credentials.username),
                                 urlencoding::encode(&device_name));
        
        response.websocket_url = Some(enhanced_url);
    }
    
    response
}

async fn ws_handler(
    ws: WebSocketUpgrade,
    axum::extract::Path(session_id): axum::extract::Path<String>,
    State(state): State<AppState>,
) -> Response {
    // Log the session ID being requested
    info!("WebSocket connection request for session ID: {}", session_id);
    
    // Trim any whitespace from the session ID
    let clean_session_id = session_id.trim().to_string();
    
    // Check if the session exists in the registry
    let mut registry = state.session_registry.lock().await;
    let session_exists = registry.get_session(&clean_session_id).is_some();
    
    if session_exists {
        // Get session info
        let session_info = registry.get_session(&clean_session_id).unwrap();
        let portal_user_id = session_info.portal_user_id.clone();
        let device_id = session_info.device_id.clone();
        let ssh_username = session_info.ssh_username.clone();
        
        // Clone the SSH session for this connection
        let session = session_info.ssh_session.clone();
        
        // Release the lock before upgrading
        drop(registry);
        
        info!("Starting WebSocket connection for session {} (portal user: {}, device: {}, SSH user: {})",
              clean_session_id, portal_user_id, device_id, ssh_username);
        
        // Upgrade the connection with the cloned session
        ws.on_upgrade(move |socket| handle_socket(socket, session, clean_session_id, portal_user_id, state))
    } else {
        // Log all available sessions for debugging
        let sessions = registry.get_all_sessions();
        info!("Available sessions: {}", sessions.join(", "));
        error!("Session {} not found", clean_session_id);
        
        // Create a JSON error response with more information
        let error_response = serde_json::json!({
            "error": "session_not_found",
            "message": format!("Session '{}' not found. The SSH connection may have failed or the session expired.", clean_session_id),
            "session_id": clean_session_id,
            "available_sessions": sessions.len()
        });
        
        // Return a structured error response
        (axum::http::StatusCode::NOT_FOUND, Json(error_response)).into_response()
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
    
    // Clean up the session when the WebSocket connection ends
    let mut registry = state.session_registry.lock().await;
    info!("WebSocket connection ended for session {} (portal user: {})",
          session_id, portal_user_id);
    
    // Log that we're closing the SSH connection due to WebSocket close
    debug!("Closing SSH connection for session {} because WebSocket close message received", session_id);
    
    // Remove the session from the registry and close the SSH connection
    if registry.remove_session(&session_id) {
        info!("SSH session removed and closed for session {}", session_id);
    } else {
        debug!("Session {} not found in registry during cleanup", session_id);
    }
}

#[derive(Debug, Serialize, Deserialize)]
struct SessionStatusRequest {
    portal_user_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct SessionStatusSingleResponse {
    exists: bool,
    ready: bool,
    message: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct SessionTerminateResponse {
    success: bool,
    message: String,
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

/// Handler for checking the status of all sessions
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

/// Handler for terminating a session by ID
async fn session_terminate_handler(
    axum::extract::Path(session_id): axum::extract::Path<String>,
    State(state): State<AppState>,
) -> Json<SessionTerminateResponse> {
    // Log the session ID being terminated
    info!("Terminating session ID: {}", session_id);
    
    // Trim any whitespace from the session ID
    let clean_session_id = session_id.trim().to_string();
    
    // Get a lock on the session registry
    let mut registry = state.session_registry.lock().await;
    
    // Check if the session exists
    if let Some(session) = registry.get_session(&clean_session_id) {
        // Log session details before termination
        info!("Terminating session for portal user {}, device {}, SSH user {}", 
              session.portal_user_id, session.device_id, session.ssh_username);
        
        // Remove the session from the registry
        registry.remove_session(&clean_session_id);
        
        info!("Session {} successfully terminated", clean_session_id);
        Json(SessionTerminateResponse {
            success: true,
            message: format!("Session '{}' successfully terminated", clean_session_id),
        })
    } else {
        // Session not found
        info!("Session {} not found for termination", clean_session_id);
        Json(SessionTerminateResponse {
            success: false,
            message: format!("Session '{}' not found", clean_session_id),
        })
    }
}

/// Handler for checking the status of a single session by ID
async fn session_status_single_handler(
    axum::extract::Path(session_id): axum::extract::Path<String>,
    State(state): State<AppState>,
) -> Json<SessionStatusSingleResponse> {
    // Log the session ID being checked
    info!("Checking status for session ID: {}", session_id);
    
    // Trim any whitespace from the session ID
    let clean_session_id = session_id.trim().to_string();
    
    // Check if the session exists in the registry
    let mut registry = state.session_registry.lock().await;
    let session_exists = registry.get_session(&clean_session_id).is_some();
    
    if session_exists {
        info!("Session {} exists and is ready", clean_session_id);
        Json(SessionStatusSingleResponse {
            exists: true,
            ready: true,
            message: "Session is ready for connection".to_string(),
        })
    } else {
        // Check if the session ID contains connection information
        // Format: portal-{portal_user_id}-device-{device_id}-ssh-{ssh_username}-{uuid}
        let _parts: Vec<&str> = clean_session_id.split('-').collect();
        
        // Log all available sessions for debugging
        let sessions = registry.get_all_sessions();
        info!("Available sessions: {}", sessions.join(", "));
        info!("Session {} does not exist", clean_session_id);
        
        // For now, just return that the session doesn't exist
        // The frontend will continue polling until it times out or the session is created
        Json(SessionStatusSingleResponse {
            exists: false,
            ready: false,
            message: format!("Session '{}' not found. Waiting for it to be created...", clean_session_id),
        })
    }
}
