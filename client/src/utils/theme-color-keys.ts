// client/src/utils/theme-color-keys.ts
import type { ITheme } from '@xterm/xterm'

export const THEME_COLOR_KEYS: readonly (keyof ITheme)[] = [
  'background',
  'foreground',
  'cursor',
  'cursorAccent',
  'selectionBackground',
  'selectionForeground',
  'selectionInactiveBackground',
  'black',
  'red',
  'green',
  'yellow',
  'blue',
  'magenta',
  'cyan',
  'white',
  'brightBlack',
  'brightRed',
  'brightGreen',
  'brightYellow',
  'brightBlue',
  'brightMagenta',
  'brightCyan',
  'brightWhite'
] as const

export const THEME_COLOR_KEY_SET: ReadonlySet<keyof ITheme> = new Set(
  THEME_COLOR_KEYS
)
