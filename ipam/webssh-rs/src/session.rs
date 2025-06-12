use crate::ssh::SSHSession;
use std::collections::{HashMap, HashSet};
use std::time::{Duration, Instant};
use tracing::{error, info};
use uuid::Uuid;

/// Represents a session in the registry
pub struct SessionInfo {
    pub portal_user_id: String,
    pub device_id: String,
    pub ssh_username: String,
    pub ssh_session: SSHSession,
    pub last_activity: Instant,
}

/// Session registry that manages all active SSH sessions
pub struct SessionRegistry {
    // Map of session_id -> SessionInfo
    pub(crate) sessions: HashMap<String, SessionInfo>,
    
    // Map of portal_user_id -> Set of session_ids
    portal_user_sessions: HashMap<String, HashSet<String>>,
    
    // Map of device_id -> Set of session_ids
    device_sessions: HashMap<String, HashSet<String>>,
    
    // Map of (portal_user_id, device_id, ssh_username) -> session_id
    composite_key_sessions: HashMap<(String, String, String), String>,
}

impl SessionRegistry {
    /// Creates a new empty session registry
    pub fn new() -> Self {
        Self {
            sessions: HashMap::new(),
            portal_user_sessions: HashMap::new(),
            device_sessions: HashMap::new(),
            composite_key_sessions: HashMap::new(),
        }
    }
    
    /// Adds a new session to the registry
    pub fn add_session(
        &mut self,
        portal_user_id: &str,
        device_id: &str,
        ssh_username: &str,
        ssh_session: SSHSession,
    ) -> String {
        // Generate a unique session ID
        let session_id = format!(
            "portal-{}-device-{}-ssh-{}-{}",
            portal_user_id,
            device_id,
            ssh_username,
            Uuid::new_v4()
        );
        
        // Create session info
        let session_info = SessionInfo {
            portal_user_id: portal_user_id.to_string(),
            device_id: device_id.to_string(),
            ssh_username: ssh_username.to_string(),
            ssh_session,
            last_activity: Instant::now(),
        };
        
        // Add to sessions map
        self.sessions.insert(session_id.clone(), session_info);
        
        // Add to portal user sessions map
        self.portal_user_sessions
            .entry(portal_user_id.to_string())
            .or_default()
            .insert(session_id.clone());
        
        // Add to device sessions map
        self.device_sessions
            .entry(device_id.to_string())
            .or_default()
            .insert(session_id.clone());
        
        // Add to composite key map
        let composite_key = (
            portal_user_id.to_string(),
            device_id.to_string(),
            ssh_username.to_string(),
        );
        self.composite_key_sessions.insert(composite_key, session_id.clone());
        
        info!("Added new session {} for portal user {}, device {}, SSH user {}", 
              session_id, portal_user_id, device_id, ssh_username);
        
        session_id
    }
    
    /// Gets a list of all session IDs in the registry
    pub fn get_all_sessions(&self) -> Vec<String> {
        self.sessions.keys().cloned().collect()
    }
    
    /// Gets a session by ID
    pub fn get_session(&mut self, session_id: &str) -> Option<&mut SessionInfo> {
        if let Some(session_info) = self.sessions.get_mut(session_id) {
            // Update last activity timestamp
            session_info.last_activity = Instant::now();
            Some(session_info)
        } else {
            None
        }
    }
    
    /// Gets a session by composite key (portal_user_id, device_id, ssh_username)
    #[allow(dead_code)]
    pub fn get_session_by_composite_key(
        &mut self,
        portal_user_id: &str,
        device_id: &str,
        ssh_username: &str,
    ) -> Option<(String, &mut SessionInfo)> {
        let composite_key = (
            portal_user_id.to_string(),
            device_id.to_string(),
            ssh_username.to_string(),
        );
        
        if let Some(session_id) = self.composite_key_sessions.get(&composite_key) {
            if let Some(session_info) = self.sessions.get_mut(session_id) {
                // Update last activity timestamp
                session_info.last_activity = Instant::now();
                return Some((session_id.clone(), session_info));
            }
        }
        
        None
    }
    
    /// Gets all sessions for a portal user
    pub fn get_portal_user_sessions(&self, portal_user_id: &str) -> Vec<String> {
        if let Some(session_ids) = self.portal_user_sessions.get(portal_user_id) {
            session_ids.iter().cloned().collect()
        } else {
            Vec::new()
        }
    }
    
    /// Gets all sessions for a device
    #[allow(dead_code)]
    pub fn get_device_sessions(&self, device_id: &str) -> Vec<String> {
        if let Some(session_ids) = self.device_sessions.get(device_id) {
            session_ids.iter().cloned().collect()
        } else {
            Vec::new()
        }
    }
    
    /// Removes a session from the registry and closes the SSH connection
    pub fn remove_session(&mut self, session_id: &str) -> bool {
        if let Some(mut session_info) = self.sessions.remove(session_id) {
            // Close the SSH session first
            info!("Closing SSH connection for session {}", session_id);
            match session_info.ssh_session.close() {
                Ok(_) => info!("Successfully closed SSH connection for session {}", session_id),
                Err(e) => error!("Error closing SSH connection for session {}: {}", session_id, e),
            }
            
            // Remove from portal user sessions map
            if let Some(user_sessions) = self.portal_user_sessions.get_mut(&session_info.portal_user_id) {
                user_sessions.remove(session_id);
                if user_sessions.is_empty() {
                    self.portal_user_sessions.remove(&session_info.portal_user_id);
                }
            }
            
            // Remove from device sessions map
            if let Some(device_sessions) = self.device_sessions.get_mut(&session_info.device_id) {
                device_sessions.remove(session_id);
                if device_sessions.is_empty() {
                    self.device_sessions.remove(&session_info.device_id);
                }
            }
            
            // Remove from composite key map
            let composite_key = (
                session_info.portal_user_id,
                session_info.device_id,
                session_info.ssh_username,
            );
            self.composite_key_sessions.remove(&composite_key);
            
            info!("Removed session {} from registry", session_id);
            true
        } else {
            info!("Session {} not found in registry", session_id);
            false
        }
    }
    
    /// Cleans up stale sessions
    pub fn cleanup_stale_sessions(&mut self, max_idle_time: Duration) -> usize {
        let now = Instant::now();
        let stale_session_ids: Vec<String> = self.sessions
            .iter()
            .filter(|(_, session_info)| now.duration_since(session_info.last_activity) > max_idle_time)
            .map(|(session_id, _)| session_id.clone())
            .collect();
        
        let count = stale_session_ids.len();
        for session_id in stale_session_ids {
            self.remove_session(&session_id);
        }
        
        if count > 0 {
            info!("Cleaned up {} stale sessions", count);
        }
        
        count
    }
    
    /// Gets the total number of active sessions
    pub fn total_sessions(&self) -> usize {
        self.sessions.len()
    }
    
    /// Gets the number of portal users with active sessions
    pub fn total_portal_users(&self) -> usize {
        self.portal_user_sessions.len()
    }
    
    /// Gets the number of devices with active sessions
    pub fn total_devices(&self) -> usize {
        self.device_sessions.len()
    }
    
    /// Gets all portal user IDs
    pub fn get_all_portal_user_ids(&self) -> Vec<String> {
        self.portal_user_sessions.keys().cloned().collect()
    }
}