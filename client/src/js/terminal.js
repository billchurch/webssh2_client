// /client/src/js/terminal.js

import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import createDebug from 'debug'
import { validateNumber, validateBellStyle } from './utils.js'
import { emitData } from './socket.js'

const debug = createDebug('webssh2-client:terminal')

let term
let fitAddon

/**
 * Initializes the terminal
 * @param {Object} config - The configuration object for the terminal
 * @returns {Terminal} The initialized terminal instance
 */
export function initializeTerminal (config) {
  const options = getTerminalOptions(config)
  debug('Terminal options:', options)
  term = new Terminal(options)
  fitAddon = new FitAddon()
  term.loadAddon(fitAddon)

  term.onData((data) => emitData(data))
  term.onTitleChange((title) => { document.title = title })

  return term
}

/**
 * Gets the terminal options based on the configuration
 * @param {Object} config - The configuration object
 * @returns {Object} The terminal options
 */
function getTerminalOptions (config) {
  const terminal = config.terminal || {}
  return {
    cursorBlink: terminal.cursorBlink ?? true,
    scrollback: validateNumber(terminal.scrollback, 1, 200000, 10000),
    tabStopWidth: validateNumber(terminal.tabStopWidth, 1, 100, 8),
    bellStyle: validateBellStyle(terminal.bellStyle),
    fontSize: validateNumber(terminal.fontSize, 1, 72, 14),
    fontFamily: terminal.fontFamily || 'courier-new, courier, monospace',
    letterSpacing: terminal.letterSpacing ?? 0,
    lineHeight: terminal.lineHeight ?? 1,
    logLevel: terminal.logLevel || 'info'
  }
}

/**
 * Opens the terminal in the specified container
 * @param {HTMLElement} container - The container element for the terminal
 */
export function openTerminal (container) {
  if (term && container) {
    term.open(container)
    fitAddon.fit()
  } else {
    debug('Error: Terminal or container not available')
  }
}

/**
 * Writes data to the terminal
 * @param {string} data - The data to write to the terminal
 */
export function writeToTerminal (data) {
  if (term) {
    term.write(data)
  }
}

/**
 * Reset the terminal
 */
export function resetTerminal () {
  debug('Terminal reset')
  if (term) {
    term.reset()
  }
}

/**
 * Resizes the terminal
 * @returns {Object} The new dimensions of the terminal
 */
export function resizeTerminal () {
  if (fitAddon && term) {
    fitAddon.fit()
    const dimensions = { cols: term.cols, rows: term.rows }
    debug('Terminal resized:', dimensions)
    return dimensions
  }
  return null
}

/**
 * Focuses the terminal
 */
export function focusTerminal () {
  debug('Terminal focused')
  if (term) {
    term.focus()
  }
}

/**
 * Gets the current dimensions of the terminal
 * @returns {Object} The current dimensions of the terminal
 */
export function getTerminalDimensions () {
  if (term) {
    let { cols, rows } = term
    debug('getTerminalDimensions:', { cols, rows }) 
    return { cols, rows }
  }
  debug('getTerminalDimensions Error: Terminal not initialized')
  return { cols: undefined, rows: undefined }
}

/**
 * Updates the terminal options
 * @param {Object} newOptions - The new options to apply to the terminal
 */
export function updateTerminalOptions (newOptions) {
  if (term) {
    Object.assign(term.options, newOptions)
    debug('Terminal options updated:', newOptions)
  }
}

/**
 * Attaches custom event listeners to the terminal
 * @param {string} event - The event to listen for
 * @param {Function} handler - The event handler function
 */
export function attachTerminalEvent (event, handler) {
  if (term) {
    term.on(event, handler)
    debug(`Event listener attached: ${event}`)
  }
}

/**
 * Detaches custom event listeners from the terminal
 * @param {string} event - The event to stop listening for
 * @param {Function} handler - The event handler function to remove
 */
export function detachTerminalEvent (event, handler) {
  if (term) {
    term.off(event, handler)
    debug(`Event listener detached: ${event}`)
  }
}

/**
 * Applies terminal options to the terminal instance
 * @param {Object} options - The options to apply to the terminal
 */
export function applyTerminalOptions (options) {
  if (!term) {
    debug('Error: Terminal not initialized')
    return
  }

  const terminalOptions = {
    cursorBlink: options.cursorBlink !== undefined ? options.cursorBlink === true || options.cursorBlink === 'true' : true,
    scrollback: validateNumber(options.scrollback, 1, 200000, 10000),
    tabStopWidth: validateNumber(options.tabStopWidth, 1, 100, 8),
    bellStyle: validateBellStyle(options.bellStyle),
    fontSize: validateNumber(options.fontSize, 1, 72, 14),
    fontFamily: options.fontFamily || 'courier-new, courier, monospace',
    letterSpacing: options.letterSpacing !== undefined ? Number(options.letterSpacing) : 0,
    lineHeight: options.lineHeight !== undefined ? Number(options.lineHeight) : 1,
    logLevel: options.logLevel || 'info'
  }

  Object.assign(term.options, terminalOptions)
  debug('Terminal options applied:', terminalOptions)

  // Resize the terminal after applying options
  if (fitAddon) {
    fitAddon.fit()
  }
}

// Export the term instance if direct access is needed
export function getTerminalInstance () {
  return term
}
