// client/src/utils/themes.ts
/**
 * Built-in xterm.js theme catalog plus the validate/convert/resolve pipeline.
 *
 * Pipeline (validateThemeJson):
 *   1. Size cap (4 KiB) on raw input
 *   2. Reject payloads containing __proto__, constructor, or prototype
 *   3. JSON.parse
 *   4. Detect Windows Terminal shape and convert before validating values
 *   5. Validate that every key is on the xterm allowlist
 *   6. Validate that every value is a hex color (#rgb / #rrggbb / #rrggbbaa)
 *
 * The "validator before converter" name reflects ordering when surfaced from
 * the user-facing entry point: a payload that fails the *value* check (e.g.
 * `{ background: 'red' }`) is rejected even if it would otherwise be a valid
 * shape after WT conversion.
 */

import type { ITheme } from '@xterm/xterm'
import { THEME_COLOR_KEYS, THEME_COLOR_KEY_SET } from './theme-color-keys.js'
import { canonicalizeThemeName, THEME_NAME_REGEX } from './theme-name.js'
import type { ClientThemingConfig } from '../types/config.d'

export interface NamedTheme {
  readonly name: string
  readonly theme: ITheme
  readonly license?: string
  readonly source?: string
}

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i
const MAX_THEME_BYTES = 4 * 1024
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

export const builtinThemes: readonly NamedTheme[] = [
  { name: 'Default', theme: {} }
] as const

export function getThemeNames(): string[] {
  return builtinThemes.map((t) => t.name)
}

export function getAvailableThemes(
  cfg: ClientThemingConfig
): readonly NamedTheme[] {
  if (cfg.enabled === false) {
    return []
  }

  const additional: NamedTheme[] = (cfg.additionalThemes ?? []).map((a) => {
    const entry: {
      name: string
      theme: ITheme
      license?: string
      source?: string
    } = {
      name: a.name,
      theme: rebuildITheme(a.colors)
    }
    if (a.license !== undefined) {
      entry.license = a.license
    }
    if (a.source !== undefined) {
      entry.source = a.source
    }
    return entry
  })

  const all: readonly NamedTheme[] = [...builtinThemes, ...additional]

  if (cfg.themes === null) {
    return all
  }

  const allow = new Set(cfg.themes.map((n) => canonicalizeThemeName(n)))
  return all.filter((t) => allow.has(canonicalizeThemeName(t.name)))
}

export function resolveTheme(
  name: string,
  customTheme: ITheme | null,
  available: readonly NamedTheme[]
): ITheme {
  if (name === 'custom' && customTheme !== null) {
    return customTheme
  }
  const canonical = canonicalizeThemeName(name)
  const match = available.find(
    (t) => canonicalizeThemeName(t.name) === canonical
  )
  if (match !== undefined) {
    return match.theme
  }
  return {}
}

export interface WindowsTerminalTheme {
  readonly background?: string
  readonly foreground?: string
  readonly cursorColor?: string
  readonly selectionBackground?: string
  readonly black?: string
  readonly red?: string
  readonly green?: string
  readonly yellow?: string
  readonly blue?: string
  readonly purple?: string
  readonly cyan?: string
  readonly white?: string
  readonly brightBlack?: string
  readonly brightRed?: string
  readonly brightGreen?: string
  readonly brightYellow?: string
  readonly brightBlue?: string
  readonly brightPurple?: string
  readonly brightCyan?: string
  readonly brightWhite?: string
}

const WT_KEY_MAP: Readonly<Record<string, keyof ITheme>> = {
  background: 'background',
  foreground: 'foreground',
  cursorColor: 'cursor',
  selectionBackground: 'selectionBackground',
  black: 'black',
  red: 'red',
  green: 'green',
  yellow: 'yellow',
  blue: 'blue',
  purple: 'magenta',
  cyan: 'cyan',
  white: 'white',
  brightBlack: 'brightBlack',
  brightRed: 'brightRed',
  brightGreen: 'brightGreen',
  brightYellow: 'brightYellow',
  brightBlue: 'brightBlue',
  brightPurple: 'brightMagenta',
  brightCyan: 'brightCyan',
  brightWhite: 'brightWhite'
}

