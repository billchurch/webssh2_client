import type { Terminal, IDisposable } from '@xterm/xterm'
import type { XTermEventHandlers } from '../types'

export class EventManager {
  private disposables: IDisposable[] = []

  /**
   * Set up all event listeners on the terminal
   * Uses a single consolidated approach instead of multiple createEffect calls
   */
  setupEventListeners(terminal: Terminal, handlers: XTermEventHandlers): void {
    // Bell event
    if (handlers.onBell) {
      this.addDisposable(
        terminal.onBell(() => {
          handlers.onBell?.()
        })
      )
    }

    // Binary event
    if (handlers.onBinary) {
      this.addDisposable(
        terminal.onBinary((data) => {
          handlers.onBinary?.(data)
        })
      )
    }

    // Cursor move event
    if (handlers.onCursorMove) {
      this.addDisposable(
        terminal.onCursorMove(() => {
          const buffer = terminal.buffer.active
          const position = { x: buffer.cursorX, y: buffer.cursorY }
          handlers.onCursorMove?.(position)
        })
      )
    }

    // Data event (most important for terminal input)
    if (handlers.onData) {
      this.addDisposable(
        terminal.onData((data) => {
          handlers.onData?.(data)
        })
      )
    }

    // Key event
    if (handlers.onKey) {
      this.addDisposable(
        terminal.onKey((event) => {
          handlers.onKey?.(event)
        })
      )
    }

    // Line feed event
    if (handlers.onLineFeed) {
      this.addDisposable(
        terminal.onLineFeed(() => {
          handlers.onLineFeed?.()
        })
      )
    }

    // Render event
    if (handlers.onRender) {
      this.addDisposable(
        terminal.onRender((event) => {
          handlers.onRender?.(event)
        })
      )
    }

    // Resize event (important for responsive terminals)
    if (handlers.onResize) {
      this.addDisposable(
        terminal.onResize((size) => {
          handlers.onResize?.(size)
        })
      )
    }

    // Scroll event
    if (handlers.onScroll) {
      this.addDisposable(
        terminal.onScroll((yPos) => {
          handlers.onScroll?.(yPos)
        })
      )
    }

    // Selection change event
    if (handlers.onSelectionChange) {
      this.addDisposable(
        terminal.onSelectionChange(() => {
          handlers.onSelectionChange?.()
        })
      )
    }

    // Title change event
    if (handlers.onTitleChange) {
      this.addDisposable(
        terminal.onTitleChange((title) => {
          handlers.onTitleChange?.(title)
        })
      )
    }

    // Write parsed event
    if (handlers.onWriteParsed) {
      this.addDisposable(
        terminal.onWriteParsed(() => {
          handlers.onWriteParsed?.()
        })
      )
    }
  }

  /**
   * Update event handlers when props change
   * Only updates changed handlers to avoid unnecessary disposals
   */
  updateEventHandlers(
    terminal: Terminal,
    newHandlers: XTermEventHandlers,
    _prevHandlers?: XTermEventHandlers
  ): void {
    // For simplicity, we'll dispose all and re-setup
    // In a more optimized version, we could diff the handlers
    this.dispose()
    this.setupEventListeners(terminal, newHandlers)
  }

  /**
   * Add a disposable to our cleanup list
   */
  private addDisposable(disposable: IDisposable): void {
    this.disposables.push(disposable)
  }

  /**
   * Clean up all event listeners
   */
  dispose(): void {
    this.disposables.forEach((disposable) => {
      try {
        disposable.dispose()
      } catch (error) {
        console.error('Error disposing event listener:', error)
      }
    })
    this.disposables = []
  }
}
