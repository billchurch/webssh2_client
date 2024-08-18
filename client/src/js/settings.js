// client/src/js/settings.js

import createDebug from 'debug';

const debug = createDebug('webssh2-client:settings');

const STORAGE_KEY = 'webssh2.settings.global';

/**
 * Retrieves the terminal settings from localStorage.
 * @returns {Object} The terminal settings object.
 */
export function getTerminalSettings() {
  const storedSettings = localStorage.getItem(STORAGE_KEY);
  if (storedSettings) {
    try {
      return JSON.parse(storedSettings);
    } catch (error) {
      debug('Error parsing stored settings:', error);
    }
  }
  return {};
}

/**
 * Saves the terminal settings to localStorage.
 * @param {Object} settings - The terminal settings object to save.
 */
export function saveTerminalSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    debug('Settings saved successfully');
  } catch (error) {
    debug('Error saving settings:', error);
  }
}

/**
 * Applies the stored settings to the provided options object.
 * @param {Object} options - The options object to update.
 * @returns {Object} The updated options object.
 */
export function applyStoredSettings(options) {
  const storedSettings = getTerminalSettings();
  return { ...options, ...storedSettings };
}