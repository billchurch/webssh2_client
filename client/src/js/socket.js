// /client/src/js/socket.js

import io from 'socket.io-client';
import createDebug from 'debug';
import { updateStatus, showErrorModal, hideLoginPrompt, showLoginPrompt } from './dom.js';
import { getCredentials } from './utils.js';
import state from './state.js';

const debug = createDebug('webssh2-client:socket');

let socket;
let config;
let term;

/**
 * Initializes the socket module with necessary dependencies.
 * @param {Object} globalConfig - The global configuration object
 * @param {Terminal} terminal - The terminal instance
 */
export function initSocket(globalConfig, terminal) {
  config = globalConfig;
  term = terminal;
}

/**
 * Initializes the socket connection.
 * @returns {SocketIOClient.Socket} The initialized socket
 */
export function initializeSocketConnection() {
  if (socket) {
    socket.close();
  }

  socket = io(getWebSocketUrl(), {
    path: getSocketIOPath(),
    withCredentials: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  setupSocketListeners();
  
  return socket;
}

/**
 * Sets up Socket.IO event listeners
 */
function setupSocketListeners() {
  const handlers = {
    connect: handleConnect,
    disconnect: handleDisconnect,
    error: handleError,
    data: handleData,
    // ... other handlers
  };

  Object.entries(handlers).forEach(([event, handler]) => {
    socket.on(event, handler);
  });
}

/**
 * Handles successful connections
 */
function handleConnect() {
  debug('Connected to server');
  state.setIsConnecting(false);
  state.setReconnectAttempts(0);
  // hideReconnectPrompt();
  // closeErrorModal();
  updateStatus("Connected", "green");
  // Reset logging state and UI
//   sessionLogEnable = false;
//   loggedData = false;
//   sessionLog = '';
//   if (elements.logBtn) {
//     elements.logBtn.innerHTML = '<i class="fas fa-clipboard fa-fw"></i> Start Log';
//   }
//   if (elements.downloadLogBtn) {
//     elements.downloadLogBtn.classList.remove('visible');
//   }
}

/**
 * Handles disconnections
 * @param {string} reason - The reason for disconnection
 */
function handleDisconnect(reason) {
  debug(`Socket Disconnected: ${reason}`);
  state.setIsConnecting(false);
  updateStatus(`WEBSOCKET SERVER DISCONNECTED: ${reason}`, "red");
  // Additional disconnect handling...
}

/**
 * Handles socket errors
 * @param {Error} error - The error object
 */
function handleError(error) {
  debug('Socket error:', error);
  showErrorModal(`Socket error: ${error.message}`);
}

/**
 * Handles incoming data from the server.
 * @param {string} data - The data received from the server.
 */
function handleData(data) {
  term.write(data);
  // Handle session logging if needed
}

/**
 * Initiates authentication with the server
 */
export function authenticate() {
  const credentials = getCredentials();
  if (credentials.host && credentials.username) {
    socket.emit('authenticate', credentials);
    updateStatus("Authenticating...", "orange");
  } else {
    showLoginPrompt();
  }
}

/**
 * Retrieves the WebSocket URL for establishing a connection.
 * @returns {string} The WebSocket URL.
 */
function getWebSocketUrl() {
  if (config.socket && config.socket.url) {
    let url = new URL(config.socket.url);
    url.protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return url.toString();
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.hostname;
  const port = window.location.port || (protocol === 'wss:' ? '443' : '80');

  return `${protocol}//${host}:${port}`;
}

/**
 * Retrieves the path for the Socket.IO connection.
 * @returns {string} The Socket.IO path.
 */
function getSocketIOPath() {
  return config.socket?.path || '/ssh/socket.io';
}

// ... Add other socket-related functions here

export function getSocket() {
  return socket;
}