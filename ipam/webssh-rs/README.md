# WebSSH-RS

A web-based SSH client written in Rust, using the ssh2 crate for SSH connections and Axum for the web server. This is a Rust implementation of the original Python WebSSH project.

## Features

- SSH password authentication support (including empty password)
- SSH public-key authentication support (RSA, DSA, ECDSA, Ed25519 keys)
- Encrypted keys support
- Fullscreen terminal support
- Resizable terminal window
- Auto-detect SSH server's default encoding
- Modern browser support (Chrome, Firefox, Safari, Edge, Opera)

## Requirements

- Rust 1.70 or higher
- OpenSSL development libraries

## Quick Start

1. Install the required dependencies:
   ```bash
   # Ubuntu/Debian
   sudo apt-get install pkg-config libssl-dev

   # Fedora/RHEL
   sudo dnf install pkg-config openssl-devel
   ```

2. Build and run the application:
   ```bash
   # Navigate to the webssh-rs directory
   cd /home/moimran/repo/projects/netdata/ipam/webssh-rs
   
   # Build the application (only needed once or after code changes)
   cargo build --release
   
   # Run the application
   WEBSSH_SERVER_ADDRESS=0.0.0.0 WEBSSH_SERVER_PORT=8022 ./target/release/webssh-rs
   ```
   
   Alternatively, you can use cargo run:
   ```bash
   WEBSSH_SERVER_ADDRESS=0.0.0.0 WEBSSH_SERVER_PORT=8022 cargo run --release
   ```

3. Open your browser and navigate to `http://localhost:8022`

4. The IPAM backend will connect to this server when you click on the SSH button for a device

## Server Options

### Environment Variables

You can configure the server using environment variables:

```bash
# Set server address (default: 127.0.0.1)
WEBSSH_SERVER_ADDRESS=0.0.0.0

# Set server port (default: 8022)
WEBSSH_SERVER_PORT=8022
```

### Command Line Arguments (Not currently implemented)

```bash
# Start server with custom address and port
webssh-rs --address 0.0.0.0 --port 8022

# Start with TLS (HTTPS)
webssh-rs --tls --cert /path/to/cert.pem --key /path/to/key.pem

# Set logging level
webssh-rs --log-level debug
```

## Integration with IPAM

1. Start the webssh-rs server manually using the instructions above
2. Start the IPAM backend server
3. The IPAM backend will connect to the webssh-rs server when you click on the SSH button for a device
4. The connection URL will be: `http://localhost:8022/?session_id=xxx&device_id=xxx&hostname=xxx&username=xxx&device_name=xxx`
```

## Browser Support

The web interface uses xterm.js for terminal emulation and supports all modern browsers including:
- Chrome/Chromium
- Firefox
- Safari
- Edge
- Opera

## Security

- All passwords and sensitive data are only stored in memory during the session
- TLS support for secure HTTPS connections
- No permanent storage of credentials
- Proper handling of SSH host key verification

## License

This project is licensed under the same terms as the original Python WebSSH project.
