/**
 * Tests for convertWindowsTerminalTheme and the validator-before-converter
 * ordering.
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { register } from 'node:module'
import { pathToFileURL } from 'node:url'

await register('./tests/ts-loader.mjs', pathToFileURL('./'))

const { convertWindowsTerminalTheme, validateThemeJson } =
  await import('../client/src/utils/themes.ts')

describe('convertWindowsTerminalTheme', () => {
  it('maps purple -> magenta', () => {
    const out = convertWindowsTerminalTheme({ purple: '#bd93f9' })
    assert.strictEqual(out.magenta, '#bd93f9')
  })

  it('maps cursorColor -> cursor', () => {
    const out = convertWindowsTerminalTheme({ cursorColor: '#ffffff' })
    assert.strictEqual(out.cursor, '#ffffff')
  })

  it('drops unknown keys', () => {
    const out = convertWindowsTerminalTheme({ purple: '#bd93f9' })
    assert.strictEqual(
      Object.prototype.hasOwnProperty.call(out, 'purple'),
      false
    )
  })
})

describe('validator runs before converter (named colors are rejected even when WT-shaped)', () => {
  it('rejects { background: "red" } before any conversion', () => {
    const result = validateThemeJson(JSON.stringify({ background: 'red' }))
    assert.strictEqual(result.ok, false)
  })
})
