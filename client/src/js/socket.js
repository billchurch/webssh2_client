// /client/src/js/socket.js

import io from 'socket.io-client'
import createDebug from 'debug'
import {
  showErrorModal,
  showLoginPrompt,
  updateHeader,
  updateHeaderBackground,
  updateStatus,
  updateStatusBackground,
  updateUIVisibility
} from './dom.js'
import { getCredentials } from './utils.js'
import { getTerminalDimensions } from './terminal.js'
import stateManager from './state.js'

const debug = createDebug('webssh2-client:socket')

let socket
let config
let writeToTerminal
let onConnectCallback
let onDisconnectCallback
let onDataCallback
let focusTerminalCallback

/**
 * Initiates authentication with the server
 * @param {Object} formData - Optional form data to use for authentication
 */
export function authenticate (formData = null) {
  const terminalDimensions = getTerminalDimensions()
  const credentials = getCredentials(formData, terminalDimensions)
  debug('Authenticating with credentials:', credentials)
  if (credentials.host && credentials.username) {
    socket.emit('authenticate', credentials)
    updateStatus('Authenticating...', 'orange')
  } else {
    if (onDisconnectCallback) {
      onDisconnectCallback('auth_required')
    }
  }
}

/**
 * Closes the socket connection.
 */
export function closeConnection () {
  if (socket) {
    socket.close()
  }
}

/**
 * Emits data to the server.
 * @param {string} data - The data to send to the server
 */
