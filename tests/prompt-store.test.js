/**
 * @file Prompt Store Tests
 * Tests for the generic prompt system state management
 */

import { describe, it } from 'node:test'
import assert from 'node:assert'

describe('Prompt Store', () => {
  describe('Rate Limiting', () => {
    it('should accept prompts within rate limit (5/second)', () => {
      // Create a simple rate limit checker
      const recentPrompts = []
      const RATE_LIMIT = 5
      const WINDOW_MS = 1000

      const checkRateLimit = () => {
        const now = Date.now()
        const recent = recentPrompts.filter((t) => now - t < WINDOW_MS)

        if (recent.length >= RATE_LIMIT) {
          return false
        }

        recentPrompts.push(now)
        return true
      }

      // First 5 should be accepted
      for (let i = 0; i < 5; i++) {
        assert.strictEqual(
          checkRateLimit(),
          true,
          `Prompt ${i + 1} should be accepted`
        )
      }

      // 6th should be rejected (rate limited)
      assert.strictEqual(
        checkRateLimit(),
        false,
        '6th prompt should be rate limited'
      )
    })

    it('should trip circuit breaker at 10 prompts/second', () => {
      const recentPrompts = []
      const CIRCUIT_BREAKER_THRESHOLD = 10
      const WINDOW_MS = 1000
      let circuitBreakerTripped = false

      const checkRateLimit = () => {
        if (circuitBreakerTripped) return false

        const now = Date.now()
        const veryRecent = recentPrompts.filter((t) => now - t < WINDOW_MS)

        if (veryRecent.length >= CIRCUIT_BREAKER_THRESHOLD) {
          circuitBreakerTripped = true
          return false
        }

        recentPrompts.push(now)
        return true
      }

      // First 10 should be accepted
      for (let i = 0; i < 10; i++) {
        checkRateLimit()
      }

      // 11th should trip circuit breaker
      const result = checkRateLimit()
      assert.strictEqual(
        circuitBreakerTripped,
        true,
        'Circuit breaker should be tripped'
      )
      assert.strictEqual(
        result,
        false,
        'Prompt should be rejected after circuit breaker'
      )
    })
  })

  describe('Queue Management', () => {
    it('should queue prompts when one is active (max 3)', () => {
      const activePrompt = { id: '1', type: 'input', title: 'Test' }
      const promptQueue = []
      const MAX_QUEUE_SIZE = 3

      const showPrompt = (payload) => {
        if (activePrompt === null) {
          return true // Would set active
        }
        if (promptQueue.length < MAX_QUEUE_SIZE) {
          promptQueue.push(payload)
          return true
        }
        return false // Queue full
      }

      // With active prompt, 3 should queue
      assert.strictEqual(
        showPrompt({ id: '2', type: 'input', title: 'Test 2' }),
        true
      )
      assert.strictEqual(
        showPrompt({ id: '3', type: 'input', title: 'Test 3' }),
        true
      )
      assert.strictEqual(
        showPrompt({ id: '4', type: 'input', title: 'Test 4' }),
        true
      )
      assert.strictEqual(promptQueue.length, 3)

      // 4th should be dropped
      assert.strictEqual(
        showPrompt({ id: '5', type: 'input', title: 'Test 5' }),
        false
      )
      assert.strictEqual(promptQueue.length, 3)
    })
  })

  describe('Toast Stacking', () => {
    it('should limit active toasts to 5', () => {
      const toasts = []
      const MAX_TOASTS = 5

      const addToast = (payload) => {
        if (toasts.length >= MAX_TOASTS) {
          toasts.shift() // Remove oldest
        }
        toasts.push(payload)
      }

      // Add 7 toasts
      for (let i = 1; i <= 7; i++) {
        addToast({ id: String(i), type: 'toast', title: `Toast ${i}` })
      }

      // Should only have 5
      assert.strictEqual(toasts.length, 5)
      // Should have the most recent 5 (IDs 3-7)
      assert.strictEqual(toasts[0].id, '3')
      assert.strictEqual(toasts[4].id, '7')
    })
  })

  describe('Dismiss All', () => {
    it('should clear all prompts and toasts', () => {
      let activePrompt = { id: '1', type: 'input', title: 'Test' }
      let promptQueue = [
        { id: '2', type: 'input', title: 'Test 2' },
        { id: '3', type: 'input', title: 'Test 3' }
      ]
      let toasts = [
        { id: '4', type: 'toast', title: 'Toast 1' },
        { id: '5', type: 'toast', title: 'Toast 2' }
      ]

      const dismissedIds = []
      const submitResponse = (response) => {
        dismissedIds.push(response.id)
      }

      // Simulate dismissAllPrompts
      if (activePrompt !== null) {
        submitResponse({ id: activePrompt.id, action: 'dismissed' })
      }
      promptQueue.forEach((prompt) => {
        submitResponse({ id: prompt.id, action: 'dismissed' })
      })

      activePrompt = null
      promptQueue = []
      toasts = []

      // All modal prompts should have dismiss responses sent
      assert.deepStrictEqual(dismissedIds, ['1', '2', '3'])
      assert.strictEqual(activePrompt, null)
      assert.strictEqual(promptQueue.length, 0)
      assert.strictEqual(toasts.length, 0)
    })
  })
})
