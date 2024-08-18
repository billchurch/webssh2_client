// client
// client/src/js/socket.js

import io from 'socket.io-client'
import createDebug from 'debug'
import {
  resize,
  showErrorDialog,
  updateElement,
  updateUIVisibility
} from './dom.js'
import { getCredentials } from './utils.js'
import { getTerminalDimensions } from './terminal.js'
import stateManager from './state.js'
import { toggleLog } from './clientlog.js'

const debug = createDebug('webssh2-client:socket')

let socket
let config
let writeToTerminal
let onConnectCallback
let onDisconnectCallback
let onDataCallback
let focusTerminalCallback

/**
 * Closes the socket connection.
 */
export function closeConnection() {
  if (socket) {
    socket.close()
  }
}

/**
 * Emits data to the server.
 * @param {string} data - The data to send to the server
 */
export function emitData(data) {
  if (socket) {
    socket.emit('data', data)
  }
}

/**
 * Emits a resize event to the server with new terminal dimensions.
 * @param {Object} dimensions - The new dimensions of the terminal
 * @param {number} dimensions.cols - The number of columns
 * @param {number} dimensions.rows - The number of rows
 */
export function emitResize(dimensions) {
  if (socket) {
    socket.emit('resize', dimensions)
    debug('Resized terminal:', dimensions)
  }
}

/**
 * Initializes the socket connection.
 * @returns {SocketIOClient.Socket} The initialized socket
 */
export function initializeSocketConnection() {
  debug('Initializing socket connection')
  if (socket) {
    socket.close()
  }

  socket = io(getWebSocketUrl(), {
    path: getSocketIOPath(),
    withCredentials: true,
    reconnection: false,
    // reconnectionAttempts: 5,
    // reconnectionDelay: 1000,
    // reconnectionDelayMax: 5000,
    timeout: 20000,
    pingTimeout: 60000,
    pingInterval: 25000
  })

  setupSocketListeners()

  return socket
}

/**
 * Initializes the socket module with necessary dependencies.
 */
export function initSocket(
  configObj,
  connectCallback,
  disconnectCallback,
  dataCallback,
  writeFunction,
  focusCallback
) {
  config = configObj
  onConnectCallback = connectCallback
  onDisconnectCallback = disconnectCallback
  onDataCallback = dataCallback
  writeToTerminal = writeFunction
  focusTerminalCallback = focusCallback
}

/**
 * Initiates a reauthentication session.
 */
export function reauth() {
  if (stateManager.getState('allowReauth')) {
    debug('Requesting session reauth')
    socket.emit('control', 'reauth')
  } else {
    debug('Session reauth not allowed')
    updateUIVisibility({ error: 'Reauthentication not allowed' })
  }
}

/**
 * Replays credentials to the server.
 */
export function replayCredentials() {
  const allowReplay = stateManager.getState('allowReplay')
  if (allowReplay) {
    debug('Replaying credentials')
    socket.emit('control', 'replayCredentials')
  } else {
    debug('Credential replay not allowed: ', allowReplay)
    showErrorDialog('Credential replay not allowed')
  }
}

/**
 * Initiates authentication with the server
 * @param {Object} formData - Optional form data to use for authentication
 */
function authenticate(formData = null) {
  const terminalDimensions = getTerminalDimensions()
  const credentials = getCredentials(formData, terminalDimensions)
  stateManager.setState('term', credentials.term)
  debug('Authenticating with credentials:', credentials)
  // {
  //     "host": "192.168.0.20",
  //     "port": 22,
  //     "username": "test123",
  //     "password": "Seven888!",
  //     "term": "xterm-color",
  //     "readyTimeout": 20000,
  //     "cursorBlink": "true",
  //     "cols": 151,
  //     "rows": 53
  // }
  if (credentials.host && credentials.username) {
    socket.emit('authenticate', credentials)
    updateElement('status', 'Authenticating...', 'orange')
  } else {
    if (onDisconnectCallback) {
      onDisconnectCallback('auth_required')
    }
  }
}

/**
 * Retrieves the terminal configuration and sends it to the server.
 */
function getTerminal() {
  const { cols, rows } = getTerminalDimensions()
  const term = stateManager.getState('term')
  const terminal = { cols, rows, term }
  debug('getTerminal: Sending terminal config:', terminal)
  if (socket) {
    socket.emit('terminal', terminal)
  }
}

/**
 * Retrieves the path for the Socket.IO connection.
 * @returns {string} The Socket.IO path.
 */
function getSocketIOPath() {
  return config && config.socket && config.socket.path
    ? config.socket.path
    : '/ssh/socket.io'
}

/**
 * Retrieves the WebSocket URL for establishing a connection.
 * @returns {string} The WebSocket URL.
 */
