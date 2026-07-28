/**
 * Static-analysis guards for the Shift+Enter → ESC+CR remap wiring
 * (billchurch/webssh2#497). No Solid test harness exists, so we assert
 * structural invariants on the source.
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const TERMINAL_SOURCE = await readFile(
  new URL('../client/src/components/Terminal.tsx', import.meta.url),
  'utf8'
)

describe('Terminal.tsx — Shift+Enter remap wiring', () => {
  it('imports the pure helpers from utils/shift-enter', () => {
    assert.match(TERMINAL_SOURCE, /from\s+['"]\.\.\/utils\/shift-enter\.js['"]/)
    assert.match(TERMINAL_SOURCE, /\bhandleShiftEnterKeyEvent\b/)
    assert.match(TERMINAL_SOURCE, /\bresolveShiftEnterNewline\b/)
  })

  it('attaches a custom key event handler delegating to the helper', () => {
    assert.match(
      TERMINAL_SOURCE,
      /attachCustomKeyEventHandler\(\s*\(event\)\s*=>\s*\n?\s*handleShiftEnterKeyEvent\(/
    )
  })

  it('resolves the stored setting over the injected config value', () => {
    assert.match(TERMINAL_SOURCE, /stored\.shiftEnterNewline/)
    assert.match(TERMINAL_SOURCE, /props\.config\.terminal\.shiftEnterNewline/)
  })
})

const MODAL_SOURCE = await readFile(
  new URL(
    '../client/src/components/TerminalSettingsModal.tsx',
    import.meta.url
  ),
  'utf8'
)

describe('TerminalSettingsModal.tsx — Shift+Enter setting', () => {
  it('renders a shiftEnterNewline control', () => {
    assert.match(MODAL_SOURCE, /name="shiftEnterNewline"/)
  })

  it('falls back to the injected config value when nothing is stored', () => {
    assert.match(
      MODAL_SOURCE,
      /stored\.shiftEnterNewline\s*\?\?\s*clientConfig\(\)\.terminal\.shiftEnterNewline/
    )
  })

  it('passes the setting to onSave', () => {
    assert.match(
      MODAL_SOURCE,
      /shiftEnterNewline:\s*currentSettings\.shiftEnterNewline/
    )
  })
})
