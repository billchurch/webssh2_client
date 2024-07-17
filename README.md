# WebSSH2 Client

WebSSH2 Client is a web-based SSH client that allows users to connect to SSH servers directly from their web browsers. It's built using modern web technologies and provides a seamless, secure SSH experience.

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

- `host`: The hostname or IP address of the SSH server to connect to.
  - Example: `?host=192.168.1.1`

- `port`: The port number of the SSH server (default is 22).
  - Example: `?port=2222`

- `username`: The username to use for SSH authentication.
  - Example: `?username=admin`

- `password`: The password to use for SSH authentication (not recommended for production use).
  - Example: `?password=secretpassword`

### Terminal Configuration

- `sshTerm`: The terminal type to request (default is "xterm-color").
  - Example: `?sshTerm=xterm-256color`

- `readyTimeout`: The timeout (in milliseconds) for the SSH handshake (default is 20000).
  - Example: `?readyTimeout=30000`

- `cursorBlink`: Whether the cursor should blink (true/false).
  - Example: `?cursorBlink=true`

- `scrollback`: The number of lines to keep in the scrollback buffer (default is 10000).
  - Example: `?scrollback=5000`

- `tabStopWidth`: The width of tab stops (default is 8).
  - Example: `?tabStopWidth=4`

- `bellStyle`: The style of the terminal bell ("sound" or "none", default is "sound").
  - Example: `?bellStyle=none`

### Display Options

- `fontSize`: The font size for the terminal (in pixels).
  - Example: `?fontSize=14`

- `fontFamily`: The font family to use for the terminal.
  - Example: `?fontFamily=Consolas,Monaco,Lucida%20Console,Liberation%20Mono,DejaVu%20Sans%20Mono,Bitstream%20Vera%20Sans%20Mono,Courier%20New,monospace`

- `letterSpacing`: The letter spacing for the terminal font.
  - Example: `?letterSpacing=1`

- `lineHeight`: The line height for the terminal.
  - Example: `?lineHeight=1.2`

### UI Customization

- `header`: Custom text to display in the header.
  - Example: `?header=My%20SSH%20Session`

- `headerBackground`: Background color for the header.
  - Example: `?headerBackground=red`

### Debugging

- `logLevel`: Sets the logging level for debugging purposes.
  - Example: `?logLevel=debug`

### Usage Example

A full URL with multiple parameters might look like this:

```
http://localhost:2222/ssh/host/192.168.1.100?port=2222&header=Production%20Server&headerBackground=red&fontSize=14&bellStyle=none
```

This URL would connect to a SSH server at 192.168.1.100 on port 2222, with a red header displaying "Production Server", using a 14px font size and disabling the audible bell.

Note: Be cautious about including sensitive information like passwords in URL parameters, especially in production environments.

## Debugging

This project uses the `debug` module for logging. To enable debugging in the browser:

1. Open the browser's console.
2. Enter: `localStorage.debug = 'webssh2-client*'`
3. Refresh the page.

To disable debugging, enter: `localStorage.debug = ''`

You can also use the `toggleDebugging()` function in the console to switch debugging on and off.

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