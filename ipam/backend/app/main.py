from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from sqlmodel import SQLModel
import logging
import signal

from .database import engine
from .middleware import LoggingMiddleware
from .exception_handlers import validation_exception_handler, general_exception_handler
from .utils import CustomJSONResponse
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

# WebSSH server should be started manually
# The following function has been commented out to prevent automatic starting
'''
def start_webssh_server_thread():
    # Wait a bit for the main server to start
    time.sleep(2)
    
    # Check if the server is already running
    if not is_server_running():
        logger.info("Starting WebSSH server automatically...")
        try:
            result = start_server()
            logger.info(f"WebSSH server start result: {result}")
        except Exception as e:
            logger.error(f"Error starting WebSSH server: {e}")
    else:
        logger.info("WebSSH server is already running")
'''

# Store the original signal handlers
original_sigint_handler = signal.getsignal(signal.SIGINT)
original_sigterm_handler = signal.getsignal(signal.SIGTERM)

# Flag to track if shutdown has been initiated
shutdown_initiated = False

# Signal handler for graceful shutdown
def signal_handler(sig, frame):
    global shutdown_initiated
    
    # Prevent multiple shutdown attempts
    if shutdown_initiated:
        return
    
    shutdown_initiated = True
    
    logger.info("Shutting down backend server...")
    # WebSSH server should be stopped manually
    # The following code has been removed:
    # try:
    #     stop_result = stop_server()
    #     logger.info(f"WebSSH server stop result: {stop_result}")
    # except Exception as e:
    #     logger.error(f"Error stopping WebSSH server: {e}")
    
    # Call the original signal handler to let the server shut down normally
    if sig == signal.SIGINT and original_sigint_handler:
        if callable(original_sigint_handler):
            original_sigint_handler(sig, frame)
    elif sig == signal.SIGTERM and original_sigterm_handler:
        if callable(original_sigterm_handler):
            original_sigterm_handler(sig, frame)

# Register signal handlers
signal.signal(signal.SIGINT, signal_handler)  # Ctrl+C
signal.signal(signal.SIGTERM, signal_handler)  # Termination signal

# Add shutdown event handler to FastAPI
@app.on_event("shutdown")
async def shutdown_event():
    logger.info("FastAPI shutdown event triggered")
    # WebSSH server should be stopped manually
    # The following code has been removed:
    # if not shutdown_initiated:
    #     logger.info("Stopping WebSSH server from shutdown event...")
    #     try:
    #         stop_result = stop_server()
    #         logger.info(f"WebSSH server stop result: {stop_result}")
    #     except Exception as e:
    #         logger.error(f"Error stopping WebSSH server: {e}")

# WebSSH server should be started manually
# The following code has been removed to prevent automatic starting
'''
# Start the WebSSH server in a background thread
webssh_thread = threading.Thread(target=start_webssh_server_thread)
webssh_thread.daemon = True  # Make the thread a daemon so it exits when the main process exits
webssh_thread.start()
'''

# Add a simple test endpoint at the root
@app.get("/")
async def root():
    return {"message": "Welcome to the IPAM API"}
