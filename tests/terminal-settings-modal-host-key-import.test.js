/**
 * Static-analysis guards for the host key import confirmation in
 * TerminalSettingsModal.tsx (issue #156).
 *
 * The repo has no Solid render harness, so these read the source and assert
 * that "Replace" cannot act before the old and new fingerprints of every
 * conflict are shown. The fingerprint computation itself is tested in
 * host-key-store.test.js.
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

/** Return the source of a top-level `function name(...) { ... }` body. */
function functionBody(name) {
  const start = SOURCE.indexOf(`function ${name}(`)
  assert.ok(start !== -1, `expected function ${name}`)
  const open = SOURCE.indexOf('{', SOURCE.indexOf(')', start))
  let depth = 0
  for (let i = open; i < SOURCE.length; i++) {
    if (SOURCE[i] === '{') depth++
    if (SOURCE[i] === '}' && --depth === 0) return SOURCE.slice(open, i + 1)
  }
  assert.fail(`unterminated function ${name}`)
}

describe('TerminalSettingsModal — host key import confirmation', () => {
  it('canReplace requires a fingerprint pair for every conflict', () => {
    const start = SOURCE.indexOf('const canReplace =')
    assert.ok(start !== -1, 'expected canReplace')
    const body = SOURCE.slice(start, SOURCE.indexOf('\n\n', start))
    assert.match(body, /fingerprints\s*!==\s*null/)
    assert.match(
      body,
      /fingerprints\.length\s*===\s*pending\.plan\.conflicts\.length/
    )
  })

  it('disables the Replace button until canReplace is true', () => {
    const label = SOURCE.search(/>\s*Replace\s*</)
    assert.ok(label !== -1, 'expected a Replace button')
    const buttonStart = SOURCE.lastIndexOf('<button', label)
    const button = SOURCE.slice(buttonStart, label)
    assert.match(button, /disabled=\{!canReplace\(pending\(\)\)\}/)
    assert.match(button, /onClick=\{confirmReplace\}/)
  })

  it('confirmReplace checks canReplace before replacing', () => {
    const body = functionBody('confirmReplace')
    const guard = body.search(/!canReplace\(pending\)\)\s*return/)
    const replace = body.indexOf('finishImport(pending.plan, true)')
    assert.ok(guard !== -1, 'expected a canReplace guard')
    assert.ok(replace > guard, 'expected finishImport after the guard')
  })

  it('only confirmReplace replaces conflicts', () => {
    const calls = SOURCE.match(/finishImport\([^)]*,\s*true\)/g) ?? []
    assert.equal(calls.length, 1)
    assert.ok(functionBody('confirmReplace').includes(calls[0]))
  })

  it('shows fingerprints from fingerprintConflicts, not a fallback', () => {
    const body = functionBody('startImport')
    assert.match(body, /fingerprints:\s*null/)
    assert.match(body, /fingerprintConflicts\(plan\.conflicts\)/)
  })
})
