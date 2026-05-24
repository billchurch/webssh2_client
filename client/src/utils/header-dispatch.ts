import { validateHeaderBackground } from './header.js'

export interface HeaderSignal {
  text: string
  background?: string
}

export type HeaderDispatchResult =
  | { kind: 'update'; next: HeaderSignal }
  | { kind: 'noop' }

/**
 * Pure dispatch for the socket `updateUI` event's header-related elements.
 *
 * Returns either an `update` with the next signal value, or `noop` to
 * leave the current signal unchanged. The socket handler reads the
 * result and calls `setHeaderContent(next)` only on `update`.
 *
 * Validation policy:
 * - `headerBackground`: value must be a string passing
 *   `validateHeaderBackground`. Invalid → noop. Preserves existing text.
 * - `header`: object payload sets text (coerced to string) and an
 *   optional validated background. String payload sets text only.
 * - `headerStyle` and any other element: noop. The legacy
 *   `headerStyle` parameter was removed in issue #102.
 */
export function dispatchHeaderUpdate(
  element: string,
  value: unknown,
  current: HeaderSignal | null
): HeaderDispatchResult {
  switch (element) {
    case 'header': {
      if (typeof value === 'object' && value !== null) {
        const data = value as { text?: unknown; background?: unknown }
        const text = typeof data.text === 'string' ? data.text : ''
        const bg = validateHeaderBackground(data.background)
        return {
          kind: 'update',
          next: { text, ...(bg !== null ? { background: bg } : {}) }
        }
      }
      return { kind: 'update', next: { text: String(value) } }
    }
    case 'headerBackground': {
      const bg = validateHeaderBackground(value)
      if (bg === null) {
        return { kind: 'noop' }
      }
      return {
        kind: 'update',
        next: { text: current?.text ?? '', background: bg }
      }
    }
    default:
      return { kind: 'noop' }
  }
}
