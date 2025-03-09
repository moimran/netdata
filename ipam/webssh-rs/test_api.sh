#!/bin/bash

# Test script for WebSSH-RS API

# Set the server URL
SERVER_URL="http://localhost:8888"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}WebSSH-RS API Test Script${NC}"
echo "================================"

# Function to test the API
test_api() {
    local endpoint=$1
    local data=$2
    local description=$3

    echo -e "\n${YELLOW}Test: ${description}${NC}"
    echo "Endpoint: ${endpoint}"
    echo "Request data: ${data}"
    
    # Make the request
    response=$(curl -s -X POST "${SERVER_URL}${endpoint}" \
        -H "Content-Type: application/json" \
        -d "${data}")
    
    # Print the response
    echo -e "Response: ${response}\n"
    
    # Check if the response contains "success":true
    if echo "${response}" | grep -q '"success":true'; then
        echo -e "${GREEN}✓ Test passed${NC}"
        
        # Extract session_id and websocket_url if available
        session_id=$(echo "${response}" | grep -o '"session_id":"[^"]*"' | cut -d'"' -f4)
        websocket_url=$(echo "${response}" | grep -o '"websocket_url":"[^"]*"' | cut -d'"' -f4)
        
        if [ ! -z "${session_id}" ]; then
            echo "Session ID: ${session_id}"
        fi
        
        if [ ! -z "${websocket_url}" ]; then
            echo "WebSocket URL: ${websocket_url}"
        fi
    else
        echo -e "${RED}✗ Test failed${NC}"
        
        # Extract error message if available
        error_message=$(echo "${response}" | grep -o '"message":"[^"]*"' | cut -d'"' -f4)
        error_code=$(echo "${response}" | grep -o '"error_code":"[^"]*"' | cut -d'"' -f4)
        
        if [ ! -z "${error_message}" ]; then
            echo "Error message: ${error_message}"
        fi
        
        if [ ! -z "${error_code}" ]; then
            echo "Error code: ${error_code}"
        fi
    fi
    
    echo "--------------------------------"
}

# Test 1: Basic connection with default port
echo -e "\n${YELLOW}Running Test 1: Basic connection with default port${NC}"
test_api "/api/connect" '{
    "hostname": "192.168.1.25",
    "port": 22,
    "username": "admin",
    "password": "moimran@123"
}' "Basic connection with default port"

# Test with verbose curl to see what's happening
echo -e "\n${YELLOW}Running verbose test to debug API endpoint${NC}"
echo "Request data: {\"hostname\":\"127.0.0.1\",\"port\":22,\"username\":\"test\",\"password\":\"test\"}"
curl -v -X POST "${SERVER_URL}/api/connect" \
    -H "Content-Type: application/json" \
    -d '{
        "hostname": "127.0.0.1",
        "port": 22,
        "username": "test",
        "password": "test"
    }'
echo -e "\n"
