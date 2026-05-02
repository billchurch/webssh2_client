/**
 * Tests for client-side theme name canonicalization and validation regex.
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { register } from 'node:module'
import { pathToFileURL } from 'node:url'

await register('./tests/ts-loader.mjs', pathToFileURL('./'))

const { THEME_NAME_REGEX, canonicalizeThemeName } =
  await import('../client/src/utils/theme-name.ts')

describe('client theme-name', () => {
  it('canonicalizes', () => {
    assert.strictEqual(canonicalizeThemeName('  Dracula  '), 'dracula')
    assert.strictEqual(canonicalizeThemeName('Tokyo  Night'), 'tokyo night')
  })

  it('regex rejects HTML bait', () => {
    assert.strictEqual(THEME_NAME_REGEX.test('Dracula'), true)
    assert.strictEqual(THEME_NAME_REGEX.test('</script>'), false)
  })
})
