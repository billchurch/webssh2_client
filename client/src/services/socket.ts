// SolidJS Socket Service for WebSSH2 Client
import { createSignal, createEffect } from 'solid-js'
import type { Socket } from 'socket.io-client'
import { io } from 'socket.io-client'
import createDebug from 'debug'
import maskObject from 'jsmasker'

// Import state management
import {
  state,
  setState,
  setErrorMessage,
  // setIsLoginDialogOpen,
  setIsErrorDialogOpen,
  setSessionFooter,
  headerContent,
  setHeaderContent,
  setPromptData
} from '../stores/terminal.js'

// Import utilities
import { credentials, sanitizeClientAuthPayload } from '../stores/config.js'
import { createDebouncedResizeEmitter } from '../utils/terminalResize.js'
import {
  RESIZE_DEBOUNCE_DELAY,
  DEFAULT_TERMINAL_COLS,
  DEFAULT_TERMINAL_ROWS
} from '../constants.js'

// Import types
import type {
  ClientAuthenticatePayload,
  ClientResizePayload,
  ClientToServerEvents,
  ServerToClientEvents,
  PermissionsPayload
} from '../types/events.d'
import type { WebSSH2Config } from '../types/config.d'
// import type { ElementId } from '../../types/dom.d'

declare global {
  interface Window {
    webssh2Socket?: Socket<ServerToClientEvents, ClientToServerEvents>
  }
}

const debug = createDebug('webssh2-client:socket-service')

// Socket instance and reactive state
export const [socket, setSocket] = createSignal<Socket<
  ServerToClientEvents,
  ClientToServerEvents
> | null>(null)
export const [isConnected, setIsConnected] = createSignal(false)
export const [connectionStatus, setConnectionStatus] =
  createSignal<string>('Disconnected')
export const [connectionStatusColor, setConnectionStatusColor] =
  createSignal<string>('red')

// Configuration and callbacks
let config: WebSSH2Config | null = null
let writeToTerminal: ((data: string) => void) | null = null
let onConnectCallback: (() => void) | null = null
let onDisconnectCallback: ((reason: string, extra?: unknown) => void) | null =
  null
let onDataCallback: ((chunk: string) => void) | null = null
let focusTerminalCallback: (() => void) | null = null
let storedFormData: Partial<ClientAuthenticatePayload> | null = null

// Terminal dimensions signal for reactive resizing
export const [terminalDimensions, setTerminalDimensions] = createSignal<{
  cols: number
  rows: number
}>({ cols: DEFAULT_TERMINAL_COLS, rows: DEFAULT_TERMINAL_ROWS })

// Socket Service Class
export class SocketService {
  private cleanupFunctions: Array<() => void> = []

  // Create a single debounced resize emitter for all resize events
  // This ensures consistent debouncing regardless of where resize is triggered from
  private debouncedEmitResize = createDebouncedResizeEmitter(
    (dimensions: ClientResizePayload) => {
      const currentSocket = socket()
      if (currentSocket) {
        currentSocket.emit('resize', dimensions)
        debug('Resize emitted', dimensions)
      }
    },
    RESIZE_DEBOUNCE_DELAY
  )

  // Reactive effects will be set up when the service is initialized within a component

  // Track last dimensions to prevent redundant emissions from reactive effect
  private lastEmittedDimensions: { cols: number; rows: number } | null = null

  // This should be called from within a SolidJS component
  setupReactiveEffects() {
    // Auto-emit resize when terminal dimensions change
    createEffect(() => {
      const dims = terminalDimensions()
      const currentSocket = socket()
      if (currentSocket && isConnected() && dims.cols > 0 && dims.rows > 0) {
        // Check if dimensions actually changed
        if (
          !this.lastEmittedDimensions ||
          dims.cols !== this.lastEmittedDimensions.cols ||
          dims.rows !== this.lastEmittedDimensions.rows
        ) {
          debug('[RESIZE-REACTIVE] Reactive effect triggered:', dims)
          this.lastEmittedDimensions = { ...dims }
          this.debouncedEmitResize(dims)
        }
      }
    })

    // Update UI elements reactively
    createEffect(() => {
      const status = connectionStatus()
      const color = connectionStatusColor()
      this.updateStatusElement(status, color)
    })

    // Store cleanup functions if needed
    // Note: SolidJS automatically handles cleanup when the component unmounts
  }

  // Initialize socket with configuration
  initSocket(
    configObj: WebSSH2Config,
    connectCallback: () => void,
    disconnectCallback: (reason: string, extra?: unknown) => void,
    dataCallback: (chunk: string) => void,
    writeFunction: (data: string) => void,
    focusCallback: () => void
  ): void {
    config = configObj
    onConnectCallback = connectCallback
    onDisconnectCallback = disconnectCallback
    onDataCallback = dataCallback
    writeToTerminal = writeFunction
    focusTerminalCallback = focusCallback
    debug('Socket service initialized')
  }

