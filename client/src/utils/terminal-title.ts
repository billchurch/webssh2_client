// client
// client/src/utils/terminal-title.ts
//
// Pure logic for turning a remote-set terminal title (OSC 0/2) into a
// browser tab title (billchurch/webssh2_client#166). The remote host
// controls the raw title, so it always gets a fixed prefix and is cleaned
// of characters that could hide or reorder that prefix.

export const DEFAULT_PAGE_TITLE = 'WebSSH2'
export const TERMINAL_TITLE_PREFIX = 'WebSSH2: '
export const MAX_TERMINAL_TITLE_LENGTH = 80

function isStrippedCodePoint(codePoint: number): boolean {
  return (
    // C0 controls and DEL
    codePoint <= 0x1f ||
    codePoint === 0x7f ||
    // C1 controls
    (codePoint >= 0x80 && codePoint <= 0x9f) ||
    // Bidi embeddings and overrides (LRE, RLE, PDF, LRO, RLO)
    (codePoint >= 0x202a && codePoint <= 0x202e) ||
    // Bidi isolates (LRI, RLI, FSI, PDI)
    (codePoint >= 0x2066 && codePoint <= 0x2069)
  )
}

/**
 * Removes control and bidi override characters, trims, and cuts the
 * result to MAX_TERMINAL_TITLE_LENGTH characters (code points, so a
 * surrogate pair is never split). Returns '' if nothing is left.
 */
export function sanitizeTerminalTitle(rawTitle: string): string {
  const cleaned = Array.from(rawTitle)
    .filter((char) => !isStrippedCodePoint(char.codePointAt(0) ?? 0))
    .join('')
    .trim()
  return Array.from(cleaned)
    .slice(0, MAX_TERMINAL_TITLE_LENGTH)
    .join('')
    .trimEnd()
}

/**
 * Builds the document title for a remote-set terminal title: the
 * cleaned title behind a fixed prefix, or the default page title when
 * the cleaned title is empty.
 */
export function formatTerminalTitle(rawTitle: string): string {
  const title = sanitizeTerminalTitle(rawTitle)
  return title === '' ? DEFAULT_PAGE_TITLE : `${TERMINAL_TITLE_PREFIX}${title}`
}
