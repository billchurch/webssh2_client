# WebSSH2 Client Clipboard Integration Guide

## Overview

WebSSH2 Client includes comprehensive clipboard integration similar to PuTTY, with features that can be configured through the Terminal Settings modal or via localStorage. All clipboard settings changes take effect immediately without requiring a page reload.

## Features

- **Auto-copy on Selection**: Automatically copies selected text to clipboard (PuTTY-style)
- **Middle-click Paste**: Paste clipboard contents with middle mouse button
- **Keyboard Shortcuts**: Ctrl+Shift+C/V (or Cmd+Shift+C/V on macOS) for copy/paste

## Implementation Details

### Key Components

1. **TerminalClipboardIntegration** (`client/src/lib/clipboard/terminal-clipboard-integration.ts`)
   - Core clipboard functionality class
   - Manages event handlers for auto-copy, middle-click paste, and keyboard shortcuts
   - Properly removes and re-attaches event handlers when settings change

2. **ClipboardManager** (`client/src/lib/clipboard/clipboard-manager.ts`)
   - Singleton pattern for clipboard API access
   - Handles browser compatibility and permissions
   - Provides toast notifications for clipboard operations

3. **Terminal Component Integration** (`client/src/components/Terminal.tsx`)

```typescript
// Terminal.tsx - Clipboard initialization
const handleTerminalMount = (terminal: Terminal, ref: TerminalRef) => {
  // Initialize clipboard integration with settings from localStorage
  const storedSettings = getStoredSettings() as Partial<TerminalSettings>
  const clipboardSettings: ClipboardSettings = {
    autoSelectToClipboard:
      storedSettings?.clipboardAutoSelectToCopy ?? defaultSettings.clipboardAutoSelectToCopy,
    enableMiddleClickPaste:
      storedSettings?.clipboardEnableMiddleClickPaste ?? defaultSettings.clipboardEnableMiddleClickPaste,
    enableKeyboardShortcuts:
      storedSettings?.clipboardEnableKeyboardShortcuts ?? defaultSettings.clipboardEnableKeyboardShortcuts
  }

  const clipboardInstance = new TerminalClipboardIntegration(clipboardSettings)
  clipboardInstance.attach(terminal)
  setClipboardIntegration(clipboardInstance)

  // Terminal actions expose clipboard functionality
  clipboard: {
    copy: async () => {
      const clipboard = clipboardIntegration()
      const term = terminalRef()?.terminal
      if (clipboard && term) {
        const selection = term.getSelection()
        if (selection) {
          const manager = (clipboard as any).clipboardManager
          return await manager.writeText(selection)
        }
      }
      return false
    },
    paste: async () => {
      const clipboard = clipboardIntegration()
      const term = terminalRef()?.terminal
      if (clipboard && term) {
        const manager = (clipboard as any).clipboardManager
        const text = await manager.readText()
        if (text) {
          term.paste(text)
        }
      }
    },
    updateSettings: (settings: Partial<ClipboardSettings>) => {
      const clipboard = clipboardIntegration()
      if (clipboard) {
        clipboard.updateSettings(settings)
      }
    }
  }
}
```

### 4. Settings Management (app.tsx and TerminalSettingsModal.tsx)

```typescript
// TerminalSettingsModal.tsx - Pass ALL settings including clipboard
const handleSubmit = (e: Event) => {
  e.preventDefault()
  const currentSettings = settings()

  // Convert to ITerminalOptions format
  const terminalOptions: Partial<ITerminalOptions> = {
    fontSize: currentSettings.fontSize,
    fontFamily: currentSettings.fontFamily,
    cursorBlink: currentSettings.cursorBlink,
    scrollback: currentSettings.scrollback,
    tabStopWidth: currentSettings.tabStopWidth
  }

  // Save settings
  saveTerminalSettings(currentSettings as unknown as Record<string, unknown>)

  // Apply to terminal - pass ALL settings including clipboard settings
  props.onSave({
    ...terminalOptions,
    clipboardAutoSelectToCopy: currentSettings.clipboardAutoSelectToCopy,
    clipboardEnableMiddleClickPaste:
      currentSettings.clipboardEnableMiddleClickPaste,
    clipboardEnableKeyboardShortcuts:
      currentSettings.clipboardEnableKeyboardShortcuts
  })
  props.onClose()
}

// app.tsx - Handle settings updates without page reload
const handleTerminalSettings = (settings: Record<string, unknown>) => {
  const actions = terminalActions()
  if (actions) {
    // Apply terminal display settings
    actions.applySettings(settings as Partial<ITerminalOptions>)

    // Apply clipboard settings if they exist
    const clipboardSettings: Partial<ClipboardSettings> = {}
    if ('clipboardAutoSelectToCopy' in settings) {
      clipboardSettings.autoSelectToClipboard =
        settings.clipboardAutoSelectToCopy as boolean
    }
    if ('clipboardEnableMiddleClickPaste' in settings) {
      clipboardSettings.enableMiddleClickPaste =
        settings.clipboardEnableMiddleClickPaste as boolean
    }
    if ('clipboardEnableKeyboardShortcuts' in settings) {
      clipboardSettings.enableKeyboardShortcuts =
        settings.clipboardEnableKeyboardShortcuts as boolean
    }

    if (Object.keys(clipboardSettings).length > 0 && actions.clipboard) {
      actions.clipboard.updateSettings(clipboardSettings)
    }
  }
}
```

