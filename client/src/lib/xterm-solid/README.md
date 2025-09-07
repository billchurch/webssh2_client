# xterm-solid

A SolidJS wrapper for xterm.js with memory management, TypeScript support, and reactive patterns.

## Installation

This is an internal component for the webssh2_client project. Dependencies are already included:

- `@xterm/xterm ^5.5.0`
- `solid-js ^1.9.9`

## Quick Start

### Basic Usage

```tsx
import { XTerm } from './xterm-solid'
import { FitAddon } from '@xterm/addon-fit'

function MyTerminal() {
  let fitAddon: FitAddon | null = null

  const handleMount = (terminal: Terminal, ref: TerminalRef) => {
    fitAddon = new FitAddon()
    terminal.loadAddon(fitAddon)
    setTimeout(() => fitAddon?.fit(), 50)
    ref.write('Welcome to XTerm!\r\n')
  }

  return (
    <XTerm
      options={{
        fontSize: 14,
        cursorBlink: true,
        theme: {
          background: '#1e1e1e',
          foreground: '#d4d4d4'
        }
      }}
      onData={(data) => console.log('User input:', data)}
      onMount={handleMount}
      autoFocus
    />
  )
}
```

### With Socket.IO Integration

```tsx
import { XTerm } from './xterm-solid'
import { FitAddon } from '@xterm/addon-fit'
import { io } from 'socket.io-client'

function SSHTerminal() {
  let socket: Socket
  let fitAddon: FitAddon | null = null

  const handleMount = (terminal: Terminal, ref: TerminalRef) => {
    fitAddon = new FitAddon()
    terminal.loadAddon(fitAddon)

    const container = terminal.element?.parentElement
    if (container && ResizeObserver) {
      const resizeObserver = new ResizeObserver(() => fitAddon?.fit())
      resizeObserver.observe(container)
    }

    setTimeout(() => fitAddon?.fit(), 50)

    socket = io('/ssh')
    socket.on('data', (data: string) => ref.write(data))
    socket.on('connect', () => ref.write('Connected\r\n'))

    return () => socket?.disconnect()
  }

  return (
    <XTerm
      options={{ fontSize: 14, cursorBlink: true }}
      onData={(data) => socket?.emit('data', data)}
      onResize={(size) => socket?.emit('resize', size)}
      onMount={handleMount}
      autoFocus
      style={{ width: '100%', height: '100%' }}
    />
  )
}
```

### Using the Hook API

```tsx
import { useXTerm } from './xterm-solid'
import { createSignal, createEffect } from 'solid-js'

function AdvancedTerminal() {
  const [containerRef, setContainerRef] = createSignal<HTMLDivElement>()

  const { terminalRef, initialize, isInitialized } = useXTerm({
    options: { fontSize: 14 },
    eventHandlers: {
      onData: (data) => console.log('Data:', data),
      onResize: (size) => console.log('Resized:', size)
    }
  })

  createEffect(() => {
    const container = containerRef()
    if (container && !isInitialized()) {
      const ref = initialize(container)
      ref.write('Terminal initialized!\n')
    }
  })

  return (
    <div>
      <div ref={setContainerRef} style={{ width: '100%', height: '400px' }} />
      <button onClick={() => terminalRef()?.clear()}>Clear Terminal</button>
    </div>
  )
}
```

### Multi-Terminal Management

```tsx
import { XTermProvider, useXTermContext, XTerm } from './xterm-solid'

function TerminalManager() {
  const { getAllTerminals } = useXTermContext()

  const broadcastMessage = (message: string) => {
    getAllTerminals().forEach(({ ref }) => {
      ref.write(message + '\r\n')
    })
  }

  return (
    <button onClick={() => broadcastMessage('Hello all terminals!')}>
      Broadcast Message
    </button>
  )
}

function App() {
  return (
    <XTermProvider>
      <div style={{ display: 'grid', 'grid-template-columns': '1fr 1fr' }}>
        <XTerm onMount={(_, ref) => ref.write('Terminal 1\r\n')} />
        <XTerm onMount={(_, ref) => ref.write('Terminal 2\r\n')} />
      </div>
      <TerminalManager />
    </XTermProvider>
  )
}
```

## API Reference

### XTerm Component

#### Props

