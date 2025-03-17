#!/usr/bin/env python3
"""
Basic usage example for webssh-rs.

This script demonstrates basic usage of the webssh-rs package.
"""

import argparse
import asyncio
import logging
import sys
from typing import Optional

import webssh_rs

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

def parse_args():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description="WebSSH-RS Basic Usage Example")
    parser.add_argument("hostname", help="Hostname or IP address")
    parser.add_argument("--port", type=int, default=22, help="Port (default: 22)")
    parser.add_argument("--username", required=True, help="Username")
    parser.add_argument("--password", help="Password")
    parser.add_argument("--private-key", help="Private key file")
    parser.add_argument(
        "--device-type",
        choices=["router", "switch", "firewall", "server", "generic"],
        default="generic",
        help="Device type (default: generic)",
    )
    parser.add_argument("--command", help="Command to execute")
    parser.add_argument("--async", action="store_true", help="Use async API")
    parser.add_argument("--debug", action="store_true", help="Enable debug logging")
    return parser.parse_args()

def sync_example(args):
    """Synchronous API example."""
    logger.info("Using synchronous API")
    
    # Create SSH session
    session = webssh_rs.SSHSession(
        hostname=args.hostname,
        port=args.port,
        username=args.username,
        password=args.password,
        private_key=args.private_key,
        device_type=args.device_type,
    )
    
    try:
        # Connect to the server
        logger.info(f"Connecting to {args.hostname}:{args.port} as {args.username}")
        session.connect()
        logger.info("Connected successfully")
        
        # Get session info
        info = session.get_info()
        logger.info(f"Session info: {info}")
        
        if args.command:
            # Execute command
            logger.info(f"Executing command: {args.command}")
            output = session.send_command(args.command)
            print(f"\n--- Command Output ---\n{output}\n-------------------")
        else:
            # Interactive mode
            logger.info("Starting interactive mode (press Ctrl+C to exit)")
            
            # Set up terminal
            import termios
            import tty
            import select
            
            # Save terminal settings
            old_settings = termios.tcgetattr(sys.stdin)
            try:
                # Set terminal to raw mode
                tty.setraw(sys.stdin.fileno())
                
                # Main loop
                while True:
                    # Check for input
                    readable, _, _ = select.select([sys.stdin], [], [], 0.1)
                    if sys.stdin in readable:
                        # Read input
                        data = sys.stdin.read(1)
                        if data:
                            # Send input
                            session.send_data(data)
                    
                    # Check for output
                    output = session.receive_data(timeout_ms=100)
                    if output:
                        # Write output
                        sys.stdout.buffer.write(output)
                        sys.stdout.flush()
            finally:
                # Restore terminal settings
                termios.tcsetattr(sys.stdin, termios.TCSADRAIN, old_settings)
    except KeyboardInterrupt:
        logger.info("Interrupted by user")
    except Exception as e:
        logger.error(f"Error: {e}")
    finally:
        # Disconnect
        logger.info("Disconnecting")
        session.disconnect()
        logger.info("Disconnected")

