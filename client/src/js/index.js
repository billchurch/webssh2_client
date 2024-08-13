// /client/src/js/index.js

import createDebug from 'debug'
import 'purecss/build/pure.css'
import '../css/menu.css'
import '@xterm/xterm/css/xterm.css'
import '../css/terminal.css'
import '../css/style.css'

import {
  hideErrorModal,
  fillLoginForm,
  hideLoginModal,
  hideReconnectBtn,
  initializeElements,
  showErrorModal,
  showLoginModal,
  showReconnectBtn,
  toggleTerminalDisplay,
  updateElement,
  updateLogBtnState
} from './dom.js'

import {
  emitData,
  emitResize,
  initializeSocketConnection,
  initSocket,
  reauthSession,
  replayCredentials
} from './socket.js'

import {
  applyTerminalOptions,
  focusTerminal,
  initializeTerminal,
  openTerminal,
  resetTerminal,
  resizeTerminal,
  writeToTerminal
} from './terminal.js'

import stateManager from './state.js'

import { library, dom } from '@fortawesome/fontawesome-svg-core'
import { faBars, faClipboard, faDownload, faKey, faCog } from '@fortawesome/free-solid-svg-icons'
import { initializeConfig, populateFormFromUrl } from './utils.js'
import { addToSessionLog, checkSavedSessionLog, downloadLog, saveSessionLog, toggleLog } from './clientlog.js'

library.add(faBars, faClipboard, faDownload, faKey, faCog)
dom.watch()
export const debug = createDebug('webssh2-client')

let config
let elements
export let sessionFooter = ''

// Wait for the html to load before initializing
document.addEventListener('DOMContentLoaded', initialize)

/**
 * Initializes the application.
 * @throws {Error} If there is an initialization error.
 */
function initialize () {
  try {
    config = initializeConfig()
    config = populateFormFromUrl(config) // Merge URL parameters into the config
    initializeTerminalAndUI()
    initSocket(
      config,
      onConnect,
      onDisconnect,
      onData,
      writeToTerminal,
      focusTerminal
    )
    setupEventListeners()
    checkSavedSessionLog()
    initializeConnection()
  } catch (error) {
    handleError('Initialization error:', error)
  }
}

/**
 * Initializes the terminal and user interface.
 */
function initializeTerminalAndUI () {
  const options = getTerminalOptions()
  debug('initializeTerminal options:', options)
  initializeTerminal(config)
  elements = initializeElements()
  sessionFooter = config.ssh.host ? `ssh://${config.ssh.host}:${config.ssh.port}` : ''

  const { terminalContainer } = elements

  if (terminalContainer) {
    openTerminal(terminalContainer)
  } else {
    console.error('Terminal container not found. Terminal cannot be initialized.')
  }

  applyTerminalOptions(options)
}

/**
 * Retrieves the terminal options based on the configuration.
 * @returns {Object} The terminal options.
 */
function getTerminalOptions () {
  debug('getTerminalOptions Config:', config)
  const terminal = config.terminal
  return {
    logLevel: terminal.logLevel ?? 'info',
    cursorBlink: terminal.cursorBlink ?? true,
    scrollback: terminal.scrollback ?? 10000,
    tabStopWidth: terminal.tabStopWidth ?? 8,
    bellStyle: terminal.bellStyle ?? 'sound',
    fontSize: terminal.fontSize ?? 14,
    fontFamily: terminal.fontFamily ?? 'courier-new, courier, monospace',
    letterSpacing: terminal.letterSpacing ?? 0,
    lineHeight: terminal.lineHeight ?? 1
  }
}

/**
 * Sets up event listeners for various elements in the application.
 */
function setupEventListeners () {
  debug('Setting up event listeners')
  const { credentialsBtn, downloadLogBtn, logBtn, stopLogBtn, loginForm, reauthBtn } = elements // eslint-disable-line no-unused-vars

  // Event handlers for elements
  const elementHandlers = {
    credentialsBtn: replayCredentials,
    downloadLogBtn: downloadLog,
    logBtn: toggleLog,
    stopLogBtn: toggleLog,
    loginForm: handleFormSubmit,
    reauthBtn: reauthSession
  }

  Object.entries(elementHandlers).forEach(([elementName, handler]) => {
    const element = elements[elementName]
    if (element) {
      const eventType = elementName === 'loginForm' ? 'submit' : 'click'
      element.addEventListener(eventType, handler)
    }
  })

  window.addEventListener('resize', handleResize)
  document.addEventListener('keydown', handleKeyDown)
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      hideErrorModal()
    }
  })
}

/**
 * Handles the form submission event.
 *
 * @param {Event} e - The form submission event.
 */
function handleFormSubmit (e) {
  e.preventDefault()
  const formData = new FormData(e.target)
  const formDataObject = Object.fromEntries(formData.entries())
  hideLoginModal()
  connectToServer(formDataObject)
}

