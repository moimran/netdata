#!/usr/bin/env python3
"""
Test script to directly test the WebSocket connection to the backend server.
This script will:
1. Connect to the backend WebSocket endpoint
2. Send test messages
3. Print all received messages
"""

import asyncio
import json
import sys
import websockets
import signal

# Configuration
BACKEND_HOST = "localhost"
BACKEND_PORT = 9001
WEBSSH_HOST = "localhost"
WEBSSH_PORT = 8888
SESSION_ID = "test-session-123"  # Use a test session ID

# Signal handler for graceful shutdown
should_exit = False

def signal_handler(sig, frame):
    global should_exit
    print("\nShutting down...")
    should_exit = True

signal.signal(signal.SIGINT, signal_handler)

async def test_websocket_direct():
    print(f"Connecting directly to WebSSH server at ws://{WEBSSH_HOST}:{WEBSSH_PORT}/ws/{SESSION_ID}")
    
    try:
        # First create a session by calling the connect API
        import requests
        
        print("Creating a session via the connect API...")
        response = requests.post(
            f"http://{WEBSSH_HOST}:{WEBSSH_PORT}/connect",
            json={
                "hostname": "192.168.1.25",
                "port": 22,
                "username": "admin",
                "password": "moimran@123"
            },
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code != 200:
            print(f"Error: API returned status code {response.status_code}")
            print(f"Response: {response.text}")
            return
        
        # Parse the response
        try:
            data = response.json()
            print(f"API response: {json.dumps(data, indent=2)}")
            
            if not data.get("success", False):
                print(f"Error: Connection failed - {data.get('message', 'Unknown error')}")
                return
            
            session_id = data.get("session_id")
            if not session_id:
                print("Error: No session ID in response")
                return
            
            print(f"Connection successful! Session ID: {session_id}")
            
        except ValueError:
            print(f"Error: Invalid JSON response - {response.text}")
            return
        
        # Connect to the WebSocket using the session ID from the API
        print(f"Connecting to WebSocket at ws://{WEBSSH_HOST}:{WEBSSH_PORT}/ws/{session_id}")
        async with websockets.connect(f"ws://{WEBSSH_HOST}:{WEBSSH_PORT}/ws/{session_id}") as ws:
            print("WebSocket connection established!")
            
            # Send test messages
            test_messages = [
                json.dumps({"type": "input", "data": "test\n"}),
                json.dumps({"type": "input", "data": "ls -la\n"}),
                json.dumps({"type": "input", "data": "echo hello\n"}),
                "\r",  # Raw CR
                "\n",  # Raw LF
                "\r\n"  # Raw CRLF
            ]
            
            for msg in test_messages:
                print(f"\nSending message: {msg}")
                await ws.send(msg)
                print("Message sent!")
                
                # Wait for a response
                try:
                    response = await asyncio.wait_for(ws.recv(), timeout=2.0)
                    print(f"Received response: {response}")
                except asyncio.TimeoutError:
                    print("No response received (timeout)")
                
                # Wait a bit before sending the next message
                await asyncio.sleep(1)
            
            # Keep the connection open and print any received messages
            print("\nListening for messages (press Ctrl+C to exit)...")
            while not should_exit:
                try:
                    message = await asyncio.wait_for(ws.recv(), timeout=1.0)
                    print(f"Received message: {message}")
                except asyncio.TimeoutError:
                    # This is expected, just continue the loop
                    pass
                except websockets.exceptions.ConnectionClosed:
                    print("WebSocket connection closed")
                    break
    
    except websockets.exceptions.WebSocketException as e:
        print(f"WebSocket error: {e}")
    except Exception as e:
        print(f"Unexpected error: {e}")

async def test_backend_websocket():
    print(f"Connecting to backend WebSocket at ws://{BACKEND_HOST}:{BACKEND_PORT}/api/v1/devices/webssh/ws/{SESSION_ID}")
    
    try:
        # Connect to the backend WebSocket
        async with websockets.connect(f"ws://{BACKEND_HOST}:{BACKEND_PORT}/api/v1/devices/webssh/ws/{SESSION_ID}") as ws:
            print("Backend WebSocket connection established!")
            
            # Send test messages
            test_messages = [
                json.dumps({"type": "input", "data": "test\n"}),
                json.dumps({"type": "input", "data": "ls -la\n"}),
                json.dumps({"type": "input", "data": "echo hello\n"}),
                "\r",  # Raw CR
                "\n",  # Raw LF
                "\r\n"  # Raw CRLF
            ]
            
            for msg in test_messages:
                print(f"\nSending message: {msg}")
                await ws.send(msg)
                print("Message sent!")
                
                # Wait for a response
                try:
                    response = await asyncio.wait_for(ws.recv(), timeout=2.0)
                    print(f"Received response: {response}")
                except asyncio.TimeoutError:
                    print("No response received (timeout)")
                
                # Wait a bit before sending the next message
                await asyncio.sleep(1)
            
            # Keep the connection open and print any received messages
            print("\nListening for messages (press Ctrl+C to exit)...")
            while not should_exit:
                try:
                    message = await asyncio.wait_for(ws.recv(), timeout=1.0)
                    print(f"Received message: {message}")
                except asyncio.TimeoutError:
                    # This is expected, just continue the loop
                    pass
                except websockets.exceptions.ConnectionClosed:
                    print("WebSocket connection closed")
                    break
    
    except websockets.exceptions.WebSocketException as e:
        print(f"WebSocket error: {e}")
    except Exception as e:
        print(f"Unexpected error: {e}")

if __name__ == "__main__":
    print("Choose a test to run:")
    print("1. Test direct connection to WebSSH server")
    print("2. Test connection through backend proxy")
    choice = input("Enter your choice (1 or 2): ")
    
    if choice == "1":
        asyncio.run(test_websocket_direct())
    elif choice == "2":
        asyncio.run(test_backend_websocket())
    else:
        print("Invalid choice")