### 5. TerminalClipboardIntegration Class

```typescript
// terminal-clipboard-integration.ts
export class TerminalClipboardIntegration {
  private terminal: Terminal | null = null
  private clipboardManager: ClipboardManager
  private settings: ClipboardSettings

  // Event handler references for proper cleanup
  private mouseUpHandler: ((e: MouseEvent) => void) | null = null
  private auxClickHandler: ((e: MouseEvent) => void) | null = null
  private keyDownHandler: ((e: KeyboardEvent) => void) | null = null

  updateSettings(settings: Partial<ClipboardSettings>): void {
    this.settings = { ...this.settings, ...settings }
    // Remove all existing handlers
    this.removeEventHandlers()
    // Re-attach handlers with new settings
    this.setupEventHandlers()
  }

  private removeEventHandlers(): void {
    // Properly remove all event handlers
    if (this.mouseUpHandler) {
      const element = this.terminal?.element
      if (element) {
        element.removeEventListener('mouseup', this.mouseUpHandler)
      }
      this.mouseUpHandler = null
    }

    if (this.auxClickHandler) {
      const element = this.terminal?.element
      if (element) {
        element.removeEventListener('auxclick', this.auxClickHandler)
      }
      this.auxClickHandler = null
    }

    if (this.keyDownHandler) {
      document.removeEventListener('keydown', this.keyDownHandler)
      this.keyDownHandler = null
    }
  }

  private setupAutoSelectToClipboard(): void {
    // Custom handler for auto-copy on selection
    this.mouseUpHandler = async () => {
      setTimeout(async () => {
        const selection = this.terminal?.getSelection()
        if (selection) {
          const success = await this.clipboardManager.writeText(selection)
          if (success) {
            this.showToast('Copied to clipboard', 'success')
          }
        }
      }, 10)
    }
    element.addEventListener('mouseup', this.mouseUpHandler)
  }

  private setupMiddleClickPaste(): void {
    // Store handler reference for proper cleanup
    this.auxClickHandler = async (e: MouseEvent) => {
      if (e.button === 1) {
        e.preventDefault()
        const text = await this.clipboardManager.readText()
        if (text && this.terminal) {
          this.terminal.paste(text)
        }
      }
    }
    element.addEventListener('auxclick', this.auxClickHandler)
  }
}
```

### 6. Add Styles for Better UX

```css
/* webssh2.css */
.terminal-wrapper {
  position: relative;
  height: 100%;
  width: 100%;
}

.terminal-container {
  height: 100%;
  width: 100%;
  /* Ensure terminal receives mouse events */
  user-select: none;
}

/* Override xterm selection color for better visibility */
.terminal-container .xterm-selection div {
  background-color: rgba(130, 180, 255, 0.3) !important;
}

/* Visual feedback for clipboard operations */
.clipboard-toast {
  position: fixed;
  bottom: 20px;
  right: 20px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 10px 20px;
  border-radius: 4px;
  z-index: 1000;
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.clipboard-warning {
  background-color: #ff9800;
  color: white;
  padding: 8px;
  text-align: center;
  font-size: 14px;
}
```

## Clipboard Settings

Clipboard settings are stored in localStorage under `webssh2.settings.global` and can be configured via the Terminal Settings modal:

### Available Settings

- `clipboardAutoSelectToCopy` (default: `true`) - Enable/disable auto-copy on selection (PuTTY-style)
- `clipboardEnableMiddleClickPaste` (default: `true`) - Enable/disable middle-click paste
- `clipboardEnableKeyboardShortcuts` (default: `true`) - Enable/disable keyboard shortcuts (Ctrl+Shift+C/V or Cmd+Shift+C/V on macOS)

### Key Features

1. **Immediate Effect**: Settings changes take effect immediately without requiring a page reload
2. **Event Handler Management**: Properly removes and re-attaches event handlers when settings change
3. **Browser Compatibility**: Automatic detection of browser clipboard API support with fallback mechanisms
4. **Visual Feedback**: Toast notifications for clipboard operations
5. **Security Context Validation**: HTTPS/localhost required for clipboard API

````

### Browser Compatibility Helper

