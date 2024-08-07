"use strict";
// webssh2-client
// /client/src/js/index.js
import createDebug from 'debug';
import io from "socket.io-client";
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import 'purecss/build/pure.css';
import '../css/menu.css';
import '@xterm/xterm/css/xterm.css';
import '../css/terminal.css';
import '../css/style.css';

import { 
  closeErrorModal,
  hideLoginPrompt,
  hideReconnectPrompt,
  initializeElements,
  showErrorModal,
  showLoginPrompt,
  updateStatus
} from './dom.js';

import state from './state.js';

import { library, dom } from "@fortawesome/fontawesome-svg-core";
import {
  faBars, faClipboard, faDownload, faKey, faCog,
} from "@fortawesome/free-solid-svg-icons";
import { 
  formatDate,
  initializeConfig,
  isObject, 
  mergeDeep, 
  populateFormFromUrl,
  validateBellStyle,
  validateNumber
} from './utils.js';

library.add(faBars, faClipboard, faDownload, faKey, faCog);
dom.watch();

let allowReauth = false;
let allowReplay = false;
let config;
let currentDate;
let elements;
let fitAddon;
let loggedData = false;
let sessionFooter = '';
let sessionLog = '';
let sessionLogEnable = false;
let socket;
let term;
let urlParams;
const debug = createDebug('webssh2-client');
const maxReconnectAttempts = 5;
const reconnectDelay = 5000;
const socketHandlers = {
  auth_result: handleAuthResult,
  connect_error: handleConnectError,
  connect: handleConnect,
  disconnect: handleDisconnect,
  data: handleData,
  error: handleError,
  setTerminalOpts: setTerminalOptions,
  title: (data) => { document.title = data; },
  status: (data) => { elements.status.innerHTML = data; },
  ssherror: handleError,
  headerBackground: (data) => { elements.header.style.backgroundColor = data; },
  header: handleHeader,
  footer: handleFooter,
  statusBackground: (data) => { elements.status.style.backgroundColor = data; },
  allowReplay: handleallowReplay,
  allowReauth: handleallowReauth,
  connection_closed: handleConnectionClose,
  reauth: () => { if (allowReauth) reauthSession(); },
  request_auth: handleRequestAuth,
  ping: () => { debug(`Received ping from server ${socket.id}`); },
  pong: (latency) => { debug(`Received pong from server ${socket.id}. Latency: ${latency}ms`); },
};

document.addEventListener("DOMContentLoaded", initialize);

function initialize() {
  try {
    config = initializeConfig();
    urlParams = populateFormFromUrl(config);
    initializeTerminal();
    elements = initializeElements(term);
    setupEventListeners();
    checkSavedSessionLog();
    initializeConnection();
  
    if (config.autoConnect) {
      debug("Auto-connect is enabled");
      // Silently fill out the form if autoConnect is true
      if (elements.loginForm) {
        fillLoginForm(config.ssh);
      }
      // Attempt connection without showing the modal
      connectToServer();
    } else {
      // Only show the modal if autoConnect is false or not set
      showLoginPrompt();
    }
  } catch (error) {
    handleError("Initialization error:", error);
  }
};

/**
 * Initializes the terminal instance.
 */
function initializeTerminal() {
  try {
    const options = getTerminalOptions();
    console.log('initializeTerminal options:', options);
    term = new Terminal(options);
    fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.onData((data) => socket?.emit("data", data));
    term.onTitleChange((title) => document.title = title);
    applyTerminalOptions(options);
  } catch (error) {
    handleError("Terminal initialization failed", error);
  }
}

/**
 * Returns the options for the terminal.
 *
 * @returns {Object} The terminal options.
 */
