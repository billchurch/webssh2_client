/**
 * Tests that credentials passed as URL parameters are removed from the
 * address bar once the config store has read them, while their values
 * stay available in memory for auto-connect.
 */

import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { register } from 'node:module'
import { pathToFileURL } from 'node:url'
import { JSDOM } from 'jsdom'

await register('./tests/ts-loader.mjs', pathToFileURL('./'))

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'https://gateway.example.test/ssh/'
})
globalThis.window = dom.window
globalThis.document = dom.window.document

const {
  initializeConfig,
  initializeUrlParams,
  configWithUrlOverrides,
  urlParams,
  resetRetainedUrlCredentials
} = await import('../client/src/stores/config.ts')

const PASSWORD = 'S3cret Password&more'
const PRIVATE_KEY =
  '-----BEGIN OPENSSH PRIVATE KEY-----\nKEYMATERIAL\n-----END OPENSSH PRIVATE KEY-----'
const PASSPHRASE = 'hunter2'

const navigate = (search, hash = '') => {
  dom.reconfigure({
    url: `https://gateway.example.test/ssh/host/10.0.0.1${search}${hash}`
  })
}

// The gateway injects config as a JSON data block (#179)
const setInjectedConfig = (value) => {
  document.getElementById('webssh2-config')?.remove()
  const block = document.createElement('script')
  block.type = 'application/json'
  block.id = 'webssh2-config'
  block.textContent = JSON.stringify(value)
  document.body.append(block)
}

const allMethodsConfig = {
  allowedAuthMethods: ['password', 'publickey', 'keyboard-interactive']
}

describe('URL credential scrubbing', () => {
  let replaceCalls
  let originalReplaceState

  beforeEach(() => {
    resetRetainedUrlCredentials()
    setInjectedConfig(allMethodsConfig)
    replaceCalls = 0
    if (originalReplaceState === undefined) {
      originalReplaceState = dom.window.history.replaceState.bind(
        dom.window.history
      )
      dom.window.history.replaceState = (...args) => {
        replaceCalls += 1
        return originalReplaceState(...args)
      }
    }
  })

  it('removes password, privateKey and passphrase from the address bar', () => {
    const params = new URLSearchParams({
      host: '10.0.0.1',
      username: 'demo',
      password: PASSWORD,
      privateKey: PRIVATE_KEY,
      passphrase: PASSPHRASE,
      sshterm: 'xterm-256color'
    })
    navigate(`?${params.toString()}`, '#frag')

    initializeConfig()

    const current = new URL(dom.window.location.href)
    assert.equal(current.searchParams.get('password'), null)
    assert.equal(current.searchParams.get('privateKey'), null)
    assert.equal(current.searchParams.get('passphrase'), null)
    assert.ok(!dom.window.location.href.includes('S3cret'))
    assert.ok(!dom.window.location.href.includes('KEYMATERIAL'))
    assert.ok(!dom.window.location.href.includes('hunter2'))

    // Everything else is left as it was
    assert.equal(current.pathname, '/ssh/host/10.0.0.1')
    assert.equal(current.hash, '#frag')
    assert.equal(current.searchParams.get('host'), '10.0.0.1')
    assert.equal(current.searchParams.get('username'), 'demo')
    assert.equal(current.searchParams.get('sshterm'), 'xterm-256color')
    assert.equal(replaceCalls, 1)
  })

  it('keeps the scrubbed credentials in memory for auto-connect', () => {
    const params = new URLSearchParams({
      host: '10.0.0.1',
      username: 'demo',
      password: PASSWORD,
      privateKey: PRIVATE_KEY,
      passphrase: PASSPHRASE
    })
    navigate(`?${params.toString()}`)

    initializeConfig()
    const cleanup = initializeUrlParams()
    try {
      const merged = configWithUrlOverrides()
      assert.equal(merged.autoConnect, true)
      assert.equal(merged.ssh.password, PASSWORD)
      assert.equal(merged.ssh.privateKey, PRIVATE_KEY)
      assert.equal(merged.ssh.passphrase, PASSPHRASE)
    } finally {
      cleanup()
    }
  })

  it('keeps the credentials after a popstate re-reads the clean URL', () => {
    navigate(`?host=10.0.0.1&password=${encodeURIComponent(PASSWORD)}`)

    initializeConfig()
    const cleanup = initializeUrlParams()
    try {
      dom.window.dispatchEvent(new dom.window.PopStateEvent('popstate'))
      assert.equal(urlParams().get('password'), PASSWORD)
      assert.equal(configWithUrlOverrides().ssh.password, PASSWORD)
      assert.equal(new URL(dom.window.location.href).search, '?host=10.0.0.1')
    } finally {
      cleanup()
    }
  })

  it('scrubs credentials even when the auth method is disabled', () => {
    setInjectedConfig({ allowedAuthMethods: ['keyboard-interactive'] })
    navigate(`?host=10.0.0.1&password=${encodeURIComponent(PASSWORD)}`)

    initializeConfig()

    assert.ok(!dom.window.location.href.includes('S3cret'))
    assert.equal(configWithUrlOverrides().ssh.password, null)
  })

  it('leaves the history entry alone when no credentials are present', () => {
    navigate('?host=10.0.0.1&username=demo')

    initializeConfig()

    assert.equal(replaceCalls, 0)
    assert.equal(
      dom.window.location.href,
      'https://gateway.example.test/ssh/host/10.0.0.1?host=10.0.0.1&username=demo'
    )
  })
})
