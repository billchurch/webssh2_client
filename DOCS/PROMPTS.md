# Generic Prompt Interface

The WebSSH2 client supports a server-driven prompt system that enables dynamic user interactions without client-side code changes. The server can request user input, confirmations, display notices, or show non-blocking toast notifications.

## Quick Start

Send a prompt from the server:

```javascript
socket.emit('prompt', {
  id: 'example-1',
  type: 'confirm',
  title: 'Confirm Action',
  message: 'Are you sure you want to proceed?',
  buttons: [
    { action: 'cancel', label: 'Cancel', variant: 'secondary' },
    { action: 'confirm', label: 'Confirm', variant: 'primary', default: true }
  ]
})
```

Listen for the response:

```javascript
socket.on('prompt-response', (response) => {
  console.log(response.id)      // 'example-1'
  console.log(response.action)  // 'confirm' or 'cancel'
})
```

## Prompt Types

### Input Prompt

Collects user input via text or password fields.

```javascript
socket.emit('prompt', {
  id: 'auth-1',
  type: 'input',
  title: 'Authentication Required',
  message: 'Please enter your credentials',
  icon: 'Lock',
  severity: 'warning',
  inputs: [
    { id: 'username', label: 'Username', type: 'text', required: true },
    { id: 'password', label: 'Password', type: 'password', required: true }
  ],
  buttons: [
    { action: 'cancel', label: 'Cancel', variant: 'secondary' },
    { action: 'submit', label: 'Login', variant: 'primary', default: true }
  ],
  closeOnBackdrop: false
})
```

Response includes input values:

```javascript
{
  id: 'auth-1',
  action: 'submit',
  inputs: { username: 'admin', password: 'secret123' }
}
```

### Confirm Prompt

Yes/No or custom choice dialogs.

```javascript
socket.emit('prompt', {
  id: 'delete-1',
  type: 'confirm',
  title: 'Delete File?',
  message: 'This action cannot be undone.',
  icon: 'Trash2',
  severity: 'error',
  buttons: [
    { action: 'cancel', label: 'Cancel', variant: 'secondary' },
    { action: 'delete', label: 'Delete', variant: 'danger', default: true }
  ]
})
```

### Notice Prompt

Informational modal requiring acknowledgment.

```javascript
socket.emit('prompt', {
  id: 'notice-1',
  type: 'notice',
  title: 'Connection Lost',
  message: 'The SSH connection was terminated by the remote host.',
  severity: 'error',
  icon: 'WifiOff'
})
```

Default button is "OK" if none specified.

### Toast Notification

Non-blocking notification in the bottom-right corner.

```javascript
socket.emit('prompt', {
  id: 'toast-1',
  type: 'toast',
  title: 'File uploaded successfully',
  severity: 'success',
  timeout: 3000  // Auto-dismiss after 3 seconds
})
```

Toasts support:

- Close button for manual dismiss
- Swipe-to-dismiss on touch devices
- Auto-timeout (default 5 seconds)
- Stacking up to 5 toasts

## Payload Reference

### PromptPayload

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `id` | `string` | Yes | Unique identifier for the prompt |
| `type` | `'input' \| 'confirm' \| 'notice' \| 'toast'` | Yes | Prompt type |
| `title` | `string` | Yes | Title text |
| `message` | `string` | No | Body text |
| `buttons` | `PromptButton[]` | No | Action buttons |
| `inputs` | `PromptInput[]` | No | Input fields (for `type: 'input'`) |
| `severity` | `'info' \| 'warning' \| 'error' \| 'success'` | No | Visual styling (default: `'info'`) |
| `icon` | `string` | No | Icon name from registry |
| `autoFocus` | `boolean` | No | Auto-focus first input (default: `true`) |
| `timeout` | `number` | No | Toast auto-dismiss in ms (default: 5000) |
| `closeOnBackdrop` | `boolean` | No | Allow backdrop click to close (default: `true`) |
| `sound` | `boolean` | No | Play sound notification |

### PromptButton

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `action` | `string` | Yes | Action identifier (returned in response) |
| `label` | `string` | Yes | Button text |
| `variant` | `'primary' \| 'secondary' \| 'danger'` | No | Button style |
| `default` | `boolean` | No | Submit on Enter key (client-side only) |

### PromptInput

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `id` | `string` | Yes | Input identifier (key in response) |
| `label` | `string` | Yes | Input label |
| `type` | `'text' \| 'password'` | Yes | Input type |
| `placeholder` | `string` | No | Placeholder text |
| `required` | `boolean` | No | Validation required |
| `value` | `string` | No | Initial value |

