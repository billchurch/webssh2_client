/**
 * Tests for the CSP-compatible runtime config reader.
 *
 * Runtime config is injected by the webssh2 gateway (>= 5.1.0) into a
 * `<script type="application/json" id="webssh2-config">` data block. That
 * block is the only source: the legacy `window.webssh2Config` global is no
 * longer read, so a page without a usable block gets no injected config.
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

  it('ignores the legacy window.webssh2Config global', () => {
    setConfigBlock('{"ssh":{"port":2022}}')
    dom.window.webssh2Config = { ssh: { port: 22 } }
    assert.deepStrictEqual(readInjectedConfig(), { ssh: { port: 2022 } })
  })

  it('returns undefined when only window.webssh2Config is set', () => {
    dom.window.webssh2Config = { ssh: { port: 2222 } }
    assert.strictEqual(readInjectedConfig(), undefined)
  })

  it('returns undefined when the block holds the unreplaced "null" placeholder', () => {
    setConfigBlock('null')
    assert.strictEqual(readInjectedConfig(), undefined)
  })

  it('returns undefined for an empty block', () => {
    setConfigBlock('   ')
    assert.strictEqual(readInjectedConfig(), undefined)
  })

  it('returns undefined on malformed JSON', () => {
    setConfigBlock('{not json!')
    assert.strictEqual(readInjectedConfig(), undefined)
  })

  it('returns undefined when the block parses to a non-object', () => {
    setConfigBlock('"just a string"')
    assert.strictEqual(readInjectedConfig(), undefined)
  })

  it('returns undefined when the block parses to an array', () => {
    setConfigBlock('[1,2,3]')
    assert.strictEqual(readInjectedConfig(), undefined)
  })

  it('ignores an element whose type is not application/json', () => {
    setConfigBlock('{"ssh":{"port":2022}}', { type: 'text/plain' })
    assert.strictEqual(readInjectedConfig(), undefined)
  })

  it('returns undefined when no block is present', () => {
    assert.strictEqual(readInjectedConfig(), undefined)
  })

  it('parses script-safe escaped JSON (\\u003c) from the block', () => {
    setConfigBlock('{"header":{"text":"\\u003cwelcome\\u003e"}}')
    assert.deepStrictEqual(readInjectedConfig(), {
      header: { text: '<welcome>' }
    })
  })
})
