/**
 * Regression tests for issue #157: the localStorage session log must be
 * bounded, and storage errors must never escape the socket data handler.
 *
 * - Logging stops at MAX_LOG_SIZE with exactly one toast.
 * - A setItem that throws QuotaExceededError stops logging without throwing.
 * - The log collected so far can still be downloaded after the stop.
 */

import { describe, it, beforeEach, mock } from 'node:test'
import assert from 'node:assert/strict'
import { register } from 'node:module'
import { pathToFileURL } from 'node:url'

await register('./tests/ts-loader.mjs', pathToFileURL('./'))

// ---------------------------------------------------------------------------
// Browser shims
// ---------------------------------------------------------------------------

const storage = new Map()
// An Error to throw from every setItem, or a (key) => Error | null function
let failSetItem = null

const localStorageShim = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => {
    const error =
      typeof failSetItem === 'function' ? failSetItem(key) : failSetItem
    if (error) throw error
    storage.set(key, String(value))
  },
  removeItem: (key) => storage.delete(key),
  clear: () => storage.clear(),
  get length() {
    return storage.size
  },
  key: (index) => [...storage.keys()][index] ?? null
}

const downloads = []

globalThis.localStorage = localStorageShim
globalThis.window = globalThis
globalThis.confirm = () => true
globalThis.document = {
  createElement: () => ({
    href: '',
    download: '',
    click() {
      downloads.push(this.download)
    }
  }),
  body: { appendChild() {}, removeChild() {} }
}
URL.createObjectURL = () => 'blob:test'
URL.revokeObjectURL = () => {}

// ---------------------------------------------------------------------------
// Import SUT (after shims are in place)
// ---------------------------------------------------------------------------

const { MAX_LOG_SIZE, LOG_TRAILER_RESERVE } =
  await import('../client/src/constants.ts')
const { state, setState } = await import('../client/src/stores/terminal.ts')
const { promptStore } = await import('../client/src/stores/prompt-store.ts')
const { addToLog, startLogging, stopLogging, downloadLog, setSessionFooter } =
  await import('../client/src/services/logging.ts')

const LOG_KEY = 'webssh2_session_log'
const LOG_DATE_KEY = 'webssh2_session_log_date'

const toasts = []
const realAddLocalToast = promptStore.addLocalToast
promptStore.addLocalToast = (payload) => toasts.push(payload)

function quotaError() {
  const error = new Error('The quota has been exceeded.')
  error.name = 'QuotaExceededError'
  return error
}

// Feed output until the cap stops logging, as a long session would
function fillToCap() {
  const chunk = 'x'.repeat(256 * 1024)
  for (let i = 0; i < 64 && state.sessionLogEnable; i++) addToLog(chunk)
}

