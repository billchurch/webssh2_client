// /client/src/js/dom.js
/**
 * @module dom
 * @description Handles DOM manipulations and UI updates for WebSSH2 client
 */
import state from './state.js';

import createDebug from 'debug';
let elements = {};
const debug = createDebug('webssh2-client:dom');

/**
 * Initializes DOM elements and stores references to them
 */
export function initializeElements(term) {
    const elementIds = [
        "status", "header", "dropupContent", "footer", "terminalContainer",
        "loginModal", "loginForm", "hostInput", "portInput", "usernameInput",
        "passwordInput", "logBtn", "downloadLogBtn", "credentialsBtn", "reauthBtn",
        "errorModal", "errorMessage", "reconnectButton"
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
        ['sshTerm', 'readyTimeout', 'cursorBlink', 'scrollback', 'tabStopWidth', 'bellStyle', 
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
    } else {
        console.error("DOM Error", "Terminal container not found. Terminal cannot be initialized.");
    }

    if (elements.errorModal) {
        const closeBtn = elements.errorModal.querySelector('.close');
        if (closeBtn) {
        closeBtn.onclick = () => { elements.errorModal.style.display = 'none'; };
        }
    }
    return elements;
}

/**
 * Shows the login prompt
 */
export function showLoginPrompt() {
    debug("showLoginPrompt: Displaying login modal");
    if (elements.loginModal) {
        elements.loginModal.style.display = "block"
    }
    if (elements.terminalContainer) {
        elements.terminalContainer.style.display = "none"
    }
    if (elements.passwordInput) {
        elements.passwordInput.value = ""
    }
    focusAppropriateInput()
    // Reset connection status
    state.setIsConnecting
    state.setReconnectAttempts(0)
    hideReconnectPrompt()
}

/**
 * Hides the login prompt
 */
export function hideLoginPrompt() {
  if (elements.loginModal) {
    elements.loginModal.style.display = "none";
  }
}


/**
 * Updates the status message
 * @param {string} message - The status message
 * @param {string} color - The color of the status message
 */
export function updateStatus(message, color) {
    if (elements.status) {
      elements.status.innerHTML = message;
      elements.status.style.backgroundColor = color;
    } else {
      console.warn('Status element not found. Cannot update status.');
    }
}

/**
 * Shows an error modal
 * @param {string} message - The error message to display
 */
export function showErrorModal(message) {
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
export function closeErrorModal() {
  if (elements.errorModal) {
    elements.errorModal.style.display = 'none';
  }
}

/**
 * Hides the reconnect prompt
 */
export function hideReconnectPrompt() {
    if (elements.reconnectButton) {
      reconnectButton.style.display = 'none';
    }
}

/**
 * Focuses on the appropriate input field
 */
function focusAppropriateInput() {
    if (elements.hostInput.value && elements.portInput.value) {
      elements.usernameInput.focus();
    } else {
      elements.hostInput.focus();
    }
  }
