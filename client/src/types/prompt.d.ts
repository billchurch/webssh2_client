/**
 * Prompt system type definitions
 * Generic prompt interface for server-driven UI prompts
 */

/**
 * Prompt severity levels for visual styling
 */
export type PromptSeverity = 'info' | 'warning' | 'error' | 'success'

/**
 * Prompt types determining behavior and UI
 * - input: Takes focus, blocks terminal, requires user input
 * - confirm: Takes focus, blocks terminal, yes/no/cancel choices
 * - notice: Takes focus, blocks terminal, informational with OK button
 * - toast: No focus, no block, auto-dismisses
 */
export type PromptType = 'input' | 'confirm' | 'notice' | 'toast'

/**
 * Button configuration for prompts
 */
export interface PromptButton {
  /** Action identifier sent back in response */
  action: string
  label: string
  variant?: 'primary' | 'secondary' | 'danger'
  /** Client-side only: marks this as the default/submit button */
  default?: boolean
}

/**
 * Input field configuration for input-type prompts
 */
export interface PromptInput {
  id: string
  label: string
  type: 'text' | 'password'
  placeholder?: string
  required?: boolean
  value?: string
}

/**
 * Main prompt payload received from server
 */
export interface PromptPayload {
  id: string
  type: PromptType
  title: string
  message?: string
  buttons?: PromptButton[]
  inputs?: PromptInput[]
  severity?: PromptSeverity
  /**
   * Optional custom icon from lucide-solid package
   * Must match PROMPT_ICON_REGISTRY whitelist on client
   * Falls back to severity-based icon if not found
   */
  icon?: string
  autoFocus?: boolean
  timeout?: number
  closeOnBackdrop?: boolean
  /** Enable sound notification for this prompt */
  sound?: boolean
}

/**
 * Response payload sent to server
 */
export interface PromptResponsePayload {
  id: string
  action: string
  inputs?: Record<string, string>
}
