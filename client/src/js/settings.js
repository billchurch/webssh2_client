// client
// client/src/js/settings.js

import createDebug from 'debug'

const debug = createDebug('webssh2-client:settings')

const STORAGE_KEY = 'webssh2.settings.global'

/**
 * Initializes the settings in localStorage with default values if they don't exist.
 * @param {Object} [config] - The configuration object
 */
export function initializeSettings(config = {}) {
  if (!localStorage.getItem(STORAGE_KEY)) {
    saveTerminalSettings({})
    debug('initializeSettings: Initialized empty settings in localStorage')
  }
  debug('initializeSettings')
}

/**
 * Retrieves the terminal settings from localStorage.
 * @param {Object} [config] - The configuration object
 * @returns {Object} The terminal settings object.
 */
export function getStoredSettings() {
  const storedSettings = JSON.parse(localStorage.getItem(STORAGE_KEY))
  if (storedSettings) {
    try {
      debug('getStoredSettings', storedSettings)
      return storedSettings
    } catch (error) {
      console.error('getStoredSettings: Error parsing stored settings:', error)
    }
  }
  return {}
}

/**
 * Saves the terminal settings to localStorage.
 * @param {Object} settings - The terminal settings object to save.
 */
export function saveTerminalSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    debug('saveTerminalSettings', settings)
  } catch (error) {
    console.error('saveTerminalSettings', error)
  }
}

/**
 * Alias for getStoredSettings for backward compatibility
 */
export const getLocalTerminalSettings = getStoredSettings

/**
 * Apply stored settings (placeholder for now)
 */
export function applyStoredSettings() {
  debug('applyStoredSettings called')
  // This function might need to be implemented based on how settings are applied
  return getStoredSettings()
}

