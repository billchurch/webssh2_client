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
 * Property names that must never be used as keys, because assigning them on
 * a plain object can reach or shadow Object.prototype.
 */
const FORBIDDEN_KEYS: ReadonlySet<string> = new Set([
  '__proto__',
  'constructor',
  'prototype'
])

function isForbiddenKey(name: string): boolean {
  return FORBIDDEN_KEYS.has(name)
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function emptyKeyMap(): KeyMap {
  return Object.create(null) as KeyMap
}

function emptyHostKeys(): HostKeys {
  return Object.create(null) as HostKeys
}

/**
 * Copy raw parsed key data into null-prototype maps, dropping entries with
 * forbidden names or a malformed shape.
 */
function sanitizeKeyMap(raw: Record<string, unknown>): KeyMap {
  const keys = emptyKeyMap()
  for (const [hostPort, algorithms] of Object.entries(raw)) {
    if (isForbiddenKey(hostPort) || !isPlainRecord(algorithms)) continue
    const hostKeys = emptyHostKeys()
    for (const [algo, entry] of Object.entries(algorithms)) {
      if (isForbiddenKey(algo) || !isPlainRecord(entry)) continue
      const { key, addedAt } = entry
      if (typeof key !== 'string' || typeof addedAt !== 'string') continue
      hostKeys[algo] = { key, addedAt }
    }
    if (Object.keys(hostKeys).length > 0) {
      keys[hostPort] = hostKeys
    }
  }
  return keys
}

/**
 * Load the key store from localStorage, returning a valid StoreData.
 */
function loadStore(): StoreData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw == null || raw === '') {
      return { version: 1, keys: emptyKeyMap() }
    }
    const parsed = JSON.parse(raw) as unknown
    if (
      isPlainRecord(parsed) &&
      parsed['version'] === 1 &&
      isPlainRecord(parsed['keys'])
    ) {
      return { version: 1, keys: sanitizeKeyMap(parsed['keys']) }
    }
    debug('Invalid store data format, resetting')
    return { version: 1, keys: emptyKeyMap() }
  } catch (err) {
    debug('Failed to load host key store:', err)
    return { version: 1, keys: emptyKeyMap() }
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

const MAX_HOST_LENGTH = 253
// One DNS label. Underscores are accepted because the store also holds TOFU
// pins for whatever host name the user connected to.
const HOSTNAME_LABEL_PATTERN =
  /^[A-Za-z0-9_](?:[A-Za-z0-9_-]{0,61}[A-Za-z0-9_])?$/
const IPV4_OCTET_PATTERN = /^(?:0|[1-9][0-9]{0,2})$/
const IPV6_GROUP_PATTERN = /^[0-9A-Fa-f]{1,4}$/
const IPV6_ZONE_PATTERN = /^[A-Za-z0-9_.-]+$/
const PORT_PATTERN = /^[1-9][0-9]{0,4}$/

function isValidIPv4(host: string): boolean {
  const octets = host.split('.')
  return (
    octets.length === 4 &&
    octets.every((o) => IPV4_OCTET_PATTERN.test(o) && Number(o) <= 255)
  )
}

/**
 * Count the 16-bit groups in one side of an IPv6 address, or return -1 if
 * the side is malformed. An IPv4 suffix counts as two groups.
 */
function countIPv6Groups(part: string, allowIPv4Tail: boolean): number {
  if (part === '') return 0
  const groups = part.split(':')
  let count = 0
  for (const [i, group] of groups.entries()) {
    if (allowIPv4Tail && i === groups.length - 1 && group.includes('.')) {
      if (!isValidIPv4(group)) return -1
      count += 2
    } else if (IPV6_GROUP_PATTERN.test(group)) {
      count += 1
    } else {
      return -1
    }
  }
  return count
}

/**
 * Validate an IPv6 address with an optional zone id (fe80::1%eth0).
 * The unspecified address "::" is rejected: it is not a host to connect to.
 */
function isValidIPv6(address: string): boolean {
  const zoneSep = address.indexOf('%')
  const ip = zoneSep === -1 ? address : address.slice(0, zoneSep)
  if (zoneSep !== -1 && !IPV6_ZONE_PATTERN.test(address.slice(zoneSep + 1))) {
    return false
  }

  const halves = ip.split('::')
  if (halves.length > 2) return false
  if (halves.length === 1) {
    return countIPv6Groups(ip, true) === 8
  }

  const [head = '', tail = ''] = halves
  const headCount = countIPv6Groups(head, false)
  const tailCount = countIPv6Groups(tail, true)
  if (headCount < 0 || tailCount < 0) return false
  const total = headCount + tailCount
  // "::" stands for at least one zero group
  return total > 0 && total <= 7
}

function isValidHostname(host: string): boolean {
  const labels = host.split('.')
  if (!labels.every((label) => HOSTNAME_LABEL_PATTERN.test(label))) {
    return false
  }
  // An all-numeric name is a (possibly malformed) IPv4 address
  if (labels.every((label) => /^[0-9]+$/.test(label))) {
    return isValidIPv4(host)
  }
  return true
}

/**
 * Validate a host: a DNS hostname, an IPv4 address, or an IPv6 address
 * (bare or in brackets).
 */
function isValidHost(host: string): boolean {
  if (host.length === 0 || host.length > MAX_HOST_LENGTH) return false
  if (isForbiddenKey(host)) return false
  if (host.startsWith('[') && host.endsWith(']')) {
    return isValidIPv6(host.slice(1, -1))
  }
  if (host.includes(':')) {
    return isValidIPv6(host)
  }
  return isValidHostname(host)
}

function isValidPort(port: number): boolean {
  return Number.isInteger(port) && port >= 1 && port <= 65535
}

/**
 * Split a "host:port" store key and validate both parts.
 *
 * @returns The host and port, or null if the key is not a valid host:port
 */
function parseHostPortKey(
  hostPort: string
): { host: string; port: number } | null {
  if (isForbiddenKey(hostPort)) return null
  const sep = hostPort.lastIndexOf(':')
  if (sep <= 0) return null
  const host = hostPort.slice(0, sep)
  const portStr = hostPort.slice(sep + 1)
  if (!PORT_PATTERN.test(portStr)) return null
  const port = Number(portStr)
  if (!isValidPort(port) || !isValidHost(host)) return null
  return { host, port }
}

/**
 * Validate the parts of a host key before it is written to the store.
 *
 * @returns An error message, or null if the key is valid
 */
function validateKey(
  host: string,
  port: number,
  algorithm: string,
  keyData: string
): string | null {
  if (!isValidHost(host)) {
    return `Invalid host "${host}"`
  }
  if (!isValidPort(port)) {
    return `Invalid port "${port}": expected 1-65535`
  }
  if (!isValidAlgorithm(algorithm)) {
    return `Invalid algorithm "${algorithm}". Valid algorithms: ${VALID_ALGORITHMS.join(', ')}`
  }
  if (!isValidBase64(keyData)) {
    return 'Invalid base64 key data'
  }
  return null
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
  const entry = Object.hasOwn(data.keys, key)
    ? data.keys[key]?.[algorithm]
    : undefined

  if (entry === undefined) {
    return { status: 'unknown' }
  }

  if (presentedKey === undefined) {
    return { status: 'trusted' }
  }

  if (entry.key === presentedKey) {
    return { status: 'trusted' }
  }

  return { status: 'mismatch', storedKey: entry.key }
}

/**
 * Store a host key.
 *
 * @param host - The hostname
 * @param port - The port number
 * @param algorithm - The SSH key algorithm
 * @param keyData - The base64-encoded public key
 * @returns Object with success boolean and optional error message
 */
export function store(
  host: string,
  port: number,
  algorithm: string,
  keyData: string
): { success: boolean; error?: string } {
  const error = validateKey(host, port, algorithm, keyData)
  if (error !== null) {
    debug('Refusing to store key for %s:%s: %s', host, port, error)
    return { success: false, error }
  }

  const data = loadStore()
  const hostPortKey = makeHostPortKey(host, port)
  const hostKeys = data.keys[hostPortKey] ?? emptyHostKeys()

  hostKeys[algorithm] = {
    key: keyData,
    addedAt: new Date().toISOString()
  }
  data.keys[hostPortKey] = hostKeys

  saveStore(data)
  debug('Stored key for %s algorithm %s', hostPortKey, algorithm)
  return { success: true }
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
  const hostKeys = data.keys[hostPortKey]

  if (!hostKeys) {
    return
  }

  if (algorithm != null && algorithm !== '') {
    delete hostKeys[algorithm]
    // Clean up empty host entries
    if (Object.keys(hostKeys).length === 0) {
      delete data.keys[hostPortKey]
    }
  } else {
    delete data.keys[hostPortKey]
  }

  saveStore(data)
  debug(
    'Removed key(s) for %s%s',
    hostPortKey,
    algorithm != null && algorithm !== '' ? ` algorithm ${algorithm}` : ''
  )
}

/**
 * Get all stored keys.
 *
 * @returns The full key map { "host:port": { algorithm: { key, addedAt } } }
 */
export function getAll(): KeyMap {
  // Spread (not Object.assign) so the copy is defined, never [[Set]]
  return { ...loadStore().keys }
}

/**
 * Export all keys as a JSON string for backup.
 *
 * @returns JSON string of the full store data
 */
export function exportKeys(): string {
  return JSON.stringify(loadStore(), null, 2)
}

export interface ImportEntry {
  hostPort: string
  host: string
  port: number
  algorithm: string
  entry: KeyEntry
}

export interface ImportConflict extends ImportEntry {
  /** The base64 key currently pinned for this host:port and algorithm */
  existingKey: string
}

/**
 * The result of comparing an import file with the current store. Nothing is
 * written until the plan is passed to applyImport().
 */
export interface ImportPlan {
  /** Entries for host:port + algorithm pairs not yet pinned */
  additions: ImportEntry[]
  /** Entries that would replace a pinned key with a different key */
  conflicts: ImportConflict[]
  /** Entries identical to the pinned key */
  unchanged: number
}

export interface ImportSummary {
  added: number
  skipped: number
  replaced: number
}

export interface ImportOptions {
  /** Replace pinned keys listed in plan.conflicts. Default: false (skip) */
  replaceConflicts?: boolean
}

type ParseResult =
  | { success: true; entries: ImportEntry[] }
  | { success: false; error: string }

function findForbiddenKey(obj: Record<string, unknown>): string | undefined {
  return Object.keys(obj).find(isForbiddenKey)
}

/**
 * Parse and validate an import file without touching the store.
 */
function parseImportEntries(json: string): ParseResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(json) as unknown
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { success: false, error: `Failed to parse JSON: ${message}` }
  }

  if (!isPlainRecord(parsed)) {
    return { success: false, error: 'Invalid JSON: not an object' }
  }

  const forbiddenTop = findForbiddenKey(parsed)
  if (forbiddenTop !== undefined) {
    return { success: false, error: `Invalid property "${forbiddenTop}"` }
  }

  if (parsed['version'] !== 1) {
    return { success: false, error: 'Unsupported store version' }
  }

  const importedKeys = parsed['keys']
  if (!isPlainRecord(importedKeys)) {
    return { success: false, error: 'Invalid format: missing keys object' }
  }

  const entries: ImportEntry[] = []
  for (const [hostPort, algorithms] of Object.entries(importedKeys)) {
    const target = parseHostPortKey(hostPort)
    if (target === null) {
      return {
        success: false,
        error: `Invalid host "${hostPort}": expected host:port with port 1-65535`
      }
    }

    if (!isPlainRecord(algorithms)) {
      return {
        success: false,
        error: `Invalid entry for ${hostPort}: expected algorithm map`
      }
    }

    for (const [algo, entry] of Object.entries(algorithms)) {
      if (!isValidAlgorithm(algo)) {
        return {
          success: false,
          error: `Invalid algorithm "${algo}" for ${hostPort}`
        }
      }

      if (!isPlainRecord(entry) || findForbiddenKey(entry) !== undefined) {
        return {
          success: false,
          error: `Invalid key entry for ${hostPort} ${algo}`
        }
      }

      const { key, addedAt } = entry
      if (typeof key !== 'string' || typeof addedAt !== 'string') {
        return {
          success: false,
          error: `Invalid key entry for ${hostPort} ${algo}`
        }
      }

      if (!isValidBase64(key)) {
        return {
          success: false,
          error: `Invalid base64 key data for ${hostPort} ${algo}`
        }
      }

      entries.push({
        hostPort,
        host: target.host,
        port: target.port,
        algorithm: algo,
        entry: { key, addedAt }
      })
    }
  }

  return { success: true, entries }
}

