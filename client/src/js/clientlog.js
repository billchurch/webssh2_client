// /client/src/js/clientlog.js

import createDebug from 'debug'
import { sessionFooter, handleError } from '.'
import { updateLogBtnState } from './dom'
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
export function addToSessionLog (data) {
  let sessionLog = window.localStorage.getItem(LOG_KEY) || ''
  sessionLog += data
  window.localStorage.setItem(LOG_KEY, sessionLog)
  // debug('Added data to session log')
}

/**
 * Checks if a saved session log exists and prompts the user to download it.
 */
export function checkSavedSessionLog () {
  const savedLog = window.localStorage.getItem(LOG_KEY)
  const savedDate = window.localStorage.getItem(LOG_DATE_KEY)

  if (savedLog && savedDate) {
    const restoreLog = window.confirm(`A saved session log from ${new Date(savedDate).toLocaleString()} was found. Would you like to download it?`)
    if (restoreLog) {
      const filename = `WebSSH2-Recovered-${formatDate(new Date(savedDate)).replace(/[/:\s@]/g, '')}.log`
      const blob = new Blob([savedLog], { type: 'text/plain' })

      if (window.navigator.msSaveOrOpenBlob) {
        window.navigator.msSaveBlob(blob, filename)
      } else {
        const elem = document.createElement('a')
        elem.href = URL.createObjectURL(blob)
        elem.download = filename
        document.body.appendChild(elem)
        elem.click()
        document.body.removeChild(elem)
      }

      window.localStorage.removeItem(LOG_KEY)
      window.localStorage.removeItem(LOG_DATE_KEY)
    }
  }
}

/**
 * Toggles the session log enable state and updates the log button state.
 * If session log is enabled, it starts the log and updates the log start time.
 * If session log is disabled, it stops the log and updates the log end time.
 */
export function toggleLog () {
  const sessionLogEnable = stateManager.toggleState('sessionLogEnable')
  const { loggedData } = stateManager.getEntireState()

  if (sessionLogEnable) {
    debug('Starting log')
    stateManager.setState('loggedData', true)
    updateLogBtnState(true)
    const logStartMessage = `Log Start for ${sessionFooter}: ${formatDate(new Date())}\r\n\r\n`
    addToSessionLog(logStartMessage)
    window.localStorage.setItem(LOG_DATE_KEY, new Date().toISOString())
  } else {
    debug('Stopping log')
    updateLogBtnState(false)
    if (loggedData) {
      const logEndMessage = `\r\n\r\nLog End for ${sessionFooter}: ${formatDate(new Date())}\r\n`
      addToSessionLog(logEndMessage)
    } else {
      debug('Log was not actually running, resetting UI')
    }
  }
  focusTerminal()
}

/**
 * Downloads the session log from LocalStorage.
 */
export function downloadLog () {
  const sessionLog = window.localStorage.getItem(LOG_KEY)
  const loggedData = stateManager.getState('loggedData')
  debug('downloadLog loggedData:', loggedData)
  if (loggedData && sessionLog) {
    const currentDate = new Date()
    const filename = `WebSSH2-${formatDate(currentDate).replace(/[/:\s@]/g, '')}.log`
    const cleanLog = sanitizeHtml(sessionLog)
    const blob = new Blob([cleanLog], { type: 'text/plain' })

    if (window.navigator.msSaveOrOpenBlob) {
      window.navigator.msSaveBlob(blob, filename)
    } else {
      const elem = document.createElement('a')
      elem.href = URL.createObjectURL(blob)
      elem.download = filename
      document.body.appendChild(elem)
      elem.click()
      document.body.removeChild(elem)
    }
  }
  focusTerminal()
}

/**
 * Saves the session log in LocalStorage or triggers a download.
 */
export function saveSessionLog (autoDownload = false) {
  const sessionLog = window.localStorage.getItem(LOG_KEY)
  const loggedData = stateManager.getState('loggedData')
  if (sessionLog && loggedData) {
    const filename = `WebSSH2-${formatDate(new Date()).replace(/[/:\s@]/g, '')}.log`
    const cleanLog = sanitizeHtml(sessionLog)
    const blob = new Blob([cleanLog], { type: 'text/plain' })

    if (autoDownload) {
      if (window.navigator.msSaveOrOpenBlob) {
        window.navigator.msSaveBlob(blob, filename)
      } else {
        const elem = document.createElement('a')
        elem.href = URL.createObjectURL(blob)
        elem.download = filename
        document.body.appendChild(elem)
        elem.click()
        document.body.removeChild(elem)
      }
    } else {
      try {
        window.localStorage.setItem(LOG_KEY, cleanLog)
        window.localStorage.setItem(LOG_DATE_KEY, new Date().toISOString())
        debug('Session log saved to localStorage')
      } catch (e) {
        handleError('Failed to save session log to localStorage:', e)
        saveSessionLog(true)
      }
    }
  }
}
