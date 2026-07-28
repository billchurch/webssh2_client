/**
 * Unit tests for the pure Shift+Enter → ESC+CR remap logic
 * (billchurch/webssh2#497).
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { register } from 'node:module'
import { pathToFileURL } from 'node:url'

await register('./tests/ts-loader.mjs', pathToFileURL('./'))

const {
  SHIFT_ENTER_SEQUENCE,
  isShiftEnterEvent,
  resolveShiftEnterNewline,
  handleShiftEnterKeyEvent
} = await import('../client/src/utils/shift-enter.ts')

const keyEvent = (overrides = {}) => ({
  type: 'keydown',
  key: 'Enter',
  shiftKey: true,
  ctrlKey: false,
  altKey: false,
  metaKey: false,
  ...overrides
})

describe('SHIFT_ENTER_SEQUENCE', () => {
  it('is ESC (0x1b) followed by CR (0x0d)', () => {
    assert.equal(SHIFT_ENTER_SEQUENCE, '\u001b\r')
  })
})

describe('isShiftEnterEvent', () => {
  it('matches plain Shift+Enter', () => {
    assert.equal(isShiftEnterEvent(keyEvent()), true)
  })

  it('rejects Enter without shift', () => {
    assert.equal(isShiftEnterEvent(keyEvent({ shiftKey: false })), false)
  })

  it('rejects Ctrl+Shift+Enter', () => {
    assert.equal(isShiftEnterEvent(keyEvent({ ctrlKey: true })), false)
  })

  it('rejects Alt+Shift+Enter', () => {
    assert.equal(isShiftEnterEvent(keyEvent({ altKey: true })), false)
  })

  it('rejects Meta+Shift+Enter', () => {
    assert.equal(isShiftEnterEvent(keyEvent({ metaKey: true })), false)
  })

  it('rejects non-Enter keys', () => {
    assert.equal(isShiftEnterEvent(keyEvent({ key: 'a' })), false)
  })
})

describe('resolveShiftEnterNewline', () => {
  it('defaults to false when nothing is set', () => {
    assert.equal(resolveShiftEnterNewline(undefined, undefined), false)
  })

  it('uses the injected server value when no stored value exists', () => {
    assert.equal(resolveShiftEnterNewline(undefined, true), true)
  })

  it('lets an explicit stored value override the injected value', () => {
    assert.equal(resolveShiftEnterNewline(false, true), false)
    assert.equal(resolveShiftEnterNewline(true, false), true)
  })

  it('ignores non-boolean garbage', () => {
    assert.equal(resolveShiftEnterNewline('yes', 'true'), false)
  })
})

describe('handleShiftEnterKeyEvent', () => {
  const record = () => {
    const calls = []
    return { calls, emit: (data) => calls.push(data) }
  }

  it('emits ESC+CR and consumes keydown when enabled', () => {
    const r = record()
    const result = handleShiftEnterKeyEvent(keyEvent(), {
      isEnabled: () => true,
      emit: r.emit
    })
    assert.equal(result, false)
    assert.deepEqual(r.calls, [SHIFT_ENTER_SEQUENCE])
  })

  it('consumes the matching keypress without emitting again', () => {
    const r = record()
    const result = handleShiftEnterKeyEvent(keyEvent({ type: 'keypress' }), {
      isEnabled: () => true,
      emit: r.emit
    })
    assert.equal(result, false)
    assert.deepEqual(r.calls, [])
  })

  it('passes Shift+Enter through untouched when disabled', () => {
    const r = record()
    const result = handleShiftEnterKeyEvent(keyEvent(), {
      isEnabled: () => false,
      emit: r.emit
    })
    assert.equal(result, true)
    assert.deepEqual(r.calls, [])
  })

  it('never consults isEnabled for non-matching events', () => {
    let consulted = false
    const result = handleShiftEnterKeyEvent(keyEvent({ shiftKey: false }), {
      isEnabled: () => {
        consulted = true
        return true
      },
      emit: () => {}
    })
    assert.equal(result, true)
    assert.equal(consulted, false)
  })
})