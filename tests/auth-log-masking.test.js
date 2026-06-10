/**
 * Regression tests for issue #112: cleartext SSH credentials logged to
 * debug console in authenticate().
 *
 * sanitizeClientAuthPayload() only removes credentials for disallowed
 * auth methods — for allowed methods it returns password, privateKey,
 * and passphrase in cleartext. Any payload destined for debug logging
 * must go through sanitizeClientAuthPayloadForLogging(), which masks
 * the sensitive fields after sanitization.
 */

import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { register } from 'node:module'
import { pathToFileURL } from 'node:url'

await register('./tests/ts-loader.mjs', pathToFileURL('./'))

const { sanitizeClientAuthPayloadForLogging, config, setConfig } =
  await import('../client/src/stores/config.ts')

const cloneConfig = () =>
  typeof structuredClone === 'function'
    ? structuredClone(config())
    : JSON.parse(JSON.stringify(config()))

const PASSWORD = 'S3cret-Password!'
const PRIVATE_KEY =
  '-----BEGIN OPENSSH PRIVATE KEY-----\nKEYMATERIALKEYMATERIAL\n-----END OPENSSH PRIVATE KEY-----'
const PASSPHRASE = 'hunter2-passphrase'

describe('sanitizeClientAuthPayloadForLogging (issue #112)', () => {
  let initialConfig

  beforeEach(() => {
    initialConfig = cloneConfig()
  })

  afterEach(() => {
    setConfig(initialConfig)
  })

  it('emits no cleartext credentials when all auth methods are allowed', () => {
    setConfig((current) => ({
      ...current,
      allowedAuthMethods: ['password', 'publickey', 'keyboard-interactive']
    }))

    const logged = sanitizeClientAuthPayloadForLogging({
      host: 'ssh.example.test',
      username: 'demo',
      password: PASSWORD,
      privateKey: PRIVATE_KEY,
      passphrase: PASSPHRASE
    })

    const serialized = JSON.stringify(logged)
    assert.ok(
      !serialized.includes(PASSWORD),
      'password must not appear in debug output'
    )
    assert.ok(
      !serialized.includes('KEYMATERIAL'),
      'private key must not appear in debug output'
    )
    assert.ok(
      !serialized.includes(PASSPHRASE),
      'passphrase must not appear in debug output'
    )
  })

  it('preserves non-sensitive fields for debugging', () => {
    setConfig((current) => ({
      ...current,
      allowedAuthMethods: ['password']
    }))

    const logged = sanitizeClientAuthPayloadForLogging({
      host: 'ssh.example.test',
      username: 'demo',
      password: PASSWORD
    })

    assert.equal(logged.host, 'ssh.example.test')
    assert.equal(logged.username, 'demo')
  })

  it('still drops credential fields for disallowed auth methods', () => {
    setConfig((current) => ({
      ...current,
      allowedAuthMethods: ['password']
    }))

    const logged = sanitizeClientAuthPayloadForLogging({
      host: 'ssh.example.test',
      username: 'demo',
      password: PASSWORD,
      privateKey: PRIVATE_KEY,
      passphrase: PASSPHRASE
    })

    assert.ok(!('privateKey' in logged))
    assert.ok(!('passphrase' in logged))
    assert.ok(!JSON.stringify(logged).includes(PASSWORD))
  })
})
