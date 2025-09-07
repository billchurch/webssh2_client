// client/src/js/stores/config.ts
import { createSignal, createMemo, createRoot } from 'solid-js'
import createDebug from 'debug'
import { mergeDeep } from '../utils/index.js'
import type { WebSSH2Config } from '../types/config.d'

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
    logLevel: 'info'
  },
  header: {
    text: null,
    background: '#000'
  },
  autoConnect: false,
  logLevel: 'info'
}

// Reactive config store
export const [config, setConfig] = createSignal<WebSSH2Config>(defaultConfig)

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
export const configWithUrlOverrides = createRoot(() =>
  createMemo(() => {
    const baseConfig = config()
    const params = urlParams()

    const urlOverrides: Partial<WebSSH2Config> = {}

    // SSH parameters from URL
    const host = params.get('host')
    const port = params.get('port')
    const username = params.get('username')
    const password = params.get('password')
    const privateKey = params.get('privateKey')
    const passphrase = params.get('passphrase')
    const sshterm = params.get('sshterm')

    if (
      host ||
      port ||
      username ||
      password ||
      privateKey ||
      passphrase ||
      sshterm
    ) {
      urlOverrides.ssh = {
        host: host || null,
        port: port ? parseInt(port, 10) : 22,
        username: username || null,
        password: password || null,
        sshterm: sshterm || 'xterm-color',
        ...(privateKey && { privateKey }),
        ...(passphrase && { passphrase })
      }
    }

    // Auto-connect only if host and credentials are provided in URL
    if (host && (password || privateKey)) {
      urlOverrides.autoConnect = true
      debug('Auto-connect enabled: host and credentials provided via URL')
    } else if (host && !password && !privateKey) {
      debug(
        'Auto-connect disabled: host provided but missing credentials (password or privateKey)'
      )
    }

    const mergedConfig = mergeDeep(baseConfig, urlOverrides) as WebSSH2Config
    debug('Config with URL overrides:', mergedConfig)
    return mergedConfig
  })
)

// Initialize configuration from window object and URL
export function initializeConfig() {
  const windowConfig =
    (window as unknown as Record<string, unknown>)['webssh2Config'] || {}
  const initialConfig = mergeDeep(
    defaultConfig,
    windowConfig as Record<string, unknown>
  ) as WebSSH2Config

  setConfig(initialConfig)
  debug('Config initialized:', initialConfig)

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