function getWebSocketUrl() {
  if (config && config.socket && config.socket.url) {
    const url = new URL(config.socket.url)
    url.protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    return url.toString()
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const host = window.location.hostname
  const port = window.location.port || (protocol === 'wss:' ? '443' : '80')

  return `${protocol}//${host}:${port}`
}

/**
 * Handles the result of authentication attempt.
 * @param {Object} result - The authentication result.
 */
function authResult(result) {
  debug('Authentication result:', result)
  stateManager.setState('isConnecting', false)
  if (result.success) {
    updateElement('status', 'Connected', 'green')
    if (focusTerminalCallback) {
      focusTerminalCallback()
    }
  } else {
    updateElement('status', `Authentication failed: ${result.message}`, 'red')
    if (onDisconnectCallback) {
      onDisconnectCallback('auth_failed', result.message)
    }
  }
}

/**
 * Handles successful connections
 */
function connect() {
  debug('Connected to server')
  // term cols/rows
  stateManager.setState('isConnecting', false)
  stateManager.setState('reconnectAttempts', 0)
  updateElement('status', 'Connected', 'green')

  resize()

  if (onConnectCallback) {
    onConnectCallback()
  }
}

/**
 * Handles connection errors
 * @param {Error} error - The connection error
 */
function connect_error(error) {
  debug('Connection error:', error)
  if (onDisconnectCallback) {
    onDisconnectCallback('connect_error', error)
  }
}

/**
 * Handles incoming data from the server.
 * @param {string} data - The data received from the server.
 */
function data(data) {
  if (writeToTerminal) {
    writeToTerminal(data)
  }
  if (onDataCallback) {
    onDataCallback(data)
  }
}

/**
 * Handles disconnections
 * @param {string} reason - The reason for disconnection
 */
function disconnect(reason) {
  debug(`Socket Disconnected: ${reason}`)
  stateManager.setState('isConnecting', false)
  updateElement('status', `WEBSOCKET SERVER DISCONNECTED: ${reason}`, 'red')

  if (onDisconnectCallback) {
    onDisconnectCallback(reason)
  }
  // Removed call to showReconnectBtnCallback
}

/**
 * Handles socket errors
 * @param {Error} error - The error object
 */
function error(error) {
  debug('Socket error:', error)
  if (onDisconnectCallback) {
    onDisconnectCallback('error', error)
  }
}

function permissions(permissions) {
  debug('Received permissions:', permissions)
  const { autoLog, allowReconnect, allowReauth, allowReplay } = permissions
  if (autoLog) {
    debug('Auto logging enabled:', autoLog)
    if (autoLog) {
      toggleLog(autoLog)
    }
  }

  if (allowReauth) {
    debug('Allowing reauth:', allowReauth)
    stateManager.setState('allowReauth', allowReauth)
    updateUIVisibility({ allowReauth })
  }
  if (allowReconnect) {
    debug('Allowing reconnect:', allowReconnect)
    stateManager.setState('allowReconnect', allowReconnect)
  }

  if (allowReplay) {
    debug('Allowing replay:', allowReplay)
    stateManager.setState('allowReplay', allowReplay)
    updateUIVisibility({ allowReplay })
  }
}

/**
 * Handles SSH errors from the server
 * @param {string} error - The SSH error message
 */
function ssherror(error) {
  debug('SSH Error:', error)
  if (onDisconnectCallback) {
    onDisconnectCallback('ssh_error', error)
  }
}

function authentication(data) {
  debug('Received authentication event: ', data)
  if (data.action === 'request_auth') {
    authenticate()
    updateElement('status', 'Requesting authentication...', 'orange')
    return
  }
  if (data.action === 'auth_result') {
    authResult(data)
    return
  }
  if (data.action === 'reauth') {
    if (onDisconnectCallback) {
      onDisconnectCallback('reauth_required')
    }
  }
  if (data.action === 'dimensions') {
    const terminalDimensions = getTerminalDimensions()
    emitResize(terminalDimensions)
  }
}

/**
 * Handles the "updateUI" event from the server and updates the specified UI element.
 *
 * @param {Object} data - The data received from the server.
 * @param {string} data.element - The name of the element to be updated.
 * @param {string|object} data.value - The new content for the element.
 */
function updateUI(data) {
  debug('updateUI: Received updateUI event:', JSON.stringify(data))

  const { element, value } = data

  // Check if the received data is valid
  if (!element || !value) {
    console.warn('updateUI: Received invalid data from updateUI event:', data)
    return
  }

  // Update the element using the updateElement function
  updateElement(element, value)
}

/**
 * Sets up Socket.IO event listeners
 */
function setupSocketListeners() {
  debug('Setting up socket listeners')
  Object.entries({
    authentication,
    connect,
    connect_error,
    data,
    getTerminal,
    disconnect,
    error,
    permissions,
    ssherror,
    updateUI
  }).forEach(([event, handler]) => {
    if (typeof handler === 'function') {
      socket.on(event, handler)
    }
  })
}
