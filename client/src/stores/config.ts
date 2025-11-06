// client/src/js/stores/config.ts
import { createSignal, createMemo, createRoot } from 'solid-js'
import createDebug from 'debug'
import { mergeDeep } from '../utils/index.js'
import { DEFAULT_AUTH_METHODS } from '../constants.js'
import type { SSHAuthMethod, WebSSH2Config } from '../types/config.d'
import type { ClientAuthenticatePayload } from '../types/events.d'

const debug = createDebug('webssh2-client:config-store')

// Default configuration
const defaultConfig: WebSSH2Config = {
  socket: {
    url: null,
    path: '/ssh/socket.io'
  },
  ssh: {
    host: null,
    port: 22,
    username: null,
    password: null,
    privateKey: '',
    passphrase: '',
    sshterm: 'xterm-color'
  },
  terminal: {
    cursorBlink: true,
    scrollback: 10000,
    tabStopWidth: 8,
    bellStyle: 'sound',
    fontSize: 14,
    fontFamily: 'courier-new, courier, monospace',
    letterSpacing: 0,
    lineHeight: 1,
    logLevel: 'info',
    clipboardAutoSelectToCopy: true,
    clipboardEnableMiddleClickPaste: true,
    clipboardEnableKeyboardShortcuts: true
  },
  header: {
    text: null,
    background: '#000'
  },
  allowedAuthMethods: [...DEFAULT_AUTH_METHODS],
  autoConnect: false,
  logLevel: 'info'
}

// Reactive config store
export const [config, setConfig] = createSignal<WebSSH2Config>(defaultConfig)
const knownAuthMethodSet = new Set(DEFAULT_AUTH_METHODS)

export const coerceAuthMethods = (methods: unknown): SSHAuthMethod[] => {
  if (!Array.isArray(methods)) {
    return [...DEFAULT_AUTH_METHODS]
  }

  const normalized: SSHAuthMethod[] = []
  for (const value of methods) {
    if (
      typeof value === 'string' &&
      knownAuthMethodSet.has(value as SSHAuthMethod) &&
      !normalized.includes(value as SSHAuthMethod)
    ) {
      normalized.push(value as SSHAuthMethod)
    }
  }

  return normalized.length > 0 ? normalized : [...DEFAULT_AUTH_METHODS]
}

export const allowedAuthMethods = () =>
  coerceAuthMethods(config().allowedAuthMethods)

export const sanitizeClientAuthPayload = <
  T extends Partial<ClientAuthenticatePayload>
>(
  payload: T
): Partial<ClientAuthenticatePayload> => {
  const methods = allowedAuthMethods()
  const sanitized = { ...payload } as Partial<ClientAuthenticatePayload>

  if (!methods.includes('password')) {
    delete sanitized.password
  } else if (
    typeof sanitized.password === 'string' &&
    sanitized.password.trim().length === 0
  ) {
    delete sanitized.password
  }

  if (!methods.includes('publickey')) {
    delete sanitized.privateKey
    delete sanitized.passphrase
  } else {
    const privateKeyValue =
      typeof sanitized.privateKey === 'string'
        ? sanitized.privateKey.trim()
        : ''
    if (!privateKeyValue) {
      delete sanitized.privateKey
      delete sanitized.passphrase
    } else if (
      typeof sanitized.passphrase === 'string' &&
      sanitized.passphrase.trim().length === 0
    ) {
      delete sanitized.passphrase
    }
  }

  return sanitized
}

// URL parameters signal
export const [urlParams, setUrlParams] = createSignal<URLSearchParams>(
  new URLSearchParams()
)

// Initialize URL parameters reactively
export function initializeUrlParams() {
  setUrlParams(new URLSearchParams(window.location.search))

  // Listen for URL changes
  const handleUrlChange = () => {
    setUrlParams(new URLSearchParams(window.location.search))
  }

  window.addEventListener('popstate', handleUrlChange)
  return () => window.removeEventListener('popstate', handleUrlChange)
}