function getTerminalOptions() {
  console.log('getTerminalOptions Config:', config);
  let terminial = config.terminal
  console.log(`terminal.cursorBlink: ${terminial.cursorBlink}`);
  return {
    logLevel: terminial.logLevel ?? 'info',
    cursorBlink: terminial.cursorBlink ?? true,
    scrollback: terminial.scrollback ?? 10000,
    tabStopWidth: terminial.tabStopWidth ?? 8,
    bellStyle: terminial.bellStyle ?? 'sound',
    fontSize: terminial.fontSize ?? 12,
    fontFamily: terminial.fontFamily ?? 'courier-new, courier, monospace',
    letterSpacing: terminial.letterSpacing ?? 0,
    lineHeight: terminial.lineHeight ?? 1
  };
}

/**
 * Sets up event listeners for various user interactions.
 */
function setupEventListeners() {
  if (elements.logBtn) {
    elements.logBtn.addEventListener('click', toggleLog);
  } else {
    console.warn("Log button not found. Log functionality may be unavailable.");
  }

  if (elements.loginForm) {
    elements.loginForm.addEventListener("submit", handleFormSubmit);
  } else {
    console.warn("Login form not found. Form submission handling unavailable.");
  }

  window.addEventListener("resize", handleResize);
  document.addEventListener("keydown", handleKeyDown);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeErrorModal();
    }
  });
}

/**
 * Handles errors
 * @param {string|Error} err - The error message or object
 */
function handleError(message, error) {
  console.error('Error:', message, error);
  state.setIsConnecting(false);
  updateStatus(`Error: ${message}`, 'red');
  showErrorModal(message);
  showReconnectPrompt();
}

/**
 * Handles form submission event.
 * @param {Event} e - The submit event.
 */
function handleFormSubmit(e) {
  e.preventDefault();
  const formData = new FormData(e.target);
  const formDataObject = Object.fromEntries(formData.entries());
  hideLoginPrompt();
  connectToServer(formDataObject);
}

/**
 * Handles window resize event.
 */
function handleResize() {
  if (fitAddon && term) {
    fitAddon.fit();
    const dimensions = { cols: term.cols, rows: term.rows };
    debug('Terminal resized:', dimensions);
    socket?.emit("resize", dimensions);
  }
}

/**
 * Handles keydown event for specific key combinations.
 * @param {KeyboardEvent} event - The keydown event.
 */
function handleKeyDown(event) {
  if (event.ctrlKey && event.shiftKey && event.code === "Digit6") {
    event.preventDefault();
    socket?.emit("data", "\x1E");
  }
}

/**
 * Connects to the server
 */
function connectToServer(formData = null) {
  let isConnecting = state.getIsConnecting();
  if (isConnecting) {
    debug('Connection already in progress');
    return;
  }

  state.setIsConnecting(true);
  
  const credentials = getCredentials(formData);

  initializeSocketConnection();
  
  if (elements.terminalContainer) {
    elements.terminalContainer.style.display = "block";
  }

  handleHeader(credentials.host);  // You might want to customize this

  handleResize();

  console.log('connectToServer credentials:', credentials);
  socket.emit("authenticate", credentials);
  updateStatus("Authenticating...", "orange");
}

/**
 * Retrieves the SSH credentials from various sources.
 * @param {Object} formData - Optional form data from manual input
 * @returns {Object} An object containing the SSH credentials.
 */
function getCredentials(formData = null) {
  console.log('getCredentials urlParams:', urlParams);
  return {
    host: formData?.host || config.ssh?.host || urlParams.host || elements.hostInput?.value || '',
    port: parseInt(formData?.port || config.ssh?.port || urlParams.port || elements.portInput?.value || '22', 10),
    username: formData?.username || config.ssh?.username || urlParams.username || elements.usernameInput?.value || '',
    password: formData?.password || config.ssh?.password || urlParams.password || elements.passwordInput?.value || '',
    cursorBlink: urlParams.cursorBlink || config.terminal?.cursorBlink || true,
    term: urlParams.sshTerm || config.ssh?.term || "xterm-color",
    readyTimeout: validateNumber(config.ssh?.readyTimeout || urlParams.readyTimeout, 1, 300000, 20000),
    cols: term.cols,
    rows: term.rows
  };
}

