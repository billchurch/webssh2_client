// client/src/utils/theme-contrast.ts
/**
 * WCAG 2.x contrast helpers for terminal theme validation.
 *
 * All functions accept hex color strings in either #rgb or #rrggbb form and
 * return numeric luminance / contrast ratios. Used to flag low-contrast
 * theme palettes (e.g. background vs foreground) before applying them.
 */

const SHORT_HEX_LENGTH = 4
const SRGB_THRESHOLD = 0.03928
const SRGB_DIVISOR = 12.92
const SRGB_OFFSET = 0.055
const SRGB_SCALE = 1.055
const SRGB_EXPONENT = 2.4
const LUM_R = 0.2126
const LUM_G = 0.7152
const LUM_B = 0.0722
const CONTRAST_OFFSET = 0.05
const WCAG_AA_RATIO = 4.5

function expand3Hex(hex: string): string {
  if (hex.length !== SHORT_HEX_LENGTH) {
    return hex
  }
  return `#${[...hex.slice(1)].map((c) => c + c).join('')}`
}

function srgbToLinear(c: number): number {
  const x = c / 255
  if (x <= SRGB_THRESHOLD) {
    return x / SRGB_DIVISOR
  }
  return ((x + SRGB_OFFSET) / SRGB_SCALE) ** SRGB_EXPONENT
}

function relativeLuminance(hex: string): number {
  const expanded = expand3Hex(hex)
  const r = parseInt(expanded.slice(1, 3), 16)
  const g = parseInt(expanded.slice(3, 5), 16)
  const b = parseInt(expanded.slice(5, 7), 16)
  return (
    LUM_R * srgbToLinear(r) + LUM_G * srgbToLinear(g) + LUM_B * srgbToLinear(b)
  )
}

export function contrastRatio(fg: string, bg: string): number {
  const lFg = relativeLuminance(fg)
  const lBg = relativeLuminance(bg)
  const lighter = Math.max(lFg, lBg)
  const darker = Math.min(lFg, lBg)
  return (lighter + CONTRAST_OFFSET) / (darker + CONTRAST_OFFSET)
}

export function meetsWcagAA(fg: string, bg: string): boolean {
  return contrastRatio(fg, bg) >= WCAG_AA_RATIO
}
