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
  { name: 'Default', theme: {} },
  {
    name: 'Dracula',
    theme: {
      background: '#282a36',
      foreground: '#f8f8f2',
      cursor: '#f8f8f2',
      selectionBackground: '#44475a',
      black: '#21222c',
      red: '#ff5555',
      green: '#50fa7b',
      yellow: '#f1fa8c',
      blue: '#bd93f9',
      magenta: '#ff79c6',
      cyan: '#8be9fd',
      white: '#f8f8f2',
      brightBlack: '#6272a4',
      brightRed: '#ff6e6e',
      brightGreen: '#69ff94',
      brightYellow: '#ffffa5',
      brightBlue: '#d6acff',
      brightMagenta: '#ff92df',
      brightCyan: '#a4ffff',
      brightWhite: '#ffffff'
    },
    license: 'MIT',
    source: 'https://github.com/dracula/dracula-theme'
  },
  {
    name: 'Nord',
    theme: {
      background: '#2e3440',
      foreground: '#d8dee9',
      cursor: '#d8dee9',
      selectionBackground: '#434c5e',
      black: '#3b4252',
      red: '#bf616a',
      green: '#a3be8c',
      yellow: '#ebcb8b',
      blue: '#81a1c1',
      magenta: '#b48ead',
      cyan: '#88c0d0',
      white: '#e5e9f0',
      brightBlack: '#4c566a',
      brightRed: '#bf616a',
      brightGreen: '#a3be8c',
      brightYellow: '#ebcb8b',
      brightBlue: '#81a1c1',
      brightMagenta: '#b48ead',
      brightCyan: '#8fbcbb',
      brightWhite: '#eceff4'
    },
    license: 'MIT',
    source: 'https://github.com/nordtheme/nord'
  },
  {
    name: 'Solarized Dark',
    theme: {
      background: '#002b36',
      foreground: '#839496',
      cursor: '#839496',
      selectionBackground: '#073642',
      black: '#073642',
      red: '#dc322f',
      green: '#859900',
      yellow: '#b58900',
      blue: '#268bd2',
      magenta: '#d33682',
      cyan: '#2aa198',
      white: '#eee8d5',
      brightBlack: '#586e75',
      brightRed: '#cb4b16',
      brightGreen: '#586e75',
      brightYellow: '#657b83',
      brightBlue: '#839496',
      brightMagenta: '#6c71c4',
      brightCyan: '#93a1a1',
      brightWhite: '#fdf6e3'
    },
    license: 'MIT',
    source: 'https://github.com/altercation/solarized'
  },
  {
    name: 'One Dark',
    theme: {
      background: '#282c34',
      foreground: '#abb2bf',
      cursor: '#528bff',
      selectionBackground: '#3e4451',
      black: '#282c34',
      red: '#e06c75',
      green: '#98c379',
      yellow: '#e5c07b',
      blue: '#61afef',
      magenta: '#c678dd',
      cyan: '#56b6c2',
      white: '#abb2bf',
      brightBlack: '#5c6370',
      brightRed: '#e06c75',
      brightGreen: '#98c379',
      brightYellow: '#e5c07b',
      brightBlue: '#61afef',
      brightMagenta: '#c678dd',
      brightCyan: '#56b6c2',
      brightWhite: '#ffffff'
    },
    license: 'MIT',
    source: 'https://github.com/atom/atom/tree/master/packages/one-dark-syntax'
  },
  {
    name: 'Monokai',
    theme: {
      background: '#272822',
      foreground: '#f8f8f2',
      cursor: '#f8f8f0',
      selectionBackground: '#49483e',
      black: '#272822',
      red: '#f92672',
      green: '#a6e22e',
      yellow: '#f4bf75',
      blue: '#66d9ef',
      magenta: '#ae81ff',
      cyan: '#a1efe4',
      white: '#f8f8f2',
      brightBlack: '#75715e',
      brightRed: '#f92672',
      brightGreen: '#a6e22e',
      brightYellow: '#f4bf75',
      brightBlue: '#66d9ef',
      brightMagenta: '#ae81ff',
      brightCyan: '#a1efe4',
      brightWhite: '#f9f8f5'
    },
    license: 'MIT',
    source: 'https://github.com/oneKelvinSmith/monokai-emacs'
  },
  {
    name: 'Gruvbox Dark',
    theme: {
      background: '#282828',
      foreground: '#ebdbb2',
      cursor: '#ebdbb2',
      selectionBackground: '#504945',
      black: '#282828',
      red: '#cc241d',
      green: '#98971a',
      yellow: '#d79921',
      blue: '#458588',
      magenta: '#b16286',
      cyan: '#689d6a',
      white: '#a89984',
      brightBlack: '#928374',
      brightRed: '#fb4934',
      brightGreen: '#b8bb26',
      brightYellow: '#fabd2f',
      brightBlue: '#83a598',
      brightMagenta: '#d3869b',
      brightCyan: '#8ec07c',
      brightWhite: '#ebdbb2'
    },
    license: 'MIT',
    source: 'https://github.com/morhetz/gruvbox'
  },
  {
    name: 'Tokyo Night',
    theme: {
      background: '#1a1b26',
      foreground: '#c0caf5',
      cursor: '#c0caf5',
      selectionBackground: '#33467c',
      black: '#15161e',
      red: '#f7768e',
      green: '#9ece6a',
      yellow: '#e0af68',
      blue: '#7aa2f7',
      magenta: '#bb9af7',
      cyan: '#7dcfff',
      white: '#a9b1d6',
      brightBlack: '#414868',
      brightRed: '#f7768e',
      brightGreen: '#9ece6a',
      brightYellow: '#e0af68',
      brightBlue: '#7aa2f7',
      brightMagenta: '#bb9af7',
      brightCyan: '#7dcfff',
      brightWhite: '#c0caf5'
    },
    license: 'MIT',
    source: 'https://github.com/enkia/tokyo-night-vscode-theme'
  },
  {
    name: 'Catppuccin Mocha',
    theme: {
      background: '#1e1e2e',
      foreground: '#cdd6f4',
      cursor: '#f5e0dc',
      selectionBackground: '#585b70',
      black: '#45475a',
      red: '#f38ba8',
      green: '#a6e3a1',
      yellow: '#f9e2af',
      blue: '#89b4fa',
      magenta: '#f5c2e7',
      cyan: '#94e2d5',
      white: '#bac2de',
      brightBlack: '#585b70',
      brightRed: '#f38ba8',
      brightGreen: '#a6e3a1',
      brightYellow: '#f9e2af',
      brightBlue: '#89b4fa',
      brightMagenta: '#f5c2e7',
      brightCyan: '#94e2d5',
      brightWhite: '#a6adc8'
    },
    license: 'MIT',
    source: 'https://github.com/catppuccin/catppuccin'
  }
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

  // Merge with deduplication by canonical name. Additional themes override
  // builtins of the same name so deployments can replace shipped palettes.
  const merged = new Map<string, NamedTheme>()
  for (const t of builtinThemes) {
    merged.set(canonicalizeThemeName(t.name), t)
  }
  for (const t of additional) {
    merged.set(canonicalizeThemeName(t.name), t)
  }
  const all: readonly NamedTheme[] = Array.from(merged.values())

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
