use ssh2::Session;
use std::{io::{Read, Write}, net::TcpStream};
use tokio::sync::mpsc;
use bytes::Bytes;
use tracing::{error, info, debug};
use std::time::Duration;

use crate::settings::SSHSettings;
use super::error::SSHError;
use super::channel::{setup_standard_session, setup_linux_session, setup_cisco_session};

/// Represents an active SSH session with a remote server
///
/// This struct manages the SSH connection, authentication, and I/O operations
/// between the web client and the SSH server.
use std::sync::{Arc, atomic::{AtomicBool, Ordering}};

pub struct SSHSession {
    session: Session,
    channel: ssh2::Channel,
    resize_rx: Option<mpsc::Receiver<(u32, u32)>>,
    // Thread-safe flag to signal shutdown
    shutdown_flag: Arc<AtomicBool>,
    settings: SSHSettings,
    // Store connection parameters for cloning
    hostname: String,
    port: u16,
    username: String,
    password: Option<String>,
    private_key: Option<String>,
    device_type: Option<String>,
}

// Implement Clone for SSHSession
impl Clone for SSHSession {
    fn clone(&self) -> Self {
        // Create a new session with the same parameters, but share the shutdown flag
        let mut cloned = SSHSession::new(
            &self.hostname,
            self.port,
            &self.username,
            self.password.as_deref(),
            self.private_key.as_deref(),
            self.device_type.as_deref(),
            &self.settings,
        ).expect("Failed to clone SSH session");
        
        // Share the same shutdown flag so both instances can be shut down together
        cloned.shutdown_flag = self.shutdown_flag.clone();
        
        cloned
    }
}

impl SSHSession {
    /// Closes the SSH session and releases all resources
    ///
    /// This method should be called when the session is no longer needed
    /// to ensure proper cleanup of SSH connections and channels.
    ///
    /// # Returns
    /// * `Result<(), SSHError>` - Success or an error
    pub fn close(&mut self) -> Result<(), SSHError> {
        info!("Closing SSH session to {}:{} for user {}", self.hostname, self.port, self.username);
        
        // Signal the I/O handling thread to stop by setting the shutdown flag
        info!("Setting shutdown flag to signal I/O handling thread to stop");
        self.shutdown_flag.store(true, Ordering::SeqCst);
        
        // Close the channel first
        match self.channel.close() {
            Ok(_) => info!("SSH channel closed successfully"),
            Err(e) => {
                // It's okay if the channel is already closed
                error!("Error closing SSH channel: {}", e);
            }
        }
        
        // Try to send EOF
        match self.channel.send_eof() {
            Ok(_) => info!("Sent EOF to SSH channel"),
            Err(e) => {
                // It's okay if we can't send EOF (channel might be closed)
                error!("Error sending EOF to SSH channel: {}", e);
            }
        }
        
        // We'll skip wait_close since we've already closed the channel
        // This avoids the "channel is not in EOF state" error
        
        // Disconnect the session
        match self.session.disconnect(None, "Session terminated by user", None) {
            Ok(_) => info!("SSH session disconnected successfully"),
            Err(e) => error!("Error disconnecting SSH session: {}", e),
        }
        
        info!("SSH session to {}:{} for user {} closed", self.hostname, self.port, self.username);
        Ok(())
    }
    
