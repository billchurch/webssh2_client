import type { Component } from 'solid-js'
import { createSignal, onCleanup } from 'solid-js'
import { FitAddon } from '@xterm/addon-fit'
import createDebug from 'debug'

// Import the custom solid-xterm wrapper
import { XTerm } from '../xterm-solid/components/XTerm'
import type { TerminalRef, XTermProps } from '../xterm-solid/types'
import type { Terminal, ITerminalOptions } from '@xterm/xterm'

// Import existing functionality
import { validateNumber, defaultSettings } from '../utils.js'
import { emitData, emitResize } from '../services/socket-service.js'
import { getStoredSettings } from '../settings.js'
import type { WebSSH2Config, TerminalSettings } from '../../types/config.d'

const debug = createDebug('webssh2-client:terminal-component')

interface TerminalComponentProps {
  config: WebSSH2Config
  onTerminalReady?: (terminalRef: TerminalRef) => void
  class?: string
}

export const TerminalComponent: Component<TerminalComponentProps> = (props) => {
  const [_terminalRef, setTerminalRef] = createSignal<TerminalRef>()
  let fitAddonInstance: FitAddon | null = null

  // Get terminal settings based on config
  const getTerminalOptions = (): Partial<ITerminalOptions> => {
    debug('getTerminalOptions')
    const storedSettings = getStoredSettings() as Partial<TerminalSettings>
    const terminalConfig = (props.config?.terminal ??
      {}) as Partial<TerminalSettings>

    const mergedOptions: Partial<ITerminalOptions> = {
      cursorBlink: (storedSettings.cursorBlink ??
        terminalConfig.cursorBlink ??
        defaultSettings.cursorBlink) as boolean,
      scrollback: validateNumber(
        (storedSettings.scrollback ?? terminalConfig.scrollback) as number,
        1,
        200000,
        defaultSettings.scrollback
      ),
      tabStopWidth: validateNumber(
        (storedSettings.tabStopWidth ?? terminalConfig.tabStopWidth) as number,
        1,
        100,
        defaultSettings.tabStopWidth
      ),
      fontSize: validateNumber(
        (storedSettings.fontSize ?? terminalConfig.fontSize) as number,
        1,
        72,
        defaultSettings.fontSize
      ),
      fontFamily: String(
        storedSettings.fontFamily ??
          terminalConfig.fontFamily ??
          defaultSettings.fontFamily
      ),
      letterSpacing: (storedSettings.letterSpacing ??
        terminalConfig.letterSpacing ??
        defaultSettings.letterSpacing) as number,
      lineHeight: (storedSettings.lineHeight ??
        terminalConfig.lineHeight ??
        defaultSettings.lineHeight) as number
    }

    debug('getTerminalOptions', mergedOptions)
    return mergedOptions
  }

  // Handle data from terminal (sent to server)
  const handleTerminalData = (data: string) => {
    emitData(data)
  }

  // Handle title changes
  const handleTitleChange = (title: string) => {
    document.title = title
  }

  // Handle terminal mount
  const handleTerminalMount = (terminal: Terminal, ref: TerminalRef) => {
    debug('Terminal mounted')
    setTerminalRef(ref)

    // Create and load FitAddon directly for reliable access
    fitAddonInstance = new FitAddon()
    terminal.loadAddon(fitAddonInstance)

    // Fit terminal after mount with multiple attempts for proper sizing
    const fitTerminal = () => {
      if (fitAddonInstance && ref.terminal) {
        fitAddonInstance.fit()
        const dims = { cols: ref.terminal.cols, rows: ref.terminal.rows }
        debug('Terminal fitted, dimensions:', dims.cols, 'x', dims.rows)

        // Notify parent component about dimension changes
        if (props.onTerminalReady) {
          props.onTerminalReady(ref)
        }
      }
    }

    // Also update the terminal manager with the FitAddon
    terminalManager.setTerminalRef(ref, fitAddonInstance)

    // Initial fit - single call to avoid race conditions
    fitTerminal()

    // Set up resize observer for responsive fitting
    let resizeObserver: ResizeObserver | undefined
    if (typeof ResizeObserver !== 'undefined' && ref.terminal) {
      const container = ref.terminal.element?.parentElement
      if (container) {
        resizeObserver = new ResizeObserver(() => {
          fitTerminal()
        })
        resizeObserver.observe(container)
      }
    }

    // Set up window resize listener as backup
    const handleWindowResize = () => {
      fitTerminal()
    }
    window.addEventListener('resize', handleWindowResize)

    // Cleanup function
    onCleanup(() => {
      if (resizeObserver) {
        resizeObserver.disconnect()
      }
      window.removeEventListener('resize', handleWindowResize)
      debug('Terminal resize handlers cleaned up')
    })

    // Initial notification
    if (props.onTerminalReady) {
      props.onTerminalReady(ref)
    }
  }

  // Terminal settings
  const terminalOptions = getTerminalOptions()

  const xtermProps: XTermProps = {
    options: terminalOptions,
    addons: [], // We load FitAddon directly in handleTerminalMount
    onData: handleTerminalData,
    onTitleChange: handleTitleChange,
    onMount: handleTerminalMount,
    class: props.class || 'terminal-container',
    style: {
      width: '100%',
      height: '100%'
    },
    autoFocus: true
  }

  return <XTerm {...xtermProps} />
}

