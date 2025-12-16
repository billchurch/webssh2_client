/**
 * Prompt store - State management for the generic prompt system
 * Includes rate limiting for DoS prevention
 */
import { createStore } from 'solid-js/store'
import { createRoot } from 'solid-js'
import createDebug from 'debug'
import type { PromptPayload, PromptResponsePayload } from '../types/prompt'
import {
  PROMPT_RATE_LIMIT_MAX_PER_SECOND,
  PROMPT_CIRCUIT_BREAKER_THRESHOLD,
  PROMPT_RATE_LIMIT_CHECK_WINDOW_MS,
  PROMPT_RATE_LIMIT_CLEANUP_WINDOW_MS,
  MAX_ACTIVE_TOASTS,
  MAX_MODAL_QUEUE_SIZE,
  DEFAULT_TOAST_TIMEOUT_MS
} from '../constants.js'
import { playPromptSound } from '../utils/prompt-sounds'

const debug = createDebug('webssh2-client:prompt-store')

/**
 * Prompt state interface
 */
interface PromptState {
  activePrompt: PromptPayload | null
  promptQueue: PromptPayload[]
  toasts: PromptPayload[]
}

/**
 * Rate limiting state interface
 */
interface RateLimitState {
  recentPrompts: number[]
  circuitBreakerTripped: boolean
}

/**
 * Callback for submitting prompt responses to the server
 * Set by socket service during initialization
 */
let responseCallback: ((response: PromptResponsePayload) => void) | null = null

/**
 * Callback for disconnecting socket when circuit breaker trips
 * Set by socket service during initialization
 */
let disconnectCallback: (() => void) | null = null

/**
 * Callback for showing error modal when circuit breaker trips
 * Set by app during initialization
 */
let showErrorCallback: ((message: string) => void) | null = null

/**
 * Create the prompt store
 */
