import os
import sys
import logging
import importlib.util
import subprocess
import time
from pathlib import Path

logger = logging.getLogger(__name__)

# Path to the WebSSH-RS directory
WEBSSH_DIR = Path(__file__).parent.parent.parent.parent / "webssh-rs"

# PID file to track the server process
PID_FILE = WEBSSH_DIR / "webssh.pid"

# Flag to track if the module is available
WEBSSH_MODULE_AVAILABLE = False

# Try to import the webssh_rs module
try:
    import webssh_rs
    WEBSSH_MODULE_AVAILABLE = True
    logger.info("webssh_rs module is available")
except ImportError:
    logger.warning("webssh_rs module is not available, will try to install it")
    WEBSSH_MODULE_AVAILABLE = False

def is_server_running():
    """Check if the WebSSH server is running"""
    if os.path.exists(PID_FILE):
        try:
            with open(PID_FILE, "r") as f:
                pid = int(f.read().strip())
            
            # Check if process with this PID exists
            try:
                os.kill(pid, 0)  # Signal 0 is used to check if process exists
                return True
            except OSError:
                # Process doesn't exist, remove PID file
                os.unlink(PID_FILE)
                return False
        except (ValueError, IOError) as e:
            logger.error(f"Error checking server status: {e}")
            if os.path.exists(PID_FILE):
                os.unlink(PID_FILE)
            return False
    
    return False

def install_webssh_module():
    """Install the webssh_rs Python module from the local directory"""
    if not WEBSSH_DIR.exists():
        logger.error(f"WebSSH directory not found at {WEBSSH_DIR}")
        return False
    
    # Store original working directory
    original_dir = os.getcwd()
    
    try:
        # Change to the WebSSH directory
        os.chdir(WEBSSH_DIR)
        logger.info(f"Changed directory to: {os.getcwd()}")
        
        # Install the package in development mode
        logger.info("Installing webssh_rs Python module...")
        result = subprocess.run(
            [sys.executable, "-m", "uv", "pip", "install", "-e", "."],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        if result.returncode == 0:
            logger.info("Successfully installed webssh_rs module")
            return True
        else:
            logger.error(f"Failed to install webssh_rs module: {result.stderr}")
            return False
    except Exception as e:
        logger.error(f"Error installing webssh_rs module: {e}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return False
    finally:
        # Restore original working directory
        os.chdir(original_dir)

def start_server():
    """Start the WebSSH server"""
    global WEBSSH_MODULE_AVAILABLE
    
    # Check if the server is already running
    if is_server_running():
        logger.info("WebSSH server is already running")
        return {"status": "running", "message": "WebSSH server is already running"}
    
    # Make sure the module is installed
    if not WEBSSH_MODULE_AVAILABLE:
        if install_webssh_module():
            # Try to import the module again
            try:
                # Clear the import cache to ensure we get the newly installed module
                if "webssh_rs" in sys.modules:
                    del sys.modules["webssh_rs"]
                
                import webssh_rs
                WEBSSH_MODULE_AVAILABLE = True
                logger.info("Successfully imported webssh_rs module after installation")
            except ImportError as e:
                logger.error(f"Failed to import webssh_rs module after installation: {e}")
                return {"status": "error", "message": f"Failed to import webssh_rs module: {e}"}
        else:
            return {"status": "error", "message": "Failed to install webssh_rs module"}
    
    # Start the WebSSH server
    try:
        # Import the server app module
        from app.utils.webssh_server_app import start_server_process
        
        # Start the server process
        if start_server_process():
            # Wait a bit for the server to start
            time.sleep(2)
            
            # Check if the server is running
            if is_server_running():
                logger.info("WebSSH server started successfully")
                return {"status": "started", "message": "WebSSH server started successfully"}
            else:
                logger.error("WebSSH server failed to start")
                return {"status": "error", "message": "WebSSH server failed to start"}
        else:
            logger.error("Failed to start WebSSH server process")
            return {"status": "error", "message": "Failed to start WebSSH server process"}
    except Exception as e:
        logger.error(f"Error starting WebSSH server: {e}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return {"status": "error", "message": f"Error starting WebSSH server: {str(e)}"}

def stop_server():
    """Stop the WebSSH server"""
    if not is_server_running():
        logger.info("WebSSH server is not running")
        return {"status": "stopped", "message": "WebSSH server is not running"}
    
    try:
        # Import the server app module
        from app.utils.webssh_server_app import stop_server_process
        
        # Stop the server process
        if stop_server_process():
            logger.info("WebSSH server stopped successfully")
            return {"status": "stopped", "message": "WebSSH server stopped successfully"}
        else:
            logger.error("Failed to stop WebSSH server")
            return {"status": "error", "message": "Failed to stop WebSSH server"}
    except Exception as e:
        logger.error(f"Error stopping WebSSH server: {e}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return {"status": "error", "message": f"Error stopping WebSSH server: {str(e)}"}

def get_server_status():
    """Get the current status of the WebSSH server"""
    if is_server_running():
        with open(PID_FILE, "r") as f:
            pid = int(f.read().strip())
        return {"status": "running", "message": f"WebSSH server is running with PID {pid}"}
    else:
        return {"status": "stopped", "message": "WebSSH server is not running"}
