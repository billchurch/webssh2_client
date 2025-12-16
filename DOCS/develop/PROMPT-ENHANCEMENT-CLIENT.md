# WebSSH2 Client - Generic Prompt Interface Enhancement

> **Related Document**: [Server PRD](../../../webssh2/.private-docs/PROMPT-ENHANCEMENT-SERVER.md)
>
> **Original Unified PRD**: [../../../PROMPT-ENHANCEMENT.md](../../../PROMPT-ENHANCEMENT.md)

## Implementation Status

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 1: Type Definitions & Constants | **COMPLETE** | `prompt.d.ts`, `events.d.ts`, `constants.ts` updated |
| Phase 2: Icon Registry | **COMPLETE** | `prompt-icons.ts` with static imports |
| Phase 3: Client Components | **COMPLETE** | `prompt-store.ts`, `UniversalPrompt.tsx`, `Toast.tsx`, `ToastContainer.tsx` |
| Phase 4: Socket Integration | **COMPLETE** | `socket.ts` updated with event handlers |
| Phase 5: App Integration | **COMPLETE** | `app.tsx` integrated with store and components |
| Phase 6: Backwards Compatibility | **COMPLETE** | Existing keyboard-interactive unchanged, works alongside new system |
| Phase 7: Testing | **COMPLETE** | `prompt-store.test.js`, `prompt-security.test.js`, `prompt-components.test.js` |
| Verification | **PASSED** | TypeScript, ESLint (0 errors), 157 tests passing |

**Branch**: `feature/generic-prompt-system`

### Resolved Questions

| Question | Decision |
|----------|----------|
| Toast close button? | **Both** - Close button + auto-timeout (5s default) |
| Swipe-to-dismiss? | **Yes** - Implemented for touch devices |
| Sound notifications? | **Yes (optional)** - Web Audio API, configurable via localStorage |

### Additional Features Implemented

- **Sound notifications** (`prompt-sounds.ts`) - Optional Web Audio API sounds
- **Swipe-to-dismiss** - Touch support with 100px threshold
- **Emergency close** - Ctrl+Shift+Esc dismisses all prompts
- **Focus trap safety** - Force-enables backdrop close after 5 seconds

## Overview

This document outlines the client-side implementation for the WebSSH2 generic prompt interface system. The goal is to provide a consistent UI for server-driven prompts (confirmations, notices, inputs, toasts) without requiring client-side code changes for each new server feature.

## Scope

This PRD covers:

- Client-side type definitions and constants
- Prompt components (UniversalPrompt, Toast, ToastContainer)
- State management (prompt-store)
- Socket event handling
- Backwards compatibility with keyboard-interactive
- Security requirements (HTML escaping, rate limiting, focus trap prevention)

## Current State Analysis

### Existing Prompts/Dialogs

1. **LoginModal** (`client/src/components/LoginModal.tsx`)
   - Full SSH connection form (host, port, username, password, private key)
   - Includes options button for settings
   - Shows auth method restrictions

2. **ErrorModal** (`client/src/components/Modal.tsx:132-169`)
   - Simple error display with "Close" button
   - Red-themed styling for errors
   - Uses base Modal component

3. **PromptModal** (`client/src/components/Modal.tsx:171-263`)
   - Currently used for keyboard-interactive authentication
   - Supports multiple prompts with text/password inputs
   - Has "Cancel" and "Submit" buttons
   - **This will be refactored to use the new generic system**

4. **Reconnect Button** (`client/src/app.tsx:553-562`)
   - Floating button (not a modal)
   - Shows when disconnected and reconnection is allowed

### Current Socket Events

**Server → Client:**
- `authentication` - Auth flow including `keyboard-interactive` action with prompts array
- `ssherror` - Simple error string
- `updateUI` - Dynamic UI updates (header, footer, status)

**Client → Server:**
- `data` - Terminal data (keyboard-interactive responses sent via this)

## Architecture Design

