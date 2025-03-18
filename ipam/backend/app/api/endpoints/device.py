from typing import Dict, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from pydantic import BaseModel

from app.database import get_session
from app.models.device import Device
from app.models.credential import Credential
from app.models.ip_address import IPAddress
from app.utils.shared_state import active_sessions, WEBSSH_MODULE_AVAILABLE, webssh_rs, receive_ssh_data

router = APIRouter()

class ConnectionDetails(BaseModel):
    """Response model for device connection details"""
    device_id: int
    device_name: str
    ip_address: str
    username: str
    password: str
    enable_password: Optional[str] = None

@router.get("/devices/{device_id}/connection-details", response_model=ConnectionDetails)
def get_device_connection_details(device_id: int, session: Session = Depends(get_session)):
    """
    Get connection details for a device including IP address and credentials.
    This endpoint is used for establishing SSH connections to devices.
    """
    # Get the device
    device = session.get(Device, device_id)
    if not device:
        raise HTTPException(status_code=404, detail=f"Device with ID {device_id} not found")
    
    # Get the IP address
    if not device.ip_address_id:
        raise HTTPException(status_code=400, detail=f"Device {device.name} has no IP address assigned")
    
    ip_address = session.get(IPAddress, device.ip_address_id)
    if not ip_address:
        raise HTTPException(status_code=404, detail=f"IP address with ID {device.ip_address_id} not found")
    
    # Extract just the IP address part without the subnet mask
    ip_only = str(ip_address.address).split('/')[0]
    
    # Get the credential
    credential = None
    if device.credential_name:
        credential = session.exec(
            select(Credential).where(Credential.name == device.credential_name)
        ).first()
    
    # If no credential found, try fallback
    if not credential and device.fallback_credential_name:
        credential = session.exec(
            select(Credential).where(Credential.name == device.fallback_credential_name)
        ).first()
    
    # If still no credential, check for a default credential
    if not credential:
        credential = session.exec(
            select(Credential).where(Credential.is_default == True)
        ).first()
    
    if not credential:
        raise HTTPException(status_code=400, detail=f"No credentials found for device {device.name}")
    
    # Return the connection details
    return ConnectionDetails(
        device_id=device.id,
        device_name=device.name,
        ip_address=ip_only,
        username=credential.username,
        password=credential.password,
        enable_password=credential.enable_password
    )

# Terminal server endpoints
@router.post("/devices/terminal/start")
def start_terminal_server():
    """
    Start the terminal server if it's not already running.
    This server handles SSH connections to network devices.
    """
    from app.utils.webssh_server import start_server
    return start_server()

@router.get("/devices/terminal/status")
def get_terminal_server_status():
    """
    Get the status of the terminal server.
    """
    from app.utils.webssh_server import get_server_status
    return get_server_status()

@router.post("/devices/terminal/stop")
def stop_terminal_server():
    """
    Stop the terminal server if it's running.
    """
    from app.utils.webssh_server import stop_server
    return stop_server()

class TerminalConnectRequest(BaseModel):
    """Request model for terminal connection to a device"""
    hostname: str
    port: int = 22
    username: str
    password: str
    device_type: Optional[str] = None

@router.post("/devices/terminal/connect")
def connect_to_device_terminal(request: TerminalConnectRequest):
    """
    Proxy endpoint to connect to a device terminal.
    This establishes an SSH connection to the device and returns a session ID
    that can be used to connect to the terminal via WebSocket.
    """
    import logging
    from pathlib import Path
    
    logger = logging.getLogger(__name__)
    
    return _handle_terminal_connection(request, logger)

# Legacy WebSSH endpoints for backward compatibility
@router.post("/devices/webssh/start")
def start_webssh_server_legacy():
    """Legacy endpoint for backward compatibility"""
    return start_terminal_server()

@router.get("/devices/webssh/status")
def get_webssh_server_status_legacy():
    """Legacy endpoint for backward compatibility"""
    return get_terminal_server_status()

@router.post("/devices/webssh/stop")
def stop_webssh_server_legacy():
    """Legacy endpoint for backward compatibility"""
    return stop_terminal_server()

@router.post("/devices/webssh/connect")
def connect_to_webssh_legacy(request: TerminalConnectRequest):
    """Legacy endpoint for backward compatibility"""
    import requests
    import logging
    import subprocess
    import json
    import uuid
    from pathlib import Path
    
    logger = logging.getLogger(__name__)
    
    return _handle_terminal_connection(request, logger)

