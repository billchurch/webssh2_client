/**
 * Unit tests for terminal resize utilities
 */

import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
// Mock implementations for testing
const TERMINAL_MIN_COLS = 1
const TERMINAL_MAX_COLS = 9999
const TERMINAL_MIN_ROWS = 1
const TERMINAL_MAX_ROWS = 9999

const validateDimensions = (dims) => {
  return dims.cols > 0 && dims.rows > 0 && 
         Number.isFinite(dims.cols) && Number.isFinite(dims.rows)
}

const normalizeDimensions = (dims) => ({
  cols: Math.min(Math.max(TERMINAL_MIN_COLS, Math.floor(dims.cols)), TERMINAL_MAX_COLS),
  rows: Math.min(Math.max(TERMINAL_MIN_ROWS, Math.floor(dims.rows)), TERMINAL_MAX_ROWS)
})

const dimensionsChanged = (prev, current) => {
  return prev.cols !== current.cols || prev.rows !== current.rows
}

const createDebouncedResizeEmitter = (emitFn, delay) => {
  let timeoutId = null
  return (dims) => {
    if (validateDimensions(dims)) {
      const normalized = normalizeDimensions(dims)
      if (timeoutId) clearTimeout(timeoutId)
      timeoutId = setTimeout(() => emitFn(normalized), delay)
    }
  }
}

const createSmartResizeHandler = (emitFn, delay) => {
  let lastDimensions = null
  let timeoutId = null
  
  return (dims) => {
    if (!validateDimensions(dims)) return
    
    const normalized = normalizeDimensions(dims)
    
    if (!lastDimensions || dimensionsChanged(lastDimensions, normalized)) {
      lastDimensions = normalized
      if (timeoutId) clearTimeout(timeoutId)
      timeoutId = setTimeout(() => emitFn(normalized), delay)
    }
  }
}

