#!/usr/bin/env python3
"""
FastAPI WebSocket example for webssh-rs.

This script demonstrates how to use webssh-rs with FastAPI WebSockets.
"""

import asyncio
import json
import logging
import uuid
from typing import Dict, Optional, Any, List, Tuple

import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

import webssh_rs

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(title="WebSSH-RS FastAPI Example")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Session storage
active_sessions: Dict[str, Tuple[webssh_rs.SSHSession, asyncio.Task]] = {}
portal_user_sessions: Dict[str, List[str]] = {}

# Define request models
class SSHCredentials(BaseModel):
    hostname: str
    port: int = 22
    username: str
    password: Optional[str] = None
    private_key: Optional[str] = None
    device_type: Optional[str] = None
    auth_type: Optional[str] = "password"
    portal_user_id: Optional[str] = "anonymous"

class SessionStatusRequest(BaseModel):
    portal_user_id: Optional[str] = None

# Define response models
class ConnectResponse(BaseModel):
    success: bool
    message: str
    session_id: Optional[str] = None
    error_code: Optional[str] = None

class SessionInfo(BaseModel):
    session_id: str
    hostname: str
    port: int
    username: str
    connected: bool
    device_type: Optional[str] = None

class SessionStatusResponse(BaseModel):
    active_sessions: int
    sessions: List[SessionInfo]

@app.post("/connect", response_model=ConnectResponse)
async def connect_ssh(credentials: SSHCredentials):
    """Connect to a device via SSH and return a session ID."""
    logger.info(f"SSH connection request to {credentials.hostname}:{credentials.port} as {credentials.username}")
    
    try:
        # Create SSH session
        ssh_session = webssh_rs.SSHSession(
            hostname=credentials.hostname,
            port=credentials.port,
            username=credentials.username,
            password=credentials.password if credentials.auth_type != "private-key" else None,
            private_key=credentials.private_key if credentials.auth_type == "private-key" else None,
            device_type=credentials.device_type,
        )
        
        # Connect to SSH server
        await ssh_session.async_connect()
        
        # Generate session ID
        session_id = str(uuid.uuid4())
        
        # Store session without a task for now
        active_sessions[session_id] = (ssh_session, None)
        
        # Associate session with portal user
        if credentials.portal_user_id not in portal_user_sessions:
            portal_user_sessions[credentials.portal_user_id] = []
        portal_user_sessions[credentials.portal_user_id].append(session_id)
        
        logger.info(f"Created SSH session {session_id} for user {credentials.portal_user_id} to {credentials.hostname}")
        
        return {
            "success": True,
            "message": "Connected successfully",
            "session_id": session_id
        }
    except Exception as e:
        logger.error(f"Failed to create SSH session: {str(e)}")
        
        # Determine error code based on error message
        error_code = "UNKNOWN_ERROR"
        error_msg = str(e).lower()
        
        if "authentication" in error_msg:
            error_code = "AUTH_FAILED"
        elif "connection" in error_msg or "connect" in error_msg:
            error_code = "CONNECTION_FAILED"
        
        return {
            "success": False,
            "message": f"Failed to connect: {str(e)}",
            "session_id": None,
            "error_code": error_code
        }

@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    """Handle WebSocket connection for an SSH session."""
    logger.info(f"WebSocket connection request for session {session_id}")
    
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
                await ssh_session.async_send_data(message["data"].encode())
            elif message["type"] == "resize":
                # Resize terminal
                await ssh_session.async_resize_terminal(message["rows"], message["cols"])
            else:
                logger.warning(f"Unknown message type: {message['type']}")
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for session {session_id}")
    except Exception as e:
        logger.error(f"WebSocket error for session {session_id}: {str(e)}")
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
        
        # Don't close the SSH session here, as it might be used by other connections
        logger.info(f"WebSocket handler completed for session {session_id}")

async def receive_ssh_data(
    ssh_session: webssh_rs.SSHSession,
    websocket: WebSocket,
    session_id: str
):
    """Receive data from SSH session and send to WebSocket."""
    try:
        while True:
            # Receive data with a timeout
            data = await ssh_session.async_receive_data(timeout_ms=100)
            
            if data:
                # Send data to WebSocket
                await websocket.send_json({
                    "type": "output",
                    "data": data.decode(errors="replace")
                })
            
            # Small sleep to prevent CPU hogging
            await asyncio.sleep(0.01)
    except asyncio.CancelledError:
        # Task was cancelled, clean up
        logger.debug(f"SSH receive task cancelled for session {session_id}")
        raise
    except Exception as e:
        # Handle other exceptions
        logger.error(f"SSH receive error for session {session_id}: {str(e)}")
        try:
            await websocket.send_json({
                "type": "error",
                "message": f"SSH error: {str(e)}"
            })
        except:
            pass

@app.post("/disconnect/{session_id}")
async def disconnect_ssh(session_id: str):
    """Disconnect an SSH session."""
    logger.info(f"Disconnect request for session {session_id}")
    
    if session_id in active_sessions:
        ssh_session, task = active_sessions[session_id]
        
        # Cancel task if it exists
        if task and not task.done():
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass
        
        # Disconnect SSH session
        try:
            await ssh_session.async_disconnect()
        except Exception as e:
            logger.error(f"Error disconnecting session {session_id}: {str(e)}")
        
        # Remove session from storage
        del active_sessions[session_id]
        
        # Remove session from portal user sessions
        for user_id, sessions in portal_user_sessions.items():
            if session_id in sessions:
                sessions.remove(session_id)
                if not sessions:
                    del portal_user_sessions[user_id]
                break
        
        logger.info(f"Closed SSH session {session_id}")
        return {"success": True, "message": "Disconnected successfully"}
    else:
        raise HTTPException(status_code=404, detail=f"Session {session_id} not found")

@app.post("/sessions", response_model=SessionStatusResponse)
async def session_status(request: SessionStatusRequest):
    """Get status of active sessions."""
    logger.info(f"Session status request for portal user {request.portal_user_id or 'all'}")
    
    sessions_info = []
    
    if request.portal_user_id:
        # Get sessions for a specific portal user
        session_ids = portal_user_sessions.get(request.portal_user_id, [])
        
        for session_id in session_ids:
            if session_id in active_sessions:
                ssh_session, _ = active_sessions[session_id]
                info = ssh_session.get_info()
                info["session_id"] = session_id
                sessions_info.append(info)
    else:
        # Get all sessions
        for session_id, (ssh_session, _) in active_sessions.items():
            info = ssh_session.get_info()
            info["session_id"] = session_id
            sessions_info.append(info)
    
    return {
        "active_sessions": len(sessions_info),
        "sessions": sessions_info
    }

@app.post("/cleanup")
async def cleanup_sessions(max_age_seconds: int = 3600):
    """Clean up stale sessions."""
    logger.info(f"Cleanup request for sessions older than {max_age_seconds} seconds")
    
    # In a real implementation, we would track session age
    # For now, we'll just log that this was called
    return {
        "success": True,
        "message": "Cleanup not implemented in this example",
        "count": 0
    }

@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "name": "WebSSH-RS FastAPI Example",
        "version": webssh_rs.__version__,
        "endpoints": [
            "/connect",
            "/ws/{session_id}",
            "/disconnect/{session_id}",
            "/sessions",
            "/cleanup",
        ],
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)