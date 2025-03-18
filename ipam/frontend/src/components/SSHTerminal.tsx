import { useEffect, useRef, useState } from 'react';
import { Box, LoadingOverlay, Text } from '@mantine/core';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';

interface SSHTerminalProps {
  deviceId: number;
  deviceName: string;
  onError?: (error: string) => void;
}

interface DeviceDetails {
  ip_address: string;
  username: string;
  password: string;
  enable_password?: string;
}

export function SSHTerminal({ deviceId, deviceName, onError }: SSHTerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const [terminal, setTerminal] = useState<Terminal | null>(null);
  const [fitAddon, setFitAddon] = useState<FitAddon | null>(null);
  const [websocket, setWebsocket] = useState<WebSocket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [deviceDetails, setDeviceDetails] = useState<DeviceDetails | null>(null);

  // Initialize terminal
  useEffect(() => {
    if (!terminalRef.current) return;

    try {
      console.log("Initializing terminal...");
      
      // Create terminal instance with explicit options
      const term = new Terminal({
        cursorBlink: true,
        fontSize: 14,
        fontFamily: 'Menlo, Monaco, "Courier New", monospace',
        theme: {
          background: '#000000',
          foreground: '#ffffff'
        },
        allowTransparency: false,
        disableStdin: false,  // Enable standard input handling
        convertEol: true,     // Convert \n to \r\n
        cols: 80,             // Set default dimensions
        rows: 24,
        scrollback: 1000,     // Scrollback buffer size
        tabStopWidth: 8,      // Tab width
        allowProposedApi: true // Allow proposed API
      });

      // Create fit addon
      const fit = new FitAddon();
      term.loadAddon(fit);

      // Open terminal
      term.open(terminalRef.current);
      console.log("Terminal opened");
      
      // Delay the fit operation to ensure the terminal is fully rendered
      setTimeout(() => {
        try {
          fit.fit();
          console.log("Terminal fitted successfully");
          
          // Focus the terminal after fitting
          term.focus();
          console.log("Terminal focused");
          
          // Write a message to indicate focus
          term.writeln('\r\n\x1b[33mTerminal focused. You should be able to type now.\x1b[0m');
        } catch (e) {
          console.error("Error fitting terminal:", e);
        }
      }, 100);

      // Store references
      setTerminal(term);
      setFitAddon(fit);

      // Initial message
      term.writeln('Connecting to device...');
      
      // Add a test message to verify terminal is working
      term.writeln('\r\nTerminal initialized. You should be able to type here.');
      term.writeln('If you can see this message but cannot type, there may be an issue with keyboard input.');
      term.writeln('\r\nPress any key to test input...\r\n');
      
      // Log terminal element details
      console.log("Terminal element:", terminalRef.current);
      console.log("Terminal instance:", term);

      // Cleanup on unmount
      return () => {
        try {
          term.dispose();
        } catch (e) {
          console.error("Error disposing terminal:", e);
        }
      };
    } catch (e) {
      console.error("Error initializing terminal:", e);
      setError("Failed to initialize terminal");
    }
  }, []);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (fitAddon && terminal) {
        try {
          fitAddon.fit();
          console.log("Terminal resized");
          
          // Send resize event to server if connected
          if (websocket && websocket.readyState === WebSocket.OPEN && terminal.rows && terminal.cols) {
            const dimensions = {
              type: 'resize',
              rows: terminal.rows,
              cols: terminal.cols
            };
            websocket.send(JSON.stringify(dimensions));
          }
        } catch (e) {
          console.error("Error resizing terminal:", e);
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [fitAddon, websocket, terminal]);

  // Connect to device
  useEffect(() => {
    async function connectToDevice() {
      try {
        setLoading(true);
        setError(null);

        // Import the API client
        const { apiClient } = await import('../api/client');

        // Get device connection details
        let deviceInfo;
        try {
          console.log(`Getting connection details for device ${deviceId}`);
          const response = await apiClient.get(`/devices/${deviceId}/connection-details`);
          deviceInfo = response.data;
          console.log("Got device connection details:", deviceInfo);
          
          // Store device details in state
          setDeviceDetails(deviceInfo);
        } catch (err) {
          console.error("Error getting device connection details:", err);
          throw new Error('Failed to get device connection details');
        }
        
        // Connect to the real device via WebSSH
        try {
          console.log("Connecting to device via WebSSH...");
          
          // Display detailed connection information in the terminal
          if (terminal && deviceInfo) {
            terminal.writeln(`\r\n\x1b[1;33m=== SSH Connection Details ===\x1b[0m`);
            terminal.writeln(`\r\n\x1b[1;36mDevice:\x1b[0m ${deviceName} (${deviceInfo.ip_address})`);
            terminal.writeln(`\x1b[1;36mUsername:\x1b[0m ${deviceInfo.username}`);
            terminal.writeln(`\x1b[1;36mPassword:\x1b[0m ${'*'.repeat(deviceInfo.password.length)}`);
            terminal.writeln(`\x1b[1;36mPort:\x1b[0m 22`);
            terminal.writeln(`\r\n\x1b[1;33mInitiating connection...\x1b[0m`);
          }
          
          // Connect to the WebSSH server via the backend proxy
          if (terminal) {
            terminal.writeln(`\r\n\x1b[90m> Sending connection request to backend proxy...\x1b[0m`);
          }
          
          const connectResponse = await apiClient.post('/devices/webssh/connect', {
            hostname: deviceInfo.ip_address,
            port: 22,
            username: deviceInfo.username,
            password: deviceInfo.password,
            device_type: 'router' // Assuming network devices
          });
          
          // Check if the connection was successful
          if (!connectResponse.data.success || !connectResponse.data.session_id) {
            const errorMessage = connectResponse.data.message || 'Failed to connect to device';
            if (terminal) {
              terminal.writeln(`\r\n\x1b[31mConnection failed: ${errorMessage}\x1b[0m`);
            }
            throw new Error(errorMessage);
          }
          
          // Get the session ID
          const sessionId = connectResponse.data.session_id;
          console.log("WebSSH connection successful, session ID:", sessionId);
          
          // Store the session ID
          setSessionId(sessionId);
          
          // Display session information
          if (terminal) {
            terminal.writeln(`\r\n\x1b[32mConnection established successfully!\x1b[0m`);
            terminal.writeln(`\x1b[90mSession ID: ${sessionId}\x1b[0m`);
            terminal.writeln(`\r\n\x1b[33mEstablishing WebSocket connection...\x1b[0m`);
          }
          
          // Connect to the WebSocket using the URL from the response
          const websocketUrl = connectResponse.data.websocket_url;
          console.log("Using WebSocket URL from response:", websocketUrl);
          connectWebSocket(sessionId, websocketUrl);
          
        } catch (err) {
          console.error("Error connecting to WebSSH server:", err);
          throw new Error(`Failed to connect to device: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
        
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        if (onError) onError(errorMessage);
        if (terminal) {
          terminal.writeln(`\r\nError: ${errorMessage}`);
        }
      } finally {
        setLoading(false);
      }
    }

    if (terminal && deviceId) {
      connectToDevice();
    }

    // Cleanup WebSocket on unmount
    return () => {
      if (websocket) {
        websocket.close();
      }
    };
  }, [deviceId, terminal, onError]);

  // Connect WebSocket
  const connectWebSocket = (sessionId: string, websocketUrl?: string) => {
      if (!terminal) return;
      
      // Use the WebSocket URL from the parameter or fallback to default
      const wsUrl = websocketUrl || `ws://localhost:8000/ws/${sessionId}`;
      
      console.log("Connecting to WebSocket URL:", wsUrl);
      
      if (terminal) {
          terminal.writeln(`\r\n\x1b[90m> Connecting to WebSocket: ${wsUrl}\x1b[0m`);
          
          // Debug messages in console only
          console.log("Terminal is ready to receive data");
          console.log("If you don't see a prompt, there might be an issue with the WebSocket connection");
      }
    
    try {
        const ws = new WebSocket(wsUrl);
        
        // Set up event listener for connection open
        ws.addEventListener('open', () => {
          console.log("WebSocket connection opened successfully");
          terminal.writeln(`\r\n\x1b[32mWebSocket connection established!\x1b[0m`);
        });
      
      ws.onopen = () => {
        terminal.writeln(`\r\n\x1b[32mWebSocket connection established!\x1b[0m`);
        terminal.writeln(`\x1b[33mYou are now connected to ${deviceName} (${deviceDetails?.ip_address || 'unknown'})\x1b[0m`);
        terminal.writeln(`\x1b[90m---------------------------------------------\x1b[0m\r\n`);
        
        // Send initial terminal size
        if (terminal && terminal.rows && terminal.cols) {
          const dimensions = {
            type: 'resize',
            rows: terminal.rows,
            cols: terminal.cols
          };
          ws.send(JSON.stringify(dimensions));
        }
        
        // We need to debounce the input to prevent multiple messages for the same input
        let inputQueue: string[] = [];
        let processingInput = false;
        
        // Handle terminal input
        terminal.onData((data: string) => {
          if (ws && ws.readyState === WebSocket.OPEN) {
            console.log("Terminal input:", data);
            console.log("Terminal input:", data, data.split('').map(c => c.charCodeAt(0)));
            
            // Add the data to the queue
            inputQueue.push(data);
            
            // Process the queue if not already processing
            if (!processingInput) {
              processingInput = true;
              processInputQueue();
            }
          }
        });
        
        // Process the input queue with a small delay to prevent multiple messages
        function processInputQueue() {
          if (inputQueue.length > 0) {
            const data = inputQueue.shift() as string;
            
            try {
              // Handle Enter key specially to avoid double prompts
              if (data === "\r") {
                ws.send(JSON.stringify({
                  type: 'input',
                  data: "\r"
                }));
              } else {
                // Send other data normally
                ws.send(JSON.stringify({
                  type: 'input',
                  data: data
                }));
              }
            } catch (e) {
              console.error("Error sending input:", e);
            }
            
            // Process the next item in the queue after a small delay
            setTimeout(processInputQueue, 10);
          } else {
            processingInput = false;
          }
        }
      };
      
      ws.onmessage = (event) => {
        const data = event.data;
        console.log("WebSocket message received:", typeof data, data instanceof Blob ? "Blob" : data);
        
        if (data instanceof Blob) {
          const reader = new FileReader();
          reader.onload = () => {
            const arrayBuffer = reader.result as ArrayBuffer;
            const textData = new TextDecoder().decode(arrayBuffer);
            console.log("Blob decoded:", textData);
            
            // Write the data to the terminal
            terminal.write(textData);
          };
          reader.readAsArrayBuffer(data);
        } else if (typeof data === 'string') {
          console.log("String data received:", data);
          
          try {
            // Try to parse as JSON first
            const jsonData = JSON.parse(data);
            console.log("Parsed JSON data:", jsonData);
            
            if (jsonData.type === 'output') {
              terminal.write(jsonData.data);
            } else if (jsonData.type === 'error') {
              terminal.writeln(`\r\n\x1b[31mError: ${jsonData.message}\x1b[0m`);
            } else {
              // For any other JSON format, try to extract data if present
              if (jsonData.data) {
                terminal.write(jsonData.data);
              } else {
                // If no data field, write the entire JSON as string
                terminal.write(data);
              }
            }
          } catch (e) {
            // Not JSON, write as plain text
            console.log("Plain text data:", data);
            terminal.write(data);
          }
        } else {
          console.log("Unknown data type:", typeof data);
          terminal.write(String(data));
        }
        
        // Force the terminal to update
        terminal.refresh(0, terminal.rows - 1);
      };
      
      ws.onclose = () => {
        terminal.write('\r\n\nConnection closed\r\n');
      };
      
      ws.onerror = (error) => {
        const errorMessage = 'WebSocket error occurred';
        terminal.writeln(`\r\n\x1b[31mWebSocket error: ${error.type}\x1b[0m`);
        terminal.writeln(`\r\n\x1b[33mTroubleshooting tips:\x1b[0m`);
        terminal.writeln(`\x1b[90m1. Check if the WebSSH server is running\x1b[0m`);
        terminal.writeln(`\x1b[90m2. Verify the device is reachable\x1b[0m`);
        terminal.writeln(`\x1b[90m3. Check if the session ID is valid\x1b[0m`);
        terminal.writeln(`\x1b[90m4. Try reconnecting to the device\x1b[0m`);
        
        setError(errorMessage);
        if (onError) onError(errorMessage);
        console.error('WebSocket error:', error);
      };
      
      setWebsocket(ws);
      
    } catch (error) {
      const errorMessage = `Failed to create WebSocket connection: ${error instanceof Error ? error.message : 'Unknown error'}`;
      terminal.write(`\r\n\n${errorMessage}\r\n`);
      setError(errorMessage);
      if (onError) onError(errorMessage);
      console.error('WebSocket creation error:', error);
    }
  };

  return (
    <Box 
      pos="relative" 
      h={400} 
      style={{ 
        borderRadius: '5px', 
        overflow: 'hidden',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
      }}
    >
      <LoadingOverlay visible={loading} />
      {error && (
        <Box p="xs" bg="red.1" c="red.8" style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }}>
          <Text size="sm">{error}</Text>
        </Box>
      )}
      <div 
        ref={terminalRef} 
        style={{ 
          width: '100%', 
          height: '100%', 
          backgroundColor: 'black',
          cursor: 'text'
        }} 
        onClick={() => terminal?.focus()}
      />
    </Box>
  );
}