describe('Terminal Resize Utilities', () => {
  describe('validateDimensions', () => {
    it('should validate positive dimensions', () => {
      assert.equal(validateDimensions({ cols: 80, rows: 24 }), true)
      assert.equal(validateDimensions({ cols: 1, rows: 1 }), true)
      assert.equal(validateDimensions({ cols: 9999, rows: 9999 }), true)
    })

    it('should reject zero dimensions', () => {
      assert.equal(validateDimensions({ cols: 0, rows: 24 }), false)
      assert.equal(validateDimensions({ cols: 80, rows: 0 }), false)
      assert.equal(validateDimensions({ cols: 0, rows: 0 }), false)
    })

    it('should reject negative dimensions', () => {
      assert.equal(validateDimensions({ cols: -1, rows: 24 }), false)
      assert.equal(validateDimensions({ cols: 80, rows: -1 }), false)
      assert.equal(validateDimensions({ cols: -10, rows: -10 }), false)
    })

    it('should reject non-finite dimensions', () => {
      assert.equal(validateDimensions({ cols: Infinity, rows: 24 }), false)
      assert.equal(validateDimensions({ cols: 80, rows: Infinity }), false)
      assert.equal(validateDimensions({ cols: NaN, rows: 24 }), false)
      assert.equal(validateDimensions({ cols: 80, rows: NaN }), false)
    })
  })

  describe('normalizeDimensions', () => {
    it('should floor decimal values', () => {
      const result = normalizeDimensions({ cols: 80.7, rows: 24.3 })
      assert.equal(result.cols, 80)
      assert.equal(result.rows, 24)
    })

    it('should clamp to minimum values', () => {
      const result = normalizeDimensions({ cols: -10, rows: 0 })
      assert.equal(result.cols, 1)
      assert.equal(result.rows, 1)
    })

    it('should clamp to maximum values', () => {
      const result = normalizeDimensions({ cols: 10000, rows: 10000 })
      assert.equal(result.cols, 9999)
      assert.equal(result.rows, 9999)
    })

    it('should handle normal values unchanged', () => {
      const result = normalizeDimensions({ cols: 80, rows: 24 })
      assert.equal(result.cols, 80)
      assert.equal(result.rows, 24)
    })
  })

  describe('dimensionsChanged', () => {
    it('should detect column changes', () => {
      const prev = { cols: 80, rows: 24 }
      const current = { cols: 81, rows: 24 }
      assert.equal(dimensionsChanged(prev, current), true)
    })

    it('should detect row changes', () => {
      const prev = { cols: 80, rows: 24 }
      const current = { cols: 80, rows: 25 }
      assert.equal(dimensionsChanged(prev, current), true)
    })

    it('should detect both changes', () => {
      const prev = { cols: 80, rows: 24 }
      const current = { cols: 100, rows: 30 }
      assert.equal(dimensionsChanged(prev, current), true)
    })

    it('should detect no changes', () => {
      const prev = { cols: 80, rows: 24 }
      const current = { cols: 80, rows: 24 }
      assert.equal(dimensionsChanged(prev, current), false)
    })
  })

  describe('createDebouncedResizeEmitter', () => {
    let emittedDimensions = []
    let mockEmitFn

    beforeEach(() => {
      emittedDimensions = []
      mockEmitFn = (dims) => emittedDimensions.push(dims)
    })

    it('should emit valid dimensions', async () => {
      const emitter = createDebouncedResizeEmitter(mockEmitFn, 0)
      
      emitter({ cols: 80, rows: 24 })
      // With 0 delay, should emit immediately in next tick
      await new Promise(resolve => setTimeout(resolve, 1))
      assert.equal(emittedDimensions.length, 1)
      assert.deepEqual(emittedDimensions[0], { cols: 80, rows: 24 })
    })

    it('should not emit invalid dimensions', async () => {
      const emitter = createDebouncedResizeEmitter(mockEmitFn, 0)
      
      emitter({ cols: 0, rows: 24 })
      emitter({ cols: -1, rows: -1 })
      emitter({ cols: NaN, rows: 24 })
      
      await new Promise(resolve => setTimeout(resolve, 1))
      assert.equal(emittedDimensions.length, 0, 'Should not emit invalid dimensions')
    })

    it('should normalize dimensions before emitting', async () => {
      const emitter = createDebouncedResizeEmitter(mockEmitFn, 0)
      
      emitter({ cols: 80.7, rows: 24.3 })
      
      await new Promise(resolve => setTimeout(resolve, 1))
      assert.equal(emittedDimensions.length, 1)
      assert.deepEqual(emittedDimensions[0], { cols: 80, rows: 24 })
    })
  })

  describe('createSmartResizeHandler', () => {
    let emittedDimensions = []
    let mockEmitFn

    beforeEach(() => {
      emittedDimensions = []
      mockEmitFn = (dims) => emittedDimensions.push(dims)
    })

    it('should emit on first call', async () => {
      const handler = createSmartResizeHandler(mockEmitFn, 0)
      
      handler({ cols: 80, rows: 24 })
      
      await new Promise(resolve => setTimeout(resolve, 1))
      assert.equal(emittedDimensions.length, 1)
      assert.deepEqual(emittedDimensions[0], { cols: 80, rows: 24 })
    })

    it('should not emit duplicate dimensions', async () => {
      const handler = createSmartResizeHandler(mockEmitFn, 0)
      
      handler({ cols: 80, rows: 24 })
      await new Promise(resolve => setTimeout(resolve, 1))
      
      handler({ cols: 80, rows: 24 })
      handler({ cols: 80, rows: 24 })
      
      await new Promise(resolve => setTimeout(resolve, 1))
      assert.equal(emittedDimensions.length, 1, 'Should only emit once for same dimensions')
    })

    it('should emit when dimensions change', async () => {
      const handler = createSmartResizeHandler(mockEmitFn, 0)
      
      handler({ cols: 80, rows: 24 })
      await new Promise(resolve => setTimeout(resolve, 1))
      
      handler({ cols: 100, rows: 30 })
      await new Promise(resolve => setTimeout(resolve, 1))
      
      assert.equal(emittedDimensions.length, 2)
      assert.deepEqual(emittedDimensions[0], { cols: 80, rows: 24 })
      assert.deepEqual(emittedDimensions[1], { cols: 100, rows: 30 })
    })

    it('should track last dimensions correctly', async () => {
      const handler = createSmartResizeHandler(mockEmitFn, 0)
      
      handler({ cols: 80, rows: 24 })
      await new Promise(resolve => setTimeout(resolve, 1))
      
      handler({ cols: 80, rows: 24 }) // No emit
      handler({ cols: 81, rows: 24 }) // Should emit
      await new Promise(resolve => setTimeout(resolve, 1))
      
      handler({ cols: 81, rows: 24 }) // No emit
      handler({ cols: 81, rows: 25 }) // Should emit
      await new Promise(resolve => setTimeout(resolve, 1))
      
      assert.equal(emittedDimensions.length, 3)
      assert.deepEqual(emittedDimensions[0], { cols: 80, rows: 24 })
      assert.deepEqual(emittedDimensions[1], { cols: 81, rows: 24 })
      assert.deepEqual(emittedDimensions[2], { cols: 81, rows: 25 })
    })
  })
})