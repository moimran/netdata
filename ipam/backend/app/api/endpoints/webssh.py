from fastapi import APIRouter, WebSocket, HTTPException
from typing import Dict, Optional, Any
from pydantic import BaseModel

from app.utils.webssh_client import (
    create_ssh_session,
    handle_websocket,
    close_session
)

# Create router
router = APIRouter()

# Define request models
class SSHCredentials(BaseModel):
    hostname: str
    port: int = 22
    username: str
    password: Optional[str] = None
    private_key: Optional[str] = None
    device_type: Optional[str] = None

# Define response models
class ConnectResponse(BaseModel):
    success: bool
    message: str
    session_id: Optional[str] = None

@router.post("/connect", response_model=ConnectResponse)
async def connect_ssh(credentials: SSHCredentials):
    """Connect to a device via SSH and return a session ID"""
    result = await create_ssh_session(
        hostname=credentials.hostname,
        port=credentials.port,
        username=credentials.username,
        password=credentials.password,
        private_key=credentials.private_key,
        device_type=credentials.device_type
    )
    
    return result

@router.websocket("/connect/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    """Handle WebSocket connection for an SSH session"""
    await handle_websocket(websocket, session_id)

@router.post("/disconnect/{session_id}", response_model=Dict[str, Any])
async def disconnect_ssh(session_id: str):
    """Disconnect an SSH session"""
    if close_session(session_id):
        return {"success": True, "message": "Disconnected successfully"}
    else:
        raise HTTPException(status_code=404, detail=f"Session {session_id} not found")