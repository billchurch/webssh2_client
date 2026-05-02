/**
 * Tests for WCAG contrast-ratio helper used to validate theme readability.
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { register } from 'node:module'
import { pathToFileURL } from 'node:url'

await register('./tests/ts-loader.mjs', pathToFileURL('./'))

const { contrastRatio } = await import('../client/src/utils/theme-contrast.ts')

describe('contrastRatio', () => {
  it('white/black = 21', () => {
    assert.ok(Math.abs(contrastRatio('#ffffff', '#000000') - 21) < 0.01)
  })

  it('same color = 1', () => {
    assert.ok(Math.abs(contrastRatio('#888888', '#888888') - 1) < 0.01)
  })

  it('handles 3-char hex', () => {
    assert.ok(contrastRatio('#fff', '#000') > 20)
  })
})
