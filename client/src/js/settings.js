// client/src/js/settings.js

import createDebug from 'debug'
import { getTerminalOptions } from './terminal.js'

const debug = createDebug('webssh2-client:settings')

const STORAGE_KEY = 'webssh2.settings.global'

/**
 * Initializes the settings in localStorage with default values if they don't exist.
 * @param {Object} [config] - The configuration object
 */
export function initializeSettings(config = {}) {
  if (!localStorage.getItem(STORAGE_KEY)) {
    const defaultSettings = getTerminalOptions(config)
    saveTerminalSettings(defaultSettings)
    debug('Initialized default settings in localStorage')
  }
}

/**
 * Retrieves the terminal settings from localStorage.
 * @param {Object} [config] - The configuration object
 * @returns {Object} The terminal settings object.
 */
export function getTerminalSettings(config = {}) {
  const storedSettings = localStorage.getItem(STORAGE_KEY)
  if (storedSettings) {
    try {
      return JSON.parse(storedSettings)
    } catch (error) {
      debug('Error parsing stored settings:', error)
    }
  }
  return getTerminalOptions(config)
}

/**
 * Saves the terminal settings to localStorage.
 * @param {Object} settings - The terminal settings object to save.
 */
export function saveTerminalSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    debug('Settings saved successfully')
  } catch (error) {
    debug('Error saving settings:', error)
  }
}

/**
 * Applies the stored settings to the provided options object.
 * @param {Object} options - The options object to update.
 * @param {Object} [config] - The configuration object
 * @returns {Object} The updated options object.
 */
export function applyStoredSettings(options, config = {}) {
  const defaultOptions = getTerminalOptions(config)
  const storedSettings = getTerminalSettings(config)
  return { ...defaultOptions, ...options, ...storedSettings }
}
