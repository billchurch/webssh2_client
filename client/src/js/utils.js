// client
// client/src/js/utils.js
import createDebug from 'debug'
import maskObject from 'jsmasker/src/index.js'
import { 
  validateHost, 
  validatePort, 
  validateUsername, 
  validatePassword,
  validateText,
  validateColor,
  validateTerminalType,
  validateLogLevel 
} from './input-validator.js'

const debug = createDebug('webssh2-client:utils')

export const defaultSettings = {
  cursorBlink: true,
  scrollback: 10000,
  tabStopWidth: 8,
  bellStyle: 'sound',
  fontSize: 14,
  fontFamily: 'courier-new, courier, monospace',
  letterSpacing: 0,
  lineHeight: 1,
  logLevel: 'info'
}

/**
 * Validates a numeric value within a specified range
 * @param {number|string} value - The value to validate
 * @param {number} min - The minimum allowed value
 * @param {number} max - The maximum allowed value
 * @param {number} defaultValue - The default value if validation fails
 * @returns {number} The validated number or the default value
 */
export function validateNumber(value, min, max, defaultValue) {
  const num = Number(value)
  if (isNaN(num) || num < min || num > max) {
    return defaultValue
  }
  return num
}

/**
 * Recursively merges two objects.
 * @param {Object} target - The target object.
 * @param {Object} source - The source object.
 * @returns {Object} The merged object.
 */
export function mergeDeep(target, source) {
  const output = Object.assign({}, target)
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach((key) => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          Object.assign(output, { [key]: source[key] })
        } else {
          output[key] = mergeDeep(target[key], source[key])
        }
      } else {
        Object.assign(output, { [key]: source[key] })
      }
    })
  }
  return output
}

/**
 * Checks if the value is an object.
 * @param {*} item - The value to check.
 * @returns {boolean} True if the value is an object, false otherwise.
 */
export function isObject(item) {
  return item && typeof item === 'object' && !Array.isArray(item)
}

/**
 * Formats a date object into a string.
 * @param {Date} date - The date to format.
 * @returns {string} The formatted date string.
 */
export function formatDate(date) {
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')} @ ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`
}

/**
 * Validates the bell style option
 * @param {string} value - The bell style to validate
 * @returns {string} The validated bell style or the default 'sound'
 */
export function validateBellStyle(value) {
  return ['sound', 'none'].includes(value) ? value : 'sound'
}

/**
 * Initializes the global configuration.
 * This should be called once at application startup.
 * @returns {Object} The initialized configuration object
 */
export function initializeConfig() {
  const defaultConfig = {
    socket: {
      url: null,
      path: '/ssh/socket.io'
    },
    ssh: {
      host: null,
      port: 22,
      username: null,
      password: null,
      sshterm: 'xterm-color'
    },
    terminal: { ...defaultSettings },
    header: {
      text: null,
      background: 'green'
    },
    autoConnect: false,
    logLevel: 'info'
  }
  const userConfig = window.webssh2Config || {}
  const config = mergeDeep(defaultConfig, userConfig)
  debug('initializeConfig', config)
  return config
}

export function populateFormFromUrl(config) {
  const searchParams = getUrlParams()
  const params = {
    ssh: {},
    header: {},
    terminal: {}
  }

  // List of parameters to extract from the URL or form
  const parameterList = [
    'host',
    'port',
    'header',
    'headerbackground',
    'sshterm',
    'username',
    'password',
    'logLevel'
  ]

  parameterList.forEach((param) => {
    let value = searchParams.get(param)

    if (param === 'port' && (value === null || value === '')) {
      value = '22' // Set default port value if not defined
    }

    if (value !== null) {
      // Validate and sanitize input based on parameter type
      let validatedValue = null
      
      switch(param) {
        case 'host':
          validatedValue = validateHost(value)
          break
        case 'port':
          validatedValue = validatePort(value)
          break
        case 'username':
          validatedValue = validateUsername(value)
          break
        case 'password':
          validatedValue = validatePassword(value)
          break
        case 'header':
          validatedValue = validateText(value)
          if (validatedValue !== null) {
            params.header.text = validatedValue
          }
          break
        case 'headerbackground':
          validatedValue = validateColor(value)
          if (validatedValue !== null) {
            params.header.background = validatedValue
          }
          break
        case 'sshterm':
          validatedValue = validateTerminalType(value)
          break
        case 'logLevel':
          validatedValue = validateLogLevel(value)
          break
        default:
          validatedValue = value // For any other parameters
      }

      // Only set validated values in form fields
      if (validatedValue !== null && param !== 'header' && param !== 'headerbackground') {
        const input = document.getElementById(param + 'Input')
        if (input) {
          input.value = validatedValue
        }
      }
    }
  })
  // Merge the params object into the config
  if (config && typeof config === 'object') {
    const result = mergeDeep(config, params)
    debug('populateFormFromUrl', result)
    return result
  } else {
    throw new Error('Invalid configuration object provided.')
  }
}