/**
 * Parse an import file and compare it with the current store.
 *
 * Nothing is written. Show plan.conflicts to the user before calling
 * applyImport() with replaceConflicts: true.
 *
 * @param json - JSON string to import
 * @returns The import plan, or an error message
 */
export function previewImport(
  json: string
): { success: true; plan: ImportPlan } | { success: false; error: string } {
  const parsed = parseImportEntries(json)
  if (!parsed.success) {
    return parsed
  }

  const current = loadStore().keys
  const plan: ImportPlan = { additions: [], conflicts: [], unchanged: 0 }
  for (const item of parsed.entries) {
    const existing = current[item.hostPort]?.[item.algorithm]
    if (existing === undefined) {
      plan.additions.push(item)
    } else if (existing.key === item.entry.key) {
      plan.unchanged++
    } else {
      plan.conflicts.push({ ...item, existingKey: existing.key })
    }
  }
  return { success: true, plan }
}

/**
 * Write an import plan to the store.
 *
 * Additions are written unless the pair was pinned in the meantime. A
 * conflict is replaced only when replaceConflicts is true and the pinned key
 * is still the one the plan showed; anything else is skipped, so a pin is
 * never replaced without the user having seen it.
 *
 * @param plan - A plan from previewImport()
 * @param options - Whether to replace the conflicts listed in the plan
 * @returns Counts of added, skipped and replaced keys
 */
