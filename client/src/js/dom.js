// /client/src/js/dom.js
/**
 * @module dom
 * @description Handles DOM manipulations and UI updates for WebSSH2 client
 */

import createDebug from 'debug'
import { sanitizeColor, sanitizeHtml } from './utils'

import { connectToServer } from './index.js'

import { emitData, emitResize, reauth, replayCredentials } from './socket.js'

import { downloadLog, clearLog, toggleLog } from './clientlog.js'

import { getTerminalSettings, saveTerminalSettings } from './settings.js'

import { applyTerminalOptions, resizeTerminal } from './terminal.js'

const debug = createDebug('webssh2-client:dom')
let elements = {}

/**
 * Closes the error modal.
 */
export function hideErrorDialog() {
  const { errorDialog } = elements
  if (errorDialog) {
    errorDialog.close()
  }
}

/**
 * Fills the login form with the provided SSH configuration.
 *
 * @param {Object} sshConfig - The SSH configuration object.
 * @param {string} sshConfig.host - The SSH host.
 * @param {number} sshConfig.port - The SSH port.
 * @param {string} sshConfig.username - The SSH username.
 */
export function fillLoginForm(sshConfig) {
  const { hostInput, portInput, usernameInput } = elements
  const { host, port, username } = sshConfig

  debug('Filling login form with:', sshConfig)

  if (hostInput) hostInput.value = host || ''
  if (portInput) portInput.value = port || ''
  if (usernameInput) usernameInput.value = username || ''
}

/**
 * Hides the login modal
 */
export function hideloginDialog() {
  elements.loginDialog.close()
}

/**
 * Hides the reconnect button
 */
export function hideReconnectBtn() {
  toggleVisibility(elements.backdrop, false)
  hideButton(elements.reconnectButton, true)
}

/**
 * Initializes DOM elements and stores references to them
 * @throws Will throw an error if a critical element is not found
 * @returns {Object} An object containing references to DOM elements
 */
export function initializeElements() {
  const elementIds = [
    'backdrop',
    'clearLogBtn',
    'closeTerminalOptionsBtn',
    'downloadLogBtn',
    'dropupContent',
    'errorDialog',
    'errorMessage',
    'footer',
    'header',
    'hostInput',
    'loginDialog',
    'loginForm',
    'passwordInput',
    'portInput',
    'reauthBtn',
    'reauthBtn',
    'reconnectButton',
    'replayCredentialsBtn',
    'startLogBtn',
    'status',
    'stopLogBtn',
    'stopLogBtn',
    'terminalContainer',
    'terminalOptionsBtn',
    'terminalOptionsDialog',
    'terminalOptionsForm',
    'usernameInput'
  ]

  // Define critical elements that must be present
  const criticalElements = ['terminalContainer', 'loginForm', 'errorDialog']

  elements = {}

  elementIds.forEach((id) => {
    const element = document.getElementById(id)
    if (element) {
      elements[id] = element
    } else {
      if (criticalElements.includes(id)) {
        throw new Error(`Critical element with id '${id}' not found`)
      } else {
        console.warn(`Element with id '${id}' not found`)
      }
    }
  })

  if (elements.loginForm) {
    ;[
      'bellStyle',
      'cursorBlink',
      'fontFamily',
      'fontSize',
      'letterSpacing',
      'lineHeight',
      'logLevel',
      'readyTimeout',
      'scrollback',
      'sshTerm',
      'tabStopWidth'
    ].forEach((field) => {
      const input = document.createElement('input')
      input.type = 'hidden'
      input.name = field
      input.id = field + 'Input'
      elements.loginForm.appendChild(input)
      elements[field + 'Input'] = input
    })
  }

  if (elements.errorDialog) {
    const closeBtn = elements.errorDialog.querySelector('.close-button')
    if (closeBtn) {
      closeBtn.onclick = () => {
        hideErrorDialog()
      }
      elements.errorDialog.addEventListener('close', () => {
        if (elements.reconnectButton) {
          elements.reconnectButton.focus()
        }
      })
    }
  }
  return elements
}

