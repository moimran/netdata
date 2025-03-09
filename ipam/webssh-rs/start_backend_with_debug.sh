#!/bin/bash
# Script to start the backend server with debug logging enabled

cd ../backend

# Start the backend server with debug logging
echo "Starting backend server with debug logging..."
echo "Press Ctrl+C to stop the server"
echo ""

# Use --log-level=debug to enable debug logging
uvicorn app.main:app --reload --host 0.0.0.0 --port 9001 --log-level=debug
