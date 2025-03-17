# NetSSH-RS Implementation Details

This document provides detailed implementation guidance for creating Python bindings for the SSH functionality of webssh-rs.

## Project Structure

```
ipam/netssh-rs/
├── Cargo.toml             # Rust dependencies and crate configuration
├── pyproject.toml         # Python package configuration for Maturin
├── setup.py               # Python setup script
└── src/
    ├── lib.rs             # Main library entry point
    ├── python.rs          # Python bindings definitions
    ├── ssh/               # SSH functionality extracted from webssh-rs
    │   ├── mod.rs         # Module definitions
    │   ├── session.rs     # SSH session management
    │   ├── channel.rs     # SSH channel operations
    │   └── error.rs       # Error handling
    └── device_connection.rs # Device-specific connection logic
```

## Key Files Implementation

### 1. Cargo.toml

```toml
[package]
name = "netssh-rs"
version = "0.1.0"
edition = "2021"
authors = ["IPAM Team"]
description = "Python bindings for SSH functionality"

[lib]
name = "netssh_rs"
crate-type = ["cdylib"]

[dependencies]
ssh2 = { version = "0.9.4", features = ["vendored-openssl"] }
tokio = { version = "1.35", features = ["full"] }
bytes = "1.5"
thiserror = "1.0"
tracing = "0.1"
uuid = { version = "1.6.1", features = ["v4"] }

[dependencies.pyo3]
version = "0.20.0"
features = ["extension-module"]
```

### 2. pyproject.toml

```toml
[build-system]
requires = ["maturin>=1.0,<2.0"]
build-backend = "maturin"

[project]
name = "netssh_rs"
version = "0.1.0"
description = "Python bindings for SSH functionality"
authors = [
    {name = "IPAM Team", email = "example@example.com"}
]
requires-python = ">=3.8"
classifiers = [
    "Programming Language :: Python :: 3",
    "Programming Language :: Rust",
    "Topic :: Software Development :: Libraries",
    "Topic :: System :: Networking"
]

[tool.maturin]
python-source = "python"
features = ["pyo3/extension-module"]
```

### 3. setup.py

```python
from setuptools import setup

setup(
    name="netssh_rs",
    version="0.1.0",
    description="Python bindings for SSH functionality",
    author="IPAM Team",
    author_email="example@example.com",
    python_requires=">=3.8",
    classifiers=[
        "Programming Language :: Python :: 3",
        "Programming Language :: Rust",
        "Topic :: Software Development :: Libraries",
        "Topic :: System :: Networking"
    ],
)
```

### 4. src/lib.rs

```rust
mod ssh;
mod python;

use pyo3::prelude::*;

/// Initialize the Python module
#[pymodule]
fn netssh_rs(_py: Python, m: &PyModule) -> PyResult<()> {
    // Register the SSHSession class
    m.add_class::<python::SSHSession>()?;
    
    // Register any exceptions
    m.add("SSHError", _py.get_type::<python::SSHError>())?;
    
    Ok(())
}
```

### 5. src/python.rs

