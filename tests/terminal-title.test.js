/**
 * Tests for remote-set terminal titles (billchurch/webssh2_client#166).
 * A remote host can set the tab title with OSC 0/2, so the title must
 * always carry a fixed prefix and be cleaned before it reaches
 * document.title.
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { register } from 'node:module'
import { pathToFileURL } from 'node:url'

await register('./tests/ts-loader.mjs', pathToFileURL('./'))

const {
  DEFAULT_PAGE_TITLE,
  TERMINAL_TITLE_PREFIX,
  MAX_TERMINAL_TITLE_LENGTH,
  sanitizeTerminalTitle,
  formatTerminalTitle
} = await import('../client/src/utils/terminal-title.ts')

describe('formatTerminalTitle — prefix', () => {
  it('uses the fixed WebSSH2 prefix', () => {
    assert.equal(TERMINAL_TITLE_PREFIX, 'WebSSH2: ')
    assert.equal(formatTerminalTitle('user@host: ~'), 'WebSSH2: user@host: ~')
  })

  it('keeps the prefix when the remote title imitates another site', () => {
    assert.equal(
      formatTerminalTitle('Sign in - Example Bank'),
      'WebSSH2: Sign in - Example Bank'
    )
  })

  it('keeps the prefix first even when the title tries to reorder it', () => {
    const result = formatTerminalTitle('‮evil‬')
    assert.ok(result.startsWith(TERMINAL_TITLE_PREFIX))
    assert.equal(result, 'WebSSH2: evil')
  })
})

describe('sanitizeTerminalTitle — control and bidi characters', () => {
  it('removes C0 controls and DEL', () => {
    assert.equal(
      sanitizeTerminalTitle('a\u0000b\u0007c\u001bd\u007fe'),
      'abcde'
    )
    assert.equal(sanitizeTerminalTitle('line1\nline2\ttab\r'), 'line1line2tab')
  })

  it('removes C1 controls', () => {
    assert.equal(sanitizeTerminalTitle('a\u0080b\u009bc\u009fd'), 'abcd')
  })

  it('removes bidi embeddings and overrides U+202A–U+202E', () => {
    assert.equal(sanitizeTerminalTitle('‪a‫b‬c‭d‮e'), 'abcde')
  })

  it('removes bidi isolates U+2066–U+2069', () => {
    assert.equal(sanitizeTerminalTitle('⁦a⁧b⁨c⁩d'), 'abcd')
  })

  it('keeps ordinary non-ASCII text, including astral characters', () => {
    assert.equal(sanitizeTerminalTitle('café — 日本語 🚀'), 'café — 日本語 🚀')
  })

  it('trims whitespace left after cleaning', () => {
    assert.equal(sanitizeTerminalTitle('  \u0007 vim ‮  '), 'vim')
  })
})

describe('sanitizeTerminalTitle — length limit', () => {
  it('limits titles to 80 characters', () => {
    assert.equal(MAX_TERMINAL_TITLE_LENGTH, 80)
    assert.equal(sanitizeTerminalTitle('x'.repeat(200)), 'x'.repeat(80))
  })

  it('keeps a title of exactly 80 characters', () => {
    assert.equal(sanitizeTerminalTitle('y'.repeat(80)), 'y'.repeat(80))
  })

  it('counts characters after removing control characters', () => {
    const raw = '\u0007'.repeat(50) + 'z'.repeat(80)
    assert.equal(sanitizeTerminalTitle(raw), 'z'.repeat(80))
  })

  it('does not split a surrogate pair at the limit', () => {
    const result = sanitizeTerminalTitle('🚀'.repeat(100))
    assert.equal(Array.from(result).length, 80)
    assert.equal(result, '🚀'.repeat(80))
  })

  it('does not leave trailing whitespace after cutting', () => {
    const result = sanitizeTerminalTitle('a'.repeat(79) + '   tail')
    assert.equal(result, 'a'.repeat(79))
  })

  it('applies the limit inside the full document title', () => {
    assert.equal(
      formatTerminalTitle('w'.repeat(500)),
      TERMINAL_TITLE_PREFIX + 'w'.repeat(80)
    )
  })
})

describe('formatTerminalTitle — empty titles', () => {
  it('restores the default page title for an empty title', () => {
    assert.equal(DEFAULT_PAGE_TITLE, 'WebSSH2')
    assert.equal(formatTerminalTitle(''), 'WebSSH2')
  })

  it('restores the default for whitespace-only titles', () => {
    assert.equal(formatTerminalTitle('   \t  '), 'WebSSH2')
  })

  it('restores the default when only control and bidi characters remain', () => {
    assert.equal(formatTerminalTitle('\u0007\u009b‮⁦ '), 'WebSSH2')
  })
})

const TERMINAL_SOURCE = await readFile(
  new URL('../client/src/components/Terminal.tsx', import.meta.url),
  'utf8'
)

describe('Terminal.tsx — title wiring', () => {
  it('routes OSC titles through formatTerminalTitle', () => {
    assert.match(
      TERMINAL_SOURCE,
      /from\s+['"]\.\.\/utils\/terminal-title\.js['"]/
    )
    assert.match(
      TERMINAL_SOURCE,
      /document\.title\s*=\s*formatTerminalTitle\(title\)/
    )
  })

  it('never assigns a raw title to document.title', () => {
    const assignments = TERMINAL_SOURCE.match(/document\.title\s*=[^\n]*/g)
    assert.deepEqual(assignments, [
      'document.title = formatTerminalTitle(title)'
    ])
  })
})
