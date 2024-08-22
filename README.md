# WebSSH2 Client

![Orthrus Mascot](images/orthrus2.png)

WebSSH2 Client is a web-based SSH client that allows users to connect to SSH servers directly from their web browsers. It's built using modern web technologies and provides a seamless, secure SSH experience.

# EXPERIMENTAL
The current status is experimental, and this first version is a refactor of webssh2 v0.2.x to be compatible with a refactor of the same version of webssh2 as a stand-alone server-side component  running Node.js v6.9.1.

The intention is to harmonize the latest release of webssh2 by splitting out the client and server as separate repos (webssh2-client and webssh2-server) but joining them both together as modules in a parent webssh2 in an attempt to provide backward compatibility.

The main idea behind bifurcating the client/server is to make it easier to customize the client to work in other frameworks and use cases.

## Features

- Web-based SSH terminal emulation
- Secure authentication
- Customizable terminal options
- Session logging
- Responsive design
- Support for reconnection and reauthentication

## Technology Stack

- Node.js (v18+)
- Socket.IO for real-time communication
- Xterm.js for terminal emulation
- Webpack for bundling
- ES6+ JavaScript

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/billchurch/webssh2-client.git
   cd webssh2-client
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Build the client:
   ```
   npm run build
   ```

## WebSSH2 Configuration

The WebSSH2 client can be customized using the `window.webssh2Config` object. This object is typically injected by the WebSSH2 server, but users can also manually set or modify it for customization purposes.

### Basic Usage

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

## Usage

### Development

To start the development server:

```
npm start
```

This will run the application using `node index.js`.

To build the development version:

```
npm run builddev
```

This will use Webpack to build the development version of the application.

To watch for changes and rebuild automatically:

```
npm run watch
```

This will start the server and watch for file changes, rebuilding as necessary.

### Production Build

To create a production build:

```
npm run build
```

This will generate optimized files for production using Webpack.

### Analyze Bundle

To analyze the bundle size:

```
npm run analyze
```

This will generate a JSON report of the bundle and analyze its size.

### Publishing

Before publishing, the package will automatically run the build script:

```
npm publish
```

This ensures that the latest production build is included in the published package.

## Scripts

- `start`: Runs the application using Node.js
- `build`: Creates a production build using Webpack
- `builddev`: Creates a development build using Webpack
- `analyze`: Analyzes the bundle size
- `watch`: Runs the application and watches for changes, rebuilding as necessary
- `watch:build`: Watches for changes and rebuilds using Webpack (development config)
- `prepublishOnly`: Runs before publishing to ensure the latest build is included

## URL Parameters

The WebSSH2 client supports various URL parameters to customize the SSH connection and terminal behavior. These parameters can be added to the URL when accessing the client.

### SSH Connection Parameters

- `host`: The hostname or IP address of the SSH server to which to connect.
  - Example: `?host=192.168.1.1`

- `port`: The port number of the SSH server (default is 22).
  - Example: `?port=2222`

- `username`: The username to use for SSH authentication.
  - Example: `?username=admin`

- `password`: The password for SSH authentication (not recommended for production use).
  - Example: `?password=secretpassword`

### UI Customization

- `header`: Custom text to display in the header.
  - Example: `?header=My%20SSH%20Session`

- `headerbackground`: Background color for the header.
  - Example: `?headerbackground=red`

### Usage Example

A full URL with multiple parameters might look like this:

```
http://localhost:2222/ssh/host/192.168.1.100?port=2222&header=Production%20Server&headerbackground=red&fontSize=14&bellStyle=none
```

This URL would connect to a SSH server at 192.168.1.100 on port 2222, with a red header displaying "Production Server", using a 14px font size and turning off the audible bell.

Note: Be cautious about including sensitive information like passwords in URL parameters, especially in production environments.

## Terminal Configuration

