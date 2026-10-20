// SolidJS TypeScript Logging Service
import { createMemo, createRoot } from 'solid-js'
import createDebug from 'debug'
import { state, setState } from '../stores/terminal.js'
import { promptStore } from '../stores/prompt-store.js'
import { MAX_LOG_SIZE } from '../constants.js'
import { triggerDownload } from '../utils/browser.js'
import { formatDate } from '../utils/index.js'

const debug = createDebug('webssh2-client:logging-service')

const LOG_KEY = 'webssh2_session_log'
const LOG_DATE_KEY = 'webssh2_session_log_date'

// Session footer for log headers
let sessionFooter: string | null = null

type LogHaltReason = 'limit' | 'storage'

/**
 * localStorage.setItem that never throws. Returns false when the write
 * failed (quota exceeded, storage disabled, ...).
 */
function safeSetItem(key: string, value: string): boolean {
  try {
    window.localStorage.setItem(key, value)
    return true
  } catch (error) {
    debug('localStorage.setItem failed for %s: %O', key, error)
    return false
  }
}

// Running length of the stored log, so the cap check in addToLog does not
// depend on re-measuring the whole log for every chunk.
let logLength = 0

// Set when logging was halted; cleared once the stored log is removed by
// a download or a clear, so logging cannot restart into a full log.
let logFull = false

function resetLogBounds(): void {
  logLength = 0
  logFull = false
}

/**
 * Stop logging because the log cannot grow any further, and tell the user.
 * The log collected so far stays in localStorage for download.
 */
function haltLogging(reason: LogHaltReason, markLog = true): void {
  setState('sessionLogEnable', false)
  logFull = true
  // Keep Download Log / Clear Log visible for whatever did get stored,
  // even when a later write (such as the date) failed.
  const storedLog = window.localStorage.getItem(LOG_KEY) ?? ''
  setState('loggedData', storedLog !== '')
  debug('Session logging halted: %s', reason)

  // Mark where the log was cut off. Only for the cap: after a storage
  // failure another write would fail too. The marker may pass the cap by a
  // few bytes, which the headroom under the quota absorbs.
  if (reason === 'limit' && markLog) {
    const sessionLog = window.localStorage.getItem(LOG_KEY) ?? ''
    if (sessionLog !== '') {
      const footer = sessionFooter ?? ''
      const marker = `\r\n\r\nLog stopped (size limit reached) for ${footer} - ${formatDate(new Date())}\r\n`
      if (safeSetItem(LOG_KEY, sessionLog + marker)) {
        logLength = sessionLog.length + marker.length
      }
    }
  }

  const sizeMb = Math.round(MAX_LOG_SIZE / (1024 * 1024))
  promptStore.addLocalToast({
    id: `session-log-halted-${Date.now()}`,
    type: 'toast',
    severity: 'warning',
    title: 'Session log stopped',
    message:
      reason === 'limit'
        ? `The session log reached its ${sizeMb} MB limit. Download the log to keep it, then clear it to log again.`
        : 'The browser could not store more of the session log. Download the log to keep it, then clear it to log again.',
    timeout: 10000
  })
}

interface LoggingService {
  // Reactive state
  hasLogData: () => boolean
  isLogging: () => boolean

  // Actions
  startLogging(): void
  stopLogging(): void
  clearLog(): void
  downloadLog(): void
  addToLog(data: string): void
  checkSavedLog(): void
  setSessionFooter(footer: string | null): void
}

class LoggingServiceImpl implements LoggingService {
  // Reactive computations
  hasLogData = createRoot(() =>
    createMemo(() => {
      // Return state.loggedData which tracks whether we have log data
      // This will be reactive to state changes
      return state.loggedData
    })
  )

  isLogging = () => state.sessionLogEnable

  setSessionFooter(footer: string | null): void {
    sessionFooter = footer
    debug('Session footer set:', footer)
  }

  addToLog(data: string): void {
    if (!state.sessionLogEnable) return

    if (logLength + data.length > MAX_LOG_SIZE) {
      haltLogging('limit')
      return
    }

    let sessionLog = window.localStorage.getItem(LOG_KEY) ?? ''
    const isNewLog = sessionLog === ''

    sessionLog += data
    if (!safeSetItem(LOG_KEY, sessionLog)) {
      haltLogging('storage')
      return
    }
    logLength = sessionLog.length

    // Update state if this is the first log entry
    if (isNewLog) {
      setState('loggedData', true)
      debug('Started logging session')
    }

    // A log at the cap cannot take any more output, so stop now rather
    // than on the next chunk.
    if (logLength >= MAX_LOG_SIZE) haltLogging('limit')
  }

