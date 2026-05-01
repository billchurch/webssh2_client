/**
 * Gates ship: every non-Default builtin theme must meet WCAG AA contrast
 * (>= 4.5) between foreground and background.
 *
 * Task 15 only adds `Default` (with empty palette), so this test loops over
 * zero entries and passes trivially. Task 16 will add the bundled themes and
 * this test starts to bite.
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { register } from 'node:module'
import { pathToFileURL } from 'node:url'

await register('./tests/ts-loader.mjs', pathToFileURL('./'))

const { builtinThemes } = await import('../client/src/utils/themes.ts')
const { contrastRatio } = await import('../client/src/utils/theme-contrast.ts')

describe('builtin theme contrast', () => {
  builtinThemes
    .filter((t) => t.name !== 'Default')
    .forEach((t) => {
      it(`${t.name} fg/bg meets WCAG AA`, () => {
        const fg = t.theme.foreground
        const bg = t.theme.background
        assert.ok(
          typeof fg === 'string' && typeof bg === 'string',
          `theme ${t.name} must define foreground and background`
        )
        const ratio = contrastRatio(fg, bg)
        assert.ok(
          ratio >= 4.5,
          `theme ${t.name} contrast ratio ${ratio.toFixed(2)} < 4.5`
        )
      })
    })

  it('test suite is reachable even with zero non-Default themes', () => {
    assert.ok(Array.isArray(builtinThemes))
  })
})