beforeEach(() => {
  storage.clear()
  failSetItem = null
  toasts.length = 0
  downloads.length = 0
  setState('sessionLogEnable', false)
  setState('loggedData', false)
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('session log size cap (issue #157)', () => {
  it('keeps the cap under the usual ~5M-character localStorage quota', () => {
    assert.ok(MAX_LOG_SIZE <= 4 * 1024 * 1024)
  })

  it('stops logging at the cap with exactly one toast', () => {
    startLogging()
    assert.equal(state.sessionLogEnable, true)

    fillToCap()

    assert.equal(state.sessionLogEnable, false, 'menu shows "Start Log" again')
    assert.equal(state.loggedData, true, 'log stays available')
    assert.equal(toasts.length, 1)
    assert.equal(toasts[0].type, 'toast')
    assert.match(toasts[0].message, /limit/)

    const stored = storage.get(LOG_KEY)
    assert.ok(stored.length > MAX_LOG_SIZE - 256 * 1024, 'log was filled')
    // The "Log stopped" marker fits inside the cap
    assert.ok(stored.length <= MAX_LOG_SIZE, `stored ${stored.length}`)
    assert.match(stored, /Log stopped \(size limit reached\)/)
  })

  it('stops when a chunk fills the log exactly to the cap', () => {
    startLogging()
    const remaining =
      MAX_LOG_SIZE - LOG_TRAILER_RESERVE - storage.get(LOG_KEY).length
    addToLog('x'.repeat(remaining))

    assert.equal(state.sessionLogEnable, false)
    assert.equal(state.loggedData, true)
    assert.equal(toasts.length, 1)
    assert.match(toasts[0].message, /limit/)
  })

  it('never stores more than MAX_LOG_SIZE, closing lines included', () => {
    setSessionFooter('ssh://user@host:22 '.repeat(20))
    try {
      startLogging()
      fillToCap()
      stopLogging()
      assert.ok(storage.get(LOG_KEY).length <= MAX_LOG_SIZE)
    } finally {
      setSessionFooter(null)
    }
  })

  it('checks the stored log, not a stale counter, when another tab appended', () => {
    startLogging()
    addToLog('tab A output\r\n')

    // Tab B shares localStorage and grows the log to just under the cap
    storage.set(LOG_KEY, 'b'.repeat(MAX_LOG_SIZE - 1))

    addToLog('x'.repeat(256 * 1024))
    assert.equal(state.sessionLogEnable, false)
    assert.equal(toasts.length, 1)
    assert.ok(
      storage.get(LOG_KEY).length <= MAX_LOG_SIZE,
      `stored ${storage.get(LOG_KEY).length}`
    )
  })

  it('does not write any chunk once the cap is reached', () => {
    startLogging()
    fillToCap()
    const sizeAfterStop = storage.get(LOG_KEY).length
    addToLog('more output')
    assert.equal(storage.get(LOG_KEY).length, sizeAfterStop)
    assert.equal(toasts.length, 1)
  })

  it('refuses to restart when the stored log is already full', () => {
    startLogging()
    fillToCap()
    assert.equal(toasts.length, 1)
    const stored = storage.get(LOG_KEY)

    startLogging()
    assert.equal(state.sessionLogEnable, false)
    assert.equal(toasts.length, 2)
    assert.equal(storage.get(LOG_KEY), stored, 'log is left unchanged')
  })
})

describe('session log storage errors (issue #157)', () => {
  it('stops logging without throwing when setItem throws a quota error', () => {
    startLogging()
    addToLog('before the quota\r\n')
    failSetItem = quotaError()

    assert.doesNotThrow(() => addToLog('this chunk does not fit'))
    assert.equal(state.sessionLogEnable, false)
    assert.equal(toasts.length, 1)
    assert.equal(toasts[0].severity, 'warning')

    // Later chunks are ignored quietly
    assert.doesNotThrow(() => addToLog('later chunk'))
    assert.equal(toasts.length, 1)
    assert.match(storage.get(LOG_KEY), /before the quota/)
  })

  it('halts with a toast when the Stop Log end message cannot be stored', () => {
    startLogging()
    addToLog('output\r\n')
    failSetItem = (key) => (key === LOG_KEY ? quotaError() : null)

    assert.doesNotThrow(() => stopLogging())
    assert.equal(state.sessionLogEnable, false)
    assert.equal(state.loggedData, true)
    assert.equal(toasts.length, 1)
  })

  it('halts with a toast when an active Download Log cannot store the date', () => {
    startLogging()
    addToLog('output\r\n')
    failSetItem = (key) => (key === LOG_DATE_KEY ? quotaError() : null)

    assert.doesNotThrow(() => downloadLog())
    assert.equal(downloads.length, 1)
    assert.equal(state.sessionLogEnable, false)
    assert.equal(state.loggedData, true, 'log kept for another download')
    assert.equal(toasts.length, 1)
    assert.match(storage.get(LOG_KEY), /output/)
  })

  it('keeps a partially started log visible when the date cannot be stored', () => {
    failSetItem = (key) => (key === LOG_DATE_KEY ? quotaError() : null)

    assert.doesNotThrow(() => startLogging())
    assert.ok(storage.get(LOG_KEY).length > 0)
    assert.equal(state.sessionLogEnable, false)
    assert.equal(state.loggedData, true, 'Download Log / Clear Log shown')
    assert.equal(toasts.length, 1)
  })

  it('does not throw when starting or stopping with storage failing', () => {
    failSetItem = quotaError()
    assert.doesNotThrow(() => startLogging())
    assert.equal(state.sessionLogEnable, false)
    assert.equal(toasts.length, 1)

    assert.doesNotThrow(() => stopLogging())
  })
})

describe('download after the log is stopped (issue #157)', () => {
  it('downloads the collected log and clears it', () => {
    startLogging()
    addToLog('collected output\r\n')
    failSetItem = quotaError()
    addToLog('dropped output')
    failSetItem = null
    assert.equal(state.sessionLogEnable, false)

    downloadLog()
    assert.equal(downloads.length, 1)
    assert.match(downloads[0], /^WebSSH2-.*\.log$/)
    assert.equal(storage.get(LOG_KEY), undefined)
    assert.equal(state.loggedData, false)
  })

  it('allows logging again after the full log is downloaded', () => {
    startLogging()
    fillToCap()
    downloadLog()
    assert.equal(downloads.length, 1)

    startLogging()
    assert.equal(state.sessionLogEnable, true)
    addToLog('fresh output')
    assert.match(storage.get(LOG_KEY), /fresh output/)
    assert.equal(toasts.length, 1)
  })
})

describe('stop warning reaches the real prompt store (issue #157)', () => {
  it('is shown even after a burst of server toasts hit the rate limit', () => {
    mock.timers.enable({ apis: ['setTimeout'] })
    promptStore.addLocalToast = realAddLocalToast
    try {
      // Five server toasts within one second use up the rate limit
      for (let i = 0; i < 5; i++) {
        promptStore.addToast({ id: `server-${i}`, type: 'toast', title: 'x' })
      }
      promptStore.addToast({ id: 'server-dropped', type: 'toast', title: 'x' })
      assert.ok(
        !promptStore.toasts.some((t) => t.id === 'server-dropped'),
        'rate limit is active'
      )

      startLogging()
      fillToCap()

      assert.equal(state.sessionLogEnable, false)
      const halted = promptStore.toasts.filter((t) =>
        t.id.startsWith('session-log-halted-')
      )
      assert.equal(halted.length, 1)
      assert.equal(promptStore.isCircuitBreakerTripped(), false)
    } finally {
      promptStore.addLocalToast = (payload) => toasts.push(payload)
      mock.timers.reset()
    }
  })

  it('is not pushed out by server toasts that arrive after the stop', () => {
    // Start after the earlier burst's rate-limit window so these server
    // toasts are accepted
    mock.timers.enable({
      apis: ['setTimeout', 'Date'],
      now: Date.now() + 60000
    })
    promptStore.addLocalToast = realAddLocalToast
    try {
      startLogging()
      fillToCap()
      assert.equal(state.sessionLogEnable, false)

      for (let i = 0; i < 5; i++) {
        promptStore.addToast({ id: `after-${i}`, type: 'toast', title: 'x' })
      }
      const ids = promptStore.toasts.map((t) => t.id)
      assert.ok(ids.includes('after-4'), 'server toasts were accepted')
      assert.ok(
        ids.some((id) => id.startsWith('session-log-halted-')),
        `stop warning still shown: ${ids.join(', ')}`
      )
    } finally {
      promptStore.addLocalToast = (payload) => toasts.push(payload)
      promptStore.dismissAllPrompts()
      mock.timers.reset()
    }
  })
})
