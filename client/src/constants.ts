/**
 * Application-wide constants and configuration values
 */
import type { SSHAuthMethod } from './types/config.d'

// Debounce delays (in milliseconds)
export const RESIZE_DEBOUNCE_DELAY = 150 // Delay for terminal resize events

// Terminal dimension limits
export const TERMINAL_MIN_COLS = 1
export const TERMINAL_MAX_COLS = 9999
export const TERMINAL_MIN_ROWS = 1
export const TERMINAL_MAX_ROWS = 9999

// Default terminal dimensions
export const DEFAULT_TERMINAL_COLS = 80
export const DEFAULT_TERMINAL_ROWS = 24

// Socket timeouts (in milliseconds)
export const SOCKET_RECONNECT_DELAY = 1000
export const SOCKET_MAX_RECONNECT_ATTEMPTS = 5

// UI Animation durations (in milliseconds)
export const MODAL_ANIMATION_DURATION = 200
export const NOTIFICATION_DISPLAY_DURATION = 3000

// Logging
export const MAX_LOG_SIZE = 1024 * 1024 * 10 // 10MB max log size
export const LOG_ROTATION_THRESHOLD = 1024 * 1024 * 8 // Rotate at 8MB

// Authentication
export const DEFAULT_AUTH_METHODS: SSHAuthMethod[] = [
  'password',
  'keyboard-interactive',
  'publickey'
]

// Prompt system constants (client-side)

/** Prompt rate limiting (client-side DoS prevention) */
export const PROMPT_RATE_LIMIT_MAX_PER_SECOND = 5
export const PROMPT_CIRCUIT_BREAKER_THRESHOLD = 10 // Prompts in 1 second trips breaker
export const PROMPT_RATE_LIMIT_CHECK_WINDOW_MS = 1000
export const PROMPT_RATE_LIMIT_CLEANUP_WINDOW_MS = 10000

/** Prompt UI limits */
export const MAX_ACTIVE_TOASTS = 5
export const MAX_MODAL_QUEUE_SIZE = 3

/** Prompt timeouts (milliseconds) */
export const DEFAULT_TOAST_TIMEOUT_MS = 5000
export const FORCE_CLOSE_ENABLE_DELAY_MS = 5000

/** Swipe-to-dismiss threshold (pixels) */
export const SWIPE_THRESHOLD_PX = 100

/** Prompt animation durations */
export const PROMPT_ANIMATION_DURATION_MS = 200

/** Socket event names */
export const SOCKET_EVENT_PROMPT = 'prompt'
export const SOCKET_EVENT_PROMPT_RESPONSE = 'prompt-response'
