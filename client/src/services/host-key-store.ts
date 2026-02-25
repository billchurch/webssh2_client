/**
 * Client-side host key store backed by localStorage.
 *
 * Stores SSH host key fingerprints so the browser can verify hosts
 * independently of the server-side store. This provides a TOFU
 * (Trust On First Use) model for browser-based SSH connections.
 */
import createDebug from 'debug'

const debug = createDebug('webssh2-client:host-key-store')

const STORAGE_KEY = 'webssh2.hostkeys'

const VALID_ALGORITHMS = [
  'ssh-ed25519',
  'ssh-rsa',
  'rsa-sha2-256',
  'rsa-sha2-512',
  'ecdsa-sha2-nistp256',
  'ecdsa-sha2-nistp384',
  'ecdsa-sha2-nistp521'
] as const

type ValidAlgorithm = (typeof VALID_ALGORITHMS)[number]

interface KeyEntry {
  key: string
  addedAt: string
}

interface HostKeys {
  [algorithm: string]: KeyEntry
}

interface KeyMap {
  [hostPort: string]: HostKeys
}

interface StoreData {
  version: number
  keys: KeyMap
}

export type LookupResult =
  | { status: 'trusted' }
  | { status: 'mismatch'; storedKey: string }
  | { status: 'unknown' }

/**
 * Load the key store from localStorage, returning a valid StoreData.
 */
function loadStore(): StoreData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return { version: 1, keys: {} }
    }
    const parsed = JSON.parse(raw) as unknown
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'version' in parsed &&
      (parsed as StoreData).version === 1 &&
      'keys' in parsed &&
      typeof (parsed as StoreData).keys === 'object'
    ) {
      return parsed as StoreData
    }
    debug('Invalid store data format, resetting')
    return { version: 1, keys: {} }
  } catch (err) {
    debug('Failed to load host key store:', err)
    return { version: 1, keys: {} }
  }
}

/**
 * Save the key store to localStorage.
 */
function saveStore(data: StoreData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    debug('Host key store saved')
  } catch (err) {
    debug('Failed to save host key store:', err)
  }
}

/**
 * Build the host:port key used in the store map.
 */
function makeHostPortKey(host: string, port: number): string {
  return `${host}:${port}`
}

/**
 * Check if an algorithm string is one of the valid SSH key algorithms.
 */
function isValidAlgorithm(algorithm: string): algorithm is ValidAlgorithm {
  return (VALID_ALGORITHMS as readonly string[]).includes(algorithm)
}

/**
 * Validate that a string is valid base64.
 */
function isValidBase64(str: string): boolean {
  if (str.length === 0) return false
  try {
    const decoded = atob(str)
    return decoded.length > 0
  } catch {
    return false
  }
}

/**
 * Look up a host key in the store.
 *
 * @param host - The hostname
 * @param port - The port number
 * @param algorithm - The SSH key algorithm
 * @param presentedKey - Optional base64-encoded key to compare against stored key
 * @returns 'trusted' if the key matches, 'mismatch' if different, 'unknown' if not stored
 */
export function lookup(
  host: string,
  port: number,
  algorithm: string,
  presentedKey?: string
): LookupResult {
  const data = loadStore()
  const key = makeHostPortKey(host, port)
  const hostKeys = data.keys[key]

  if (!hostKeys || !hostKeys[algorithm]) {
    return { status: 'unknown' }
  }

  if (presentedKey === undefined) {
    return { status: 'trusted' }
  }

  if (hostKeys[algorithm].key === presentedKey) {
    return { status: 'trusted' }
  }

  return { status: 'mismatch', storedKey: hostKeys[algorithm].key }
}

/**
 * Store a host key.
 *
 * @param host - The hostname
 * @param port - The port number
 * @param algorithm - The SSH key algorithm
 * @param keyData - The base64-encoded public key
 */
export function store(
  host: string,
  port: number,
  algorithm: string,
  keyData: string
): void {
  const data = loadStore()
  const hostPortKey = makeHostPortKey(host, port)

  if (!data.keys[hostPortKey]) {
    data.keys[hostPortKey] = {}
  }

  data.keys[hostPortKey][algorithm] = {
    key: keyData,
    addedAt: new Date().toISOString()
  }

  saveStore(data)
  debug('Stored key for %s algorithm %s', hostPortKey, algorithm)
}