export function applyImport(
  plan: ImportPlan,
  options: ImportOptions = {}
): ImportSummary {
  const replaceConflicts = options.replaceConflicts === true
  const data = loadStore()
  const summary: ImportSummary = { added: 0, skipped: 0, replaced: 0 }

  const write = (item: ImportEntry): void => {
    const hostKeys = data.keys[item.hostPort] ?? emptyHostKeys()
    hostKeys[item.algorithm] = { ...item.entry }
    data.keys[item.hostPort] = hostKeys
  }

  for (const item of plan.additions) {
    const existing = data.keys[item.hostPort]?.[item.algorithm]
    if (existing === undefined) {
      write(item)
      summary.added++
    } else if (existing.key !== item.entry.key) {
      summary.skipped++
    }
  }

  for (const item of plan.conflicts) {
    const existing = data.keys[item.hostPort]?.[item.algorithm]
    if (
      replaceConflicts &&
      (existing === undefined || existing.key === item.existingKey)
    ) {
      write(item)
      summary.replaced++
    } else {
      summary.skipped++
    }
  }

  if (summary.added > 0 || summary.replaced > 0) {
    saveStore(data)
  }
  debug(
    'Imported keys: %d added, %d skipped, %d replaced',
    summary.added,
    summary.skipped,
    summary.replaced
  )
  return summary
}

