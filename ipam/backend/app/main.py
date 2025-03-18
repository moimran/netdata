from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from sqlmodel import SQLModel
import logging
import threading
import time
import signal
import asyncio

from .database import engine
from .middleware import LoggingMiddleware
from .exception_handlers import validation_exception_handler, general_exception_handler
from .utils import CustomJSONResponse
from .utils.shared_state import active_sessions, WEBSSH_MODULE_AVAILABLE, webssh_rs, receive_ssh_data
from .api import router

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = FastAPI(title="IPAM API")

# Add logging middleware
app.add_middleware(LoggingMiddleware)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],  # Allow both localhost and 127.0.0.1
    allow_credentials=True,  # Allow credentials
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],  # Specify allowed methods
    allow_headers=["*"],  # Allows all headers
    expose_headers=["Content-Type", "X-Requested-With", "Accept", "Authorization"],  # Expose specific headers
)

# Use our custom response class as the default
app.router.default_response_class = CustomJSONResponse

# Add exception handlers
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, general_exception_handler)

# Include the API router
app.include_router(router)

# Create tables
SQLModel.metadata.create_all(engine)

# Flag to track if shutdown has been initiated
shutdown_initiated = False

# Add startup event handler to FastAPI
@app.on_event("startup")
async def startup_event():
    logger.info("FastAPI startup event triggered")
    logger.info("SSH terminal functionality is ready")

# Add shutdown event handler to FastAPI
@app.on_event("shutdown")
async def shutdown_event():
    logger.info("FastAPI shutdown event triggered")
    
    # Close all active SSH sessions
    for session_id, (ssh_session, task) in list(active_sessions.items()):
        try:
            logger.info(f"Closing SSH session {session_id}")
            ssh_session.close()
        except Exception as e:
            logger.error(f"Error closing SSH session {session_id}: {e}")

# Add a simple test endpoint at the root
@app.get("/")
async def root():
    return {"message": "Welcome to the IPAM API"}


@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    """WebSocket endpoint for SSH sessions"""
    await websocket.accept()
    logger.info(f"WebSocket connection accepted for session {session_id}")
    
    # Check if webssh_rs module is available
    if not WEBSSH_MODULE_AVAILABLE:
        logger.error("webssh_rs module not available")
        await websocket.send_json({
            "type": "error",
            "message": "SSH terminal functionality is not available"
        })
        await websocket.close(code=1013, reason="SSH terminal functionality is not available")
        return
    
    # Get SSH session from active_sessions
    if session_id not in active_sessions:
        logger.error(f"Session {session_id} not found")
        await websocket.send_json({
            "type": "error",
            "message": "Session not found"
        })
        await websocket.close(code=1008, reason="Session not found")
        return
    
    # Get the SSH session and existing task
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

# receive_ssh_data function is now imported from shared_state

