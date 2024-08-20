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
import { state } from './state.js'
import { toggleLog } from './clientlog.js'
import maskObject from 'jsmasker';

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
    debug('closeConnection')
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
    debug('emitResize', dimensions)
  }
}

/**
 * Initializes the socket connection.
 * @returns {SocketIOClient.Socket} The initialized socket
 */
export function initializeSocketConnection() {
  debug('initializeSocketConnection')
  closeConnection

  socket = io(getWebSocketUrl(), {
    path: getSocketIOPath(),
    withCredentials: true,
    reconnection: false,
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
  if (state.allowReauth) {
    debug('reauth')
    socket.emit('control', 'reauth')
  } else {
    console.warn('reauth: Session reauth not permitted')
    updateUIVisibility({ error: 'Reauthentication not permitted.' })
  }
}

/**
 * Replays credentials to the server.
 */
export function replayCredentials() {
  const allowReplay = state.allowReplay
  if (allowReplay) {
    debug('replayCredentials')
    socket.emit('control', 'replayCredentials')
  } else {
    console.warn('replayCredentials: Credential replay not permitted')
    showErrorDialog('Credential replay not permitted')
  }
}

/**
 * Initiates authentication with the server
 * @param {Object} formData - Optional form data to use for authentication
 */
function authenticate(formData = null) {
  const terminalDimensions = getTerminalDimensions()
  const credentials = getCredentials(formData, terminalDimensions)
  state.term = credentials.term
  const maskedContent = maskObject(credentials)
  debug('authenticate', maskedContent)
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
  const term = state.term
  const terminal = { cols, rows, term }
  debug('getTerminal', terminal)
  if (socket) {
    socket.emit('terminal', terminal)
  }
}

/**
 * Retrieves the path for the Socket.IO connection.
 * @returns {string} The Socket.IO path.
 */
function getSocketIOPath() {
  const socketIOPath =
    config && config.socket && config.socket.path
      ? config.socket.path
      : '/ssh/socket.io'
  debug('getSocketIOPath', socketIOPath)
  return socketIOPath
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

  const webSocketUrl = `${protocol}//${host}:${port}`
  debug('getWebSocketUrl', webSocketUrl)

  return webSocketUrl
}

/**
 * Handles the result of authentication attempt.
 * @param {Object} result - The authentication result.
 */
function authResult(result) {
  debug('authResult', result)
  state.isConnecting = false
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
  debug('connect: Connected to server')
  // term cols/rows
  state.isConnecting = false
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
  debug('connect_error', error)
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
  debug('disconnect', reason)
  state.isConnecting = false
  updateElement('status', `WEBSOCKET SERVER DISCONNECTED: ${reason}`, 'red')

  if (onDisconnectCallback) {
    onDisconnectCallback(reason)
  }
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

/**
 * Applies the given permissions to the corresponding handlers.
 *
 * @param {Object} permissions - The permissions object.
 * @param {boolean} permissions.autoLog - The permission for auto logging.
 * @param {boolean} permissions.allowReauth - The permission for allowing reauthentication.
 * @param {boolean} permissions.allowReconnect - The permission for allowing reconnection.
 * @param {boolean} permissions.allowReplay - The permission for allowing replay.
 */
function permissions(permissions) {
  debug('permissions', permissions)

  const handlers = {
    autoLog: (value) => {
      if (value) toggleLog(value)
    },

    allowReauth: (value) => {
      state.allowReauth = value

      updateUIVisibility({ allowReauth: value })
    },

    allowReconnect: (value) => {
      state.allowReconnect = value
    },

    allowReplay: (value) => {
      state.allowReplay = value

      updateUIVisibility({ allowReplay: value })
    }
  }

  Object.entries(permissions).forEach(([key, value]) => {
    if (key in handlers) {
      handlers[key](value)
    }
  })
}

/**
 * Handles SSH errors from the server
 * @param {string} error - The SSH error message
 */
function ssherror(error) {
  debug('ssherror', error)
  if (onDisconnectCallback) {
    onDisconnectCallback('ssh_error', error)
  }
}

/**
 * Handles the authentication process.
 *
 * @param {Object} data - The data object containing the authentication action.
 */
function authentication(data) {
  debug('authentication', data)

  switch (data.action) {
    case 'request_auth':
      authenticate()
      updateElement('status', 'Requesting authentication...', 'orange')
      break

    case 'auth_result':
      authResult(data)
      break

    case 'reauth':
      if (onDisconnectCallback) {
        onDisconnectCallback('reauth_required', socket)
      }
      break

    case 'dimensions':
      const terminalDimensions = getTerminalDimensions()
      emitResize(terminalDimensions)
      break

    default:
      debug(`Unhandled authentication action: ${data.action}`)
      break
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
  debug('updateUI', JSON.stringify(data))

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
  debug('setupSocketListeners')
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
