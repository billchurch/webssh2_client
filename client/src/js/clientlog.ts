// client
// client/src/js/clientlog.ts

import createDebug from 'debug'
import {
  updatestartLogBtnState,
  toggleDownloadLogBtn,
  triggerDownload
} from './dom.js'
import { focusTerminal } from './terminal.js'
import { formatDate } from './utils.js'
import { state, toggleState } from './state.js'

const debug = createDebug('webssh2-client:clientlog')

const LOG_KEY = 'webssh2_session_log'
const LOG_DATE_KEY = 'webssh2_session_log_date'

let sessionFooter: string | null = null
export function setSessionFooter(footer: string | null): void {
  sessionFooter = footer
}

export function addToSessionLog(data: string): void {
  let sessionLog = window.localStorage.getItem(LOG_KEY) || ''
  if (sessionLog === '') {
    toggleDownloadLogBtn(true)
  }
  sessionLog += data
  window.localStorage.setItem(LOG_KEY, sessionLog)
}

export function clearLog(): void {
  const sessionLog = window.localStorage.getItem(LOG_KEY)
  const deleteLog = window.confirm('Clear the session log?')
  if (sessionLog && deleteLog) {
    window.localStorage.removeItem(LOG_KEY)
    window.localStorage.removeItem(LOG_DATE_KEY)
    toggleDownloadLogBtn(false)
    debug('Session log cleared from localStorage')
  } else {
    debug('No session log found to clear')
  }
}

export function checkSavedSessionLog(): void {
  const savedLog = window.localStorage.getItem(LOG_KEY)
  const savedDate = window.localStorage.getItem(LOG_DATE_KEY)
  if (savedLog && savedDate) {
    const restoreLog = window.confirm(
      `A saved session log from ${new Date(savedDate).toLocaleString()} was found. Would you like to download it?`
    )
    if (restoreLog) {
      const filename = `WebSSH2-Recovered-${formatDate(new Date(savedDate)).replace(/[/:\s@]/g, '')}.log`
      const blob = new Blob([savedLog], { type: 'text/plain' })
      triggerDownload(blob, filename)
      // Clear stored log after successful recovery download (no prompt)
      window.localStorage.removeItem(LOG_KEY)
      window.localStorage.removeItem(LOG_DATE_KEY)
      toggleDownloadLogBtn(false)
    }
  }
}

export function toggleLog(forceEnable?: boolean): void {
  let sessionLogEnable: boolean
  if (typeof forceEnable === 'boolean') {
    sessionLogEnable = forceEnable
    state.sessionLogEnable = sessionLogEnable
  } else {
    sessionLogEnable = toggleState('sessionLogEnable')
  }

  const { loggedData } = state

  if (sessionLogEnable) {
    debug('Starting log')
    state.loggedData = true
    updatestartLogBtnState(true)
    const footer = sessionFooter ?? ''
    const logStartMessage = `Log Start for ${footer} - ${formatDate(new Date())}\r\n\r\n`
    addToSessionLog(logStartMessage)
    window.localStorage.setItem(LOG_DATE_KEY, new Date().toISOString())
  } else {
    debug('Stopping log')
    updatestartLogBtnState(false)
    if (loggedData) {
      const footer = sessionFooter ?? ''
      const logEndMessage = `\r\n\r\nLog End for ${footer} - ${formatDate(new Date())}\r\n`
      addToSessionLog(logEndMessage)
    } else {
      debug('Log was not running, resetting UI')
    }
  }
  focusTerminal()
}

export function downloadLog(autoDownload: boolean = false): void {
  const sessionLog = window.localStorage.getItem(LOG_KEY)
  const { loggedData } = state
  if (sessionLog && loggedData) {
    const filename = `WebSSH2-${formatDate(new Date()).replace(/[/:\s@]/g, '')}.log`
    const blob = new Blob([sessionLog], { type: 'text/plain' })
    if (autoDownload) {
      // Download immediately then clear the stored log
      triggerDownload(blob, filename)
      window.localStorage.removeItem(LOG_KEY)
      window.localStorage.removeItem(LOG_DATE_KEY)
      toggleDownloadLogBtn(false)
    } else {
      try {
        window.localStorage.setItem(LOG_KEY, sessionLog)
        window.localStorage.setItem(LOG_DATE_KEY, new Date().toISOString())
        debug('Session log saved to localStorage')
      } catch (e) {
        console.error('Failed to save session log to localStorage:', e)
        triggerDownload(blob, filename)
        // Clear as we already downloaded due to save failure
        window.localStorage.removeItem(LOG_KEY)
        window.localStorage.removeItem(LOG_DATE_KEY)
        toggleDownloadLogBtn(false)
      }
    }
  }
}