/**
 * Retrieves the URL parameters from the current window location.
 * @returns {URLSearchParams} The URL parameters.
 */
function getUrlParams() {
  return new URLSearchParams(window.location.search)
}

/**
 * Retrieves the SSH credentials from various sources.
 * @param {Object} formData - Optional form data from manual input
 * @param {Object} terminalDimensions - Optional terminal dimensions
 * @returns {Object} An object containing the SSH credentials.
 */
export function getCredentials(formData = null, terminalDimensions = {}) {
  const config = window.webssh2Config || {}
  const urlParams = getUrlParams()

  // Get port value from various sources
  let portValue = formData?.port ||
    urlParams.get('port') ||
    config.ssh?.port ||
    document.getElementById('portInput')?.value ||
    '22'
  
  // Ensure port is a valid integer
  let port = parseInt(portValue, 10)
  if (isNaN(port) || port < 1 || port > 65535) {
    console.warn(`Invalid port value: ${portValue}, defaulting to 22`)
    port = 22
  }

  const mergedConfig = {
    host:
      formData?.host ||
      urlParams.get('host') ||
      config.ssh?.host ||
      document.getElementById('hostInput')?.value ||
      '',
    port: port,
    username:
      formData?.username ||
      document.getElementById('usernameInput')?.value ||
      urlParams.get('username') ||
      config.ssh?.username ||
      '',
    password:
      formData?.password ||
      document.getElementById('passwordInput')?.value ||
      urlParams.get('password') ||
      config.ssh?.password ||
      '',
    term:
      formData?.term ||
      urlParams.get('sshterm') ||
      config.ssh?.sshterm ||
      'xterm-color',
  }

  // Add private key if present in any source
  const privateKey = formData?.privateKey ||
    document.getElementById('privateKeyText')?.value ||
    urlParams.get('privateKey') ||
    config.ssh?.privateKey ||
    '';
  
  if (privateKey) {
    mergedConfig.privateKey = privateKey;
    
    // Only include passphrase if privateKey is present
    const passphrase = formData?.passphrase ||
      document.getElementById('passphraseInput')?.value ||
      urlParams.get('passphrase') ||
      config.ssh?.passphrase ||
      '';
      
    if (passphrase) {
      mergedConfig.passphrase = passphrase;
    }
  }

  // Add terminal dimensions if provided
  if (terminalDimensions.cols) {
    mergedConfig.cols = terminalDimensions.cols;
  }
  if (terminalDimensions.rows) {
    mergedConfig.rows = terminalDimensions.rows;
  }

  const maskedContent = maskObject(mergedConfig)
  debug('getCredentials: mergedConfig:', maskedContent)

  return mergedConfig
}

/**
 * Validates and sanitizes a color string.
 * @param {string} color - The color string to validate.
 * @returns {string|null} - The sanitized color string or null if invalid.
 */
export function sanitizeColor(color) {
  const colorRegex =
    /^(#([0-9a-fA-F]{3}){1,2}|rgba?\(\s*(\d{1,3}\s*,\s*){2,3}\s*\d{1,3}\s*\)|[a-zA-Z]+)$/
  return colorRegex.test(color) ? color : null
}

/**
 * Clears the 'basicauth' cookie
 */
export function clearBasicAuthCookie() {
  document.cookie = 'basicauth=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
}

/**
 * Checks if the 'basicauth' cookie is present and returns its parsed value
 * @returns {Object|null} The parsed cookie value or null if not present
 */
export function getBasicAuthCookie() {
  const cookies = document.cookie.split(';')
  for (let i = 0; i < cookies.length; i++) {
    const cookie = cookies[i].trim()
    if (cookie.startsWith('basicauth=')) {
      try {
        return JSON.parse(
          decodeURIComponent(cookie.substring('basicauth='.length))
        )
      } catch (e) {
        console.error(
          'getBasicAuthCookie: Failed to parse basicauth cookie:',
          e
        )
        return null
      }
    }
  }
  return null
}

/**
 * Validates the format of an RSA private key, supporting both standard and encrypted keys
 * @param {string} key - The private key string to validate
 * @returns {boolean} - Whether the key appears to be valid
 */
export function validatePrivateKey(key) {
  // Pattern for standard RSA private key
  const standardKeyPattern = /^-----BEGIN (?:RSA )?PRIVATE KEY-----\r?\n([A-Za-z0-9+/=\r\n]+)\r?\n-----END (?:RSA )?PRIVATE KEY-----\r?\n?$/;

  // Pattern for encrypted RSA private key
  const encryptedKeyPattern = /^-----BEGIN RSA PRIVATE KEY-----\r?\n(?:Proc-Type: 4,ENCRYPTED\r?\nDEK-Info: ([^\r\n]+)\r?\n\r?\n)([A-Za-z0-9+/=\r\n]+)\r?\n-----END RSA PRIVATE KEY-----\r?\n?$/;

  // Test for either standard or encrypted key format
  return standardKeyPattern.test(key) || encryptedKeyPattern.test(key);
}