```typescript
// clipboard-compatibility.ts
export class ClipboardCompatibility {
  static isSupported(): boolean {
    return !!(navigator.clipboard &&
              navigator.clipboard.readText &&
              navigator.clipboard.writeText);
  }

  static isSecureContext(): boolean {
    return window.isSecureContext;
  }

  static getWarnings(): string[] {
    const warnings: string[] = [];

    if (!this.isSecureContext()) {
      warnings.push('Clipboard API requires HTTPS or localhost');
    }

    if (!this.isSupported()) {
      warnings.push('Browser does not fully support Clipboard API');
    }

    // Check for specific browser issues
    const userAgent = navigator.userAgent.toLowerCase();

    if (userAgent.includes('firefox')) {
      warnings.push('Firefox may require clipboard permissions in about:config');
    }

    if (userAgent.includes('safari') && !userAgent.includes('chrome')) {
      warnings.push('Safari may have limited clipboard support');
    }

    return warnings;
  }

  static async requestPermission(): Promise<boolean> {
    try {
      // Try to read clipboard to trigger permission prompt
      await navigator.clipboard.readText();
      return true;
    } catch (err) {
      console.warn('Clipboard permission denied or not available:', err);
      return false;
    }
  }
}
````

### Programmatic Configuration

You can configure clipboard settings programmatically:

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

## Testing Guide

### Manual Testing Steps

1. **Test auto-copy on selection:**
   - Select text in terminal with mouse
   - Paste elsewhere (e.g., text editor) with Ctrl+V
   - Should paste the selected text

2. **Test middle-click paste:**
   - Copy text from any source
   - Middle-click in terminal
   - Text should be pasted at cursor position

3. **Test keyboard shortcuts:**
   - Select text and press Ctrl+Shift+C (or Cmd+Shift+C on Mac)
   - Press Ctrl+Shift+V to paste

4. **Test multi-click selection:**
   - Double-click to select word
   - Triple-click to select line
   - Each should auto-copy to clipboard

### Browser Compatibility Notes

| Feature            | Chrome | Firefox | Safari | Edge |
| ------------------ | ------ | ------- | ------ | ---- |
| Auto-copy          | ✅     | ✅\*    | ⚠️     | ✅   |
| Middle-click       | ✅     | ✅      | ❌\*\* | ✅   |
| Keyboard shortcuts | ✅     | ✅      | ✅     | ✅   |

\* Firefox may require `dom.events.asyncClipboard` enabled in about:config
\*\* Safari doesn't support middle-click; use Cmd+V instead

## Troubleshooting

### Common Issues and Solutions

1. **Clipboard not working in HTTP:**
   - Solution: Use HTTPS or localhost
   - The Clipboard API requires a secure context

2. **Middle-click not working:**
   - Check if mouse has middle button
   - Try Shift+Insert as alternative
   - Some trackpads: click with three fingers

3. **Auto-copy not working:**
   - Check browser console for errors
   - Verify clipboard permissions
   - Try manual copy first to trigger permission prompt

4. **Selection not visible:**
   - Adjust selection color in terminal theme
   - Check CSS for selection overrides

## Implementation Architecture

### Settings Flow

1. User changes settings in Terminal Settings modal (`TerminalSettingsModal.tsx`)
2. Settings are saved to localStorage via `saveTerminalSettings()`
3. `handleTerminalSettings()` in `app.tsx` is called with new settings
4. Terminal display settings are applied via `actions.applySettings()`
5. Clipboard settings are mapped and applied via `actions.clipboard.updateSettings()`
6. `TerminalClipboardIntegration.updateSettings()` is called
7. Old event handlers are removed via `removeEventHandlers()`
8. New event handlers are attached via `setupEventHandlers()` with updated settings
9. Changes take effect immediately without page reload

### Critical Implementation Details

1. **Custom Implementation**: All clipboard functionality is implemented with custom event handlers. We do NOT use `@xterm/addon-clipboard` as it's for OSC 52 sequences, not auto-copy.

2. **Property Name Mapping**: The settings form uses `clipboardAutoSelectToCopy`, `clipboardEnableMiddleClickPaste`, and `clipboardEnableKeyboardShortcuts`, which are mapped to `autoSelectToClipboard`, `enableMiddleClickPaste`, and `enableKeyboardShortcuts` for the ClipboardSettings interface.

3. **Event Handler References**: All event handlers (mouseup for auto-copy, auxclick for middle-click, keydown for shortcuts) must be stored as class properties to enable proper cleanup when settings change.

4. **Dynamic Handler Management**: When settings change, ALL handlers are removed and only the enabled features' handlers are re-attached, ensuring immediate effect.

5. **Settings Modal Integration**: The `TerminalSettingsModal` must pass ALL settings (including clipboard settings) to the `onSave` callback, not just terminal display options. This ensures clipboard settings are properly propagated to the `handleTerminalSettings` function.

6. **Debug Logging**: Debug logging is available via namespace `webssh2-client:clipboard` to track settings changes, event handler attachment/removal, and clipboard operations. Enable with `localStorage.debug = 'webssh2-client:clipboard'`.

## Performance Considerations

- The clipboard addon is lightweight and event-driven
- Selection events are debounced internally by xterm.js
- Clipboard operations are async and won't block UI
- Settings are cached in localStorage for fast access
- Event handler removal and re-attachment is efficient and prevents memory leaks

## Security Notes

- Clipboard API requires user interaction or permission
- Auto-copy only works with user-initiated selections
- Reading clipboard requires explicit permission
- Consider adding clipboard content sanitization for production
