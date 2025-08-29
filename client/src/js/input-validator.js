/**
 * Input validation and sanitization functions
 * Prevents XSS and other injection attacks from user input
 */

import createDebug from 'debug'

const debug = createDebug('webssh2-client:validator')

/**
 * Maximum allowed lengths for various input fields
 */
const MAX_LENGTHS = {
  host: 253,           // Max DNS hostname length
  port: 5,             // Max port number is 65535
  username: 32,        // Typical Unix username limit
  password: 256,       // Reasonable password length
  header: 200,         // Header text length
  headerbackground: 50, // Color value length
  sshterm: 50,         // Terminal type length
  logLevel: 20,        // Log level string length
  privateKey: 16384,   // Max SSH key size (16KB)
  passphrase: 256      // Key passphrase length
}

/**
 * Validates and sanitizes a hostname
 * @param {string} host - The hostname to validate
 * @returns {string|null} Sanitized hostname or null if invalid
 */
export function validateHost(host) {
  if (!host || typeof host !== 'string') return null
  
  // Remove any protocol prefixes
  host = host.replace(/^https?:\/\//, '')
  
  // Remove any path components
  host = host.split('/')[0]
  
  // Remove port if present
  host = host.split(':')[0]
  
  // Validate length
  if (host.length > MAX_LENGTHS.host) return null
  
  // Validate hostname format (RFC 1123)
  const hostnameRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
  
  // Also allow IP addresses
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/
  const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|::1|::)$/
  
  if (hostnameRegex.test(host) || ipv4Regex.test(host) || ipv6Regex.test(host)) {
    return host.toLowerCase()
  }
  
  debug('Invalid hostname:', host)
  return null
}

/**
 * Validates a port number
 * @param {string|number} port - The port to validate
 * @returns {number|null} Valid port number or null if invalid
 */
export function validatePort(port) {
  const portNum = parseInt(port, 10)
  
  if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
    debug('Invalid port:', port)
    return null
  }
  
  return portNum
}

/**
 * Validates and sanitizes a username
 * @param {string} username - The username to validate
 * @returns {string|null} Sanitized username or null if invalid
 */
export function validateUsername(username) {
  if (!username || typeof username !== 'string') return null
  
  // Remove any potentially dangerous characters
  username = username.trim()
  
  // Validate length
  if (username.length === 0 || username.length > MAX_LENGTHS.username) {
    debug('Invalid username length:', username.length)
    return null
  }
  
  // Allow alphanumeric, underscore, hyphen, and dot
  const usernameRegex = /^[a-zA-Z0-9._-]+$/
  
  if (!usernameRegex.test(username)) {
    debug('Invalid username characters:', username)
    return null
  }
  
  return username
}

/**
 * Validates a password (basic length check only)
 * @param {string} password - The password to validate
 * @returns {string|null} Password or null if invalid
 */
export function validatePassword(password) {
  if (typeof password !== 'string') return null
  
  if (password.length > MAX_LENGTHS.password) {
    debug('Password too long:', password.length)
    return null
  }
  
  return password
}

/**
 * Validates and sanitizes text content (for headers, footers, etc.)
 * @param {string} text - The text to validate
 * @param {number} maxLength - Maximum allowed length
 * @returns {string} Sanitized text (empty string if invalid)
 */
export function validateText(text, maxLength = MAX_LENGTHS.header) {
  if (!text || typeof text !== 'string') return ''
  
  // Truncate if too long
  if (text.length > maxLength) {
    debug('Text truncated from', text.length, 'to', maxLength)
    text = text.substring(0, maxLength)
  }
  
  // No HTML sanitization needed here as we're using textContent
  // But we can remove any null bytes or other problematic characters
  text = text.replace(/\0/g, '')
  
  return text
}

/**
 * Validates a color value
 * @param {string} color - The color to validate
 * @returns {string|null} Valid color or null if invalid
 */
export function validateColor(color) {
  if (!color || typeof color !== 'string') return null
  
  // Remove any whitespace
  color = color.trim()
  
  // Validate length
  if (color.length > MAX_LENGTHS.headerbackground) return null
  
  // Allow hex colors, rgb/rgba, and named colors
  const hexRegex = /^#([0-9a-fA-F]{3}){1,2}$/
  const rgbRegex = /^rgba?\(\s*(\d{1,3}\s*,\s*){2,3}\s*\d{1,3}\s*\)$/
  const namedColorRegex = /^[a-zA-Z]+$/
  
  if (hexRegex.test(color) || rgbRegex.test(color) || namedColorRegex.test(color)) {
    return color
  }
  
  debug('Invalid color:', color)
  return null
}

