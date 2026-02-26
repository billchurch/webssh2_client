/**
 * Tests for client-side host key store (TOFU logic)
 *
 * Covers: lookup, store, remove, getAll, exportKeys, importKeys,
 *         addManualKey, and loadStore resilience.
 */

import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { register } from 'node:module'
import { pathToFileURL } from 'node:url'

await register('./tests/ts-loader.mjs', pathToFileURL('./'))

// ---------------------------------------------------------------------------
// localStorage shim
// ---------------------------------------------------------------------------

const storage = new Map()

globalThis.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
  removeItem: (key) => storage.delete(key),
  clear: () => storage.clear(),
  get length() {
    return storage.size
  },
  key: (index) => [...storage.keys()][index] ?? null
}

// ---------------------------------------------------------------------------
// atob / btoa shims (needed by isValidBase64)
// ---------------------------------------------------------------------------

if (typeof globalThis.atob !== 'function') {
  globalThis.atob = (str) => Buffer.from(str, 'base64').toString('binary')
}
if (typeof globalThis.btoa !== 'function') {
  globalThis.btoa = (str) => Buffer.from(str, 'binary').toString('base64')
}

// ---------------------------------------------------------------------------
// Import SUT (after shims are in place)
// ---------------------------------------------------------------------------

const { lookup, store, remove, getAll, exportKeys, importKeys, addManualKey } =
  await import('../client/src/services/host-key-store.ts')

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VALID_KEY = btoa('some-key-data')
const VALID_KEY_2 = btoa('different-key')

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('host-key-store', () => {
  beforeEach(() => {
    storage.clear()
  })

  afterEach(() => {
    storage.clear()
  })

  // -----------------------------------------------------------------------
  // lookup
  // -----------------------------------------------------------------------

  describe('lookup', () => {
    it('returns unknown when no keys stored', () => {
      const result = lookup('host.example', 22, 'ssh-ed25519')
      assert.equal(result.status, 'unknown')
    })

    it('returns trusted when key exists and no presentedKey given', () => {
      store('host.example', 22, 'ssh-ed25519', VALID_KEY)
      const result = lookup('host.example', 22, 'ssh-ed25519')
      assert.equal(result.status, 'trusted')
    })

    it('returns trusted when presentedKey matches', () => {
      store('host.example', 22, 'ssh-ed25519', VALID_KEY)
      const result = lookup('host.example', 22, 'ssh-ed25519', VALID_KEY)
      assert.equal(result.status, 'trusted')
    })

    it('returns mismatch with storedKey when presentedKey differs', () => {
      store('host.example', 22, 'ssh-ed25519', VALID_KEY)
      const result = lookup('host.example', 22, 'ssh-ed25519', VALID_KEY_2)
      assert.equal(result.status, 'mismatch')
      assert.equal(result.storedKey, VALID_KEY)
    })

    it('distinguishes by host independently', () => {
      store('host-a.example', 22, 'ssh-ed25519', VALID_KEY)
      const result = lookup('host-b.example', 22, 'ssh-ed25519')
      assert.equal(result.status, 'unknown')
    })

    it('distinguishes by port independently', () => {
      store('host.example', 22, 'ssh-ed25519', VALID_KEY)
      const result = lookup('host.example', 2222, 'ssh-ed25519')
      assert.equal(result.status, 'unknown')
    })

    it('distinguishes by algorithm independently', () => {
      store('host.example', 22, 'ssh-ed25519', VALID_KEY)
      const result = lookup('host.example', 22, 'ssh-rsa')
      assert.equal(result.status, 'unknown')
    })
  })

  // -----------------------------------------------------------------------
  // store
  // -----------------------------------------------------------------------

  describe('store', () => {
    it('persists key to localStorage', () => {
      store('host.example', 22, 'ssh-ed25519', VALID_KEY)
      const raw = localStorage.getItem('webssh2.hostkeys')
      assert.ok(raw !== null)
      const parsed = JSON.parse(raw)
      assert.equal(parsed.keys['host.example:22']['ssh-ed25519'].key, VALID_KEY)
    })

    it('overwrites existing key for same host/port/algorithm', () => {
      store('host.example', 22, 'ssh-ed25519', VALID_KEY)
      store('host.example', 22, 'ssh-ed25519', VALID_KEY_2)

      const result = lookup('host.example', 22, 'ssh-ed25519', VALID_KEY_2)
      assert.equal(result.status, 'trusted')

      const result2 = lookup('host.example', 22, 'ssh-ed25519', VALID_KEY)
      assert.equal(result2.status, 'mismatch')
    })

    it('stores multiple algorithms for same host:port', () => {
      store('host.example', 22, 'ssh-ed25519', VALID_KEY)
      store('host.example', 22, 'ssh-rsa', VALID_KEY_2)

      assert.equal(
        lookup('host.example', 22, 'ssh-ed25519', VALID_KEY).status,
        'trusted'
      )
      assert.equal(
        lookup('host.example', 22, 'ssh-rsa', VALID_KEY_2).status,
        'trusted'
      )
    })

    it('includes addedAt as ISO timestamp', () => {
      store('host.example', 22, 'ssh-ed25519', VALID_KEY)
      const raw = JSON.parse(localStorage.getItem('webssh2.hostkeys'))
      const entry = raw.keys['host.example:22']['ssh-ed25519']
      // ISO 8601 format check: YYYY-MM-DDTHH:mm:ss.sssZ
      assert.ok(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(entry.addedAt))
    })
  })

  // -----------------------------------------------------------------------
  // remove
  // -----------------------------------------------------------------------

  describe('remove', () => {
    it('removes all keys for host:port when no algorithm specified', () => {
      store('host.example', 22, 'ssh-ed25519', VALID_KEY)
      store('host.example', 22, 'ssh-rsa', VALID_KEY_2)
      remove('host.example', 22)

      assert.equal(lookup('host.example', 22, 'ssh-ed25519').status, 'unknown')
      assert.equal(lookup('host.example', 22, 'ssh-rsa').status, 'unknown')
    })

    it('removes only specified algorithm', () => {
      store('host.example', 22, 'ssh-ed25519', VALID_KEY)
      store('host.example', 22, 'ssh-rsa', VALID_KEY_2)
      remove('host.example', 22, 'ssh-ed25519')

      assert.equal(lookup('host.example', 22, 'ssh-ed25519').status, 'unknown')
      assert.equal(
        lookup('host.example', 22, 'ssh-rsa', VALID_KEY_2).status,
        'trusted'
      )
    })

    it('is a no-op when host:port does not exist', () => {
      // Should not throw
      remove('nonexistent.example', 22)
      assert.deepEqual(getAll(), {})
    })

    it('cleans up empty host entries after last algorithm removed', () => {
      store('host.example', 22, 'ssh-ed25519', VALID_KEY)
      remove('host.example', 22, 'ssh-ed25519')

      const all = getAll()
      assert.equal(Object.keys(all).length, 0)
    })
  })

  // -----------------------------------------------------------------------
  // getAll
  // -----------------------------------------------------------------------

  describe('getAll', () => {
    it('returns empty object when no keys stored', () => {
      assert.deepEqual(getAll(), {})
    })

    it('returns full key map structure', () => {
      store('host-a.example', 22, 'ssh-ed25519', VALID_KEY)
      store('host-b.example', 2222, 'ssh-rsa', VALID_KEY_2)

      const all = getAll()
      assert.ok('host-a.example:22' in all)
      assert.ok('host-b.example:2222' in all)
      assert.equal(all['host-a.example:22']['ssh-ed25519'].key, VALID_KEY)
      assert.equal(all['host-b.example:2222']['ssh-rsa'].key, VALID_KEY_2)
    })
  })

  // -----------------------------------------------------------------------
  // exportKeys / importKeys
  // -----------------------------------------------------------------------

  describe('exportKeys / importKeys', () => {
    it('round-trips: export then import produces same data', () => {
      store('host.example', 22, 'ssh-ed25519', VALID_KEY)
      store('host.example', 22, 'ssh-rsa', VALID_KEY_2)
      const exported = exportKeys()

      // Clear and re-import
      storage.clear()
      const result = importKeys(exported)
      assert.equal(result.success, true)

      assert.equal(
        lookup('host.example', 22, 'ssh-ed25519', VALID_KEY).status,
        'trusted'
      )
      assert.equal(
        lookup('host.example', 22, 'ssh-rsa', VALID_KEY_2).status,
        'trusted'
      )
    })

    it('import merges with existing keys', () => {
      store('host-a.example', 22, 'ssh-ed25519', VALID_KEY)

      const importData = JSON.stringify({
        version: 1,
        keys: {
          'host-b.example:22': {
            'ssh-rsa': { key: VALID_KEY_2, addedAt: '2025-01-01T00:00:00.000Z' }
          }
        }
      })

      const result = importKeys(importData)
      assert.equal(result.success, true)

      // Both keys should exist
      assert.equal(
        lookup('host-a.example', 22, 'ssh-ed25519', VALID_KEY).status,
        'trusted'
      )
      assert.equal(
        lookup('host-b.example', 22, 'ssh-rsa', VALID_KEY_2).status,
        'trusted'
      )
    })

    it('rejects invalid JSON', () => {
      const result = importKeys('not valid json{{{')
      assert.equal(result.success, false)
      assert.ok(result.error.includes('Failed to parse JSON'))
    })

    it('rejects wrong version', () => {
      const result = importKeys(JSON.stringify({ version: 99, keys: {} }))
      assert.equal(result.success, false)
      assert.ok(result.error.includes('version'))
    })

    it('rejects invalid algorithm names', () => {
      const result = importKeys(
        JSON.stringify({
          version: 1,
          keys: {
            'host.example:22': {
              'invalid-algo': {
                key: VALID_KEY,
                addedAt: '2025-01-01T00:00:00.000Z'
              }
            }
          }
        })
      )
      assert.equal(result.success, false)
      assert.ok(result.error.includes('Invalid algorithm'))
    })

    it('rejects malformed key entries', () => {
      const result = importKeys(
        JSON.stringify({
          version: 1,
          keys: {
            'host.example:22': {
              'ssh-ed25519': { key: 123, addedAt: '2025-01-01T00:00:00.000Z' }
            }
          }
        })
      )
      assert.equal(result.success, false)
      assert.ok(result.error.includes('Invalid key entry'))
    })
  })

  // -----------------------------------------------------------------------
  // addManualKey
  // -----------------------------------------------------------------------

  describe('addManualKey', () => {
    it('parses valid OpenSSH format "algorithm base64key comment"', () => {
      const result = addManualKey(
        'host.example',
        22,
        `ssh-ed25519 ${VALID_KEY} user@machine`
      )
      assert.equal(result.success, true)
      assert.equal(
        lookup('host.example', 22, 'ssh-ed25519', VALID_KEY).status,
        'trusted'
      )
    })

    it('parses valid key without comment', () => {
      const result = addManualKey('host.example', 22, `ssh-rsa ${VALID_KEY}`)
      assert.equal(result.success, true)
      assert.equal(
        lookup('host.example', 22, 'ssh-rsa', VALID_KEY).status,
        'trusted'
      )
    })

    it('rejects too few parts', () => {
      const result = addManualKey('host.example', 22, 'ssh-ed25519')
      assert.equal(result.success, false)
      assert.ok(result.error.includes('Invalid format'))
    })

    it('rejects invalid algorithm', () => {
      const result = addManualKey('host.example', 22, `bogus-algo ${VALID_KEY}`)
      assert.equal(result.success, false)
      assert.ok(result.error.includes('Invalid algorithm'))
    })

    it('rejects invalid base64', () => {
      const result = addManualKey(
        'host.example',
        22,
        'ssh-ed25519 !!!not-base64!!!'
      )
      assert.equal(result.success, false)
      assert.ok(result.error.includes('Invalid base64'))
    })
  })

  // -----------------------------------------------------------------------
  // loadStore resilience
  // -----------------------------------------------------------------------

  describe('loadStore resilience', () => {
    it('handles corrupt JSON in localStorage gracefully', () => {
      localStorage.setItem('webssh2.hostkeys', '{{{not valid json')
      // Should not throw; should return empty
      const all = getAll()
      assert.deepEqual(all, {})
    })

    it('handles wrong version number', () => {
      localStorage.setItem(
        'webssh2.hostkeys',
        JSON.stringify({
          version: 999,
          keys: {
            'host.example:22': {
              'ssh-ed25519': {
                key: VALID_KEY,
                addedAt: '2025-01-01T00:00:00.000Z'
              }
            }
          }
        })
      )
      // Wrong version should reset to empty
      const all = getAll()
      assert.deepEqual(all, {})
    })

    it('handles missing keys field', () => {
      localStorage.setItem(
        'webssh2.hostkeys',
        JSON.stringify({
          version: 1
        })
      )
      // Missing keys field should reset to empty
      const all = getAll()
      assert.deepEqual(all, {})
    })
  })
})
