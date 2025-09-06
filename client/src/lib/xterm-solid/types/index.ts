import type {
  Terminal,
  ITerminalOptions,
  ITerminalInitOnlyOptions,
  ITerminalAddon
  // IDisposable // Unused import
} from '@xterm/xterm'
import type { JSX } from 'solid-js'

// Enhanced event handler types with proper cleanup
export interface XTermEventHandlers {
  onBell?: () => void
  onBinary?: (data: string) => void
  onCursorMove?: (position: { x: number; y: number }) => void
  onData?: (data: string) => void
  onKey?: (event: { key: string; domEvent: KeyboardEvent }) => void
  onLineFeed?: () => void
  onRender?: (event: { start: number; end: number }) => void
  onResize?: (size: { cols: number; rows: number }) => void
  onScroll?: (yPos: number) => void
  onSelectionChange?: () => void
  onTitleChange?: (title: string) => void
  onWriteParsed?: () => void
}

// Event map for type safety
export interface XTermEventMap {
  bell: []
  binary: [string]
  cursorMove: [{ x: number; y: number }]
  data: [string]
  key: [{ key: string; domEvent: KeyboardEvent }]
  lineFeed: []
  render: [{ start: number; end: number }]
  resize: [{ cols: number; rows: number }]
  scroll: [number]
  selectionChange: []
  titleChange: [string]
  writeParsed: []
}

// Addon definition - supports both constructors and instances
export type AddonDefinition =
  | ITerminalAddon
  | (new (...args: unknown[]) => ITerminalAddon)
  | {
      addon: ITerminalAddon | (new (...args: unknown[]) => ITerminalAddon)
      args?: unknown[]
    }

// Terminal reference type for imperative access
export interface TerminalRef {
  readonly terminal: Terminal | undefined
  write: (data: string) => void
  writeln: (data: string) => void
  clear: () => void
  reset: () => void
  focus: () => void
  blur: () => void
  scrollToTop: () => void
  scrollToBottom: () => void
  scrollToLine: (line: number) => void
  select: (col: number, row: number, length: number) => void
  selectAll: () => void
  selectLines: (start: number, end: number) => void
  clearSelection: () => void
  getSelection: () => string
  hasSelection: () => boolean
  resize: (cols: number, rows: number) => void
  fit: () => void // Only available if FitAddon is loaded
  findNext: (term: string) => boolean // Only available if SearchAddon is loaded
  findPrevious: (term: string) => boolean // Only available if SearchAddon is loaded
}

// Main component props
export interface XTermProps extends XTermEventHandlers {
  // Styling
  class?: string
  style?: JSX.CSSProperties

  // Terminal configuration
  options?: ITerminalOptions & ITerminalInitOnlyOptions

  // Addons
  addons?: AddonDefinition[]

  // Lifecycle callbacks
  onMount?: (terminal: Terminal, ref: TerminalRef) => void | (() => void)
  onUnmount?: (terminal: Terminal) => void

  // Ref for imperative access
  ref?: (ref: TerminalRef) => void

  // Auto-focus terminal when mounted
  autoFocus?: boolean

  // Custom CSS for terminal styling (avoids hard-coded imports)
  loadDefaultStyles?: boolean
}