/**
 * Sets up event listeners for various elements in the application.
 */
export function setupEventListeners() {
  debug('Setting up event listeners')

  // Event handlers for elements
  const elementHandlers = {
    clearLogBtn: clearLog,
    closeTerminalOptionsBtn: hideTerminalOptionsDialog,
    downloadLogBtn: downloadLog,
    loginForm: formSubmit,
    reauthBtn: reauth,
    replayCredentialsBtn: replayCredentials,
    startLogBtn: toggleLog,
    stopLogBtn: toggleLog,
    terminalOptionsBtn: showTerminalOptionsDialog
  }

  Object.entries(elementHandlers).forEach(([elementName, handler]) => {
    const element = elements[elementName]
    if (element) {
      const eventType = elementName === 'loginForm' ? 'submit' : 'click'
      element.addEventListener(eventType, handler)
    }
  })

  // Add event listener for terminal options form
  if (elements.terminalOptionsForm) {
    elements.terminalOptionsForm.addEventListener(
      'submit',
      handleTerminalOptionsSubmit
    )
  }

  // Global event listeners
  window.addEventListener('resize', resize)
  document.addEventListener('keydown', keydown)

  passwordInput.addEventListener('keyup', detectCapsLock)
  passwordInput.addEventListener('keydown', detectCapsLock)
}

/**
 * Shows an error modal
 * @param {string} message - The error message to display
 */
export function showErrorDialog(message) {
  // todo: handle clearing status bar when non-critical error occurs
  // potentially add a flag to differentiate between critical and non-critical errors
  // or create a different function/event for warnings...
  const { errorMessage, errorDialog } = elements

  if (errorMessage && errorDialog) {
    debug(`Error modal shown with message: ${message}`)
    errorMessage.textContent = message
    errorDialog.showModal()
    updateElement('status', 'ERROR', 'red')
  } else {
    console.error('Error modal or error message element not found')
  }
}

/**
 * Shows the login modal
 */
export function showloginDialog() {
  const { loginDialog, terminalContainer, passwordInput } = elements
  debug('showloginDialog: Showing login dialog')
  loginDialog.show()
  toggleVisibility(terminalContainer, true)
  if (passwordInput) passwordInput.value = ''
  focusAppropriateInput()
}

/**
 * Shows the reconnect button and sets up the onclick handler
 * @param {Function} reconnectCallback - The function to call when the reconnect button is clicked
 */
export function showReconnectBtn(reconnectCallback) {
  const { reconnectButton, backdrop } = elements
  toggleVisibility(backdrop, true)
  showButton(reconnectButton, reconnectCallback)
  reconnectButton.focus()
}

/**
 * Displays or hides the terminal container
 * @param {boolean} visible - Whether to show or hide the terminal
 */
export function toggleTerminalDisplay(visible) {
  const { terminalContainer } = elements
  if (terminalContainer) {
    if (visible) {
      toggleVisibility(terminalContainer, true)
    } else {
      toggleVisibility(terminalContainer, false)
    }
  }
}

/**
 * Creates and triggers a download of a blob
 * @param {Blob} blob - The blob to download
 * @param {string} filename - The filename for the download
 */
export function triggerDownload(blob, filename) {
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  // Revoke the object URL after download to release memory
  URL.revokeObjectURL(link.href)
}

/**
 * Retrieves the elements.
 *
 * @returns {Array} The elements.
 */
export function getElements() {
  return elements
}

/**
 * Updates the content and/or background color of a given element.
 * @param {string} elementName - The name of the element (e.g., 'status', 'header', 'footer').
 * @param {string|object} content - The new content for the element. Can be a string or an object with 'text' and 'background' properties.
 * @param {string} [color] - The optional background color for the element (if content is a string). Deprecated in favor of passing an object as content.
 */