/**
 * Handles the resize event and sends the resized dimensions to the server.
 * @returns {void}
 */
function handleResize () {
  const dimensions = resizeTerminal()
  if (dimensions) {
    debug('Sending resized:', dimensions)
    emitResize(dimensions)
  }
}

/**
 * Handles the keydown event.
 * If the key combination is Ctrl + Shift + 6, it prevents the default behavior
 * and emits the data '\x1E'.
 *
 * @param {KeyboardEvent} event - The keydown event object.
 */
function handleKeyDown (event) {
  if (event.ctrlKey && event.shiftKey && event.code === 'Digit6') {
    event.preventDefault()
    emitData('\x1E')
  }
}

/**
 * Connects to the server
 */
function connectToServer (formData = null) {
  debug('connectToServer:')
  const { isConnecting, reauthRequired } = stateManager.getEntireState()

  if (isConnecting) return

  if (reauthRequired) stateManager.setState('reauthRequired', false)

  stateManager.setState('isConnecting', true)
  initializeSocketConnection()

  const { terminalContainer } = elements
  if (terminalContainer) {
    updateElement('header', config.header.text, config.header.background)
    updateElement('footer', sessionFooter)
    toggleTerminalDisplay(true)
  }

  handleResize()
}

/**
 * Handles the logic when a connection is successfully established.
 */
function onConnect () {
  hideReconnectBtn()
  hideErrorModal()

  // Reset session log settings
  stateManager.setState('sessionLogEnable', false)
  stateManager.setState('loggedData', false)
  updateLogBtnState(false)

  debug('Successfully connected to the server')
}

/**
 * Handles the disconnection event.
 *
 * @param {string} reason - The reason for disconnection.
 * @returns {void}
 */
function onDisconnect (reason) {
  const reauthRequired = stateManager.getState('reauthRequired')

  debug('onDisconnect:', reason)

  switch (reason) {
    case 'auth_required':
    case 'auth_failed':
      showLoginModal()
      break

    case 'reauth_required':
      stateManager.setState('reauthRequired', true)
      showLoginModal()
      break

    case 'error':
      showErrorModal(`Socket error: ${reason}`)
      commonPostDisconnectTasks()
      break

    case 'ssh_error':
      if (reauthRequired) {
        debug('Ignoring error due to prior reauth_required')
        stateManager.setState('reauthRequired', false)
      } else {
        showErrorModal(`SSH error: ${reason}`)
        commonPostDisconnectTasks()
      }
      break
    default:
      showErrorModal(`Disconnected: ${reason}`)
      commonPostDisconnectTasks()
      break
  }
}

/**
 * Performs common tasks after disconnecting from the server.
 * @function commonPostDisconnectTasks
 */
function commonPostDisconnectTasks () {
  const sessionLogEnable = stateManager.getState('sessionLogEnable')

  stateManager.setState('isConnecting', false)

  if (sessionLogEnable) {
    const autoDownload = window.confirm('Would you like to download the session log?')
    saveSessionLog(autoDownload)
  }

  resetApplication()
  showReconnectBtn(reconnectToServer)
}

/**
 * Handles the data received from the server.
 *
 * @param {string} data - The data received from the server.
 */
function onData (data) {
  const sessionLogEnable = stateManager.getState('sessionLogEnable')
  if (sessionLogEnable) {
    addToSessionLog(data)
  }
}

/**
 * Handles errors and updates the UI accordingly.
 *
 * @param {string} message - The error message.
 * @param {Error} error - The error object.
 */
export function handleError (message, error) {
  console.error('Error:', message, error)
  stateManager.setState('isConnecting', false)
  updateElement('status', `Error: ${message}`, 'red')
  showErrorModal(message)
  // showReconnectBtn()
}

/**
 * Resets the application by disabling session log, updating log button state, and resetting the terminal.
 */
function resetApplication () {
  stateManager.setState('sessionLogEnable', false)
  updateLogBtnState(false)
}

/**
 * Reconnects to the server.
 */
function reconnectToServer () {
  const isConnecting = stateManager.getState('isConnecting')
  if (isConnecting) {
    debug('Reconnection already in progress')
    return
  }

  hideReconnectBtn()
  hideErrorModal()
  resetTerminal()
  stateManager.setState('reconnectAttempts', 0)

  connectToServer()
}

/**
 * Initializes the SSH connection.
 *
 * @returns {void}
 */
function initializeConnection () {
  debug('initializeConnection')
  const { autoConnect, ssh } = config
  try {
    if (autoConnect) {
      debug('Auto-connect is enabled')
      if (elements.loginForm) {
        fillLoginForm(ssh)
      }
      connectToServer()
    } else {
      showLoginModal()
    }
  } catch (error) {
    handleError('Connection initialization failed', error)
  }
}