/**
 * Initializes the socket connection.
 */
function initializeSocketConnection() {
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
    pingTimeout: 60000,  // 1 minute
    pingInterval: 25000, // 25 seconds
  });

  setupSocketListeners();
  
  if (elements.terminalContainer) {
    elements.terminalContainer.style.display = "block";
  }

  handleResize();
}

/**
 * Sets up Socket.IO event listeners
 */
function setupSocketListeners() {
  Object.entries(socketHandlers).forEach(([event, handler]) => {
    if (typeof handler === 'function') {
      socket.on(event, (...args) => {
        try {
          handler(...args);
        } catch (error) {
          console.error(`Error in ${event} handler:`, error);
          handleError(`Internal error handling ${event}`, error);
        }
      });
    } else {
      console.warn(`Handler for event '${event}' is not a function`);
    }
  });
}

/**
 * Handles connection closed event
 */
function handleConnectionClose() {
  debug(`SSH CONNECTION CLOSED`);
  state.setIsConnecting(false);
  if (socket) {
    socket.close();
    socket = null;
  }
  showReconnectPrompt();
}

/**
 * Enables terminal input
 */
function enableTerminalInput() {
  // Reset the onData handler to allow input again
  term.onData((data) => socket?.emit("data", data));
}

/**
 * Disables terminal input
 */
function disableTerminalInput() {
  // In xterm.js v5.5.0, we can't directly disable input
  term.onData((data) => {  });
}

/**
 * Initiates a reconnection to the server
 */
function reconnectToServer() {
  let isConnecting = state.getIsConnecting();
  if (isConnecting) {
    debug('Reconnection already in progress');
    return;
  }
  
  hideReconnectPrompt();
  closeErrorModal();
  state.setReconnectAttempts(0);
  connectToServer();
}

/**
 * Handles connection errors
 * @param {Error} error - The connection error
 */
function handleConnectError(error) {
  handleError('Connection error:', error);
  handleDisconnect('connect_error');
}

/**
 * Handles successful connections
 */
function handleConnect() {
  debug('Connected to server');
  state.setIsConnecting(false);
  state.setReconnectAttempts(0);
  hideReconnectPrompt();
  closeErrorModal();
  updateStatus("Connected", "green");

  // Reset logging state and UI
  sessionLogEnable = false;
  loggedData = false;
  sessionLog = '';
  if (elements.logBtn) {
    elements.logBtn.innerHTML = '<i class="fas fa-clipboard fa-fw"></i> Start Log';
  }
  if (elements.downloadLogBtn) {
    elements.downloadLogBtn.classList.remove('visible');
  }
}

/**
 * Handles disconnections
 * @param {string} reason - The reason for disconnection
 */
function handleDisconnect(reason) {
  debug(`Socket Disconnected: ${reason}`);
  
  state.setIsConnecting(false); 
  
  if (elements.status) {
    updateStatus(`WEBSOCKET SERVER DISCONNECTED: ${reason}`, "red");
  }

  if (elements.terminalContainer) {
    elements.terminalContainer.style.display = "none";
  }

  // Save or download the session log
  if (sessionLogEnable) {
    const autoDownload = confirm("Would you like to download the session log?");
    saveSessionLog(autoDownload);
  }

  resetApplication();
  showReconnectPrompt();
}

/**
 * Handles the request for authentication from the server.
 */
function handleRequestAuth() {  
  debug('Server requested authentication');
  console.log('Server requested authentication');
  const credentials = getCredentials();
  if (credentials.host && credentials.username) {
    socket.emit('authenticate', credentials);
    updateStatus("Authenticating...", "orange");
  } else {
    showLoginPrompt();
  }
}

/**
 * Resets the application state
 */
