// /client/src/js/dom.js
/**
 * @module dom
 * @description Handles DOM manipulations and UI updates for WebSSH2 client
 */

import createDebug from 'debug'
import { sanitizeColor, sanitizeHtml } from './utils.js'

const debug = createDebug('webssh2-client:dom')

let elements = {}

/**
 * Closes the error modal.
 */
export function hideErrorModal () {
  const { errorModal } = elements
  if (errorModal) {
    toggleVisibility(errorModal, false)
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
export function fillLoginForm (sshConfig) {
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
export function hideLoginModal () {
  hideModal(elements.loginModal)
}

/**
 * Hides the reconnect button
 */
export function hideReconnectBtn () {
  hideButton(elements.reconnectButton, true)
}

/**
 * Initializes DOM elements and stores references to them
 * @throws Will throw an error if a critical element is not found
 * @returns {Object} An object containing references to DOM elements
 */
export function initializeElements () {
  const elementIds = [
    'status', 'header', 'dropupContent', 'footer', 'terminalContainer',
    'loginModal', 'loginForm', 'hostInput', 'portInput', 'usernameInput',
    'passwordInput', 'logBtn', 'stopLogBtn', 'downloadLogBtn', 'credentialsBtn',
    'reauthBtn', 'errorModal', 'errorMessage', 'reconnectButton'
  ]

  // Define critical elements that must be present
  const criticalElements = [
    'terminalContainer', 'loginForm', 'errorModal'
  ]

  elements = {}

  elementIds.forEach(id => {
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
    ['sshTerm', 'readyTimeout', 'cursorBlink', 'scrollback', 'tabStopWidth', 'bellStyle',
      'fontSize', 'fontFamily', 'letterSpacing', 'lineHeight', 'logLevel'].forEach(field => {
      const input = document.createElement('input')
      input.type = 'hidden'
      input.name = field
      input.id = field + 'Input'
      elements.loginForm.appendChild(input)
      elements[field + 'Input'] = input
    })
  }

  if (elements.errorModal) {
    const closeBtn = elements.errorModal.querySelector('.close')
    if (closeBtn) {
      closeBtn.onclick = () => { hideErrorModal() }
    }
  }

  return elements
}

/**
 * Shows an error modal
 * @param {string} message - The error message to display
 */
export function showErrorModal (message) {
  const { errorMessage, errorModal } = elements

  if (errorMessage && errorModal) {
    debug(`Error modal shown with message: ${message}`)
    errorMessage.textContent = message
    toggleVisibility(errorModal, true)
    updateElement('status', 'ERROR', 'red')
  } else {
    console.error('Error modal or error message element not found')
  }
}

/**
 * Shows the login modal
 */
export function showLoginModal () {
  const { loginModal, terminalContainer, passwordInput } = elements
  showModal(loginModal)
  toggleVisibility(terminalContainer, true)
  if (passwordInput) passwordInput.value = ''
  focusAppropriateInput()
}

/**
 * Shows the reconnect button and sets up the onclick handler
 * @param {Function} reconnectCallback - The function to call when the reconnect button is clicked
 */
export function showReconnectBtn (reconnectCallback) {
  const { reconnectButton } = elements
  showButton(reconnectButton, reconnectCallback)
  reconnectButton.focus()
}

/**
 * Displays or hides the terminal container
 * @param {boolean} visible - Whether to show or hide the terminal
 */
export function toggleTerminalDisplay (visible) {
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
export function triggerDownload (blob, filename) {
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
export function getElements () {
  return elements
}

/**
 * Updates the content and/or background color of a given element.
 * @param {string} elementName - The name of the element (e.g., 'status', 'header', 'footer').
 * @param {string|object} content - The new content for the element. Can be a string or an object with 'text' and 'background' properties.
 * @param {string} [color] - The optional background color for the element (if content is a string). Deprecated in favor of passing an object as content.
 */
export function updateElement (elementName, content, color) {
  const element = elements[elementName]
  if (!element || !content) {
    console.warn(`${elementName} element not found or content missing.`)
    return
  }

  const { text = '', background } = typeof content === 'object' ? content : { text: content, background: color }
  const sanitizedContent = sanitizeHtml(text)
  const sanitizedColor = background ? sanitizeColor(background) : null

  debug(`Updating ${elementName} element with sanitized content: ${sanitizedContent} and color: ${sanitizedColor || 'undefined'}`)

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
export function updateLogBtnState (isLogging) {
  const { logBtn, stopLogBtn, downloadLogBtn } = elements

  if (logBtn && stopLogBtn) {
    if (isLogging) {
      toggleVisibility(logBtn, false)
      toggleVisibility(stopLogBtn, true)
    } else {
      toggleVisibility(logBtn, true)
      toggleVisibility(stopLogBtn, false)
    }
  }

  if (downloadLogBtn) {
    if (isLogging) {
      toggleVisibility(downloadLogBtn, true)
    }
  }
}

/**
 * Updates the visibility of UI elements based on server permissions
 * @param {Object} permissions - Object containing permission flags
 */
export function updateUIVisibility (permissions) {
  debug(`Updating UI visibility: ${JSON.stringify(permissions)}`)

  const permissionHandlers = {
    allowReplay: updateCredentialsBtnVisibility,
    allowReauth: updateReauthBtnVisibility
  }

  Object.keys(permissions).forEach((key) => {
    if (permissionHandlers[key] && permissions[key] !== undefined) {
      permissionHandlers[key](permissions[key])
    }
  })

  if (permissions.error) {
    showErrorModal(permissions.error)
  }
}

/**
/**
 * Focuses on the appropriate input field in the login form
 */
function focusAppropriateInput () {
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
 * Updates the visibility of the credentialsBtn button
 * @param {boolean} visible - Whether the button should be visible
 */
function updateCredentialsBtnVisibility (visible) {
  const { credentialsBtn } = elements
  if (visible) {
    toggleVisibility(credentialsBtn, true)
    return
  }
  toggleVisibility(credentialsBtn, false)
}

/**
 * Updates the visibility of the reauthentication button
 * @param {boolean} visible - Whether the button should be visible
 */
function updateReauthBtnVisibility (visible) {
  const { reauthBtn } = elements
  if (visible) {
    toggleVisibility(reauthBtn, true)
    return
  }
  toggleVisibility(reauthBtn, false)
}

/**
 * Toggles the visibility of an element.
 *
 * @param {HTMLElement} element - The DOM element to toggle.
 * @param {boolean} isVisible - If true, show the element; if false, hide it.
 */
function toggleVisibility (element, isVisible) {
  if (!element) return
  debug(`${element.id} visibility set to: ${isVisible}`)

  if (isVisible) {
    element.classList.add('visible')
  } else {
    element.classList.remove('visible')
  }
}

/**
 * Hides a modal by its element reference.
 *
 * @param {HTMLElement} modal - The modal element to hide.
 */
export function hideModal (modal) {
  toggleVisibility(modal, false)
}

/**
 * Shows a modal by its element reference.
 *
 * @param {HTMLElement} modal - The modal element to show.
 */
export function showModal (modal) {
  toggleVisibility(modal, true)
}

/**
 * Hides a button and optionally removes its click handler.
 *
 * @param {HTMLElement} button - The button element to hide.
 * @param {boolean} [removeOnClick=false] - Whether to remove the onclick handler.
 */
export function hideButton (button, removeOnClick = false) {
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
export function showButton (button, onClick = null) {
  toggleVisibility(button, true)

  if (onClick && button) {
    button.onclick = onClick
  }
}