/**
 * Validates terminal type
 * @param {string} term - The terminal type to validate
 * @returns {string|null} Valid terminal type or null if invalid
 */
export function validateTerminalType(term) {
  if (!term || typeof term !== 'string') return null
  
  term = term.trim()
  
  // Validate length
  if (term.length === 0 || term.length > MAX_LENGTHS.sshterm) return null
  
  // Allow common terminal types
  const validTermTypes = [
    'xterm', 'xterm-256color', 'xterm-color', 'xterm-16color',
    'vt100', 'vt102', 'vt220', 'ansi', 'linux', 'screen',
    'screen-256color', 'rxvt', 'rxvt-unicode', 'tmux',
    'tmux-256color'
  ]
  
  if (validTermTypes.includes(term.toLowerCase())) {
    return term.toLowerCase()
  }
  
  // Allow custom terminal types with restricted characters
  const termRegex = /^[a-zA-Z0-9-]+$/
  if (termRegex.test(term)) {
    return term
  }
  
  debug('Invalid terminal type:', term)
  return null
}

/**
 * Validates log level
 * @param {string} level - The log level to validate
 * @returns {string|null} Valid log level or null if invalid
 */
export function validateLogLevel(level) {
  if (!level || typeof level !== 'string') return null
  
  level = level.trim().toLowerCase()
  
  const validLevels = ['error', 'warn', 'info', 'debug', 'trace', 'silent']
  
  if (validLevels.includes(level)) {
    return level
  }
  
  debug('Invalid log level:', level)
  return null
}

/**
 * Validates all URL parameters and returns sanitized values
 * @param {URLSearchParams} params - The URL parameters to validate
 * @returns {Object} Object containing validated parameters
 */
export function validateUrlParameters(params) {
  const validated = {
    host: null,
    port: 22,  // Default port
    username: null,
    password: null,
    header: { text: '', background: null },
    sshterm: null,
    logLevel: null
  }
  
  // Validate each parameter
  const host = params.get('host')
  if (host) validated.host = validateHost(host)
  
  const port = params.get('port')
  if (port) {
    const validPort = validatePort(port)
    if (validPort) validated.port = validPort
  }
  
  const username = params.get('username')
  if (username) validated.username = validateUsername(username)
  
  const password = params.get('password')
  if (password) validated.password = validatePassword(password)
  
  const header = params.get('header')
  if (header) validated.header.text = validateText(header)
  
  const headerBg = params.get('headerbackground')
  if (headerBg) validated.header.background = validateColor(headerBg)
  
  const term = params.get('sshterm')
  if (term) validated.sshterm = validateTerminalType(term)
  
  const logLevel = params.get('logLevel')
  if (logLevel) validated.logLevel = validateLogLevel(logLevel)
  
  debug('Validated URL parameters:', validated)
  return validated
}

/**
 * Validates form data before submission
 * @param {Object} formData - The form data to validate
 * @returns {Object|null} Validated form data or null if invalid
 */
export function validateFormData(formData) {
  if (!formData || typeof formData !== 'object') return null
  
  const validated = {}
  
  // Validate required fields
  if (!formData.host || !validateHost(formData.host)) {
    debug('Invalid or missing host')
    return null
  }
  validated.host = validateHost(formData.host)
  
  if (!formData.username || !validateUsername(formData.username)) {
    debug('Invalid or missing username')
    return null
  }
  validated.username = validateUsername(formData.username)
  
  // Validate optional fields
  if (formData.port) {
    const port = validatePort(formData.port)
    if (!port) {
      debug('Invalid port')
      return null
    }
    validated.port = port
  } else {
    validated.port = 22
  }
  
  if (formData.password) {
    validated.password = validatePassword(formData.password)
  }
  
  if (formData.privateKey) {
    // Basic length check for private key
    if (formData.privateKey.length > MAX_LENGTHS.privateKey) {
      debug('Private key too large')
      return null
    }
    validated.privateKey = formData.privateKey
  }
  
  if (formData.passphrase) {
    if (formData.passphrase.length > MAX_LENGTHS.passphrase) {
      debug('Passphrase too long')
      return null
    }
    validated.passphrase = formData.passphrase
  }
  
  return validated
}

export default {
  validateHost,
  validatePort,
  validateUsername,
  validatePassword,
  validateText,
  validateColor,
  validateTerminalType,
  validateLogLevel,
  validateUrlParameters,
  validateFormData,
  MAX_LENGTHS
}