    /// Creates a new SSH session with the specified connection parameters
    ///
    /// # Arguments
    /// * `hostname` - The hostname or IP address of the SSH server
    /// * `port` - The port number of the SSH server (typically 22)
    /// * `username` - The username for authentication
    /// * `password` - Optional password for authentication
    /// * `private_key` - Optional private key for authentication (in PEM format)
    /// * `device_type_hint` - Optional hint about the device type (e.g., "cisco", "linux")
    /// * `settings` - SSH settings from the application configuration
    ///
    /// # Returns
    /// * `Result<Self, SSHError>` - A new SSHSession or an error
    pub fn new(
        hostname: &str,
        port: u16,
        username: &str,
        password: Option<&str>,
        private_key: Option<&str>,
        device_type_hint: Option<&str>,
        settings: &SSHSettings,
    ) -> Result<Self, SSHError> {
        info!("Connecting to SSH server {}:{}", hostname, port);
        
        // Create TCP connection with timeout
        let tcp = TcpStream::connect((hostname, port))?;
        tcp.set_read_timeout(Some(Duration::from_secs(settings.connection.read_timeout_seconds)))?;
        tcp.set_write_timeout(Some(Duration::from_secs(settings.connection.write_timeout_seconds)))?;
        debug!("TCP connection established");

        // Create and configure SSH session
        let mut session = Session::new()
            .map_err(|_| SSHError::Connection(
                std::io::Error::new(std::io::ErrorKind::Other, "Failed to create SSH session")
            ))?;

        session.set_tcp_stream(tcp);
        session.set_timeout((settings.connection.timeout_seconds * 1000) as u32); // Convert seconds to milliseconds
        session.set_compress(settings.connection.compress);
        
        // Configure SSH algorithms from settings
        session.method_pref(
            ssh2::MethodType::Kex,
            &settings.crypto.kex_algorithms
        )?;
        session.method_pref(
            ssh2::MethodType::HostKey,
            &settings.crypto.host_key_algorithms
        )?;
        session.method_pref(
            ssh2::MethodType::CryptCs,
            &settings.crypto.encryption_client_to_server
        )?;
        session.method_pref(
            ssh2::MethodType::CryptSc,
            &settings.crypto.encryption_server_to_client
        )?;
        session.method_pref(
            ssh2::MethodType::MacCs,
            &settings.crypto.mac_client_to_server
        )?;
        session.method_pref(
            ssh2::MethodType::MacSc,
            &settings.crypto.mac_server_to_client
        )?;

        debug!("Starting SSH handshake");
        
        // Log available methods before handshake
        debug!("Configured KEX methods: {}", settings.crypto.kex_algorithms);
        debug!("Configured host key methods: {}", settings.crypto.host_key_algorithms);
        debug!("Configured client->server encryption methods: {}", settings.crypto.encryption_client_to_server);
        debug!("Configured server->client encryption methods: {}", settings.crypto.encryption_server_to_client);
        
        // Implement retry mechanism for handshake with banner issues
        let mut retry_count = 0;
        let max_retries = 3;
        
        loop {
            match session.handshake() {
                Ok(_) => {
                    if retry_count > 0 {
                        debug!("SSH handshake completed successfully after {} retries", retry_count);
                    } else {
                        debug!("SSH handshake completed successfully");
                    }
                    break;
                },
                Err(e) => {
                    // Check if this is a banner-related error
                    let is_banner_error = e.code() == ssh2::ErrorCode::Session(-13) && 
                                          e.message().contains("banner");
                    
                    if is_banner_error && retry_count < max_retries {
                        retry_count += 1;
                        error!("SSH handshake failed due to banner issue (attempt {}/{}): {}", 
                               retry_count, max_retries, e);
                        
                        // For Cisco XR devices that have banner issues, we'll retry after a short delay
                        debug!("Retrying handshake after banner issue...");
                        std::thread::sleep(std::time::Duration::from_millis(500));
                        
                        // Create a new session for the retry
                        drop(session);
                        session = Session::new()
                            .map_err(|_| SSHError::Connection(
                                std::io::Error::new(std::io::ErrorKind::Other, "Failed to create SSH session")
                            ))?;
                        
                        // Reconnect TCP
                        let tcp = TcpStream::connect((hostname, port))?;
                        tcp.set_read_timeout(Some(Duration::from_secs(settings.connection.read_timeout_seconds)))?;
                        tcp.set_write_timeout(Some(Duration::from_secs(settings.connection.write_timeout_seconds)))?;
                        
                        session.set_tcp_stream(tcp);
                        session.set_timeout((settings.connection.timeout_seconds * 1000) as u32);
                        session.set_compress(settings.connection.compress);
                        
                        // Reconfigure SSH algorithms
                        session.method_pref(ssh2::MethodType::Kex, &settings.crypto.kex_algorithms)?;
                        session.method_pref(ssh2::MethodType::HostKey, &settings.crypto.host_key_algorithms)?;
                        session.method_pref(ssh2::MethodType::CryptCs, &settings.crypto.encryption_client_to_server)?;
                        session.method_pref(ssh2::MethodType::CryptSc, &settings.crypto.encryption_server_to_client)?;
                        session.method_pref(ssh2::MethodType::MacCs, &settings.crypto.mac_client_to_server)?;
                        session.method_pref(ssh2::MethodType::MacSc, &settings.crypto.mac_server_to_client)?;
                        
                        continue;
                    } else {
                        // For non-banner errors or if we've exhausted retries
                        if is_banner_error {
                            error!("SSH handshake failed due to banner issue after {} retries: {}", max_retries, e);
                        } else {
                            error!("SSH handshake failed: {}", e);
                        }
                        error!("This could be due to incompatible encryption algorithms or network issues");
                        return Err(e.into());
                    }
                }
            }
        }

        // Configure session
        session.set_blocking(true);
        session.set_keepalive(true, settings.connection.keepalive_seconds as u32);

        // Authenticate with retry mechanism
        if let Some(password) = password {
            info!("Authenticating with password for user {}", username);
            
            // Implement retry for password authentication
            let mut auth_retry_count = 0;
            let max_auth_retries = 3;
            let mut auth_success = false;
            
            while auth_retry_count < max_auth_retries && !auth_success {
                match session.userauth_password(username, password) {
                    Ok(_) => {
                        auth_success = true;
                        if auth_retry_count > 0 {
                            debug!("Password authentication succeeded after {} retries", auth_retry_count);
                        } else {
                            debug!("Password authentication succeeded");
                        }
                    },
                    Err(e) => {
                        auth_retry_count += 1;
                        error!("Password authentication failed (attempt {}/{}): {}", 
                               auth_retry_count, max_auth_retries, e);
                        
                        if auth_retry_count < max_auth_retries {
                            debug!("Retrying password authentication after failure...");
                            std::thread::sleep(std::time::Duration::from_millis(500));
                            
                            // For certain authentication errors, we may need to recreate the session
                            if e.code() == ssh2::ErrorCode::Session(-43) { // Waiting for password response
                                debug!("Recreating SSH session after authentication error");
                                
                                // Create a new session for the retry
                                drop(session);
                                session = Session::new()
                                    .map_err(|_| SSHError::Connection(
                                        std::io::Error::new(std::io::ErrorKind::Other, "Failed to create SSH session")
                                    ))?;
                                
                                // Reconnect TCP
                                let tcp = TcpStream::connect((hostname, port))?;
                                tcp.set_read_timeout(Some(Duration::from_secs(settings.connection.read_timeout_seconds)))?;
                                tcp.set_write_timeout(Some(Duration::from_secs(settings.connection.write_timeout_seconds)))?;
                                
                                session.set_tcp_stream(tcp);
                                session.set_timeout((settings.connection.timeout_seconds * 1000) as u32);
                                session.set_compress(settings.connection.compress);
                                session.set_blocking(true);
                                session.set_keepalive(true, settings.connection.keepalive_seconds as u32);
                                
                                // Reconfigure SSH algorithms
                                session.method_pref(ssh2::MethodType::Kex, &settings.crypto.kex_algorithms)?;
                                session.method_pref(ssh2::MethodType::HostKey, &settings.crypto.host_key_algorithms)?;
                                session.method_pref(ssh2::MethodType::CryptCs, &settings.crypto.encryption_client_to_server)?;
                                session.method_pref(ssh2::MethodType::CryptSc, &settings.crypto.encryption_server_to_client)?;
                                session.method_pref(ssh2::MethodType::MacCs, &settings.crypto.mac_client_to_server)?;
                                session.method_pref(ssh2::MethodType::MacSc, &settings.crypto.mac_server_to_client)?;
                                
                                // Perform handshake again
                                debug!("Performing handshake after session recreation");
                                match session.handshake() {
                                    Ok(_) => debug!("SSH handshake completed successfully after session recreation"),
                                    Err(handshake_err) => {
                                        error!("SSH handshake failed after session recreation: {}", handshake_err);
                                        return Err(handshake_err.into());
                                    }
                                }
                            }
                            continue;
                        } else {
                            return Err(SSHError::Authentication(format!("Password authentication failed after {} attempts: {}", max_auth_retries, e)));
                        }
                    }
                }
            }
            
            if !auth_success {
                return Err(SSHError::Authentication(format!("Password authentication failed after {} attempts", max_auth_retries)));
            }
        } else if let Some(key_data) = private_key {
            info!("Authenticating with private key for user {}", username);
            
            // Try to parse the private key
            debug!("Parsing private key");
            
            // First, check if the key is in PEM format
            if key_data.contains("-----BEGIN") {
                debug!("Key appears to be in PEM format");
                
                // Try to load the private key
                match session.userauth_pubkey_memory(username, None, key_data, None) {
                    Ok(_) => debug!("Private key authentication successful"),
                    Err(e) => {
                        error!("Private key authentication failed: {}", e);
                        return Err(SSHError::Authentication(format!("Private key authentication failed: {}", e)));
                    }
                }
            } else {
                // If not in PEM format, it might be in OpenSSH format or another format
                error!("Unsupported private key format. Please provide a PEM formatted private key");
                return Err(SSHError::Authentication("Unsupported private key format. Please provide a PEM formatted private key".into()));
            }
        } else {
            return Err(SSHError::Authentication("No authentication method provided".into()));
        }

        if !session.authenticated() {
            return Err(SSHError::Authentication("Authentication failed".into()));
        }
        debug!("Authentication successful");

        // Create a simple channel
        info!("Creating SSH channel");
        
        // Set a longer timeout for channel operations
        session.set_timeout((settings.connection.channel_timeout_seconds * 1000) as u32);
        
        // Get device type hint if provided
        let device_type_hint = device_type_hint.map(|hint| hint.to_lowercase());
        let is_cisco_hint = device_type_hint.as_ref().is_some_and(|hint|
            hint == "cisco" || hint == "router" || hint == "switch");
        
        // Set up the channel based on device type with fallback mechanism
        let mut channel = if is_cisco_hint {
            debug!("Using Cisco approach based on user hint");
            setup_cisco_session(&mut session, settings)?
        } else {
            // Try standard approach first (similar to electerm)
            debug!("Trying standard approach first");
            match setup_standard_session(&mut session, settings) {
                Ok(channel) => {
                    debug!("Standard approach succeeded");
                    channel
                },
                Err(e) => {
                    debug!("Standard approach failed: {}. Trying Linux approach", e);
                    // If standard approach fails, try Linux approach
                    match setup_linux_session(&mut session, settings) {
                        Ok(channel) => {
                            debug!("Linux approach succeeded");
                            channel
                        },
                        Err(e) => {
                            debug!("Linux approach failed: {}. Trying Cisco approach as final fallback", e);
                            // If Linux approach fails, try Cisco approach as final fallback
                            setup_cisco_session(&mut session, settings)?
                        }
                    }
                }
            }
        };
        
        // Ensure channel is ready with a flush
        debug!("Flushing channel");
        if let Err(e) = channel.flush() {
            if e.kind() != std::io::ErrorKind::WouldBlock {
                error!("Failed to flush channel: {}", e);
                // Non-blocking errors are expected and can be ignored
            }
        }

        // Set session to non-blocking mode for I/O
        session.set_blocking(false);
        debug!("SSH session setup completed");

        Ok(Self {
            session,
            channel,
            resize_rx: None,
            shutdown_flag: Arc::new(AtomicBool::new(false)),
            settings: settings.clone(),
            // Store parameters for cloning
            hostname: hostname.to_string(),
            port,
            username: username.to_string(),
            password: password.map(String::from),
            private_key: private_key.map(String::from),
            device_type: device_type_hint,
        })
    }

