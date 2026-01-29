// SolidJS State Management for WebSSH2 Client
import { createStore } from 'solid-js/store'
import { createSignal } from 'solid-js'
import createDebug from 'debug'
import type { ConnectionErrorPayload } from '../types/events.d'
import type { ConnectionMode } from '../types/config.d'

const debug = createDebug('webssh2-client:state-solid')

export interface AppState {
  allowReauth: boolean
  allowReconnect: boolean
  allowReplay: boolean
  isBasicAuthCookiePresent: boolean
  isConnecting: boolean
  loggedData: boolean
  reauthRequired: boolean
  sessionLogEnable: boolean
  term: string | null
}

const initialState: AppState = {
  allowReauth: false,
  allowReconnect: false,
  allowReplay: false,
  isBasicAuthCookiePresent: false,
  isConnecting: false,
  loggedData: false,
  reauthRequired: false,
  sessionLogEnable: false,
  term: null
}

// Create reactive store
export const [state, setState] = createStore<AppState>(initialState)

// Additional state signals for UI
export const [sessionFooter, setSessionFooter] = createSignal<string | null>(
  null
)
export const [errorMessage, setErrorMessage] = createSignal<string | null>(null)
export const [loginError, setLoginError] = createSignal<string | null>(null)
export const [isLoginDialogOpen, setIsLoginDialogOpen] = createSignal(false)
export const [isErrorDialogOpen, setIsErrorDialogOpen] = createSignal(false)
export const [isTerminalSettingsOpen, setIsTerminalSettingsOpen] =
  createSignal(false)
export const [showReconnectButton, setShowReconnectButton] = createSignal(false)

// Header content state
export const [headerContent, setHeaderContent] = createSignal<{
  text: string
  background?: string
  backgroundIsTailwind?: boolean
  fullStyle?: string
  styleIsTailwind?: boolean
} | null>(null)

// Prompt dialog state
export const [promptData, setPromptData] = createSignal<{
  title: string
  prompts: Array<{ prompt: string; echo: boolean }>
} | null>(null)

// Search state
export const [isSearchVisible, setIsSearchVisible] = createSignal(false)
export const [searchTerm, setSearchTerm] = createSignal('')
export const [searchOptions, setSearchOptions] = createSignal({
  caseSensitive: false,
  wholeWord: false,
  regex: false
})
export const [searchResults, setSearchResults] = createSignal({
  currentIndex: 0,
  totalMatches: 0
})

// Connection error state (for ConnectionErrorModal)
export const [connectionError, setConnectionError] =
  createSignal<ConnectionErrorPayload | null>(null)
export const [isConnectionErrorModalOpen, setIsConnectionErrorModalOpen] =
  createSignal(false)

// Connection mode state (determines if host/port are editable in LoginModal)
export const [connectionMode, setConnectionMode] =
  createSignal<ConnectionMode>('full')
export const [lockedHost, setLockedHost] = createSignal<string | null>(null)
export const [lockedPort, setLockedPort] = createSignal<number | null>(null)

// Utility functions for state management
export const toggleBooleanState = <K extends keyof AppState>(
  key: K extends keyof AppState
    ? AppState[K] extends boolean
      ? K
      : never
    : never
): boolean => {
  const currentValue = state[key]
  const newValue = !currentValue
  setState(key, newValue as AppState[K])
  debug('toggleBooleanState', { [key]: newValue })
  return newValue
}

// State update helpers
export const updateState = (updates: Partial<AppState>) => {
  setState(updates)
  debug('updateState', updates)
}

// Reset state to initial values
export const resetState = () => {
  setState(initialState)
  debug('resetState')
}