```rust
use pyo3::prelude::*;
use pyo3::exceptions::PyException;
use pyo3::types::PyBytes;
use std::sync::Arc;
use tokio::sync::mpsc;
use bytes::Bytes;

use crate::ssh::{SSHSession as RustSSHSession, SSHError as RustSSHError};

/// Custom SSH error type for Python
#[pyclass(extends=PyException)]
pub struct SSHError {}

#[pymethods]
impl SSHError {
    #[new]
    fn new(message: &str) -> (Self, PyException) {
        let error = SSHError {};
        let base = PyException::new_err(message.to_string());
        (error, base)
    }
}

/// Python wrapper for Rust SSH session
#[pyclass]
pub struct SSHSession {
    session: Option<Arc<RustSSHSession>>,
    input_tx: Option<mpsc::Sender<Bytes>>,
    output_rx: Option<mpsc::Receiver<Bytes>>,
}

#[pymethods]
impl SSHSession {
    /// Create a new SSH session
    #[new]
    fn new(
        hostname: &str,
        port: u16,
        username: &str,
        password: Option<&str>,
        private_key: Option<&str>,
        device_type: Option<&str>,
    ) -> PyResult<Self> {
        Ok(SSHSession {
            session: None,
            input_tx: None,
            output_rx: None,
        })
    }
    
    /// Connect to the SSH server
    fn connect(&mut self, py: Python) -> PyResult<()> {
        // Implementation will go here
        Ok(())
    }
    
    /// Disconnect from the SSH server
    fn disconnect(&mut self, py: Python) -> PyResult<()> {
        // Implementation will go here
        Ok(())
    }
    
    /// Send data to the SSH session
    fn send_data(&self, py: Python, data: &[u8]) -> PyResult<()> {
        // Implementation will go here
        Ok(())
    }
    
    /// Receive data from the SSH session
    fn receive_data(&self, py: Python, timeout_ms: Option<u64>) -> PyResult<Option<PyObject>> {
        // Implementation will go here
        Ok(None)
    }
    
    /// Resize the terminal
    fn resize_terminal(&self, py: Python, rows: u32, cols: u32) -> PyResult<()> {
        // Implementation will go here
        Ok(())
    }
}
```

### 6. src/ssh/mod.rs

```rust
pub mod session;
pub mod channel;
pub mod error;

pub use session::SSHSession;
pub use error::SSHError;
```

### 7. src/ssh/error.rs

```rust
use thiserror::Error;

#[derive(Error, Debug)]
pub enum SSHError {
    #[error("SSH connection error: {0}")]
    ConnectionError(String),
    
    #[error("SSH authentication error: {0}")]
    AuthenticationError(String),
    
    #[error("SSH channel error: {0}")]
    ChannelError(String),
    
    #[error("SSH I/O error: {0}")]
    IOError(String),
    
    #[error("SSH session error: {0}")]
    SessionError(String),
}

impl From<ssh2::Error> for SSHError {
    fn from(error: ssh2::Error) -> Self {
        match error.code() {
            ssh2::ErrorCode::Session => SSHError::SessionError(error.to_string()),
            ssh2::ErrorCode::Authentication => SSHError::AuthenticationError(error.to_string()),
            _ => SSHError::ConnectionError(error.to_string()),
        }
    }
}

impl From<std::io::Error> for SSHError {
    fn from(error: std::io::Error) -> Self {
        SSHError::IOError(error.to_string())
    }
}
```

### 8. src/ssh/session.rs

```rust
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tokio::sync::mpsc;
use bytes::Bytes;
use ssh2::Session as SSH2Session;
use std::net::TcpStream;

use super::error::SSHError;
use super::channel::SSHChannel;

pub struct SSHSession {
    hostname: String,
    port: u16,
    username: String,
    password: Option<String>,
    private_key: Option<String>,
    device_type: Option<String>,
    session: Option<Arc<Mutex<SSH2Session>>>,
    channel: Option<Arc<Mutex<SSHChannel>>>,
}

impl SSHSession {
    pub fn new(
        hostname: &str,
        port: u16,
        username: &str,
        password: Option<&str>,
        private_key: Option<&str>,
        device_type: Option<&str>,
    ) -> Result<Self, SSHError> {
        Ok(SSHSession {
            hostname: hostname.to_string(),
            port,
            username: username.to_string(),
            password: password.map(|s| s.to_string()),
            private_key: private_key.map(|s| s.to_string()),
            device_type: device_type.map(|s| s.to_string()),
            session: None,
            channel: None,
        })
    }
    
    pub fn connect(&mut self) -> Result<(), SSHError> {
        // Implementation will go here
        Ok(())
    }
    
    pub fn disconnect(&mut self) -> Result<(), SSHError> {
        // Implementation will go here
        Ok(())
    }
    
    pub fn start_io(
        &mut self,
        input_rx: mpsc::Receiver<Bytes>,
        output_tx: mpsc::Sender<Bytes>,
    ) -> Result<(), SSHError> {
        // Implementation will go here
        Ok(())
    }
    
    pub fn resize_terminal(&self, rows: u32, cols: u32) -> Result<(), SSHError> {
        // Implementation will go here
        Ok(())
    }
}
```

