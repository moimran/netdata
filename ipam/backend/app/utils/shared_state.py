"""
Shared state module for storing global variables that need to be accessed across modules.
This helps avoid circular imports.
"""
import logging
import asyncio
from math import log
from fastapi import WebSocket

# Configure logging
logger = logging.getLogger(__name__)

# Dictionary to store active SSH sessions
active_sessions = {}

# Flag to track if webssh_rs module is available
try:
    import webssh_rs
    WEBSSH_MODULE_AVAILABLE = True
except ImportError:
    WEBSSH_MODULE_AVAILABLE = False
    logging.error("webssh_rs module not available. SSH terminal functionality will be disabled.")

async def receive_ssh_data(
    ssh_session,
    websocket: WebSocket,
    session_id: str
):
    """Receive data from SSH session and send to WebSocket"""
    try:
        logger.info(f"Starting receive_ssh_data task for session {session_id}")
        
        # Initial delay to let the client connect fully
        await asyncio.sleep(0.5)
        
        # Send an initial newline to trigger the prompt
        logger.debug("Sending initial newline to trigger prompt")
        ssh_session.send_data("\r\n".encode())
        
        while True:
            # Receive data with a timeout
            data = ssh_session.receive_data(timeout_ms=100)
            
            if data:
                # Convert bytes to string
                text_data = data.decode('utf-8', errors='replace')
                
                # Log the received data for debugging
                logger.debug(f"Received data from SSH session: {text_data!r}")
                
                # Send data to WebSocket
                await websocket.send_json({
                    "type": "output",
                    "data": text_data
                })
            
            # Small sleep to prevent CPU hogging
            await asyncio.sleep(0.01)
    except asyncio.CancelledError:
        logger.info(f"receive_ssh_data task cancelled for session {session_id}")
        raise
    except Exception as e:
        logger.error(f"Error in receive_ssh_data: {e}")
        try:
            await websocket.send_json({
                "type": "error",
                "message": f"SSH error: {str(e)}"
            })
        except:
            pass