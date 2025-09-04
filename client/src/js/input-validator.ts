/**
 * Input validation and sanitization functions
 * Prevents XSS and other injection attacks from user input
 */

import createDebug from 'debug'

const debug = createDebug('webssh2-client:validator')

/**
 * Maximum allowed lengths for various input fields
 */
export const MAX_LENGTHS = {
  host: 253, // Max DNS hostname length
  port: 5, // Max port number is 65535
  username: 32, // Typical Unix username limit
  password: 256, // Reasonable password length
  header: 200, // Header text length
  headerbackground: 50, // Color value length
  sshterm: 50, // Terminal type length
  logLevel: 20, // Log level string length
  privateKey: 16384, // Max SSH key size (16KB)
  passphrase: 256 // Key passphrase length
} as const

/**
 * Validates and sanitizes a hostname
 */
export function validateHost(host: unknown): string | null {
  if (!host || typeof host !== 'string') return null

  let value = host
  // Remove any protocol prefixes
  value = value.replace(/^https?:\/\//, '')
  // Remove any path components
  value = value.split('/')[0]
  // Remove port if present
  value = value.split(':')[0]

  if (value.length > MAX_LENGTHS.host) return null

  const hostnameRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/
  const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|::1|::)$/

  if (hostnameRegex.test(value) || ipv4Regex.test(value) || ipv6Regex.test(value)) {
    return value.toLowerCase()
  }

  debug('Invalid hostname:', value)
  return null
}

/** Validates a port number */
export function validatePort(port: unknown): number | null {
  const portNum = typeof port === 'number' ? port : parseInt(String(port), 10)
  if (Number.isNaN(portNum) || portNum < 1 || portNum > 65535) {
    debug('Invalid port:', port)
    return null
  }
  return portNum
}

/** Validates and sanitizes a username */
export function validateUsername(username: unknown): string | null {
  if (!username || typeof username !== 'string') return null
  let value = username.trim()
  if (value.length === 0 || value.length > MAX_LENGTHS.username) {
    debug('Invalid username length:', value.length)
    return null
  }
  const usernameRegex = /^[a-zA-Z0-9._-]+$/
  if (!usernameRegex.test(value)) {
    debug('Invalid username characters:', value)
    return null
  }
  return value
}

/** Validates a password (basic length check only) */
export function validatePassword(password: unknown): string | null {
  if (typeof password !== 'string') return null
  if (password.length > MAX_LENGTHS.password) {
    debug('Password too long:', password.length)
    return null
  }
  return password
}

/** Validates and sanitizes text content (for headers, footers, etc.) */
export function validateText(text: unknown, maxLength: number = MAX_LENGTHS.header): string {
  if (!text || typeof text !== 'string') return ''
  let value = text
  if (value.length > maxLength) {
    debug('Text truncated from', value.length, 'to', maxLength)
    value = value.substring(0, maxLength)
  }
  return value.replace(/\0/g, '')
}

/** Validates a color value */
export function validateColor(color: unknown): string | null {
  if (!color || typeof color !== 'string') return null
  let value = color.trim()
  if (value.length > MAX_LENGTHS.headerbackground) return null
  const hexRegex = /^#([0-9a-fA-F]{3}){1,2}$/
  const rgbRegex = /^rgba?\(\s*(\d{1,3}\s*,\s*){2,3}\s*\d{1,3}\s*\)$/
  const namedColorRegex = /^[a-zA-Z]+$/
  if (hexRegex.test(value) || rgbRegex.test(value) || namedColorRegex.test(value)) {
    return value
  }
  debug('Invalid color:', value)
  return null
}

/** Validates terminal type */
export function validateTerminalType(term: unknown): string | null {
  if (!term || typeof term !== 'string') return null
  const value = term.trim()
  if (value.length === 0 || value.length > MAX_LENGTHS.sshterm) return null
  const validTermTypes = [
    'xterm',
    'xterm-256color',
    'xterm-color',
    'xterm-16color',
    'vt100',
    'vt102',
    'vt220',
    'ansi',
    'linux',
    'screen',
    'screen-256color',
    'rxvt',
    'rxvt-unicode',
    'tmux',
    'tmux-256color'
  ]
  if (validTermTypes.includes(value.toLowerCase())) return value.toLowerCase()
  const termRegex = /^[a-zA-Z0-9-]+$/
  if (termRegex.test(value)) return value
  debug('Invalid terminal type:', value)
  return null
}

/** Validates log level */
export function validateLogLevel(level: unknown): string | null {
  if (!level || typeof level !== 'string') return null
  const value = level.trim().toLowerCase()
  const validLevels = ['error', 'warn', 'info', 'debug', 'trace', 'silent']
  if (validLevels.includes(value)) return value
  debug('Invalid log level:', value)
  return null
}

/** Validates all URL parameters and returns sanitized values */
export function validateUrlParameters(params: URLSearchParams) {
  const validated = {
    host: null as string | null,
    port: 22,
    username: null as string | null,
    password: null as string | null,
    header: { text: '', background: null as string | null },
    sshterm: null as string | null,
    logLevel: null as string | null
  }
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

/** Validates form data before submission */
export function validateFormData(formData: unknown) {
  if (!formData || typeof formData !== 'object') return null
  const fd = formData as Record<string, unknown>
  const validated: Record<string, unknown> = {}

  if (!fd.host || !validateHost(fd.host)) {
    debug('Invalid or missing host')
    return null
  }
  validated.host = validateHost(fd.host)

  if (!fd.username || !validateUsername(fd.username)) {
    debug('Invalid or missing username')
    return null
  }
  validated.username = validateUsername(fd.username)

  if (fd.port !== undefined) {
    const port = validatePort(fd.port)
    if (!port) {
      debug('Invalid port')
      return null
    }
    validated.port = port
  } else {
    validated.port = 22
  }

  if (fd.password) validated.password = validatePassword(fd.password)
  if (fd.privateKey) {
    const pk = String(fd.privateKey)
    if (pk.length > MAX_LENGTHS.privateKey) {
      debug('Private key too large')
      return null
    }
    validated.privateKey = pk
  }
  if (fd.passphrase) {
    const pp = String(fd.passphrase)
    if (pp.length > MAX_LENGTHS.passphrase) {
      debug('Passphrase too long')
      return null
    }
    validated.passphrase = pp
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