```
┌─────────────────────────────────────────────────────────────┐
│                      Server Side                             │
│              (See Server PRD for details)                    │
└─────────────────────────────────────────────────────────────┘
                          ↓
                   Socket.IO Events
                          ↓
                   'prompt' event
                   'prompt-response' event
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                      Client Side                             │
│              (webssh2_client/client/src/)                    │
├─────────────────────────────────────────────────────────────┤
│  Generic Prompt System:                                      │
│  - UniversalPrompt Component (modal prompts)                 │
│  - ToastContainer Component (toast notifications)            │
│  - Toast Component (individual toast)                        │
│  - PromptStore (state management)                            │
│  - Response handler ('prompt-response' event)                │
│                                                              │
│  Files to create/modify:                                     │
│  - components/prompts/UniversalPrompt.tsx (new)              │
│  - components/prompts/Toast.tsx (new)                        │
│  - components/prompts/ToastContainer.tsx (new)               │
│  - stores/prompt-store.ts (new)                              │
│  - utils/prompt-icons.ts (new - icon registry)               │
│  - services/socket.ts (add handlers)                         │
│  - types/prompt.d.ts (new)                                   │
│  - types/events.d.ts (update)                                │
│  - constants.ts (update)                                     │
│  - app.tsx (add prompt rendering)                            │
│                                                              │
│  Refactored (optional):                                      │
│  - components/Modal.tsx (PromptModal uses new system)        │
│  - components/Modal.tsx (ErrorModal uses new system)         │
└─────────────────────────────────────────────────────────────┘
```

## Prompt Types and Behavior

| Type | Takes Focus | Blocks Terminal | Auto-Dismiss | Use Case |
|------|-------------|-----------------|--------------|----------|
| `input` | YES | YES | NO | Text/password inputs, forms |
| `confirm` | YES | YES | NO | Yes/No/Cancel dialogs |
| `notice` | YES | YES | NO | Information with OK button |
| `toast` | NO | NO | YES (5s default) | Status updates |

## TypeScript Type Definitions

### Create: `client/src/types/prompt.d.ts`

```typescript
/**
 * Prompt severity levels for visual styling
 */
export type PromptSeverity = 'info' | 'warning' | 'error' | 'success'

/**
 * Prompt types determining behavior and UI
 */
export type PromptType = 'input' | 'confirm' | 'notice' | 'toast'

/**
 * Button configuration for prompts
 */
export interface PromptButton {
  id: string
  label: string
  variant?: 'primary' | 'secondary' | 'danger'
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
  /** Optional custom icon from lucide-solid package
   * Must match ALLOWED_PROMPT_ICONS whitelist on server
   * Client will fallback to severity-based icon if not found in registry */
  icon?: string
  autoFocus?: boolean
  timeout?: number
  closeOnBackdrop?: boolean
}

/**
 * Response payload sent to server
 */
export interface PromptResponsePayload {
  id: string
  action: string
  inputs?: Record<string, string>
}
```

### Update: `client/src/types/events.d.ts`

```typescript
import type { PromptPayload, PromptResponsePayload } from './prompt'

// Re-export for convenience
export type {
  PromptSeverity,
  PromptType,
  PromptButton,
  PromptInput,
  PromptPayload,
  PromptResponsePayload
} from './prompt'

// Add to ServerToClientEvents
export interface ServerToClientEvents {
  // ... existing events ...
  prompt: (payload: PromptPayload) => void
}

// Add to ClientToServerEvents
export interface ClientToServerEvents {
  // ... existing events ...
  'prompt-response': (response: PromptResponsePayload) => void
}
```

## Constants Definition

### Update: `client/src/constants.ts`

```typescript
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

/** Prompt accessibility */
export const TOAST_ANNOUNCEMENT_RATE_LIMIT_MS = 500

/** Prompt animation durations */
export const PROMPT_ANIMATION_DURATION_MS = 200

/** Socket event names */
export const SOCKET_EVENT_PROMPT = 'prompt'
export const SOCKET_EVENT_PROMPT_RESPONSE = 'prompt-response'
```

## Security Requirements

### 1. HTML Escaping (MANDATORY)

All text content from server MUST be escaped before rendering:

```typescript
// client/src/utils/security.ts
/**
 * Escapes HTML special characters to prevent XSS
 * SECURITY: Use this for ALL server-provided text in prompts
 */
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  }
  return text.replace(/[&<>"'/]/g, (char) => map[char])
}

// SAFE - SolidJS text interpolation (automatic escaping):
<h3>{props.prompt.title}</h3>

// NEVER DO THIS:
<h3 innerHTML={props.prompt.title}></h3>
```

### 1.5 Icon Resolution (MANDATORY)

Icons must be resolved from a static registry - **never** use dynamic imports or string concatenation to load icons. This prevents path traversal and arbitrary code execution.

Create: `client/src/utils/prompt-icons.ts`

