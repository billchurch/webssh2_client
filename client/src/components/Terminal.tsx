import type { Component } from 'solid-js'
import { createSignal, onCleanup } from 'solid-js'
import { FitAddon } from '@xterm/addon-fit'
import createDebug from 'debug'

// Import the custom solid-xterm wrapper
import { XTerm } from '../lib/xterm-solid/components/XTerm'
import type { TerminalRef, XTermProps } from '../lib/xterm-solid/types'
import type { Terminal, ITerminalOptions } from '@xterm/xterm'

// Import existing functionality
import { validateNumber, defaultSettings } from '../utils/index.js'
import { emitData, emitResize } from '../services/socket.js'
import { getStoredSettings } from '../utils/settings.js'
import type { WebSSH2Config, TerminalSettings } from '../types/config.d'

const debug = createDebug('webssh2-client:terminal-component')

// Reactive terminal actions interface
export interface TerminalActions {
  write: (data: string) => void
  reset: () => void
  resize: () => { cols: number; rows: number } | null
  focus: () => void
  getDimensions: () => { cols: number; rows: number }
  applySettings: (options: Partial<ITerminalOptions>) => void
  getTerminal: () => Terminal | null
}

interface TerminalComponentProps {
  config: WebSSH2Config
  onTerminalReady?: (terminalRef: TerminalRef) => void
  onTerminalMounted?: (terminalActions: TerminalActions) => void
  class?: string
}

export const TerminalComponent: Component<TerminalComponentProps> = (props) => {
  const [terminalRef, setTerminalRef] = createSignal<TerminalRef>()
  const [fitAddon, setFitAddon] = createSignal<FitAddon>()

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
    const fitAddonInstance = new FitAddon()
    setFitAddon(fitAddonInstance)
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

    // Create reactive terminal actions
    const terminalActions: TerminalActions = {
      write: (data: string) => ref.write(data),
      reset: () => ref.reset(),
      resize: () => {
        const currentFit = fitAddon()
        const currentRef = terminalRef()
        if (currentFit && currentRef?.terminal) {
          currentFit.fit()
          const dims = {
            cols: currentRef.terminal.cols,
            rows: currentRef.terminal.rows
          }
          emitResize(dims)
          return dims
        }
        return null
      },
      focus: () => ref.focus(),
      getDimensions: () => {
        const currentRef = terminalRef()
        if (currentRef?.terminal) {
          return {
            cols: currentRef.terminal.cols,
            rows: currentRef.terminal.rows
          }
        }
        return { cols: 0, rows: 0 }
      },
      applySettings: (options: Partial<ITerminalOptions>) => {
        const currentRef = terminalRef()
        if (!currentRef?.terminal) return

        // Apply validated settings
        const validatedSettings = {
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
          lineHeight: (options.lineHeight ??
            defaultSettings.lineHeight) as number
        }

        Object.assign(currentRef.terminal.options, validatedSettings)
        terminalActions.resize()
      },
      getTerminal: () => terminalRef()?.terminal || null
    }

    // Notify parent with reactive actions
    if (props.onTerminalMounted) {
      props.onTerminalMounted(terminalActions)
    }

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

  // Helper method to ensure terminal is ready
  private ensureTerminal(): boolean {
    return !!(this.terminalRef && this.terminalRef.terminal)
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
    if (this.ensureTerminal() && this.fitAddon) {
      this.fitAddon.fit()
      const terminal = this.terminalRef!.terminal!
      const dimensions = {
        cols: terminal.cols,
        rows: terminal.rows
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
    if (this.ensureTerminal()) {
      const { cols, rows } = this.terminalRef!.terminal!
      debug('getTerminalDimensions', { cols, rows })
      return { cols, rows }
    }
    console.error('getTerminalDimensions: Terminal not initialized')
    return { cols: 0, rows: 0 }
  }

  // Consolidated settings method - validates and applies settings with resize
  applyTerminalSettings(options: Partial<ITerminalOptions>): void {
    if (!this.ensureTerminal()) {
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

    Object.assign(this.terminalRef!.terminal!.options, terminalSettings)

    // Call resize to ensure proper dimensions and notify socket service
    this.resizeTerminal()
  }

  getTerminalInstance(): Terminal | null {
    return this.terminalRef?.terminal || null
  }
}

// Export singleton instance for compatibility
export const terminalManager = new SolidTerminalManager()