  // Set form data for authentication
  setFormData(formData: Partial<ClientAuthenticatePayload>): void {
    storedFormData = sanitizeClientAuthPayload(formData)
    debug('Form data stored', { port: storedFormData.port })
  }

  // Initialize socket connection
  initializeSocketConnection(): Socket<
    ServerToClientEvents,
    ClientToServerEvents
  > {
    debug('Initializing socket connection')
    this.closeConnection()

    const socketUrl = this.getWebSocketUrl()
    const socketPath = this.getSocketIOPath()
    debug('Socket connection details', { url: socketUrl, path: socketPath })

    // Pass URL parameters as query to server
    const urlParams = new URLSearchParams(window.location.search)
    const query: Record<string, string> = {}
    for (const [key, value] of urlParams.entries()) {
      query[key] = value
    }

    const newSocket = io(socketUrl, {
      path: socketPath,
      withCredentials: true,
      reconnection: false,
      timeout: 20000,
      transports: ['websocket', 'polling'],
      query
    }) as Socket<ServerToClientEvents, ClientToServerEvents>

    setSocket(newSocket)

    // Expose socket to window for E2E testing
    if (typeof window !== 'undefined') {
      window.webssh2Socket = newSocket
    }

    this.setupSocketListeners(newSocket)
    return newSocket
  }

  // Close connection
  closeConnection(): void {
    const currentSocket = socket()
    if (currentSocket) {
      debug('Closing connection')
      currentSocket.close()
      setSocket(null)
      setIsConnected(false)
    }
  }

  // Emit data to server
  emitData(data: string): void {
    const currentSocket = socket()
    if (currentSocket) {
      currentSocket.emit('data', data)
    }
  }

  // Emit resize event (now debounced internally)
  emitResize(dimensions: ClientResizePayload): void {
    debug('[RESIZE-DIRECT] Direct emitResize called:', dimensions)
    // Use the debounced emitter to prevent flooding
    this.debouncedEmitResize(dimensions)
  }

  // Reauthenticate
  reauth(): void {
    if (state.allowReauth) {
      const currentSocket = socket()
      if (currentSocket) {
        debug('Reauthenticating')
        currentSocket.emit('control', 'reauth')
      }
    } else {
      console.warn('Reauthentication not permitted')
      setErrorMessage('Reauthentication not permitted')
      setIsErrorDialogOpen(true)
    }
  }

  // Replay credentials
  replayCredentials(): void {
    if (state.allowReplay) {
      const currentSocket = socket()
      if (currentSocket) {
        debug('Replaying credentials')
        currentSocket.emit('control', 'replayCredentials')
      }
    } else {
      console.warn('Credential replay not permitted')
      setErrorMessage('Credential replay not permitted')
      setIsErrorDialogOpen(true)
    }
  }

  // Handle keyboard-interactive prompt responses
  submitPromptResponses(responses: string[]): void {
    const currentSocket = socket()
    if (currentSocket) {
      debug('Submitting prompt responses', responses.length)
      currentSocket.emit('data', responses.join('\n'))
      setPromptData(null)
    }
  }

  // Private methods
  private getSocketIOPath(): string {
    return config?.socket?.path || '/ssh/socket.io'
  }

  private getWebSocketUrl(): string {
    if (config?.socket?.url) {
      const url = new URL(config.socket.url)
      url.protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      return url.toString()
    }
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.hostname
    const port = window.location.port || (protocol === 'wss:' ? '443' : '80')
    return `${protocol}//${host}:${port}`
  }

  private authenticate(
    formData: Partial<ClientAuthenticatePayload> | null = null
  ): void {
    const dims = terminalDimensions()
    const effectiveFormData = formData || storedFormData

    // Start with reactive credentials as base
    const baseCredentials = credentials()
    const mergedCredentials = {
      ...baseCredentials,
      ...(dims.cols && { cols: dims.cols }),
      ...(dims.rows && { rows: dims.rows }),
      // Merge all form data if available
      ...(effectiveFormData && effectiveFormData)
    }

    const authCredentials = sanitizeClientAuthPayload(mergedCredentials)

    setState('term', authCredentials.term ?? null)
    const maskedContent = maskObject(authCredentials)
    debug('Authenticating', maskedContent)
    debug('Auth credentials check', {
      host: authCredentials.host,
      username: authCredentials.username,
      hasSocket: !!socket(),
      effectiveFormData: effectiveFormData
        ? sanitizeClientAuthPayload(effectiveFormData)
        : null,
      baseCredentials: sanitizeClientAuthPayload(baseCredentials)
    })

    const currentSocket = socket()
    if (authCredentials.host && authCredentials.username && currentSocket) {
      currentSocket.emit('authenticate', authCredentials)
      setConnectionStatus('Authenticating...')
      setConnectionStatusColor('orange')
    } else {
      debug('Authentication failed - missing requirements', {
        host: !!authCredentials.host,
        username: !!authCredentials.username,
        socket: !!currentSocket
      })
      if (onDisconnectCallback) {
        onDisconnectCallback('auth_required')
      }
    }
  }