```typescript
import {
  Info, AlertTriangle, AlertCircle, CheckCircle, XCircle,
  Key, KeyRound, Lock, Unlock, Shield, ShieldCheck, ShieldAlert,
  Fingerprint, UserCheck, UserX,
  File, FileText, FileQuestion, FilePlus, FileMinus, FileX,
  Folder, FolderOpen, Upload, Download, Trash2, Save, Copy, Clipboard,
  Wifi, WifiOff, Globe, Server, Database, Link, Unlink, RefreshCw, RotateCcw,
  Settings, HelpCircle, MessageSquare, Bell, BellOff, Clock, Timer,
  Terminal, Code, Zap, Power, LogOut, LogIn,
  Eye, EyeOff, Search, Edit, Pencil, Plus, Minus, X, Check, Ban, Loader2
} from 'lucide-solid'
import type { Component } from 'solid-js'
import type { LucideProps } from 'lucide-solid'

/**
 * Static icon registry - SECURITY: Only these icons can be rendered
 * Icons are imported statically to prevent dynamic import attacks
 *
 * This list must match ALLOWED_PROMPT_ICONS on the server
 */
export const PROMPT_ICON_REGISTRY: Record<string, Component<LucideProps>> = {
  // Severity/Status icons (defaults)
  Info, AlertTriangle, AlertCircle, CheckCircle, XCircle,
  // Authentication & Security
  Key, KeyRound, Lock, Unlock, Shield, ShieldCheck, ShieldAlert,
  Fingerprint, UserCheck, UserX,
  // File operations
  File, FileText, FileQuestion, FilePlus, FileMinus, FileX,
  Folder, FolderOpen, Upload, Download, Trash2, Save, Copy, Clipboard,
  // Connection & Network
  Wifi, WifiOff, Globe, Server, Database, Link, Unlink, RefreshCw, RotateCcw,
  // Actions & UI
  Settings, HelpCircle, MessageSquare, Bell, BellOff, Clock, Timer,
  Terminal, Code, Zap, Power, LogOut, LogIn,
  // Misc
  Eye, EyeOff, Search, Edit, Pencil, Plus, Minus, X, Check, Ban, Loader2,
}

/** Default icons for each severity level */
const SEVERITY_DEFAULT_ICONS: Record<string, Component<LucideProps>> = {
  info: Info,
  warning: AlertTriangle,
  error: AlertCircle,
  success: CheckCircle,
}

/**
 * Resolve an icon by name with graceful fallback
 * SECURITY: Only returns icons from the static registry
 *
 * @param iconName - The icon name from the server (optional)
 * @param severity - The severity level for fallback
 * @returns The icon component, or default based on severity
 */
export function resolvePromptIcon(
  iconName: string | undefined,
  severity: string = 'info'
): Component<LucideProps> {
  // If icon specified, look it up in registry
  if (iconName !== undefined) {
    const icon = PROMPT_ICON_REGISTRY[iconName]
    if (icon !== undefined) {
      return icon
    }
    // Icon not found - log warning and fallback gracefully
    console.warn(
      `[WebSSH2] Unknown prompt icon: '${iconName}'. ` +
      `Icon not in PROMPT_ICON_REGISTRY. Falling back to severity default. ` +
      `This may indicate a server/client version mismatch.`
    )
  }

  // Return severity-based default
  return SEVERITY_DEFAULT_ICONS[severity] ?? Info
}
```

**Key Security Points:**

1. **Static imports only** - All icons imported at build time, no dynamic `import()`
2. **Object lookup** - Icon name used as key, not for path construction
3. **Graceful fallback** - Unknown icons don't crash, they log and use defaults
4. **No string interpolation** - Never `import(\`lucide-solid/icons/${iconName}\`)`

### 2. Client-Side Rate Limiting (MANDATORY)

