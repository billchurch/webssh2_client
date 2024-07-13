"use strict";

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
    
    if (elements.loginContainer) {
      elements.loginContainer.style.display = "block";
    } else {
      console.error("Login container not found. Cannot display login form.");
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
    "loginContainer", "loginForm", "hostInput", "portInput", "usernameInput",
    "passwordInput", "logBtn", "downloadLogBtn", "credentialsBtn", "reauthBtn"
  ];

  let missingElements = [];

  elementIds.forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      elements[id] = element;
    } else {
      missingElements.push(id);
    }
  });

  if (missingElements.length > 0) {
    console.error("Missing elements:", missingElements.join(", "));
  }

  if (elements.terminalContainer) {
    elements.terminalContainer.style.display = "none";
    term.open(elements.terminalContainer);
  } else {
    console.error("Terminal container not found. Terminal cannot be initialized.");
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
 * Sets up listeners for various socket events.
 */
function setupSocketListeners() {
  const listeners = {
    "connect_error": error => console.error("Connection error:", error),
    "connect": () => console.log("Connected to server"),
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
    "reauth": () => allowreauth && reauthSession()
  };

  Object.entries(listeners).forEach(([event, handler]) => {
    socket.on(event, handler);
  });
}

/**
 * Handles disconnection from the server.
 * @param {string} reason - The reason for disconnection.
 */
function handleDisconnect(reason) {
  updateStatus(`WEBSOCKET SERVER DISCONNECTED: ${reason}`, "red");
  elements.loginContainer.style.display = "block";
  elements.terminalContainer.style.display = "none";
  socket.io.reconnection(false);
}

/**
 * Handles the result of authentication attempt.
 * @param {Object} result - The authentication result.
 */
function handleAuthResult(result) {
  if (result.success) {
    elements.loginContainer.style.display = "none";
    elements.terminalContainer.style.display = "block";
    term.focus();
    updateStatus("Connected", "green");
  } else {
    updateStatus(`Authentication failed: ${result.message}`, "red");
    elements.passwordInput.value = "";
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
 * Handles error events from the server.
 * @param {string} err - The error message.
 */
function handleError(err) {
  updateStatus(`ERROR: ${err}`, "red");
  console.log("ERROR: ", err);
}

/**
 * Handles SSH-specific errors.
 * @param {string} data - The SSH error message.
 */
function handleSSHError(data) {
  updateStatus(data, "red");
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
  elements.credentialsBtn.addEventListener('click', replayCredentials);
}

/**
 * Handles the allowreauth flag from the server.
 * @param {boolean} data - Whether reauthentication is allowed.
 */
function handleAllowReauth(data) {
  allowreauth = data;
  console.log("allowreauth:", data);
  elements.reauthBtn.classList.toggle('visible', data);
  elements.reauthBtn.addEventListener('click', reauthSession);
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
 */
function reauthSession() {
  elements.loginContainer.style.display = "block";
  elements.terminalContainer.style.display = "none";
}

/**
 * Replays credentials to the server.
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