function createPromptStoreInternal() {
  const [state, setState] = createStore<PromptState>({
    activePrompt: null,
    promptQueue: [],
    toasts: []
  })

  const [rateLimitState, setRateLimitState] = createStore<RateLimitState>({
    recentPrompts: [],
    circuitBreakerTripped: false
  })

  /**
   * Check if we should accept a new prompt (DoS prevention)
   * @returns true if prompt should be accepted, false if rate limited
   */
  function checkPromptRateLimit(): boolean {
    const now = Date.now()

    // If circuit breaker already tripped, reject all prompts
    if (rateLimitState.circuitBreakerTripped) {
      debug('Circuit breaker tripped - rejecting prompt')
      return false
    }

    // Clean old timestamps
    const recentPrompts = rateLimitState.recentPrompts.filter(
      (t) => now - t < PROMPT_RATE_LIMIT_CLEANUP_WINDOW_MS
    )

    // Count very recent prompts (within 1 second)
    const veryRecentCount = recentPrompts.filter(
      (t) => now - t < PROMPT_RATE_LIMIT_CHECK_WINDOW_MS
    ).length

    // Circuit breaker: if >10 prompts in 1 second, trip it
    if (veryRecentCount >= PROMPT_CIRCUIT_BREAKER_THRESHOLD) {
      debug('SECURITY: Circuit breaker tripped - too many prompts')
      setRateLimitState({ circuitBreakerTripped: true, recentPrompts: [] })

      // Show error to user
      if (showErrorCallback !== null) {
        showErrorCallback(
          'Too many prompts received. Possible attack detected. Please reconnect.'
        )
      }

      // Disconnect socket
      if (disconnectCallback !== null) {
        disconnectCallback()
      }

      return false
    }

    // Normal rate limit: max 5 prompts per second
    if (veryRecentCount >= PROMPT_RATE_LIMIT_MAX_PER_SECOND) {
      debug('Prompt rate limit: dropping prompt')
      return false
    }

    // Accept prompt and record timestamp
    setRateLimitState({ recentPrompts: [...recentPrompts, now] })
    return true
  }

  /**
   * Submit a response to the server
   */
  function submitResponse(response: PromptResponsePayload): void {
    debug('Submitting prompt response', response.id, response.action)
    if (responseCallback !== null) {
      responseCallback(response)
    }
  }

  /**
   * Show a modal prompt (input, confirm, notice)
   */
  function showPrompt(payload: PromptPayload): void {
    debug('showPrompt', payload.id, payload.type)

    // Rate limit check
    if (!checkPromptRateLimit()) {
      return
    }

    // Play sound if enabled
    if (payload.sound !== false && payload.severity !== undefined) {
      playPromptSound(payload.severity)
    }

    // If no active prompt, show immediately
    if (state.activePrompt === null) {
      setState({ activePrompt: payload })
    } else if (state.promptQueue.length < MAX_MODAL_QUEUE_SIZE) {
      // Queue if under limit
      setState('promptQueue', [...state.promptQueue, payload])
    } else {
      debug('Prompt queue full, dropping prompt:', payload.id)
    }
  }

  /**
   * Dismiss the current prompt and show next in queue
   */
  function dismissPrompt(
    id: string,
    action?: string,
    inputs?: Record<string, string>
  ): void {
    const effectiveAction = action ?? 'dismissed'
    debug('dismissPrompt', id, effectiveAction)

    if (state.activePrompt?.id === id) {
      // Send response to server
      submitResponse({ id, action: effectiveAction, inputs })

      // Show next queued prompt or clear
      const nextPrompt = state.promptQueue[0]
      if (nextPrompt !== undefined) {
        setState({
          activePrompt: nextPrompt,
          promptQueue: state.promptQueue.slice(1)
        })
      } else {
        setState({ activePrompt: null })
      }
    }
  }

  /**
   * Add a toast notification
   */
  function addToast(payload: PromptPayload): void {
    debug('addToast', payload.id)

    // Rate limit check
    if (!checkPromptRateLimit()) {
      return
    }

    // Play sound if enabled
    if (payload.sound !== false && payload.severity !== undefined) {
      playPromptSound(payload.severity)
    }

    // Remove oldest toast if at limit
    if (state.toasts.length >= MAX_ACTIVE_TOASTS) {
      setState('toasts', state.toasts.slice(1))
    }

    // Add new toast
    setState('toasts', [...state.toasts, payload])

    // Auto-dismiss after timeout
    const timeout = payload.timeout ?? DEFAULT_TOAST_TIMEOUT_MS
    setTimeout(() => removeToast(payload.id), timeout)
  }

  /**
   * Remove a toast by ID
   */
  function removeToast(id: string): void {
    debug('removeToast', id)
    setState(
      'toasts',
      state.toasts.filter((t) => t.id !== id)
    )
  }

  /**
   * Dismiss all prompts (emergency close)
   */
  function dismissAllPrompts(): void {
    debug('dismissAllPrompts')

    // Send dismiss responses for all active prompts
    if (state.activePrompt !== null) {
      submitResponse({ id: state.activePrompt.id, action: 'dismissed' })
    }
    for (const prompt of state.promptQueue) {
      submitResponse({ id: prompt.id, action: 'dismissed' })
    }

    // Clear all state
    setState({
      activePrompt: null,
      promptQueue: [],
      toasts: []
    })
  }

  /**
   * Reset circuit breaker (call after reconnection)
   */
  function resetCircuitBreaker(): void {
    debug('resetCircuitBreaker')
    setRateLimitState({
      recentPrompts: [],
      circuitBreakerTripped: false
    })
  }

  /**
   * Set the response callback (called by socket service)
   */
  function setResponseCallback(
    callback: (response: PromptResponsePayload) => void
  ): void {
    responseCallback = callback
  }

  /**
   * Set the disconnect callback (called by socket service)
   */
  function setDisconnectCallback(callback: () => void): void {
    disconnectCallback = callback
  }

  /**
   * Set the error modal callback (called by app)
   */
  function setShowErrorCallback(callback: (message: string) => void): void {
    showErrorCallback = callback
  }

  /**
   * Check if circuit breaker is tripped
   */
  function isCircuitBreakerTripped(): boolean {
    return rateLimitState.circuitBreakerTripped
  }

  return {
    // State getters
    get state() {
      return state
    },
    get activePrompt() {
      return state.activePrompt
    },
    get promptQueue() {
      return state.promptQueue
    },
    get toasts() {
      return state.toasts
    },

    // Actions
    showPrompt,
    dismissPrompt,
    addToast,
    removeToast,
    dismissAllPrompts,
    resetCircuitBreaker,
    isCircuitBreakerTripped,

    // Initialization
    setResponseCallback,
    setDisconnectCallback,
    setShowErrorCallback
  }
}

/**
 * Singleton prompt store instance
 */
export const promptStore = createRoot(createPromptStoreInternal)
