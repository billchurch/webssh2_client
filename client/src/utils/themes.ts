import type { ITheme } from '@xterm/xterm'

export interface NamedTheme {
  name: string
  theme: ITheme
}

export interface WindowsTerminalTheme {
  name?: string
  background?: string
  foreground?: string
  cursorColor?: string
  selectionBackground?: string
  black?: string
  red?: string
  green?: string
  yellow?: string
  blue?: string
  purple?: string
  cyan?: string
  white?: string
  brightBlack?: string
  brightRed?: string
  brightGreen?: string
  brightYellow?: string
  brightBlue?: string
  brightPurple?: string
  brightCyan?: string
  brightWhite?: string
}

const HEX_COLOR_RE = /^#[0-9a-fA-F]{3,8}$/

export const builtinThemes: NamedTheme[] = [
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
    }
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
    }
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
    }
  },
  {
    name: 'Solarized Light',
    theme: {
      background: '#fdf6e3',
      foreground: '#657b83',
      cursor: '#657b83',
      selectionBackground: '#eee8d5',
      black: '#073642',
      red: '#dc322f',
      green: '#859900',
      yellow: '#b58900',
      blue: '#268bd2',
      magenta: '#d33682',
      cyan: '#2aa198',
      white: '#eee8d5',
      brightBlack: '#002b36',
      brightRed: '#cb4b16',
      brightGreen: '#586e75',
      brightYellow: '#657b83',
      brightBlue: '#839496',
      brightMagenta: '#6c71c4',
      brightCyan: '#93a1a1',
      brightWhite: '#fdf6e3'
    }
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
    }
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
    }
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
    }
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
    }
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
    }
  }
]

export function getThemeNames(): string[] {
  return builtinThemes.map((t) => t.name)
}

export function convertWindowsTerminalTheme(
  input: WindowsTerminalTheme
): ITheme {
  const theme: ITheme = {}
  if (input.background) theme.background = input.background
  if (input.foreground) theme.foreground = input.foreground
  if (input.cursorColor) theme.cursor = input.cursorColor
  if (input.selectionBackground)
    theme.selectionBackground = input.selectionBackground
  if (input.black) theme.black = input.black
  if (input.red) theme.red = input.red
  if (input.green) theme.green = input.green
  if (input.yellow) theme.yellow = input.yellow
  if (input.blue) theme.blue = input.blue
  if (input.purple) theme.magenta = input.purple
  if (input.cyan) theme.cyan = input.cyan
  if (input.white) theme.white = input.white
  if (input.brightBlack) theme.brightBlack = input.brightBlack
  if (input.brightRed) theme.brightRed = input.brightRed
  if (input.brightGreen) theme.brightGreen = input.brightGreen
  if (input.brightYellow) theme.brightYellow = input.brightYellow
  if (input.brightBlue) theme.brightBlue = input.brightBlue
  if (input.brightPurple) theme.brightMagenta = input.brightPurple
  if (input.brightCyan) theme.brightCyan = input.brightCyan
  if (input.brightWhite) theme.brightWhite = input.brightWhite
  return theme
}

function isWindowsTerminalFormat(obj: Record<string, unknown>): boolean {
  return 'purple' in obj || 'cursorColor' in obj || 'brightPurple' in obj
}

function isValidHexColor(value: unknown): boolean {
  return typeof value === 'string' && HEX_COLOR_RE.test(value)
}

const THEME_COLOR_KEYS: string[] = [
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
]

const WT_COLOR_KEYS: string[] = [
  ...THEME_COLOR_KEYS,
  'purple',
  'brightPurple',
  'cursorColor'
]

export function validateThemeJson(
  jsonString: string
): { theme: ITheme; name?: string } | { error: string } {
  if (jsonString.length > 4096) {
    return { error: 'Theme JSON exceeds 4KB size limit' }
  }

  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(jsonString) as Record<string, unknown>
  } catch {
    return { error: 'Invalid JSON' }
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { error: 'Theme must be a JSON object' }
  }

  const allowedKeys = isWindowsTerminalFormat(parsed)
    ? WT_COLOR_KEYS
    : THEME_COLOR_KEYS

  for (const [key, value] of Object.entries(parsed)) {
    if (
      key !== 'name' &&
      allowedKeys.includes(key) &&
      !isValidHexColor(value)
    ) {
      return { error: `Invalid color value for "${key}": ${String(value)}` }
    }
  }

  const name = typeof parsed['name'] === 'string' ? parsed['name'] : undefined

  if (isWindowsTerminalFormat(parsed)) {
    const result: { theme: ITheme; name?: string } = {
      theme: convertWindowsTerminalTheme(
        parsed as unknown as WindowsTerminalTheme
      )
    }
    if (name !== undefined) result.name = name
    return result
  }

  const theme: ITheme = {}
  for (const key of THEME_COLOR_KEYS) {
    const value = parsed[key]
    if (isValidHexColor(value)) {
      ;(theme as Record<string, string>)[key] = value as string
    }
  }
  const result: { theme: ITheme; name?: string } = { theme }
  if (name !== undefined) result.name = name
  return result
}

export function resolveTheme(
  themeName: string,
  customTheme?: ITheme | null
): ITheme {
  if (themeName === 'custom' && customTheme) {
    return customTheme
  }
  const found = builtinThemes.find((t) => t.name === themeName)
  if (!found || themeName === 'Default') {
    return {}
  }
  return found.theme
}
