import type { ParentComponent } from 'solid-js'
import { createContext, useContext, createSignal } from 'solid-js'
import type { Terminal } from '@xterm/xterm'
import type { TerminalRef } from '../types'

interface XTermContextValue {
  terminals: Map<string, { terminal: Terminal; ref: TerminalRef }>
  registerTerminal: (id: string, terminal: Terminal, ref: TerminalRef) => void
  unregisterTerminal: (id: string) => void
  getTerminal: (
    id: string
  ) => { terminal: Terminal; ref: TerminalRef } | undefined
  getAllTerminals: () => { id: string; terminal: Terminal; ref: TerminalRef }[]
}

const XTermContext = createContext<XTermContextValue>()

/**
 * Provider for managing multiple XTerm instances
 * Useful when you have multiple terminals in your application
 * and need centralized management
 *
 * @example
 * ```tsx
 * <XTermProvider>
 *   <App />
 * </XTermProvider>
 * ```
 */
export const XTermProvider: ParentComponent = (props) => {
  const [terminals] = createSignal(
    new Map<string, { terminal: Terminal; ref: TerminalRef }>()
  )

  const registerTerminal = (
    id: string,
    terminal: Terminal,
    ref: TerminalRef
  ) => {
    terminals().set(id, { terminal, ref })
  }

  const unregisterTerminal = (id: string) => {
    const terminalData = terminals().get(id)
    if (terminalData) {
      // Dispose the terminal
      try {
        terminalData.terminal.dispose()
      } catch (error) {
        console.error(`Error disposing terminal ${id}:`, error)
      }
      terminals().delete(id)
    }
  }

  const getTerminal = (id: string) => {
    return terminals().get(id)
  }

  const getAllTerminals = () => {
    return Array.from(terminals().entries()).map(([id, data]) => ({
      id,
      ...data
    }))
  }

  const contextValue: XTermContextValue = {
    terminals: terminals(),
    registerTerminal,
    unregisterTerminal,
    getTerminal,
    getAllTerminals
  }

  return (
    <XTermContext.Provider value={contextValue}>
      {props.children}
    </XTermContext.Provider>
  )
}

/**
 * Hook to access XTerm context
 * Provides centralized access to all terminal instances
 *
 * @example
 * ```tsx
 * const MyComponent = () => {
 *   const { getTerminal, getAllTerminals } = useXTermContext();
 *
 *   const sendToAllTerminals = (data: string) => {
 *     getAllTerminals().forEach(({ ref }) => {
 *       ref.write(data);
 *     });
 *   };
 *
 *   return <button onClick={() => sendToAllTerminals('Hello!')}>Broadcast</button>;
 * };
 * ```
 */
export function useXTermContext(): XTermContextValue {
  const context = useContext(XTermContext)
  if (!context) {
    throw new Error('useXTermContext must be used within an XTermProvider')
  }
  return context
}
