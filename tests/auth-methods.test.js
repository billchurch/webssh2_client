/**
 * Tests for SSH authentication method gating and sanitization
 */

import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { register } from 'node:module'
import { pathToFileURL } from 'node:url'

await register('./tests/ts-loader.mjs', pathToFileURL('./'))

const { loadServerAuthMethods } = await import(
  '../client/src/services/config.ts'
)
const {
  allowedAuthMethods,
  sanitizeClientAuthPayload,
  config,
  setConfig,
  configWithUrlOverrides,
  setUrlParams
} = await import('../client/src/stores/config.ts')
const { DEFAULT_AUTH_METHODS } = await import('../client/src/constants.ts')

const cloneConfig = () =>
  typeof structuredClone === 'function'
    ? structuredClone(config())
    : JSON.parse(JSON.stringify(config()))

describe('Auth method configuration', () => {
  let initialConfig
  let originalFetch

  beforeEach(() => {
    initialConfig = cloneConfig()
    originalFetch = global.fetch
  })

  afterEach(() => {
    setConfig(initialConfig)
    if (originalFetch) {
      global.fetch = originalFetch
    } else {
      delete global.fetch
    }
  })

  it('loads allowed methods from server payload', async () => {
    global.fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        allowedAuthMethods: ['password', 'publickey']
      })
    })

    const result = await loadServerAuthMethods()
    assert.equal(result.ok, true)
    assert.deepEqual(allowedAuthMethods(), ['password', 'publickey'])
  })

  it('falls back to defaults on fetch failure', async () => {
    global.fetch = async () => {
      throw new Error('network down')
    }

    const result = await loadServerAuthMethods()
    assert.equal(result.ok, false)
    assert.deepEqual(allowedAuthMethods(), DEFAULT_AUTH_METHODS)
  })

  it('sanitizes disallowed credential fields', () => {
    setConfig((current) => ({
      ...current,
      allowedAuthMethods: ['password']
    }))

    const sanitized = sanitizeClientAuthPayload({
      host: 'ssh.example.test',
      username: 'demo',
      password: 'secret',
      privateKey: '-----BEGIN PRIVATE KEY-----',
      passphrase: 'hunter2'
    })

    assert.equal(sanitized.password, 'secret')
    assert.ok(!('privateKey' in sanitized))
    assert.ok(!('passphrase' in sanitized))
  })
})
describe('URL override sanitization', () => {
  let initialConfig
  beforeEach(() => {
    initialConfig = cloneConfig()
  })

  afterEach(() => {
    setConfig(initialConfig)
    setUrlParams(new URLSearchParams())
  })

  it('blocks private key overrides when method disallowed', () => {
    setConfig((current) => ({
      ...current,
      allowedAuthMethods: ['password']
    }))
    setUrlParams(
      new URLSearchParams({
        host: 'example.test',
        privateKey: '-----BEGIN PRIVATE KEY-----'
      })
    )
    const cfg = configWithUrlOverrides()
    assert.equal(cfg.autoConnect, false)
    assert.equal(cfg.ssh.privateKey ?? '', '')
  })

  it('allows auto-connect with private key when permitted', () => {
    setConfig((current) => ({
      ...current,
      allowedAuthMethods: ['publickey']
    }))
    setUrlParams(
      new URLSearchParams({
        host: 'example.test',
        privateKey: '-----BEGIN PRIVATE KEY-----'
      })
    )
    const cfg = configWithUrlOverrides()
    assert.equal(cfg.autoConnect, true)
    assert.equal(cfg.ssh.privateKey, '-----BEGIN PRIVATE KEY-----')
  })
})
