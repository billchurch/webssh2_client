/**
 * Static-analysis guards for the Terminal Theme expander in
 * TerminalSettingsModal.tsx.
 *
 * The repo does not (yet) have a Solid testing harness, so we cannot mount
 * the component. Instead we read the source as a string and assert the
 * critical invariants:
 *
 *  - The picker/textarea section is gated on theming.enabled === true.
 *  - The custom textarea block is gated on allowCustom === true.
 *  - No onInput / onChange handler in the file calls props.onSave (or onSave(...)).
 *    This is the "no live-apply" invariant — Save is the only way settings
 *    are persisted/applied.
 *  - The file imports getAvailableThemes and validateThemeJson from
 *    ../utils/themes.js.
 *
 * These checks are deliberately whitespace-tolerant but still brittle to
 * heavy rewrites. A future task will add a real Solid render harness.
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const SOURCE = await readFile(
  new URL(
    '../client/src/components/TerminalSettingsModal.tsx',
    import.meta.url
  ),
  'utf8'
)

describe('TerminalSettingsModal — theming guards', () => {
  it('imports getAvailableThemes and validateThemeJson from utils/themes', () => {
    assert.match(SOURCE, /from\s+['"]\.\.\/utils\/themes\.js['"]/)
    assert.match(SOURCE, /getAvailableThemes/)
    assert.match(SOURCE, /validateThemeJson/)
  })

  it('gates the Terminal Theme expander on theming.enabled === true', () => {
    assert.match(SOURCE, /theming\?\.enabled\s*===\s*true/)
  })

  it('gates the custom textarea on allowCustom === true', () => {
    assert.match(SOURCE, /allowCustom\s*===\s*true/)
  })

  it('never calls props.onSave from input/change handlers', () => {
    // Find every onInput / onChange handler arrow body in the file. None may
    // contain props.onSave or onSave(. This is the no-live-apply invariant.
    const handlerRegex =
      /(onInput|onChange)=\{\(?[^)]*\)?\s*=>\s*\{[\s\S]*?\}\s*\}/g
    const matches = Array.from(SOURCE.matchAll(handlerRegex))
    assert.ok(
      matches.length > 0,
      'expected to find at least one onInput/onChange handler'
    )
    matches.forEach((match, index) => {
      const body = match[0]
      assert.ok(
        !body.includes('props.onSave') && !/onSave\s*\(/.test(body),
        `handler #${index} calls onSave: ${body.slice(0, 120)}`
      )
    })
  })
})
