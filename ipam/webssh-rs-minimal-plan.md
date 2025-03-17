# WebSSH-RS Minimal Implementation Plan

## Overview

This document outlines the minimal implementation plan for creating Python bindings for the SSH functionality of webssh-rs using Maturin, while leveraging FastAPI WebSockets for the communication layer.

## Current vs Proposed Architecture

**Current:**
```
Frontend -> Python Backend Proxy -> webssh-rs Server -> SSH -> Network Device
```

**Proposed:**
```
Frontend -> Python Backend with FastAPI -> webssh-rs SSH Module -> SSH -> Network Device
```

## Core Components

1. **Rust SSH Module**
   - Extract SSH functionality from webssh-rs
   - Create Python bindings using PyO3/Maturin

2. **Python FastAPI WebSocket Server**
   - Handle WebSocket connections from frontend
   - Use Python bindings to manage SSH sessions

3. **Frontend Integration**
   - Connect directly to FastAPI WebSocket

## Minimal Implementation Steps

### 1. Create Python Bindings for webssh-rs

```rust
// lib.rs
mod ssh;
mod python;

use pyo3::prelude::*;

#[pymodule]
fn webssh_rs(_py: Python, m: &PyModule) -> PyResult<()> {
    m.add_class::<python::SSHSession>()?;
    m.add("SSHError", _py.get_type::<python::SSHError>())?;
    Ok(())
}
```

```rust
// python.rs
use pyo3::prelude::*;
use pyo3::exceptions::PyException;

#[pyclass]
pub struct SSHSession {
    // Implementation details
}

#[pymethods]
impl SSHSession {
    #[new]
    fn new(hostname: &str, port: u16, username: &str, password: Option<&str>) -> PyResult<Self> {
        // Implementation
    }
    
    fn connect(&mut self) -> PyResult<()> {
        // Implementation
    }
    
    fn disconnect(&mut self) -> PyResult<()> {
        // Implementation
    }
    
    fn send_data(&self, data: &[u8]) -> PyResult<()> {
        // Implementation
    }
    
    fn receive_data(&self, timeout_ms: Option<u64>) -> PyResult<Option<Vec<u8>>> {
        // Implementation
    }
}
```

### 2. Create FastAPI WebSocket Handler

```python
# webssh_client.py
import asyncio
import webssh_rs

async def handle_websocket(websocket, session_id):
    # Get SSH session
    ssh_session = get_ssh_session(session_id)
    
    # Create task to receive SSH data
    receive_task = asyncio.create_task(
        receive_ssh_data(ssh_session, websocket)
    )
    
    try:
        # Handle WebSocket messages
        while True:
            message = await websocket.receive_json()
            
            if message["type"] == "input":
                ssh_session.send_data(message["data"].encode())
            elif message["type"] == "resize":
                ssh_session.resize_terminal(message["rows"], message["cols"])
    finally:
        # Cancel receive task
        receive_task.cancel()
```

### 3. Update Frontend

```javascript
// Connect to WebSocket
const ws = new WebSocket(`ws://localhost:8000/ws/${sessionId}`);

// Send data
ws.send(JSON.stringify({
    type: 'input',
    data: 'ls -la\n'
}));

// Receive data
ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'output') {
        console.log(data.data);
    }
};
```

## Next Steps

1. **Build the Rust Crate**
   ```bash
   cd ipam/webssh-rs
   cargo build
   ```

2. **Build the Python Package**
   ```bash
   cd ipam/webssh-rs
   maturin develop
   ```

3. **Test the Integration**
   ```bash
   cd ipam/webssh-rs/examples
   python fastapi_websocket.py
   ```

## Benefits

1. **Simplified Architecture**: Eliminates the need for a separate WebSocket server
2. **Reduced Latency**: Direct communication between frontend and backend
3. **Improved Maintainability**: Single codebase for WebSocket handling