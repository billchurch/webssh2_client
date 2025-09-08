// client
// client/src/js/settings.ts

import createDebug from 'debug'

const debug = createDebug('webssh2-client:settings')

const STORAGE_KEY = 'webssh2.settings.global'

export function initializeSettings(): void {
  if (!localStorage.getItem(STORAGE_KEY)) {
    saveTerminalSettings({})
    debug('initializeSettings: Initialized empty settings in localStorage')
  }
  debug('initializeSettings')
}

export function getStoredSettings(): Record<string, unknown> {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>
      debug('getStoredSettings', parsed)
      return parsed
    } catch (error) {
      console.error('getStoredSettings: Error parsing stored settings:', error)
    }
  }
  return {}
}

export function saveTerminalSettings(settings: Record<string, unknown>): void {
  try {
    // Merge with existing settings to preserve other values
    const existing = getStoredSettings()
    const merged = { ...existing, ...settings }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
    debug('saveTerminalSettings', merged)
  } catch (error) {
    console.error('saveTerminalSettings', error)
  }
}

export const getLocalTerminalSettings = getStoredSettings

export function applyStoredSettings(): Record<string, unknown> {
  debug('applyStoredSettings called')
  return getStoredSettings()
}
