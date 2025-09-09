import type { Component } from 'solid-js'
import { createSignal, onCleanup, onMount } from 'solid-js'
import { FitAddon } from '@xterm/addon-fit'
import { SearchAddon } from '@xterm/addon-search'
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

// Import clipboard functionality
import {
  TerminalClipboardIntegration,
  type ClipboardSettings
} from '../lib/clipboard/terminal-clipboard-integration'
import { ClipboardCompatibility } from '../utils/clipboard-compatibility'

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
  clipboard: {
    copy: () => Promise<boolean>
    paste: () => Promise<void>
    updateSettings: (settings: Partial<ClipboardSettings>) => void
  }
  search: {
    findNext: (
      term: string,
      options?: {
        caseSensitive?: boolean
        wholeWord?: boolean
        regex?: boolean
      }
    ) => boolean
    findPrevious: (
      term: string,
      options?: {
        caseSensitive?: boolean
        wholeWord?: boolean
        regex?: boolean
      }
    ) => boolean
    clearSelection: () => void
    clearDecorations: () => void
    onSearchResults: (
      callback: (results: { resultIndex: number; resultCount: number }) => void
    ) => (() => void) | undefined
  }
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
  const [searchAddon, setSearchAddon] = createSignal<SearchAddon>()
  const [clipboardIntegration, setClipboardIntegration] =
    createSignal<TerminalClipboardIntegration>()

  // Check clipboard compatibility on mount
  onMount(async () => {
    const warnings = ClipboardCompatibility.getWarnings()
    if (warnings.length > 0) {
      console.warn('Clipboard warnings:', warnings)
    }
  })

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
        defaultSettings.lineHeight) as number,
      allowProposedApi: true // Required for SearchAddon decorations
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

    // Create and load SearchAddon
    const searchAddonInstance = new SearchAddon()
    setSearchAddon(searchAddonInstance)
    terminal.loadAddon(searchAddonInstance)

    // Initialize clipboard integration
    const storedSettings = getStoredSettings() as Partial<TerminalSettings>
    const clipboardSettings: ClipboardSettings = {
      autoSelectToClipboard:
        storedSettings?.clipboardAutoSelectToCopy ??
        defaultSettings.clipboardAutoSelectToCopy,
      enableMiddleClickPaste:
        storedSettings?.clipboardEnableMiddleClickPaste ??
        defaultSettings.clipboardEnableMiddleClickPaste,
      enableKeyboardShortcuts:
        storedSettings?.clipboardEnableKeyboardShortcuts ??
        defaultSettings.clipboardEnableKeyboardShortcuts
    }

    const clipboardInstance = new TerminalClipboardIntegration(
      clipboardSettings
    )
    clipboardInstance.attach(terminal)
    setClipboardIntegration(clipboardInstance)

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
      clipboard: {
        copy: async () => {
          const clipboard = clipboardIntegration()
          const term = terminalRef()?.terminal
          if (clipboard && term) {
            const selection = term.getSelection()
            if (selection) {
              const manager = clipboard.getClipboardManager()
              return manager.writeText(selection)
            }
          }
          return false
        },
        paste: async () => {
          const clipboard = clipboardIntegration()
          const term = terminalRef()?.terminal
          if (clipboard && term) {
            const manager = clipboard.getClipboardManager()
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
      getTerminal: () => terminalRef()?.terminal || null,
      search: {
        findNext: (term: string, options = {}) => {
          const addon = searchAddon()
          if (addon && term.trim()) {
            // Enable decorations to trigger onDidChangeResults event
            // Using border-only highlighting for better accessibility
            const searchOptions = {
              ...options,
              decorations: {
                // Border-only approach - no backgrounds to avoid color parsing issues
                matchBorder: '#FFD700', // Gold border for regular matches
                activeMatchBorder: '#FF4500', // Orange-red border for active match
                matchOverviewRuler: '#FFD700', // Gold in scrollbar
                activeMatchColorOverviewRuler: '#FF4500' // Orange-red in scrollbar
              }
            }
            return addon.findNext(term, searchOptions)
          }
          return false
        },
        findPrevious: (term: string, options = {}) => {
          const addon = searchAddon()
          if (addon && term.trim()) {
            // Enable decorations to trigger onDidChangeResults event
            // Using border-only highlighting for better accessibility
            const searchOptions = {
              ...options,
              decorations: {
                // Border-only approach - no backgrounds to avoid color parsing issues
                matchBorder: '#FFD700', // Gold border for regular matches
                activeMatchBorder: '#FF4500', // Orange-red border for active match
                matchOverviewRuler: '#FFD700', // Gold in scrollbar
                activeMatchColorOverviewRuler: '#FF4500' // Orange-red in scrollbar
              }
            }
            return addon.findPrevious(term, searchOptions)
          }
          return false
        },
        clearSelection: () => {
          const currentRef = terminalRef()
          if (currentRef?.terminal) {
            currentRef.terminal.clearSelection()
          }
        },
        clearDecorations: () => {
          const addon = searchAddon()
          if (addon) {
            addon.clearDecorations()
          }
        },
        onSearchResults: (
          callback: (results: {
            resultIndex: number
            resultCount: number
          }) => void
        ) => {
          const addon = searchAddon()
          if (addon && addon.onDidChangeResults) {
            try {
              // The onDidChangeResults is an IEvent interface that returns a disposable
              const disposable = addon.onDidChangeResults(callback)
              return () => disposable?.dispose?.()
            } catch (error) {
              console.warn('Could not set up search results listener:', error)
            }
          }
          return undefined
        }
      }
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

      // Clean up clipboard integration
      const clipboard = clipboardIntegration()
      if (clipboard) {
        clipboard.detach()
      }

      debug('Terminal resize handlers and clipboard cleaned up')
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

// Expose terminal manager globally for testing
if (typeof window !== 'undefined') {
  ;(window as { terminalManager?: SolidTerminalManager }).terminalManager =
    terminalManager
}
