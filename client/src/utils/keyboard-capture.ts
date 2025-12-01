// client/src/utils/keyboard-capture.ts
import createDebug from 'debug'
import type { KeyboardCaptureSettings } from '../types/config.d'

const debug = createDebug('webssh2-client:keyboard-capture')

/**
 * Parsed representation of a keyboard shortcut
 */
export interface ParsedKeyString {
  key: string
  ctrlKey: boolean
  metaKey: boolean
  shiftKey: boolean
  altKey: boolean
}

/**
 * Parse a key string like "Escape", "Ctrl+B", "Cmd+Shift+C" into structured format
 * @param keyString - The key string to parse (e.g., "Ctrl+B", "Escape")
 * @returns Parsed key object or null if invalid
 */
export function parseKeyString(keyString: string): ParsedKeyString | null {
  if (!keyString || typeof keyString !== 'string') {
    return null
  }

  const parts = keyString
    .trim()
    .split('+')
    .map((p) => p.trim())
    .filter((p) => p.length > 0)

  if (parts.length === 0) {
    return null
  }

  const parsed: ParsedKeyString = {
    key: '',
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    altKey: false
  }

  // Process each part
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]!.toLowerCase()

    if (part === 'ctrl' || part === 'control') {
      parsed.ctrlKey = true
    } else if (part === 'cmd' || part === 'meta' || part === 'command') {
      parsed.metaKey = true
    } else if (part === 'shift') {
      parsed.shiftKey = true
    } else if (part === 'alt' || part === 'option') {
      parsed.altKey = true
    } else if (i === parts.length - 1) {
      // This is the actual key (should be the last part)
      parsed.key = part
    } else {
      // Key in the middle is invalid
      return null
    }
  }

  // Must have a key
  if (!parsed.key) {
    return null
  }

  return parsed
}

/**
 * Check if a keyboard event matches a parsed key string
 * @param event - The keyboard event to check
 * @param parsedKey - The parsed key to match against
 * @returns True if the event matches the parsed key
 */
export function matchesKeyString(
  event: KeyboardEvent,
  parsedKey: ParsedKeyString
): boolean {
  // Check the main key (case-insensitive)
  if (event.key.toLowerCase() !== parsedKey.key) {
    return false
  }

  // Check all modifier keys
  if (event.ctrlKey !== parsedKey.ctrlKey) {
    return false
  }
  if (event.metaKey !== parsedKey.metaKey) {
    return false
  }
  if (event.shiftKey !== parsedKey.shiftKey) {
    return false
  }
  if (event.altKey !== parsedKey.altKey) {
    return false
  }

  return true
}

/**
 * Check if a keyboard event should be captured by the terminal based on settings
 * @param event - The keyboard event to check
 * @param settings - The keyboard capture settings
 * @returns True if the key should be captured by the terminal (preventing UI handling)
 */
export function shouldCaptureKey(
  event: KeyboardEvent,
  settings: KeyboardCaptureSettings
): boolean {
  // Check for Escape key
  if (settings.captureEscape && event.key === 'Escape') {
    debug('Capturing Escape key for terminal')
    return true
  }

  // Check for Ctrl+B
  if (
    settings.captureCtrlB &&
    event.key.toLowerCase() === 'b' &&
    (event.ctrlKey || event.metaKey) &&
    !event.shiftKey &&
    !event.altKey
  ) {
    debug('Capturing Ctrl+B for terminal')
    return true
  }

  // Check custom capture keys
  if (settings.customCaptureKeys && settings.customCaptureKeys.length > 0) {
    for (const keyString of settings.customCaptureKeys) {
      const parsed = parseKeyString(keyString)
      if (parsed && matchesKeyString(event, parsed)) {
        debug(`Capturing custom key "${keyString}" for terminal`)
        return true
      }
    }
  }

  return false
}