function resetApplication() {
  // Reset logging state
  sessionLogEnable = false;
  loggedData = false;
  sessionLog = '';

  // Reset UI elements related to logging
  if (elements.logBtn) {
    elements.logBtn.innerHTML = '<i class="fas fa-clipboard fa-fw"></i> Start Log';
  }
  if (elements.downloadLogBtn) {
    elements.downloadLogBtn.classList.remove('visible');
  }

  // Reset any other global states or variables

  // Reset the terminal if it exists
  if (term) {
    term.clear();
    term.write('Disconnected. Please wait for reconnection or refresh the page.\r\n');
  }
}

/**
 * Attempts to reconnect to the server
 */
function attemptReconnect() {
  let isConnecting = state.getIsConnecting();
  let reconnectAttempts = state.getReconnectAttempts();
  if (isConnecting || reconnectAttempts >= maxReconnectAttempts) {
    showReconnectPrompt();
    return;
  }

  reconnectAttempts++;
  state.setIsConnecting(true);
  state.setReconnectAttempts(reconnectAttempts);

  debug(`Attempting to reconnect (${reconnectAttempts}/${maxReconnectAttempts})...`);
  updateStatus(`Attempting to reconnect (${reconnectAttempts}/${maxReconnectAttempts})...`, "orange");

  setTimeout(() => {
      connectToServer();
  }, reconnectDelay);
}

/**
 * Shows the reconnect prompt
 */
function showReconnectPrompt() {
  if (elements.reconnectButton) {
    reconnectButton.style.display = 'block';
    reconnectButton.onclick = reconnectToServer;
  } else {
    handleError('DOM Error', 'Reconnect button not found in the DOM');
  }
}



/**
 * Handles the result of authentication attempt.
 * @param {Object} result - The authentication result.
 */
function handleAuthResult(result) {
  debug("Authentication result:", result)
  state.setIsConnecting(false);
  if (result.success) {
    hideLoginPrompt();
    if (elements.terminalContainer) {
      elements.terminalContainer.style.display = "block";
    }
    term.focus();
    updateStatus("Connected", "green");
  } else {
    updateStatus(`Authentication failed: ${result.message}`, "red");
    if (elements.passwordInput) {
      elements.passwordInput.value = "";
    }
    showLoginPrompt();
  }
}

/**
 * Handles incoming data from the server.
 * @param {string} data - The data received from the server.
 */
function handleData(data) {
  term.write(data);
  if (sessionLogEnable) {
    sessionLog += data;
  }
}

/**
 * Handles updates to the header.
 * @param {string} data - The new header content.
 */
function handleHeader(data) {
  if (data) {
    elements.header.innerHTML = data;
    elements.header.style.display = "block";
    elements.terminalContainer.style.height = "calc(100% - 38px)";
  } else {
    elements.header.style.display = "none";
    // We no longer set the height to 100% when there's no header
    // elements.terminalContainer.style.height = "100%";
  }
  
  // Force a redraw to ensure the new height is applied
  void elements.terminalContainer.offsetHeight;
  
  // Resize the terminal
  handleResize();
}

/**
 * Handles updates to the footer.
 * @param {string} data - The new footer content.
 */
function handleFooter(data) {
  sessionFooter = data;
  elements.footer.innerHTML = data;
}

/**
 * Handles the allowReplay flag from the server.
 * @param {boolean} data - Whether replay is allowed.
 */
function handleallowReplay(data) {
  allowReplay = data;
  debug("allowReplay:", data);
  elements.credentialsBtn.classList.toggle('visible', data);
  elements.credentialsBtn.removeEventListener('click', replayCredentials);
  elements.credentialsBtn.addEventListener('click', () => replayCredentials(socket));
}

/**
 * Handles the allowReauth flag from the server.
 * @param {boolean} data - Whether reauthentication is allowed.
 */
function handleallowReauth(data) {
  allowReauth = data;
  debug("allowReauth:", data);
  elements.reauthBtn.classList.toggle('visible', data);
  elements.reauthBtn.removeEventListener('click', reauthSession);
  elements.reauthBtn.addEventListener('click', () => reauthSession(socket));
}

/**
 * Sets terminal options received from the server.
 * @param {Object} data - The terminal options.
 */
