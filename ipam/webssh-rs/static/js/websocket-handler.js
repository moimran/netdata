// Connect to WebSocket
function connectWebSocket(sessionId) {
    if (ws) {
        ws.close();
    }
    
    currentSessionId = sessionId;
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/${sessionId}`;
    
    term.writeln(`\x1b[1;34mConnecting to WebSocket: ${wsUrl}\x1b[0m`);
    
    ws = new WebSocket(wsUrl);
    
    // Set binary type to arraybuffer for better performance
    ws.binaryType = 'arraybuffer';
    
    ws.onopen = () => {
        term.writeln('\x1b[1;32mWebSocket connection established\x1b[0m');
        
        // Send terminal size
        const dimensions = { 
            type: 'resize',
            rows: term.rows,
            cols: term.cols
        };
        ws.send(JSON.stringify(dimensions));
        
        // Apply fit again after connection to ensure correct size
        // But don't reset the terminal as that would clear the login banner
        setTimeout(() => {
            if (fitAddon) {
                // Store current dimensions before fitting
                const prevRows = term.rows;
                const prevCols = term.cols;
                
                // Apply fit
                fitAddon.fit();
                
                // Only send resize if dimensions actually changed
                if (prevRows !== term.rows || prevCols !== term.cols) {
                    ws.send(JSON.stringify({
                        type: 'resize',
                        cols: term.cols,
                        rows: term.rows
                    }));
                }
            }
        }, 500);
        
        // Focus the terminal so user can start typing immediately
        term.focus();
        
        // Handle terminal input with debouncing
        let inputQueue = [];
        let processingInput = false;
        
        term.onData(data => {
            if (ws && ws.readyState === WebSocket.OPEN) {
                // Check for special local commands first
                if (data === '\r' && inputQueue.length > 0) {
                    // User pressed Enter, check if it's a special command
                    const fullCommand = inputQueue.join('');
                    if (handleSpecialCommands && handleSpecialCommands(fullCommand)) {
                        // Command was handled locally, clear the queue and don't send to server
                        inputQueue = [];
                        return;
                    }
                }

                // Add the data to the queue
                inputQueue.push(data);
                console.log('Input queued:', data);

                // Process the queue if not already processing
                if (!processingInput) {
                    processingInput = true;
                    processInputQueue();
                }
                
                // For certain commands that need special handling
                if (data.includes('top') || data.includes('htop') || data.includes('vi') || data.includes('vim') || data.includes('less') || data.includes('more')) {
                    console.log('Special command detected, scheduling extra refresh');
                    // Force additional refreshes for these commands
                    setTimeout(() => { term.refresh(0, term.rows - 1); }, 100);
                    setTimeout(() => { term.refresh(0, term.rows - 1); }, 500);
                    setTimeout(() => { term.refresh(0, term.rows - 1); }, 1000);
                    
                    // For top command specifically, set up a recurring refresh
                    if (data.includes('top')) {
                        console.log('Top command detected, setting up recurring refresh');
                        // Clear any existing refresh interval for top
                        if (window.topRefreshInterval) {
                            clearInterval(window.topRefreshInterval);
                        }
                        
                        // Create a new refresh interval specifically for top
                        window.topRefreshInterval = setInterval(() => {
                            if (term && document.hasFocus()) {
                                term.refresh(0, term.rows - 1);
                            }
                        }, 1000); // Refresh every second for top command
                        
                        // Listen for potential exit of top command
                        const checkForTopExit = (e) => {
                            if (e.key === 'q' || e.key === 'Escape' || e.key === 'c' && e.ctrlKey) {
                                // User likely exited top, clear the interval after a delay
                                setTimeout(() => {
                                    if (window.topRefreshInterval) {
                                        clearInterval(window.topRefreshInterval);
                                        window.topRefreshInterval = null;
                                        console.log('Cleared top command refresh interval');
                                    }
                                }, 500);
                            }
                        };
                        
                        // Add and then remove the listener after a delay
                        document.addEventListener('keydown', checkForTopExit);
                        setTimeout(() => {
                            document.removeEventListener('keydown', checkForTopExit);
                        }, 30000); // Remove after 30 seconds to avoid memory leaks
                    }
                }
            }
        });
        
        // Process the input queue with a small delay to prevent multiple messages
        function processInputQueue() {
            if (inputQueue.length > 0) {
                const data = inputQueue.shift();
                
                // Send the data to the server
                console.log('Sending input to server:', data);
                ws.send(JSON.stringify({
                    type: 'input',
                    data: data
                }));
                
                // Process the next item in the queue after a small delay
                setTimeout(processInputQueue, 10);
            } else {
                processingInput = false;
            }
        }
        
        // Add key handling for special keys
        term.attachCustomKeyEventHandler(function(event) {
            // Handle Ctrl+C and other special key combinations
            if (event.ctrlKey && event.key === 'c' && event.type === 'keydown') {
                // Force a refresh after Ctrl+C to ensure terminal state is updated
                setTimeout(() => {
                    term.refresh(0, term.rows - 1);
                }, 100);
            }
            return true; // Allow the default handler to process the event
        });
        
        // Initialize terminal with proper settings for escape sequences
        // We'll do this only once before the connection is established
        function initializeTerminal() {
            // Only clear and reset the terminal BEFORE connection, not after
            if (!ws || ws.readyState !== WebSocket.OPEN) {
                // Clear the terminal first to remove any artifacts
                term.clear();
                
                // Send sequences to reset terminal state
                term.write('\u001bc'); // Full terminal reset (RIS - Reset to Initial State)
                term.write('\u001b[0m'); // Reset all attributes
                term.write('\u001b[?25h'); // Show cursor
            }
            
            // Focus the terminal
            term.focus();
            
            // Don't send an initial Enter key - let the user do it
            // This helps prevent control sequence issues at login
            console.log('Terminal initialized and ready for input');
        }
        
        // Call the initialization immediately to prepare the terminal
        initializeTerminal();
        
        // We don't need to call it again after connection is established
        // This prevents clearing the screen after login
        
        // Set up a connection health check
        // This will help detect and recover from stuck sessions
        const healthCheckInterval = setInterval(() => {
            if (ws && ws.readyState === WebSocket.OPEN) {
                // Send a ping message to keep the connection alive
                ws.send(JSON.stringify({ type: 'ping' }));
                
                // Check if we've received any data in the last 30 seconds
                const now = Date.now();
                if (window.lastMessageTime && (now - window.lastMessageTime > 30000)) {
                    console.log('No data received for 30 seconds, refreshing terminal');
                    // Force a terminal refresh
                    term.refresh(0, term.rows - 1);
                    
                    // If still no data after 60 seconds, consider reconnecting
                    if (window.lastMessageTime && (now - window.lastMessageTime > 60000)) {
                        console.log('Connection may be stuck, attempting to reconnect');
                        clearInterval(healthCheckInterval);
                        
                        // Try to reconnect
                        if (currentSessionId) {
                            ws.close();
                            setTimeout(() => {
                                term.writeln('\x1b[1;33mConnection appears to be stuck, reconnecting...\x1b[0m');
                                connectWebSocket(currentSessionId);
                            }, 1000);
                        }
                    }
                }
            } else {
                // WebSocket is closed or closing, clear the interval
                clearInterval(healthCheckInterval);
            }
        }, 10000); // Check every 10 seconds
        
        // Store the interval ID for cleanup
        window.healthCheckInterval = healthCheckInterval;
    };
    
    ws.onmessage = (event) => {
        console.log('WebSocket message received:', event.data);
        
        // Update the last message time for health check system
        window.lastMessageTime = Date.now();
        
        const data = event.data;
        if (data instanceof ArrayBuffer) {
            // Handle binary data as ArrayBuffer (faster)
            console.log('Binary data received (ArrayBuffer)');
            const uint8Data = new Uint8Array(data);
            term.write(uint8Data);
            
            // Force a refresh after receiving data to ensure display is updated
            // This helps with commands like 'top' that use cursor positioning
            term.refresh(0, term.rows - 1);
        } else if (data instanceof Blob) {
            // Handle binary data as Blob (fallback)
            const reader = new FileReader();
            reader.onload = () => {
                console.log('Binary data received (Blob)');
                const uint8Data = new Uint8Array(reader.result);
                term.write(uint8Data);
                
                // Force a refresh after receiving data
                term.refresh(0, term.rows - 1);
            };
            reader.readAsArrayBuffer(data);
        } else {
            try {
                // Check if it's a JSON message
                const jsonData = JSON.parse(data);
                console.log('JSON data received:', jsonData);
                
                if (jsonData.type === 'output') {
                    console.log('Terminal output received:', jsonData.data);
                    term.write(jsonData.data);
                    
                    // Force a refresh after receiving output
                    term.refresh(0, term.rows - 1);
                } else if (jsonData.type === 'error') {
                    showError(jsonData.data);
                } else if (jsonData.type === 'status' && jsonData.status === 'disconnected') {
                    // Handle disconnection status
                    term.write('\r\n\nDisconnected from device\r\n');
                } else if (jsonData.type === 'refresh') {
                    // Handle refresh notification from server
                    console.log('Received refresh notification, refreshing terminal display');
                    
                    // For full-screen applications, do a more thorough refresh
                    if (jsonData.fullscreen) {
                        console.log('Refreshing full-screen application');
                        // Clear selection to ensure cursor is visible
                        term.clearSelection();
                        
                        // Schedule multiple refreshes to ensure display is updated
                        setTimeout(() => { term.refresh(0, term.rows - 1); }, 10);
                        setTimeout(() => { term.refresh(0, term.rows - 1); }, 100);
                        setTimeout(() => { term.refresh(0, term.rows - 1); }, 500);
                    } else {
                        // Standard refresh
                        term.refresh(0, term.rows - 1);
                    }
                } else if (jsonData.type === 'info') {
                    // Display informational messages
                    console.log('Server info:', jsonData.message);
                } else {
                    console.log('Unknown message type:', jsonData.type);
                }
            } catch (e) {
                // Not JSON, just write the data directly
                console.log('Raw text data received:', data);
                term.write(data);
                
                // Force a refresh after receiving text data
                term.refresh(0, term.rows - 1);
            }
        }
    };
    
    ws.onclose = () => {
        term.writeln('\x1b[1;31mWebSocket connection closed\x1b[0m');
        
        // Update UI elements
        document.getElementById('device-hostname').textContent = 'Not connected';
        document.getElementById('connection-username').textContent = 'Not connected';
        document.getElementById('session-id').textContent = 'Not connected';
        
        // Clear terminal
        term.clear();
        term.writeln('Connection closed');
        
        ws = null;
        currentSessionId = null;
    };
    
    ws.onerror = (error) => {
        showError('WebSocket error: ' + (error.message || 'Connection failed'));
        
        // Check if the error might be due to a session not found
        fetch(`/api/session/${sessionId}/status`)
            .then(response => response.json())
            .then(data => {
                if (data.status === 'not_found') {
                    term.writeln('\r\n\x1b[1;31mSession not found. The SSH connection may have failed or the session expired.\x1b[0m');
                    term.writeln('\r\n\x1b[1;33mPlease check if the SSH server is running and accessible.\x1b[0m');
                }
            })
            .catch(err => {
                console.error('Failed to check session status:', err);
            });
    };
}

// Check session status and connect
function checkSessionAndConnect(sessionId) {
    term.writeln(`\x1b[1;34mChecking session status for: ${sessionId}\x1b[0m`);
    
    fetch(`/api/session/${sessionId}/status`)
        .then(response => response.json())
        .then(data => {
            if (data.status === 'active') {
                // Update UI elements
                document.getElementById('device-hostname').textContent = data.hostname;
                document.getElementById('connection-username').textContent = data.username;
                document.getElementById('session-id').textContent = sessionId;
                
                // Connect WebSocket
                connectWebSocket(sessionId);
            } else if (data.status === 'closed') {
                showError('Session is closed');
            } else if (data.status === 'not_found') {
                showError('Session not found');
            } else {
                showError('Unknown session status: ' + data.status);
            }
        })
        .catch(error => {
            showError('Failed to check session status: ' + error.message);
        });
}