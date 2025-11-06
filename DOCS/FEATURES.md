# Features

## Table of Contents

- [Terminal Configuration](#terminal-configuration)
- [Session Logging](#session-logging)
- [Private Key Authentication](#private-key-authentication)
- [Reauth and Credential Replay](#reauth-and-credential-replay)
- [Keyboard-Interactive Authentication](#keyboard-interactive-authentication)
- [Security Features](#security-features)

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

## Session Logging

WebSSH2 Client supports session logging to help capture terminal output during a session.

### Starting/Stopping Logging

- Use the menu (☰) → Start Log / Stop Log to toggle logging.
- When logging starts, a “Download Log” button becomes available.

### Storage and Recovery

- While logging is enabled, output is appended to `localStorage.webssh2_session_log`.
- A timestamp is stored in `localStorage.webssh2_session_log_date`.
- On the next connection, if a prior log exists, the client prompts you to download it.

### Downloading

- Click “Download Log” to download immediately. After a successful download, the stored log is cleared.

## Private Key Authentication

The login dialog supports OpenSSH-style private key authentication:

- Toggle the “Add SSH Key” section to paste a PEM key, or upload a `.pem/.key` file.
- An optional passphrase can be provided for encrypted keys.
- The key is validated for standard and encrypted RSA formats before use.
- The available authentication controls are filtered by the server’s `allowedAuthMethods` list when `/ssh/config` is accessible; disallowed options are hidden and their form fields are ignored.
- If the server endpoint is unreachable, the client falls back to the legacy “all methods available” behaviour so users are not locked out unexpectedly.

No private key material is persisted by the client; it is used only for the active session.

## Reauth and Credential Replay

When permitted by the server, the client exposes additional session controls:

- Reauthenticate (reauth): Prompts to re-enter credentials for the current session.
- Replay Credentials: Requests the server to reuse the previously provided credentials when supported.

## Keyboard-Interactive Authentication

WebSSH2 Client supports keyboard-interactive authentication, which allows for more complex authentication scenarios beyond simple password-based authentication. This feature is particularly useful for systems that require multi-factor authentication or challenge-response mechanisms.

### How it Works

1. When the SSH server requests keyboard-interactive authentication, the WebSSH2 Client will display a prompt dialog to the user.
2. The prompt dialog will show the message sent by the SSH server, which typically includes instructions or questions for the user.
3. Users can enter their response in the provided input field.
4. After submitting the response, the client sends it back to the SSH server.
5. This process may repeat multiple times if the SSH server requires additional information.

## Security Features

- No `innerHTML` for user content: UI text uses `textContent`. Terminal output renders through xterm’s `write()` as text.
- CSP: Strict `script-src 'self'` (no inline scripts). `style-src 'self' 'unsafe-inline'` allows xterm DOM renderer and validated color updates.
- Lint guardrails: ESLint `no-unsanitized` plugin and custom bans prevent introducing `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`, string-based timers, or `new Function`.
- URL/config validation: User inputs from URL or forms are validated and sanitized before use.
