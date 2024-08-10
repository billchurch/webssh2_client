// /client/src/js/dom.js
/**
 * @module dom
 * @description Handles DOM manipulations and UI updates for WebSSH2 client
 */

import createDebug from 'debug'
import { sanitizeHtml } from './utils.js'

const debug = createDebug('webssh2-client:dom')

let elements = {}

/**
 * Closes the error modal.
 */
export function closeErrorModal () {
  const { errorModal } = elements
  if (errorModal) {
    errorModal.style.display = 'none'
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
 * Hides the login prompt
 */
export function hideLoginPrompt () {
  const { loginModal } = elements
  if (loginModal) {
    loginModal.style.display = 'none'
  }
}

/**
 * Hides the reconnect prompt
 */
export function hideReconnectPrompt () {
  const { reconnectButton } = elements
  if (reconnectButton) {
    reconnectButton.style.display = 'none'
    reconnectButton.onclick = null // Remove the onclick handler
  }
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
    'passwordInput', 'logBtn', 'logBtnStop', 'downloadLogBtn', 'credentialsBtn',
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
      closeBtn.onclick = () => { elements.errorModal.style.display = 'none' }
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
    errorModal.style.display = 'block'
  } else {
    console.error('Error modal or error message element not found')
  }
}

/**
 * Shows the login prompt
 */
export function showLoginPrompt () {
  const { loginModal, terminalContainer, passwordInput } = elements
  debug('showLoginPrompt: Displaying login modal')
  if (loginModal) {
    loginModal.style.display = 'block'
  }
  if (terminalContainer) {
    terminalContainer.style.display = 'none'
  }
  if (passwordInput) {
    passwordInput.value = ''
  }
  focusAppropriateInput()
}

/**
 * Shows the reconnect prompt and sets up the onclick handler
 * @param {Function} reconnectCallback - The function to call when the reconnect button is clicked
 */
export function showReconnectPrompt (reconnectCallback) {
  const { reconnectButton } = elements
  debug('showReconnectPrompt: Displaying reconnect button')
  if (reconnectButton) {
    reconnectButton.style.display = 'block'
    reconnectButton.onclick = reconnectCallback
  } else {
    console.error('Reconnect button not found in the DOM')
  }
}

/**
 * Displays or hides the terminal container
 * @param {boolean} show - Whether to show or hide the terminal
 */
export function toggleTerminalDisplay (show) {
  const { terminalContainer } = elements
  if (terminalContainer) {
    terminalContainer.style.display = show ? 'block' : 'none'
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

// Export the elements object if needed elsewhere
export function getElements () {
  return elements
}

/**
 * Updates the status message
 * @param {string} message - The status message
 * @param {string} [color] - The color of the status message (optional)
 */
export function updateStatus (message, color) {
  const { status } = elements
  if (status) {
    status.innerHTML = sanitizeHtml(message)
    if (color) {
      updateStatusBackground(color)
    }
    return
  }
  console.warn('Status element not found. Cannot update status.')
}

/**
 * Updates the status background color
 * @param {string} color - The color of the status bar
 */
export function updateStatusBackground (color) {
  const { status } = elements
  if (status) {
    status.style.backgroundColor = color
    return
  }
  console.warn('Status element not found. Cannot update status.')
}

/**
 * Updates the header content
 * @param {string} content - The new header content
 * @param {string} [color] - The color of the header message (optional)
 */
export function updateHeader (content, color) {
  const { header, terminalContainer } = elements
  if (header) {
    header.innerHTML = sanitizeHtml(content)
    header.style.display = content ? 'block' : 'none'
    if (color) {
      updateHeaderBackground(color)
    }
    if (terminalContainer) {
      terminalContainer.style.height = content ? 'calc(100% - 38px)' : '100%'
    }
  }
}

/**
 * Updates the Header background color
 * @param {string} color - The color of the status bar
 */
export function updateHeaderBackground (color) {
  const { header } = elements
  if (header) {
    header.style.backgroundColor = color
    return
  }
  console.warn('Header element not found. Cannot update status.')
}

/**
 * Updates the footer content
 * @param {string} content - The new footer content
 */
export function updateFooter (content) {
  const { footer } = elements
  if (footer) {
    footer.innerHTML = sanitizeHtml(content)
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
 * Updates the log button state
 * @param {boolean} isLogging - Whether logging is currently active
 */
export function updateLogButtonState (isLogging) {
  const { logBtn, logBtnStop, downloadLogBtn } = elements

  if (logBtn && logBtnStop) {
    if (isLogging) {
      logBtn.classList.remove('visible')
      logBtnStop.classList.add('visible')
    } else {
      logBtn.classList.add('visible')
      logBtnStop.classList.remove('visible')
    }
  }

  if (downloadLogBtn) {
    if (isLogging) {
      downloadLogBtn.classList.add('visible')
    }
  }
}

/**
 * Updates the visibility of the credentialsBtn button
 * @param {boolean} visible - Whether the button should be visible
 */
function updateCredentialsBtnVisibility (visible) {
  const { credentialsBtn } = elements
  debug(`credentialsBtn visibility: ${visible}`)
  if (credentialsBtn) {
    credentialsBtn.style.display = visible ? 'block' : 'none'
  }
}

/**
 * Updates the visibility of the reauthentication button
 * @param {boolean} visible - Whether the button should be visible
 */
function updateReauthBtnVisibility (visible) {
  const { reauthBtn } = elements
  debug(`reauthBtn visibility set to: ${visible}`)
  if (reauthBtn) {
    reauthBtn.style.display = visible ? 'block' : 'none'
  }
}
