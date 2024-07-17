"use strict";
// webclient
import io from "socket.io-client";
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '../css/menu.css';
import '@xterm/xterm/css/xterm.css';
import '../css/terminal.css';
import '../css/style.css';

import { library, dom } from "@fortawesome/fontawesome-svg-core";
import {
  faBars, faClipboard, faDownload, faKey, faCog,
} from "@fortawesome/free-solid-svg-icons";

library.add(faBars, faClipboard, faDownload, faKey, faCog);
dom.watch();

let sessionLogEnable = false;
let loggedData = false;
let allowreplay = false;
let allowreauth = false;
let sessionLog = '';
let sessionFooter = '';
let currentDate;
let socket;
let term, fitAddon;
let elements = {};
let isConnecting = false;
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;
const reconnectDelay = 5000;

document.addEventListener("DOMContentLoaded", () => {
  try {
    initializeTerminal();
    initializeElements();
    setupEventListeners();
    checkSavedSessionLog();

    if (elements.loginModal) {
      elements.loginModal.style.display = "block";
      const urlParams = populateFormFromUrl();
      if (urlParams.host && urlParams.port) {
        elements.usernameInput.focus();
      } else {
        elements.hostInput.focus();
      }
    } else {
      console.error("Login modal not found. Cannot display login form.");
    }

  } catch (error) {
    console.error("Initialization error:", error);
  }
});

/**
 * Initializes the terminal instance.
 */
function initializeTerminal() {
  try {
    const initialOptions = {
      logLevel: 'info', // Default log level
      cursorBlink: true,
      scrollback: 10000,
      tabStopWidth: 8,
      bellStyle: 'sound',
      fontSize: 12,
      fontFamily: 'courier-new, courier, monospace',
      letterSpacing: 0,
      lineHeight: 1
    };
    term = new Terminal(initialOptions);
    fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.onData((data) => socket?.emit("data", data));
    term.onTitleChange((title) => document.title = title);
    applyTerminalOptions(initialOptions);
  } catch (error) {
    console.error("Failed to initialize terminal:", error);
    handleError("Terminal initialization failed", error);
  }
}

/**
 * Initializes DOM elements and stores references to them.
 */
function initializeElements() {
  const elementIds = [
    "status", "header", "dropupContent", "footer", "terminalContainer",
    "loginModal", "loginForm", "hostInput", "portInput", "usernameInput",
    "passwordInput", "logBtn", "downloadLogBtn", "credentialsBtn", "reauthBtn",
    "errorModal", "errorMessage"
  ];

  elements = {};

  elementIds.forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      elements[id] = element;
    } else {
      console.warn(`Element with id '${id}' not found`);
    }
  });

  if (elements.loginForm) {
    ['sshterm', 'readyTimeout', 'cursorBlink', 'scrollback', 'tabStopWidth', 'bellStyle', 
     'fontSize', 'fontFamily', 'letterSpacing', 'lineHeight', 'logLevel'].forEach(field => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = field;
      input.id = field + 'Input';
      elements.loginForm.appendChild(input);
      elements[field + 'Input'] = input;
    });
  }

  if (elements.terminalContainer) {
    elements.terminalContainer.style.display = "none";
    term.open(elements.terminalContainer);
    fitAddon.fit();
  } else {
    console.error("Terminal container not found. Terminal cannot be initialized.");
  }

  if (elements.errorModal) {
    const closeBtn = elements.errorModal.querySelector('.close');
    if (closeBtn) {
      closeBtn.onclick = () => { elements.errorModal.style.display = 'none'; };
    }
  }
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
 * Populates form fields from URL parameters.
 * @returns {Object} The URL parameters for host and port.
 */
function populateFormFromUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  const params = {};
  
  ['host', 'port', 'header', 'headerBackground', 'sshterm', 'readyTimeout', 'cursorBlink', 
   'scrollback', 'tabStopWidth', 'bellStyle', 'fontSize', 'fontFamily', 'letterSpacing', 'lineHeight',
   'username', 'userpassword', 'logLevel'].forEach(param => {
    const value = urlParams.get(param);
    if (value !== null) {
      params[param] = value;
    }
  });

  Object.entries(params).forEach(([key, value]) => {
    const input = elements[key + 'Input'];
    if (input) {
      input.value = value;
    }
  });

  // Special handling for password
  if (params.userpassword && elements.passwordInput) {
    elements.passwordInput.value = params.userpassword;
  }

  return params;
}