/**
 * Compute the OpenSSH-style SHA-256 fingerprint of a base64-encoded key.
 *
 * @param base64Key - The base64-encoded public key
 * @returns "SHA256:<base64 digest>"
 */
export async function computeFingerprint(base64Key: string): Promise<string> {
  const bytes = Uint8Array.from(atob(base64Key), (c) => c.charCodeAt(0))
  const hashBuffer = await crypto.subtle.digest('SHA-256', bytes)
  const hashBase64 = btoa(String.fromCharCode(...new Uint8Array(hashBuffer)))
  return `SHA256:${hashBase64}`
}

export interface ConflictFingerprints {
  /** Fingerprint of the key currently pinned */
  existing: string
  /** Fingerprint of the key in the import file */
  imported: string
}

/**
 * Compute the old and new fingerprints for each import conflict, in order.
 *
 * Rejects if any fingerprint cannot be computed, so a caller never has a
 * partial list to show before asking the user to replace keys.
 *
 * @param conflicts - plan.conflicts from previewImport()
 */
export async function fingerprintConflicts(
  conflicts: readonly ImportConflict[]
): Promise<ConflictFingerprints[]> {
  return Promise.all(
    conflicts.map(async (conflict) => {
      const [existing, imported] = await Promise.all([
        computeFingerprint(conflict.existingKey),
        computeFingerprint(conflict.entry.key)
      ])
      return { existing, imported }
    })
  )
}

/**
 * Import keys from a JSON string, merging with existing keys.
 *
 * Keys that would replace a different pinned key are skipped unless
 * options.replaceConflicts is true. Interactive callers should use
 * previewImport() and applyImport() so the user can review conflicts.
 *
 * @param json - JSON string to import
 * @param options - Whether to replace conflicting pinned keys
 * @returns Object with success boolean, counts, and optional error message
 */
export function importKeys(
  json: string,
  options: ImportOptions = {}
): { success: boolean; error?: string } & Partial<ImportSummary> {
  const preview = previewImport(json)
  if (!preview.success) {
    return { success: false, error: preview.error }
  }
  return { success: true, ...applyImport(preview.plan, options) }
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

  return store(host, port, algorithm, keyData)
}
