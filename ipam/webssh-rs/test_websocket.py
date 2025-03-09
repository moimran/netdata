#!/usr/bin/env python3
"""
Test script to connect to the WebSSH server's WebSocket and print all received messages.
This script will:
1. Connect to the WebSSH server via the API
2. Establish a WebSocket connection
3. Print all messages received from the WebSocket
"""

import asyncio
import json
import sys
import websockets
import requests
import time
import signal

# Configuration
WEBSSH_HOST = "localhost"
WEBSSH_PORT = 8888
SSH_HOST = "192.168.1.25"  # Change this to your target SSH server
SSH_PORT = 22
SSH_USERNAME = "admin"     # Change this to your SSH username
SSH_PASSWORD = "moimran@123"  # Change this to your SSH password

# Signal handler for graceful shutdown
should_exit = False

def signal_handler(sig, frame):
    global should_exit
    print("\nShutting down...")
    should_exit = True

signal.signal(signal.SIGINT, signal_handler)

async def test_websocket():
    print(f"Connecting to WebSSH server at http://{WEBSSH_HOST}:{WEBSSH_PORT}")
    
    # Step 1: Connect to the WebSSH server via the API
    try:
        print("Sending connection request to API...")
        response = requests.post(
            f"http://{WEBSSH_HOST}:{WEBSSH_PORT}/connect",
            json={
                "hostname": SSH_HOST,
                "port": SSH_PORT,
                "username": SSH_USERNAME,
                "password": SSH_PASSWORD
            },
            headers={"Content-Type": "application/json"}
        )
        
        # Check if the response is valid
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
        
    except requests.RequestException as e:
        print(f"Error connecting to API: {e}")
        return
    
    # Step 2: Connect to the WebSocket
    ws_url = f"ws://{WEBSSH_HOST}:{WEBSSH_PORT}/ws/{session_id}"
    print(f"Connecting to WebSocket at {ws_url}")
    
    try:
        async with websockets.connect(ws_url) as websocket:
            print("WebSocket connection established!")
            
            # Send initial terminal size
            print("Sending terminal size...")
            await websocket.send(json.dumps({
                "type": "resize",
                "rows": 24,
                "cols": 80
            }))
            
            # Send a test message
            print("Sending test message...")
            await websocket.send(json.dumps({
                "type": "test",
                "message": "Hello from test script"
            }))
            
            # Send a newline to trigger a prompt
            print("Sending newline to trigger prompt...")
            await websocket.send("\n")
            
            # Receive and print messages
            print("\n--- Waiting for messages from WebSocket ---")
            print("(Press Ctrl+C to exit)")
            
            while not should_exit:
                try:
                    # Set a timeout to allow checking the should_exit flag
                    message = await asyncio.wait_for(websocket.recv(), timeout=1.0)
                    
                    # Print message type and preview
                    if isinstance(message, bytes):
                        print(f"\nReceived binary data ({len(message)} bytes):")
                        try:
                            text = message.decode('utf-8')
                            print(f"Decoded as UTF-8: {text[:100]}{'...' if len(text) > 100 else ''}")
                        except UnicodeDecodeError:
                            print(f"Binary data (not UTF-8 decodable): {message[:20]}...")
                    else:
                        print(f"\nReceived text data ({len(message)} chars):")
                        print(f"Text: {message[:100]}{'...' if len(message) > 100 else ''}")
                        
                        # Try to parse as JSON
                        try:
                            json_data = json.loads(message)
                            print(f"Parsed as JSON: {json.dumps(json_data, indent=2)}")
                        except json.JSONDecodeError:
                            pass
                
                except asyncio.TimeoutError:
                    # This is expected, just continue the loop
                    continue
                except websockets.exceptions.ConnectionClosed:
                    print("WebSocket connection closed")
                    break
                except Exception as e:
                    print(f"Error receiving message: {e}")
                    break
    
    except websockets.exceptions.WebSocketException as e:
        print(f"WebSocket error: {e}")
    except Exception as e:
        print(f"Unexpected error: {e}")

if __name__ == "__main__":
    asyncio.run(test_websocket())
