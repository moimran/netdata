// Disconnect function
function disconnectSession() {
    if (currentSessionId) {
        term.writeln('\x1b[1;33mDisconnecting from session...\x1b[0m');
        
        fetch(`/api/session/${currentSessionId}/terminate`, {
            method: 'POST'
        })
        .then(response => {
            if (response.ok) {
                term.writeln('\x1b[1;32mSession terminated successfully\x1b[0m');
            } else {
                showError('Failed to terminate session');
            }
            
            // Clean up terminal state regardless of success/failure
            cleanupTerminal();
        })
        .catch(error => {
            showError('Error terminating session: ' + error.message);
            // Clean up terminal state even on error
            cleanupTerminal();
        });
        
        if (ws) {
            ws.close();
        }
    } else {
        term.writeln('\x1b[1;33mNo active session to disconnect\x1b[0m');
    }
    
    // Helper function to clean up terminal state
    function cleanupTerminal() {
        // Clear any refresh intervals
        if (window.topRefreshInterval) {
            clearInterval(window.topRefreshInterval);
            window.topRefreshInterval = null;
            console.log('Cleared top command refresh interval');
        }
        
        // Reset terminal UI elements
        document.getElementById('device-hostname').textContent = 'Not connected';
        document.getElementById('connection-username').textContent = 'Not connected';
        document.getElementById('session-id').textContent = 'Not connected';
        
        // Force a terminal refresh to ensure clean state
        term.refresh(0, term.rows - 1);
        
        // Reset terminal options to default state
        term.options.cursorBlink = true;
        term.options.cursorStyle = 'block';
        
        // Apply fit to ensure terminal size is correct
        if (fitAddon) {
            setTimeout(() => {
                fitAddon.fit();
            }, 100);
        }
        
        // Reset current session ID
        currentSessionId = null;
    }
}

// Reconnect function
function reconnectSession() {
    if (currentSessionId) {
        term.writeln('\x1b[1;33mReconnecting to session: ' + currentSessionId + '\x1b[0m');
        connectWebSocket(currentSessionId);
    } else {
        // Check URL parameters for session ID
        const urlParams = new URLSearchParams(window.location.search);
        let sessionId = urlParams.get('session_id');
        
        if (sessionId) {
            // Extract just the session ID without any additional parameters
            if (sessionId.includes('&')) {
                sessionId = sessionId.split('&')[0];
            }
            
            term.writeln('\x1b[1;33mReconnecting to session: ' + sessionId + '\x1b[0m');
            connectWebSocket(sessionId);
        } else {
            term.writeln('\x1b[1;33mNo session ID available for reconnection\x1b[0m');
        }
    }
}

// Send Enter key function
function sendEnterKey() {
    if (ws && ws.readyState === WebSocket.OPEN) {
        term.writeln('\x1b[1;33mSending Enter key...\x1b[0m');
        ws.send(JSON.stringify({ type: 'input', data: '\r' }));
    } else {
        term.writeln('\x1b[1;33mWebSocket not connected\x1b[0m');
    }
}

// Handle window resize with debounce to prevent too many resize events
let resizeTimeout;
window.onresize = function() {
    // Clear any existing timeout to debounce the resize event
    if (resizeTimeout) {
        clearTimeout(resizeTimeout);
    }
    
    // Set a timeout to actually perform the resize after a short delay
    // This prevents sending too many resize events in rapid succession
    resizeTimeout = setTimeout(function() {
        if (fitAddon) {
            // Store previous dimensions
            const prevRows = term.rows;
            const prevCols = term.cols;
            
            // Fit the terminal to the container
            fitAddon.fit();
            
            // Only send resize command if dimensions actually changed
            // This prevents unnecessary resize commands
            if (prevRows !== term.rows || prevCols !== term.cols) {
                if (ws && ws.readyState === WebSocket.OPEN) {
                    console.log(`Terminal resized from ${prevCols}x${prevRows} to ${term.cols}x${term.rows}`);
                    const dimensions = {
                        type: 'resize',
                        rows: term.rows,
                        cols: term.cols
                    };
                    ws.send(JSON.stringify(dimensions));
                }
            }
        }
    }, 250); // 250ms debounce time
};