async def async_example(args):
    """Asynchronous API example."""
    logger.info("Using asynchronous API")
    
    # Create SSH session
    session = webssh_rs.SSHSession(
        hostname=args.hostname,
        port=args.port,
        username=args.username,
        password=args.password,
        private_key=args.private_key,
        device_type=args.device_type,
    )
    
    try:
        # Connect to the server
        logger.info(f"Connecting to {args.hostname}:{args.port} as {args.username}")
        await session.async_connect()
        logger.info("Connected successfully")
        
        # Get session info
        info = session.get_info()
        logger.info(f"Session info: {info}")
        
        if args.command:
            # Execute command
            logger.info(f"Executing command: {args.command}")
            output = await session.async_send_command(args.command)
            print(f"\n--- Command Output ---\n{output}\n-------------------")
        else:
            # Interactive mode
            logger.info("Starting interactive mode (press Ctrl+C to exit)")
            
            # Set up terminal
            import termios
            import tty
            import select
            import fcntl
            import os
            
            # Save terminal settings
            old_settings = termios.tcgetattr(sys.stdin)
            try:
                # Set terminal to raw mode
                tty.setraw(sys.stdin.fileno())
                
                # Set stdin to non-blocking mode
                flags = fcntl.fcntl(sys.stdin.fileno(), fcntl.F_GETFL)
                fcntl.fcntl(sys.stdin.fileno(), fcntl.F_SETFL, flags | os.O_NONBLOCK)
                
                # Main loop
                while True:
                    # Check for input
                    try:
                        data = sys.stdin.read(1)
                        if data:
                            # Send input
                            await session.async_send_data(data)
                    except (IOError, OSError):
                        # No input available
                        pass
                    
                    # Check for output
                    output = await session.async_receive_data(timeout_ms=100)
                    if output:
                        # Write output
                        sys.stdout.buffer.write(output)
                        sys.stdout.flush()
                    
                    # Small delay to prevent CPU hogging
                    await asyncio.sleep(0.01)
            finally:
                # Restore terminal settings
                termios.tcsetattr(sys.stdin, termios.TCSADRAIN, old_settings)
    except KeyboardInterrupt:
        logger.info("Interrupted by user")
    except Exception as e:
        logger.error(f"Error: {e}")
    finally:
        # Disconnect
        logger.info("Disconnecting")
        await session.async_disconnect()
        logger.info("Disconnected")

def device_example(args):
    """Device connection example."""
    logger.info("Using device connection API")
    
    # Create device connection
    device = webssh_rs.DeviceConnection(
        hostname=args.hostname,
        port=args.port,
        username=args.username,
        password=args.password,
        private_key=args.private_key,
        device_type=args.device_type,
    )
    
    try:
        # Connect to the device
        logger.info(f"Connecting to {args.hostname}:{args.port} as {args.username}")
        device.connect()
        logger.info("Connected successfully")
        
        # Get device info
        info = device.get_info()
        logger.info(f"Device info: {info}")
        
        if args.command:
            # Execute command
            logger.info(f"Executing command: {args.command}")
            output = device.send_command(args.command)
            print(f"\n--- Command Output ---\n{output}\n-------------------")
            
            # For network devices, also try some configuration commands
            if args.device_type in ["router", "switch"]:
                logger.info("Executing configuration commands")
                config_output = device.send_config([
                    "interface loopback 0",
                    "description Configured by WebSSH-RS",
                    "exit",
                ])
                print(f"\n--- Config Output ---\n{config_output}\n-------------------")
        else:
            # Interactive mode (similar to sync_example)
            logger.info("Starting interactive mode (press Ctrl+C to exit)")
            
            # Set up terminal
            import termios
            import tty
            import select
            
            # Save terminal settings
            old_settings = termios.tcgetattr(sys.stdin)
            try:
                # Set terminal to raw mode
                tty.setraw(sys.stdin.fileno())
                
                # Main loop
                while True:
                    # Check for input
                    readable, _, _ = select.select([sys.stdin], [], [], 0.1)
                    if sys.stdin in readable:
                        # Read input
                        data = sys.stdin.read(1)
                        if data:
                            # Send input
                            device._session.send_data(data)
                    
                    # Check for output
                    output = device._session.receive_data(timeout_ms=100)
                    if output:
                        # Write output
                        sys.stdout.buffer.write(output)
                        sys.stdout.flush()
            finally:
                # Restore terminal settings
                termios.tcsetattr(sys.stdin, termios.TCSADRAIN, old_settings)
    except KeyboardInterrupt:
        logger.info("Interrupted by user")
    except Exception as e:
        logger.error(f"Error: {e}")
    finally:
        # Disconnect
        logger.info("Disconnecting")
        device.disconnect()
        logger.info("Disconnected")

def main():
    """Main function."""
    args = parse_args()
    
    # Set log level
    if args.debug:
        logging.getLogger().setLevel(logging.DEBUG)
    
    # Run example
    if getattr(args, "async"):
        asyncio.run(async_example(args))
    elif args.device_type != "generic":
        device_example(args)
    else:
        sync_example(args)

if __name__ == "__main__":
    main()