// client/src/utils/theme-name.ts
/**
 * Theme name validation and canonicalization helpers.
 *
 * - THEME_NAME_REGEX: bounds the allowed character set/length so that user-
 *   or server-supplied theme names cannot smuggle HTML, scripts, or other
 *   unsafe payloads when surfaced in the UI.
 * - canonicalizeThemeName: normalizes a name for case/whitespace-insensitive
 *   lookup (NFKC + collapsed whitespace + lowercase).
 */

export const THEME_NAME_REGEX = /^[\w .\-()]{1,64}$/u

export function canonicalizeThemeName(name: string): string {
  return name.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase()
}
