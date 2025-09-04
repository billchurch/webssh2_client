# WebSSH2 Client - Web SSH Client

[![CI](https://github.com/billchurch/webssh2_client/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/billchurch/webssh2_client/actions/workflows/ci.yml)
[![Release](https://github.com/billchurch/webssh2_client/actions/workflows/release.yml/badge.svg?branch=main)](https://github.com/billchurch/webssh2_client/actions/workflows/release.yml)

![Orthrus Mascot](images/orthrus.png)

WebSSH2 Client is an HTML5 web-based terminal emulator and SSH client component. It uses WebSockets to communicate with a WebSSH2 server, which in turn uses SSH2 to connect to SSH servers.

![WebSSH2 demo](https://user-images.githubusercontent.com/1668075/182425293-acc8741e-cc92-4105-afdc-9538e1685d4b.gif)

# Important Notice
This package contains only the browser-side client component of WebSSH2. It requires a compatible WebSSH2 server to function. The server component is available at [webssh2 server](https://github.com/billchurch/webssh2/tree/bigip-server). This package is intended for advanced users who want to customize or integrate the client component independently.

# Status
This is an experimental refactor of the WebSSH2 v0.2.x client to function as a standalone component. It has been separated from the server-side code to facilitate customization and integration with different frameworks.

## Requirements

- Modern web browser with JavaScript enabled
- Compatible WebSSH2 server instance (v0.2.x or compatible)
- Socket.IO v2.2.0 compatibility (due to server requirements)

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/billchurch/webssh2_client.git
   cd webssh2_client
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Build the client:
   ```
   npm run build
   ```

4. The built client files will be in the `client/public` directory.

## Server Requirements

The WebSSH2 client requires a compatible server that provides:

- WebSocket endpoint for SSH communication
- Authentication handling
- SSH connection management
- Socket.IO v2.2.0 compatibility

For server setup instructions, refer to the [WebSSH2 server documentation](https://github.com/billchurch/webssh2/tree/bigip-server).

## Client Features

- Web-based SSH client with xterm.js terminal emulation
- Customizable terminal settings:
  - Font size and family
  - Color schemes
  - Cursor behavior
  - Scrollback buffer size
- Session logging with download capability
- Copy and paste functionality
- Terminal mouse support
- Keyboard shortcuts
- Responsive design
- Multi-factor authentication support (when supported by server)
- Support for credential replay and reauthentication

## Security and Lint Rules

- No innerHTML: The client never uses `innerHTML` for user content. All text uses `textContent` and safe DOM building helpers.
- CSP: Strict `script-src 'self'` (no inline scripts). Inline styles allowed for xterm DOM renderer and safe color updates.
- ESLint guardrails:
  - `no-unsanitized` plugin blocks unsanitized DOM sinks (`innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`).
  - Additional bans via `no-restricted-properties` for those sinks, and `no-restricted-syntax` for string-based timers and `new Function`.
- Xterm integration: Terminal output is rendered with `xterm.write()`; no HTML rendering of remote data.

## Configuration

The client can be configured through:

1. URL parameters
2. Configuration object
3. User interface settings

### URL Parameters

Supported URL parameters include:

- `host` - SSH server hostname
- `port` - SSH server port (default: 22)
- `header` - Optional header text
- `headerBackground` - Optional header background color
- `sshterm` - Terminal type (default: xterm-color)

### Configuration Object

You can configure the client by setting `window.webssh2Config`:

```javascript
window.webssh2Config = {
  socket: {
    url: null,  // WebSocket URL (auto-detected if null)
    path: '/ssh/socket.io'  // Socket.IO path
  },
  ssh: {
    host: null,  // SSH server hostname
    port: 22,    // SSH server port
    username: null,
    sshterm: 'xterm-color'
  },
  header: {
    text: null,
    background: 'green'
  },
  autoConnect: false
};
```

## Development

See [DEVELOPMENT.md](./DEVELOPMENT.md).

## Support

If you find this project helpful, consider supporting the developer:

[![Buy Me A Coffee](https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png)](https://www.buymeacoffee.com/billchurch)

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.

## Acknowledgments

- [Xterm.js](https://xtermjs.org/) for terminal emulation
- [Socket.IO](https://socket.io/) for WebSocket communication
- [Vite](https://vitejs.dev/) for development and bundling
- [ESLint](https://eslint.org/) + [Prettier](https://prettier.io/) for code quality
- [lucide-static](https://github.com/lucide-icons/lucide) for SVG icons
