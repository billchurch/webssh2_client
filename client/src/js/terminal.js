// client
// client/src/js/terminal.js

import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import createDebug from 'debug'
import { validateNumber, validateBellStyle } from './utils.js'
import { emitData } from './socket.js'
import { getStoredSettings } from './settings.js'
import { setTerminalInstance } from './dom.js'

const debug = createDebug('webssh2-client:terminal')

let term
let fitAddon

export const defaultSettings = {
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

/**
 * Initializes the terminal
 * @param {Object} config - The configuration object for the terminal
 * @returns {Terminal} The initialized terminal instance
 */
export function initializeTerminal(config) {
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
 * @param {Object} config - The configuration object
 * @returns {Object} The terminal options
 */
export function getTerminalSettings(config) {
  debug('getTerminalSettings')
  const storedSettings = getStoredSettings()
  const terminalConfig = config?.terminal || {}

  const mergedOptions = {
    cursorBlink:
      storedSettings.cursorBlink ??
      terminalConfig.cursorBlink ??
      defaultSettings.cursorBlink,
    scrollback: validateNumber(
      storedSettings.scrollback ?? terminalConfig.scrollback,
      1,
      200000,
      defaultSettings.scrollback
    ),
    tabStopWidth: validateNumber(
      storedSettings.tabStopWidth ?? terminalConfig.tabStopWidth,
      1,
      100,
      defaultSettings.tabStopWidth
    ),
    bellStyle: validateBellStyle(
      storedSettings.bellStyle ?? terminalConfig.bellStyle,
      defaultSettings.bellStyle
    ),
    fontSize: validateNumber(
      storedSettings.fontSize ?? terminalConfig.fontSize,
      1,
      72,
      defaultSettings.fontSize
    ),
    fontFamily:
      storedSettings.fontFamily ??
      terminalConfig.fontFamily ??
      defaultSettings.fontFamily,
    letterSpacing:
      storedSettings.letterSpacing ??
      terminalConfig.letterSpacing ??
      defaultSettings.letterSpacing,
    lineHeight:
      storedSettings.lineHeight ??
      terminalConfig.lineHeight ??
      defaultSettings.lineHeight,
    logLevel:
      storedSettings.logLevel ??
      terminalConfig.logLevel ??
      defaultSettings.logLevel
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
export function applyTerminalSettings(options) {
  if (!term) {
    console.error('applyTerminalSettings: Terminal not initialized')
    return
  }
  debug('applyTerminalSettings', options)

  const terminalSettings = {
    cursorBlink: options.cursorBlink ?? defaultSettings.cursorBlink,
    scrollback: validateNumber(
      options.scrollback,
      1,
      200000,
      defaultSettings.scrollback
    ),
    tabStopWidth: validateNumber(
      options.tabStopWidth,
      1,
      100,
      defaultSettings.tabStopWidth
    ),
    bellStyle: validateBellStyle(options.bellStyle, defaultSettings.bellStyle),
    fontSize: validateNumber(options.fontSize, 1, 72, defaultSettings.fontSize),
    fontFamily: options.fontFamily || defaultSettings.fontFamily,
    letterSpacing:
      options.letterSpacing !== undefined
        ? Number(options.letterSpacing)
        : defaultSettings.letterSpacing,
    lineHeight:
      options.lineHeight !== undefined
        ? Number(options.lineHeight)
        : defaultSettings.lineHeight
  }

  Object.assign(term.options, terminalSettings)

  if (fitAddon) {
    fitAddon.fit()
  }
}

// Export the term instance if direct access is needed
export function getTerminalInstance() {
  return term
}