/**
 * Remove stored keys for a host:port.
 *
 * @param host - The hostname
 * @param port - The port number
 * @param algorithm - Optional specific algorithm to remove. If omitted, removes all keys for the host:port.
 */
export function remove(host: string, port: number, algorithm?: string): void {
  const data = loadStore()
  const hostPortKey = makeHostPortKey(host, port)

  if (!data.keys[hostPortKey]) {
    return
  }

  if (algorithm) {
    delete data.keys[hostPortKey][algorithm]
    // Clean up empty host entries
    if (Object.keys(data.keys[hostPortKey]).length === 0) {
      delete data.keys[hostPortKey]
    }
  } else {
    delete data.keys[hostPortKey]
  }

  saveStore(data)
  debug(
    'Removed key(s) for %s%s',
    hostPortKey,
    algorithm ? ` algorithm ${algorithm}` : ''
  )
}

/**
 * Get all stored keys.
 *
 * @returns The full key map { "host:port": { algorithm: { key, addedAt } } }
 */
export function getAll(): KeyMap {
  return loadStore().keys
}

/**
 * Export all keys as a JSON string for backup.
 *
 * @returns JSON string of the full store data
 */
export function exportKeys(): string {
  return JSON.stringify(loadStore(), null, 2)
}

/**
 * Import keys from a JSON string, merging with existing keys.
 *
 * @param json - JSON string to import
 * @returns Object with success boolean and optional error message
 */
export function importKeys(json: string): { success: boolean; error?: string } {
  try {
    const parsed = JSON.parse(json) as unknown

    if (typeof parsed !== 'object' || parsed === null) {
      return { success: false, error: 'Invalid JSON: not an object' }
    }

    const imported = parsed as Record<string, unknown>

    if (imported['version'] !== 1) {
      return { success: false, error: 'Unsupported store version' }
    }

    if (typeof imported['keys'] !== 'object' || imported['keys'] === null) {
      return { success: false, error: 'Invalid format: missing keys object' }
    }

    const importedKeys = imported['keys'] as Record<string, unknown>

    // Validate structure before merging
    for (const [hostPort, algorithms] of Object.entries(importedKeys)) {
      if (typeof algorithms !== 'object' || algorithms === null) {
        return {
          success: false,
          error: `Invalid entry for ${hostPort}: expected algorithm map`
        }
      }

      for (const [algo, entry] of Object.entries(
        algorithms as Record<string, unknown>
      )) {
        if (!isValidAlgorithm(algo)) {
          return {
            success: false,
            error: `Invalid algorithm "${algo}" for ${hostPort}`
          }
        }

        const keyEntry = entry as Record<string, unknown>
        if (
          typeof keyEntry['key'] !== 'string' ||
          typeof keyEntry['addedAt'] !== 'string'
        ) {
          return {
            success: false,
            error: `Invalid key entry for ${hostPort} ${algo}`
          }
        }
      }
    }

    // Merge with existing store
    const currentData = loadStore()
    for (const [hostPort, algorithms] of Object.entries(importedKeys)) {
      if (!currentData.keys[hostPort]) {
        currentData.keys[hostPort] = {}
      }
      for (const [algo, entry] of Object.entries(
        algorithms as Record<string, KeyEntry>
      )) {
        currentData.keys[hostPort][algo] = entry
      }
    }

    saveStore(currentData)
    debug('Imported keys successfully')
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { success: false, error: `Failed to parse JSON: ${message}` }
  }
}

/**
 * Add a key from OpenSSH public key format: "algorithm base64key [comment]"
 *
 * @param host - The hostname
 * @param port - The port number
 * @param publicKey - OpenSSH format public key string
 * @returns Object with success boolean and optional error message
 */
export function addManualKey(
  host: string,
  port: number,
  publicKey: string
): { success: boolean; error?: string } {
  const trimmed = publicKey.trim()
  const parts = trimmed.split(/\s+/)

  if (parts.length < 2) {
    return {
      success: false,
      error: 'Invalid format: expected "algorithm base64key [comment]"'
    }
  }

  const algorithm = parts[0] as string
  const keyData = parts[1] as string

  if (!isValidAlgorithm(algorithm)) {
    return {
      success: false,
      error: `Invalid algorithm "${algorithm}". Valid algorithms: ${VALID_ALGORITHMS.join(', ')}`
    }
  }

  if (!isValidBase64(keyData)) {
    return {
      success: false,
      error: 'Invalid base64 key data'
    }
  }

  store(host, port, algorithm, keyData)
  return { success: true }
}
