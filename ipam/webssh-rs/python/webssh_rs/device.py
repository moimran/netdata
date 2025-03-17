"""
Device-specific SSH connection interface.

This module provides device-specific SSH connection functionality.
"""

import asyncio
import logging
import re
from typing import Optional, Union, Dict, Any, List, Tuple, Pattern

from .session import SSHSession, SSHError

logger = logging.getLogger(__name__)

class DeviceConnection:
    """
    Device-specific SSH connection interface.
    
    This class provides device-specific SSH connection functionality,
    including automatic handling of device prompts and command execution.
    """
    
    # Device type definitions
    DEVICE_TYPES = {
        "router": {
            "prompt_pattern": r"[\w\-\.]+[>#](\s|$)",
            "initial_commands": ["terminal length 0", "terminal width 0"],
        },
        "switch": {
            "prompt_pattern": r"[\w\-\.]+[>#](\s|$)",
            "initial_commands": ["terminal length 0", "terminal width 0"],
        },
        "firewall": {
            "prompt_pattern": r"[\w\-\.@]+[>#](\s|$)",
            "initial_commands": ["terminal pager 0"],
        },
        "server": {
            "prompt_pattern": r"[\w\-\.@]+[%#\$>](\s|$)",
            "initial_commands": ["stty -echo", "export TERM=xterm"],
        },
        "generic": {
            "prompt_pattern": r"[%#>\$](\s|$)",
            "initial_commands": [],
        },
    }
    
    def __init__(
        self,
        hostname: str,
        port: int = 22,
        username: str = None,
        password: Optional[str] = None,
        private_key: Optional[str] = None,
        device_type: str = "generic",
        timeout: int = 30,
    ):
        """
        Initialize a device connection.
        
        Args:
            hostname: The hostname or IP address to connect to
            port: The port to connect to (default: 22)
            username: The username to authenticate with
            password: The password to authenticate with (optional)
            private_key: The private key to authenticate with (optional)
            device_type: The type of device to connect to (default: "generic")
            timeout: The timeout in seconds (default: 30)
            
        Raises:
            ValueError: If the device type is not supported
        """
        if device_type not in self.DEVICE_TYPES:
            raise ValueError(
                f"Unsupported device type: {device_type}. "
                f"Supported types: {', '.join(self.DEVICE_TYPES.keys())}"
            )
        
        self._session = SSHSession(
            hostname=hostname,
            port=port,
            username=username,
            password=password,
            private_key=private_key,
            device_type=device_type,
            timeout=timeout,
        )
        
        self.device_type = device_type
        self.prompt_pattern = self.DEVICE_TYPES[device_type]["prompt_pattern"]
        self.initial_commands = self.DEVICE_TYPES[device_type]["initial_commands"]
        self.timeout = timeout
        self._prompt_re = re.compile(self.prompt_pattern)
        self._connected = False
    
    def __enter__(self):
        """Enter context manager."""
        self.connect()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Exit context manager."""
        self.disconnect()
    
    def connect(self) -> None:
        """
        Connect to the device.
        
        This method connects to the device and sends any initial commands
        required for the device type.
        
        Raises:
            SSHError: If the connection fails
        """
        if not self._connected:
            # Connect to the SSH server
            self._session.connect()
            
            # Send initial commands
            for command in self.initial_commands:
                self.send_command(command)
            
            self._connected = True
    
    def disconnect(self) -> None:
        """Disconnect from the device."""
        if self._connected:
            self._session.disconnect()
            self._connected = False
    
    def send_command(self, command: str, timeout: Optional[int] = None) -> str:
        """
        Send a command to the device and wait for the prompt.
        
        Args:
            command: The command to send
            timeout: The timeout in seconds (optional)
            
        Returns:
            The command output as a string
            
        Raises:
            SSHError: If the command fails
        """
        if not self._connected:
            raise SSHError("Not connected")
        
        # Send the command
        self._session.send_data(command + "\n")
        
        # Wait for the prompt
        timeout_ms = timeout * 1000 if timeout is not None else None
        output = []
        buffer = ""
        
        start_time = asyncio.get_event_loop().time() if timeout else None
        
        while True:
            # Check timeout
            if timeout and (asyncio.get_event_loop().time() - start_time) > timeout:
                raise SSHError(f"Command timed out: {command}")
            
            # Receive data
            data = self._session.receive_data(timeout_ms=100)
            if data:
                # Convert to string
                data_str = data.decode("utf-8", errors="replace")
                
                # Append to buffer
                buffer += data_str
                
                # Check for prompt
                if self._prompt_re.search(buffer):
                    # Found prompt, add buffer to output
                    output.append(buffer)
                    break
                
                # Check if buffer is too large
                if len(buffer) > 4096:
                    # Buffer is too large, add to output and reset
                    output.append(buffer)
                    buffer = ""
            else:
                # No data available, small delay
                asyncio.get_event_loop().run_until_complete(asyncio.sleep(0.01))
        
        # Combine the output
        result = "".join(output)
        
        # Remove the command and prompt from the output
        result = result.replace(command + "\r\n", "", 1)
        result = self._prompt_re.sub("", result)
        
        return result
    
    def send_config(self, config_commands: List[str], timeout: Optional[int] = None) -> str:
        """
        Send configuration commands to the device.
        
        Args:
            config_commands: The configuration commands to send
            timeout: The timeout in seconds (optional)
            
        Returns:
            The configuration output as a string
            
        Raises:
            SSHError: If the configuration fails
        """
        if not self._connected:
            raise SSHError("Not connected")
        
        # Enter configuration mode
        if self.device_type in ["router", "switch"]:
            self.send_command("configure terminal", timeout)
        
        # Send configuration commands
        output = []
        for command in config_commands:
            output.append(self.send_command(command, timeout))
        
        # Exit configuration mode
        if self.device_type in ["router", "switch"]:
            self.send_command("end", timeout)
        
        # Combine the output
        return "\n".join(output)
    
    def get_info(self) -> Dict[str, Any]:
        """
        Get device information.
        
        Returns:
            A dictionary with device information
        """
        info = self._session.get_info()
        info["device_type"] = self.device_type
        info["prompt_pattern"] = self.prompt_pattern
        return info
    
    def is_connected(self) -> bool:
        """
        Check if the device is connected.
        
        Returns:
            True if connected, False otherwise
        """
        return self._connected and self._session.is_connected()
    
    def set_prompt_pattern(self, pattern: str) -> None:
        """
        Set the prompt pattern.
        
        Args:
            pattern: The prompt pattern as a regular expression
        """
        self.prompt_pattern = pattern
        self._prompt_re = re.compile(pattern)
    
    async def async_connect(self) -> None:
        """
        Connect to the device asynchronously.
        
        This method connects to the device and sends any initial commands
        required for the device type.
        
        Raises:
            SSHError: If the connection fails
        """
        if not self._connected:
            # Connect to the SSH server
            await self._session.async_connect()
            
            # Send initial commands
            for command in self.initial_commands:
                await self.async_send_command(command)
            
            self._connected = True
    
    async def async_disconnect(self) -> None:
        """Disconnect from the device asynchronously."""
        if self._connected:
            await self._session.async_disconnect()
            self._connected = False
    
    async def async_send_command(self, command: str, timeout: Optional[int] = None) -> str:
        """
        Send a command to the device and wait for the prompt asynchronously.
        
        Args:
            command: The command to send
            timeout: The timeout in seconds (optional)
            
        Returns:
            The command output as a string
            
        Raises:
            SSHError: If the command fails
        """
        if not self._connected:
            raise SSHError("Not connected")
        
        # Send the command
        await self._session.async_send_data(command + "\n")
        
        # Wait for the prompt
        timeout_ms = timeout * 1000 if timeout is not None else None
        output = []
        buffer = ""
        
        start_time = asyncio.get_event_loop().time() if timeout else None
        
        while True:
            # Check timeout
            if timeout and (asyncio.get_event_loop().time() - start_time) > timeout:
                raise SSHError(f"Command timed out: {command}")
            
            # Receive data
            data = await self._session.async_receive_data(timeout_ms=100)
            if data:
                # Convert to string
                data_str = data.decode("utf-8", errors="replace")
                
                # Append to buffer
                buffer += data_str
                
                # Check for prompt
                if self._prompt_re.search(buffer):
                    # Found prompt, add buffer to output
                    output.append(buffer)
                    break
                
                # Check if buffer is too large
                if len(buffer) > 4096:
                    # Buffer is too large, add to output and reset
                    output.append(buffer)
                    buffer = ""
            else:
                # No data available, small delay
                await asyncio.sleep(0.01)
        
        # Combine the output
        result = "".join(output)
        
        # Remove the command and prompt from the output
        result = result.replace(command + "\r\n", "", 1)
        result = self._prompt_re.sub("", result)
        
        return result
    
    async def async_send_config(self, config_commands: List[str], timeout: Optional[int] = None) -> str:
        """
        Send configuration commands to the device asynchronously.
        
        Args:
            config_commands: The configuration commands to send
            timeout: The timeout in seconds (optional)
            
        Returns:
            The configuration output as a string
            
        Raises:
            SSHError: If the configuration fails
        """
        if not self._connected:
            raise SSHError("Not connected")
        
        # Enter configuration mode
        if self.device_type in ["router", "switch"]:
            await self.async_send_command("configure terminal", timeout)
        
        # Send configuration commands
        output = []
        for command in config_commands:
            output.append(await self.async_send_command(command, timeout))
        
        # Exit configuration mode
        if self.device_type in ["router", "switch"]:
            await self.async_send_command("end", timeout)
        
        # Combine the output
        return "\n".join(output)