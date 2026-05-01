/**
 * Tests for client-side theme JSON validation pipeline.
 *
 * validateThemeJson must:
 *  - accept xterm-shaped themes
 *  - accept Windows Terminal themes (and convert key names)
 *  - reject named CSS colors / non-hex values
 *  - reject unknown keys
 *  - reject prototype-pollution payloads
 *  - reject oversize input
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { register } from 'node:module'
import { pathToFileURL } from 'node:url'

await register('./tests/ts-loader.mjs', pathToFileURL('./'))

const { validateThemeJson } = await import('../client/src/utils/themes.ts')

describe('validateThemeJson', () => {
  it('accepts xterm format', () => {
    const json = JSON.stringify({
      background: '#282a36',
      foreground: '#f8f8f2'
    })
    const result = validateThemeJson(json)
    assert.strictEqual(result.ok, true)
    if (result.ok === true) {
      assert.strictEqual(result.value.background, '#282a36')
      assert.strictEqual(result.value.foreground, '#f8f8f2')
    }
  })

  it('accepts Windows Terminal format and converts purple -> magenta', () => {
    const json = JSON.stringify({
      background: '#282a36',
      purple: '#bd93f9'
    })
    const result = validateThemeJson(json)
    assert.strictEqual(result.ok, true)
    if (result.ok === true) {
      assert.strictEqual(result.value.magenta, '#bd93f9')
      assert.strictEqual(result.value.background, '#282a36')
      // ensure the original WT-only key was not leaked through
      assert.strictEqual(
        Object.prototype.hasOwnProperty.call(result.value, 'purple'),
        false
      )
    }
  })

  it('rejects named CSS color', () => {
    const json = JSON.stringify({ background: 'red' })
    const result = validateThemeJson(json)
    assert.strictEqual(result.ok, false)
  })

  it('rejects unknown key', () => {
    const json = JSON.stringify({ evil: '#000000' })
    const result = validateThemeJson(json)
    assert.strictEqual(result.ok, false)
  })

  it('rejects __proto__ injection', () => {
    const payload = '{"__proto__":{"isAdmin":true},"background":"#000000"}'
    const result = validateThemeJson(payload)
    assert.strictEqual(result.ok, false)
  })

  it('rejects oversize input (>4 KiB)', () => {
    // Build a >4 KiB JSON blob that is otherwise structurally valid.
    const big = '#'.padEnd(5000, 'a')
    const payload = JSON.stringify({ background: big })
    const result = validateThemeJson(payload)
    assert.strictEqual(result.ok, false)
  })
})