  private getTerminal(): void {
    const dims = terminalDimensions()
    const terminal = { cols: dims.cols ?? 0, rows: dims.rows ?? 0 }
    debug('Getting terminal (dimensions only)', terminal)
    const currentSocket = socket()
    if (currentSocket) currentSocket.emit('terminal', terminal)
  }

  private updateStatusElement(status: string, color: string): void {
    // Use reactive state instead of direct DOM manipulation
    setConnectionStatus(status)
    setConnectionStatusColor(color)
  }

  // Socket event handlers
  private setupSocketListeners(
    socketInstance: Socket<ServerToClientEvents, ClientToServerEvents>
  ): void {
    debug('Setting up socket listeners')

    // Authentication events
    socketInstance.on('authentication', (data) => {
      debug('Authentication event', data)
      switch (data.action) {
        case 'request_auth':
          this.authenticate()
          setConnectionStatus('Requesting authentication...')
          setConnectionStatusColor('orange')
          break
        case 'auth_result':
          this.handleAuthResult({
            success: Boolean(data.success),
            ...(data.message && { message: data.message })
          })
          break
        case 'keyboard-interactive':
          if ('prompts' in data && data.prompts) {
            this.handleKeyboardInteractive({
              prompts: data.prompts as Array<{ prompt: string; echo: boolean }>,
              ...('name' in data && data.name
                ? { name: data.name as string }
                : {})
            })
          }
          break
        case 'reauth':
          if (onDisconnectCallback)
            onDisconnectCallback('reauth_required', socketInstance)
          break
        case 'dimensions':
          debug('[RESIZE-SERVER] Server requested dimensions')
          this.emitResize(terminalDimensions())
          break
        default:
          debug(`Unhandled authentication action: ${data.action}`)
          break
      }
    })

    // Permissions event
    socketInstance.on('permissions', (payload: PermissionsPayload) => {
      debug('Permissions', payload)
      Object.entries(payload).forEach(([key, value]) => {
        switch (key) {
          case 'allowReauth': {
            setState('allowReauth', Boolean(value))
            break
          }
          case 'allowReconnect': {
            setState('allowReconnect', Boolean(value))
            break
          }
          case 'allowReplay': {
            setState('allowReplay', Boolean(value))
            break
          }
          default: {
            debug(`Unhandled permission key: ${key}`)
            break
          }
        }
      })
    })

    // SFTP status event - indicates if SFTP is available
    socketInstance.on('sftp-status', (status) => {
      debug('SFTP status', status)
      // Import sftpStore dynamically to avoid circular dependency
      import('../stores/sftp-store.js').then(({ sftpStore }) => {
        sftpStore.setStatus(status)
      })
    })

    // Terminal events
    socketInstance.on('getTerminal', () => this.getTerminal())
    socketInstance.on('data', (chunk: string) => {
      if (writeToTerminal) writeToTerminal(chunk)
      if (onDataCallback) onDataCallback(chunk)
    })

    // Error events
    socketInstance.on('ssherror', (msg: string) => {
      debug('SSH Error', msg)
      if (onDisconnectCallback) onDisconnectCallback('ssh_error', msg)
    })

    // Connection events
    socketInstance.on('connect', () => {
      debug('Connected to server')
      setState('isConnecting', false)
      setIsConnected(true)
      setConnectionStatus('Connected')
      setConnectionStatusColor('green')
      if (onConnectCallback) onConnectCallback()
    })

    socketInstance.on('connect_error', (error) => {
      debug('Connection error', error)
      setIsConnected(false)
      if (onDisconnectCallback) onDisconnectCallback('connect_error', error)
    })

    socketInstance.on('disconnect', (reason) => {
      debug('Disconnected', reason)
      setState('isConnecting', false)
      setIsConnected(false)
      setConnectionStatus(`WEBSOCKET SERVER DISCONNECTED: ${reason}`)
      setConnectionStatusColor('red')
      if (onDisconnectCallback) onDisconnectCallback(reason)
    })

    // UI update events
    socketInstance.on('updateUI', (data) => {
      debug('UI Update', data)
      const { element, value } = data
      if (!element || value === undefined || value === null) {
        console.warn(
          'updateUI: Received invalid data from updateUI event:',
          data
        )
        return
      }

      // Handle UI updates by updating the appropriate SolidJS signals
      switch (element) {
        case 'footer': {
          const footerValue =
            typeof value === 'object' && value !== null && 'text' in value
              ? (value as { text: string }).text
              : String(value)
          setSessionFooter(footerValue)
          break
        }
        case 'status':
          this.updateStatusElement(String(value), 'green')
          break
        case 'header':
          // Use reactive header state
          if (typeof value === 'object' && value !== null) {
            const headerData = value as { text: string; background?: string }
            setHeaderContent({
              text: headerData.text,
              background: headerData.background || 'transparent'
            })
          } else {
            setHeaderContent({
              text: String(value),
              background: 'transparent'
            })
          }
          break
        case 'headerBackground': {
          // Handle background color updates separately (backward compatibility)
          const currentHeader = headerContent()
          const bgValue = String(value)

          // Check if it's a Tailwind class (starts with 'bg-' or contains gradient patterns)
          const isTailwindClass =
            bgValue.startsWith('bg-') ||
            bgValue.includes('gradient') ||
            bgValue.includes('from-') ||
            bgValue.includes('to-')

          if (currentHeader) {
            setHeaderContent({
              ...currentHeader,
              background: bgValue,
              backgroundIsTailwind: isTailwindClass
            })
          } else {
            // If no header exists yet, create one with just the background
            setHeaderContent({
              text: '',
              background: bgValue,
              backgroundIsTailwind: isTailwindClass
            })
          }
          break
        }
        case 'headerStyle': {
          // Handle full header styling (new enhanced approach)
          const currentHeader = headerContent()
          const styleValue = String(value)

          // Detect if this contains Tailwind classes
          const isTailwindStyle =
            styleValue.includes('bg-') ||
            styleValue.includes('text-') ||
            styleValue.includes('font-') ||
            styleValue.includes('border-') ||
            styleValue.includes('shadow-') ||
            styleValue.includes('animate-') ||
            styleValue.includes('gradient') ||
            styleValue.includes('from-') ||
            styleValue.includes('to-') ||
            styleValue.includes('via-')

          if (currentHeader) {
            setHeaderContent({
              ...currentHeader,
              fullStyle: styleValue,
              styleIsTailwind: isTailwindStyle
            })
          } else {
            // If no header exists yet, create one with the full style
            // Note: Server should send header text separately via 'header' event
            setHeaderContent({
              text: '',
              fullStyle: styleValue,
              styleIsTailwind: isTailwindStyle
            })
          }
          break
        }
        default:
          // Unknown elements - log for debugging
          debug(`Unknown element update: ${element}`, value)
          break
      }
    })
  }