/**
 * Shows an error modal
 * @param {string} message - The error message to display
 */
function showErrorModal(message) {
  if (elements.errorMessage && elements.errorModal) {
    elements.errorMessage.textContent = message;
    elements.errorModal.style.display = 'block';
  } else {
    console.error("Error modal or error message element not found");
    alert(`Error: ${message}`);
  }
}

/**
 * Closes the error modal.
 */
function closeErrorModal() {
  if (elements.errorModal) {
    elements.errorModal.style.display = 'none';
  }
}

/**
 * Handles errors
 * @param {string|Error} err - The error message or object
 */
function handleError(message, error) {
  console.error('Error:', message, error);
  isConnecting = false;
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
  connectToServer(formDataObject);
}

/**
 * Handles window resize event.
 */
function handleResize() {
  fitAddon.fit();
  socket?.emit("resize", { cols: term.cols, rows: term.rows });
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
  if (isConnecting) {
    console.log('Connection already in progress');
    return;
  }

  isConnecting = true;

  // Reset logging state
  sessionLogEnable = false;
  loggedData = false;
  sessionLog = '';

  // Reset logging UI
  if (elements.logBtn) {
    elements.logBtn.innerHTML = '<i class="fas fa-clipboard fa-fw"></i> Start Log';
  }
  if (elements.downloadLogBtn) {
    elements.downloadLogBtn.classList.remove('visible');
  }

  if (socket) {
    socket.close();
  }

  socket = io("http://localhost:2222", {
    path: "/ssh/socket.io",
    withCredentials: true,
    reconnection: false,
  });

  setupSocketListeners();
  
  if (elements.terminalContainer) {
    elements.terminalContainer.style.display = "block";
  }

  fitAddon.fit();
  const cols = term.cols;
  const rows = term.rows;
  
  const urlParams = populateFormFromUrl();
  const credentials = {
    host: formData?.host || urlParams.host || elements.hostInput?.value || '192.168.0.20',
    port: parseInt(formData?.port || urlParams.port || elements.portInput?.value || '22', 10),
    username: formData?.username || urlParams.username || elements.usernameInput?.value,
    password: formData?.userpassword || urlParams.userpassword || elements.passwordInput?.value,
    term: formData?.sshterm || urlParams.sshterm || "xterm-color",
    cols: term.cols,
    rows: term.rows,
    readyTimeout: validateNumber(formData?.readyTimeout || urlParams.readyTimeout, 1, 300000, 20000),
  };

  // Apply xterm.js options
  applyTerminalOptions({
    cursorBlink: formData?.cursorBlink || urlParams.cursorBlink,
    scrollback: formData?.scrollback || urlParams.scrollback,
    tabStopWidth: formData?.tabStopWidth || urlParams.tabStopWidth,
    bellStyle: formData?.bellStyle || urlParams.bellStyle,
    fontSize: formData?.fontSize || urlParams.fontSize,
    fontFamily: formData?.fontFamily || urlParams.fontFamily,
    letterSpacing: formData?.letterSpacing || urlParams.letterSpacing,
    lineHeight: formData?.lineHeight || urlParams.lineHeight
  });

  if (urlParams.header) {
    handleHeader(urlParams.header);
  }

  if (urlParams.headerBackground) {
    elements.header.style.backgroundColor = urlParams.headerBackground;
  }

  socket.emit("authenticate", credentials);
  updateStatus("Authenticating...", "orange");

  // If username and password are provided, don't show the login modal
  if (credentials.username && credentials.password) {
    if (elements.loginModal) {
      elements.loginModal.style.display = "none";
    }
  } else {
    showLoginPrompt();
  }
}
function showLoginPrompt() {
  if (elements.loginModal) {
    elements.loginModal.style.display = "block"
  }
  if (elements.terminalContainer) {
    elements.terminalContainer.style.display = "none"
  }
  if (elements.passwordInput) {
    elements.passwordInput.value = ""
  }
  if (elements.usernameInput) {
    elements.usernameInput.focus()
  }
  // Reset connection status
  isConnecting = false
  reconnectAttempts = 0
  hideReconnectPrompt()
}

