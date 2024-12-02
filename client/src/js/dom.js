// client
// client/src/js/dom.js
/**
 * @module dom
 * @description Handles DOM manipulations and UI updates for WebSSH2 client
 */

import createDebug from 'debug'
import {
  sanitizeColor,
  sanitizeHtml,
  validateNumber,
  validateBellStyle,
  validatePrivateKey
} from './utils'

import { connectToServer } from './index.js'

import { emitData, emitResize, reauth, replayCredentials } from './socket.js'

import { downloadLog, clearLog, toggleLog } from './clientlog.js'

import {
  getLocalTerminalSettings,
  initializeSettings,
  saveTerminalSettings
} from './settings.js'

import { state } from './state.js'

import {
  getTerminalSettings,
  applyTerminalSettings,
  resizeTerminal
} from './terminal.js'

const debug = createDebug('webssh2-client:dom')
let elements = {}
let term

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
 * Closes the prompt modal.
 */
export function hidePromptDialog() {
  const { promptDialog } = elements
  if (promptDialog) {
    promptDialog.close()
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
  const { hostInput, loginForm, portInput, usernameInput } = elements
  const { host, port, username } = sshConfig

  if (loginForm) {
    debug('fillLoginForm', sshConfig)
    if (hostInput) hostInput.value = host || ''
    if (portInput) portInput.value = port || ''
    if (usernameInput) usernameInput.value = username || ''
  } else {
    console.error('fillLoginForm: element not found')
  }
}

/**
 * Hides the login modal
 */
export function hideloginDialog() {
  debug('hideloginDialog')
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
  debug('initializeElements')
  const elementIds = [
    'backdrop',
    'clearLogBtn',
    'closeterminalSettingsBtn',
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
    'privateKeyFile',
    'privateKeyText',
    'privateKeySection',
    'passphraseInput',
    'promptDialog',
    'promptMessage',
    'reauthBtn',
    'reauthBtn',
    'reconnectButton',
    'replayCredentialsBtn',
    'startLogBtn',
    'status',
    'stopLogBtn',
    'stopLogBtn',
    'terminalContainer',
    'terminalSettingsBtn',
    'terminalSettingsDialog',
    'terminalSettingsForm',
    'usernameInput',
    'loginSettingsBtn'
  ]

  // Define critical elements that must be present
  const criticalElements = [
    'terminalContainer',
    'loginForm',
    'errorDialog',
    'promptDialog'
  ]

  elements = {}

  elementIds.forEach((id) => {
    const element = document.getElementById(id)
    if (element) {
      elements[id] = element
    } else {
      if (criticalElements.includes(id)) {
        throw new Error(
          `initializeElements: Critical element with id '${id}' not found`
        )
      } else {
        console.warn(`initializeElements: Element with id '${id}' not found`)
      }
    }
  })

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

  if (elements.promptDialog) {
    const closeBtn = elements.promptDialog.querySelector('.close-button')
    if (closeBtn) {
      closeBtn.onclick = () => {
        hidePromptDialog()
      }
    }
  }
  return elements
}

/**
 * Sets up event listeners for various elements in the application.
 * @param {Object} config - The configuration object containing application settings
 */
export function setupEventListeners(config) {
  debug('setupEventListeners')

  // Event handlers for elements
  const elementHandlers = {
    clearLogBtn: clearLog,
    closeterminalSettingsBtn: hideterminalSettingsDialog,
    downloadLogBtn: downloadLog,
    loginForm: formSubmit,
    loginSettingsBtn: () => showterminalSettingsDialog(config),
    reauthBtn: reauth,
    replayCredentialsBtn: replayCredentials,
    startLogBtn: toggleLog,
    stopLogBtn: toggleLog,
    terminalSettingsBtn: () => showterminalSettingsDialog(config),
    terminalSettingsForm: (event) => handleterminalSettingsSubmit(event, config)
  }

  Object.entries(elementHandlers).forEach(([elementName, handler]) => {
    const element = elements[elementName]
    if (element) {
      const eventType = ['loginForm', 'terminalSettingsForm'].includes(
        elementName
      )
        ? 'submit'
        : 'click'
      element.addEventListener(eventType, handler)
    }
  })

  // Set up private key related events
  setupPrivateKeyEvents()
  
  // Global event listeners
  window.addEventListener('resize', resize)
  document.addEventListener('keydown', keydown)
  // Add beforeunload event listener to prevent accidental tab closure
  window.addEventListener('beforeunload', (event) => {
    event.preventDefault()
  })
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

// Update the showPromptDialog function
/**
 * Shows the prompt dialog for keyboard-interactive authentication.
 * @param {Object} data - The data object containing prompt information.
 * @param {Function} callback - The function to call with the user's responses.
 */
export function showPromptDialog(data, callback) {
  const { promptDialog, promptMessage } = elements
  const form = promptDialog.querySelector('form')
  const inputContainer = form.querySelector('#promptInputContainer')

  if (promptMessage && promptDialog) {
    debug('Prompt dialog shown', data)
    promptMessage.textContent = data.name || 'Authentication Required'

    // Clear previous inputs
    inputContainer.innerHTML = ''

    // Create input fields for each prompt
    let firstInput = null
    data.prompts.forEach((prompt, index) => {
      const label = document.createElement('label')
      label.textContent = prompt.prompt

      const input = document.createElement('input')
      input.type = prompt.echo ? 'text' : 'password'
      input.required = true
      input.id = `promptInput${index}`

      if (index === 0) {
        firstInput = input
      }

      inputContainer.appendChild(label)
      inputContainer.appendChild(input)
    })

    form.onsubmit = (e) => {
      debug('showPromptDialog: form.onsubmit')
      e.preventDefault()
      const responses = data.prompts.map(
        (_, index) => document.getElementById(`promptInput${index}`).value
      )
      hidePromptDialog()
      callback(responses)
    }

    promptDialog.showModal()
    // Set focus to the first input field
    if (firstInput) {
      setTimeout(() => {
        firstInput.focus()
      }, 0)
    }
    updateElement('status', 'RESPONSE REQUIRED', 'orange')
  } else {
    console.error('Prompt modal or prompt message element not found')
  }
}

/**
 * Shows the login modal and handles field disabling for reauthentication
 */
export function showloginDialog() {
  debug('showloginDialog')
  const { loginDialog, terminalContainer, usernameInput, passwordInput } =
    elements
  const isReauthRequired = state.reauthRequired

  loginDialog.show()
  toggleVisibility(terminalContainer, true)
  if (passwordInput) passwordInput.value = ''

  if (isReauthRequired) {
    if (passwordInput) usernameInput.value = ''

    toggleLoginFields(isReauthRequired)
  }
  focusAppropriateInput()
}

/**
 * Shows the reconnect button and sets up the onclick handler
 * @param {Function} reconnectCallback - The function to call when the reconnect button is clicked
 */
export function showReconnectBtn(reconnectCallback) {
  debug('showReconnectBtn')
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
  debug(`toggleTerminalDisplay: ${visible}`)
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
 * Creates and triggers a download for a blob
 * @param {Blob} blob - The blob to download
 * @param {string} filename - The filename for the download
 */
export function triggerDownload(blob, filename) {
  debug(`triggerDownload: ${filename}`)
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
    console.warn(
      `updateElement: ${elementName} element not found or content missing.`
    )
    return
  }

  const { text = '', background } =
    typeof content === 'object' ? content : { text: content, background: color }
  const sanitizedContent = sanitizeHtml(text)
  const sanitizedColor = background ? sanitizeColor(background) : null

  debug('updateElement', { elementName, sanitizedContent, sanitizedColor })

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
  debug(`updatestartLogBtnState: ${isLogging}`)
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
  debug('updateUIVisibility', permissions)

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
 * Focuses on the appropriate input field in the login form
 */
function focusAppropriateInput() {
  debug('focusAppropriateInput')
  const { hostInput, usernameInput, passwordInput, portInput } = elements
  const isReauthRequired = state.reauthRequired

  if (isReauthRequired) {
    // For reauthentication
    if (!usernameInput.value) {
      usernameInput.focus()
      return
    }
    passwordInput.focus()
    return
  }

  // For new connection
  if (!hostInput.value) {
    hostInput.focus()
    return
  }

  if (!usernameInput.value) {
    if (portInput.value) {
      usernameInput.focus()
      return
    }
  }

  passwordInput.focus()
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
  debug(`toggleVisibility: ${element.id}: ${isVisible}`)

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
 * Detects the state of the Caps Lock key and adds or removes the 'capslock-active' class
 * from the password input element accordingly.
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
    debug('resize:', dimensions)
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
 * @param {Object} config - The configuration object
 */
export function showterminalSettingsDialog(config) {
  debug('showterminalSettingsDialog')
  if (elements.terminalSettingsDialog) {
    populateterminalSettingsForm(config)
    elements.terminalSettingsDialog.showModal()
  }
}

/**
 * Populates the terminal options form with current settings.
 * @param {Object} config - The configuration object
 */
function populateterminalSettingsForm(config) {
  const settings = getTerminalSettings(config)
  debug('populateterminalSettingsForm', settings)
  if (elements.terminalSettingsForm) {
    Object.keys(settings).forEach((key) => {
      const input = elements.terminalSettingsForm.elements[key]
      if (input) {
        if (input.type === 'checkbox') {
          input.checked = settings[key]
        } else {
          input.value = settings[key]
        }
      }
    })
  }
}

/**
 * Hides the terminal options dialog.
 */
export function hideterminalSettingsDialog() {
  debug('hideterminalSettingsDialog')
  elements?.terminalSettingsDialog?.close?.()
}

/**
 * Handles the submission of the terminal options form.
 * @param {Event} event - The form submission event.
 * @param {Object} config - The configuration object
 */
export function handleterminalSettingsSubmit(event, config) {
  debug('handleterminalSettingsSubmit')
  event.preventDefault()
  const form = event.target
  if (!(form instanceof HTMLFormElement)) {
    console.error('handleterminalSettingsSubmit: Invalid form element')
    return
  }

  const settings = {}
  const formData = new FormData(form)

  const currentSettings = getTerminalSettings(config)

  for (const [key, value] of formData.entries()) {
    switch (key) {
      case 'fontSize':
        settings[key] = validateNumber(value, 8, 72, currentSettings.fontSize)
        break
      case 'scrollback':
        settings[key] = validateNumber(
          value,
          1,
          200000,
          currentSettings.scrollback
        )
        break
      case 'tabStopWidth':
        settings[key] = validateNumber(
          value,
          1,
          100,
          currentSettings.tabStopWidth
        )
        break
      case 'cursorBlink':
        settings[key] = value === 'true'
        break
      case 'bellStyle':
        settings[key] = validateBellStyle(value, currentSettings.bellStyle)
        break
      case 'fontFamily':
        settings[key] = value || currentSettings.fontFamily
        break
      default:
        settings[key] = value
    }
  }

  saveTerminalSettings(settings)
  applyTerminalSettings(settings)
  hideterminalSettingsDialog()
}

/**
 * Initializes the DOM and sets up event listeners
 * @param {Object} config - The configuration object
 * @returns {Promise} A promise that resolves when the DOM is ready
 */
export function initializeDom(config) {
  return new Promise((resolve) => {
    const initializeDomContent = () => {
      debug('initializeDom')
      initializeElements()
      setupEventListeners(config)
      initializeSettings(config)
      resolve()
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initializeDomContent)
    } else {
      initializeDomContent()
    }
  })
}

/**
 * Sets the terminal instance for DOM operations
 * @param {Terminal} terminalInstance - The terminal instance
 */
export function setTerminalInstance(terminalInstance) {
  term = terminalInstance
}

/**
 * Opens the terminal in the specified container
 * @param {HTMLElement} container - The container element for the terminal
 */
export function openTerminal(container) {
  if (term && container) {
    term.open(container)
    // Note: We're not calling fitAddon.fit() here as it's not a DOM operation
    debug('openTerminal')
  } else {
    console.error('openTerminal: Terminal or container not available')
  }
}

/**
 * Focuses the terminal
 */
export function focusTerminal() {
  if (term) {
    term.focus()
    debug('focusTerminal: Terminal focused')
  } else {
    console.error('openTerminal: Terminal not available')
  }
}

/**
 * Toggles the enabled state of host and port input fields
 * @param {boolean} state - Whether reauthentication is required
 */
function toggleLoginFields(state) {
  const { hostInput, portInput } = elements

  if (hostInput) hostInput.disabled = state
  if (portInput) portInput.disabled = state

  debug(
    `toggleLoginFields: ${state ? 'disabled' : 'enabled'} for ${
      state ? 're-authentication' : 'new connection'
    }`
  )
}

/**
 * Sets up private key authentication related event listeners
 */
function setupPrivateKeyEvents() {
  const privateKeyToggle = document.getElementById('privateKeyToggle');
  const privateKeyFile = document.getElementById('privateKeyFile');
  const privateKeyText = document.getElementById('privateKeyText');
  const privateKeySection = document.getElementById('privateKeySection');

  // Handle private key section toggle
  privateKeyToggle.addEventListener('click', (e) => {
    e.preventDefault();
    privateKeySection.classList.toggle('hidden');
    // Update button text based on state
    if (privateKeySection.classList.contains('hidden')) {
      privateKeyToggle.innerHTML = '<i class="fa fa-key"></i> Add SSH Key';
    } else {
      privateKeyToggle.innerHTML = '<i class="fa fa-key"></i> Hide SSH Key';
    }
  });

  // Handle file upload
  privateKeyFile.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const content = await file.text();
        if (validatePrivateKey(content)) {
          privateKeyText.value = content;
        } else {
          showErrorDialog('Invalid private key format');
        }
      } catch (error) {
        showErrorDialog('Error reading private key file');
      }
    }
  });
}
