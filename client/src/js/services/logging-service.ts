// SolidJS TypeScript Logging Service
import { createMemo } from 'solid-js'
import createDebug from 'debug'
import { state, setState } from '../state-solid.js'
import { triggerDownload } from '../utils/browser.js'
import { formatDate } from '../utils.js'

const debug = createDebug('webssh2-client:logging-service')

const LOG_KEY = 'webssh2_session_log'
const LOG_DATE_KEY = 'webssh2_session_log_date'

// Session footer for log headers
let sessionFooter: string | null = null

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
  hasLogData = createMemo(() => {
    // Return state.loggedData which tracks whether we have log data
    // This will be reactive to state changes
    return state.loggedData
  })

  isLogging = () => state.sessionLogEnable

  setSessionFooter(footer: string | null): void {
    sessionFooter = footer
    debug('Session footer set:', footer)
  }

  addToLog(data: string): void {
    if (!state.sessionLogEnable) return

    let sessionLog = window.localStorage.getItem(LOG_KEY) || ''
    const isNewLog = sessionLog === ''

    sessionLog += data
    window.localStorage.setItem(LOG_KEY, sessionLog)

    // Update state if this is the first log entry
    if (isNewLog) {
      setState('loggedData', true)
      debug('Started logging session')
    }
  }

  startLogging(): void {
    debug('Starting log session')
    setState('sessionLogEnable', true)
    setState('loggedData', true)

    const footer = sessionFooter ?? ''
    const logStartMessage = `Log Start for ${footer} - ${formatDate(new Date())}\r\n\r\n`

    // Add start message to log
    let sessionLog = window.localStorage.getItem(LOG_KEY) || ''
    sessionLog += logStartMessage
    window.localStorage.setItem(LOG_KEY, sessionLog)
    window.localStorage.setItem(LOG_DATE_KEY, new Date().toISOString())

    debug('Log session started')
  }

  stopLogging(): void {
    debug('Stopping log session')
    setState('sessionLogEnable', false)

    // Add end message if we have log data
    const hasLogData = !!window.localStorage.getItem(LOG_KEY)
    if (hasLogData) {
      const footer = sessionFooter ?? ''
      const logEndMessage = `\r\n\r\nLog End for ${footer} - ${formatDate(new Date())}\r\n`

      let sessionLog = window.localStorage.getItem(LOG_KEY) || ''
      sessionLog += logEndMessage
      window.localStorage.setItem(LOG_KEY, sessionLog)

      debug('Log session stopped with end message')
    }
  }

  clearLog(): void {
    const sessionLog = window.localStorage.getItem(LOG_KEY)
    if (!sessionLog) {
      debug('No session log found to clear')
      return
    }

    const deleteLog = window.confirm('Clear the session log?')
    if (deleteLog) {
      window.localStorage.removeItem(LOG_KEY)
      window.localStorage.removeItem(LOG_DATE_KEY)
      setState('loggedData', false)
      debug('Session log cleared from localStorage')
    }
  }

  downloadLog(): void {
    const sessionLog = window.localStorage.getItem(LOG_KEY)
    const hasLogData = !!sessionLog
    if (!sessionLog || !hasLogData) {
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
        setState('loggedData', false)
        debug(
          'Log cleared from localStorage after download (logging was stopped)'
        )
      } else {
        // Keep the log in localStorage but update the date
        window.localStorage.setItem(LOG_DATE_KEY, new Date().toISOString())
        debug('Log kept in localStorage (logging is still active)')
      }
    } catch (error) {
      console.error('Failed to download session log:', error)
      // On failure, trigger download and clear to prevent data loss
      triggerDownload(blob, filename)
      window.localStorage.removeItem(LOG_KEY)
      window.localStorage.removeItem(LOG_DATE_KEY)
      setState('loggedData', false)
    }
  }

  checkSavedLog(): void {
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

        // Clear stored log after successful recovery download
        window.localStorage.removeItem(LOG_KEY)
        window.localStorage.removeItem(LOG_DATE_KEY)
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
