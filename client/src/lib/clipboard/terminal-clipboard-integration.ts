import type { Terminal } from '@xterm/xterm'
import createDebug from 'debug'
import { ClipboardManager } from './clipboard-manager'

const debug = createDebug('webssh2-client:clipboard')

export interface ClipboardSettings {
  autoSelectToClipboard: boolean
  enableMiddleClickPaste: boolean
  enableKeyboardShortcuts: boolean
}

export class TerminalClipboardIntegration {
  private terminal: Terminal | null = null

  private clipboardManager: ClipboardManager

  private settings: ClipboardSettings

  private mouseUpHandler: ((e: MouseEvent) => void) | null = null

  private keyDownHandler: ((e: KeyboardEvent) => void) | null = null

  private auxClickHandler: ((e: MouseEvent) => void) | null = null

  constructor(
    settings: ClipboardSettings = {
      autoSelectToClipboard: true,
      enableMiddleClickPaste: true,
      enableKeyboardShortcuts: true
    }
  ) {
    this.clipboardManager = ClipboardManager.getInstance()
    this.settings = settings
    debug('TerminalClipboardIntegration initialized with settings:', settings)
  }

  getClipboardManager(): ClipboardManager {
    return this.clipboardManager
  }

  attach(terminal: Terminal): void {
    if (this.terminal) {
      this.detach()
    }

    this.terminal = terminal
    this.setupEventHandlers()
  }

  detach(): void {
    this.removeEventHandlers()
    this.terminal = null
  }

  updateSettings(settings: Partial<ClipboardSettings>): void {
    const oldSettings = { ...this.settings }
    this.settings = { ...this.settings, ...settings }
    debug('Updating clipboard settings:', {
      old: oldSettings,
      new: this.settings,
      changes: settings
    })
    // Remove all existing event handlers
    this.removeEventHandlers()
    // Re-setup event handlers with new settings
    this.setupEventHandlers()
    debug('Settings update complete')
  }

  private setupEventHandlers(): void {
    if (!this.terminal) {
      debug('Cannot setup event handlers: terminal is null')
      return
    }

    debug('Setting up event handlers with settings:', this.settings)

    if (this.settings.autoSelectToClipboard) {
      debug('Setting up auto-select to clipboard')
      this.setupAutoSelectToClipboard()
    }

    if (this.settings.enableMiddleClickPaste) {
      debug('Setting up middle-click paste')
      this.setupMiddleClickPaste()
    }

    if (this.settings.enableKeyboardShortcuts) {
      debug('Setting up keyboard shortcuts')
      this.setupKeyboardShortcuts()
    }
  }

  private removeEventHandlers(): void {
    debug('Removing event handlers')

    if (this.mouseUpHandler) {
      const element = this.terminal?.element
      if (element) {
        element.removeEventListener('mouseup', this.mouseUpHandler)
        debug('Removed mouseup handler')
      }
      this.mouseUpHandler = null
    }

    if (this.auxClickHandler) {
      const element = this.terminal?.element
      if (element) {
        element.removeEventListener('auxclick', this.auxClickHandler)
        debug('Removed auxclick handler')
      }
      this.auxClickHandler = null
    }

    if (this.keyDownHandler) {
      document.removeEventListener('keydown', this.keyDownHandler)
      debug('Removed keydown handler')
      this.keyDownHandler = null
    }
  }

  private setupAutoSelectToClipboard(): void {
    if (!this.terminal) {
      debug('Cannot setup auto-select: terminal is null')
      return
    }

    const element = this.terminal.element
    if (!element) {
      debug('Cannot setup auto-select: terminal element is null')
      return
    }

    let lastSelection = ''

    // Store the handler first, then add it
    this.mouseUpHandler = async () => {
      setTimeout(async () => {
        const selection = this.terminal?.getSelection()
        if (selection && selection !== lastSelection) {
          lastSelection = selection
          debug(
            'Auto-copying selection to clipboard:',
            selection.substring(0, 50) + (selection.length > 50 ? '...' : '')
          )
          const success = await this.clipboardManager.writeText(selection)
          if (success) {
            debug('Auto-copy successful')
            this.showToast('Copied to clipboard', 'success')
          } else {
            debug('Auto-copy failed')
          }
        }
      }, 10)
    }

    element.addEventListener('mouseup', this.mouseUpHandler)
    debug('Auto-select handler attached')
  }

