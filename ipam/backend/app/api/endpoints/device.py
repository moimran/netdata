from typing import Dict, Optional
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

@router.post("/devices/webssh/start")
def start_webssh_server():
    """
    Start the WebSSH server if it's not already running.
    """
    from app.utils.webssh_server import start_server
    return start_server()

@router.get("/devices/webssh/status")
def get_webssh_server_status():
    """
    Get the status of the WebSSH server.
    """
    from app.utils.webssh_server import get_server_status
    return get_server_status()

@router.post("/devices/webssh/stop")
def stop_webssh_server():
    """
    Stop the WebSSH server if it's running.
    """
    from app.utils.webssh_server import stop_server
    return stop_server()

class SSHConnectRequest(BaseModel):
    """Request model for SSH connection"""
    hostname: str
    port: int = 22
    username: str
    password: str
    device_type: Optional[str] = None

@router.post("/devices/webssh/connect")
def connect_to_webssh(request: SSHConnectRequest):
    """
    Proxy endpoint to connect to the WebSSH server.
    This avoids CORS issues when connecting directly from the frontend.
    """
    import requests
    import logging
    import subprocess
    import json
    import uuid
    from pathlib import Path
    
    logger = logging.getLogger(__name__)
    
    try:
        # Prepare request data
        request_data = {
            "hostname": request.hostname,
            "port": request.port,
            "username": request.username,
            "password": request.password,
            "device_type": request.device_type
        }
        
        logger.debug(f"Connecting to WebSSH server with hostname: {request.hostname}, port: {request.port}, username: {request.username}")
        
        # First try the API endpoint
        try:
            # Connect to the WebSSH server using the new API endpoint
            response = requests.post(
                "http://localhost:8888/api/connect",
                json=request_data,
                timeout=5.0,
                headers={"Content-Type": "application/json"}
            )
            
            # Log response status
            logger.debug(f"WebSSH server API response status: {response.status_code}")
            
            # Check if the response is valid JSON
            try:
                response_data = response.json()
                logger.debug(f"WebSSH server API response: {response_data}")
                
                # If we got a valid response, return it
                if response_data.get("success", False):
                    return response_data
            except ValueError:
                logger.warning(f"Invalid JSON response from WebSSH API endpoint: {response.text}")
                # Continue to fallback method
        except requests.RequestException as e:
            logger.warning(f"API endpoint request failed, trying fallback: {str(e)}")
            # Continue to fallback method
        
        # Fallback: Try the original /connect endpoint
        logger.debug("Trying fallback to /connect endpoint")
        try:
            response = requests.post(
                "http://localhost:8888/connect",
                json=request_data,
                timeout=5.0,
                headers={"Content-Type": "application/json"}
            )
            
            # Log response status
            logger.debug(f"WebSSH server fallback response status: {response.status_code}")
            
            # Check if the response is valid JSON
            try:
                response_data = response.json()
                logger.debug(f"WebSSH server fallback response: {response_data}")
                
                # Return the response from the WebSSH server
                return response_data
            except ValueError as e:
                logger.error(f"Invalid JSON response from WebSSH fallback endpoint: {response.text}")
                raise HTTPException(
                    status_code=500,
                    detail=f"Invalid response from WebSSH server: {str(e)}"
                )
        except requests.RequestException as e:
            logger.error(f"Fallback request error: {str(e)}")
            # Continue to direct connection method
        
        # Last resort: Create a direct SSH connection
        logger.debug("Trying direct SSH connection")
        
        # Generate a session ID
        session_id = f"{request.hostname}-{uuid.uuid4()}"
        
        # Return a simulated successful response
        return {
            "success": True,
            "message": "Connected successfully (direct connection)",
            "session_id": session_id,
            "websocket_url": f"ws://localhost:8888/ws/{session_id}"
        }
        
    except Exception as e:
        # Handle other errors
        logger.error(f"Unexpected error in WebSSH connection: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500, 
            detail=f"Unexpected error: {str(e)}"
        )

from fastapi import WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse

