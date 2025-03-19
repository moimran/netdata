// Terminal variables
let term = null;
let ws = null;
let fitAddon = null;
let currentSessionId = null;
let isApiConnection = false;

// Show error message
function showError(message) {
    const errorDiv = document.getElementById('error-message');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
}

function loadTerminal() {
    return new Promise((resolve, reject) => {
        try {
            console.log('Initializing terminal...');
            
            // Check if xterm.js is loaded
            if (typeof Terminal === 'undefined') {
                console.error('Terminal is undefined');
                throw new Error('xterm.js not loaded');
            }
            
            // Check if FitAddon is loaded
            if (typeof FitAddon === 'undefined') {
                console.error('FitAddon is undefined');
                throw new Error('xterm-addon-fit not loaded');
            }

            // Dispose existing terminal if it exists
            if (term) {
                console.log('Disposing existing terminal');
                term.dispose();
            }

            console.log('Creating new terminal instance');
            // Initialize terminal with simpler options first
            term = new Terminal({
                cursorBlink: true,
                fontSize: 16,
                fontFamily: 'monospace',
                rows: 24,
                cols: 80,
                theme: {
                    background: '#000000',
                    foreground: '#ffffff'
                }
            });

            console.log('Creating fit addon');
            // Create and load FitAddon
            fitAddon = new FitAddon.FitAddon();
            term.loadAddon(fitAddon);

            console.log('Getting terminal element');
            const terminalElement = document.getElementById('terminal');
            if (!terminalElement) {
                console.error('Terminal element not found');
                throw new Error('Terminal element not found');
            }
            
            console.log('Opening terminal');
            // Open terminal
            term.open(terminalElement);
            
            console.log('Fitting terminal');
            // Fit terminal to container
            setTimeout(() => {
                try {
                    fitAddon.fit();
                    console.log('Terminal fitted');
                } catch (e) {
                    console.error('Error fitting terminal:', e);
                }
            }, 100);
            
            // Update UI elements
            document.getElementById('device-hostname').textContent = 'Terminal Ready';
            document.getElementById('connection-username').textContent = 'System';
            document.getElementById('session-id').textContent = 'Local Session';
            
            // Write welcome message
            console.log('Writing welcome message');
            term.write('\x1b[1;32m'); // Bright green text
            term.writeln('Welcome to IPAM Terminal');
            term.writeln('Terminal initialized and ready for use');
            term.write('\x1b[0m'); // Reset formatting

            resolve();
        } catch (error) {
            console.error('Error initializing terminal:', error);
            reject(error);
        }
    });
}

// Initialize terminal on page load
window.onload = function() {
    console.log('Window loaded, initializing terminal');
    
    // Create terminal with basic options
    term = new Terminal({
        cursorBlink: true,
        fontSize: 16,
        fontFamily: 'monospace',
        rows: 24,
        cols: 80,
        theme: {
            background: '#000000',
            foreground: '#ffffff'
        }
    });
    
    // Get terminal element
    const terminalElement = document.getElementById('terminal');
    if (!terminalElement) {
        console.error('Terminal element not found');
        showError('Terminal element not found');
        return;
    }
    
    // Create and load fit addon
    try {
        fitAddon = new FitAddon.FitAddon();
        term.loadAddon(fitAddon);
    } catch (error) {
        console.error('Error loading fit addon:', error);
        showError('Error loading terminal addons');
        return;
    }
    
    // Open terminal
    try {
        term.open(terminalElement);
        console.log('Terminal opened');
    } catch (error) {
        console.error('Error opening terminal:', error);
        showError('Error opening terminal');
        return;
    }
    
    // Fit terminal to container
    setTimeout(function() {
        try {
            fitAddon.fit();
            console.log('Terminal fitted');
        } catch (error) {
            console.error('Error fitting terminal:', error);
        }
        
        // Write welcome message
        term.writeln('\x1B[1;32mWelcome to IPAM Terminal\x1B[0m');
        term.writeln('Terminal initialized and ready for use');
    }, 100);
    
    // Update UI elements
    document.getElementById('device-hostname').textContent = 'Terminal Ready';
    document.getElementById('connection-username').textContent = 'System';
    document.getElementById('session-id').textContent = 'Local Session';
    
    // Check URL parameters for API-initiated connection
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');
    
    if (sessionId) {
        isApiConnection = true;
        checkSessionAndConnect(sessionId);
    }
};

// Handle window resize
window.onresize = function() {
    if (term && fitAddon) {
        try {
            fitAddon.fit();
            if (ws) {
                const dimensions = { cols: term.cols, rows: term.rows };
                ws.send(JSON.stringify({ type: 'resize', data: dimensions }));
            }
        } catch (error) {
            console.error('Error resizing terminal:', error);
        }
    }
};

function toggleAuthMethod() {
    const authType = document.getElementById('auth-type').value;
    if (authType === 'password') {
        document.getElementById('password-auth').style.display = 'block';
        document.getElementById('private-key-auth').style.display = 'none';
    } else {
        document.getElementById('password-auth').style.display = 'none';
        document.getElementById('private-key-auth').style.display = 'block';
    }
}

function disconnectSession() {
    if (ws) {
        try {
            // Send disconnect message to server
            ws.send(JSON.stringify({ type: 'disconnect' }));
            
            // Close WebSocket connection
            ws.close();
            ws = null;
            
            // Reset UI
            document.getElementById('device-hostname').textContent = 'Not connected';
            document.getElementById('connection-username').textContent = 'Not connected';
            document.getElementById('session-id').textContent = 'Not connected';
            
            // Reset terminal interface
            term.clear();
            term.writeln('Terminal reset');
            document.getElementById('error-message').style.display = 'none';
            
            // Clear terminal
            if (term) {
                term.clear();
            }
            
            // Reset session ID
            currentSessionId = null;
            
            // If this was an API connection, close the window
            if (isApiConnection) {
                window.close();
            }
            
            console.log('Disconnected from SSH session');
        } catch (error) {
            console.error('Error disconnecting:', error);
            showError('Failed to disconnect: ' + error.message);
        }
    }
}