  private setupMiddleClickPaste(): void {
    if (!this.terminal) {
      debug('Cannot setup middle-click: terminal is null')
      return
    }

    const element = this.terminal.element
    if (!element) {
      debug('Cannot setup middle-click: terminal element is null')
      return
    }

    // Store the handler first, then add it
    this.auxClickHandler = async (e: MouseEvent) => {
      if (e.button === 1) {
        e.preventDefault()
        debug('Middle-click paste triggered')
        const text = await this.clipboardManager.readText()
        if (text && this.terminal) {
          const preview =
            text.substring(0, 50) + (text.length > 50 ? '...' : '')
          debug('Pasting from clipboard:', preview)
          this.terminal.paste(text)
        } else {
          debug(
            'Middle-click paste: no text in clipboard or terminal unavailable'
          )
        }
      }
    }

    element.addEventListener('auxclick', this.auxClickHandler)
    debug('Middle-click handler attached')
  }

  private setupKeyboardShortcuts(): void {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0

    this.keyDownHandler = async (e: KeyboardEvent) => {
      const isModified = isMac ? e.metaKey : e.ctrlKey

      if (isModified && e.shiftKey) {
        if (e.key === 'C' || e.key === 'c') {
          e.preventDefault()
          await this.handleCopy()
        } else if (e.key === 'V' || e.key === 'v') {
          e.preventDefault()
          await this.handlePaste()
        }
      }
    }

    document.addEventListener('keydown', this.keyDownHandler)
  }

  private async handleCopy(): Promise<void> {
    if (!this.terminal) return

    const selection = this.terminal.getSelection()
    if (selection) {
      debug(
        'Keyboard shortcut copy triggered, selection:',
        selection.substring(0, 50) + (selection.length > 50 ? '...' : '')
      )
      const success = await this.clipboardManager.writeText(selection)
      if (success) {
        debug('Keyboard copy successful')
        this.showToast('Copied to clipboard', 'success')
      } else {
        debug('Keyboard copy failed')
        this.showToast('Failed to copy to clipboard', 'error')
      }
    } else {
      debug('Keyboard copy: no selection')
    }
  }

  private async handlePaste(): Promise<void> {
    if (!this.terminal) return

    debug('Keyboard shortcut paste triggered')
    const text = await this.clipboardManager.readText()
    if (text) {
      const preview = text.substring(0, 50) + (text.length > 50 ? '...' : '')
      debug('Keyboard paste, text:', preview)
      this.terminal.paste(text)
    } else {
      debug('Keyboard paste: no text in clipboard or access denied')
      this.showToast('Clipboard access denied or empty', 'warning')
    }
  }

  private getToastBackgroundColor(
    type: 'success' | 'error' | 'warning'
  ): string {
    if (type === 'success') {
      return '#4caf50'
    }
    if (type === 'error') {
      return '#f44336'
    }
    return '#ff9800'
  }

  private showToast(
    message: string,
    type: 'success' | 'error' | 'warning' = 'success'
  ): void {
    const existingToast = document.querySelector('.clipboard-toast')
    if (existingToast) {
      existingToast.remove()
    }

    const toast = document.createElement('div')
    toast.className = `clipboard-toast clipboard-toast-${type}`
    toast.textContent = message
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: ${this.getToastBackgroundColor(type)};
      color: white;
      padding: 12px 24px;
      border-radius: 4px;
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.2);
      animation: slideIn 0.3s ease;
    `

    document.body.appendChild(toast)

    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease'
      setTimeout(() => toast.remove(), 300)
    }, 2000)
  }

  async getPermissionStatus() {
    return this.clipboardManager.checkPermissions()
  }
}
