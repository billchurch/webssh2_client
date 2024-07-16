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

document.addEventListener("DOMContentLoaded", () => {
  try {
    initializeTerminal();
    initializeElements();
    setupEventListeners();
    
    // Show the modal when the page loads
    if (elements.loginModal) {
      elements.loginModal.style.display = "block";
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
  term = new Terminal();
  fitAddon = new FitAddon();
  term.loadAddon(fitAddon);
  term.onData((data) => socket?.emit("data", data));
  term.onTitleChange((title) => document.title = title);
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

  elements = {}; // Reset the elements object

  elementIds.forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      elements[id] = element;
    } else {
      console.warn(`Element with id '${id}' not found`);
    }
  });

  if (elements.terminalContainer) {
    elements.terminalContainer.style.display = "none";
    term.open(elements.terminalContainer);
  } else {
    console.error("Terminal container not found. Terminal cannot be initialized.");
  }

  // Initialize close button for error modal
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

  // Error modal close button
  if (elements.closeErrorModal) {
    elements.closeErrorModal.addEventListener('click', closeErrorModal);
  }

  // Close modal on Escape key press
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeErrorModal();
    }
  });

}

/**
 * Displays the error modal with a given message.
 * @param {string} message - The error message to display in the modal.
 */
function showErrorModal(message) {
  if (elements.errorMessage && elements.errorModal) {
    elements.errorMessage.textContent = message;
    elements.errorModal.style.display = 'block';
  } else {
    console.error("Error modal or error message element not found");
    alert(`Error: ${message}`); // Fallback to alert if modal is not available
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
 * Handles error events from the server, including SSH-specific errors.
 * Updates the status, logs to console, and shows an error modal.
 * @param {string} err - The error message.
 * @param {boolean} [isSSH=false] - Whether this is an SSH-specific error.
 */
function handleError(err) {
  const errorMessage = typeof err === 'string' ? err : (err.message || 'An unknown error occurred');
  console.error('Error:', errorMessage);
  updateStatus(`Error: ${errorMessage}`, 'red');
  showErrorModal(errorMessage);
}

/**
 * Handles form submission event.
 * @param {Event} e - The submit event.
 */
function handleFormSubmit(e) {
  e.preventDefault();
  connectToServer();
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
 * Initiates a connection to the server.
 * @param {Object} [basicAuthCreds] - Basic Auth credentials if available.
 */
function connectToServer(basicAuthCreds) {
  socket = io("http://localhost:2222", {
    path: "/ssh/socket.io",
    withCredentials: true,
  });

  setupSocketListeners();
  
  const credentials = {
    host: elements.hostInput?.value || '192.168.0.20',
    port: elements.portInput ? parseInt(elements.portInput.value, 10) : 22,
    username: basicAuthCreds ? basicAuthCreds.username : elements.usernameInput.value,
    password: basicAuthCreds ? basicAuthCreds.password : elements.passwordInput.value,
    term: "xterm-color",
    cols: term.cols,
    rows: term.rows,
  };

  socket.emit("authenticate", credentials);
  updateStatus("Authenticating...", "yellow");
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
    "ssherror": handleSSHError,
    "headerBackground": data => elements.header.style.backgroundColor = data,
    "header": handleHeader,
    "footer": handleFooter,
    "statusBackground": data => elements.status.style.backgroundColor = data,
    "allowreplay": handleAllowReplay,
    "allowreauth": handleAllowReauth,
    "connection_closed": handleConnectionClosed,
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

function handleConnectionClosed() {
  console.log('SSH connection closed by server');
  updateStatus('Connection closed. Please reconnect.', 'red');
  disableTerminalInput();
  showReconnectPrompt();
}

function enableTerminalInput() {
  // Reset the onData handler to allow input again
  term.onData((data) => socket?.emit("data", data));
}

function disableTerminalInput() {
  // In xterm.js v5.5.0, we can't directly disable input
  // Instead, we'll create a custom handler to prevent input
  term.onData((data) => {
    // Do nothing, effectively disabling input
  });
}

function reconnectToServer() {
  if (socket) {
    socket.close();
  }
  // Reset terminal state
  enableTerminalInput();
  // Remove reconnect button if it exists
  const reconnectButton = document.querySelector('button');
  if (reconnectButton) {
    reconnectButton.remove();
  }
  // Attempt to reconnect
  connectToServer();
}


/**
 * Handles disconnection from the server.
 * @param {string} reason - The reason for disconnection.
 */
function handleDisconnect(reason) {
  console.log(`Disconnected: ${reason}`);
  
  // Safely update status if the element exists
  if (elements.status) {
    updateStatus(`WEBSOCKET SERVER DISCONNECTED: ${reason}`, "red");
  } else {
    console.warn("Status element not found. Cannot update status.");
  }

  // Safely handle UI elements
  if (elements.loginContainer) {
    elements.loginContainer.style.display = "block";
  } else {
    console.warn("Login container not found. Cannot display login form.");
  }

  if (elements.terminalContainer) {
    elements.terminalContainer.style.display = "none";
  } else {
    console.warn("Terminal container not found. Cannot hide terminal.");
  }

  // Close the socket connection if it's still open
  if (socket && socket.connected) {
    socket.io.reconnection(false);
    socket.disconnect();
  }

  // Additional cleanup or reset operations can be added here
  resetApplication();
}

function resetApplication() {
  // Reset any global states or variables
  isConnectionClosed = true;
  sessionLogEnable = false;
  loggedData = false;
  // ... reset other global variables as needed

  // Clear any ongoing processes or timers
  // ... clear any setInterval or setTimeout if you have any

  // Reset the terminal if it exists
  if (term) {
    term.clear();
    // Optionally, you can write a message in the terminal
    term.write('Disconnected. Please refresh the page to reconnect.\r\n');
  }

  // Show reconnect button or message
  showReconnectPrompt();
}

function showReconnectPrompt() {
  // Check if a reconnect button already exists
  if (document.getElementById('reconnectButton')) {
    return; // Don't create multiple buttons
  }

  const reconnectButton = document.createElement('button');
  reconnectButton.id = 'reconnectButton';
  reconnectButton.textContent = 'Reconnect';
  reconnectButton.onclick = () => {
    // Refresh the page to restart the application
    window.location.reload();
  };
  
  // Add some basic styling
  reconnectButton.style.position = 'fixed';
  reconnectButton.style.top = '50%';
  reconnectButton.style.left = '50%';
  reconnectButton.style.transform = 'translate(-50%, -50%)';
  reconnectButton.style.zIndex = '1000';
  
  // Append to body as it's a critical UI element
  document.body.appendChild(reconnectButton);

  console.log('Reconnect button added');
}
/**
 * Handles the result of authentication attempt.
 * @param {Object} result - The authentication result.
 */
function handleAuthResult(result) {
  if (result.success) {
    if (elements.loginModal) {
      elements.loginModal.style.display = "none";
    }
    elements.terminalContainer.style.display = "block";
    term.focus();
    updateStatus("Connected", "green");
  } else {
    updateStatus(`Authentication failed: ${result.message}`, "red");
    if (elements.passwordInput) {
      elements.passwordInput.value = "";
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
 * Updates the status message and color.
 * @param {string} message - The status message.
 * @param {string} color - The color for the status message.
 */
function updateStatus(message, color) {
  elements.status.innerHTML = message;
  elements.status.style.backgroundColor = color;
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
  elements.loginContainer.style.display = "block";
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
  loggedData = true;
  currentDate = new Date();

  if (sessionLogEnable) {
    elements.logBtn.innerHTML = '<i class="fas fa-cog fa-spin fa-fw"></i> Stop Log';
    elements.downloadLogBtn.classList.add('visible');
    elements.downloadLogBtn.addEventListener('click', downloadLog);
    sessionLog = `Log Start for ${sessionFooter}: ${formatDate(currentDate)}\r\n\r\n`;
  } else {
    elements.logBtn.innerHTML = '<i class="fas fa-clipboard fa-fw"></i> Start Log';
    sessionLog += `\r\n\r\nLog End for ${sessionFooter}: ${formatDate(currentDate)}\r\n`;
  }

  console.log(`${sessionLogEnable ? "starting" : "stopping"} log, ${sessionLogEnable}`);
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