# Helper function for terminal connection handling
def _handle_terminal_connection(request, logger):
    import uuid
    try:
        logger.debug(f"Connecting to terminal server with hostname: {request.hostname}, port: {request.port}, username: {request.username}")
        
        if not request.hostname or not request.username:
            return {
                "success": False,
                "message": "Hostname and username are required"
            }
        
        # Check if webssh_rs module is available
        if not WEBSSH_MODULE_AVAILABLE:
            logger.error("webssh_rs module not available")
            return {
                "success": False,
                "message": "SSH terminal functionality is not available"
            }
        
        # Create SSH session
        try:
            # Log connection attempt
            logger.info(f"Creating SSH session for {request.username}@{request.hostname}:{request.port}")
            
            # Create SSH session using webssh_rs
            ssh_session = webssh_rs.SSHSession(
                hostname=request.hostname,
                port=request.port,
                username=request.username,
                password=request.password,
                private_key="",
                device_type=request.device_type
            )
            
            # Connect to SSH server
            ssh_session.connect()
            
            # Generate session ID
            session_id = f"{request.hostname}-{uuid.uuid4()}"
            logger.info(f"Created session ID: {session_id}")
            
            # Store session in the global active_sessions dictionary
            active_sessions[session_id] = (ssh_session, None)
            
            # Get the server address from the request
            server_host = "localhost"
            server_port = 8000  # FastAPI default port
            
            # Create the WebSocket URL
            websocket_url = f"ws://{server_host}:{server_port}/ws/{session_id}"
            
            result = {
                "success": True,
                "message": "Connected successfully (direct connection)",
                "session_id": session_id,
                "websocket_url": websocket_url
            }
            
            logger.info(f"Connection successful: {result}")
            return result
        except Exception as e:
            logger.error(f"Failed to create SSH session: {e}")
            return {
                "success": False,
                "message": f"Failed to connect: {str(e)}",
                "session_id": None
            }
    except Exception as e:
        logger.error(f"Error connecting to SSH server: {e}")
        return {
            "success": False,
            "message": f"Error connecting to SSH server: {str(e)}"
        }


from fastapi import WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse

@router.websocket("/devices/terminal/ws/{session_id}")
async def device_terminal_websocket(websocket: WebSocket, session_id: str):
    """
    WebSocket endpoint for device terminal connections.
    This provides a bidirectional communication channel between the frontend terminal
    and the device SSH session.
    """
    await _handle_terminal_websocket(websocket, session_id)

# Legacy WebSocket endpoint for backward compatibility
@router.websocket("/devices/webssh/ws/{session_id}")
async def webssh_websocket_legacy(websocket: WebSocket, session_id: str):
    """
    Legacy WebSocket endpoint for backward compatibility.
    """
    await _handle_terminal_websocket(websocket, session_id)

async def _handle_terminal_websocket(websocket: WebSocket, session_id: str):
    """
    Helper function to handle terminal WebSocket connections.
    This function now redirects to the main WebSocket endpoint in main.py
    """
    import logging
    import sys
    import json
    import asyncio
    
    # Set up logging
    logger = logging.getLogger("device_terminal")
    logger.setLevel(logging.DEBUG)
    
    # Create console handler
    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(logging.DEBUG)
    
    # Create formatter
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    handler.setFormatter(formatter)
    
    # Add handler to logger
    logger.addHandler(handler)
    
    logger.info(f"Terminal WebSocket connection request for session {session_id}")
    
    # Accept the WebSocket connection
    await websocket.accept()
    logger.info(f"Terminal WebSocket connection accepted for session {session_id}")
    
    try:
        # Check if the session exists in active_sessions
        if session_id not in active_sessions:
            logger.error(f"Session {session_id} not found in active_sessions")
            await websocket.send_json({
                "type": "error",
                "message": "Session not found"
            })
            await websocket.close(code=1008, reason="Session not found")
            return
        
        # Get the SSH session
        ssh_session, existing_task = active_sessions[session_id]
        
        # Cancel existing task if it exists
        if existing_task and not existing_task.done():
            logger.info(f"Cancelling existing task for session {session_id}")
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
                logger.info(f"Received message from client: {message}")
                
                if message["type"] == "input":
                    # Log the input data for debugging
                    logger.info(f"Received input from client: {message['data']!r}")
                    
                    # Handle Enter key specially
                    if message["data"] == "\r":
                        # Send carriage return and newline
                        ssh_session.send_data("\r\n".encode())
                    else:
                        # Send data to SSH session
                        ssh_session.send_data(message["data"].encode())
                elif message["type"] == "resize":
                    # Resize terminal
                    logger.info(f"Resizing terminal to {message['rows']}x{message['cols']}")
                    ssh_session.resize_terminal(message["rows"], message["cols"])
        except WebSocketDisconnect:
            logger.info(f"WebSocket disconnected for session {session_id}")
        except Exception as e:
            logger.error(f"Error in websocket_endpoint: {e}")
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
            logger.info(f"WebSocket connection closed for session {session_id}")
    
    except Exception as e:
        logger.error(f"Unexpected error in _handle_terminal_websocket: {e}")
        await websocket.close(code=1011, reason=f"Unexpected error: {e}")
