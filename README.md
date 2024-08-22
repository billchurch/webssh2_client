# WebSSH2 Client - Web SSH Client

![Orthrus Mascot](images/orthrus.png)

WebSSH2 Client is an HTML5 web-based terminal emulator and SSH client. It uses WebSockets to communicate with a WebSSH2 server, which in turn uses SSH2 to connect to SSH servers.

![WebSSH2 demo](https://user-images.githubusercontent.com/1668075/182425293-acc8741e-cc92-4105-afdc-9538e1685d4b.gif)

# EXPERIMENTAL
The current status is experimental, and this first version is a refactor of webssh2 v0.2.x to be compatible with a refactor of the same version of webssh2 as a stand-alone server-side component  running Node.js v6.9.1.

The intention is to harmonize the latest release of webssh2 by splitting out the client and server as separate repos (webssh2-client and webssh2-server) but joining them both together as modules in a parent webssh2 in an attempt to provide backward compatibility.

The main idea behind bifurcating the client/server is to make it easier to customize the client to work in other frameworks and use cases.

## Table of Contents

- [Requirements](#requirements)
- [Installation](#installation)
- [Usage](#usage)
- [Configuration](#configuration)
- [Features](#features)
- [Routes](#routes)
- [Development](#development)
- [Advanced Configuration](#advanced-configuration)
- [Support](#support)
- [License](#license)
- [Acknowledgments](#acknowledgments)

## Requirements

- Modern web browser with JavaScript enabled
- WebSSH2 server (see server README for setup instructions)

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

## Usage

1. Set up and start the WebSSH2 server (see server README for instructions).

2. Access the web client by navigating to the server's URL, typically:
   ```
   http://localhost:2222/ssh
   ```

3. You'll be prompted for host details and SSH credentials.

## Configuration

The client can be configured using URL parameters or through the config file on the server. Some configurable options include:

- `port` - SSH server port (default: 22)
- `header` - Optional header text
- `headerBackground` - Optional header background color
- `sshterm` - Terminal type for pty (default: xterm-color)

For a full list of configuration options, refer to the server README.

## Features

- Web-based SSH client with xterm.js terminal emulation
- Supports various SSH authentication methods (password and keyboard-interactive)
- Customizable terminal settings (font size, font family, colors, etc.)
- Session logging with download option
- Support for reauthentication and credential replay
- Responsive design for various screen sizes
- Keyboard shortcuts support
- Terminal Mouse support
- Copy and paste functionality
- Multi-factor authentication support
- CORS support for flexible server setups

## Routes

The WebSSH2 Server (not provided by this package) provides two main routes:

### 1. `/ssh`

- Interactive login form
- Terminal configuration options

### 2. `/ssh/host/:host`

- Quick connections to specific hosts
- Optional `port` parameter (e.g., `?port=2222`)
- HTTP Basic Authentication for credentials

## Development

- To add custom JavaScript, modify `./src/client.htm`, `./src/index.js`, or add your file to `webpack.*.js`.
- For security, use HTTPS when transmitting credentials via HTTP Basic Auth.
- Terminal settings can be customized after login via `Menu | Settings` and persist across sessions.
- Debug mode can be enabled by setting the `DEBUG` environment variable.

## Advanced Configuration 

In the client HTML file, you'll find this script tag:

```html
<script>
window.webssh2Config = null;
</script>
```

The WebSSH2 server replaces this null value with a configuration object. However, you can also set this manually to override server-provided settings or to configure the client when using it standalone.

### Configuration Options

Here's a comprehensive list of parameters that can be injected using `window.webssh2Config`:

```javascript
window.webssh2Config = {
  socket: {
    url: null,  // WebSocket URL. If null, it will be automatically determined
    path: '/ssh/socket.io',  // Socket.IO path
  },
  ssh: {
    host: null,  // SSH server hostname (required for autoConnect)
    port: 22,  // SSH server port
    username: null,  // SSH username (required for autoConnect)
    password: null,  // SSH password (required for autoConnect)
    sshterm: 'xterm-color',  // Terminal type
    readyTimeout: 20000,  // SSH connection timeout (ms)
  },
  header: {
    text: null,  // Custom header text
    background: 'green',  // Header background color
  },
  autoConnect: false  // Whether to connect automatically
};
```

### Auto-Connect Functionality

The `autoConnect` option is used to create pre-configured connections:

- When set to `true`, the client will attempt to connect immediately using the provided SSH configuration, bypassing the login form.
- For `autoConnect` to work, you must provide at least the `host` in the SSH configuration.
- `autoConnect` requires a username and password. If these are not provided, the server may use other methods (like basic auth or session data) to authenticate the connection.
- If the host is missing when `autoConnect` is `true,` the login form will be shown instead.

Example usage:

```javascript
window.webssh2Config = {
  ssh: {
    host: 'example.com',
    port: 22,
    username: 'user',  // Optional
    password: 'password'  // Optional
  },
  autoConnect: true
};
```

This configuration will attempt to connect to `example.com` as soon as the page loads, using any provided credentials or relying on server-side authentication methods.

### Security Considerations

The `autoConnect` feature only requires the host to be specified. The server handles authentication, which may use various methods, including basic auth or session data.
- If you do include a username and password in the client-side configuration, be cautious, as this may pose security risks, especially in production environments.
- For production use, consider using secure server-side authentication methods rather than including credentials in the client-side configuration.
When `autoConnect` is not used, ensure your server is configured to prompt for or securely handle credentials as needed.

### Customization Examples

1. Setting a custom header:
   ```javascript
   window.webssh2Config = {
     header: {
       text: 'My Custom SSH Client',
       background: '#007acc'
     }
   };
   ```

2. Configuring for a specific SSH server with auto-connect:
   ```javascript
   window.webssh2Config = {
     ssh: {
       host: 'myserver.example.com',
       port: 2222
     },
     autoConnect: true
   };
   ```

By leveraging these configuration options, you can customize the WebSSH2 client to suit your needs or integrate it seamlessly into your existing systems. Remember that the server handles authentication, providing flexibility in managing and securing credentials.

## Support

If you find this project helpful, you can support the developer:

[![Buy Me A Coffee](https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png)](https://www.buymeacoffee.com/billchurch)


## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.

## Acknowledgments

- [Xterm.js](https://xtermjs.org/) for providing the terminal emulator
- [Socket.IO](https://socket.io/) for real-time, bidirectional communication
- [Webpack](https://webpack.js.org/) for module bundling
