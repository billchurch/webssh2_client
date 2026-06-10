/**
 * Tests for the CSP-compatible runtime config reader.
 *
 * Runtime config is injected by the webssh2 gateway. The CSP-compatible
 * path is a `<script type="application/json" id="webssh2-config">` data
 * block; the legacy path is an inline script assigning
 * `window.webssh2Config`. The reader must prefer the JSON block and fall
 * back to the window global so the client keeps working with gateways
 * that still use the legacy placeholder.
 */

import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { register } from 'node:module'
import { pathToFileURL } from 'node:url'
import { JSDOM } from 'jsdom'

await register('./tests/ts-loader.mjs', pathToFileURL('./'))

const dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>')
globalThis.window = dom.window
globalThis.document = dom.window.document

const { readInjectedConfig } =
  await import('../client/src/utils/injected-config.ts')

const setConfigBlock = (content, { type = 'application/json' } = {}) => {
  const script = dom.window.document.createElement('script')
  if (type !== null) {
    script.setAttribute('type', type)
  }
  script.setAttribute('id', 'webssh2-config')
  script.textContent = content
  dom.window.document.head.appendChild(script)
  return script
}

describe('readInjectedConfig', () => {
  beforeEach(() => {
    delete dom.window.webssh2Config
    const existing = dom.window.document.getElementById('webssh2-config')
    if (existing) {
      existing.remove()
    }
  })

  it('reads config from the JSON data block', () => {
    setConfigBlock(
      '{"socket":{"url":"http://gw:2222","path":"/ssh/socket.io"}}'
    )
    assert.deepStrictEqual(readInjectedConfig(), {
      socket: { url: 'http://gw:2222', path: '/ssh/socket.io' }
    })
  })

  it('prefers the JSON block over window.webssh2Config', () => {
    setConfigBlock('{"ssh":{"port":2022}}')
    dom.window.webssh2Config = { ssh: { port: 22 } }
    assert.deepStrictEqual(readInjectedConfig(), { ssh: { port: 2022 } })
  })

  it('falls back to window.webssh2Config when the block is absent', () => {
    dom.window.webssh2Config = { ssh: { port: 2222 } }
    assert.deepStrictEqual(readInjectedConfig(), { ssh: { port: 2222 } })
  })

  it('falls back when the block holds the unreplaced "null" placeholder', () => {
    setConfigBlock('null')
    dom.window.webssh2Config = { autoConnect: true }
    assert.deepStrictEqual(readInjectedConfig(), { autoConnect: true })
  })

  it('falls back on malformed JSON', () => {
    setConfigBlock('{not json!')
    dom.window.webssh2Config = { logLevel: 'debug' }
    assert.deepStrictEqual(readInjectedConfig(), { logLevel: 'debug' })
  })

  it('falls back when the block parses to a non-object', () => {
    setConfigBlock('"just a string"')
    dom.window.webssh2Config = { logLevel: 'info' }
    assert.deepStrictEqual(readInjectedConfig(), { logLevel: 'info' })
  })

  it('falls back when the block parses to an array', () => {
    setConfigBlock('[1,2,3]')
    dom.window.webssh2Config = { logLevel: 'info' }
    assert.deepStrictEqual(readInjectedConfig(), { logLevel: 'info' })
  })

  it('ignores an element whose type is not application/json', () => {
    setConfigBlock('{"ssh":{"port":2022}}', { type: 'text/plain' })
    dom.window.webssh2Config = { ssh: { port: 22 } }
    assert.deepStrictEqual(readInjectedConfig(), { ssh: { port: 22 } })
  })

  it('returns undefined when neither source is present', () => {
    assert.strictEqual(readInjectedConfig(), undefined)
  })

  it('parses script-safe escaped JSON (\\u003c) from the block', () => {
    setConfigBlock('{"header":{"text":"\\u003cwelcome\\u003e"}}')
    assert.deepStrictEqual(readInjectedConfig(), {
      header: { text: '<welcome>' }
    })
  })
})
