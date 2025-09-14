/**
 * Terminal resize utilities following Single Responsibility Principle
 * Each function has a single, well-defined purpose
 */

import { createDebouncer } from './debounce.js'
import type { ClientResizePayload } from '../types/events.d'
import {
  TERMINAL_MIN_COLS,
  TERMINAL_MAX_COLS,
  TERMINAL_MIN_ROWS,
  TERMINAL_MAX_ROWS,
  RESIZE_DEBOUNCE_DELAY
} from '../constants.js'

/**
 * Pure function to validate terminal dimensions
 * @param dims - Terminal dimensions to validate
 * @returns true if dimensions are valid
 */
export const validateDimensions = (dims: {
  cols: number
  rows: number
}): boolean => {
  return (
    dims.cols > 0 &&
    dims.rows > 0 &&
    Number.isFinite(dims.cols) &&
    Number.isFinite(dims.rows)
  )
}

/**
 * Pure function to normalize terminal dimensions
 * Ensures dimensions are integers and within reasonable bounds
 * @param dims - Raw dimensions
 * @returns Normalized dimensions
 */
export const normalizeDimensions = (dims: {
  cols: number
  rows: number
}): ClientResizePayload => ({
  cols: Math.min(
    Math.max(TERMINAL_MIN_COLS, Math.floor(dims.cols)),
    TERMINAL_MAX_COLS
  ),
  rows: Math.min(
    Math.max(TERMINAL_MIN_ROWS, Math.floor(dims.rows)),
    TERMINAL_MAX_ROWS
  )
})

/**
 * Pure function to check if dimensions have changed
 * @param prev - Previous dimensions
 * @param current - Current dimensions
 * @returns true if dimensions are different
 */
export const dimensionsChanged = (
  prev: { cols: number; rows: number },
  current: { cols: number; rows: number }
): boolean => {
  return prev.cols !== current.cols || prev.rows !== current.rows
}

/**
 * Creates a debounced resize emitter with validation
 * Composition of validation, normalization, and debouncing
 * @param emitFn - Function to emit resize events
 * @param delay - Debounce delay in milliseconds (default: 150ms)
 * @returns Debounced resize emitter function
 */
export const createDebouncedResizeEmitter = (
  emitFn: (dims: ClientResizePayload) => void,
  delay = RESIZE_DEBOUNCE_DELAY
) => {
  const debouncedEmit = createDebouncer(emitFn, delay)

  return (dims: { cols: number; rows: number }) => {
    if (validateDimensions(dims)) {
      const normalized = normalizeDimensions(dims)
      debouncedEmit(normalized)
    }
  }
}

/**
 * Creates a resize handler with dimension tracking
 * Prevents duplicate emissions for unchanged dimensions
 * @param emitFn - Function to emit resize events
 * @param delay - Debounce delay in milliseconds
 * @returns Resize handler with state tracking
 */
export const createSmartResizeHandler = (
  emitFn: (dims: ClientResizePayload) => void,
  delay = RESIZE_DEBOUNCE_DELAY
) => {
  let lastDimensions: ClientResizePayload | null = null
  const debouncedEmit = createDebouncer(emitFn, delay)

  return (dims: { cols: number; rows: number }) => {
    if (!validateDimensions(dims)) {
      return
    }

    const normalized = normalizeDimensions(dims)

    if (!lastDimensions || dimensionsChanged(lastDimensions, normalized)) {
      lastDimensions = normalized
      debouncedEmit(normalized)
    }
  }
}
