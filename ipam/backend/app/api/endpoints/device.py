from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from pydantic import BaseModel

from app.database import get_session
from app.models.device import Device
from app.models.credential import Credential
from app.models.ip_address import IPAddress

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
            select(Credential).where(Credential.is_default)
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

# WebSSH server management endpoints removed - now handled directly by webssh-rs

class DeviceConnectRequest(BaseModel):
    """Request model for device connection to webssh-rs"""
    device_id: int
    session_id: str

@router.post("/devices/connect")
def connect_to_device(request: DeviceConnectRequest):
    """
    Connect to a device via webssh-rs.
    
    This endpoint retrieves device connection details from the database
    and forwards them to the webssh-rs server.
    """
    import requests
    import logging
    import uuid
    import os
    
    logger = logging.getLogger("device_connect")
    
    try:
        # Get database session
        db = next(get_session())
        
        # Get device details using the existing function
        device_details = get_device_connection_details(request.device_id, db)
        
        # Extract the necessary connection information
        hostname = device_details.ip_address
        username = device_details.username
        password = device_details.password
        enable_password = device_details.enable_password
        device_name = device_details.device_name
        
        # Use the provided session ID or generate a new one
        session_id = request.session_id or str(uuid.uuid4())
        
        logger.info(f"Connecting to device {device_name} ({hostname}) via webssh-rs with session ID {session_id}")
        
        # Get webssh-rs URL from environment or use default
        webssh_url = os.environ.get("WEBSSH_URL", "http://localhost:8022")
        
        logger.info(f"Using WebSSH server at {webssh_url}")
        
        try:
            # Send connection details to webssh-rs with enhanced information
            response = requests.post(
                f"{webssh_url}/api/connect",
                json={
                    "hostname": hostname,
                    "port": 22,  # Assuming SSH port is 22
                    "username": username,
                    "password": password,
                    "enable_password": enable_password,
                    "device_type": "network",  # Default to network device type
                    "auth_type": "password",    # Default to password authentication
                    "session_id": session_id,
                    "device_name": device_name,
                    "portal_user_id": "ipam_user"  # Default user ID for now
                },
                timeout=10  # Increased timeout for network devices
            )
            
            if response.status_code != 200:
                logger.error(f"Failed to connect to webssh-rs: {response.status_code} - {response.text}")
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Failed to connect to webssh-rs: {response.text}"
                )
                
            # Try to parse the response as JSON
            try:
                response_data = response.json()
                logger.info(f"webssh-rs response: {response_data}")
                
                # Enhance the response with additional device information
                response_data["device_name"] = device_name
                response_data["ip_address"] = hostname
                response_data["device_id"] = request.device_id
                
                # Ensure we have a session_id in the response
                if "session_id" not in response_data:
                    response_data["session_id"] = session_id
                
                # Make sure we have the correct session ID from the response
                if "session_id" in response_data:
                    # Use the session ID returned by the webssh-rs server
                    session_id = response_data["session_id"]
                    logger.info(f"Using session ID from webssh-rs response: {session_id}")
                
                # Fix the websocket_url to be a direct URL to the HTML page with query parameters
                if "websocket_url" in response_data:
                    # Extract the session ID from the websocket URL if present
                    ws_url = response_data["websocket_url"]
                    logger.info(f"Original websocket URL: {ws_url}")
                    
                    # Parse the original websocket URL to extract the correct session ID
                    # Format: ws://host:port/ws/session_id
                    try:
                        ws_parts = ws_url.split('/')
                        if len(ws_parts) >= 5:  # We expect at least 5 parts in a proper websocket URL
                            ws_session_id = ws_parts[-1]  # Last part should be the session ID
                            logger.info(f"Extracted session ID from websocket URL: {ws_session_id}")
                            # Use this session ID if it's valid
                            if ws_session_id and len(ws_session_id) > 10:  # Simple validation
                                session_id = ws_session_id
                                logger.info(f"Using session ID from websocket URL: {session_id}")
                    except Exception as e:
                        logger.warning(f"Failed to extract session ID from websocket URL: {e}")
                    
                    # Create a direct URL to the HTML page with the correct session ID
                    # Make sure to URL encode parameters to avoid issues with special characters
                    from urllib.parse import quote
                    direct_url = f"{webssh_url}/?session_id={quote(session_id)}&device_id={quote(str(request.device_id))}&hostname={quote(hostname)}&username={quote(username)}&device_name={quote(device_name)}"
                    logger.info(f"Created direct URL: {direct_url}")
                    
                    # Replace the websocket URL with the direct URL
                    response_data["websocket_url"] = direct_url
                    
                # Always ensure the session ID is in the response
                response_data["session_id"] = session_id
                    
                return response_data
            except Exception as json_error:
                logger.error(f"Invalid JSON response from webssh-rs: {response.text}")
                logger.error(f"JSON parsing error: {str(json_error)}")
                # Return a basic success response if we couldn't parse the JSON
                return {
                    "success": True,
                    "message": f"Connected to device {device_name}",
                    "device_id": request.device_id,
                    "session_id": session_id,
                    "device_name": device_name,
                    "ip_address": hostname
                }
                
        except requests.exceptions.RequestException as e:
            logger.error(f"Error connecting to webssh-rs: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to connect to webssh-rs: {str(e)}"
            )
        
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        # Handle other errors
        logger.error(f"Unexpected error in device connection: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to connect to device: {str(e)}"
        )