### 9. src/ssh/channel.rs

```rust
use std::sync::{Arc, Mutex};
use ssh2::{Channel, Session};
use super::error::SSHError;

pub struct SSHChannel {
    channel: Channel,
}

impl SSHChannel {
    pub fn new(session: &Session) -> Result<Self, SSHError> {
        // Implementation will go here
        unimplemented!()
    }
    
    pub fn read(&mut self, buffer: &mut [u8]) -> Result<usize, SSHError> {
        // Implementation will go here
        unimplemented!()
    }
    
    pub fn write(&mut self, data: &[u8]) -> Result<usize, SSHError> {
        // Implementation will go here
        unimplemented!()
    }
    
    pub fn resize(&mut self, rows: u32, cols: u32) -> Result<(), SSHError> {
        // Implementation will go here
        unimplemented!()
    }
}
```

### 10. src/device_connection.rs

```rust
use crate::ssh::{SSHSession, SSHError};

pub struct DeviceConnection {
    session: SSHSession,
    device_type: String,
}

impl DeviceConnection {
    pub fn new(
        hostname: &str,
        port: u16,
        username: &str,
        password: Option<&str>,
        private_key: Option<&str>,
        device_type: &str,
    ) -> Result<Self, SSHError> {
        let session = SSHSession::new(hostname, port, username, password, private_key, Some(device_type))?;
        
        Ok(DeviceConnection {
            session,
            device_type: device_type.to_string(),
        })
    }
    
    pub fn connect(&mut self) -> Result<(), SSHError> {
        self.session.connect()
    }
    
    pub fn disconnect(&mut self) -> Result<(), SSHError> {
        self.session.disconnect()
    }
    
    // Device-specific methods can be added here
}
```

## Python FastAPI Integration

Create a new file in the Python backend to integrate the netssh-rs bindings with FastAPI:

### ipam/backend/app/utils/webssh_client.py

```python
import asyncio
import uuid
from typing import Dict, Optional, Tuple, Any
import netssh_rs
from fastapi import WebSocket, WebSocketDisconnect

# Session storage
active_sessions: Dict[str, Tuple[netssh_rs.SSHSession, asyncio.Task]] = {}

async def create_ssh_session(
    hostname: str,
    port: int,
    username: str,
    password: Optional[str] = None,
    private_key: Optional[str] = None,
    device_type: Optional[str] = None
) -> str:
    """Create a new SSH session and return the session ID"""
    # Create SSH session
    ssh_session = netssh_rs.SSHSession(
        hostname=hostname,
        port=port,
        username=username,
        password=password,
        private_key=private_key,
        device_type=device_type
    )
    
    # Connect to SSH server
    ssh_session.connect()
    
    # Generate session ID
    session_id = str(uuid.uuid4())
    
    # Store session without a task for now
    active_sessions[session_id] = (ssh_session, None)
    
    return session_id

async def handle_websocket(websocket: WebSocket, session_id: str):
    """Handle WebSocket connection for an SSH session"""
    # Accept WebSocket connection
    await websocket.accept()
    
    # Get SSH session
    if session_id not in active_sessions:
        await websocket.close(code=1008, reason="Session not found")
        return
    
    ssh_session, existing_task = active_sessions[session_id]
    
    # Cancel existing task if it exists
    if existing_task and not existing_task.done():
        existing_task.cancel()
    
    # Create task to receive SSH data
    receive_task = asyncio.create_task(
        receive_ssh_data(ssh_session, websocket, session_id)
    )
    
    # Update session with new task
    active_sessions[session_id] = (ssh_session, receive_task)
    
    try:
        # Handle WebSocket messages
        while True:
            data = await websocket.receive_json()
            
            if data["type"] == "input":
                ssh_session.send_data(data["data"].encode())
            elif data["type"] == "resize":
                ssh_session.resize_terminal(data["rows"], data["cols"])
    except WebSocketDisconnect:
        # Clean up on disconnect
        if not receive_task.done():
            receive_task.cancel()
    except Exception as e:
        # Handle other exceptions
        print(f"WebSocket error: {e}")
    finally:
        # Don't close the SSH session here, as it might be used by other connections
        pass

async def receive_ssh_data(
    ssh_session: netssh_rs.SSHSession,
    websocket: WebSocket,
    session_id: str
):
    """Receive data from SSH session and send to WebSocket"""
    try:
        while True:
            # Receive data with a timeout
            data = ssh_session.receive_data(timeout_ms=100)
            
            if data:
                # Send data to WebSocket
                await websocket.send_json({
                    "type": "output",
                    "data": data.decode()
                })
            
            # Small sleep to prevent CPU hogging
            await asyncio.sleep(0.01)
    except asyncio.CancelledError:
        # Task was cancelled, clean up
        pass
    except Exception as e:
        # Handle other exceptions
        print(f"SSH receive error: {e}")

def close_session(session_id: str):
    """Close an SSH session"""
    if session_id in active_sessions:
        ssh_session, task = active_sessions[session_id]
        
        # Cancel task if it exists
        if task and not task.done():
            task.cancel()
        
        # Disconnect SSH session
        ssh_session.disconnect()
        
        # Remove session from storage
        del active_sessions[session_id]
        
        return True
    
    return False

def cleanup_stale_sessions(max_age_seconds: int = 3600):
    """Clean up stale sessions"""
    # Implementation will depend on how we track session age
    pass
```

