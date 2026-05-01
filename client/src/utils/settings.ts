// client
// client/src/js/settings.ts

import createDebug from 'debug'

const debug = createDebug('webssh2-client:settings')

const STORAGE_KEY = 'webssh2.settings.global'
const STORAGE_KEY_THEMING = 'webssh2.theming'

function parseStorage(key: string): Record<string, unknown> {
  const raw = localStorage.getItem(key)
  if (raw === null || raw === '') {
    return {}
  }
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    return parsed
  } catch (error) {
    console.error(`parseStorage(${key}): Error parsing stored settings:`, error)
    return {}
  }
}

export function initializeSettings(): void {
  if (localStorage.getItem(STORAGE_KEY) === null) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({}))
    debug('initializeSettings: Initialized empty settings in localStorage')
  }
  debug('initializeSettings')
}

export function getStoredSettings(): Record<string, unknown> {
  const term = parseStorage(STORAGE_KEY)
  const theme = parseStorage(STORAGE_KEY_THEMING)
  const merged = { ...term, ...theme }
  debug('getStoredSettings', merged)
  return merged
}

export function saveTerminalSettings(settings: Record<string, unknown>): void {
  try {
    const { themeName, customTheme, ...rest } = settings

    // Non-theming part — merge with existing global settings
    if (Object.keys(rest).length > 0) {
      const existing = parseStorage(STORAGE_KEY)
      const merged = { ...existing, ...rest }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
    }

    // Theming part — only write if a theming field is being set
    if (themeName !== undefined || customTheme !== undefined) {
      const existingTheming = parseStorage(STORAGE_KEY_THEMING)
      const newTheming: Record<string, unknown> = {
        ...existingTheming,
        ...(themeName !== undefined ? { themeName } : {}),
        ...(customTheme !== undefined ? { customTheme } : {})
      }
      localStorage.setItem(STORAGE_KEY_THEMING, JSON.stringify(newTheming))
    }

    debug('saveTerminalSettings split: term=%o, theme=%o', rest, {
      themeName,
      customTheme
    })
  } catch (error) {
    console.error('saveTerminalSettings', error)
  }
}

export const getLocalTerminalSettings = getStoredSettings

export function applyStoredSettings(): Record<string, unknown> {
  debug('applyStoredSettings called')
  return getStoredSettings()
}
