// client
// client/src/js/index.js

import createDebug from 'debug'
import 'purecss/build/pure.css'
import '../css/menu.css'
import '@xterm/xterm/css/xterm.css'
import '../css/terminal.css'
import '../css/style.css'
import '../css/icons.css'

import {
  fillLoginForm,
  focusTerminal,
  hideErrorDialog,
  hideReconnectBtn,
  initializeDom,
  initializeElements,
  openTerminal,
  showErrorDialog,
  showloginDialog,
  showReconnectBtn,
  toggleTerminalDisplay,
  updateElement,
  updatestartLogBtnState,
  setTerminalFunctions,
  setConnectToServerFunction
} from './dom.js'

import { initializeSocketConnection, initSocket, setFormData } from './socket.js'

import {
  initializeTerminal,
  resetTerminal,
  writeToTerminal,
  getTerminalSettings,
  applyTerminalSettings,
  resizeTerminal
} from './terminal.js'

import { applyStoredSettings } from './settings.js'

import { state } from './state.js'

import {
  initializeConfig,
  getBasicAuthCookie,
  populateFormFromUrl
} from './utils.js'
import {
  addToSessionLog,
  checkSavedSessionLog,
  downloadLog,
  setSessionFooter
} from './clientlog.js'

export const debug = createDebug('webssh2-client')

import { replaceIconsIn } from './icons.js'

let config
let elements
export let sessionFooter = null

/**
 * Initializes the application.
 * @throws {Error} If there is an initialization error.
 */
async function initialize() {
  try {
    console.log(`Initializing WebSSH2 client - ${BANNER_STRING}`)
    config = initializeConfig()

    const basicAuthCookie = getBasicAuthCookie()
    if (basicAuthCookie) {
      config.ssh.host = basicAuthCookie.host || config.ssh.host
      config.ssh.port = basicAuthCookie.port || config.ssh.port
      state.isBasicAuthCookiePresent = true
    } else {
      state.isBasicAuthCookiePresent = false
    }

    config = populateFormFromUrl(config)
    await initializeDom(config) // Pass config here
    replaceIconsIn(document)
    initializeTerminalAndUI()
    initSocket(
      config,
      onConnect,
      onDisconnect,
      onData,
      writeToTerminal,
      focusTerminal
    )
    // We can remove this line as it's now handled in initializeDom
    // initializeDomAndSettings(config);
    checkSavedSessionLog()
    initializeConnection()
  } catch (error) {
    handleError('Initialization error:', error)
  }
}

// Immediately Invoked Async Function Expression (IIFE)
;(async () => {
  await initialize()
})()

/**
 * Initializes the terminal and user interface.
 */
function initializeTerminalAndUI() {
  debug('initializeTerminalAndUI')
  initializeTerminal(config)
  
  // Inject functions into DOM module to avoid circular dependency
  setTerminalFunctions({
    getTerminalSettings,
    applyTerminalSettings,
    resizeTerminal
  })
  setConnectToServerFunction(connectToServer)
  
  elements = initializeElements()
  sessionFooter = config.ssh.host
    ? `ssh://${config.ssh.host}:${config.ssh.port}`
    : null
  
  // Set sessionFooter in clientlog module
  setSessionFooter(sessionFooter)

  const { terminalContainer } = elements

  if (terminalContainer) {
    openTerminal(terminalContainer)
  } else {
    console.error(
      'Terminal container not found. Terminal cannot be initialized.'
    )
  }
}

/**
 * Connects to the server
 */
export function connectToServer(formData = null) {
  debug('connectToServer')
  const { isConnecting, reauthRequired } = state

  if (isConnecting) return

  if (reauthRequired) {
    state.reauthRequired = false
    resetTerminal()
  }

  state.isConnecting = true
  
  // Store formData for later use during authentication
  if (formData) {
    setFormData(formData)
  }
  
  initializeSocketConnection()

  const { terminalContainer } = elements
  if (terminalContainer) {
    debug('Terminal container found. Applying header and footer.')
    if (config?.header?.text != null && config?.header?.background != null) {
      const headerContent = {
        text: config.header.text ?? '',
        background: config.header.background ?? ''
      }
      updateElement('header', headerContent)
    }

    if (sessionFooter != null) {
      updateElement('footer', { text: sessionFooter })
    }
    toggleTerminalDisplay(true)
  }
}

/**
 * Handles the logic when a connection is successfully established.
 */
function onConnect() {
  hideReconnectBtn()
  hideErrorDialog()

  // Reset session log settings
  state.sessionLogEnable = false
  state.loggedData = false
  updatestartLogBtnState(false)

  debug('onConnect: Successfully connected to the server')
}

/**
 * Handles the disconnection event.
 *
 * @param {string} reason - The reason for disconnection.
 * @returns {void}
 */
function onDisconnect(reason, details) {
  const reauthRequired = state.reauthRequired

  debug('onDisconnect:', reason)

  switch (reason) {
    case 'auth_required':
    case 'auth_failed':
      showloginDialog()
      break

      case 'reauth_required':
        debug('onDisconnect: reauth_required: forms auth flow')
        state.reauthRequired = true
        showloginDialog()
        break
  
      case 'error':
        showErrorDialog(`Socket error: ${details || reason}`)
        commonPostDisconnectTasks()
        break
  
      case 'ssh_error':
        if (reauthRequired) {
          debug('Ignoring error due to prior reauth_required')
          state.reauthRequired = false
        } else {
          showErrorDialog(`${details || reason}`)
          commonPostDisconnectTasks()
        }
        break
      default:
        showErrorDialog(`Disconnected: ${details || reason}`)
        commonPostDisconnectTasks()
        break
    }
  }

/**
 * Performs common tasks after disconnecting from the server.
 * @function commonPostDisconnectTasks
 */
function commonPostDisconnectTasks() {
  const sessionLogEnable = state.sessionLogEnable

  state.isConnecting = false

  if (sessionLogEnable) {
    const autoDownload = window.confirm(
      'Would you like to download the session log?'
    )
    downloadLog(autoDownload)
  }

  resetApplication()
  if (
    state.allowReconnect &&
    !state.isBasicAuthCookiePresent
  ) {
    showReconnectBtn(reconnectToServer)
  }
}

/**
 * Handles the data received from the server.
 *
 * @param {string} data - The data received from the server.
 */
function onData(data) {
  const sessionLogEnable = state.sessionLogEnable
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
export function handleError(message, error) {
  console.error('Error:', message, error)
  state.isConnecting = false
  updateElement('status', `Error: ${message}`, 'red')
  showErrorDialog(message)
  // showReconnectBtn()
}

/**
 * Resets the application by disabling session log, updating log button state, and resetting the terminal.
 */
function resetApplication() {
  state.sessionLogEnable = false
  updatestartLogBtnState(false)
}

/**
 * Reconnects to the server.
 */
function reconnectToServer() {
  const isConnecting = state.isConnecting
  if (isConnecting) {
    debug('Reconnection already in progress')
    return
  }

  hideReconnectBtn()
  hideErrorDialog()
  resetTerminal()

  connectToServer()
}

/**
 * Initializes the SSH connection.
 *
 * @returns {void}
 */
function initializeConnection() {
  const { autoConnect, ssh } = config
  debug('initializeConnection', { autoConnect })
  try {
    if (autoConnect) {
      fillLoginForm(ssh)
      connectToServer()
    } else {
      showloginDialog()
    }
  } catch (error) {
    handleError('initializeConnection: failed: ', error)
  }
}