    /// Sets the channel for receiving terminal resize events
    ///
    /// # Arguments
    /// * `resize_rx` - A receiver for (rows, cols) tuples
    pub fn set_resize_channel(&mut self, resize_rx: mpsc::Receiver<(u32, u32)>) {
        self.resize_rx = Some(resize_rx);
    }

    /// Resizes the PTY to the specified dimensions
    ///
    /// This function resizes the PTY and also sends SIGWINCH signal to the remote
    /// process to ensure that terminal-based applications like 'top' refresh correctly.
    ///
    /// # Arguments
    /// * `rows` - Number of rows in the terminal
    /// * `cols` - Number of columns in the terminal
    ///
    /// # Returns
    /// * `Result<(), SSHError>` - Success or an error
    pub fn resize_pty(&mut self, rows: u32, cols: u32) -> Result<(), SSHError> {
        debug!("Resizing PTY to {}x{}", cols, rows);
        
        // Ensure dimensions are reasonable
        let rows = std::cmp::max(rows, 24); // Minimum 24 rows
        let cols = std::cmp::max(cols, 80); // Minimum 80 columns
        
        // Request PTY size change - this is the only thing we really need to do
        // The SSH server will handle sending SIGWINCH to the processes
        self.channel.request_pty_size(cols, rows, None, None)?;
        
        // We don't need to send any special escape sequences
        // Those were causing disconnection issues with some SSH servers
        // Just let the server handle the resize notification
        
        // A small delay to ensure the resize takes effect
        std::thread::sleep(std::time::Duration::from_millis(10));
        
        Ok(())
    }