export function emitData (data) {
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
export function emitResize (dimensions) {
  if (socket) {
    socket.emit('resize', dimensions)
    debug('Resized terminal:', dimensions)
  }
}

/**
 * Returns the current socket instance.
 * @returns {SocketIOClient.Socket} The current socket instance
 */
export function getSocket () {
  return socket
}

/**
 * Initializes the socket connection.
 * @returns {SocketIOClient.Socket} The initialized socket
 */
export function initializeSocketConnection () {
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
export function initSocket (configObj, connectCallback, disconnectCallback, dataCallback, writeFunction, focusCallback) {
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
export function reauthSession () {
  if (stateManager.getAllowReauth()) {
    debug('Initiating reauth session')
    showLoginPrompt()
    socket.emit('reauth')
  } else {
    debug('Reauth not allowed')
    updateUIVisibility({ error: 'Reauthentication not allowed' })
  }
}

/**
 * Replays credentials to the server.
 */
export function replayCredentials () {
  if (stateManager.getAllowReplay()) {
    debug('Replaying credentials')
    socket.emit('control', 'replayCredentials')
  } else {
    debug('Credential replay not allowed')
    showErrorModal('Credential replay not allowed')
  }
}

/**
 * Retrieves the path for the Socket.IO connection.
 * @returns {string} The Socket.IO path.
 */
function getSocketIOPath () {
  return config && config.socket && config.socket.path ? config.socket.path : '/ssh/socket.io'
}

/**
 * Retrieves the WebSocket URL for establishing a connection.
 * @returns {string} The WebSocket URL.
 */
function getWebSocketUrl () {
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
 * Handles the allowReauth flag from the server.
 * @param {boolean} allowed - Whether reauthentication is allowed
 */
function handleAllowReauth (allowed) {
  debug('allowReauth:', allowed)

  // Update the application state
  stateManager.setAllowReauth(allowed)

  // Update the UI
  updateUIVisibility({ allowReauth: allowed })
}

/**
 * Handles the allowReplay flag from the server.
 * @param {boolean} allowed - Whether replaying credentials is allowed
 */
function handleAllowReplay (allowed) {
  debug('allowReplay:', allowed)

  // Update the application state
  stateManager.setAllowReplay(allowed)

  // Update the UI
  updateUIVisibility({ allowReplay: allowed })
}

/**
 * Handles the result of authentication attempt.
 * @param {Object} result - The authentication result.
 */
function handleAuthResult (result) {
  debug('Authentication result:', result)
  stateManager.setIsConnecting(false)
  if (result.success) {
    updateStatus('Connected', 'green')
    if (focusTerminalCallback) {
      focusTerminalCallback()
    }
  } else {
    updateStatus(`Authentication failed: ${result.message}`, 'red')
    if (onDisconnectCallback) {
      onDisconnectCallback('auth_failed', result.message)
    }
  }
}

/**
 * Handles successful connections
 */
function handleConnect () {
  debug('Connected to server')
  stateManager.setIsConnecting(false)
  stateManager.setReconnectAttempts(0)
  updateStatus('Connected', 'green')

  if (onConnectCallback) {
    onConnectCallback()
  }
}

/**
 * Handles connection errors
 * @param {Error} error - The connection error
 */
function handleConnectError (error) {
  debug('Connection error:', error)
  if (onDisconnectCallback) {
    onDisconnectCallback('connect_error', error)
  }
}

/**
 * Handles incoming data from the server.
 * @param {string} data - The data received from the server.
 */
function handleData (data) {
  if (writeToTerminal) {
    writeToTerminal(data)
  }
  // Remove or comment out the following line if it exists
  // term.write(data);  // This line might be causing the echo
  if (onDataCallback) {
    onDataCallback(data)
  }
}

/**
 * Handles disconnections
 * @param {string} reason - The reason for disconnection
 */
function handleDisconnect (reason) {
  debug(`Socket Disconnected: ${reason}`)
  stateManager.setIsConnecting(false)
  updateStatus(`WEBSOCKET SERVER DISCONNECTED: ${reason}`, 'red')

  if (onDisconnectCallback) {
    onDisconnectCallback(reason)
  }
  // Removed call to showReconnectPromptCallback
}

/**
 * Handles socket errors
 * @param {Error} error - The error object
 */
function handleError (error) {
  debug('Socket error:', error)
  if (onDisconnectCallback) {
    onDisconnectCallback('error', error)
  }
}

/**
 * Handles footer content updates from the server
 * @param {string} content - The new footer content
 */
function handleFooter (content) {
  // This function might need to be implemented in dom.js
  // and then imported and used here
}

/**
 * Handles header content updates from the server
 * @param {string} content - The new header content
 */
function handleHeader (content) {
  updateHeader(content)
}

/**
 * Handles header background color updates from the server
 * @param {string} color - The new header background color
 */
function handleHeaderBackground (color) {
  updateHeaderBackground(color)
}

/**
 * Handles reauth requests from the server
 */
function handleReauth () {
  if (onDisconnectCallback) {
    onDisconnectCallback('reauth_required')
  }
}

/**
 * Handles auth requests from the server
 */
function handleRequestAuth () {
  debug('Received request_auth from server')
  authenticate()
  updateStatus('Requesting authentication...', 'orange')

  // if (onDisconnectCallback) {
  //   onDisconnectCallback('auth_required')
  // }
}

/**
 * Handles SSH errors from the server
 * @param {string} error - The SSH error message
 */
function handleSSHError (error) {
  debug('SSH Error:', error)
  if (onDisconnectCallback) {
    onDisconnectCallback('ssh_error', error)
  }
}

/**
 * Handles status updates from the server
 * @param {string} status - The new status message
 */
function handleStatus (status) {
  updateStatus(status)
}

/**
 * Handles status background color updates from the server
 * @param {string} color - The new status background color
 */
function handleStatusBackground (color) {
  updateStatusBackground(color)
}

/**
 * Handles title updates from the server
 * @param {string} title - The new title
 */
function handleTitle (title) {
  document.title = title
}

/**
 * Sets up Socket.IO event listeners
 */
function setupSocketListeners () {
  const handlers = {
    allowReplay: handleAllowReplay,
    allowReauth: handleAllowReauth,
    auth_result: handleAuthResult,
    connect: handleConnect,
    connect_error: handleConnectError,
    data: handleData,
    disconnect: handleDisconnect,
    error: handleError,
    footer: handleFooter,
    header: handleHeader,
    headerBackground: handleHeaderBackground,
    reauth: handleReauth,
    request_auth: handleRequestAuth,
    status: handleStatus,
    ssherror: handleSSHError,
    statusBackground: handleStatusBackground,
    title: handleTitle
  }

  Object.entries(handlers).forEach(([event, handler]) => {
    socket.on(event, handler)
  })
}
