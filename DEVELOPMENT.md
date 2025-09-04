# WebSSH2 Development Guide

This guide explains how to set up and run the WebSSH2 client and server components for development.

## Prerequisites

- Node.js 22+
- npm
- Git
- Two terminal windows/sessions

## Project Setup

1. Create a development directory and clone both repositories:

```bash
mkdir webssh2-dev
cd webssh2-dev

# Clone the client repository
git clone https://github.com/billchurch/webssh2_client.git

# Clone the server repository
git clone https://github.com/billchurch/webssh2.git webssh2_server
```

2. Install dependencies for both projects:

```bash
# Install client dependencies
cd webssh2_client
npm install

# Install server dependencies
cd ../webssh2_server
npm install
```

## Development Workflow

### Starting the Server Component

1. In your first terminal window, navigate to the server directory:

```bash
cd webssh2_server
```

2. Start the server in development mode:

```bash
npm run watch
```

This will:

- Start the WebSSH2 server on port `2222`
- Enable automatic reloading when server files change
- Allow CORS for the development client

### Starting the Client Component

1. In your second terminal window, navigate to the client directory:

```bash
cd webssh2_client
```

2. Start the client in development mode:

```bash
npm run dev
```

This will:

- Start the Vite dev server on port `3000` with live reload
- Proxy `/ssh/socket.io` to `http://localhost:2222` (see `client/src/vite.config.js`)
- Expose a banner define for version/build stamp

### Accessing the Development Environment

1. Open your web browser and navigate to:

```
http://localhost:3000
```

2. The client will automatically connect to the development server at `localhost:2222`

## Development Architecture

```mermaid
sequenceDiagram
    participant Browser as Browser<br/>(localhost:3000)
    participant Client as WebSSH2 Client<br/>(Port 3000)
    participant Server as WebSSH2 Server<br/>(Port 2222)
    participant SSH as SSH Server<br/>(Port 22)

    Note over Browser,SSH: Development Data Flow

    Browser->>+Client: HTTP Request
    Client->>-Browser: Serve Client Files

    Browser->>+Client: WebSocket Connection
    Client->>+Server: Socket.IO Connection
    Server->>+SSH: SSH Connection

    Note over Browser,SSH: Bidirectional Communication

    SSH-->>-Server: SSH Data
    Server-->>-Client: Socket.IO Events
    Client-->>-Browser: WebSocket Events
```

## File Watching and Auto-Reload

Both client and server components support file watching and automatic reloading:

- Client changes trigger Vite HMR and automatic rebuild
- Server changes trigger watch mode (nodemon / equivalent) to restart

## Important Notes

1. The server and client components must use Socket.IO v2.2.0 for compatibility
2. Client dev server (3000) and WebSSH2 server (2222) must run simultaneously
3. CORS/proxy is handled by Vite in development (see `server.proxy` in `vite.config.js`)
4. No inline scripts are used; CSP is strict for scripts and allows inline styles for xterm

## Troubleshooting

If you encounter issues:

1. Ensure both servers are running (`npm run watch` in both directories)
2. Check the browser console for client-side errors
3. Check terminal output for server-side errors
4. Verify the ports (3000 and 2222) are available
5. Clear browser cache if changes aren't reflecting

## Building for Production

When ready to build for production:

```bash
cd webssh2_client
npm run build        # client bundle to client/public
npm run build:server # Node entrypoints to JS
```

Artifacts:

- Client: `client/public/{webssh2.bundle.js, webssh2.css, client.htm}`
- Node: root `index.js`, `client/index.js` (compiled from TypeScript)

## Type Checking and Linting

Run type checks and linting locally before PRs:

```bash
npm run typecheck         # root TS (server/entry files)
npm run typecheck:client  # client TS
npm run lint              # ESLint with security rules
```

Security-focused ESLint rules (see SECURITY.md) prevent unsanitized DOM sinks like `innerHTML` and inline script-like patterns.
