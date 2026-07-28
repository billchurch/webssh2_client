/**
 * shiftEnterNewline default plumbing (billchurch/webssh2#497):
 * default false everywhere; injected config block reaches the merged
 * client config.
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { register } from 'node:module'
import { pathToFileURL } from 'node:url'
import { JSDOM } from 'jsdom'

await register('./tests/ts-loader.mjs', pathToFileURL('./'))

const dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>')
globalThis.window = dom.window
globalThis.document = dom.window.document

const { defaultSettings, initializeConfig } =
  await import('../client/src/utils/index.ts')
const { config } = await import('../client/src/stores/config.ts')

const setConfigBlock = (content) => {
  const script = dom.window.document.createElement('script')
  script.setAttribute('type', 'application/json')
  script.setAttribute('id', 'webssh2-config')
  script.textContent = content
  dom.window.document.head.appendChild(script)
  return script
}

describe('shiftEnterNewline defaults', () => {
  it('defaults to false in defaultSettings', () => {
    assert.equal(defaultSettings.shiftEnterNewline, false)
  })

  it('defaults to false in the config store default', () => {
    assert.equal(config().terminal.shiftEnterNewline, false)
  })

  it('initializeConfig merges an injected terminal.shiftEnterNewline', () => {
    const block = setConfigBlock(
      JSON.stringify({ terminal: { shiftEnterNewline: true } })
    )
    const merged = initializeConfig()
    assert.equal(merged.terminal.shiftEnterNewline, true)
    assert.equal(merged.terminal.cursorBlink, true)
    block.remove()
  })

  it('initializeConfig stays false without injected config', () => {
    const merged = initializeConfig()
    assert.equal(merged.terminal.shiftEnterNewline, false)
  })
})
