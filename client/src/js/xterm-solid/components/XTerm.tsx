import { createSignal, createEffect, onCleanup } from 'solid-js'
import { Terminal } from '@xterm/xterm'
import type { XTermProps, TerminalRef, XTermEventHandlers } from '../types'
import { AddonManager } from '../utils/addon-manager'
import { EventManager } from '../utils/event-manager'

// Import default xterm.js styles conditionally
let stylesLoaded = false
const loadDefaultStyles = () => {
  if (!stylesLoaded) {
    import('@xterm/xterm/css/xterm.css')
    stylesLoaded = true
  }
}

// Fallback SearchAddon for when the global one is not available
class FallbackSearchAddon {
  findNext() {
    return false
  }

  findPrevious() {
    return false
  }
}

/**
 * A production-ready SolidJS wrapper for xterm.js
 *
 * Features:
 * - Proper memory management and cleanup
 * - Consolidated event handling (no memory leaks)
 * - Full addon support with type safety
 * - Imperative API via refs
 * - Optimized reactive patterns
 *
 * @example
 * ```tsx
 * <XTerm
 *   options={{ fontSize: 14, cursorBlink: true }}
 *   onData={(data) => sendToSSH(data)}
 *   onMount={(terminal, ref) => {
 *     ref.write('Welcome to XTerm!\n');
 *   }}
 *   addons={[FitAddon, SearchAddon]}
 * />
 * ```
 */