```typescript
// client/src/stores/prompt-store.ts
import {
  PROMPT_RATE_LIMIT_MAX_PER_SECOND,
  PROMPT_CIRCUIT_BREAKER_THRESHOLD,
  PROMPT_RATE_LIMIT_CHECK_WINDOW_MS,
  PROMPT_RATE_LIMIT_CLEANUP_WINDOW_MS
} from '../constants.js'

interface PromptRateLimitState {
  recentPrompts: number[]  // timestamps
  circuitBreakerTripped: boolean
}

const [rateLimitState, setRateLimitState] = createStore<PromptRateLimitState>({
  recentPrompts: [],
  circuitBreakerTripped: false
})

/**
 * Check if we should accept a new prompt (DoS prevention)
 */
function checkPromptRateLimit(): boolean {
  const now = Date.now()

  // Clean old timestamps
  const recentPrompts = rateLimitState.recentPrompts.filter(
    t => now - t < PROMPT_RATE_LIMIT_CLEANUP_WINDOW_MS
  )

  // Circuit breaker: if >10 prompts in 1 second, trip it
  const veryRecentCount = recentPrompts.filter(
    t => now - t < PROMPT_RATE_LIMIT_CHECK_WINDOW_MS
  ).length

  if (veryRecentCount > PROMPT_CIRCUIT_BREAKER_THRESHOLD) {
    setRateLimitState({ circuitBreakerTripped: true })
    console.error('SECURITY: Circuit breaker tripped - too many prompts')

    // Show error modal to user
    showErrorModal('Too many prompts received. Possible attack detected. Please reconnect.')

    // Disconnect socket
    disconnectSocket()
    return false
  }

  // Normal rate limit: max 5 prompts per second
  const recentCount = recentPrompts.filter(
    t => now - t < PROMPT_RATE_LIMIT_CHECK_WINDOW_MS
  ).length

  if (recentCount >= PROMPT_RATE_LIMIT_MAX_PER_SECOND) {
    console.warn('Prompt rate limit: dropping prompt')
    return false
  }

  // Accept prompt
  setRateLimitState({ recentPrompts: [...recentPrompts, now] })
  return true
}
```

### 3. Focus Trap Prevention (MANDATORY)

Prevent modal traps that could lock users:

```typescript
// client/src/components/prompts/UniversalPrompt.tsx
import { FORCE_CLOSE_ENABLE_DELAY_MS } from '../../constants.js'

createEffect(() => {
  if (props.prompt.type !== 'toast') {
    // Force enable backdrop close after 5 seconds (safety mechanism)
    const timer = setTimeout(() => {
      setForceCloseEnabled(true)
    }, FORCE_CLOSE_ENABLE_DELAY_MS)

    onCleanup(() => clearTimeout(timer))
  }
})

// Always allow Ctrl+Shift+Esc to force close all prompts (emergency escape)
createEffect(() => {
  const handleForceClose = (e: KeyboardEvent) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'Escape') {
      e.preventDefault()
      dismissAllPrompts()
    }
  }
  window.addEventListener('keydown', handleForceClose)
  onCleanup(() => window.removeEventListener('keydown', handleForceClose))
})
```

## Component Specifications

### 1. Prompt Store (`stores/prompt-store.ts`)

```typescript
import { createStore } from 'solid-js/store'
import { createSignal } from 'solid-js'
import type { PromptPayload, PromptResponsePayload } from '../types/prompt'
import {
  MAX_ACTIVE_TOASTS,
  MAX_MODAL_QUEUE_SIZE,
  DEFAULT_TOAST_TIMEOUT_MS
} from '../constants.js'

interface PromptState {
  activePrompt: PromptPayload | null
  promptQueue: PromptPayload[]  // Queue for modals when one is already showing
  toasts: PromptPayload[]
}

const [promptState, setPromptState] = createStore<PromptState>({
  activePrompt: null,
  promptQueue: [],
  toasts: []
})

export function showPrompt(payload: PromptPayload): void {
  // Rate limit check first
  if (!checkPromptRateLimit()) return

  if (promptState.activePrompt === null) {
    setPromptState({ activePrompt: payload })
  } else if (promptState.promptQueue.length < MAX_MODAL_QUEUE_SIZE) {
    setPromptState('promptQueue', [...promptState.promptQueue, payload])
  } else {
    console.warn('Prompt queue full, dropping prompt:', payload.id)
  }
}

export function dismissPrompt(id: string, action: string = 'dismissed'): void {
  if (promptState.activePrompt?.id === id) {
    // Send response to server
    submitPromptResponse({ id, action })

    // Show next queued prompt or clear
    const nextPrompt = promptState.promptQueue[0]
    if (nextPrompt !== undefined) {
      setPromptState({
        activePrompt: nextPrompt,
        promptQueue: promptState.promptQueue.slice(1)
      })
    } else {
      setPromptState({ activePrompt: null })
    }
  }
}

export function addToast(payload: PromptPayload): void {
  if (!checkPromptRateLimit()) return

  // Limit active toasts
  if (promptState.toasts.length >= MAX_ACTIVE_TOASTS) {
    // Remove oldest toast
    setPromptState('toasts', promptState.toasts.slice(1))
  }

  setPromptState('toasts', [...promptState.toasts, payload])

  // Auto-dismiss after timeout
  const timeout = payload.timeout ?? DEFAULT_TOAST_TIMEOUT_MS
  setTimeout(() => removeToast(payload.id), timeout)
}

export function removeToast(id: string): void {
  setPromptState('toasts', promptState.toasts.filter(t => t.id !== id))
}

export function dismissAllPrompts(): void {
  // Send dismiss responses for all active prompts
  if (promptState.activePrompt !== null) {
    submitPromptResponse({ id: promptState.activePrompt.id, action: 'dismissed' })
  }
  for (const prompt of promptState.promptQueue) {
    submitPromptResponse({ id: prompt.id, action: 'dismissed' })
  }

  setPromptState({
    activePrompt: null,
    promptQueue: [],
    toasts: []
  })
}

// Export state for components
export { promptState }
```

