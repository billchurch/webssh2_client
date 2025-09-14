/**
 * Pure debounce utility following Single Responsibility Principle
 * Creates a debounced version of any function that delays execution
 */

/**
 * Creates a debounced version of the provided function
 * @param fn - The function to debounce
 * @param delay - Delay in milliseconds before executing
 * @returns Debounced version of the function
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const createDebouncer = <T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): T => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  return ((...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }

    timeoutId = setTimeout(() => {
      fn(...args)
      timeoutId = null
    }, delay)
  }) as T
}

/**
 * Creates a debounced function with cancel capability
 * @param fn - The function to debounce
 * @param delay - Delay in milliseconds
 * @returns Object with debounced function and cancel method
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const createCancellableDebouncer = <T extends (...args: any[]) => any>(
  fn: T,
  delay: number
) => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  const debounced = ((...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }

    timeoutId = setTimeout(() => {
      fn(...args)
      timeoutId = null
    }, delay)
  }) as T

  const cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
  }

  return { debounced, cancel }
}
