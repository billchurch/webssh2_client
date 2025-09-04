// client
// client/src/js/terminal.ts

import { Terminal, type ITerminalOptions as TerminalOptions } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import createDebug from 'debug'
import { validateNumber, validateBellStyle, defaultSettings } from './utils.js'
import { emitData } from './socket.js'
import { getStoredSettings } from './settings.js'
import { setTerminalInstance, focusTerminal as domFocusTerminal, openTerminal as domOpenTerminal } from './dom.js'

import type { WebSSH2Config, TerminalSettings } from '../types/config.d'

const debug = createDebug('webssh2-client:terminal')

let term: Terminal | null = null
let fitAddon: FitAddon | null = null

/**
 * Initializes the terminal
 */
export function initializeTerminal(config: WebSSH2Config): Terminal {
  debug('initializeTerminal')
  const options = getTerminalSettings(config)

  term = new Terminal(options)
  fitAddon = new FitAddon()
  term.loadAddon(fitAddon)

  term.onData((data) => emitData(data))
  term.onTitleChange((title) => {
    document.title = title
  })

  setTerminalInstance(term)

  applyTerminalSettings(options)

  return term
}

/**
 * Gets the terminal options based on the configuration
 */
export function getTerminalSettings(config: WebSSH2Config): TerminalOptions {
  debug('getTerminalSettings')
  const storedSettings = getStoredSettings() as Partial<TerminalSettings>
  const terminalConfig = (config?.terminal ?? {}) as Partial<TerminalSettings>

  const mergedOptions: TerminalOptions = {
    cursorBlink:
      (storedSettings.cursorBlink ?? terminalConfig.cursorBlink ?? defaultSettings.cursorBlink) as boolean,
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
    bellStyle: validateBellStyle(
      String(storedSettings.bellStyle ?? terminalConfig.bellStyle ?? defaultSettings.bellStyle),
      defaultSettings.bellStyle
    ),
    fontSize: validateNumber(
      (storedSettings.fontSize ?? terminalConfig.fontSize) as number,
      1,
      72,
      defaultSettings.fontSize
    ),
    fontFamily:
      String(
        storedSettings.fontFamily ?? terminalConfig.fontFamily ?? defaultSettings.fontFamily
      ),
    letterSpacing: (storedSettings.letterSpacing ?? terminalConfig.letterSpacing ?? defaultSettings.letterSpacing) as number,
    lineHeight: (storedSettings.lineHeight ?? terminalConfig.lineHeight ?? defaultSettings.lineHeight) as number,
    // logLevel is not part of ITerminalOptions; it lives in our TerminalSettings only
  }

  debug('getTerminalSettings', mergedOptions)
  return mergedOptions
}

/**
 * Opens the terminal in the specified container
 */
export function openTerminal(container: HTMLElement): void {
  domOpenTerminal(container)
  if (fitAddon) {
    // Initial fit
    fitAddon.fit()
    // Ensure proper fit after DOM settles
    requestAnimationFrame(() => {
      fitAddon?.fit()
    })
  }
}

/** Writes data to the terminal */
export function writeToTerminal(data: string): void {
  if (term) {
    term.write(data)
  }
}

/** Reset the terminal */
export function resetTerminal(): void {
  debug('resetTerminal')
  if (term) {
    term.reset()
  }
}

/**
 * Resizes the terminal and returns new dimensions
 */
export function resizeTerminal(): { cols: number; rows: number } | null {
  if (fitAddon && term) {
    fitAddon.fit()
    const dimensions = { cols: term.cols, rows: term.rows }
    debug('resizeTerminal', dimensions)
    return dimensions
  }
  return null
}

/** Focuses the terminal */
export function focusTerminal(): void {
  domFocusTerminal()
}

/** Returns current dimensions */
export function getTerminalDimensions(): { cols?: number; rows?: number } {
  if (term) {
    const { cols, rows } = term
    debug('getTerminalDimensions', { cols, rows })
    return { cols, rows }
  }
  console.error('getTerminalDimensions: Terminal not initialized')
  return { cols: undefined, rows: undefined }
}

/** Updates terminal options */
export function updateterminalSettings(newOptions: Partial<TerminalOptions>): void {
  if (term) {
    Object.assign(term.options, newOptions)
    debug('updateterminalSettings', newOptions)
  }
}

interface TerminalWithOnOff {
  on: (event: string, handler: (...args: unknown[]) => void) => void
  off: (event: string, handler: (...args: unknown[]) => void) => void
}

/** Attaches custom event listeners to the terminal */
export function attachTerminalEvent(event: string, handler: (...args: unknown[]) => void): void {
  if (term) {
    ;(term as unknown as TerminalWithOnOff).on(event, handler)
    debug(`attachTerminalEvent: ${event}`)
  }
}

/** Detaches custom event listeners from the terminal */
export function detachTerminalEvent(event: string, handler: (...args: unknown[]) => void): void {
  if (term) {
    ;(term as unknown as TerminalWithOnOff).off(event, handler)
    debug(`detachTerminalEvent: ${event}`)
  }
}

/** Applies options to the terminal instance */
export function applyTerminalSettings(options: Partial<TerminalOptions> & Partial<TerminalSettings>): void {
  if (!term) {
    console.error('applyTerminalSettings: Terminal not initialized')
    return
  }
  debug('applyTerminalSettings', options)

  const terminalSettings: TerminalOptions = {
    cursorBlink: (options.cursorBlink ?? defaultSettings.cursorBlink) as boolean,
    scrollback: validateNumber(options.scrollback as number, 1, 200000, defaultSettings.scrollback),
    tabStopWidth: validateNumber(options.tabStopWidth as number, 1, 100, defaultSettings.tabStopWidth),
    bellStyle: validateBellStyle(String(options.bellStyle ?? defaultSettings.bellStyle), defaultSettings.bellStyle),
    fontSize: validateNumber(options.fontSize as number, 1, 72, defaultSettings.fontSize),
    fontFamily: String(options.fontFamily ?? defaultSettings.fontFamily),
    letterSpacing: (options.letterSpacing ?? defaultSettings.letterSpacing) as number,
    lineHeight: (options.lineHeight ?? defaultSettings.lineHeight) as number
  }

  Object.assign(term.options, terminalSettings)

  if (fitAddon) {
    fitAddon.fit()
  }
}

/** Export the term instance if direct access is needed */
export function getTerminalInstance(): Terminal | null {
  return term
}
