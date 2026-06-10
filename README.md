# WebSSH2 Client - Web SSH Client

[![CI](https://github.com/billchurch/webssh2_client/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/billchurch/webssh2_client/actions/workflows/ci.yml)
[![Release](https://github.com/billchurch/webssh2_client/actions/workflows/release.yml/badge.svg?branch=main)](https://github.com/billchurch/webssh2_client/actions/workflows/release.yml)

![Orthrus Mascot](https://github.com/billchurch/webssh2/raw/main/DOCS/images/orthrus2.png)

WebSSH2 Client is an HTML5 web-based terminal emulator and SSH client component. It uses WebSockets to communicate with a WebSSH2 server, which in turn uses SSH2 to connect to SSH servers.

![WebSSH2 demo](https://user-images.githubusercontent.com/1668075/182425293-acc8741e-cc92-4105-afdc-9538e1685d4b.gif)

# Important Notice

This package contains only the browser-side client component of WebSSH2. It requires a compatible WebSSH2 server to function. The server component is available at [webssh2 server](https://github.com/billchurch/webssh2). This package is intended for advanced users who want to customize or integrate the client component independently.

## Sponsors

WebSSH2 development is supported by [Tailwind Resource Group](https://tailwindrg.com), an engineering-led IT services firm specializing in application delivery, zero trust security, and identity for federal and commercial customers.

## Requirements

- Modern web browser with JavaScript enabled
- Compatible WebSSH2 server instance (v2.0.0 or compatible)
- Socket.IO v4.8.1 compatibility

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
- **Terminal Search Functionality:**
  - Real-time search with live match highlighting
  - Case-sensitive and regex search options
  - Whole word matching
  - Match counter (current/total)
  - OS-aware keyboard shortcuts (Ctrl+F on Windows/Linux, ⌘F on macOS)
  - Navigation with Enter/Shift+Enter or arrow buttons
  - F3/Shift+F3 for quick match navigation
- **Advanced Clipboard Integration:**
  - Auto-copy on selection (similar to terminals like tmux or PuTTY, configurable)
  - Middle-click paste support (configurable)
  - Keyboard shortcuts: Ctrl+Shift+C/V (Windows/Linux) or Cmd+Shift+C/V (macOS)
  - Browser compatibility detection with fallback mechanisms
  - Visual feedback with toast notifications
  - All features can be toggled in Terminal Settings
- Customizable terminal settings:
  - Font size and family
  - Color schemes
  - Cursor behavior
  - Scrollback buffer size
  - Clipboard behavior controls
- Session logging with download capability
- Copy and paste functionality
- Terminal mouse support
- Keyboard shortcuts
- Responsive design
- Multi-factor authentication support (when supported by server)
- Support for credential replay and reauthentication

## Host Key Verification

WebSSH2 Client supports client-side SSH host key verification using a Trust On First Use (TOFU) model. When enabled by the server, the client can independently verify host keys stored in the browser alongside any server-side verification, providing an additional layer of protection against man-in-the-middle attacks.

The server controls whether host key verification is active and whether the client-side store is available. When both are enabled, the client stores trusted host key fingerprints in `localStorage` and checks them on every connection.

### Status Indicators

The status bar displays a shield icon when host key verification is active:

- **ShieldCheck (green)** — The host key is verified and matches a trusted key. The connection is authenticated.
- **ShieldAlert (amber)** — The host key is not yet stored or could not be verified against a trusted key.

Click the shield icon to open a popover with host key details including the host, port, algorithm, SHA-256 fingerprint, and where the key was verified (server store or client store).

### Trust Prompt

When connecting to an unknown host (no stored key for that host:port and algorithm), a modal appears with:

- The host and port being connected to
- The key algorithm and SHA-256 fingerprint
- **Accept** / **Reject** buttons
- A **"Remember this key (save to browser)"** checkbox (only visible when the client store is enabled)

Accepting the key allows the connection to proceed. Checking the remember option saves the key to the browser so future connections are automatically verified. Rejecting the key closes the connection.

### Mismatch Warning

If a host presents a key that does not match the previously stored fingerprint, a hard-block modal is displayed. The connection is always refused — there is no option to accept the mismatched key.

The modal shows both the expected and received fingerprints for comparison. Guidance is provided based on where the key was stored:

- **Client store** — Remove the old key from Trusted Host Keys in Settings, then reconnect.
- **Server store** — Contact your administrator to verify the server key has been intentionally changed.

### Trusted Host Keys Settings

When the client-side store is enabled, a **Trusted Host Keys** section appears in the Settings modal (click the gear icon, then expand the "Trusted Host Keys" section).

#### Viewing stored keys

Each stored key is listed by host:port with its algorithm and computed SHA-256 fingerprint.

#### Deleting keys

Click the delete button next to any key entry to remove it. This is how you resolve mismatch warnings for keys stored in the client.

#### Adding keys manually

You can pre-trust a host key by entering:

- **Host** and **Port** of the SSH server
- **Public key** in OpenSSH format: `algorithm base64key [comment]`

Supported algorithms: `ssh-ed25519`, `ssh-rsa`, `rsa-sha2-256`, `rsa-sha2-512`, `ecdsa-sha2-nistp256`, `ecdsa-sha2-nistp384`, `ecdsa-sha2-nistp521`

#### Export and import

- **Export** downloads all trusted keys as a `webssh2-hostkeys.json` file.
- **Import** reads a JSON file and merges the keys into the existing store. Duplicate entries are overwritten by the imported data.

This is useful for sharing trusted keys across browsers or backing up your key store.

### localStorage Format

Host keys are stored under the `webssh2.hostkeys` key in `localStorage`. The schema is:

```json
{
  "version": 1,
  "keys": {
    "example.com:22": {
      "ssh-ed25519": {
        "key": "<base64-encoded public key>",
        "addedAt": "2026-01-15T10:30:00.000Z"
      }
    }
  }
}
```

- `version` — Schema version (currently `1`).
- `keys` — A map keyed by `host:port`. Each value is a map of algorithm names to key entries.
- `key` — The base64-encoded public key data.
- `addedAt` — ISO 8601 timestamp of when the key was stored.

The export and import functions use this same format, so exported files can be imported into any other WebSSH2 Client instance.

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
- `headerBackground` - CSS color for the header background (hex, rgb, named colors, transparent)
- `sshterm` - Terminal type (default: xterm-color)

#### Header Customization

The header bar displays an optional label above the terminal. Two URL parameters control it:

- `header` — display text (max 100 characters, control characters stripped)
- `headerBackground` — CSS color for the bar background. Validated against `^[a-zA-Z0-9#(),.\s-]+$`. Hex (`#ff00aa`), rgb/rgba (`rgb(0, 0, 0)`), named colors (`red`, `transparent`) are accepted. Strings that don't match the pattern are rejected silently.

##### Examples

```text
?header=Production&headerBackground=#dc2626
?header=Staging&headerBackground=rgb(59,130,246)
?headerBackground=transparent
```

For gradients, animation, or layout customization beyond a solid background color, use the terminal theming feature in the server configuration.

#### Migrating from `headerStyle`

The `headerStyle` URL parameter and `header.color` POST field were removed in [issue #102](https://github.com/billchurch/webssh2_client/issues/102). Both are now silently ignored. To replace them:

| Old usage                                            | Replacement                                                |
| ---------------------------------------------------- | ---------------------------------------------------------- |
| Solid background color (`headerStyle=bg-red-600`)    | `?headerBackground=#dc2626` or `WEBSSH2_HEADER_BACKGROUND` |
| Custom text (`headerStyle=...` with no color intent) | `?header=Production` or `WEBSSH2_HEADER_TEXT`              |
| Gradients / animation / advanced layout              | Terminal theming                                           |
| `header.color` POST field                            | `header.background` POST (validated CSS color)             |

These parameters were non-functional in shipped releases prior to [`webssh2#519`](https://github.com/billchurch/webssh2/pull/519), so this change has no behavior impact on production deployments that already relied on what was rendered.

### Clipboard Settings

The WebSSH2 client includes comprehensive clipboard integration. All clipboard features can be configured through the Terminal Settings modal (accessible from the menu) or via localStorage:

#### Features

1. **Auto-copy on Selection**: Automatically copies selected text to the system clipboard when you select text with your mouse (similar to tmux or PuTTY)
2. **Middle-click Paste**: Paste clipboard contents by middle-clicking in the terminal
3. **Keyboard Shortcuts**: Use Ctrl+Shift+C to copy and Ctrl+Shift+V to paste (Cmd+Shift+C/V on macOS)

#### Configuration

Clipboard settings are stored in localStorage under `webssh2.settings.global` and can be toggled via the Terminal Settings modal:

- `clipboardAutoSelectToCopy` (default: `true`) - Enable/disable auto-copy on selection
- `clipboardEnableMiddleClickPaste` (default: `true`) - Enable/disable middle-click paste
- `clipboardEnableKeyboardShortcuts` (default: `true`) - Enable/disable keyboard shortcuts

#### Browser Compatibility

The clipboard integration includes:

- Automatic detection of browser clipboard API support
- Fallback mechanisms for older browsers
- Security context validation (HTTPS/localhost required)
- Browser-specific warnings and guidance
- Visual feedback via toast notifications for clipboard operations

#### Programmatic Configuration

You can also configure clipboard settings programmatically:

```javascript
// Read current settings
const settings = JSON.parse(
  localStorage.getItem('webssh2.settings.global') || '{}'
)

// Update clipboard settings
settings.clipboardAutoSelectToCopy = false // Disable auto-copy
settings.clipboardEnableMiddleClickPaste = true // Enable middle-click
settings.clipboardEnableKeyboardShortcuts = true // Enable shortcuts

// Save settings
localStorage.setItem('webssh2.settings.global', JSON.stringify(settings))
```

### Configuration Object

The preferred, CSP-compatible way to configure the client is the inert JSON
data block in the served HTML, which the app reads at startup:

```html
<script type="application/json" id="webssh2-config">
  { "socket": { "path": "/ssh/socket.io" }, "ssh": { "port": 22 } }
</script>
```

Setting `window.webssh2Config` from an inline script is still supported for
backward compatibility, but a strict `script-src` CSP will block inline
scripts, so new integrations should use the JSON block. When both are
present, the JSON block wins:

```javascript
window.webssh2Config = {
  socket: {
    url: null, // WebSocket URL (auto-detected if null)
    path: '/ssh/socket.io' // Socket.IO path
  },
  ssh: {
    host: null, // SSH server hostname
    port: 22, // SSH server port
    username: null,
    sshterm: 'xterm-color'
  },
  header: {
    text: null,
    background: 'green'
  },
  autoConnect: false
}
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
