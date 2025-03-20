// Global variables
let term = null;
let ws = null;
let fitAddon = null;
let currentSessionId = null;
let isApiConnection = false;

// Show error message
function showError(message) {
    term.writeln('\x1b[1;31mError: ' + message + '\x1b[0m');
    console.error('Error:', message);
}

// Initialize terminal
function initTerminal() {
    // Initialize terminal with improved settings for command output
    term = new Terminal({
        cursorBlink: true,
        scrollback: 1000,
        tabStopWidth: 8,
        bellStyle: 'sound',
        fontFamily: 'monospace',
        fontSize: 14,
        theme: {
            background: '#000000',
            foreground: '#ffffff'
        },
        allowTransparency: false,
        disableStdin: false,
        cursorStyle: 'block',
        convertEol: true,
        rendererType: 'canvas',
        allowProposedApi: true
    });
    
    // Create and load addons
    fitAddon = new FitAddon.FitAddon();
    term.loadAddon(fitAddon);
    
    // Fix for canvas readback warning
    // Set willReadFrequently attribute on the canvas to improve performance
    setTimeout(() => {
        const canvasElements = document.querySelectorAll('canvas');
        canvasElements.forEach(canvas => {
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
        });
    }, 100);
    
    // Add web links addon
    const webLinksAddon = new WebLinksAddon.WebLinksAddon();
    term.loadAddon(webLinksAddon);
    
    // Open terminal
    term.open(document.getElementById('terminal'));
    
    // Set terminal options for better compatibility
    term.options.cursorBlink = true;
    term.options.disableStdin = false;
    term.options.cursorStyle = 'block';
    term.options.scrollOnUserInput = true;
    
    // Set environment variables that help with terminal compatibility
    const envData = btoa(JSON.stringify({
        data: {
            TERM: 'xterm-256color',
            COLORTERM: 'truecolor',
            TERM_PROGRAM: 'webssh-rs'
        }
    }));
    
    // Focus the terminal
    term.focus();
    
    // Apply fit to ensure terminal size is correct initially
    setTimeout(() => {
        fitAddon.fit();
        console.log(`Initial terminal size: ${term.cols}x${term.rows}`);
        
        // Add a mutation observer to detect changes to the terminal container
        // This helps with dynamic layouts and ensures the terminal always fits correctly
        const terminalElement = document.getElementById('terminal');
        const resizeObserver = new ResizeObserver(entries => {
            for (let entry of entries) {
                if (fitAddon) {
                    fitAddon.fit();
                    if (ws && ws.readyState === WebSocket.OPEN) {
                        console.log(`Container resize: sending new size ${term.cols}x${term.rows}`);
                        ws.send(JSON.stringify({
                            type: 'resize',
                            cols: term.cols,
                            rows: term.rows
                        }));
                    }
                }
            }
        });
        
        // Start observing the terminal container
        resizeObserver.observe(terminalElement);
    }, 100);
    
    // Handle window resize events with debounce for better performance
    let resizeTimeout;
    window.addEventListener('resize', () => {
        // Clear previous timeout to implement debounce
        clearTimeout(resizeTimeout);
        
        // Set a new timeout to resize after a short delay
        resizeTimeout = setTimeout(() => {
            if (fitAddon) {
                fitAddon.fit();
                
                // Send updated terminal size to server
                if (ws && ws.readyState === WebSocket.OPEN) {
                    console.log(`Window resize: sending new size ${term.cols}x${term.rows}`);
                    ws.send(JSON.stringify({
                        type: 'resize',
                        cols: term.cols,
                        rows: term.rows
                    }));
                    
                    // Force a refresh after resize to ensure display is updated
                    term.clearSelection();
                    term.refresh(0, term.rows - 1);
                }
            }
        }, 100); // 100ms debounce
    });
    
    // Fit terminal to container and set size
    setTimeout(() => {
        fitAddon.fit();
        // Send terminal size to server
        if (ws && ws.readyState === WebSocket.OPEN) {
            console.log(`Sending resize: ${term.cols}x${term.rows}`);
            ws.send(JSON.stringify({
                type: 'resize',
                cols: term.cols,
                rows: term.rows
            }));
        }
        term.writeln('\x1b[1;32mWelcome to IPAM Terminal\x1b[0m');
        term.writeln('Terminal initialized and ready for use');
        
        // Set up a periodic refresh for the terminal
        // This helps with commands like 'top' that need regular updates
        const refreshInterval = setInterval(() => {
            if (term && document.hasFocus()) {
                // Only refresh if the page has focus to save resources
                term.refresh(0, term.rows - 1);
            }
        }, 2000); // Refresh every 2 seconds
        
        // Clean up the interval when the page is unloaded
        window.addEventListener('beforeunload', () => {
            clearInterval(refreshInterval);
        });
        
        // Add event listener for terminal focus using the DOM element
        // since term.onFocus is not available in this version
        const terminalElement = document.getElementById('terminal');
        terminalElement.addEventListener('focus', () => {
            // When terminal gets focus, ensure it's properly sized
            if (fitAddon) {
                fitAddon.fit();
                if (ws && ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({
                        type: 'resize',
                        cols: term.cols,
                        rows: term.rows
                    }));
                }
            }
        });
        
        // Check URL parameters for API-initiated connection
        const urlParams = new URLSearchParams(window.location.search);
        let sessionId = urlParams.get('session_id');
        const hostname = urlParams.get('hostname');
        const username = urlParams.get('username');
        const deviceName = urlParams.get('device_name');
        
        if (sessionId) {
            // Extract just the session ID without any additional parameters
            if (sessionId.includes('&')) {
                sessionId = sessionId.split('&')[0];
            }
            
            term.writeln('\x1b[1;34mConnecting to session: ' + sessionId + '\x1b[0m');
            isApiConnection = true;
            
            // Update UI with available information
            if (hostname) document.getElementById('device-hostname').textContent = hostname;
            if (username) document.getElementById('connection-username').textContent = username;
            document.getElementById('session-id').textContent = sessionId;
            
            // Connect directly to WebSocket without checking status
            connectWebSocket(sessionId);
        }
    }, 100);
}