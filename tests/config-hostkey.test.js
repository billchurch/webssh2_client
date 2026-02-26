/**
 * Tests that loadServerAuthMethods() consumes hostKeyVerification
 * from the HTTP response and sets the signal.
 */

import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { register } from 'node:module'
import { pathToFileURL } from 'node:url'

await register('./tests/ts-loader.mjs', pathToFileURL('./'))

const { loadServerAuthMethods } =
  await import('../client/src/services/config.ts')
const { config, setConfig } = await import('../client/src/stores/config.ts')
const { hostKeyVerifyConfig, setHostKeyVerifyConfig } =
  await import('../client/src/stores/terminal.ts')

const cloneConfig = () =>
  typeof structuredClone === 'function'
    ? structuredClone(config())
    : JSON.parse(JSON.stringify(config()))

describe('hostKeyVerification config loading', () => {
  let initialConfig
  let originalFetch

  beforeEach(() => {
    initialConfig = cloneConfig()
    originalFetch = global.fetch
    setHostKeyVerifyConfig(null)
  })

  afterEach(() => {
    setConfig(initialConfig)
    setHostKeyVerifyConfig(null)
    if (originalFetch) {
      global.fetch = originalFetch
    } else {
      delete global.fetch
    }
  })

  it('stores hostKeyVerification config when present in server response', async () => {
    global.fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        allowedAuthMethods: ['password'],
        hostKeyVerification: {
          enabled: true,
          clientStoreEnabled: true,
          unknownKeyAction: 'prompt'
        }
      })
    })

    await loadServerAuthMethods()

    const cfg = hostKeyVerifyConfig()
    assert.ok(cfg !== null)
    assert.equal(cfg.enabled, true)
    assert.equal(cfg.clientStoreEnabled, true)
    assert.equal(cfg.unknownKeyAction, 'prompt')
  })

  it('does not set hostKeyVerifyConfig when field is absent', async () => {
    global.fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        allowedAuthMethods: ['password']
      })
    })

    await loadServerAuthMethods()

    assert.equal(hostKeyVerifyConfig(), null)
  })

  it('does not set hostKeyVerifyConfig on fetch failure', async () => {
    global.fetch = async () => {
      throw new Error('network down')
    }

    await loadServerAuthMethods()

    assert.equal(hostKeyVerifyConfig(), null)
  })

  it('preserves correct values (enabled, clientStoreEnabled, unknownKeyAction)', async () => {
    global.fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        allowedAuthMethods: ['password', 'publickey'],
        hostKeyVerification: {
          enabled: false,
          clientStoreEnabled: false,
          unknownKeyAction: 'reject'
        }
      })
    })

    await loadServerAuthMethods()

    const cfg = hostKeyVerifyConfig()
    assert.ok(cfg !== null)
    assert.equal(cfg.enabled, false)
    assert.equal(cfg.clientStoreEnabled, false)
    assert.equal(cfg.unknownKeyAction, 'reject')
  })
})
