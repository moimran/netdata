# WebSSH-RS API Documentation

This document describes the REST API endpoints provided by the WebSSH-RS server for establishing SSH connections.

## Base URL

All API endpoints are relative to the WebSSH-RS server base URL (e.g., `http://localhost:8888`).

## Endpoints

### 1. Connect to SSH Server

#### Original Endpoint

```
POST /connect
```

This is the original endpoint for establishing an SSH connection.

**Request Body:**
```json
{
  "hostname": "192.168.1.1",
  "port": 22,
  "username": "admin",
  "password": "password123",
  "private_key": null,
  "device_type": "router"
}
```

**Parameters:**
- `hostname` (string, required): The hostname or IP address of the SSH server
- `port` (integer, optional, default: 22): The port number of the SSH server
- `username` (string, required): The username for authentication
- `password` (string, optional): The password for authentication (required if private_key is not provided)
- `private_key` (string, optional): The private key for authentication in PEM format (required if password is not provided)
- `device_type` (string, optional): A hint about the device type (e.g., "cisco", "linux")

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Connected successfully",
  "session_id": "192.168.1.1-uuid-here"
}
```

**Error Response (400/500):**
```json
{
  "success": false,
  "message": "Failed to connect: Authentication failed"
}
```

#### New API Endpoint

```
POST /api/connect
```

This is the new simplified API endpoint for establishing an SSH connection.

**Request Body:**
```json
{
  "hostname": "192.168.1.1",
  "port": 22,
  "username": "admin",
  "password": "password123",
  "auth_type": "password"
}
```

**Parameters:**
- `hostname` (string, required): The hostname or IP address of the SSH server
- `port` (integer, optional, default: 22): The port number of the SSH server
- `username` (string, required): The username for authentication
- `password` (string, optional): The password for authentication (required if auth_type is "password")
- `private_key` (string, optional): The private key for authentication in PEM format (required if auth_type is "private-key")
- `auth_type` (string, optional, default: "password"): The authentication type, either "password" or "private-key"
- `device_type` (string, optional): A hint about the device type (e.g., "cisco", "linux")

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Connected successfully",
  "session_id": "192.168.1.1-uuid-here",
  "websocket_url": "ws://localhost:8888/ws/192.168.1.1-uuid-here",
  "error_code": null
}
```

**Error Response (400/500):**
```json
{
  "success": false,
  "message": "Failed to connect: Authentication failed",
  "session_id": null,
  "websocket_url": null,
  "error_code": "AUTH_FAILED"
}
```

### 2. WebSocket Connection

```
WebSocket: /ws/{session_id}
```

After establishing an SSH connection using the `/connect` or `/api/connect` endpoint, you can connect to the WebSocket endpoint to interact with the SSH session.

**Parameters:**
- `session_id` (string, required): The session ID returned from the connect endpoint

**WebSocket Messages:**

1. **Terminal Resize:**
```json
{
  "type": "resize",
  "rows": 24,
  "cols": 80
}
```

2. **Terminal Input:**
```json
{
  "type": "input",
  "data": "ls -la"
}
```

## Error Codes

The API returns the following error codes in the `error_code` field:

- `AUTH_FAILED`: Authentication failed (invalid username/password or private key)
- `CONNECTION_FAILED`: Failed to connect to the SSH server (host unreachable, port closed, etc.)
- `UNKNOWN_ERROR`: An unknown error occurred

## Example Usage with curl

### Connect to SSH Server

```bash
curl -X POST http://localhost:8888/api/connect \
  -H "Content-Type: application/json" \
  -d '{
    "hostname": "192.168.1.1",
    "port": 22,
    "username": "admin",
    "password": "password123"
  }'
```

### Response

```json
{
  "success": true,
  "message": "Connected successfully",
  "session_id": "192.168.1.1-7d5bc155-cf1a-4d24-b8af-0875a20aa079",
  "websocket_url": "ws://localhost:8888/ws/192.168.1.1-7d5bc155-cf1a-4d24-b8af-0875a20aa079",
  "error_code": null
}
```

## IPAM Backend Proxy

The IPAM application provides a proxy to the WebSSH-RS server to avoid CORS issues when connecting from the frontend.

### Proxy Endpoints

#### 1. Connect to SSH Server

```
POST /api/v1/devices/webssh/connect
```

**Request Body:**
```json
{
  "hostname": "192.168.1.1",
  "port": 22,
  "username": "admin",
  "password": "password123",
  "device_type": "router"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Connected successfully",
  "session_id": "192.168.1.1-uuid-here",
  "websocket_url": "ws://localhost:8888/ws/192.168.1.1-uuid-here",
  "error_code": null
}
```

#### 2. WebSocket Proxy

```
WebSocket: /api/v1/devices/webssh/ws/{session_id}
```

This endpoint proxies WebSocket connections to the WebSSH-RS server.