// Computed config with URL parameter overrides
export const configWithUrlOverrides = () => {
  const baseConfig = config()
  const params = urlParams()

  const urlOverrides: Partial<WebSSH2Config> = {}
  const allowedForOverrides = coerceAuthMethods(baseConfig.allowedAuthMethods)
  const passwordAllowed = allowedForOverrides.includes('password')
  const publicKeyAllowed = allowedForOverrides.includes('publickey')

  // SSH parameters from URL
  const host = params.get('host')
  const port = params.get('port')
  const username = params.get('username')
  const password = params.get('password')
  const privateKey = params.get('privateKey')
  const passphrase = params.get('passphrase')
  const sshterm = params.get('sshterm')

  const parsedPort = port ? parseInt(port, 10) : NaN
  const sanitizedPort = Number.isNaN(parsedPort) ? 22 : parsedPort

  const passwordTrimmed = typeof password === 'string' ? password.trim() : ''
  const privateKeyTrimmed =
    typeof privateKey === 'string' ? privateKey.trim() : ''

  if (
    host ||
    port ||
    username ||
    (passwordAllowed && passwordTrimmed) ||
    (publicKeyAllowed && privateKeyTrimmed) ||
    (publicKeyAllowed && passphrase) ||
    sshterm
  ) {
    const sshOverrides: WebSSH2Config['ssh'] = {
      host: host || null,
      port: sanitizedPort,
      username: username || null,
      password: passwordAllowed && passwordTrimmed ? passwordTrimmed : null,
      sshterm: sshterm || 'xterm-color'
    }

    if (!passwordAllowed && passwordTrimmed) {
      debug('Ignoring password from URL: method disabled by server policy')
    }

    if (publicKeyAllowed && privateKeyTrimmed) {
      sshOverrides.privateKey = privateKeyTrimmed
      if (passphrase) {
        sshOverrides.passphrase = passphrase
      }
    } else if (privateKeyTrimmed) {
      debug('Ignoring private key from URL: method disabled by server policy')
    }

    urlOverrides.ssh = sshOverrides
  }

  const hasAllowedPassword = passwordAllowed && passwordTrimmed.length > 0
  const hasAllowedPrivateKey = publicKeyAllowed && privateKeyTrimmed.length > 0

  if (host && (hasAllowedPassword || hasAllowedPrivateKey)) {
    urlOverrides.autoConnect = true
    debug('Auto-connect enabled: host and allowed credentials provided via URL')
  } else if (host && !password && !privateKey) {
    debug(
      'Auto-connect disabled: host provided but missing credentials (password or privateKey)'
    )
  } else if (host && (password || privateKey)) {
    debug(
      'Auto-connect disabled: credentials provided but blocked by server policy',
      {
        passwordProvided: !!password,
        privateKeyProvided: !!privateKey
      }
    )
  }

  const mergedConfig = mergeDeep(baseConfig, urlOverrides) as WebSSH2Config
  const baseAuthPayload: Partial<ClientAuthenticatePayload> = {}

  if (mergedConfig.ssh.host) {
    baseAuthPayload.host = mergedConfig.ssh.host
  }
  if (typeof mergedConfig.ssh.port === 'number') {
    baseAuthPayload.port = mergedConfig.ssh.port
  }
  if (mergedConfig.ssh.username) {
    baseAuthPayload.username = mergedConfig.ssh.username
  }
  if (mergedConfig.ssh.password) {
    baseAuthPayload.password = mergedConfig.ssh.password
  }
  if (mergedConfig.ssh.privateKey) {
    baseAuthPayload.privateKey = mergedConfig.ssh.privateKey
  }
  if (mergedConfig.ssh.passphrase) {
    baseAuthPayload.passphrase = mergedConfig.ssh.passphrase
  }

  const sanitizedMergedAuth = sanitizeClientAuthPayload(baseAuthPayload)

  mergedConfig.ssh = {
    ...mergedConfig.ssh,
    password: sanitizedMergedAuth.password ?? null,
    privateKey: sanitizedMergedAuth.privateKey ?? '',
    passphrase: sanitizedMergedAuth.passphrase ?? ''
  }

  if (
    urlOverrides.autoConnect &&
    !sanitizedMergedAuth.password &&
    !sanitizedMergedAuth.privateKey
  ) {
    debug(
      'Auto-connect disabled: sanitized credentials removed disallowed values'
    )
    mergedConfig.autoConnect = false
  }

  debug('Config with URL overrides:', mergedConfig)
  return mergedConfig
}

// Initialize configuration from window object and URL
export function initializeConfig() {
  const windowConfig =
    (window as unknown as Record<string, unknown>)['webssh2Config'] || {}
  const initialConfig = mergeDeep(
    defaultConfig,
    windowConfig as Record<string, unknown>
  ) as WebSSH2Config

  const sanitizedConfig = {
    ...initialConfig,
    allowedAuthMethods: coerceAuthMethods(initialConfig.allowedAuthMethods)
  }

  setConfig(sanitizedConfig)
  debug('Config initialized:', sanitizedConfig)

  return configWithUrlOverrides()
}

// Reactive credentials getter
export const credentials = createRoot(() =>
  createMemo(() => {
    const cfg = configWithUrlOverrides()
    const _params = urlParams()

    const portValue = cfg.ssh?.port || 22
    let port =
      typeof portValue === 'number'
        ? portValue
        : parseInt(String(portValue), 10)
    if (Number.isNaN(port) || port < 1 || port > 65535) {
      debug(`Invalid port value: ${portValue}, defaulting to 22`)
      port = 22
    }

    return {
      host: cfg.ssh?.host || '',
      port,
      username: cfg.ssh?.username || '',
      password: cfg.ssh?.password || '',
      privateKey: cfg.ssh?.privateKey || '',
      passphrase: cfg.ssh?.passphrase || '',
      term: cfg.ssh?.sshterm || 'xterm-color'
    }
  })
)
