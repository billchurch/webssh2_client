/**
 * Tests for client-side host key store (TOFU logic)
 *
 * Covers: lookup, store, remove, getAll, exportKeys, importKeys,
 *         previewImport, applyImport, computeFingerprint, fingerprintConflicts,
 *         addManualKey, and loadStore resilience.
 */

import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { register } from 'node:module'
import { pathToFileURL } from 'node:url'
import { createHash } from 'node:crypto'

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

const {
  lookup,
  store,
  remove,
  getAll,
  exportKeys,
  importKeys,
  previewImport,
  applyImport,
  computeFingerprint,
  fingerprintConflicts,
  addManualKey
} = await import('../client/src/services/host-key-store.ts')

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VALID_KEY = btoa('some-key-data')
const VALID_KEY_2 = btoa('different-key')
const ATTACKER_KEY = btoa('attacker-key')
const ADDED_AT = '2025-01-01T00:00:00.000Z'

function importFile(keys) {
  return JSON.stringify({ version: 1, keys })
}

function sshFingerprint(base64Key) {
  const digest = createHash('sha256')
    .update(Buffer.from(base64Key, 'base64'))
    .digest('base64')
  return `SHA256:${digest}`
}

function storedRaw() {
  return JSON.parse(localStorage.getItem('webssh2.hostkeys'))
}

