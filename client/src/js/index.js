// client/src/index.js
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
let sessionLog, sessionFooter, logDate, currentDate, myFile, errorExists;
let socket;

document.addEventListener("DOMContentLoaded", () => {
  const term = new Terminal();
  const fitAddon = new FitAddon();
  term.loadAddon(fitAddon);

  const elements = {
    status: document.getElementById("status"),
    header: document.getElementById("header"),
    dropupContent: document.getElementById("dropupContent"),
    footer: document.getElementById("footer"),
    terminalContainer: document.getElementById("terminal-container"),
    loginContainer: document.getElementById("login-container"),
    loginForm: document.getElementById("login-form"),
    hostInput: document.getElementById("hostInput"),
    portInput: document.getElementById("portInput"),
    usernameInput: document.getElementById("usernameInput"),
    passwordInput: document.getElementById("passwordInput"),
    dropupContent: document.getElementById('dropupContent'),
    logBtn: document.getElementById("logBtn"),
    downloadLogBtn: document.getElementById("downloadLogBtn"),
    credentialsBtn: document.getElementById("credentialsBtn"),
    reauthBtn: document.getElementById("reauthBtn")
  };

  if (!elements.loginForm) {
    console.error("Login form not found");
    return;
  }

  elements.logBtn.addEventListener('click', toggleLog);

  elements.terminalContainer.style.display = "none";
  term.open(elements.terminalContainer);

  window.addEventListener("resize", () => {
    fitAddon.fit();
    socket?.emit("resize", { cols: term.cols, rows: term.rows });
  });

  elements.loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    connectToServer();
  });

  function connectToServer() {
    socket = io("http://localhost:2222", {
      path: "/ssh/socket.io",
      withCredentials: true,
    });

    setupSocketListeners();
    
    const credentials = {
      host: elements.hostInput.value,
      port: parseInt(elements.portInput.value, 10),
      username: elements.usernameInput.value,
      password: elements.passwordInput.value,
      term: "xterm-color",
      cols: term.cols,
      rows: term.rows,
    };

    socket.emit("authenticate", credentials);
    updateStatus("Authenticating...", "yellow");
  }

  function setupSocketListeners() {
    socket.on("connect_error", (error) => console.error("Connection error:", error));
    socket.on("connect", () => console.log("Connected to server"));
    socket.on("disconnect", handleDisconnect);
    socket.on("auth_result", handleAuthResult);
    socket.on("data", handleData);
    socket.on("error", handleError);
    socket.on("setTerminalOpts", setTerminalOptions);
    socket.on("title", (data) => document.title = data);
    socket.on("status", (data) => elements.status.innerHTML = data);
    socket.on("ssherror", handleSSHError);
    socket.on("headerBackground", (data) => elements.header.style.backgroundColor = data);
    socket.on("header", handleHeader);
    socket.on("footer", (data) => {
      sessionFooter = data;
      elements.footer.innerHTML = data;
    });
    socket.on("statusBackground", (data) => elements.status.style.backgroundColor = data);
    socket.on("allowreplay", handleAllowReplay);
    socket.on("allowreauth", handleAllowReauth);
    socket.on("reauth", () => allowreauth && reauthSession());
  }

  function handleDisconnect(reason) {
    updateStatus(`WEBSOCKET SERVER DISCONNECTED: ${reason}`, "red");
    elements.loginContainer.style.display = "block";
    elements.terminalContainer.style.display = "none";
    socket.io.reconnection(false);
  }

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

  function handleData(data) {
    term.write(data);
    if (sessionLogEnable) {
      sessionLog += data;
    }
  }

  function handleError(err) {
    if (!errorExists) {
      updateStatus(`ERROR: ${err}`, "red");
      console.log("ERROR: ", err);
    }
  }

  function handleSSHError(data) {
    updateStatus(data, "red");
    errorExists = true;
  }

  function handleHeader(data) {
    if (data) {
      elements.header.innerHTML = data;
      elements.header.style.display = "block";
      elements.terminalContainer.style.height = "calc(100% - 38px)";
      fitAddon.fit();
    }
  }

  function handleAllowReplay(data) {
    allowreplay = data;
    console.log("allowreplay:", data);
    elements.credentialsBtn.classList.toggle('visible', data);
    elements.credentialsBtn.addEventListener('click', replayCredentials);
  }

  function handleAllowReauth(data) {
    allowreauth = data;
    console.log("allowreauth:", data);
    elements.reauthBtn.classList.toggle('visible', data);
    elements.reauthBtn.addEventListener('click', reauthSession);
  }


  function updateStatus(message, color) {
    elements.status.innerHTML = message;
    elements.status.style.backgroundColor = color;
  }

  function setTerminalOptions(data) {
    Object.assign(term.options, data);
  }

  term.onData((data) => socket?.emit("data", data));
  term.onTitleChange((title) => document.title = title);

  function reauthSession() {
    elements.loginContainer.style.display = "block";
    elements.terminalContainer.style.display = "none";
  }

  function replayCredentials() {
    socket?.emit("control", "replayCredentials");
    console.log("replaying credentials");
    term.focus();
  }

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
    logDate = currentDate;
    term.focus();
  }

  function formatDate(date) {
    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()} @ ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`;
  }

  function downloadLog() {
    if (loggedData) {
      const filename = `WebSSH2-${logDate.getFullYear()}${logDate.getMonth() + 1}${logDate.getDate()}_${logDate.getHours()}${logDate.getMinutes()}${logDate.getSeconds()}.log`;
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

  document.addEventListener("keydown", function (event) {
    if (event.ctrlKey && event.shiftKey && event.code === "Digit6") {
      event.preventDefault();
      socket?.emit("data", "\x1E");
    }
  });
});