### 2. UniversalPrompt Component (`components/prompts/UniversalPrompt.tsx`)

```tsx
import { Component, createSignal, createEffect, onCleanup, For, Show } from 'solid-js'
import { X } from 'lucide-solid'
import type { PromptPayload, PromptResponsePayload } from '../../types/prompt'
import { Modal } from '../Modal'
import { FORCE_CLOSE_ENABLE_DELAY_MS } from '../../constants.js'
import { resolvePromptIcon } from '../../utils/prompt-icons'

interface UniversalPromptProps {
  prompt: PromptPayload
  onResponse: (response: PromptResponsePayload) => void
  onDismiss: () => void
}

const severityColors = {
  info: 'text-blue-500',
  warning: 'text-yellow-500',
  error: 'text-red-500',
  success: 'text-green-500'
}

export const UniversalPrompt: Component<UniversalPromptProps> = (props) => {
  const [inputValues, setInputValues] = createSignal<Record<string, string>>({})
  const [forceCloseEnabled, setForceCloseEnabled] = createSignal(false)

  // Initialize input values
  createEffect(() => {
    const initialValues: Record<string, string> = {}
    for (const input of props.prompt.inputs ?? []) {
      initialValues[input.id] = input.value ?? ''
    }
    setInputValues(initialValues)
  })

  // Safety: force enable backdrop close after 5 seconds
  createEffect(() => {
    const timer = setTimeout(() => {
      setForceCloseEnabled(true)
    }, FORCE_CLOSE_ENABLE_DELAY_MS)
    onCleanup(() => clearTimeout(timer))
  })

  const handleButtonClick = (buttonId: string) => {
    props.onResponse({
      id: props.prompt.id,
      action: buttonId,
      inputs: props.prompt.inputs !== undefined ? inputValues() : undefined
    })
  }

  const handleBackdropClick = () => {
    if (props.prompt.closeOnBackdrop !== false || forceCloseEnabled()) {
      props.onDismiss()
    }
  }

  // Resolve icon: use custom icon if provided, otherwise fallback to severity default
  // If icon is not in registry, logs warning and uses severity fallback
  const IconComponent = resolvePromptIcon(
    props.prompt.icon,
    props.prompt.severity ?? 'info'
  )
  const severityColor = severityColors[props.prompt.severity ?? 'info']

  return (
    <Modal isOpen={true} onClose={handleBackdropClick}>
      <div class="p-6 max-w-md">
        {/* Header with icon and title */}
        <div class="flex items-center gap-3 mb-4">
          <IconComponent class={`w-6 h-6 ${severityColor}`} />
          <h3 class="text-lg font-semibold">{props.prompt.title}</h3>
        </div>

        {/* Message */}
        <Show when={props.prompt.message}>
          <p class="text-gray-600 dark:text-gray-300 mb-4">
            {props.prompt.message}
          </p>
        </Show>

        {/* Input fields */}
        <Show when={props.prompt.inputs !== undefined && props.prompt.inputs.length > 0}>
          <div class="space-y-4 mb-4">
            <For each={props.prompt.inputs}>
              {(input) => (
                <div>
                  <label class="block text-sm font-medium mb-1">
                    {input.label}
                  </label>
                  <input
                    type={input.type}
                    placeholder={input.placeholder}
                    value={inputValues()[input.id] ?? ''}
                    onInput={(e) => setInputValues(prev => ({
                      ...prev,
                      [input.id]: e.currentTarget.value
                    }))}
                    required={input.required}
                    class="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>
              )}
            </For>
          </div>
        </Show>

        {/* Buttons */}
        <div class="flex justify-end gap-2">
          <For each={props.prompt.buttons ?? [{ action: 'ok', label: 'OK', variant: 'primary', default: true }]}>
            {(button) => (
              <button
                onClick={() => handleButtonClick(button.action)}
                class={`px-4 py-2 rounded-md font-medium transition-colors ${
                  button.variant === 'danger'
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : button.variant === 'primary'
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-600 dark:text-white'
                }`}
                autofocus={button.default}
              >
                {button.label}
              </button>
            )}
          </For>
        </div>
      </div>
    </Modal>
  )
}
```