function setTerminalOptions(data) {
  Object.assign(term.options, data);
}

/**
 * Initiates a reauthentication session.
 * @param {Object} socket - The socket object for communication.
 */
function reauthSession(socket) {
  showLoginPrompt();
  socket.emit("reauth");
}

/**
 * Replays credentials to the server.
 * @param {Object} socket - The socket object for communication.
 */
function replayCredentials(socket) {
  socket.emit("control", "replayCredentials");
  debug("replaying credentials");
  term.focus();
}

/**
 * Toggles the session logging functionality.
 */
function toggleLog() {
  sessionLogEnable = !sessionLogEnable;
  
  if (sessionLogEnable) {
    loggedData = true;
    currentDate = new Date();
    elements.logBtn.innerHTML = '<i class="fas fa-cog fa-spin fa-fw"></i> Stop Log';
    elements.downloadLogBtn.classList.add('visible');
    elements.downloadLogBtn.addEventListener('click', downloadLog);
    sessionLog = `Log Start for ${sessionFooter}: ${formatDate(currentDate)}\r\n\r\n`;
    debug("Starting log");
  } else {
    elements.logBtn.innerHTML = '<i class="fas fa-clipboard fa-fw"></i> Start Log';
    if (loggedData) {
      sessionLog += `\r\n\r\nLog End for ${sessionFooter}: ${formatDate(new Date())}\r\n`;
      debug("Stopping log");
    } else {
      debug("Log was not actually running, resetting UI");
    }
  }

  term.focus();
}

/**
 * Downloads the current session log.
 */
function downloadLog() {
  if (loggedData) {
    const filename = `WebSSH2-${formatDate(currentDate).replace(/[/:\s@]/g, '')}.log`;
    const cleanLog = sessionLog.replace(/[\u001b\u009b][[\]()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><;]/g, "");
    const blob = new Blob([cleanLog], { type: "text/plain" });

    if (window.navigator.msSaveOrOpenBlob) {
      window.navigator.msSaveBlob(blob, filename);
    } else {
      const elem = document.createElement("a");
      elem.href = URL.createObjectURL(blob);
      elem.download = filename;
      document.body.appendChild(elem);
      elem.click();
      document.body.removeChild(elem);
    }
  }
  term.focus();
}

/**
 * Applies terminal options to the terminal instance.
 *
 * @param {Object} options - The options to apply to the terminal.
 */
function applyTerminalOptions(options) {
  console.log(`cursorBlink: ${options.cursorBlink}`);
  const terminalOptions = {
    cursorBlink: options.cursorBlink !== undefined ? options.cursorBlink === true || options.cursorBlink === 'true' : true,
    scrollback: validateNumber(options.scrollback, 1, 200000, 10000),
    tabStopWidth: validateNumber(options.tabStopWidth, 1, 100, 8),
    bellStyle: validateBellStyle(options.bellStyle),
    fontSize: validateNumber(options.fontSize, 1, 72, 12),
    logLevel: options.logLevel || 'info',
    fontFamily: options.fontFamily || 'courier-new, courier, monospace',
    letterSpacing: options.letterSpacing !== undefined ? Number(options.letterSpacing) : 0,
    lineHeight: options.lineHeight !== undefined ? Number(options.lineHeight) : 1
  };
  console.log('Applying terminal options:', terminalOptions);

  Object.assign(term.options, terminalOptions);
}

/**
 * Saves or downloads the current session log
 * @param {boolean} autoDownload - Whether to automatically download the log
 */