WebSSH2 Client allows users to customize their terminal experience through a set of configurable options. These settings are stored in the browser's localStorage under the key `webssh2.settings.global`, ensuring your preferences persist across sessions.

### Accessing Terminal Settings

You can access the terminal configuration in two ways:

1. **From an Active Session:**
   - Click on the menu icon (☰) in the bottom-left corner of the terminal.
   - Select "Settings" from the dropdown menu.

2. **During Login:**
   - In the login dialog, click on the gear icon (⚙️) next to the "Connect" button.

### Available Settings

The terminal settings dialog offers the following customization options:

1. **Font Size**
   - Range: 8-72 pixels
   - Adjusts the size of the text in the terminal.

2. **Font Family**
   - Specifies the font used in the terminal.
   - Example: "Courier New, monospace"

3. **Cursor Blink**
   - Options: On / Off
   - Determines whether the cursor blinks in the terminal.

4. **Scrollback**
   - Range: 1-200000 lines
   - Sets the number of lines kept in the terminal's scrollback buffer.

5. **Tab Stop Width**
   - Range: 1-100 spaces
   - Defines the width of tab stops in the terminal.

6. **Bell Style**
   - Options: Sound / None
   - Configures the audible bell behavior in the terminal.

### Applying Settings

After adjusting your preferences:

1. Click "Save" to apply the new settings.
2. The changes will take effect immediately for the current session and all future sessions.
3. Click "Cancel" to close the dialog without saving changes.

### Resetting to Defaults

To reset all settings to their default values:

1. Clear your browser's localStorage for the WebSSH2 Client site.
2. Refresh the page.

### Note on Persistence

These settings are stored locally in your browser. If you use WebSSH2 Client on a different device or browser, you'll need to reconfigure your preferences.

## Keyboard-Interactive Authentication

WebSSH2 Client supports keyboard-interactive authentication, which allows for more complex authentication scenarios beyond simple password-based authentication. This feature is particularly useful for systems that require multi-factor authentication or challenge-response mechanisms.

### How it Works

1. When the SSH server requests keyboard-interactive authentication, the WebSSH2 Client will display a prompt dialog to the user.
2. The prompt dialog will show the message sent by the SSH server, which typically includes instructions or questions for the user.
3. Users can enter their response in the provided input field.
4. After submitting the response, the client sends it back to the SSH server.
5. This process may repeat multiple times if the SSH server requires additional information.

### Features

- **Dynamic Prompts**: The content of the prompt dialog is determined by the SSH server, allowing for flexible authentication flows.
- **Multi-Step Authentication**: Supports multiple rounds of prompts for sophisticated authentication processes.
- **Seamless Integration**: The prompt appears within the web interface, providing a smooth user experience.

### Security Considerations

- The keyboard-interactive method is more secure than hardcoded passwords, as it allows for dynamic and potentially multi-factor authentication.
- All communication between the client and server remains encrypted, ensuring the security of sensitive information.
- Users should always verify that they're connected to the intended server before entering any authentication information.

### Configuration

No additional client-side configuration is needed to use keyboard-interactive authentication. The feature is automatically engaged when the SSH server requests it.

### Limitations

- The appearance and behavior of the prompt are standardized and cannot be customized by the SSH server beyond the prompt message.

For more information on SSH keyboard-interactive authentication, refer to [RFC 4256](https://tools.ietf.org/html/rfc4256).

## Debugging

This project uses the `debug` module for logging. To enable debugging in the browser:

1. Open the browser's console.
2. Enter: `localStorage.debug = 'webssh2-client*'`
3. Refresh the page.

To turn off debugging, enter: `localStorage.debug = ''`

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## Style Guide

This project follows the Airbnb JavaScript Style Guide. Please ensure your contributions adhere to this style.

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.

## Acknowledgments

- [Xterm.js](https://xtermjs.org/) for providing the terminal emulator
- [Socket.IO](https://socket.io/) for real-time, bidirectional communication
- [Webpack](https://webpack.js.org/) for module bundling