### 3. Toast Component (`components/prompts/Toast.tsx`)

```tsx
import { Component } from 'solid-js'
import { X } from 'lucide-solid'
import type { PromptPayload } from '../../types/prompt'
import { resolvePromptIcon } from '../../utils/prompt-icons'

interface ToastProps {
  toast: PromptPayload
  onDismiss: (id: string) => void
}

const severityStyles = {
  info: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-200',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-200',
  error: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200',
  success: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200'
}

export const Toast: Component<ToastProps> = (props) => {
  const severity = props.toast.severity ?? 'info'
  // Resolve icon: custom icon if provided, otherwise severity default
  const IconComponent = resolvePromptIcon(props.toast.icon, severity)
  const styles = severityStyles[severity]

  return (
    <div
      class={`flex items-center gap-3 p-4 rounded-lg border shadow-lg animate-slide-in ${styles}`}
      role="status"
      aria-live="polite"
    >
      <IconComponent class="w-5 h-5 flex-shrink-0" />
      <p class="flex-1">{props.toast.message ?? props.toast.title}</p>
      <button
        onClick={() => props.onDismiss(props.toast.id)}
        class="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
        aria-label="Dismiss"
      >
        <X class="w-4 h-4" />
      </button>
    </div>
  )
}
```

### 4. ToastContainer Component (`components/prompts/ToastContainer.tsx`)

```tsx
import { Component, For } from 'solid-js'
import { Toast } from './Toast'
import { promptState, removeToast } from '../../stores/prompt-store'

export const ToastContainer: Component = () => {
  return (
    <div class="fixed bottom-6 right-6 z-[1000] flex flex-col gap-2 max-w-sm">
      <For each={promptState.toasts}>
        {(toast) => <Toast toast={toast} onDismiss={removeToast} />}
      </For>
    </div>
  )
}
```

## Socket Integration

### Update: `services/socket.ts`

```typescript
import type { PromptPayload, PromptResponsePayload } from '../types/prompt'
import { showPrompt, addToast } from '../stores/prompt-store'

// In setupSocketListeners():
socketInstance.on('prompt', (payload: PromptPayload) => {
  debug('Prompt received', payload)

  if (payload.type === 'toast') {
    addToast(payload)
  } else {
    showPrompt(payload)
  }
})

// Helper for sending responses
export const submitPromptResponse = (response: PromptResponsePayload): void => {
  const currentSocket = socket()
  if (currentSocket !== null) {
    debug('Submitting prompt response', response.id, response.action)
    currentSocket.emit('prompt-response', response)
  }
}
```

## Backwards Compatibility

### Keyboard-Interactive Conversion

The existing `keyboard-interactive` authentication must continue to work. Convert the old format to the new prompt system internally:

```typescript
// In services/socket.ts - handleKeyboardInteractive()
private handleKeyboardInteractive(data: {
  prompts: Array<{ prompt: string; echo: boolean }>
  name?: string
}): void {
  debug('Keyboard interactive authentication (legacy)', data)

  // Convert to new prompt format
  const promptPayload: PromptPayload = {
    id: crypto.randomUUID(),  // Use browser crypto API
    type: 'input',
    title: data.name ?? 'Authentication Required',
    inputs: data.prompts.map((p, i) => ({
      id: `input_${i}`,
      label: p.prompt,
      type: p.echo ? 'text' : 'password',
      required: true
    })),
    buttons: [
      { action: 'cancel', label: 'Cancel', variant: 'secondary' },
      { action: 'submit', label: 'Submit', variant: 'primary', default: true }
    ],
    autoFocus: true,
    closeOnBackdrop: false
  }

  // Use new prompt system
  showPrompt(promptPayload)

  // Note: Response handling needs to send via old 'data' event for backwards compat
}
```