  private handleAuthResult(result: {
    success: boolean
    message?: string
  }): void {
    debug('Auth result', result)
    setState('isConnecting', false)
    if (result.success) {
      setConnectionStatus('Connected')
      setConnectionStatusColor('green')
      if (focusTerminalCallback) focusTerminalCallback()
    } else {
      setConnectionStatus(`Authentication failed: ${result.message ?? ''}`)
      setConnectionStatusColor('red')
      if (onDisconnectCallback)
        onDisconnectCallback('auth_failed', result.message)
    }
  }

  private handleKeyboardInteractive(data: {
    prompts: Array<{ prompt: string; echo: boolean }>
    name?: string
  }): void {
    debug('Keyboard interactive authentication', data)
    // Use the reactive prompt modal
    setPromptData({
      title: data.name || 'Authentication Required',
      prompts: data.prompts
    })
  }
}

// Export singleton instance
export const socketService = new SocketService()

// Export utility functions for compatibility
export const setFormData = (formData: Partial<ClientAuthenticatePayload>) =>
  socketService.setFormData(formData)
export const closeConnection = () => socketService.closeConnection()
export const emitData = (data: string) => socketService.emitData(data)
export const initializeSocketConnection = () =>
  socketService.initializeSocketConnection()
export const initSocket = (
  configObj: WebSSH2Config,
  connectCallback: () => void,
  disconnectCallback: (reason: string, extra?: unknown) => void,
  dataCallback: (chunk: string) => void,
  writeFunction: (data: string) => void,
  focusCallback: () => void
) =>
  socketService.initSocket(
    configObj,
    connectCallback,
    disconnectCallback,
    dataCallback,
    writeFunction,
    focusCallback
  )
export const reauth = () => socketService.reauth()
export const replayCredentials = () => socketService.replayCredentials()
export const submitPromptResponses = (responses: string[]) =>
  socketService.submitPromptResponses(responses)