/**
 * Sets up Socket.IO event listeners
 */
function setupSocketListeners() {
  const listeners = {
    "connect_error": handleConnectError,
    "connect": handleConnect,
    "disconnect": handleDisconnect,
    "auth_result": handleAuthResult,
    "data": handleData,
    "error": handleError,
    "setTerminalOpts": setTerminalOptions,
    "title": data => document.title = data,
    "status": data => elements.status.innerHTML = data,
    "ssherror": handleError,
    "headerBackground": data => elements.header.style.backgroundColor = data,
    "header": handleHeader,
    "footer": handleFooter,
    "statusBackground": data => elements.status.style.backgroundColor = data,
    "allowreplay": handleAllowReplay,
    "allowreauth": handleAllowReauth,
    "connection_closed": handleConnectionClose,
    "reauth": () => allowreauth && reauthSession()
  };

  Object.entries(listeners).forEach(([event, handler]) => {
    if (typeof handler === 'function') {
      socket.on(event, (...args) => {
        try {
          handler(...args);
        } catch (error) {
          console.error(`Error handling event '${event}':`, error);
          handleError(`Internal error handling ${event}`);
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
  console.log(`SSH CONNECTION CLOSED`);
  isConnecting = false;
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
  if (isConnecting) {
    console.log('Reconnection already in progress');
    return;
  }
  
  hideReconnectPrompt();
  closeErrorModal();
  reconnectAttempts = 0;
  connectToServer();
}

/**
 * Handles connection errors
 * @param {Error} error - The connection error
 */
function handleConnectError(error) {
  console.log('Connection error:', error);
  handleDisconnect('connect_error');
}

/**
 * Handles successful connections
 */
function handleConnect() {
  console.log('Connected to server');
  isConnecting = false;
  reconnectAttempts = 0;
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
  console.log(`Disconnected: ${reason}`);
  
  isConnecting = false;
  
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
  if (isConnecting || reconnectAttempts >= maxReconnectAttempts) {
    showReconnectPrompt();
    return;
  }

  isConnecting = true;
  reconnectAttempts++;

  console.log(`Attempting to reconnect (${reconnectAttempts}/${maxReconnectAttempts})...`);
  updateStatus(`Attempting to reconnect (${reconnectAttempts}/${maxReconnectAttempts})...`, "orange");

  setTimeout(() => {
      connectToServer();
  }, reconnectDelay);
}

/**
 * Shows the reconnect prompt
 */
function showReconnectPrompt() {
  if (document.getElementById('reconnectButton')) {
    return;
  }

  const reconnectButton = document.createElement('button');
  reconnectButton.id = 'reconnectButton';
  reconnectButton.textContent = 'Reconnect';
  reconnectButton.onclick = reconnectToServer;
  
  reconnectButton.style.position = 'fixed';
  reconnectButton.style.top = '50%';
  reconnectButton.style.left = '50%';
  reconnectButton.style.transform = 'translate(-50%, -50%)';
  reconnectButton.style.zIndex = '1000';
  
  document.body.appendChild(reconnectButton);

  console.log('Reconnect button added');
}

/**
 * Hides the reconnect prompt
 */
function hideReconnectPrompt() {
  const reconnectButton = document.getElementById('reconnectButton');
  if (reconnectButton) {
    reconnectButton.remove();
  }
}

/**
 * Handles the result of authentication attempt.
 * @param {Object} result - The authentication result.
 */
function handleAuthResult(result) {
  console.log("Authentication result:", result)
  if (result.success) {
    if (elements.loginModal) {
      elements.loginModal.style.display = "none";
      elements.terminalContainer.style.display = "block";
    }
    term.focus();
    console.log("Authentication successful");
    updateStatus("Connected", "green");
  } else {
    updateStatus(`Authentication failed: ${result.message}`, "red");
    if (elements.passwordInput) {
      elements.passwordInput.value = "";
    }
    // Hide the terminal container if authentication fails
    if (elements.terminalContainer) {
      elements.terminalContainer.style.display = "none";
    }
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
    fitAddon.fit();
  }
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
 * Handles the allowreplay flag from the server.
 * @param {boolean} data - Whether replay is allowed.
 */
function handleAllowReplay(data) {
  allowreplay = data;
  console.log("allowreplay:", data);
  elements.credentialsBtn.classList.toggle('visible', data);
  elements.credentialsBtn.removeEventListener('click', replayCredentials);
  elements.credentialsBtn.addEventListener('click', () => replayCredentials(socket));
}

/**
 * Handles the allowreauth flag from the server.
 * @param {boolean} data - Whether reauthentication is allowed.
 */
function handleAllowReauth(data) {
  allowreauth = data;
  console.log("allowreauth:", data);
  elements.reauthBtn.classList.toggle('visible', data);
  elements.reauthBtn.removeEventListener('click', reauthSession);
  elements.reauthBtn.addEventListener('click', () => reauthSession(socket));
}

/**
 * Updates the status message
 * @param {string} message - The status message
 * @param {string} color - The color of the status message
 */
function updateStatus(message, color) {
  if (elements.status) {
    elements.status.innerHTML = message;
    elements.status.style.backgroundColor = color;
  } else {
    console.warn('Status element not found. Cannot update status.');
  }
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
  elements.loginModal.style.display = "block";
  elements.terminalContainer.style.display = "none";
  socket.emit("reauth");
}

/**
 * Replays credentials to the server.
 * @param {Object} socket - The socket object for communication.
 */
function replayCredentials(socket) {
  socket.emit("control", "replayCredentials");
  console.log("replaying credentials");
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
    console.log("Starting log");
  } else {
    elements.logBtn.innerHTML = '<i class="fas fa-clipboard fa-fw"></i> Start Log';
    if (loggedData) {
      sessionLog += `\r\n\r\nLog End for ${sessionFooter}: ${formatDate(new Date())}\r\n`;
      console.log("Stopping log");
    } else {
      console.log("Log was not actually running, resetting UI");
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
 * Formats a date object into a string.
 * @param {Date} date - The date to format.
 * @returns {string} The formatted date string.
 */
function formatDate(date) {
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()} @ ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`;
}

/**
 * Validates a numeric value within a specified range
 * @param {number|string} value - The value to validate
 * @param {number} min - The minimum allowed value
 * @param {number} max - The maximum allowed value
 * @param {number} defaultValue - The default value if validation fails
 * @returns {number} The validated number or the default value
 */
function validateNumber(value, min, max, defaultValue) {
  const num = Number(value);
  if (isNaN(num) || num < min || num > max) {
    return defaultValue;
  }
  return num;
}

/**
 * Validates the bell style option
 * @param {string} value - The bell style to validate
 * @returns {string} The validated bell style or the default 'sound'
 */
function validateBellStyle(value) {
  return ['sound', 'none'].includes(value) ? value : 'sound';
}

function applyTerminalOptions(options) {
  const terminalOptions = {
    cursorBlink: options.cursorBlink !== undefined ? options.cursorBlink === 'true' : true,
    scrollback: validateNumber(options.scrollback, 1, 200000, 10000),
    tabStopWidth: validateNumber(options.tabStopWidth, 1, 100, 8),
    bellStyle: validateBellStyle(options.bellStyle),
    fontSize: validateNumber(options.fontSize, 1, 72, 12),
    logLevel: options.logLevel || 'info',
    fontFamily: options.fontFamily || 'courier-new, courier, monospace',
    letterSpacing: options.letterSpacing !== undefined ? Number(options.letterSpacing) : 0,
    lineHeight: options.lineHeight !== undefined ? Number(options.lineHeight) : 1
  };

  Object.assign(term.options, terminalOptions);
  term.refresh(0, term.rows - 1);
  fitAddon.fit();
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
        console.log('Session log saved to localStorage');
      } catch (e) {
        console.error('Failed to save session log to localStorage:', e);
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