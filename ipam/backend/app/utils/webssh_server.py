import subprocess
import os
import signal
import time
import logging
import psutil
from pathlib import Path

logger = logging.getLogger(__name__)

# Path to the WebSSH-RS server directory
WEBSSH_DIR = Path(__file__).parent.parent.parent.parent / "webssh-rs"

# PID file to track the server process
PID_FILE = WEBSSH_DIR / "webssh.pid"

def is_server_running():
    """Check if the WebSSH server is already running"""
    if PID_FILE.exists():
        try:
            with open(PID_FILE, "r") as f:
                pid = int(f.read().strip())
            
            # Check if process with this PID exists
            if psutil.pid_exists(pid):
                process = psutil.Process(pid)
                # Check if it's our server process
                if "webssh-rs" in process.name() or "node" in process.name():
                    return True
            
            # PID file exists but process doesn't, clean up
            PID_FILE.unlink()
        except (ValueError, IOError, psutil.NoSuchProcess) as e:
            logger.error(f"Error checking server status: {e}")
            if PID_FILE.exists():
                PID_FILE.unlink()
    
    return False

def check_cargo_installed():
    """Check if cargo is installed and available"""
    try:
        result = subprocess.run(
            ["cargo", "--version"], 
            stdout=subprocess.PIPE, 
            stderr=subprocess.PIPE,
            text=True
        )
        return result.returncode == 0
    except Exception:
        return False

def start_server():
    """Start the WebSSH server if it's not already running"""
    if is_server_running():
        logger.info("WebSSH server is already running")
        return {"status": "running", "message": "WebSSH server is already running"}
    
    # Store original working directory
    original_dir = os.getcwd()
    
    try:
        # Check if the WebSSH directory exists
        if not WEBSSH_DIR.exists():
            error_message = f"WebSSH directory not found at {WEBSSH_DIR}"
            logger.error(error_message)
            return {"status": "error", "message": error_message}
        
        # Log the WebSSH directory for debugging
        logger.info(f"WebSSH directory: {WEBSSH_DIR}")
        logger.info(f"Current directory before change: {original_dir}")
        
        # Change to the WebSSH directory
        os.chdir(WEBSSH_DIR)
        logger.info(f"Changed directory to: {os.getcwd()}")
        
        # Check for a pre-built binary first
        binary_path = WEBSSH_DIR / "target" / "release" / "webssh-rs"
        if binary_path.exists():
            logger.info(f"Using pre-built WebSSH binary at {binary_path}")
            cmd = [str(binary_path)]
        elif check_cargo_installed():
            logger.info("Building WebSSH from source with cargo")
            # Try to build the project first
            try:
                logger.info("Building project with 'cargo build --release'")
                build_result = subprocess.run(
                    ["cargo", "build", "--release"],
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True,
                    check=True
                )
                logger.info("Build successful")
                
                # If build succeeds, use the binary
                if binary_path.exists():
                    logger.info(f"Using newly built binary at {binary_path}")
                    cmd = [str(binary_path)]
                else:
                    logger.info("Binary not found after build, using 'cargo run'")
                    cmd = ["cargo", "run", "--release"]
            except subprocess.CalledProcessError as e:
                logger.error(f"Build failed: {e.stderr}")
                # Fall back to cargo run
                cmd = ["cargo", "run", "--release"]
        else:
            error_message = "Cargo is not installed and no pre-built binary found"
            logger.error(error_message)
            return {"status": "error", "message": error_message}
        
        logger.info(f"Starting WebSSH server with command: {' '.join(cmd)}")
        
        # Start the server with detailed output capture
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            start_new_session=True  # Detach from parent process
        )
        
        # Save PID to file
        with open(PID_FILE, "w") as f:
            f.write(str(process.pid))
        
        logger.info(f"Saved PID {process.pid} to {PID_FILE}")
        
        # Wait a bit to make sure it starts
        logger.info("Waiting for server to start...")
        time.sleep(5)  # Increased wait time
        
        # Check if process is still running
        if process.poll() is None:
            logger.info(f"WebSSH server started with PID {process.pid}")
            return {"status": "started", "message": f"WebSSH server started with PID {process.pid}"}
        else:
            stdout, stderr = process.communicate()
            error_message = f"Failed to start WebSSH server: {stderr}"
            logger.error(error_message)
            logger.error(f"Command output: {stdout}")
            return {"status": "error", "message": error_message}
    
    except Exception as e:
        logger.error(f"Error starting WebSSH server: {e}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return {"status": "error", "message": f"Error starting WebSSH server: {e}"}
    finally:
        # Restore original working directory
        logger.info(f"Restoring directory to: {original_dir}")
        os.chdir(original_dir)

def stop_server():
    """Stop the WebSSH server if it's running"""
    if not is_server_running():
        logger.info("WebSSH server is not running")
        return {"status": "stopped", "message": "WebSSH server is not running"}
    
    try:
        with open(PID_FILE, "r") as f:
            pid = int(f.read().strip())
        
        # Send SIGTERM to the process
        os.kill(pid, signal.SIGTERM)
        
        # Wait a bit to make sure it stops
        time.sleep(1)
        
        # Check if process is still running
        if psutil.pid_exists(pid):
            # Force kill if still running
            os.kill(pid, signal.SIGKILL)
        
        # Remove PID file
        PID_FILE.unlink()
        
        logger.info(f"WebSSH server with PID {pid} stopped")
        return {"status": "stopped", "message": f"WebSSH server with PID {pid} stopped"}
    
    except (ValueError, IOError, ProcessLookupError) as e:
        logger.error(f"Error stopping WebSSH server: {e}")
        if PID_FILE.exists():
            PID_FILE.unlink()
        return {"status": "error", "message": f"Error stopping WebSSH server: {e}"}

def get_server_status():
    """Get the current status of the WebSSH server"""
    if is_server_running():
        with open(PID_FILE, "r") as f:
            pid = int(f.read().strip())
        return {"status": "running", "message": f"WebSSH server is running with PID {pid}"}
    else:
        return {"status": "stopped", "message": "WebSSH server is not running"}
