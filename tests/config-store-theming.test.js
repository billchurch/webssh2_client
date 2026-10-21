/**
 * Tests that the client config store reads `theming` from server config
 * with replace-not-merge semantics.
 *
 * The theming field is a discriminated union; merging server-sent
 * `{ enabled: false }` with a stale `{ enabled: true, ... }` would leak
 * fields from a different shape. The store must replace, not merge.
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { register } from 'node:module'
import { pathToFileURL } from 'node:url'
import { JSDOM } from 'jsdom'

await register('./tests/ts-loader.mjs', pathToFileURL('./'))

// Set up a window before importing the store
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>')
globalThis.window = dom.window
globalThis.document = dom.window.document

const { config, initializeConfig } =
  await import('../client/src/stores/config.ts')

// Write the gateway's JSON config block (or remove it when config is null)
const setInjectedConfig = (value) => {
  dom.window.document.getElementById('webssh2-config')?.remove()
  if (value === null) {
    return
  }
  const script = dom.window.document.createElement('script')
  script.setAttribute('type', 'application/json')
  script.setAttribute('id', 'webssh2-config')
  script.textContent = JSON.stringify(value)
  dom.window.document.head.appendChild(script)
}

describe('config-store theming wiring', () => {
  it('defaults to { enabled: false }', () => {
    setInjectedConfig(null)
    initializeConfig()
    assert.deepStrictEqual(config().theming, { enabled: false })
  })

  it('replaces (not merges) theming when injected config sets it', () => {
    setInjectedConfig({
      theming: {
        enabled: true,
        allowCustom: true,
        themes: null,
        additionalThemes: [],
        defaultTheme: 'Dracula',
        headerBackground: 'independent'
      }
    })
    initializeConfig()
    assert.strictEqual(config().theming?.enabled, true)
    if (config().theming?.enabled === true) {
      assert.strictEqual(config().theming.defaultTheme, 'Dracula')
    }
  })

  it('falls back to default on malformed enabled value', () => {
    setInjectedConfig({ theming: { enabled: 'maybe' } })
    initializeConfig()
    assert.deepStrictEqual(config().theming, { enabled: false })
  })

  it('replaces (not merges) when transitioning from enabled to disabled', () => {
    setInjectedConfig({
      theming: {
        enabled: true,
        allowCustom: true,
        themes: null,
        additionalThemes: [],
        defaultTheme: 'Dracula',
        headerBackground: 'independent'
      }
    })
    initializeConfig()
    // Now switch to disabled
    setInjectedConfig({ theming: { enabled: false } })
    initializeConfig()
    // No stale fields should leak
    assert.deepStrictEqual(config().theming, { enabled: false })
  })
})
