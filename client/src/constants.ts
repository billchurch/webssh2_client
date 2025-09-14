/**
 * Application-wide constants and configuration values
 */

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
