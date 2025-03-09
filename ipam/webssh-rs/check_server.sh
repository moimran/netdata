#!/bin/bash

# Check if the WebSSH server is running and listening on port 8888
echo "Checking if WebSSH server is running..."

# Check if the process is running
if [ -f "webssh.pid" ]; then
    PID=$(cat webssh.pid)
    if ps -p $PID > /dev/null; then
        echo "WebSSH server is running with PID $PID"
    else
        echo "WebSSH server is not running (PID file exists but process is not running)"
        exit 1
    fi
else
    echo "WebSSH server is not running (PID file does not exist)"
    exit 1
fi

# Check if the server is listening on port 8888
if command -v ss >/dev/null 2>&1; then
    if ss -tuln | grep -q ":8888 "; then
        echo "WebSSH server is listening on port 8888"
    else
        echo "WebSSH server is NOT listening on port 8888"
        exit 1
    fi
elif command -v lsof >/dev/null 2>&1; then
    if lsof -i :8888 >/dev/null 2>&1; then
        echo "WebSSH server is listening on port 8888"
    else
        echo "WebSSH server is NOT listening on port 8888"
        exit 1
    fi
else
    echo "Cannot check if server is listening (neither ss nor lsof is available)"
fi

# Try to connect to the server
echo "Trying to connect to the server..."
curl -s -I http://localhost:8888 || echo "Failed to connect to the server"

echo "Checking API endpoint..."
curl -s -X POST http://localhost:8888/api/connect \
    -H "Content-Type: application/json" \
    -d '{
        "hostname": "127.0.0.1",
        "port": 22,
        "username": "test",
        "password": "test"
    }' || echo "Failed to connect to the API endpoint"

echo "Done"
