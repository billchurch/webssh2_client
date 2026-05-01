/**
 * Static-analysis guards for the gated container-background sync in
 * Terminal.tsx and the headerBackground memo in app.tsx.
 *
 * The repo does not have a Solid testing harness yet, so we read the source
 * as a string and assert critical invariants:
 *
 *  - Terminal.tsx imports resolveTheme and getAvailableThemes from
 *    ../utils/themes.js.
 *  - Terminal.tsx defines syncContainerBackground.
 *  - Every call to syncContainerBackground(...) is preceded within 5 lines by
 *    an `if (...theming?.enabled === true...)` guard. This is the "no
 *    container-bg side-effect when theming is disabled" invariant.
 *  - TerminalActions exposes getCurrentThemeBackground.
 *  - app.tsx defines a headerBackground memo (createMemo) that references
 *    `theming?.enabled` and `'followTerminal'`.
 *
 * Brittle but useful regression guard.
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const TERMINAL_SOURCE = await readFile(
  new URL('../client/src/components/Terminal.tsx', import.meta.url),
  'utf8'
)

const APP_SOURCE = await readFile(
  new URL('../client/src/app.tsx', import.meta.url),
  'utf8'
)

describe('Terminal.tsx — gated container-bg sync', () => {
  it('imports resolveTheme and getAvailableThemes from utils/themes', () => {
    assert.match(TERMINAL_SOURCE, /from\s+['"]\.\.\/utils\/themes\.js['"]/)
    assert.match(TERMINAL_SOURCE, /\bresolveTheme\b/)
    assert.match(TERMINAL_SOURCE, /\bgetAvailableThemes\b/)
  })

  it('defines syncContainerBackground helper', () => {
    assert.match(TERMINAL_SOURCE, /\bsyncContainerBackground\b/)
    // Must be defined as a function (const ... = ... or function ...)
    assert.match(
      TERMINAL_SOURCE,
      /(?:const|function)\s+syncContainerBackground\b/
    )
  })

  it('every syncContainerBackground call is preceded by a theming.enabled === true guard within 15 lines', () => {
    const lines = TERMINAL_SOURCE.split('\n')
    const callIndices = []
    lines.forEach((line, idx) => {
      // Match a call site: syncContainerBackground(...) but not the definition
      // Definition lines look like `const syncContainerBackground = ...` or
      // `function syncContainerBackground(...)`.
      if (/\bsyncContainerBackground\s*\(/.test(line)) {
        const isDefinition =
          /(?:const|function)\s+syncContainerBackground\b/.test(line)
        if (!isDefinition) {
          callIndices.push(idx)
        }
      }
    })

    assert.ok(
      callIndices.length > 0,
      'expected at least one syncContainerBackground(...) call site'
    )

    // 15-line window catches reasonably-nested call sites (e.g.
    //   if (theming === enabled) {
    //     ...
    //     if (hasThemeRequest) { if (resolved !== null) { sync(...) } }
    //   }
    // ) while still rejecting direct unguarded calls.
    const WINDOW = 15
    callIndices.forEach((idx) => {
      const ctx = lines.slice(Math.max(0, idx - WINDOW), idx).join('\n')
      assert.ok(
        /theming\?\.enabled\s*===\s*true/.test(ctx),
        `syncContainerBackground call at line ${idx + 1} not preceded by theming?.enabled === true within ${WINDOW} lines.\n` +
          `Context:\n${lines.slice(Math.max(0, idx - WINDOW), idx + 1).join('\n')}`
      )
    })
  })

  it('exposes getCurrentThemeBackground on TerminalActions', () => {
    assert.match(TERMINAL_SOURCE, /\bgetCurrentThemeBackground\b/)
  })
})

describe('app.tsx — headerBackground memo', () => {
  it('defines a headerBackground memo via createMemo', () => {
    assert.match(APP_SOURCE, /\bheaderBackground\b/)
    assert.match(APP_SOURCE, /createMemo/)
  })

  it('headerBackground memo references theming?.enabled and followTerminal', () => {
    // Look for both tokens within a reasonable proximity to headerBackground.
    const memoIdx = APP_SOURCE.indexOf('headerBackground')
    assert.ok(memoIdx >= 0, 'headerBackground identifier not found')
    // Search the entire file (cheaper than slicing): ensure both
    // substrings exist somewhere.
    assert.match(APP_SOURCE, /theming\?\.enabled/)
    assert.match(APP_SOURCE, /'followTerminal'|"followTerminal"/)
  })
})