export function updateElement(elementName, content, color) {
  const element = elements[elementName]
  if (!element || !content) {
    console.warn(`${elementName} element not found or content missing.`)
    return
  }

  const { text = '', background } =
    typeof content === 'object' ? content : { text: content, background: color }
  const sanitizedContent = sanitizeHtml(text)
  const sanitizedColor = background ? sanitizeColor(background) : null

  debug(
    `Updating ${elementName} element with sanitized content: ${sanitizedContent} and color: ${sanitizedColor || 'undefined'}`
  )

  element.innerHTML = sanitizedContent
  if (sanitizedColor) element.style.backgroundColor = sanitizedColor

  if (elementName === 'header') {
    const { terminalContainer } = elements
    toggleVisibility(element, true)
    if (terminalContainer) terminalContainer.classList.add('with-header')
  }
}

/**
 * Updates the log button state
 * @param {boolean} isLogging - Whether logging is currently active
 */
export function updatestartLogBtnState(isLogging) {
  const { startLogBtn, stopLogBtn, downloadLogBtn, clearLogBtn } = elements

  if (startLogBtn && stopLogBtn) {
    if (isLogging) {
      toggleVisibility(startLogBtn, false)
      toggleVisibility(stopLogBtn, true)
    } else {
      toggleVisibility(startLogBtn, true)
      toggleVisibility(stopLogBtn, false)
    }
  }

  if (downloadLogBtn) {
    if (isLogging) {
      toggleVisibility(downloadLogBtn, true)
      toggleVisibility(clearLogBtn, true)
    }
  }
}

/**
 * Updates the visibility of UI elements based on server permissions
 * @param {Object} permissions - Object containing permission flags
 */
export function updateUIVisibility(permissions) {
  debug(`Updating UI visibility: ${JSON.stringify(permissions)}`)

  const permissionHandlers = {
    allowReauth: updateReauthBtnVisibility,
    allowReplay: updateReplayCredentialsBtnVisibility
  }

  Object.keys(permissions).forEach((key) => {
    if (permissionHandlers[key] && permissions[key] !== undefined) {
      permissionHandlers[key](permissions[key])
    }
  })

  if (permissions.error) {
    showErrorDialog(permissions.error)
  }
}

/**
/**
 * Focuses on the appropriate input field in the login form
 */
function focusAppropriateInput() {
  const { hostInput, usernameInput, passwordInput, portInput } = elements

  if (hostInput.value) {
    if (usernameInput.value) {
      passwordInput.focus()
      return
    }
    if (portInput.value) {
      usernameInput.focus()
      return
    }
  }
  hostInput.focus()
}

/**
 * Updates the visibility of the reauthentication button
 * @param {boolean} visible - Whether the button should be visible
 */
function updateReauthBtnVisibility(visible) {
  const { reauthBtn } = elements
  if (visible) {
    toggleVisibility(reauthBtn, true)
    return
  }
  toggleVisibility(reauthBtn, false)
}

/**
 * Updates the visibility of the replayCredentialsBtn button
 * @param {boolean} visible - Whether the button should be visible
 */
function updateReplayCredentialsBtnVisibility(visible) {
  const { replayCredentialsBtn } = elements
  if (visible) {
    toggleVisibility(replayCredentialsBtn, true)
    return
  }
  toggleVisibility(replayCredentialsBtn, false)
}

/**
 * Toggles the visibility of the download log button.
 *
 * @param {boolean} visible - Indicates whether the button should be visible or not.
 */
export function toggleDownloadLogBtn(visible) {
  toggleVisibility(elements.downloadLogBtn, visible)
}

/**
 * Toggles the visibility of an element.
 *
 * @param {HTMLElement} element - The DOM element to toggle.
 * @param {boolean} isVisible - If true, show the element; if false, hide it.
 */
function toggleVisibility(element, isVisible) {
  if (!element) return
  debug(`${element.id} visibility set to: ${isVisible}`)

  if (isVisible) {
    element.classList.add('visible')
  } else {
    element.classList.remove('visible')
  }
}

