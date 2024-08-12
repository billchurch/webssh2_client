// /client/src/js/clientlog.js

import createDebug from 'debug'
import { sessionFooter, handleError } from '.'
import { updateLogButtonState } from './dom'
import { focusTerminal } from './terminal'
import { formatDate, sanitizeHtml } from './utils'
import stateManager from './state.js'

const debug = createDebug('webssh2-client:clientlog')

/**
 * Checks if a saved session log exists and prompts the user to download it.
 */
export function checkSavedSessionLog () {
  const savedLog = window.localStorage.getItem('webssh2_session_log')
  const savedDate = window.localStorage.getItem('webssh2_session_log_date')

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

      window.localStorage.removeItem('webssh2_session_log')
      window.localStorage.removeItem('webssh2_session_log_date')
    }
  }
}

/**
 * Toggles the session log enable state and updates the log button state.
 * If session log is enabled, it starts the log and updates the log start time.
 * If session log is disabled, it stops the log and updates the log end time.
 */
export function toggleLog (sessionLog) {
  const sessionLogEnable = stateManager.toggleSessionLogEnable()

  if (sessionLogEnable) {
    stateManager.setloggedData(true)
    const currentDate = new Date()
    updateLogButtonState(true)
    sessionLog = `Log Start for ${sessionFooter}: ${formatDate(currentDate)}\r\n\r\n`
    debug('Starting log')
  } else {
    const loggedData = stateManager.getloggedData
    debug('Stopping log')
    updateLogButtonState(false)
    if (loggedData) {
      sessionLog += `\r\n\r\nLog End for ${sessionFooter}: ${formatDate(new Date())}\r\n`
      debug('Stopping log')
    } else {
      debug('Log was not actually running, resetting UI')
    }
  }
  focusTerminal()
  return (sessionLog)
}

export function downloadLog (sessionLog) {
  const loggedData = stateManager.getloggedData
  debug('downloadLog loggedData:', loggedData)
  if (loggedData) {
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

export function saveSessionLog (autoDownload = false, sessionLog, sessionLogEnable) {
  const loggedData = stateManager.getloggedData
  if (sessionLogEnable && loggedData) {
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
        window.localStorage.setItem('webssh2_session_log', cleanLog)
        window.localStorage.setItem('webssh2_session_log_date', new Date().toISOString())
        debug('Session log saved to localStorage')
      } catch (e) {
        handleError('Failed to save session log to localStorage:', e)
        saveSessionLog(true)
      }
    }
  }
}
