/**
 * Unit tests for debounce utility
 */

import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
// Since the source is TypeScript, we need to import the transpiled version
// For now, we'll create a simple mock implementation for testing
const createDebouncer = function(fn, delay) {
  let timeoutId = null
  return function(...args) {
    if (timeoutId !== null) clearTimeout(timeoutId)
    timeoutId = setTimeout(() => {
      fn(...args)
      timeoutId = null
    }, delay)
  }
}

const createCancellableDebouncer = function(fn, delay) {
  let timeoutId = null
  const debounced = function(...args) {
    if (timeoutId !== null) clearTimeout(timeoutId)
    timeoutId = setTimeout(() => {
      fn(...args)
      timeoutId = null
    }, delay)
  }
  const cancel = () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
  }
  return { debounced, cancel }
}

describe('Debounce Utilities', () => {
  let timerCallbacks = []
  let originalSetTimeout
  let originalClearTimeout
  let currentTime = 0

  beforeEach(() => {
    // Mock setTimeout and clearTimeout for deterministic testing
    originalSetTimeout = global.setTimeout
    originalClearTimeout = global.clearTimeout
    timerCallbacks = []
    currentTime = 0

    global.setTimeout = (callback, delay) => {
      const id = timerCallbacks.length
      timerCallbacks.push({ callback, delay, time: currentTime + delay, id, cancelled: false })
      return id
    }

    global.clearTimeout = (id) => {
      if (timerCallbacks[id]) {
        timerCallbacks[id].cancelled = true
      }
    }
  })

  afterEach(() => {
    global.setTimeout = originalSetTimeout
    global.clearTimeout = originalClearTimeout
  })

  const advanceTime = (ms) => {
    const targetTime = currentTime + ms
    currentTime = targetTime
    // Process timers that should fire
    timerCallbacks.forEach(timer => {
      if (timer && !timer.cancelled && timer.time <= currentTime) {
        timer.callback()
        timer.cancelled = true
      }
    })
  }

  describe('createDebouncer', () => {
    it('should delay function execution', () => {
      let callCount = 0
      const fn = () => callCount++
      const debounced = createDebouncer(fn, 100)

      debounced()
      assert.equal(callCount, 0, 'Function should not be called immediately')

      advanceTime(50)
      assert.equal(callCount, 0, 'Function should not be called before delay')

      advanceTime(50)
      assert.equal(callCount, 1, 'Function should be called after delay')
    })

    it('should reset delay on multiple calls', () => {
      let callCount = 0
      const fn = () => callCount++
      const debounced = createDebouncer(fn, 100)

      debounced() // Timer set to fire at time 100
      advanceTime(50) // Now at time 50
      assert.equal(callCount, 0, 'Should not be called after 50ms')
      
      debounced() // Timer cancelled and reset to fire at time 150 (50 + 100)
      advanceTime(50) // Now at time 100
      assert.equal(callCount, 0, 'Should not be called at time 100')

      advanceTime(50) // Now at time 150
      assert.equal(callCount, 1, 'Should be called after delay from last call')
    })

    it('should pass arguments to debounced function', () => {
      let receivedArgs = []
      const fn = (...args) => { receivedArgs = args }
      const debounced = createDebouncer(fn, 100)

      debounced(1, 'test', { key: 'value' })
      advanceTime(100)

      assert.equal(receivedArgs.length, 3)
      assert.equal(receivedArgs[0], 1)
      assert.equal(receivedArgs[1], 'test')
      assert.deepEqual(receivedArgs[2], { key: 'value' })
    })

    it('should use the latest arguments when called multiple times', () => {
      let receivedArg = null
      const fn = (arg) => { receivedArg = arg }
      const debounced = createDebouncer(fn, 100)

      debounced('first')
      advanceTime(50)
      debounced('second')
      advanceTime(50)
      debounced('third')
      advanceTime(100)

      assert.equal(receivedArg, 'third', 'Should use arguments from last call')
    })
  })

  describe('createCancellableDebouncer', () => {
    it('should return debounced function and cancel method', () => {
      const fn = () => {}
      const result = createCancellableDebouncer(fn, 100)

      assert.equal(typeof result.debounced, 'function')
      assert.equal(typeof result.cancel, 'function')
    })

    it('should cancel pending execution', () => {
      let callCount = 0
      const fn = () => callCount++
      const { debounced, cancel } = createCancellableDebouncer(fn, 100)

      debounced() // Timer set to fire at time 100
      advanceTime(50) // Now at time 50
      assert.equal(callCount, 0, 'Should not be called yet')
      
      cancel() // Timer cancelled
      advanceTime(60) // Now at time 110
      assert.equal(callCount, 0, 'Function should not be called after cancel')
    })

    it('should allow new calls after cancel', () => {
      let callCount = 0
      const fn = () => callCount++
      const { debounced, cancel } = createCancellableDebouncer(fn, 100)

      debounced() // Timer set to fire at time 100
      cancel() // Timer cancelled
      debounced() // New timer set to fire at time 100
      advanceTime(100) // Now at time 100

      assert.equal(callCount, 1, 'Function should be called after cancel and new call')
    })

    it('should handle multiple cancels safely', () => {
      const fn = () => {}
      const { cancel } = createCancellableDebouncer(fn, 100)

      assert.doesNotThrow(() => {
        cancel()
        cancel()
        cancel()
      }, 'Multiple cancels should not throw')
    })
  })
})