    /// Starts the I/O handling between the SSH channel and the WebSocket
    ///
    /// This function runs in a separate thread and handles:
    /// - Reading data from the SSH channel and sending it to the WebSocket
    /// - Reading data from the WebSocket and sending it to the SSH channel
    /// - Processing terminal resize events
    /// - Sending keepalive packets
    ///
    /// # Arguments
    /// * `input_rx` - A receiver for data from the WebSocket
    /// * `output_tx` - A sender for data to the WebSocket
    ///
    /// # Returns
    /// Gets a clone of the shutdown flag for use in other threads
    ///
    /// # Returns
    /// * `Arc<AtomicBool>` - A clone of the shutdown flag
    #[allow(dead_code)]
    pub fn get_shutdown_flag(&self) -> Arc<AtomicBool> {
        self.shutdown_flag.clone()
    }
    
    pub fn start_io(
        mut self,
        mut input_rx: mpsc::Receiver<Bytes>,
        output_tx: mpsc::Sender<Bytes>,
    ) -> Result<(), SSHError> {
        info!("Starting SSH I/O handling");
        
        // Buffer for reading from SSH
        let mut buf = [0u8; 4096];
        let mut last_keepalive = std::time::Instant::now();
        
        // Take ownership of the resize channel if it exists
        let mut resize_rx = self.resize_rx.take();
        
        // Get a clone of the shutdown flag for this thread
        let shutdown_flag = self.shutdown_flag.clone();
        
        loop {
            // Check if the shutdown flag has been set
            if shutdown_flag.load(Ordering::SeqCst) {
                info!("Shutdown flag set, stopping I/O handling");
                break;
            }
            
            // Send keepalive based on settings
            if last_keepalive.elapsed() >= std::time::Duration::from_secs(self.settings.connection.keepalive_seconds) {
                debug!("Sending keepalive");
                if let Err(e) = self.session.keepalive_send() {
                    error!("Failed to send keepalive: {}", e);
                    break;
                }
                last_keepalive = std::time::Instant::now();
            }
            
            // Process any pending resize commands
            if let Some(ref mut rx) = resize_rx {
                while let Ok((rows, cols)) = rx.try_recv() {
                    debug!("Processing resize command: {}x{}", cols, rows);
                    if let Err(e) = self.resize_pty(rows, cols) {
                        error!("Failed to resize PTY: {}", e);
                    }
                }
            }

            // Read from SSH with timeout
            match self.channel.read(&mut buf) {
                Ok(n) => {
                    if n > 0 {
                        debug!("Read {} bytes from SSH", n);
                        // Clean control sequences from the output
                        let cleaned_data = Self::clean_control_sequences(&buf[..n]);
                        if !cleaned_data.is_empty() {
                            let data = Bytes::from(cleaned_data);
                            if output_tx.blocking_send(data).is_err() {
                                error!("Failed to send SSH output to WebSocket");
                                break;
                            }
                            debug!("Sent {} bytes to WebSocket", n);
                        }
                    } else if self.channel.eof() {
                        info!("SSH channel EOF detected");
                        // Set shutdown flag to ensure all tasks terminate cleanly
                        shutdown_flag.store(true, Ordering::SeqCst);
                        
                        // Send a final message to indicate connection closure
                        let closure_message = "\r\n[SSH connection closed]\r\n";
                        let _ = output_tx.blocking_send(Bytes::from(closure_message.as_bytes().to_vec()));
                        
                        break;
                    }
                }
                Err(ref e) if e.kind() == std::io::ErrorKind::WouldBlock => {
                    // No data available, continue to process input
                }
                Err(e) => {
                    error!("SSH read error: {}", e);
                    return Err(SSHError::Connection(e));
                }
            }

            // Process any pending input
            while let Ok(data) = input_rx.try_recv() {
                debug!("Received {} bytes from WebSocket", data.len());
                match self.channel.write_all(&data) {
                    Ok(_) => {
                        if let Err(e) = self.channel.flush() {
                            if e.kind() != std::io::ErrorKind::WouldBlock {
                                error!("Failed to flush SSH channel: {}", e);
                                return Err(SSHError::Connection(e));
                            }
                        }
                        debug!("Wrote {} bytes to SSH", data.len());
                    }
                    Err(e) if e.kind() == std::io::ErrorKind::WouldBlock => {
                        // Would block, try again next iteration
                        break;
                    }
                    Err(e) => {
                        // Check if this is a channel closed error
                        let is_channel_closed = e.kind() == std::io::ErrorKind::BrokenPipe ||
                                               e.kind() == std::io::ErrorKind::ConnectionReset ||
                                               e.to_string().contains("closed");
                            
                        if is_channel_closed {
                            error!("SSH channel closed unexpectedly: {}", e);
                            // Set shutdown flag to true to terminate all tasks
                            shutdown_flag.store(true, Ordering::SeqCst);
                            break;
                        } else {
                            error!("SSH write error: {}", e);
                            return Err(SSHError::Connection(e));
                        }
                    }
                }
            }

            // Small delay to prevent busy-waiting
            std::thread::sleep(std::time::Duration::from_millis(10));
        }

        info!("SSH I/O handling completed");
        Ok(())
    }
    
    /// Processes terminal output to handle ANSI escape sequences properly
    ///
    /// This function preserves all ANSI escape sequences that are needed for proper
    /// terminal display, including cursor visibility, screen clearing, and positioning.
    /// This is critical for commands like 'top' and for proper shell prompt display.
    ///
    /// # Arguments
    /// * `input` - The raw terminal output
    ///
    /// # Returns
    /// * `Vec<u8>` - The processed output
    fn clean_control_sequences(input: &[u8]) -> Vec<u8> {
        // For SSH terminal output, we simply pass through all data unchanged
        // This ensures proper display of banners, prompts, and commands like 'top'
        input.to_vec()
    }
}
