import createDebug from 'debug'
import {
  setConfig,
  coerceAuthMethods,
  allowedAuthMethods
} from '../stores/config.js'
import type { SSHAuthMethod } from '../types/config.d'

const debug = createDebug('webssh2-client:server-config')

interface ServerConfigResponse {
  allowedAuthMethods?: unknown
  [key: string]: unknown
}

export interface LoadServerConfigResult {
  ok: boolean
  methods: SSHAuthMethod[]
}

const CONFIG_ENDPOINT = '/ssh/config'

const fetchServerConfig = async (): Promise<ServerConfigResponse | null> => {
  try {
    const response = await fetch(CONFIG_ENDPOINT, {
      method: 'GET',
      headers: {
        Accept: 'application/json'
      },
      cache: 'no-store',
      credentials: 'same-origin'
    })

    if (!response.ok) {
      debug(
        'Server config request failed',
        response.status,
        response.statusText
      )
      return null
    }

    if (response.status === 204) {
      debug('Server config returned no content')
      return {}
    }

    const payload = (await response.json()) as ServerConfigResponse
    return payload
  } catch (error) {
    debug('Error while requesting server config', error)
    return null
  }
}

export const loadServerAuthMethods =
  async (): Promise<LoadServerConfigResult> => {
    const payload = await fetchServerConfig()

    if (!payload || payload.allowedAuthMethods === undefined) {
      const fallback = allowedAuthMethods()
      debug('Using fallback auth methods', fallback)
      return { ok: false, methods: fallback }
    }

    const methods = coerceAuthMethods(payload.allowedAuthMethods)
    setConfig((prev) => ({
      ...prev,
      allowedAuthMethods: methods
    }))

    debug('Loaded allowed auth methods from server', methods)
    return { ok: true, methods }
  }