export function XTerm(props: XTermProps) {
  const [terminal, setTerminal] = createSignal<Terminal>()
  const [containerRef, setContainerRef] = createSignal<HTMLDivElement>()

  let addonManager: AddonManager
  let eventManager: EventManager
  let mountCleanup: (() => void) | undefined

  // Create terminal reference for imperative access
  const createTerminalRef = (term: Terminal): TerminalRef => ({
    get terminal() {
      return term
    },
    write: (data: string) => term.write(data),
    writeln: (data: string) => term.writeln(data),
    clear: () => term.clear(),
    reset: () => term.reset(),
    focus: () => term.focus(),
    blur: () => term.blur(),
    scrollToTop: () => term.scrollToTop(),
    scrollToBottom: () => term.scrollToBottom(),
    scrollToLine: (line: number) => term.scrollToLine(line),
    select: (col: number, row: number, length: number) =>
      term.select(col, row, length),
    selectAll: () => term.selectAll(),
    selectLines: (start: number, end: number) => term.selectLines(start, end),
    clearSelection: () => term.clearSelection(),
    getSelection: () => term.getSelection(),
    hasSelection: () => term.hasSelection(),
    resize: (cols: number, rows: number) => term.resize(cols, rows),
    // Addon-specific methods (available only if addons are loaded)
    fit: () => {
      // Try to get FitAddon from our addon manager
      const addons = addonManager?.getAllAddons() || []
      const fitAddon = addons.find(
        (addon) =>
          addon &&
          addon.constructor.name === 'FitAddon' &&
          typeof (addon as unknown as Record<string, unknown>)['fit'] ===
            'function'
      )

      if (fitAddon) {
        const fit = (fitAddon as unknown as Record<string, () => void>)['fit']
        if (fit) {
          fit()
        }
      }
    },
    findNext: (term: string) => {
      const searchAddon = addonManager?.getAddon(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (globalThis as any).SearchAddon || FallbackSearchAddon
      )
      if (searchAddon && 'findNext' in searchAddon) {
        return (searchAddon as { findNext(term: string): boolean }).findNext(
          term
        )
      }
      return false
    },
    findPrevious: (term: string) => {
      const searchAddon = addonManager?.getAddon(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (globalThis as any).SearchAddon || FallbackSearchAddon
      )
      if (searchAddon && 'findPrevious' in searchAddon) {
        return (
          searchAddon as { findPrevious(term: string): boolean }
        ).findPrevious(term)
      }
      return false
    }
  })

  // Initialize terminal when container is ready
  createEffect(() => {
    const container = containerRef()
    if (!container) return

    // Load default styles if requested
    if (props.loadDefaultStyles !== false) {
      loadDefaultStyles()
    }

    // Create terminal instance
    const term = new Terminal(props.options)

    // Initialize managers
    addonManager = new AddonManager()
    eventManager = new EventManager()

    // Load addons before opening terminal
    if (props.addons && props.addons.length > 0) {
      addonManager.loadAddons(term, props.addons)
    }

    // Open terminal in container
    term.open(container)

    // Set up event listeners - filter out undefined handlers
    const eventHandlers: XTermEventHandlers = {}
    if (props.onBell) eventHandlers.onBell = props.onBell
    if (props.onBinary) eventHandlers.onBinary = props.onBinary
    if (props.onCursorMove) eventHandlers.onCursorMove = props.onCursorMove
    if (props.onData) eventHandlers.onData = props.onData
    if (props.onKey) eventHandlers.onKey = props.onKey
    if (props.onLineFeed) eventHandlers.onLineFeed = props.onLineFeed
    if (props.onRender) eventHandlers.onRender = props.onRender
    if (props.onResize) eventHandlers.onResize = props.onResize
    if (props.onScroll) eventHandlers.onScroll = props.onScroll
    if (props.onSelectionChange)
      eventHandlers.onSelectionChange = props.onSelectionChange
    if (props.onTitleChange) eventHandlers.onTitleChange = props.onTitleChange
    if (props.onWriteParsed) eventHandlers.onWriteParsed = props.onWriteParsed
    eventManager.setupEventListeners(term, eventHandlers)

    // Create terminal reference
    const terminalRef = createTerminalRef(term)

    // Call mount callback
    if (props.onMount) {
      const cleanup = props.onMount(term, terminalRef)
      if (typeof cleanup === 'function') {
        mountCleanup = cleanup
      }
    }

    // Provide ref to parent if requested
    if (props.ref) {
      props.ref(terminalRef)
    }

    // Auto-focus if requested
    if (props.autoFocus) {
      // Use requestAnimationFrame to ensure terminal is fully initialized
      requestAnimationFrame(() => term.focus())
    }

    setTerminal(term)
  })

  // Update event handlers when props change
  createEffect((prevHandlers) => {
    const term = terminal()
    if (!term || !eventManager) return undefined

    const currentHandlers: XTermEventHandlers = {}
    if (props.onBell) currentHandlers.onBell = props.onBell
    if (props.onBinary) currentHandlers.onBinary = props.onBinary
    if (props.onCursorMove) currentHandlers.onCursorMove = props.onCursorMove
    if (props.onData) currentHandlers.onData = props.onData
    if (props.onKey) currentHandlers.onKey = props.onKey
    if (props.onLineFeed) currentHandlers.onLineFeed = props.onLineFeed
    if (props.onRender) currentHandlers.onRender = props.onRender
    if (props.onResize) currentHandlers.onResize = props.onResize
    if (props.onScroll) currentHandlers.onScroll = props.onScroll
    if (props.onSelectionChange)
      currentHandlers.onSelectionChange = props.onSelectionChange
    if (props.onTitleChange) currentHandlers.onTitleChange = props.onTitleChange
    if (props.onWriteParsed) currentHandlers.onWriteParsed = props.onWriteParsed

    // Only update if handlers actually changed
    if (JSON.stringify(currentHandlers) !== JSON.stringify(prevHandlers)) {
      eventManager.updateEventHandlers(
        term,
        currentHandlers,
        prevHandlers as XTermEventHandlers
      )
    }

    return currentHandlers
  })

  // Cleanup on unmount
  onCleanup(() => {
    const term = terminal()

    // Call unmount callback
    if (props.onUnmount && term) {
      props.onUnmount(term)
    }

    // Call mount cleanup
    if (mountCleanup) {
      mountCleanup()
      mountCleanup = undefined
    }

    // Cleanup managers
    if (eventManager) {
      eventManager.dispose()
    }
    if (addonManager) {
      addonManager.dispose()
    }

    // Dispose terminal
    if (term) {
      term.dispose()
    }
  })

  return (
    <div
      ref={setContainerRef}
      class={props.class || 'size-full'}
      style={{
        width: '100%',
        height: '100%',
        ...props.style
      }}
    />
  )
}