function assertPrototypeClean() {
  for (const name of ['ssh-ed25519', 'ssh-rsa', 'key', 'addedAt']) {
    assert.equal(
      Object.hasOwn(Object.prototype, name),
      false,
      `Object.prototype.${name} was polluted`
    )
  }
  assert.equal({}['ssh-ed25519'], undefined)
}

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

    it('returns unknown for prototype property names as algorithm', () => {
      store('host.example', 22, 'ssh-ed25519', VALID_KEY)
      for (const algo of ['constructor', '__proto__', 'toString']) {
        assert.equal(lookup('host.example', 22, algo).status, 'unknown', algo)
        assert.equal(
          lookup('host.example', 22, algo, VALID_KEY).status,
          'unknown',
          algo
        )
      }
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

    it('returns success for a valid key', () => {
      const result = store('host.example', 22, 'ssh-ed25519', VALID_KEY)
      assert.deepEqual(result, { success: true })
    })

    it('rejects an unknown algorithm without writing', () => {
      const result = store('host.example', 22, 'bogus-algo', VALID_KEY)
      assert.equal(result.success, false)
      assert.ok(result.error.includes('Invalid algorithm'))
      assert.equal(localStorage.getItem('webssh2.hostkeys'), null)
    })

    it('rejects a prototype property name as algorithm', () => {
      for (const algo of ['__proto__', 'constructor', 'prototype']) {
        const result = store('host.example', 22, algo, VALID_KEY)
        assert.equal(result.success, false, algo)
      }
      assert.equal(localStorage.getItem('webssh2.hostkeys'), null)
      assertPrototypeClean()
    })

    it('rejects a non-base64 key without writing', () => {
      const result = store('host.example', 22, 'ssh-ed25519', '!!!nope!!!')
      assert.equal(result.success, false)
      assert.ok(result.error.includes('Invalid base64'))
      assert.equal(localStorage.getItem('webssh2.hostkeys'), null)
    })

    it('rejects an empty key', () => {
      const result = store('host.example', 22, 'ssh-ed25519', '')
      assert.equal(result.success, false)
    })

    it('rejects an invalid host or port', () => {
      assert.equal(store('', 22, 'ssh-ed25519', VALID_KEY).success, false)
      assert.equal(
        store('bad host', 22, 'ssh-ed25519', VALID_KEY).success,
        false
      )
      assert.equal(
        store('__proto__', 22, 'ssh-ed25519', VALID_KEY).success,
        false
      )
      assert.equal(store('a..b', 22, 'ssh-ed25519', VALID_KEY).success, false)
      assert.equal(store('::', 22, 'ssh-ed25519', VALID_KEY).success, false)
      assert.equal(
        store('host.example', 0, 'ssh-ed25519', VALID_KEY).success,
        false
      )
      assert.equal(
        store('host.example', 65536, 'ssh-ed25519', VALID_KEY).success,
        false
      )
      assert.equal(localStorage.getItem('webssh2.hostkeys'), null)
    })

    it('accepts IPv4 and IPv6 hosts', () => {
      assert.equal(store('192.0.2.1', 22, 'ssh-rsa', VALID_KEY).success, true)
      assert.equal(store('2001:db8::1', 22, 'ssh-rsa', VALID_KEY).success, true)
      assert.equal(
        store('[2001:db8::2]', 2222, 'ssh-rsa', VALID_KEY).success,
        true
      )
      assert.equal(
        lookup('2001:db8::1', 22, 'ssh-rsa', VALID_KEY).status,
        'trusted'
      )
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

    it('reports counts for a clean import', () => {
      const result = importKeys(
        importFile({
          'host.example:22': {
            'ssh-ed25519': { key: VALID_KEY, addedAt: ADDED_AT },
            'ssh-rsa': { key: VALID_KEY_2, addedAt: ADDED_AT }
          }
        })
      )
      assert.deepEqual(result, {
        success: true,
        added: 2,
        skipped: 0,
        replaced: 0
      })
    })

    it('rejects a malformed host:port', () => {
      const bad = [
        'host.example',
        'host.example:',
        ':22',
        'host.example:0',
        'host.example:65536',
        'host.example:022',
        'host.example:22a',
        'host.example:-1',
        'bad host:22',
        'host/evil:22',
        `${'a'.repeat(254)}:22`,
        // Malformed hostnames
        'a..b:22',
        '.host.example:22',
        'host.example.:22',
        '-host.example:22',
        'host-.example:22',
        `${'a'.repeat(64)}.example:22`,
        // Malformed IPv4
        '256.0.0.1:22',
        '192.0.2:22',
        '192.0.2.1.5:22',
        '192.0.02.1:22',
        // Malformed or unspecified IPv6
        ':::22',
        '::::22',
        '1:::2:22',
        '1::2::3:22',
        '12345::1:22',
        'g::1:22',
        '1:2:3:4:5:6:7:8:9:22',
        '1:2:3:4:5:6:7:8::22',
        '::1%:22',
        '[]:22',
        '[::1:22',
        '[a..b]:22'
      ]
      for (const hostPort of bad) {
        const result = importKeys(
          importFile({
            [hostPort]: {
              'ssh-ed25519': { key: VALID_KEY, addedAt: ADDED_AT }
            }
          })
        )
        assert.equal(result.success, false, hostPort)
        assert.ok(result.error.includes('Invalid host'), hostPort)
      }
      assert.deepEqual(getAll(), {})
    })

    it('accepts hostname, IPv4 and IPv6 host:port keys', () => {
      const result = importKeys(
        importFile({
          'host.example:65535': {
            'ssh-ed25519': { key: VALID_KEY, addedAt: ADDED_AT }
          },
          '192.0.2.10:1': {
            'ssh-ed25519': { key: VALID_KEY, addedAt: ADDED_AT }
          },
          '2001:db8::1:22': {
            'ssh-ed25519': { key: VALID_KEY, addedAt: ADDED_AT }
          },
          '[2001:db8::2]:2222': {
            'ssh-ed25519': { key: VALID_KEY, addedAt: ADDED_AT }
          },
          '::1:22': {
            'ssh-ed25519': { key: VALID_KEY, addedAt: ADDED_AT }
          },
          '1:2:3:4:5:6:7:8:22': {
            'ssh-ed25519': { key: VALID_KEY, addedAt: ADDED_AT }
          },
          '::ffff:192.0.2.1:22': {
            'ssh-ed25519': { key: VALID_KEY, addedAt: ADDED_AT }
          },
          'fe80::1%eth0:22': {
            'ssh-ed25519': { key: VALID_KEY, addedAt: ADDED_AT }
          },
          'build_box.internal-net.example:22': {
            'ssh-ed25519': { key: VALID_KEY, addedAt: ADDED_AT }
          },
          'localhost:22': {
            'ssh-ed25519': { key: VALID_KEY, addedAt: ADDED_AT }
          }
        })
      )
      assert.equal(result.success, true)
      assert.equal(result.added, 10)
      assert.equal(
        lookup('2001:db8::1', 22, 'ssh-ed25519', VALID_KEY).status,
        'trusted'
      )
    })

    it('rejects a __proto__ host and leaves Object.prototype unchanged', () => {
      // A JSON literal, so "__proto__" is an own property of the parsed object
      const json = `{"version":1,"keys":{"__proto__":{"ssh-ed25519":{"key":"${ATTACKER_KEY}","addedAt":"${ADDED_AT}"}}}}`
      const result = importKeys(json)
      assert.equal(result.success, false)
      assert.ok(result.error.includes('Invalid host'))
      assertPrototypeClean()
      assert.equal(localStorage.getItem('webssh2.hostkeys'), null)
    })

    it('rejects constructor and prototype as host', () => {
      for (const name of ['constructor', 'prototype', '__proto__:22']) {
        const result = importKeys(
          importFile({
            [name]: { 'ssh-ed25519': { key: VALID_KEY, addedAt: ADDED_AT } }
          })
        )
        assert.equal(result.success, false, name)
      }
      assertPrototypeClean()
    })

    it('rejects prototype property names at every level', () => {
      const cases = [
        `{"version":1,"__proto__":{"x":1},"keys":{}}`,
        `{"version":1,"keys":{"host.example:22":{"__proto__":{"key":"${VALID_KEY}","addedAt":"${ADDED_AT}"}}}}`,
        `{"version":1,"keys":{"host.example:22":{"constructor":{"key":"${VALID_KEY}","addedAt":"${ADDED_AT}"}}}}`,
        `{"version":1,"keys":{"host.example:22":{"ssh-ed25519":{"key":"${VALID_KEY}","addedAt":"${ADDED_AT}","__proto__":{"polluted":true}}}}}`
      ]
      for (const json of cases) {
        const result = importKeys(json)
        assert.equal(result.success, false, json)
      }
      assertPrototypeClean()
      assert.equal({}.polluted, undefined)
      assert.equal(localStorage.getItem('webssh2.hostkeys'), null)
    })

    it('rejects non-base64 key data', () => {
      const result = importKeys(
        importFile({
          'host.example:22': {
            'ssh-ed25519': { key: '!!!not-base64!!!', addedAt: ADDED_AT }
          }
        })
      )
      assert.equal(result.success, false)
      assert.ok(result.error.includes('Invalid base64'))
    })

    it('rejects array values where objects are expected', () => {
      assert.equal(
        importKeys(JSON.stringify({ version: 1, keys: [] })).success,
        false
      )
      assert.equal(
        importKeys(importFile({ 'host.example:22': [] })).success,
        false
      )
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
  // import conflicts (previewImport / applyImport)
  // -----------------------------------------------------------------------

  describe('import conflicts', () => {
    const conflictingFile = () =>
      importFile({
        'prod.example:22': {
          'ssh-ed25519': { key: ATTACKER_KEY, addedAt: ADDED_AT }
        },
        'new.example:22': {
          'ssh-ed25519': { key: VALID_KEY_2, addedAt: ADDED_AT }
        },
        'same.example:22': {
          'ssh-ed25519': { key: VALID_KEY, addedAt: ADDED_AT }
        }
      })

    beforeEach(() => {
      store('prod.example', 22, 'ssh-ed25519', VALID_KEY)
      store('same.example', 22, 'ssh-ed25519', VALID_KEY)
    })

    it('a conflict is skipped by default', () => {
      const result = importKeys(conflictingFile())
      assert.deepEqual(result, {
        success: true,
        added: 1,
        skipped: 1,
        replaced: 0
      })
      assert.equal(
        lookup('prod.example', 22, 'ssh-ed25519', VALID_KEY).status,
        'trusted'
      )
      assert.equal(
        lookup('prod.example', 22, 'ssh-ed25519', ATTACKER_KEY).status,
        'mismatch'
      )
      assert.equal(
        lookup('new.example', 22, 'ssh-ed25519', VALID_KEY_2).status,
        'trusted'
      )
    })

    it('a conflict is replaced only when confirmed', () => {
      const result = importKeys(conflictingFile(), { replaceConflicts: true })
      assert.deepEqual(result, {
        success: true,
        added: 1,
        skipped: 0,
        replaced: 1
      })
      assert.equal(
        lookup('prod.example', 22, 'ssh-ed25519', ATTACKER_KEY).status,
        'trusted'
      )
    })

    it('previewImport lists conflicts and writes nothing', () => {
      const before = localStorage.getItem('webssh2.hostkeys')
      const preview = previewImport(conflictingFile())
      assert.equal(preview.success, true)
      assert.equal(localStorage.getItem('webssh2.hostkeys'), before)

      const { plan } = preview
      assert.equal(plan.unchanged, 1)
      assert.equal(plan.additions.length, 1)
      assert.equal(plan.additions[0].hostPort, 'new.example:22')
      assert.equal(plan.conflicts.length, 1)
      assert.deepEqual(
        {
          host: plan.conflicts[0].host,
          port: plan.conflicts[0].port,
          algorithm: plan.conflicts[0].algorithm,
          existingKey: plan.conflicts[0].existingKey,
          importedKey: plan.conflicts[0].entry.key
        },
        {
          host: 'prod.example',
          port: 22,
          algorithm: 'ssh-ed25519',
          existingKey: VALID_KEY,
          importedKey: ATTACKER_KEY
        }
      )
    })

    it('identical keys and new hosts import without conflicts', () => {
      const preview = previewImport(
        importFile({
          'same.example:22': {
            'ssh-ed25519': { key: VALID_KEY, addedAt: ADDED_AT }
          },
          'prod.example:22': {
            'ssh-rsa': { key: VALID_KEY_2, addedAt: ADDED_AT }
          }
        })
      )
      assert.equal(preview.success, true)
      assert.equal(preview.plan.conflicts.length, 0)
      assert.deepEqual(applyImport(preview.plan), {
        added: 1,
        skipped: 0,
        replaced: 0
      })
    })

    it('does not replace a pin that changed after the preview', () => {
      const preview = previewImport(conflictingFile())
      // The pin changes between the preview and the user's confirmation
      store('prod.example', 22, 'ssh-ed25519', VALID_KEY_2)
      const summary = applyImport(preview.plan, { replaceConflicts: true })
      assert.equal(summary.replaced, 0)
      assert.equal(summary.skipped, 1)
      assert.equal(
        lookup('prod.example', 22, 'ssh-ed25519', VALID_KEY_2).status,
        'trusted'
      )
    })

    it('skips an addition that was pinned with another key after the preview', () => {
      const preview = previewImport(conflictingFile())
      store('new.example', 22, 'ssh-ed25519', VALID_KEY)
      const summary = applyImport(preview.plan, { replaceConflicts: true })
      assert.equal(summary.added, 0)
      assert.equal(
        lookup('new.example', 22, 'ssh-ed25519', VALID_KEY).status,
        'trusted'
      )
    })

    it('fingerprintConflicts returns old and new fingerprints in order', async () => {
      store('other.example', 22, 'ssh-rsa', VALID_KEY)
      const preview = previewImport(
        importFile({
          'prod.example:22': {
            'ssh-ed25519': { key: ATTACKER_KEY, addedAt: ADDED_AT }
          },
          'other.example:22': {
            'ssh-rsa': { key: VALID_KEY_2, addedAt: ADDED_AT }
          }
        })
      )
      assert.equal(preview.success, true)
      const fingerprints = await fingerprintConflicts(preview.plan.conflicts)
      assert.deepEqual(
        fingerprints,
        preview.plan.conflicts.map((c) => ({
          existing: sshFingerprint(c.existingKey),
          imported: sshFingerprint(c.entry.key)
        }))
      )
      assert.notEqual(fingerprints[0].existing, fingerprints[0].imported)
    })

    it('fingerprintConflicts rejects when any fingerprint cannot be computed', async () => {
      const conflicts = [
        {
          hostPort: 'prod.example:22',
          host: 'prod.example',
          port: 22,
          algorithm: 'ssh-ed25519',
          entry: { key: ATTACKER_KEY, addedAt: ADDED_AT },
          existingKey: '!!!not-base64!!!'
        }
      ]
      await assert.rejects(fingerprintConflicts(conflicts))
    })

    it('a failed preview imports nothing', () => {
      const before = localStorage.getItem('webssh2.hostkeys')
      const result = importKeys(
        importFile({
          'new.example:22': {
            'ssh-ed25519': { key: VALID_KEY_2, addedAt: ADDED_AT }
          },
          'bad host:22': {
            'ssh-ed25519': { key: VALID_KEY_2, addedAt: ADDED_AT }
          }
        })
      )
      assert.equal(result.success, false)
      assert.equal(localStorage.getItem('webssh2.hostkeys'), before)
    })
  })

  // -----------------------------------------------------------------------
  // addManualKey
  // -----------------------------------------------------------------------

  describe('computeFingerprint', () => {
    it('matches the OpenSSH SHA256 fingerprint format', async () => {
      assert.equal(
        await computeFingerprint(VALID_KEY),
        sshFingerprint(VALID_KEY)
      )
    })
  })

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

    it('ignores prototype property names already in localStorage', () => {
      localStorage.setItem(
        'webssh2.hostkeys',
        `{"version":1,"keys":{"__proto__":{"ssh-ed25519":{"key":"${VALID_KEY}","addedAt":"${ADDED_AT}"}},"host.example:22":{"constructor":{"key":"${VALID_KEY}","addedAt":"${ADDED_AT}"},"ssh-rsa":{"key":"${VALID_KEY}","addedAt":"${ADDED_AT}"}}}}`
      )
      const all = getAll()
      assert.deepEqual(Object.keys(all), ['host.example:22'])
      assert.deepEqual(Object.keys(all['host.example:22']), ['ssh-rsa'])
      store('host.example', 22, 'ssh-ed25519', VALID_KEY_2)
      assertPrototypeClean()
      assert.equal(Object.hasOwn(storedRaw().keys, '__proto__'), false)
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
