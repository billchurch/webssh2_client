// client
// client/src/utils/shift-enter.ts
//
// Pure logic for the config-gated Shift+Enter → ESC+CR remap
// (billchurch/webssh2#497). In classic VT100 emulation Shift+Enter and
// Enter both produce \r, so TUIs cannot tell them apart. TUIs like
// Claude Code treat ESC+CR as "insert newline". Interim shim until a
// stable xterm.js ships Kitty keyboard protocol support.

export const SHIFT_ENTER_SEQUENCE = '\u001b\r'

export interface ShiftEnterKeyEvent {
  readonly type: string
  readonly key: string
  readonly shiftKey: boolean
  readonly ctrlKey: boolean
  readonly altKey: boolean
  readonly metaKey: boolean
}

export function isShiftEnterEvent(event: ShiftEnterKeyEvent): boolean {
  return (
    event.key === 'Enter' &&
    event.shiftKey &&
    !event.ctrlKey &&
    !event.altKey &&
    !event.metaKey
  )
}

export function resolveShiftEnterNewline(
  stored: unknown,
  injected: unknown
): boolean {
  if (typeof stored === 'boolean') {
    return stored
  }
  if (typeof injected === 'boolean') {
    return injected
  }
  return false
}

export interface ShiftEnterDeps {
  readonly isEnabled: () => boolean
  readonly emit: (data: string) => void
}

/**
 * Body for terminal.attachCustomKeyEventHandler. Return value contract:
 * false → xterm must NOT process the event, true → normal handling.
 *
 * Consumes both keydown and keypress for the Shift+Enter shape (so
 * xterm cannot also emit \r) but sends the sequence only once, on
 * keydown.
 */
export function handleShiftEnterKeyEvent(
  event: ShiftEnterKeyEvent,
  deps: ShiftEnterDeps
): boolean {
  if (!isShiftEnterEvent(event)) {
    return true
  }
  if (!deps.isEnabled()) {
    return true
  }
  if (event.type === 'keydown') {
    deps.emit(SHIFT_ENTER_SEQUENCE)
  }
  return false
}