  startLogging(): void {
    debug('Starting log session')

    const footer = sessionFooter ?? ''
    const logStartMessage = `Log Start for ${footer} - ${formatDate(new Date())}\r\n\r\n`

    // Add start message to log
    let sessionLog = window.localStorage.getItem(LOG_KEY) ?? ''
    if (sessionLog === '') {
      // Nothing stored any more, so nothing can be full
      resetLogBounds()
    } else {
      setState('loggedData', true)
      logLength = sessionLog.length
    }

    // Mark logging as active first so a refusal below goes through the
    // same halt path (menu back to "Start Log" plus a toast).
    setState('sessionLogEnable', true)
    if (logFull || sessionLog.length + logStartMessage.length > MAX_LOG_SIZE) {
      // The stored log is already full and already marked as cut off.
      haltLogging('limit', false)
      return
    }

    sessionLog += logStartMessage
    if (!safeSetItem(LOG_KEY, sessionLog)) {
      haltLogging('storage')
      return
    }
    logLength = sessionLog.length
    setState('loggedData', true)

    if (!safeSetItem(LOG_DATE_KEY, new Date().toISOString())) {
      haltLogging('storage')
      return
    }
    if (logLength >= MAX_LOG_SIZE) {
      haltLogging('limit')
      return
    }

    debug('Log session started')
  }

  stopLogging(): void {
    debug('Stopping log session')
    setState('sessionLogEnable', false)

    // Add end message if we have log data
    const storedLog = window.localStorage.getItem(LOG_KEY)
    const hasLogData = storedLog != null && storedLog !== ''
    if (hasLogData) {
      const footer = sessionFooter ?? ''
      const logEndMessage = `\r\n\r\nLog End for ${footer} - ${formatDate(new Date())}\r\n`

      let sessionLog = window.localStorage.getItem(LOG_KEY) ?? ''
      sessionLog += logEndMessage
      if (safeSetItem(LOG_KEY, sessionLog)) {
        logLength = sessionLog.length
        debug('Log session stopped with end message')
      } else {
        haltLogging('storage')
      }
    }
  }

  clearLog(): void {
    const sessionLog = window.localStorage.getItem(LOG_KEY)
    if (sessionLog == null || sessionLog === '') {
      debug('No session log found to clear')
      return
    }

    const deleteLog = window.confirm('Clear the session log?')
    if (deleteLog) {
      window.localStorage.removeItem(LOG_KEY)
      window.localStorage.removeItem(LOG_DATE_KEY)
      resetLogBounds()
      setState('loggedData', false)
      debug('Session log cleared from localStorage')
    }
  }

  downloadLog(): void {
    const sessionLog = window.localStorage.getItem(LOG_KEY)
    if (sessionLog == null || sessionLog === '') {
      debug('No log data available for download')
      return
    }

    const autoDownload = window.confirm(
      'Would you like to download the session log?'
    )
    if (!autoDownload) return

    const filename = `WebSSH2-${formatDate(new Date()).replace(/[/:\s@]/g, '')}.log`
    const blob = new Blob([sessionLog], { type: 'text/plain' })

    try {
      triggerDownload(blob, filename)
      debug('Log downloaded successfully')

      // Only clear localStorage if logging is stopped
      const isLogging = state.sessionLogEnable
      if (!isLogging) {
        window.localStorage.removeItem(LOG_KEY)
        window.localStorage.removeItem(LOG_DATE_KEY)
        resetLogBounds()
        setState('loggedData', false)
        debug(
          'Log cleared from localStorage after download (logging was stopped)'
        )
      } else {
        // Keep the log in localStorage but update the date
        if (safeSetItem(LOG_DATE_KEY, new Date().toISOString())) {
          debug('Log kept in localStorage (logging is still active)')
        } else {
          haltLogging('storage')
        }
      }
    } catch (error) {
      console.error('Failed to download session log:', error)
      // On failure, trigger download and clear to prevent data loss
      triggerDownload(blob, filename)
      window.localStorage.removeItem(LOG_KEY)
      window.localStorage.removeItem(LOG_DATE_KEY)
      resetLogBounds()
      setState('loggedData', false)
    }
  }

  checkSavedLog(): void {
    const savedLog = window.localStorage.getItem(LOG_KEY)
    const savedDate = window.localStorage.getItem(LOG_DATE_KEY)

    if (
      savedLog != null &&
      savedLog !== '' &&
      savedDate != null &&
      savedDate !== ''
    ) {
      const restoreLog = window.confirm(
        `A saved session log from ${new Date(savedDate).toLocaleString()} was found. Would you like to download it?`
      )

      if (restoreLog) {
        const filename = `WebSSH2-Recovered-${formatDate(new Date(savedDate)).replace(/[/:\s@]/g, '')}.log`
        const blob = new Blob([savedLog], { type: 'text/plain' })
        triggerDownload(blob, filename)

        // Clear stored log after successful recovery download
        window.localStorage.removeItem(LOG_KEY)
        window.localStorage.removeItem(LOG_DATE_KEY)
        resetLogBounds()
        setState('loggedData', false)
        debug('Recovered log downloaded and cleared')
      } else {
        // User declined recovery, but log exists so update state
        setState('loggedData', true)
        debug('Recovered log kept, state updated')
      }
    }
  }
}

// Create singleton instance
export const loggingService: LoggingService = new LoggingServiceImpl()

// Export individual functions for compatibility
export const {
  hasLogData,
  isLogging,
  startLogging,
  stopLogging,
  clearLog,
  downloadLog,
  addToLog,
  checkSavedLog,
  setSessionFooter
} = loggingService
