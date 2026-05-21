import type { WebSSH2Config } from '../types/config.js'

export interface HeaderResolveResult {
  text: string
  background: string
}

const CSS_COLOR_RE = /^[a-zA-Z0-9#(),.\s-]+$/
const DEFAULT_FALLBACK_BACKGROUND = '#000'

/**
 * Resolve header text and background from injected server config.
 *
 * Returns null when no header is configured (omission case from server).
 * Otherwise returns a fully-resolved HeaderResolveResult with safe defaults
 * for missing fields and a defensive regex check on the background color.
 *
 * The CSS_COLOR_RE matches the server-side colorToStyle regex
 * (`app/auth/header-processor.ts` in webssh2). If the server's
 * validateCssColor is bypassed somehow, malformed values fall back to
 * '#000' rather than reaching Solid's inline style binding.
 */
export function resolveHeaderFromConfig(
  cfg: WebSSH2Config | undefined
): HeaderResolveResult | null {
  if (cfg?.header == null) {
    return null
  }
  const text = cfg.header.text
  const rawBackground = cfg.header.background
  if (text == null && rawBackground == null) {
    return null
  }

  // Validate background color with defensive regex check
  const isValidColor = rawBackground == null || CSS_COLOR_RE.test(rawBackground)
  const background = isValidColor
    ? (rawBackground ?? DEFAULT_FALLBACK_BACKGROUND)
    : DEFAULT_FALLBACK_BACKGROUND

  return {
    text: text ?? '',
    background
  }
}
