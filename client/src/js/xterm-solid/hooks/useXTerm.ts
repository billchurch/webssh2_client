/* eslint-disable max-classes-per-file */
import { createSignal, onCleanup } from 'solid-js'
import { Terminal } from '@xterm/xterm'
import type {
  ITerminalOptions,
  ITerminalInitOnlyOptions,
  ITerminalAddon
} from '@xterm/xterm'
import type { AddonDefinition, XTermEventHandlers, TerminalRef } from '../types'
import { AddonManager } from '../utils/addon-manager'
import { EventManager } from '../utils/event-manager'

export interface UseXTermOptions {
  options?: ITerminalOptions & ITerminalInitOnlyOptions
  addons?: AddonDefinition[]
  eventHandlers?: XTermEventHandlers
  autoFocus?: boolean
}

/**
 * A composable hook for creating and managing xterm.js terminals
 * Useful when you need direct control over terminal creation and lifecycle
 *
 * @example
 * ```tsx
 * const MyComponent = () => {
 *   const [containerRef, setContainerRef] = createSignal<HTMLDivElement>();
 *
 *   const { terminal, terminalRef, initialize, dispose } = useXTerm({
 *     options: { fontSize: 14 },
 *     eventHandlers: {
 *       onData: (data) => console.log('Data:', data)
 *     }
 *   });
 *
 *   createEffect(() => {
 *     const container = containerRef();
 *     if (container) {
 *       initialize(container);
 *     }
 *   });
 *
 *   return <div ref={setContainerRef} />;
 * };
 * ```
 */
export function useXTerm(options: UseXTermOptions = {}) {
  const [terminal, setTerminal] = createSignal<Terminal>()
  const [isInitialized, setIsInitialized] = createSignal(false)

  let addonManager: AddonManager | null = null
  let eventManager: EventManager | null = null
  let currentTerminalRef: TerminalRef | null = null

  // Create terminal reference
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
    fit: () => {
      const fitAddon = addonManager?.getAddon(
        // Dynamic import for better tree shaking
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (globalThis as any).FitAddon ||
          class FitAddon {
            fit() {}
          }
      )
      if (fitAddon && 'fit' in fitAddon) {
        ;(fitAddon as { fit(): void }).fit()
      }
    },
    findNext: (term: string) => {
      const searchAddon = addonManager?.getAddon(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (globalThis as any).SearchAddon ||
          class SearchAddon {
            findNext() {
              return false
            }
          }
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
        (globalThis as any).SearchAddon ||
          class SearchAddon {
            findPrevious() {
              return false
            }
          }
      )
      if (searchAddon && 'findPrevious' in searchAddon) {
        return (
          searchAddon as { findPrevious(term: string): boolean }
        ).findPrevious(term)
      }
      return false
    }
  })

  const initialize = (container: HTMLElement): TerminalRef => {
    if (isInitialized()) {
      console.warn('Terminal already initialized. Call dispose() first.')
      return currentTerminalRef!
    }

    // Create terminal
    const term = new Terminal(options.options)

    // Initialize managers
    addonManager = new AddonManager()
    eventManager = new EventManager()

    // Load addons
    if (options.addons && options.addons.length > 0) {
      addonManager.loadAddons(term, options.addons)
    }

    // Open terminal
    term.open(container)

    // Set up event listeners
    if (options.eventHandlers) {
      eventManager.setupEventListeners(term, options.eventHandlers)
    }

    // Create terminal reference
    currentTerminalRef = createTerminalRef(term)

    // Auto-focus if requested
    if (options.autoFocus) {
      setTimeout(() => term.focus(), 0)
    }

    setTerminal(term)
    setIsInitialized(true)

    return currentTerminalRef
  }

  const dispose = (): void => {
    if (!isInitialized()) return

    const term = terminal()

    // Cleanup managers
    if (eventManager) {
      eventManager.dispose()
      eventManager = null
    }
    if (addonManager) {
      addonManager.dispose()
      addonManager = null
    }

    // Dispose terminal
    if (term) {
      term.dispose()
    }

    currentTerminalRef = null
    setTerminal(undefined)
    setIsInitialized(false)
  }

  const updateEventHandlers = (newHandlers: XTermEventHandlers): void => {
    const term = terminal()
    if (!term || !eventManager) {
      console.warn('Terminal not initialized. Call initialize() first.')
      return
    }

    eventManager.updateEventHandlers(term, newHandlers)
  }

  const getAddon = <T extends ITerminalAddon>(
    addonConstructor: new (...args: unknown[]) => T
  ): T | undefined => {
    if (!addonManager) {
      console.warn('Terminal not initialized. Call initialize() first.')
      return undefined
    }
    return addonManager.getAddon(addonConstructor)
  }

  // Cleanup on component unmount
  onCleanup(() => {
    dispose()
  })

  return {
    terminal,
    terminalRef: () => currentTerminalRef,
    isInitialized,
    initialize,
    dispose,
    updateEventHandlers,
    getAddon
  }
}