function connect() {
    try {
        // Get form values
        const hostname = document.getElementById('hostname').value.trim();
        const port = parseInt(document.getElementById('port').value.trim(), 10);
        const username = document.getElementById('username').value.trim();
        const authType = document.getElementById('auth-type').value;
        
        // Validate input
        if (!hostname) {
            showError('Hostname is required');
            return;
        }
        if (isNaN(port) || port <= 0 || port > 65535) {
            showError('Invalid port number');
            return;
        }
        if (!username) {
            showError('Username is required');
            return;
        }
        
        // Prepare connection data
        const connectionData = {
            hostname,
            port,
            username,
            auth_type: authType
        };
        
        // Add authentication details based on selected method
        if (authType === 'password') {
            const password = document.getElementById('password').value;
            if (!password) {
                showError('Password is required');
                return;
            }
            connectionData.password = password;
        } else {
            const privateKey = document.getElementById('private-key').value.trim();
            if (!privateKey) {
                showError('Private key is required');
                return;
            }
            connectionData.private_key = privateKey;
        }
        
        // Clear any previous error messages
        document.getElementById('error-message').style.display = 'none';
        
        // Create session
        fetch('/api/session', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(connectionData)
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(data => {
                    throw new Error(data.error || 'Failed to create session');
                });
            }
            return response.json();
        })
        .then(data => {
            checkSessionAndConnect(data.session_id);
        })
        .catch(error => {
            console.error('Error creating session:', error);
            showError(error.message);
        });
    } catch (error) {
        console.error('Error connecting:', error);
        showError('Failed to connect: ' + error.message);
    }
}

function checkSessionAndConnect(sessionId) {
    if (!sessionId) {
        showError('Invalid session ID');
        return;
    }
    
    // Update UI
    document.getElementById('session-id').textContent = sessionId;
    currentSessionId = sessionId;
    
    // Check session status
    fetch(`/api/session/${sessionId}/status`)
        .then(response => {
            if (!response.ok) {
                return response.json().then(data => {
                    throw new Error(data.error || 'Failed to check session status');
                });
            }
            return response.json();
        })
        .then(data => {
            if (data.status === 'ready') {
                // Session is ready, connect WebSocket
                document.getElementById('device-hostname').textContent = data.hostname;
                document.getElementById('connection-username').textContent = data.username;
                
                // Terminal is already visible
                
                // Connect WebSocket
                connectWebSocket(sessionId);
            } else if (data.status === 'initializing') {
                // Session is still initializing, wait and check again
                setTimeout(() => {
                    checkSessionAndConnect(sessionId);
                }, 1000);
            } else if (data.status === 'error') {
                // Session has an error
                showError(data.error || 'Session error');
                
                // If this was an API connection, show error and provide close button
                if (isApiConnection) {
                    // Just show error in terminal
                    term.writeln('Session error: ' + data.status);
                }
                showError('Unknown session status: ' + data.status);
            }
        })
        .catch(error => {
            console.error('Error checking session status:', error);
            showError(error.message);
        });
}

function connectWebSocket(sessionId) {
    try {
        // Determine WebSocket protocol (wss:// for HTTPS, ws:// for HTTP)
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws/${sessionId}`;
        
        // Create WebSocket connection
        ws = new WebSocket(wsUrl);
        
        // WebSocket event handlers
        ws.onopen = function() {
            console.log('WebSocket connection established');
            
            // Send terminal size
            if (term) {
                const dimensions = { cols: term.cols, rows: term.rows };
                ws.send(JSON.stringify({ type: 'resize', data: dimensions }));
            }
            
            // Clear any previous error messages
            document.getElementById('error-message').style.display = 'none';
        };
        
        ws.onmessage = function(event) {
            try {
                const data = JSON.parse(event.data);
                
                if (data.type === 'data') {
                    // Terminal data
                    if (term) {
                        term.write(data.data);
                    }
                } else if (data.type === 'error') {
                    // Error message
                    console.error('Server error:', data.message);
                    showError(data.message);
                } else if (data.type === 'disconnect') {
                    // Server initiated disconnect
                    disconnectSession();
                }
            } catch (error) {
                console.error('Error processing WebSocket message:', error);
                
                // If not JSON, assume it's raw terminal data
                if (term) {
                    term.write(event.data);
                }
            }
        };
        
        ws.onclose = function(event) {
            console.log('WebSocket connection closed:', event.code, event.reason);
            
            // Reset WebSocket
            ws = null;
            
            // If not a normal closure, show error
            if (event.code !== 1000) {
                showError('Connection closed: ' + (event.reason || 'Unknown reason'));
                
                // Reset UI if not a normal closure
                document.getElementById('device-hostname').textContent = 'Not connected';
                document.getElementById('connection-username').textContent = 'Not connected';
                document.getElementById('session-id').textContent = 'Not connected';
                
                // Reset terminal interface
                term.clear();
                term.writeln('Connection closed');
            }
        };
        
        ws.onerror = function(error) {
            console.error('WebSocket error:', error);
            showError('WebSocket error');
        };
        
        // Set up terminal input
        if (term) {
            term.onData(data => {
                if (ws && ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type: 'data', data }));
                }
            });
        }
    } catch (error) {
        console.error('Error connecting WebSocket:', error);
        showError('Failed to connect WebSocket: ' + error.message);
    }
}