```tsx
interface XTermProps {
  // Styling
  class?: string
  style?: JSX.CSSProperties

  // Terminal configuration
  options?: ITerminalOptions & ITerminalInitOnlyOptions

  // Addons
  addons?: AddonDefinition[]

  // Event handlers
  onData?: (data: string) => void
  onResize?: (size: { cols: number; rows: number }) => void
  onBell?: () => void
  // ... all xterm.js events supported

  // Lifecycle
  onMount?: (terminal: Terminal, ref: TerminalRef) => void | (() => void)
  onUnmount?: (terminal: Terminal) => void

  // Imperative access
  ref?: (ref: TerminalRef) => void

  // Options
  autoFocus?: boolean
  loadDefaultStyles?: boolean // Default: true
}
```

#### TerminalRef API

```tsx
interface TerminalRef {
  readonly terminal: Terminal | undefined

  // Writing
  write(data: string): void
  writeln(data: string): void

  // Control
  clear(): void
  reset(): void
  focus(): void
  blur(): void

  // Scrolling
  scrollToTop(): void
  scrollToBottom(): void
  scrollToLine(line: number): void

  // Selection
  select(col: number, row: number, length: number): void
  selectAll(): void
  selectLines(start: number, end: number): void
  clearSelection(): void
  getSelection(): string
  hasSelection(): boolean

  // Layout
  resize(cols: number, rows: number): void
  fit(): void // Requires FitAddon

  // Search (requires SearchAddon)
  findNext(term: string): boolean
  findPrevious(term: string): boolean
}
```

### useXTerm Hook

```tsx
const {
  terminal, // Signal<Terminal | undefined>
  terminalRef, // () => TerminalRef | null
  isInitialized, // Signal<boolean>
  initialize, // (container: HTMLElement) => TerminalRef
  dispose, // () => void
  updateEventHandlers, // (handlers: XTermEventHandlers) => void
  getAddon // <T>(constructor: new (...args: any[]) => T) => T | undefined
} = useXTerm(options)
```

## Addon Support

Addons can be loaded in two ways:

### Manual Loading (Recommended)

```tsx
import { FitAddon } from '@xterm/addon-fit'

function MyTerminal() {
  let fitAddon: FitAddon | null = null

  const handleMount = (terminal: Terminal, ref: TerminalRef) => {
    fitAddon = new FitAddon()
    terminal.loadAddon(fitAddon)

    if (ResizeObserver) {
      const container = terminal.element?.parentElement
      if (container) {
        const resizeObserver = new ResizeObserver(() => fitAddon?.fit())
        resizeObserver.observe(container)
      }
    }

    setTimeout(() => fitAddon?.fit(), 50)
  }

  return <XTerm onMount={handleMount} />
}
```

### Automatic Loading

```tsx
import { FitAddon, SearchAddon } from '@xterm/addon-fit'

<XTerm addons={[FitAddon, SearchAddon]} />

// Or with configuration:
<XTerm
  addons={[
    { addon: FitAddon },
    { addon: SearchAddon, args: [] }
  ]}
/>
```

## Integration with WebSSH2

This wrapper is designed for use in WebSSH2 projects:

```tsx
import { XTerm } from './xterm-solid'
```

## Common Issues & Solutions

### Terminal Sizing

Ensure proper CSS height constraints:

```css
html,
body,
#root {
  height: 100%;
}

.terminal-container {
  height: 100vh; /* or 100% with proper parent height */
}
```

For SolidJS apps:

```tsx
// Ensure mount container has proper height
<div style="height: 100%; width: 100%;" class="flex flex-col">
  <div class="min-h-0 flex-1">
    <XTerm style={{ width: '100%', height: '100%' }} />
  </div>
</div>
```

### Tailwind CSS

With Tailwind, prefer explicit styles over utility classes for terminal containers:

- Use `style="height: 100%"` instead of `h-full`
- Use `h-[100dvh]` for dynamic viewport height

## Features

- **Memory Safe**: Proper cleanup prevents memory leaks
- **Consolidated Events**: Single event management system
- **TypeScript**: Full type safety and IntelliSense support
- **Addon Support**: Compatible with xterm.js addons
- **Reactive**: Built with SolidJS patterns

## License

MIT License