// Helper functions for external access (maintaining compatibility)
export class SolidTerminalManager {
  private terminalRef: TerminalRef | null = null

  private fitAddon: FitAddon | null = null

  setTerminalRef(ref: TerminalRef, fitAddon?: FitAddon) {
    this.terminalRef = ref
    if (fitAddon) {
      this.fitAddon = fitAddon
    }
  }

  writeToTerminal(data: string): void {
    if (this.terminalRef) {
      this.terminalRef.write(data)
    }
  }

  resetTerminal(): void {
    debug('resetTerminal')
    if (this.terminalRef) {
      this.terminalRef.reset()
    }
  }

  resizeTerminal(): { cols: number; rows: number } | null {
    if (this.terminalRef && this.terminalRef.terminal && this.fitAddon) {
      this.fitAddon.fit()
      const dimensions = {
        cols: this.terminalRef.terminal.cols,
        rows: this.terminalRef.terminal.rows
      }
      debug('resizeTerminal', dimensions)

      // Emit resize to socket service
      emitResize(dimensions)

      return dimensions
    }
    return null
  }

  focusTerminal(): void {
    if (this.terminalRef) {
      this.terminalRef.focus()
    }
  }

  getTerminalDimensions(): { cols: number; rows: number } {
    if (this.terminalRef && this.terminalRef.terminal) {
      const { cols, rows } = this.terminalRef.terminal
      debug('getTerminalDimensions', { cols, rows })
      return { cols, rows }
    }
    console.error('getTerminalDimensions: Terminal not initialized')
    return { cols: 0, rows: 0 }
  }

  updateTerminalSettings(newOptions: Partial<ITerminalOptions>): void {
    if (this.terminalRef && this.terminalRef.terminal) {
      Object.assign(this.terminalRef.terminal.options, newOptions)
      this.terminalRef.fit()
      debug('updateTerminalSettings', newOptions)
    }
  }

  applyTerminalSettings(options: Partial<ITerminalOptions>): void {
    if (!this.terminalRef || !this.terminalRef.terminal) {
      console.error('applyTerminalSettings: Terminal not initialized')
      return
    }
    debug('applyTerminalSettings', options)

    const terminalSettings: Partial<ITerminalOptions> = {
      cursorBlink: (options.cursorBlink ??
        defaultSettings.cursorBlink) as boolean,
      scrollback: validateNumber(
        options.scrollback as number,
        1,
        200000,
        defaultSettings.scrollback
      ),
      tabStopWidth: validateNumber(
        options.tabStopWidth as number,
        1,
        100,
        defaultSettings.tabStopWidth
      ),
      fontSize: validateNumber(
        options.fontSize as number,
        1,
        72,
        defaultSettings.fontSize
      ),
      fontFamily: String(options.fontFamily ?? defaultSettings.fontFamily),
      letterSpacing: (options.letterSpacing ??
        defaultSettings.letterSpacing) as number,
      lineHeight: (options.lineHeight ?? defaultSettings.lineHeight) as number
    }

    Object.assign(this.terminalRef.terminal.options, terminalSettings)
    this.terminalRef.fit()
  }

  getTerminalInstance(): Terminal | null {
    return this.terminalRef?.terminal || null
  }
}

// Export singleton instance for compatibility
export const terminalManager = new SolidTerminalManager()