function saveSessionLog(autoDownload = false) {
  if (sessionLogEnable && loggedData) {
    const filename = `WebSSH2-${formatDate(new Date()).replace(/[/:\s@]/g, '')}.log`;
    const cleanLog = sessionLog.replace(/[\u001b\u009b][[\]()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><;]/g, "");
    const blob = new Blob([cleanLog], { type: "text/plain" });

    if (autoDownload) {
      // Automatically download the log
      if (window.navigator.msSaveOrOpenBlob) {
        window.navigator.msSaveBlob(blob, filename);
      } else {
        const elem = document.createElement("a");
        elem.href = URL.createObjectURL(blob);
        elem.download = filename;
        document.body.appendChild(elem);
        elem.click();
        document.body.removeChild(elem);
      }
    } else {
      // Save the log in localStorage
      try {
        localStorage.setItem('webssh2_session_log', cleanLog);
        localStorage.setItem('webssh2_session_log_date', new Date().toISOString());
        debug('Session log saved to localStorage');
      } catch (e) {
        handleError('Failed to save session log to localStorage:', e);
        // If localStorage fails, attempt to download
        saveSessionLog(true);
      }
    }
  }
}

/**
 * Checks for and restores a saved session log
 */
function checkSavedSessionLog() {
  const savedLog = localStorage.getItem('webssh2_session_log');
  const savedDate = localStorage.getItem('webssh2_session_log_date');

  if (savedLog && savedDate) {
    const restoreLog = confirm(`A saved session log from ${new Date(savedDate).toLocaleString()} was found. Would you like to download it?`);
    if (restoreLog) {
      const filename = `WebSSH2-Recovered-${formatDate(new Date(savedDate)).replace(/[/:\s@]/g, '')}.log`;
      const blob = new Blob([savedLog], { type: "text/plain" });

      if (window.navigator.msSaveOrOpenBlob) {
        window.navigator.msSaveBlob(blob, filename);
      } else {
        const elem = document.createElement("a");
        elem.href = URL.createObjectURL(blob);
        elem.download = filename;
        document.body.appendChild(elem);
        elem.click();
        document.body.removeChild(elem);
      }

      // Clear the saved log after downloading
      localStorage.removeItem('webssh2_session_log');
      localStorage.removeItem('webssh2_session_log_date');
    }
  }
}

/**
 * Retrieves the WebSocket URL for establishing a connection.
 * If the WebSocket URL is provided in the `config.socket.url` property, it will be used.
 * Otherwise, it constructs the WebSocket URL based on the current window location.
 * @returns {string} The WebSocket URL.
 */
function getWebSocketUrl() {
  // Check if a custom URL is provided in the configuration
  if (config.socket && config.socket.url) {
    let url = new URL(config.socket.url);
    // Use wss:// if the page is served over https, ws:// otherwise
    url.protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return url.toString();
  }

  // If no custom URL is provided, construct one based on the current location
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.hostname;
  const port = window.location.port || (protocol === 'wss:' ? '443' : '80');

  return `${protocol}//${host}:${port}`;
}

/**
 * Retrieves the path for the Socket.IO connection.
 * If the path is not specified in the `config` object, the default path '/ssh/socket.io' is returned.
 *
 * @returns {string} The Socket.IO path.
 */
function getSocketIOPath() {
  return config.socket?.path || '/ssh/socket.io';
}

/**
 * Initializes the connection based on configuration and user input.
 */
function initializeConnection() {
  try {
    if (config.autoConnect) {
      debug("Auto-connect is enabled");
      // Silently fill out the form if autoConnect is true
      if (elements.loginForm) {
        fillLoginForm(config.ssh);
      }
      // Attempt connection without showing the modal
      connectToServer();
    } else {
      // Only show the modal if autoConnect is false or not set
      showLoginPrompt();
    }
  } catch (error) {
    handleError("Connection initialization failed", error);
  }
}

/**
 * Fills out the login form with provided SSH configuration
 * @param {Object} sshConfig - The SSH configuration object
 */
function fillLoginForm(sshConfig) {
  if (elements.hostInput) elements.hostInput.value = sshConfig.host || '';
  if (elements.portInput) elements.portInput.value = sshConfig.port || '';
  if (elements.usernameInput) elements.usernameInput.value = sshConfig.username || '';
  // Note: We typically don't pre-fill passwords for security reasons
  // if (elements.passwordInput) elements.passwordInput.value = sshConfig.password || '';
}
