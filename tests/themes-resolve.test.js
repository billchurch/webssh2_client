/**
 * Tests for resolveTheme / getAvailableThemes.
 *
 * Task 15 only ships the `Default` builtin. To exercise filtering with two
 * available themes, we add one extra theme via the cfg's additionalThemes.
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { register } from 'node:module'
import { pathToFileURL } from 'node:url'

await register('./tests/ts-loader.mjs', pathToFileURL('./'))

const { resolveTheme, getAvailableThemes, builtinThemes } =
  await import('../client/src/utils/themes.ts')

describe('resolveTheme', () => {
  it('falls back to {} when name is unknown', () => {
    const theme = resolveTheme('Unknown', null, builtinThemes)
    assert.deepStrictEqual(theme, {})
  })

  it('returns customTheme when name === "custom"', () => {
    const custom = { background: '#111111' }
    const theme = resolveTheme('custom', custom, builtinThemes)
    assert.deepStrictEqual(theme, { background: '#111111' })
  })

  it('returns the matching named theme', () => {
    const theme = resolveTheme('Default', null, builtinThemes)
    assert.deepStrictEqual(theme, {})
  })
})

describe('getAvailableThemes', () => {
  it('returns full builtin list when themes is null', () => {
    const cfg = {
      enabled: true,
      allowCustom: true,
      themes: null,
      additionalThemes: [],
      defaultTheme: 'Default',
      headerBackground: 'independent'
    }
    const list = getAvailableThemes(cfg)
    assert.ok(list.length >= 1)
    assert.ok(list.some((t) => t.name === 'Default'))
  })

  it('filters by themes allowlist and merges additionalThemes', () => {
    const cfg = {
      enabled: true,
      allowCustom: true,
      themes: ['Default', 'Dracula'],
      additionalThemes: [
        { name: 'Dracula', colors: { background: '#282a36' } }
      ],
      defaultTheme: 'Default',
      headerBackground: 'independent'
    }
    const list = getAvailableThemes(cfg)
    assert.strictEqual(list.length, 2)
    const names = list.map((t) => t.name).sort()
    assert.deepStrictEqual(names, ['Default', 'Dracula'])
  })

  it('returns [] when theming is disabled', () => {
    const cfg = { enabled: false }
    const list = getAvailableThemes(cfg)
    assert.deepStrictEqual(list, [])
  })
})
