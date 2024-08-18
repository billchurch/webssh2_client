// client
// client/src/js/clientlog.js

import createDebug from 'debug'
import { sessionFooter, handleError } from '.'
import { updatestartLogBtnState, toggleDownloadLogBtn, triggerDownload } from './dom'
import { focusTerminal } from './terminal'
import { formatDate, sanitizeHtml } from './utils'
import stateManager from './state.js'

const debug = createDebug('webssh2-client:clientlog')

const LOG_KEY = 'webssh2_session_log'
const LOG_DATE_KEY = 'webssh2_session_log_date'

/**
 * Adds content to the session log stored in LocalStorage.
 * @param {string} data - The data to log.
 */
export function addToSessionLog(data) {
  let sessionLog = window.localStorage.getItem(LOG_KEY) || ''

  // If the log was previously empty and data is being added, show the download button
  if (sessionLog === '') {
    toggleDownloadLogBtn(true)
  }

  sessionLog += data
  window.localStorage.setItem(LOG_KEY, sessionLog)
  // debug('Added data to session log')
}

/**
 * Clears the session log from LocalStorage and optionally triggers a download.
 * @param {boolean} autoDownload - If true, downloads the log before clearing.
 */
export function clearLog(autoDownload = false) {
  const sessionLog = window.localStorage.getItem(LOG_KEY)
  const loggedData = stateManager.getState('loggedData')

  const deleteLog = window.confirm('Clear the session log?')

  if (sessionLog && deleteLog) {
    // Clear the session log from LocalStorage
    window.localStorage.removeItem(LOG_KEY)
    window.localStorage.removeItem(LOG_DATE_KEY)
    toggleDownloadLogBtn(false)
    debug('Session log cleared from localStorage')
  } else {
    debug('No session log found to clear')
  }
}

/**
 * Checks if a saved session log exists and prompts the user to download it.
 */
export function checkSavedSessionLog() {
  const savedLog = window.localStorage.getItem(LOG_KEY)
  const savedDate = window.localStorage.getItem(LOG_DATE_KEY)

  if (savedLog && savedDate) {
    const restoreLog = window.confirm(
      `A saved session log from ${new Date(savedDate).toLocaleString()} was found. Would you like to download it?`
    )

    if (restoreLog) {
      const filename = `WebSSH2-Recovered-${formatDate(new Date(savedDate)).replace(/[/:\s@]/g, '')}.log`
      const blob = new Blob([sanitizeHtml(savedLog)], { type: 'text/plain' })

      triggerDownload(blob, filename)

      clearLog()
    }
  }
}

/**
 * Toggles or sets the session log enable state and updates the log button state.
 * If `forceEnable` is provided, the function will definitively enable or disable
 * the session log based on the boolean value. If `forceEnable` is not provided,
 * the function will toggle the current state.
 *
 * @param {boolean} [forceEnable] - Optional boolean to force the log to be enabled or disabled.
 */
export function toggleLog(forceEnable) {
  let sessionLogEnable

  if (typeof forceEnable === 'boolean') {
    sessionLogEnable = forceEnable
    stateManager.setState('sessionLogEnable', sessionLogEnable)
  } else {
    sessionLogEnable = stateManager.toggleState('sessionLogEnable')
  }

  const { loggedData } = stateManager.getEntireState()

  if (sessionLogEnable) {
    debug('Starting log')
    stateManager.setState('loggedData', true)
    updatestartLogBtnState(true)
    const logStartMessage = `Log Start for ${sessionFooter} - ${formatDate(new Date())}\r\n\r\n`
    addToSessionLog(logStartMessage)
    window.localStorage.setItem(LOG_DATE_KEY, new Date().toISOString())
  } else {
    debug('Stopping log')
    updatestartLogBtnState(false)
    if (loggedData) {
      const logEndMessage = `\r\n\r\nLog End for ${sessionFooter} - ${formatDate(new Date())}\r\n`
      addToSessionLog(logEndMessage)
    } else {
      debug('Log was not running, resetting UI')
    }
  }

  focusTerminal()
}

/**
 * Downloads the session log.
 * @param {boolean} [autoDownload=false] - Whether to automatically download the log.
 */
export function downloadLog(autoDownload = false) {
  const sessionLog = window.localStorage.getItem(LOG_KEY);
  const loggedData = stateManager.getState('loggedData');

  if (sessionLog && loggedData) {
    const filename = `WebSSH2-${formatDate(new Date()).replace(/[/:\s@]/g, '')}.log`;
    const cleanLog = sanitizeHtml(sessionLog);
    const blob = new Blob([cleanLog], { type: 'text/plain' });

    if (autoDownload) {
      triggerDownload(blob, filename);
    } else {
      try {
        window.localStorage.setItem(LOG_KEY, cleanLog);
        window.localStorage.setItem(LOG_DATE_KEY, new Date().toISOString());
        debug('Session log saved to localStorage');
      } catch (e) {
        handleError('Failed to save session log to localStorage:', e);
        triggerDownload(blob, filename); // Fallback to download if saving fails
      }
    }
  }
}
