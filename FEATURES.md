# Features

## Table of Contents

- [Terminal Configuration](#terminal-configuration)
- [Keyboard-Interactive Authentication](#keyboard-interactive-authentication)

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