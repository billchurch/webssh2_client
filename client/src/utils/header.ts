import type { WebSSH2Config } from '../types/config.js'

export interface HeaderResolveResult {
  text: string
  background: string
}

export const CSS_COLOR_RE = /^[a-zA-Z0-9#(),.\s-]+$/
const DEFAULT_FALLBACK_BACKGROUND = '#000'

/**
 * Validate a CSS color string for use as a header background.
 *
 * SAFETY CONTRACT: The returned string is ONLY safe when assigned as the
 * `background-color` property via Solid's object-style style binding
 * (`style={{ 'background-color': value }}`). It is NOT safe to:
 *   - concatenate into a raw `style` attribute string
 *   - use as the `background` shorthand (allows url(), image lists)
 *   - assign to a `<style>` element's textContent
 *
 * CSS_COLOR_RE permits some function-like strings (`var(--x)`,
 * `linear-gradient(...)`, `attr(...)`) that are not valid colors. Those
 * resolve to the property's initial value when assigned via setProperty
 * on `background-color`, so they render harmlessly. Changing the binding
 * context without revisiting the regex would break this guarantee.
 *
 * In addition to the character-class check, spaces are only allowed
 * immediately following a comma (as in `rgb(0, 0, 0)`). This rejects
 * space-separated Tailwind class strings like `fixed inset-0 z-50 bg-black`
 * even though their individual characters are otherwise in the allowed set.
 */
export function validateHeaderBackground(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }
  // Reject spaces not immediately preceded by a comma (blocks Tailwind class strings)
  if (/ /.test(value) && /(?<!,) /.test(value)) {
    return null
  }
  return CSS_COLOR_RE.test(value) ? value : null
}

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

  const validated = validateHeaderBackground(rawBackground)
  const background =
    rawBackground == null
      ? DEFAULT_FALLBACK_BACKGROUND
      : (validated ?? DEFAULT_FALLBACK_BACKGROUND)

  return {
    text: text ?? '',
    background
  }
}
