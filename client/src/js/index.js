// /client/src/js/index.js

import createDebug from 'debug'
import 'purecss/build/pure.css'
import '../css/menu.css'
import '@xterm/xterm/css/xterm.css'
import '../css/terminal.css'
import '../css/style.css'

import {
  closeErrorModal,
  hideLoginPrompt,
  hideReconnectPrompt,
  initializeElements,
  showErrorModal,
  showLoginPrompt,
  showReconnectPrompt,
  updateStatus,
  toggleTerminalDisplay,
  updateHeader,
  updateHeaderBackground,
  updateFooter,
  updateUIVisibility,
  updateLogButtonState
} from './dom.js'

import {
  initSocket,
  initializeSocketConnection,
  authenticate,
  getSocket,
  emitResize,
  emitData,
  closeConnection,
  reauthSession,
  replayCredentials
} from './socket.js'

import {
  initializeTerminal,
  openTerminal,
  applyTerminalOptions,
  resizeTerminal,
  writeToTerminal,
  clearTerminal,
  focusTerminal,
  getTerminalDimensions,
  disposeTerminal
} from './terminal.js'

import stateManager from './state.js'

import { library, dom } from '@fortawesome/fontawesome-svg-core'
import {
  faBars, faClipboard, faDownload, faKey, faCog
} from '@fortawesome/free-solid-svg-icons'
import {
  formatDate,
  initializeConfig,
  populateFormFromUrl,
  getCredentials,
  sanitizeHtml
} from './utils.js'

library.add(faBars, faClipboard, faDownload, faKey, faCog)
dom.watch()
const debug = createDebug('webssh2-client')

let config
let elements
let term
let sessionLogEnable = false
let loggedData = false
let sessionLog = ''
const sessionFooter = ''

document.addEventListener('DOMContentLoaded', initialize)

function initialize () {
  try {
    config = initializeConfig()
    config = populateFormFromUrl(config) // Merge URL parameters into the config
    initializeTerminalAndUI()
    setupReauthBtn()
    setupCredentialsBtn()
    setupDownloadBtn()
    initSocket(
      config,
      onConnect,
      onDisconnect,
      onData,
      writeToTerminal,
      focusTerminal
      // () => showReconnectPrompt(reconnectToServer)
    )
    setupEventListeners()
    checkSavedSessionLog()
    initializeConnection()
  } catch (error) {
    handleError('Initialization error:', error)
  }
}

function initializeTerminalAndUI () {
  if (term) {
    console.warn('Terminal already initialized. Skipping re-initialization.')
    return
  }
  const options = getTerminalOptions()
  debug('initializeTerminal options:', options)
  term = initializeTerminal(config)
  elements = initializeElements()

  if (elements.terminalContainer) {
    openTerminal(elements.terminalContainer)
  } else {
    console.error('Terminal container not found. Terminal cannot be initialized.')
  }

  applyTerminalOptions(options)
}

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

function setupEventListeners () {
  debug('Setting up event listeners')
  const { logBtn, logBtnStop, loginForm } = elements
  if (logBtn) {
    logBtn.addEventListener('click', toggleLog)
  }
  if (logBtnStop) {
    logBtnStop.addEventListener('click', toggleLog)
  }
  if (loginForm) {
    loginForm.addEventListener('submit', handleFormSubmit)
  }
  window.addEventListener('resize', handleResize)
  document.addEventListener('keydown', handleKeyDown)
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeErrorModal()
    }
  })
}

function handleFormSubmit (e) {
  e.preventDefault()
  const formData = new FormData(e.target)
  const formDataObject = Object.fromEntries(formData.entries())
  hideLoginPrompt()
  connectToServer(formDataObject)
}

function handleResize () {
  const dimensions = resizeTerminal()
  if (dimensions) {
    debug('Sending resized:', dimensions)
    emitResize(dimensions)
  }
}

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
  const isConnecting = stateManager.getIsConnecting()
  if (isConnecting) {
    debug('Connection already in progress')
    return
  }

  stateManager.setIsConnecting(true)

  initializeSocketConnection()

  if (elements.terminalContainer) {
    elements.terminalContainer.style.display = 'block'
  }

  // We'll pass formData to authenticate, which will then use it in getCredentials
  // authenticate(formData)

  handleResize()

  // updateStatus('Authenticating...', 'orange')
}

function onConnect () {
  hideReconnectPrompt()
  closeErrorModal()

  // Reset session log settings
  sessionLogEnable = false
  loggedData = false
  sessionLog = ''
  updateLogButtonState(false)

  debug('Successfully connected to the server');

}

function onDisconnect (reason) {
  debug('onDisconnect:', reason)

  if (reason === 'auth_required') {
    showLoginPrompt()
    return // Exit the function early to avoid further actions
  }
  if (reason === 'auth_failed') {
    showLoginPrompt()
    return // Exit the function early to avoid further actions
  }

  toggleTerminalDisplay(false)
  stateManager.setIsConnecting(false)

  if (reason === 'error') {
    showErrorModal(`Socket error: ${reason}`)
  } else {
    showErrorModal(`Disconnected: ${reason}`)
  }

  if (sessionLogEnable) {
    const autoDownload = window.confirm('Would you like to download the session log?')
    saveSessionLog(autoDownload)
  }

  // closeConnection()

  resetApplication()

  // Explicitly show the reconnect prompt
  showReconnectPrompt(reconnectToServer)
}

function onData (data) {
  // The terminal should already be updated by the writeToTerminal function in socket.js
  // So we only need to handle additional logic here, like logging
  if (sessionLogEnable) {
    sessionLog += data
  }
  // Remove any lines that directly write to the terminal, like:
  // term.write(data);
}

