/**
 * Accessibility guard: hand-written CSS must not remove focus outlines
 * (`outline: none` / `outline: 0`). Prefer focus-visible patterns instead.
 *
 * Replaces the stylelint `declaration-property-value-disallowed-list` rule
 * that was dropped along with stylelint.
 */

import { describe, it } from 'node:test'
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const srcDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../client/src'
)

const OUTLINE_REMOVAL =
  /(?:^|[{;\s])outline\s*:\s*(?:none|0)\s*(?:!important\s*)?(?:;|})/i

function cssFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      return entry.name === 'node_modules' ? [] : cssFiles(full)
    }
    return entry.name.endsWith('.css') ? [full] : []
  })
}

describe('CSS outline guard', () => {
  const files = cssFiles(srcDir)

  it('finds CSS sources to check', () => {
    assert.ok(files.length > 0, `no .css files under ${srcDir}`)
  })

  it('does not remove focus outlines', () => {
    const offenders = files.filter((file) => {
      const css = fs.readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
      return OUTLINE_REMOVAL.test(css)
    })
    assert.deepStrictEqual(offenders, [])
  })

  it('detects a violation', () => {
    assert.ok(OUTLINE_REMOVAL.test('a:focus { outline: none; }'))
    assert.ok(OUTLINE_REMOVAL.test('a:focus{outline:0}'))
    assert.ok(!OUTLINE_REMOVAL.test('a:focus { outline: 2px solid red; }'))
    assert.ok(!OUTLINE_REMOVAL.test('a:focus { outline-offset: 0; }'))
  })
})