export function convertWindowsTerminalTheme(
  input: WindowsTerminalTheme
): ITheme {
  const out: Record<string, string> = {}
  const rec = input as Record<string, unknown>
  for (const k of Object.keys(rec)) {
    if (Object.hasOwn(WT_KEY_MAP, k)) {
      const mapped = WT_KEY_MAP[k]
      const v = rec[k]
      if (mapped !== undefined && typeof v === 'string') {
        out[mapped] = v
      }
    }
  }
  return out as ITheme
}

/**
 * Rebuilds a sanitized ITheme from an arbitrary record. Drops forbidden
 * prototype-pollution keys, drops keys outside the xterm allowlist, and
 * silently drops any value that is not a hex color string.
 *
 * Used for trusted server-supplied additionalThemes (already validated
 * server-side) where we still want a defense-in-depth pass at runtime.
 */
function rebuildITheme(input: Record<string, unknown>): ITheme {
  const out: Record<string, string> = {}
  for (const key of THEME_COLOR_KEYS) {
    if (Object.hasOwn(input, key)) {
      const v = (input as Record<keyof ITheme, unknown>)[key]
      if (typeof v === 'string' && HEX.test(v)) {
        out[key] = v
      }
    }
  }
  return out as ITheme
}

export type ThemeValidationResult =
  | { ok: true; value: ITheme }
  | { ok: false; error: string }

function isWindowsTerminalShape(rec: Record<string, unknown>): boolean {
  return (
    Object.hasOwn(rec, 'cursorColor') ||
    Object.hasOwn(rec, 'purple') ||
    Object.hasOwn(rec, 'brightPurple')
  )
}

export function validateThemeJson(input: string): ThemeValidationResult {
  if (typeof input !== 'string') {
    return { ok: false, error: 'input must be a string' }
  }
  if (input.length > MAX_THEME_BYTES) {
    return {
      ok: false,
      error: `input exceeds ${MAX_THEME_BYTES} bytes`
    }
  }

  // Reject prototype-pollution payloads up front by scanning the raw text.
  // JSON.parse's own reviver would silently drop `__proto__`, but we want to
  // refuse the payload entirely so the caller knows the input was hostile.
  for (const forbidden of FORBIDDEN_KEYS) {
    if (input.includes(`"${forbidden}"`)) {
      return { ok: false, error: `forbidden key: ${forbidden}` }
    }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(input)
  } catch {
    return { ok: false, error: 'invalid JSON' }
  }

  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, error: 'theme must be an object' }
  }

  const rec = parsed as Record<string, unknown>

  // If the input looks like a Windows Terminal theme, convert key names
  // first; afterwards everything must look like an xterm theme.
  const candidate: Record<string, unknown> = isWindowsTerminalShape(rec)
    ? (convertWindowsTerminalTheme(rec as WindowsTerminalTheme) as Record<
        string,
        unknown
      >)
    : rec

  // 1. Reject any key not on the allowlist.
  for (const k of Object.keys(candidate)) {
    if (!THEME_COLOR_KEY_SET.has(k as keyof ITheme)) {
      return { ok: false, error: `unknown key: ${k}` }
    }
  }

  // 2. Validate values for allowlisted keys only.
  const out: Record<string, string> = {}
  for (const key of THEME_COLOR_KEYS) {
    if (Object.hasOwn(candidate, key)) {
      const v = (candidate as Record<keyof ITheme, unknown>)[key]
      if (typeof v !== 'string' || !HEX.test(v)) {
        return {
          ok: false,
          error: `invalid color value at ${key}: must be #rgb, #rrggbb, or #rrggbbaa`
        }
      }
      out[key] = v
    }
  }

  return { ok: true, value: out as ITheme }
}

export { THEME_NAME_REGEX, canonicalizeThemeName }
