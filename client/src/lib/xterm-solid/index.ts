// solid-xterm-enhanced
// A production-ready SolidJS wrapper for xterm.js
// Designed for reusability and proper memory management

export { XTerm } from './components/XTerm'
export { XTermProvider, useXTermContext } from './components/XTermProvider'
export { useXTerm } from './hooks/useXTerm'
// export { useTerminalEvents } from './hooks/useTerminalEvents' // Hook not implemented yet

// Re-export xterm.js types for convenience
export type {
  Terminal,
  ITerminalOptions,
  ITerminalInitOnlyOptions,
  ITerminalAddon,
  ITheme,
  IDisposable
} from '@xterm/xterm'

// Export our enhanced types
export type {
  XTermProps,
  XTermEventHandlers,
  XTermEventMap,
  AddonDefinition,
  TerminalRef
} from './types'