### Update ipam/backend/app/api/endpoints/device.py

Add new endpoints to handle WebSocket connections:

```python
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException
from app.utils.webssh_client import create_ssh_session, handle_websocket, close_session

router = APIRouter()

@router.post("/webssh/connect")
async def connect_ssh(credentials: dict):
    """Connect to a device via SSH and return a session ID"""
    try:
        session_id = await create_ssh_session(
            hostname=credentials["hostname"],
            port=credentials.get("port", 22),
            username=credentials["username"],
            password=credentials.get("password"),
            private_key=credentials.get("private_key"),
            device_type=credentials.get("device_type")
        )
        
        return {
            "success": True,
            "message": "Connected successfully",
            "session_id": session_id
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Failed to connect: {str(e)}",
            "session_id": None
        }

@router.websocket("/webssh/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    """Handle WebSocket connection for an SSH session"""
    await handle_websocket(websocket, session_id)

@router.post("/webssh/disconnect/{session_id}")
async def disconnect_ssh(session_id: str):
    """Disconnect an SSH session"""
    if close_session(session_id):
        return {"success": True, "message": "Disconnected successfully"}
    else:
        raise HTTPException(status_code=404, detail="Session not found")
```

## Frontend Updates

Update the SSHTerminal component to connect directly to the FastAPI WebSocket:

```typescript
// In SSHTerminal.tsx, update the WebSocket connection logic

// Use the backend proxy WebSocket endpoint
const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/api/v1/devices/webssh/ws/${sessionId}`;

console.log("Connecting to WebSocket URL:", wsUrl);

if (terminal) {
  terminal.writeln(`\r\n\x1b[90m> Connecting to WebSocket: ${wsUrl}\x1b[0m`);
}

const ws = new WebSocket(wsUrl);
```

## Testing Plan

1. Unit tests for Python bindings
2. Integration tests for SSH connections
3. End-to-end tests for WebSocket communication
4. Performance tests to compare with current implementation

## Deployment Plan

1. Build and package the netssh-rs Python bindings
2. Install the package in the Python backend environment
3. Update the backend code to use the new bindings
4. Deploy the updated backend
5. Monitor for any issues
6. Gradually migrate users to the new implementation