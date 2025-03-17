"""
High-level SSH session interface.

This module provides a more Pythonic interface on top of the Rust bindings.
"""

import asyncio
import contextlib
import logging
from typing import Optional, Union, Dict, Any, List, Tuple

try:
    from .webssh_rs import SSHSession as RustSSHSession, SSHError
except ImportError:
    # For development/documentation without the Rust module
    class RustSSHSession:
        """Placeholder for RustSSHSession when the module is not available."""
        pass
    
    class SSHError(Exception):
        """Placeholder for SSHError when the module is not available."""
        pass

logger = logging.getLogger(__name__)

class SSHSession:
    """
    High-level SSH session interface.
    
    This class provides a more Pythonic interface on top of the Rust bindings.
    It includes context manager support and async methods for use with asyncio.
    """
    
    def __init__(
        self,
        hostname: str,
        port: int = 22,
        username: str = None,
        password: Optional[str] = None,
        private_key: Optional[str] = None,
        device_type: Optional[str] = None,
        timeout: int = 30,
    ):
        """
        Initialize an SSH session.
        
        Args:
            hostname: The hostname or IP address to connect to
            port: The port to connect to (default: 22)
            username: The username to authenticate with
            password: The password to authenticate with (optional)
            private_key: The private key to authenticate with (optional)
            device_type: The type of device to connect to (optional)
            timeout: The timeout in seconds (default: 30)
        """
        self._session = RustSSHSession(
            hostname=hostname,
            port=port,
            username=username,
            password=password,
            private_key=private_key,
            device_type=device_type,
        )
        self._timeout = timeout
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
        Connect to the SSH server.
        
        Raises:
            SSHError: If the connection fails
        """
        if not self._connected:
            self._session.connect()
            self._connected = True
    
    def disconnect(self) -> None:
        """Disconnect from the SSH server."""
        if self._connected:
            self._session.disconnect()
            self._connected = False
    
    def send_data(self, data: Union[str, bytes]) -> None:
        """
        Send data to the SSH session.
        
        Args:
            data: The data to send (string or bytes)
            
        Raises:
            SSHError: If the send fails
        """
        if not self._connected:
            raise SSHError("Not connected")
        
        if isinstance(data, str):
            data = data.encode()
        
        self._session.send_data(data)
    
    def receive_data(self, timeout_ms: Optional[int] = None) -> Optional[bytes]:
        """
        Receive data from the SSH session.
        
        Args:
            timeout_ms: The timeout in milliseconds (optional)
            
        Returns:
            The received data as bytes, or None if no data is available
            
        Raises:
            SSHError: If the receive fails
        """
        if not self._connected:
            raise SSHError("Not connected")
        
        return self._session.receive_data(timeout_ms)
    
    def resize_terminal(self, rows: int, cols: int) -> None:
        """
        Resize the terminal.
        
        Args:
            rows: The number of rows
            cols: The number of columns
            
        Raises:
            SSHError: If the resize fails
        """
        if not self._connected:
            raise SSHError("Not connected")
        
        self._session.resize_terminal(rows, cols)
    
    def get_info(self) -> Dict[str, Any]:
        """
        Get session information.
        
        Returns:
            A dictionary with session information
        """
        return self._session.get_info()
    
    def is_connected(self) -> bool:
        """
        Check if the session is connected.
        
        Returns:
            True if connected, False otherwise
        """
        return self._connected and self._session.is_connected()
    
    def send_command(self, command: str, timeout: Optional[int] = None) -> str:
        """
        Send a command and wait for the response.
        
        This is a convenience method that sends a command and waits for the response.
        It's not suitable for interactive commands.
        
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
        self.send_data(command + "\n")
        
        # Wait for the response
        timeout_ms = timeout * 1000 if timeout is not None else None
        output = []
        
        while True:
            data = self.receive_data(timeout_ms=100)
            if data:
                output.append(data)
            else:
                # No more data available
                break
        
        # Combine the output
        return b"".join(output).decode("utf-8", errors="replace")
    
    async def async_connect(self) -> None:
        """
        Connect to the SSH server asynchronously.
        
        Raises:
            SSHError: If the connection fails
        """
        if not self._connected:
            await asyncio.to_thread(self.connect)
    
    async def async_disconnect(self) -> None:
        """Disconnect from the SSH server asynchronously."""
        if self._connected:
            await asyncio.to_thread(self.disconnect)
    
    async def async_send_data(self, data: Union[str, bytes]) -> None:
        """
        Send data to the SSH session asynchronously.
        
        Args:
            data: The data to send (string or bytes)
            
        Raises:
            SSHError: If the send fails
        """
        if not self._connected:
            raise SSHError("Not connected")
        
        if isinstance(data, str):
            data = data.encode()
        
        await asyncio.to_thread(self._session.send_data, data)
    
    async def async_receive_data(self, timeout_ms: Optional[int] = None) -> Optional[bytes]:
        """
        Receive data from the SSH session asynchronously.
        
        Args:
            timeout_ms: The timeout in milliseconds (optional)
            
        Returns:
            The received data as bytes, or None if no data is available
            
        Raises:
            SSHError: If the receive fails
        """
        if not self._connected:
            raise SSHError("Not connected")
        
        return await asyncio.to_thread(self._session.receive_data, timeout_ms)
    
    async def async_resize_terminal(self, rows: int, cols: int) -> None:
        """
        Resize the terminal asynchronously.
        
        Args:
            rows: The number of rows
            cols: The number of columns
            
        Raises:
            SSHError: If the resize fails
        """
        if not self._connected:
            raise SSHError("Not connected")
        
        await asyncio.to_thread(self._session.resize_terminal, rows, cols)
    
    @contextlib.asynccontextmanager
    async def async_session(self):
        """
        Async context manager for SSH sessions.
        
        Example:
            ```python
            async with ssh.async_session() as session:
                await session.async_send_data("ls -la\n")
            ```
        """
        try:
            await self.async_connect()
            yield self
        finally:
            await self.async_disconnect()
    
    async def async_send_command(self, command: str, timeout: Optional[int] = None) -> str:
        """
        Send a command and wait for the response asynchronously.
        
        This is a convenience method that sends a command and waits for the response.
        It's not suitable for interactive commands.
        
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
        await self.async_send_data(command + "\n")
        
        # Wait for the response
        timeout_ms = timeout * 1000 if timeout is not None else None
        output = []
        
        while True:
            data = await self.async_receive_data(timeout_ms=100)
            if data:
                output.append(data)
            else:
                # No more data available
                break
        
        # Combine the output
        return b"".join(output).decode("utf-8", errors="replace")