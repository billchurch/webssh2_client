// client
// client/src/js/terminal.js

import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import createDebug from 'debug'
import { validateNumber, validateBellStyle } from './utils.js'
import { emitData } from './socket.js'
import { applyStoredSettings } from './settings.js'
import {
  setTerminalInstance,
  openTerminal as domOpenTerminal,
  focusTerminal as domFocusTerminal
} from './dom.js'

const debug = createDebug('webssh2-client:terminal')

let term
let fitAddon

/**
 * Initializes the terminal
 * @param {Object} config - The configuration object for the terminal
 * @returns {Terminal} The initialized terminal instance
 */
export function initializeTerminal(config) {
  const options = getTerminalSettings(config)
  debug('initializeTerminal', options)
  term = new Terminal(options)
  fitAddon = new FitAddon()
  term.loadAddon(fitAddon)

  term.onData((data) => emitData(data))
  term.onTitleChange((title) => {
    document.title = title
  })

  setTerminalInstance(term)

  return term
}

/**
 * Gets the terminal options based on the configuration
 * @param {Object} config - The configuration object
 * @returns {Object} The terminal options
 */
export function getTerminalSettings(config) {
  const terminal = config?.terminal || {}
  const defaultOptions = {
    cursorBlink: true,
    scrollback: 10000,
    tabStopWidth: 8,
    bellStyle: 'sound',
    fontSize: 14,
    fontFamily: 'courier-new, courier, monospace',
    letterSpacing: 0,
    lineHeight: 1,
    logLevel: 'info'
  }

  const mergedOptions = {
    cursorBlink: terminal.cursorBlink ?? defaultOptions.cursorBlink,
    scrollback: validateNumber(
      terminal.scrollback,
      1,
      200000,
      defaultOptions.scrollback
    ),
    tabStopWidth: validateNumber(
      terminal.tabStopWidth,
      1,
      100,
      defaultOptions.tabStopWidth
    ),
    bellStyle: validateBellStyle(terminal.bellStyle, defaultOptions.bellStyle),
    fontSize: validateNumber(terminal.fontSize, 1, 72, defaultOptions.fontSize),
    fontFamily: terminal.fontFamily || defaultOptions.fontFamily,
    letterSpacing: terminal.letterSpacing ?? defaultOptions.letterSpacing,
    lineHeight: terminal.lineHeight ?? defaultOptions.lineHeight,
    logLevel: terminal.logLevel || defaultOptions.logLevel
  }
  debug('getTerminalSettings', mergedOptions)
  return mergedOptions
}

/**
 * Opens the terminal in the specified container
 * @param {HTMLElement} container - The container element for the terminal
 */
export function openTerminal(container) {
  domOpenTerminal(container)
  if (fitAddon) {
    fitAddon.fit()
  }
}

/**
 * Writes data to the terminal
 * @param {string} data - The data to write to the terminal
 */
export function writeToTerminal(data) {
  if (term) {
    term.write(data)
  }
}

/**
 * Reset the terminal
 */
export function resetTerminal() {
  debug('resetTerminal')
  if (term) {
    term.reset()
  }
}

/**
 * Resizes the terminal
 * @returns {Object} The new dimensions of the terminal
 */
export function resizeTerminal() {
  if (fitAddon && term) {
    fitAddon.fit()
    const dimensions = { cols: term.cols, rows: term.rows }
    debug('resizeTerminal', dimensions)
    return dimensions
  }
  return null
}

/**
 * Focuses the terminal
 */
export function focusTerminal() {
  domFocusTerminal()
}

/**
 * Gets the current dimensions of the terminal
 * @returns {Object} The current dimensions of the terminal
 */
export function getTerminalDimensions() {
  if (term) {
    let { cols, rows } = term
    debug('getTerminalDimensions', { cols, rows })
    return { cols, rows }
  }
  console.error('getTerminalDimensions: Terminal not initialized')
  return { cols: undefined, rows: undefined }
}

/**
 * Updates the terminal options
 * @param {Object} newOptions - The new options to apply to the terminal
 */
export function updateterminalSettings(newOptions) {
  if (term) {
    Object.assign(term.options, newOptions)
    debug('updateterminalSettings', newOptions)
  }
}

/**
 * Attaches custom event listeners to the terminal
 * @param {string} event - The event to listen for
 * @param {Function} handler - The event handler function
 */
export function attachTerminalEvent(event, handler) {
  if (term) {
    term.on(event, handler)
    debug(`attachTerminalEvent: ${event}`)
  }
}

/**
 * Detaches custom event listeners from the terminal
 * @param {string} event - The event to stop listening for
 * @param {Function} handler - The event handler function to remove
 */
export function detachTerminalEvent(event, handler) {
  if (term) {
    term.off(event, handler)
    debug(`detachTerminalEvent: ${event}`)
  }
}

/**
 * Applies terminal options to the terminal instance
 * @param {Object} options - The options to apply to the terminal
 */
export function applyterminalSettings(options) {
  if (!term) {
    console.error('applyterminalSettings: Terminal not initialized')
    return
  }
  debug('applyterminalSettings', options)

  const terminalSettings = {
    cursorBlink: options.cursorBlink,
    scrollback: validateNumber(options.scrollback, 1, 200000, 10000),
    tabStopWidth: validateNumber(options.tabStopWidth, 1, 100, 8),
    bellStyle: validateBellStyle(options.bellStyle),
    fontSize: validateNumber(options.fontSize, 1, 72, 14),
    fontFamily: options.fontFamily || 'courier-new, courier, monospace',
    letterSpacing:
      options.letterSpacing !== undefined ? Number(options.letterSpacing) : 0,
    lineHeight:
      options.lineHeight !== undefined ? Number(options.lineHeight) : 1
  }

  Object.assign(term.options, terminalSettings)
  debug('applyterminalSettings', terminalSettings)

  // Resize the terminal after applying options
  if (fitAddon) {
    fitAddon.fit()
  }
}

// Export the term instance if direct access is needed
export function getTerminalInstance() {
  return term
}
