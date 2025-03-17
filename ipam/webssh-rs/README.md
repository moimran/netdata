# WebSSH-RS

Python bindings for SSH functionality, built with Rust and PyO3.

## Overview

WebSSH-RS provides high-performance SSH client functionality for Python applications through Rust bindings. It leverages the security and performance of Rust's SSH2 implementation while providing a Pythonic API.

## Features

- Secure SSH connections with password or key-based authentication
- Terminal session management
- Data streaming with efficient buffer handling
- Terminal resizing support
- Timeout controls for operations
- Thread-safe implementation
- Python exception mapping

## Installation

### From PyPI

```bash
pip install webssh-rs
```

### From Source

```bash
# Clone the repository
git clone https://github.com/example/webssh-rs
cd webssh-rs

# Install development dependencies
pip install maturin

# Build and install
maturin develop
```

## Usage

### Basic Connection

```python
import webssh_rs

# Create an SSH session
session = webssh_rs.SSHSession(
    hostname="192.168.1.1",
    port=22,
    username="admin",
    password="password123"
)

# Connect to the server
session.connect()

# Send data
session.send_data("ls -la\n")

# Receive data with timeout
while True:
    data = session.receive_data(timeout_ms=1000)
    if not data:
        break
    print(data.decode(), end="")

# Disconnect
session.disconnect()
```

### Using with FastAPI WebSockets

```python
from fastapi import FastAPI, WebSocket
import webssh_rs
import asyncio

app = FastAPI()

@app.websocket("/ssh/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    await websocket.accept()
    
    # Get or create SSH session
    ssh_session = get_ssh_session(session_id)
    
    # Set up background task for receiving SSH data
    receive_task = asyncio.create_task(receive_ssh_data(ssh_session, websocket))
    
    try:
        # Handle WebSocket messages
        while True:
            data = await websocket.receive_json()
            
            if data["type"] == "input":
                ssh_session.send_data(data["data"].encode())
            elif data["type"] == "resize":
                ssh_session.resize_terminal(data["rows"], data["cols"])
    except Exception:
        # Clean up on disconnect
        receive_task.cancel()
        ssh_session.disconnect()

async def receive_ssh_data(ssh_session, websocket):
    while True:
        data = ssh_session.receive_data(timeout_ms=100)
        if data:
            await websocket.send_json({
                "type": "output",
                "data": data.decode()
            })
        await asyncio.sleep(0.01)
```

## API Reference

### SSHSession

```python
class SSHSession:
    def __init__(self, hostname, port, username, password=None, private_key=None, device_type=None):
        """Initialize SSH session with connection parameters"""
        
    def connect(self):
        """Establish SSH connection"""
        
    def disconnect(self):
        """Close SSH connection"""
        
    def send_data(self, data):
        """Send data to SSH session"""
        
    def receive_data(self, timeout_ms=None):
        """Receive data from SSH session"""
        
    def resize_terminal(self, rows, cols):
        """Resize terminal dimensions"""
        
    def get_info(self):
        """Get session information"""
        
    def is_connected(self):
        """Check if the session is connected"""
```

## Error Handling

WebSSH-RS maps Rust errors to Python exceptions:

- `SSHError`: Base exception for all SSH-related errors
- `ConnectionError`: Raised when connection fails
- `TimeoutError`: Raised when an operation times out
- `ValueError`: Raised for invalid parameters

Example:

```python
try:
    session = webssh_rs.SSHSession(hostname="192.168.1.1", port=22, username="admin")
    session.connect()
except ConnectionError as e:
    print(f"Failed to connect: {e}")
except Exception as e:
    print(f"Error: {e}")
```

## Performance Considerations

- The library uses a thread pool to handle SSH operations without blocking the Python GIL
- For high-throughput applications, consider adjusting buffer sizes and timeout values
- When used with asyncio, ensure proper task management to avoid resource leaks

## License

MIT License
