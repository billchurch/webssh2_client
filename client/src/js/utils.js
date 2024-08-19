// client
// client/src/js/utils.js
import createDebug from 'debug'
import { defaultSettings } from './terminal.js';

const debug = createDebug('webssh2-client:utils')

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
      sshTerm: 'xterm-color',
      readyTimeout: 20000
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
    'headerBackground',
    'sshTerm',
    'readyTimeout',
    'cursorBlink',
    'scrollback',
    'tabStopWidth',
    'bellStyle',
    'fontSize',
    'fontFamily',
    'letterSpacing',
    'lineHeight',
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
      // Handle special cases where parameters map to nested fields
      if (param === 'header') {
        params.header.text = value
      } else if (param === 'headerBackground') {
        params.header.background = value
      } else if (
        [
          'cursorBlink',
          'scrollback',
          'tabStopWidth',
          'bellStyle',
          'fontSize',
          'fontFamily',
          'letterSpacing',
          'lineHeight'
        ].includes(param)
      ) {
        // These parameters relate to terminal settings
        params.terminal[param] = value
      } else {
        // For all other SSH-related parameters
        params.ssh[param] = value
      }

      // Fill form fields if they exist
      const input = document.getElementById(param + 'Input')
      if (input) {
        input.value = value
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
 * @returns {Object} An object containing the SSH credentials.
 */
export function getCredentials(formData = null, terminalDimensions = {}) {
  const config = window.webssh2Config || {}
  const urlParams = getUrlParams()

  const mergedConfig = {
    host:
      formData?.host ||
      urlParams.get('host') ||
      config.ssh?.host ||
      document.getElementById('hostInput')?.value ||
      '',
    port: parseInt(
      formData?.port ||
        urlParams.get('port') ||
        config.ssh?.port ||
        document.getElementById('portInput')?.value ||
        '22',
      10
    ),
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
      urlParams.get('sshTerm') ||
      config.ssh?.sshTerm ||
      'xterm-color',
    readyTimeout: validateNumber(
      formData?.readyTimeout ||
        config.ssh?.readyTimeout ||
        urlParams.get('readyTimeout'),
      1,
      300000,
      20000
    ),
    cursorBlink:
      formData?.cursorBlink ||
      urlParams.get('cursorBlink') ||
      config.terminal?.cursorBlink ||
      true,
    cols: terminalDimensions.cols,
    rows: terminalDimensions.rows
  }

  debug('getCredentials mergedConfig:', mergedConfig)

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
 * Sanitizes a string for use in HTML
 * @param {string} str - The string to sanitize
 * @returns {string} The sanitized string
 */
export function sanitizeHtml(str) {
  const temp = document.createElement('div')
  temp.textContent = str
  return temp.innerHTML
}

/**
 * Recursively sanitizes an object by replacing the value of any `password`
 * property with asterisks (*) matching the length of the original password.
 *
 * @param {Object} obj - The object to sanitize.
 * @returns {Object} - The sanitized object.
 */
export function sanitizeObject(obj) {
  // Check if the input is an object or array
  if (obj && typeof obj === 'object') {
    // Iterate over each key in the object
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        // eslint-disable-line no-prototype-builtins
        if (key === 'password' && typeof obj[key] === 'string') {
          // Replace password value with asterisks
          obj[key] = '*'.repeat(obj[key].length)
        } else if (typeof obj[key] === 'object') {
          // Recursively sanitize nested objects
          sanitizeObject(obj[key])
        }
      }
    }
  }
  return obj
}