/**
 * Handles the form submission event.
 *
 * @param {Event} e - The form submission event.
 */
function formSubmit(e) {
  e.preventDefault()
  const formData = new FormData(e.target)
  const formDataObject = Object.fromEntries(formData.entries())
  hideloginDialog()
  connectToServer(formDataObject)
}

/**
 * Handles the keydown event.
 *
 * @param {KeyboardEvent} event - The keydown event object.
 */
function keydown(event) {
  // If the key combination is Ctrl + Shift + 6, it prevents the default behavior
  // and emits the data '\x1E'.
  if (event.ctrlKey && event.shiftKey && event.code === 'Digit6') {
    event.preventDefault()
    emitData('\x1E')
  }
}

/**
 * Detects the state of the Caps Lock key and adds or removes the 'capslock-active' class from the password input element accordingly.
 *
 * @param {Event} event - The event object representing the key press event.
 */
function detectCapsLock(event) {
  if (event.getModifierState('CapsLock')) {
    passwordInput.classList.add('capslock-active')
  } else {
    passwordInput.classList.remove('capslock-active')
  }
}

/**
 * Handles the resize event and sends the resized dimensions to the server.
 * @returns {void}
 */
export function resize() {
  const dimensions = resizeTerminal()
  if (dimensions) {
    debug('Sending resized:', dimensions)
    emitResize(dimensions)
  }
}

/**
 * Hides a button and optionally removes its click handler.
 *
 * @param {HTMLElement} button - The button element to hide.
 * @param {boolean} [removeOnClick=false] - Whether to remove the onclick handler.
 */
export function hideButton(button, removeOnClick = false) {
  toggleVisibility(button, false)

  if (removeOnClick && button) {
    button.onclick = null
  }
}

/**
 * Shows a button and optionally assigns a click handler.
 *
 * @param {HTMLElement} button - The button element to show.
 * @param {Function} [onClick=null] - The onclick handler to assign.
 */
export function showButton(button, onClick = null) {
  toggleVisibility(button, true)

  if (onClick && button) {
    button.onclick = onClick
  }
}

/**
 * Shows the terminal options dialog.
 */
export function showTerminalOptionsDialog() {
  if (elements.terminalOptionsDialog) {
    populateTerminalOptionsForm()
    elements.terminalOptionsDialog.showModal()
  }
}

/**
 * Hides the terminal options dialog.
 */
export function hideTerminalOptionsDialog() {
  if (elements.terminalOptionsDialog) {
    elements.terminalOptionsDialog.close()
  }
}

/**
 * Populates the terminal options form with current settings.
 */
function populateTerminalOptionsForm() {
  const settings = getTerminalSettings()
  const form = elements.terminalOptionsForm
  if (form) {
    Object.keys(settings).forEach((key) => {
      const input = form.elements[key]
      if (input) {
        if (input.type === 'checkbox') {
          input.checked = settings[key]
        } else {
          input.value = settings[key]
        }
      }
    })
  } else {
    debug('Error: Terminal options form not found')
  }
}

/**
 * Handles the submission of the terminal options form.
 * @param {Event} event - The form submission event.
 */
export function handleTerminalOptionsSubmit(event) {
  event.preventDefault()
  const form = event.target
  if (!(form instanceof HTMLFormElement)) {
    debug('Error: Invalid form element')
    return
  }

  const settings = {}
  const formData = new FormData(form)

  for (const [key, value] of formData.entries()) {
    switch (key) {
      case 'fontSize':
      case 'scrollback':
      case 'tabStopWidth':
        settings[key] = parseInt(value, 10)
        break
      case 'cursorBlink':
        settings[key] = value === 'true'
        break
      default:
        settings[key] = value
    }
  }

  debug('Saving terminal settings:', settings)
  saveTerminalSettings(settings)
  applyTerminalOptions(settings)
  hideTerminalOptionsDialog()
}