### PromptResponsePayload

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` | Prompt ID |
| `action` | `string` | Button action that was clicked, or `'dismissed'`/`'timeout'` |
| `inputs` | `Record<string, string>` | Input values (only for `type: 'input'`) |

## Icons

Icons are loaded from a static registry of [Lucide icons](https://lucide.dev/icons/). Common icons include:

| Icon Name | Use Case |
|-----------|----------|
| `Info` | Information notices |
| `TriangleAlert` | Warnings |
| `CircleAlert` | Errors |
| `CircleCheckBig` | Success messages |
| `Lock` | Authentication |
| `Key` | Credentials |
| `Trash2` | Delete actions |
| `Download` | Downloads |
| `Upload` | Uploads |
| `WifiOff` | Connection issues |
| `Shield` | Security |
| `Terminal` | Terminal operations |

If an invalid icon name is provided, the system falls back to the severity default:

- `info` → Info
- `warning` → TriangleAlert
- `error` → CircleAlert
- `success` → CircleCheckBig

## Severity Styling

| Severity | Icon Color | Border Color |
|----------|------------|--------------|
| `info` | Blue | Blue |
| `warning` | Yellow | Yellow |
| `error` | Red | Red |
| `success` | Green | Green |

## Security Features

### Rate Limiting

The client enforces rate limits to prevent prompt flooding:

- **Soft limit**: 5 prompts per second (excess prompts are dropped)
- **Circuit breaker**: 10 prompts per second triggers:
  1. Error modal displayed to user
  2. Socket disconnection
  3. All pending prompts cleared

### XSS Prevention

All prompt text is rendered using SolidJS text interpolation, which automatically escapes HTML entities. The system never uses `innerHTML` with prompt content.

### Icon Security

Icons are resolved from a static registry. Arbitrary icon names cannot load external resources or execute code.

## Keyboard Navigation

| Key | Action |
|-----|--------|
| `Tab` | Navigate between inputs/buttons |
| `Shift+Tab` | Navigate backwards |
| `Enter` | Submit (when on default button) |
| `Escape` | Close (if `closeOnBackdrop: true` or after 5s) |
| `Ctrl+Shift+Escape` | Emergency close all prompts |

## Focus Trap Safety

Modals trap keyboard focus. If a modal cannot be closed normally (e.g., `closeOnBackdrop: false`), the following safety mechanisms apply:

1. After 5 seconds, backdrop click and Escape key are force-enabled
2. A hint message appears: "Click outside or press Escape to close"
3. `Ctrl+Shift+Escape` always works as emergency close

## Sound Notifications

Optional audio alerts can be triggered with `sound: true`. Users can enable/disable sounds via:

```javascript
// Check if audio is enabled
import { isAudioEnabled, setAudioEnabled } from './utils/prompt-sounds'

isAudioEnabled()      // Returns boolean
setAudioEnabled(true) // Enable sounds
```

Sound preferences are stored in localStorage (`webssh2_audio_enabled`).

## Queue Management

- **Modals**: Maximum 3 queued (oldest dropped if exceeded)
- **Toasts**: Maximum 5 visible (oldest removed if exceeded)

## Examples

### SSH Key Passphrase

```javascript
socket.emit('prompt', {
  id: 'passphrase-1',
  type: 'input',
  title: 'SSH Key Passphrase',
  message: 'Enter passphrase for key: ~/.ssh/id_rsa',
  icon: 'Key',
  severity: 'warning',
  inputs: [
    { id: 'passphrase', label: 'Passphrase', type: 'password', required: true }
  ],
  buttons: [
    { action: 'cancel', label: 'Cancel', variant: 'secondary' },
    { action: 'unlock', label: 'Unlock', variant: 'primary', default: true }
  ],
  closeOnBackdrop: false
})
```

### Host Key Verification

```javascript
socket.emit('prompt', {
  id: 'hostkey-1',
  type: 'confirm',
  title: 'Unknown Host',
  message: 'The authenticity of host "192.168.1.100" cannot be established.\n\nFingerprint: SHA256:abc123...\n\nAre you sure you want to continue?',
  icon: 'Shield',
  severity: 'warning',
  buttons: [
    { action: 'reject', label: 'Reject', variant: 'secondary' },
    { action: 'accept', label: 'Accept', variant: 'primary', default: true }
  ]
})
```

### Connection Error

```javascript
socket.emit('prompt', {
  id: 'error-1',
  type: 'notice',
  title: 'Connection Failed',
  message: 'Unable to connect to 192.168.1.100:22\nError: Connection refused',
  icon: 'WifiOff',
  severity: 'error',
  sound: true
})
```

### File Transfer Progress

```javascript
// Start transfer
socket.emit('prompt', {
  id: 'transfer-1',
  type: 'toast',
  title: 'Uploading document.pdf...',
  severity: 'info',
  timeout: 0  // No auto-dismiss
})

// Complete transfer
socket.emit('prompt', {
  id: 'transfer-2',
  type: 'toast',
  title: 'Upload complete: document.pdf',
  severity: 'success',
  timeout: 3000
})
```