## App Integration

### Update: `app.tsx`

```tsx
import { UniversalPrompt } from './components/prompts/UniversalPrompt'
import { ToastContainer } from './components/prompts/ToastContainer'
import { promptState, dismissPrompt, submitPromptResponse } from './stores/prompt-store'

// In the component JSX:
return (
  <>
    {/* Existing app content */}

    {/* Toast notifications (always rendered) */}
    <ToastContainer />

    {/* Modal prompts (conditionally rendered) */}
    <Show when={promptState.activePrompt !== null}>
      <UniversalPrompt
        prompt={promptState.activePrompt!}
        onResponse={(response) => {
          submitPromptResponse(response)
          dismissPrompt(response.id, response.action)
        }}
        onDismiss={() => dismissPrompt(promptState.activePrompt!.id)}
      />
    </Show>
  </>
)
```

## Implementation Phases

### Phase 1: Type Definitions & Constants ✅

- [x] Create `client/src/types/prompt.d.ts` with all types
- [x] Update `client/src/types/events.d.ts` to include prompt types
- [x] Update `client/src/constants.ts` with prompt constants
- [x] TypeScript compilation succeeds with no errors

### Phase 2: Icon Registry ✅

- [x] Create `client/src/utils/prompt-icons.ts` - Icon registry and resolution (SECURITY)

### Phase 3: Client-Side Components ✅

**Files Created**:

- [x] `client/src/stores/prompt-store.ts` - State management with rate limiting
- [x] `client/src/components/prompts/UniversalPrompt.tsx` - Modal component
- [x] `client/src/components/prompts/Toast.tsx` - Individual toast with swipe-to-dismiss
- [x] `client/src/components/prompts/ToastContainer.tsx` - Toast container
- [x] `client/src/components/prompts/index.ts` - Barrel export
- [x] `client/src/utils/prompt-sounds.ts` - Optional Web Audio API sounds

**Note**: `escapeHtml` not needed as SolidJS text interpolation auto-escapes.

**Testing Requirements**:

- [x] Unit tests for prompt-store functions
- [x] Component tests for each prompt type (input, confirm, notice)
- [x] Component tests for toast behavior
- [x] Focus management tests
- [x] Rate limiting tests

**Styling Checklist**:

- [x] Uses TailwindCSS patterns from existing codebase
- [x] Severity colors match specification
- [x] Icons from lucide-solid only
- [x] Responsive (sm: breakpoint for larger modals)
- [x] Accessibility: proper ARIA labels, roles, focus management

### Phase 4: Socket Integration ✅

- [x] Add `prompt` event listener in `setupSocketListeners()`
- [x] Add `submitPromptResponse` helper function
- [x] Wire up prompt store to socket events

**Testing Requirements**:

- [ ] Integration test: server sends prompt → client displays → client responds (requires server)
- [x] Test all prompt types (input, confirm, notice, toast) - unit tests
- [x] Test multiple toasts stacking - unit tests
- [ ] Test prompt response flow end-to-end (requires server)

### Phase 5: Backwards Compatibility & Refactoring ✅

**Part A: Keyboard-Interactive Compatibility**:

- [x] Existing `PromptModal` and keyboard-interactive flow unchanged
- [x] New prompt system works alongside without breaking existing functionality
- [x] No server changes required

**Part B: Optional Modal Refactoring** (Deferred):

- [ ] Refactor `PromptModal` to use `UniversalPrompt` internally
- [ ] Refactor `ErrorModal` to use `UniversalPrompt` with type: 'notice'
- [ ] Keep existing component APIs intact (no breaking changes)

**Note**: Part B deferred to avoid regressions. New system works alongside existing modals.

### Phase 6: Testing & Documentation ✅

**Unit Tests (MANDATORY)**:

- [x] Prompt store functions (showPrompt, dismissPrompt, addToast, removeToast)
- [x] Rate limiter logic (5/s, circuit breaker at 10/s)
- [x] HTML escaping verification (SolidJS auto-escaping)

**Component Tests (MANDATORY)**:

- [x] UniversalPrompt renders all types correctly
- [x] Toast auto-dismisses after timeout
- [x] Focus management (first input/button focused)
- [x] Keyboard navigation (Tab, Enter, Escape)
- [x] Emergency close (Ctrl+Shift+Esc)

**E2E Tests (with Playwright)** (Pending server implementation):

- [ ] Full prompt flow: server sends → client displays → user responds → server receives
- [ ] Toast stacking and auto-dismiss
- [ ] Keyboard-interactive backwards compatibility

**Security Tests (MANDATORY)**:

- [x] XSS prevention (HTML in title/message properly escaped via SolidJS)
- [x] Rate limiting prevents DoS
- [x] Circuit breaker trips and disconnects
- [x] Focus trap force-enables after 5 seconds
- [x] Icon registry validation (unknown icons fallback gracefully)

**Accessibility Tests**:

- [x] Screen reader announces prompts (ARIA roles present)
- [x] Focus trap tests
- [x] ARIA roles and labels present
- [x] Keyboard-only navigation tests

## Success Criteria

### Functional Requirements ✅

- [x] All prompt types render correctly (input, confirm, notice, toast)
- [x] Toasts don't interfere with terminal input (no focus stealing)
- [x] Focus management works correctly (focus trap, return to terminal)
- [x] Multiple toasts stack properly (max 5)
- [x] Modal queue works (max 3 queued)
- [x] Keyboard-interactive authentication still works (no regressions)

### Security Requirements (MANDATORY) ✅

- [x] All text fields HTML-escaped (SolidJS interpolation, no innerHTML)
- [x] Client-side rate limiting implemented (5/s, circuit breaker at 10/s)
- [x] Circuit breaker trips → shows error → disconnects
- [x] Emergency close (Ctrl+Shift+Esc) works in all scenarios
- [x] Focus trap force-disables after 5 seconds
- [x] No XSS possible via prompt content

### Accessibility Requirements ✅

- [x] Proper ARIA roles (dialog, alertdialog, status)
- [x] Focus trap active for modals
- [x] Screen reader announces prompts and toasts
- [x] Keyboard navigation complete

## CSS Additions

Add to your global styles or Tailwind config:

```css
/* Toast slide-in animation */
@keyframes slide-in {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.animate-slide-in {
  animation: slide-in 0.2s ease-out;
}
```

## Questions Resolved ✅

| Question | Decision | Implementation |
|----------|----------|----------------|
| Should toasts have a close button, or be dismissible only by timeout/swipe? | **Both** | Close button + auto-timeout (5s default) |
| Should we implement swipe-to-dismiss for touch devices? | **Yes** | `Toast.tsx` with 100px swipe threshold |
| How should screen readers announce queued prompts? | **ARIA live regions** | `role="status"` with `aria-live="polite"` |
| Should we add sound notifications for important prompts? | **Yes (optional)** | `prompt-sounds.ts` using Web Audio API, opt-in via localStorage |

## Files Created/Modified

### New Files

| File | Purpose |
|------|---------|
| `client/src/types/prompt.d.ts` | Type definitions for prompts |
| `client/src/utils/prompt-icons.ts` | Static icon registry (security) |
| `client/src/utils/prompt-sounds.ts` | Optional Web Audio API sounds |
| `client/src/stores/prompt-store.ts` | State management with rate limiting |
| `client/src/components/prompts/UniversalPrompt.tsx` | Modal prompt component |
| `client/src/components/prompts/Toast.tsx` | Toast with swipe-to-dismiss |
| `client/src/components/prompts/ToastContainer.tsx` | Toast container |
| `client/src/components/prompts/index.ts` | Barrel export |
| `tests/prompt-store.test.js` | Rate limiting and queue tests |
| `tests/prompt-security.test.js` | XSS and security tests |
| `tests/prompt-components.test.js` | Component behavior tests |

### Modified Files

| File | Changes |
|------|---------|
| `client/src/types/events.d.ts` | Added `prompt` and `prompt-response` events |
| `client/src/constants.ts` | Added prompt system constants |
| `client/src/services/socket.ts` | Added prompt event handling |
| `client/src/app.tsx` | Integrated ToastContainer and UniversalPrompt |
| `client/src/app.css` | Added toast slide animations |

## Next Steps

1. **Server Implementation** - Implement server-side prompt emission (see Server PRD)
2. **E2E Testing** - Add Playwright tests once server is ready
3. **Optional Refactoring** - Migrate existing modals to use new system (deferred)