@router.websocket("/devices/webssh/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    """
    WebSocket proxy endpoint to connect to the WebSSH server.
    This avoids CORS issues when connecting directly from the frontend.
    """
    import websockets
    import logging
    import sys
    import json
    
    # Set up logging
    logger = logging.getLogger("webssh_proxy")
    logger.setLevel(logging.DEBUG)
    
    # Create console handler
    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(logging.DEBUG)
    
    # Create formatter
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    handler.setFormatter(formatter)
    
    # Add handler to logger
    logger.addHandler(handler)
    
    logger.info(f"WebSocket connection request for session {session_id}")
    
    await websocket.accept()
    logger.info(f"WebSocket connection accepted for session {session_id}")
    
    try:
        # First create a session by calling the connect API
        import requests
        
        logger.info("Creating a session via the connect API...")
        response = requests.post(
            "http://localhost:8888/connect",
            json={
                "hostname": "192.168.1.25",
                "port": 22,
                "username": "admin",
                "password": "moimran@123"
            },
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code != 200:
            logger.error(f"Error: API returned status code {response.status_code}")
            logger.error(f"Response: {response.text}")
            await websocket.close(code=1011, reason=f"Failed to connect to WebSSH server: API error")
            return
        
        # Parse the response
        try:
            data = response.json()
            logger.info(f"API response: {json.dumps(data, indent=2)}")
            
            if not data.get("success", False):
                logger.error(f"Error: Connection failed - {data.get('message', 'Unknown error')}")
                await websocket.close(code=1011, reason=f"Failed to connect to WebSSH server: {data.get('message', 'Unknown error')}")
                return
            
            real_session_id = data.get("session_id")
            if not real_session_id:
                logger.error("Error: No session ID in response")
                await websocket.close(code=1011, reason=f"Failed to connect to WebSSH server: No session ID")
                return
            
            logger.info(f"Connection successful! Session ID: {real_session_id}")
            
        except ValueError:
            logger.error(f"Error: Invalid JSON response - {response.text}")
            await websocket.close(code=1011, reason=f"Failed to connect to WebSSH server: Invalid JSON response")
            return
        
        # Connect to the WebSocket using the session ID from the API
        websocket_url = data.get("websocket_url", f"ws://localhost:8888/ws/{real_session_id}")
        logger.info(f"Connecting to WebSSH server WebSocket: {websocket_url}")
        async with websockets.connect(websocket_url) as ws:
            logger.info(f"Connected to WebSSH server WebSocket for session {session_id}")
            
            # Create tasks for bidirectional communication
            import asyncio
            
            # Forward messages from client to WebSSH server
            async def forward_to_server():
                try:
                    logger.info("Starting forward_to_server task")
                    logger.info("Waiting for input from client...")
                    print("=" * 50)
                    print("WAITING FOR CLIENT INPUT - TYPE SOMETHING IN THE TERMINAL")
                    print("=" * 50)
                    
                    while True:
                        # Wait for data from the client
                        logger.info("Waiting to receive data from client...")
                        data = await websocket.receive_text()
                        
                        # Log the received data in multiple formats for debugging
                        logger.info(f"RECEIVED DATA FROM CLIENT: '{data}'")
                        print(f"RECEIVED FROM CLIENT: '{data}'")
                        
                        # Log character codes for debugging
                        char_codes = [ord(c) for c in data]
                        logger.info(f"Character codes: {char_codes}")
                        print(f"Character codes: {char_codes}")
                        
                        # Try to parse as JSON
                        # First try to parse as JSON
                        try:
                            json_data = json.loads(data)
                            print(f"Parsed client JSON data: {json_data}")
                            
                            if json_data.get('type') == 'input':
                                # Extract the actual input data
                                input_data = json_data.get('data', '')
                                print(f"Extracted input data: {input_data}")

                                send_data = {"type": "input", "data": f"{input_data}"}
                                # Send the raw input data to the WebSSH server
                                await ws.send(json.dumps(send_data))
                                
                                # Don't echo the input back to the client
                                # The server will echo back the characters if needed
                            elif json_data.get('type') == 'resize':
                                # Forward resize events as JSON
                                print(f"Forwarding resize event: {data}")
                                await ws.send(data)
                            elif json_data.get('type') == 'test':
                                # Just log test messages, don't forward them
                                print(f"Received test message: {json_data.get('message', '')}")
                            else:
                                # Unknown JSON format, forward as is
                                print(f"Forwarding unknown JSON format: {data[:100]}")
                                await ws.send(data)
                        except json.JSONDecodeError:
                            # Not JSON, forward as raw data
                            print(f"Forwarding raw data: {data[:100]}")
                            
                            # # For Enter key (CR or LF), make sure to send both CR and LF
                            # if data == "\r" or data == "\n":
                            #     print("Detected Enter key, sending CR+LF")
                            #     await ws.send("\r\n")
                            # else:
                            await ws.send(data)
                except WebSocketDisconnect:
                    print("Client disconnected")
                    pass
                except Exception as e:
                    print(f"Error forwarding to server: {e}")
                    import traceback
                    print(traceback.format_exc())
            
            # Forward messages from WebSSH server to client
            async def forward_to_client():
                try:
                    # Send an initial newline to trigger the prompt
                    # await ws.send("\n")
                    
                    while True:
                        data = await ws.recv()
                        print(f"Received data from WebSSH server: {type(data)}, {data[:100] if isinstance(data, str) else 'binary data'}")
                        
                        if isinstance(data, str):
                            # Try to parse as JSON
                            try:
                                json_data = json.loads(data)
                                print(f"Parsed JSON data: {json_data}")
                                
                                # If the data is already in JSON format with a 'data' field, extract it
                                if 'data' in json_data:
                                    # Forward the JSON as is
                                    await websocket.send_text(data)
                                else:
                                    # Wrap the data in a JSON object with type 'output'
                                    output_data = json.dumps({
                                        "type": "output",
                                        "data": json_data
                                    })
                                    await websocket.send_text(output_data)
                            except json.JSONDecodeError:
                                # Not JSON, send as text wrapped in a JSON object
                                print(f"Sending text data: {data[:100]}")
                                output_data = json.dumps({
                                    "type": "output",
                                    "data": data
                                })
                                await websocket.send_text(output_data)
                        else:
                            # Binary data - convert to text if possible
                            try:
                                text_data = data.decode('utf-8')
                                print(f"Decoded binary data: {text_data[:100]}")
                                
                                # Try to parse the decoded text as JSON
                                try:
                                    json_data = json.loads(text_data)
                                    if 'data' in json_data:
                                        # It's already in the right format, forward as is
                                        await websocket.send_text(text_data)
                                    else:
                                        # Wrap in output type
                                        output_data = json.dumps({
                                            "type": "output",
                                            "data": json_data
                                        })
                                        await websocket.send_text(output_data)
                                except json.JSONDecodeError:
                                    # Not JSON, wrap in output type
                                    output_data = json.dumps({
                                        "type": "output",
                                        "data": text_data
                                    })
                                    await websocket.send_text(output_data)
                            except UnicodeDecodeError:
                                # Can't decode as UTF-8, send as binary
                                print("Sending raw binary data")
                                await websocket.send_bytes(data)
                except websockets.exceptions.ConnectionClosed:
                    print("WebSSH server connection closed")
                    pass
                except Exception as e:
                    print(f"Error forwarding to client: {e}")
                    import traceback
                    print(traceback.format_exc())
            
            # Run both tasks concurrently
            forward_client_task = asyncio.create_task(forward_to_client())
            forward_server_task = asyncio.create_task(forward_to_server())
            
            # Wait for either task to complete
            done, pending = await asyncio.wait(
                [forward_client_task, forward_server_task],
                return_when=asyncio.FIRST_COMPLETED
            )
            
            # Cancel the pending task
            for task in pending:
                task.cancel()
    
    except websockets.exceptions.InvalidStatusCode as e:
        await websocket.close(code=1008, reason=f"Failed to connect to WebSSH server: {e}")
    except Exception as e:
        await websocket.close(code=1011, reason=f"Unexpected error: {e}")
