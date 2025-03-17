import asyncio
import uuid
from typing import Dict, Optional, Tuple, Any
import logging
from fastapi import WebSocket, WebSocketDisconnect

# Import the Python bindings
try:
    import webssh_rs
    WEBSSH_AVAILABLE = True
except ImportError:
    WEBSSH_AVAILABLE = False
    logging.warning("webssh_rs module not available")

# Session storage
active_sessions: Dict[str, Tuple[Any, asyncio.Task]] = {}

async def create_ssh_session(
    hostname: str,
    port: int,
    username: str,
    password: Optional[str] = None,
    private_key: Optional[str] = None,
    device_type: Optional[str] = None,
) -> Dict[str, Any]:
    """Create a new SSH session and return the session ID"""
    if not WEBSSH_AVAILABLE:
        return {
            "success": False,
            "message": "SSH functionality not available",
            "session_id": None
        }
    
    try:
        # Create SSH session
        ssh_session = webssh_rs.SSHSession(
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

async def handle_websocket(websocket: WebSocket, session_id: str):
    """Handle WebSocket connection for an SSH session"""
    await websocket.accept()
    
    # Get SSH session
    if session_id not in active_sessions:
        await websocket.send_json({
            "type": "error",
            "message": "Session not found"
        })
        await websocket.close(code=1008, reason="Session not found")
        return
    
    ssh_session, existing_task = active_sessions[session_id]
    
    # Cancel existing task if it exists
    if existing_task and not existing_task.done():
        existing_task.cancel()
        try:
            await existing_task
        except asyncio.CancelledError:
            pass
    
    # Create task to receive SSH data
    receive_task = asyncio.create_task(
        receive_ssh_data(ssh_session, websocket, session_id)
    )
    
    # Update session with new task
    active_sessions[session_id] = (ssh_session, receive_task)
    
    try:
        # Handle WebSocket messages
        while True:
            message = await websocket.receive_json()
            
            if message["type"] == "input":
                # Send data to SSH session
                ssh_session.send_data(message["data"].encode())
            elif message["type"] == "resize":
                # Resize terminal
                ssh_session.resize_terminal(message["rows"], message["cols"])
    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await websocket.send_json({
                "type": "error",
                "message": f"Error: {str(e)}"
            })
        except:
            pass
    finally:
        # Cancel receive task
        if not receive_task.done():
            receive_task.cancel()
            try:
                await receive_task
            except asyncio.CancelledError:
                pass

async def receive_ssh_data(
    ssh_session: Any,
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
        raise
    except Exception as e:
        try:
            await websocket.send_json({
                "type": "error",
                "message": f"SSH error: {str(e)}"
            })
        except:
            pass

def close_session(session_id: str) -> bool:
    """Close an SSH session"""
    if session_id in active_sessions:
        ssh_session, task = active_sessions[session_id]
        
        # Cancel task if it exists
        if task and not task.done():
            task.cancel()
        
        # Disconnect SSH session
        try:
            ssh_session.disconnect()
        except Exception:
            pass
        
        # Remove session from storage
        del active_sessions[session_id]
        
        return True
    
    return False