function handleError (message, error) {
  console.error('Error:', message, error)
  stateManager.setIsConnecting(false)
  updateStatus(`Error: ${message}`, 'red')
  showErrorModal(message)
  // showReconnectPrompt()
}

function resetApplication () {
  sessionLogEnable = false
  loggedData = false
  sessionLog = ''
  updateLogButtonState(false)

  clearTerminal()
  writeToTerminal('Disconnected. Please wait for reconnection or refresh the page.\r\n')
}

function reconnectToServer () {
  const isConnecting = stateManager.getIsConnecting()
  if (isConnecting) {
    debug('Reconnection already in progress')
    return
  }

  hideReconnectPrompt()
  closeErrorModal()
  stateManager.setReconnectAttempts(0)

  // closeConnection()

  // initializeSocketConnection()

  connectToServer()
}

function toggleLog () {
  sessionLogEnable = !sessionLogEnable

  if (sessionLogEnable) {
    loggedData = true
    const currentDate = new Date()
    updateLogButtonState(true)
    sessionLog = `Log Start for ${sessionFooter}: ${formatDate(currentDate)}\r\n\r\n`
    debug('Starting log')
  } else {
    updateLogButtonState(false)
    if (loggedData) {
      sessionLog += `\r\n\r\nLog End for ${sessionFooter}: ${formatDate(new Date())}\r\n`
      debug('Stopping log')
    } else {
      debug('Log was not actually running, resetting UI')
    }
  }

  focusTerminal()
}

function downloadLog () {
  if (loggedData) {
    const currentDate = new Date()
    const filename = `WebSSH2-${formatDate(currentDate).replace(/[/:\s@]/g, '')}.log`
    const cleanLog = sanitizeHtml(sessionLog)
    const blob = new Blob([cleanLog], { type: 'text/plain' })

    if (window.navigator.msSaveOrOpenBlob) {
      window.navigator.msSaveBlob(blob, filename)
    } else {
      const elem = document.createElement('a')
      elem.href = URL.createObjectURL(blob)
      elem.download = filename
      document.body.appendChild(elem)
      elem.click()
      document.body.removeChild(elem)
    }
  }
  focusTerminal()
}

function saveSessionLog (autoDownload = false) {
  if (sessionLogEnable && loggedData) {
    const filename = `WebSSH2-${formatDate(new Date()).replace(/[/:\s@]/g, '')}.log`
    const cleanLog = sanitizeHtml(sessionLog)
    const blob = new Blob([cleanLog], { type: 'text/plain' })

    if (autoDownload) {
      if (window.navigator.msSaveOrOpenBlob) {
        window.navigator.msSaveBlob(blob, filename)
      } else {
        const elem = document.createElement('a')
        elem.href = URL.createObjectURL(blob)
        elem.download = filename
        document.body.appendChild(elem)
        elem.click()
        document.body.removeChild(elem)
      }
    } else {
      try {
        window.localStorage.setItem('webssh2_session_log', cleanLog)
        window.localStorage.setItem('webssh2_session_log_date', new Date().toISOString())
        debug('Session log saved to localStorage')
      } catch (e) {
        handleError('Failed to save session log to localStorage:', e)
        saveSessionLog(true)
      }
    }
  }
}

function checkSavedSessionLog () {
  const savedLog = window.localStorage.getItem('webssh2_session_log')
  const savedDate = window.localStorage.getItem('webssh2_session_log_date')

  if (savedLog && savedDate) {
    const restoreLog = window.confirm(`A saved session log from ${new Date(savedDate).toLocaleString()} was found. Would you like to download it?`)
    if (restoreLog) {
      const filename = `WebSSH2-Recovered-${formatDate(new Date(savedDate)).replace(/[/:\s@]/g, '')}.log`
      const blob = new Blob([savedLog], { type: 'text/plain' })

      if (window.navigator.msSaveOrOpenBlob) {
        window.navigator.msSaveBlob(blob, filename)
      } else {
        const elem = document.createElement('a')
        elem.href = URL.createObjectURL(blob)
        elem.download = filename
        document.body.appendChild(elem)
        elem.click()
        document.body.removeChild(elem)
      }

      window.localStorage.removeItem('webssh2_session_log')
      window.localStorage.removeItem('webssh2_session_log_date')
    }
  }
}

function initializeConnection () {
  try {
    if (config.autoConnect) {
      debug('Auto-connect is enabled')
      if (elements.loginForm) {
        fillLoginForm(config.ssh)
      }
      connectToServer()
    } else {
      showLoginPrompt()
    }
  } catch (error) {
    handleError('Connection initialization failed', error)
  }
}

function fillLoginForm (sshConfig) {
  debug('Filling login form with:', sshConfig)
  if (elements.hostInput) elements.hostInput.value = sshConfig.host || ''
  if (elements.portInput) elements.portInput.value = sshConfig.port || ''
  if (elements.usernameInput) elements.usernameInput.value = sshConfig.username || ''
}

function setupReauthBtn () {
  const reauthBtn = document.getElementById('reauthBtn')
  if (reauthBtn) {
    reauthBtn.addEventListener('click', () => {
      reauthSession()
    })
  }
}

function setupDownloadBtn () {
  const downloadLogBtn = document.getElementById('downloadLogBtn')
  if (downloadLogBtn) {
    downloadLogBtn.addEventListener('click', () => {
      downloadLog()
    })
  }
}

function setupCredentialsBtn () {
  const credentialsBtn = document.getElementById('credentialsBtn')
  if (credentialsBtn) {
    credentialsBtn.addEventListener('click', () => {
      replayCredentials()
    })
  }
}
