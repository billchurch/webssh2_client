// client
// client/src/js/socket.ts

import { io, Socket } from 'socket.io-client'
import createDebug from 'debug'
import maskObject from 'jsmasker'

import {
  hidePromptDialog,
  resize,
  showErrorDialog,
  showPromptDialog,
  updateElement,
  updateUIVisibility
} from './dom.js'

import { getCredentials } from './utils.js'
import { getTerminalDimensions } from './terminal.js'
import { state } from './state.js'
import { toggleLog } from './clientlog.js'

import type {
  ClientAuthenticatePayload,
  ClientResizePayload,
  ClientToServerEvents,
  ServerToClientEvents
} from '../types/events.d'

import type { WebSSH2Config } from '../types/config.d'

const debug = createDebug('webssh2-client:socket')

let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null
let config: WebSSH2Config | null = null
let writeToTerminal: ((data: string) => void) | null = null
let onConnectCallback: (() => void) | null = null
let onDisconnectCallback: ((reason: string, extra?: unknown) => void) | null = null
let onDataCallback: ((chunk: string) => void) | null = null
let focusTerminalCallback: (() => void) | null = null
let storedFormData: Partial<ClientAuthenticatePayload> | null = null

export function setFormData(formData: Partial<ClientAuthenticatePayload>): void {
  storedFormData = formData
  debug('setFormData: stored formData with port:', (formData as { port?: number })?.port)
}

export function closeConnection(): void {
  if (socket) {
    debug('closeConnection')
    socket.close()
  }
}

export function emitData(data: string): void {
  if (socket) {
    socket.emit('data', data)
  }
}

export function emitResize(dimensions: ClientResizePayload): void {
  if (socket) {
    socket.emit('resize', dimensions)
    debug('emitResize', dimensions)
  }
}

export function initializeSocketConnection(): Socket<ServerToClientEvents, ClientToServerEvents> {
  debug('initializeSocketConnection')
  closeConnection()

  socket = io(getWebSocketUrl(), {
    path: getSocketIOPath(),
    withCredentials: true,
    reconnection: false,
    timeout: 20000,
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['websocket', 'polling']
  }) as Socket<ServerToClientEvents, ClientToServerEvents>

  setupSocketListeners()
  return socket
}

export function initSocket(
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
}

export function reauth(): void {
  if (state.allowReauth && socket) {
    debug('reauth')
    socket.emit('control', 'reauth')
  } else {
    console.warn('reauth: Session reauth not permitted')
    updateUIVisibility({ error: 'Reauthentication not permitted.' } as unknown as Record<string, boolean>)
  }
}

export function replayCredentials(): void {
  const allowReplay = state.allowReplay
  if (allowReplay && socket) {
    debug('replayCredentials')
    socket.emit('control', 'replayCredentials')
  } else {
    console.warn('replayCredentials: Credential replay not permitted')
    showErrorDialog('Credential replay not permitted')
  }
}

function authenticate(formData: Partial<ClientAuthenticatePayload> | null = null): void {
  const terminalDimensions = getTerminalDimensions()
  const credentials = getCredentials(formData as Record<string, unknown> | null, terminalDimensions)

  const effectiveFormData = formData || storedFormData
  if (effectiveFormData?.privateKey) {
    credentials.privateKey = effectiveFormData.privateKey
    if (effectiveFormData.passphrase) {
      credentials.passphrase = effectiveFormData.passphrase
    }
  }

  state.term = credentials.term ?? null
  const maskedContent = maskObject(credentials)
  debug('authenticate', maskedContent)

  if (credentials.host && credentials.username && socket) {
    socket.emit('authenticate', credentials)
    updateElement('status', 'Authenticating...', 'orange')
  } else if (onDisconnectCallback) {
    onDisconnectCallback('auth_required')
  }
}

function getTerminal(): void {
  const { cols, rows } = getTerminalDimensions()
  const term = state.term ?? 'xterm-color'
  const terminal = { cols: cols ?? 0, rows: rows ?? 0, term }
  debug('getTerminal', terminal)
  if (socket) socket.emit('terminal', terminal)
}

function getSocketIOPath(): string {
  const socketIOPath = config?.socket?.path ? config.socket.path : '/ssh/socket.io'
  debug('getSocketIOPath', socketIOPath)
  return socketIOPath
}

function getWebSocketUrl(): string {
  if (config?.socket?.url) {
    const url = new URL(config.socket.url)
    url.protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    return url.toString()
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const host = window.location.hostname
  const port = window.location.port || (protocol === 'wss:' ? '443' : '80')
  const webSocketUrl = `${protocol}//${host}:${port}`
  debug('getWebSocketUrl', webSocketUrl)
  return webSocketUrl
}

function authResult(result: { success: boolean; message?: string }): void {
  debug('authResult', result)
  state.isConnecting = false
  if (result.success) {
    updateElement('status', 'Connected', 'green')
    if (focusTerminalCallback) focusTerminalCallback()
  } else {
    updateElement('status', `Authentication failed: ${result.message ?? ''}`, 'red')
    if (onDisconnectCallback) onDisconnectCallback('auth_failed', result.message)
  }
}

function connect(): void {
  debug('connect: Connected to server')
  state.isConnecting = false
  updateElement('status', 'Connected', 'green')
  resize()
  if (onConnectCallback) onConnectCallback()
}

function connect_error(error: unknown): void {
  debug('connect_error', error)
  if (onDisconnectCallback) onDisconnectCallback('connect_error', error)
}

function data(chunk: string): void {
  if (writeToTerminal) writeToTerminal(chunk)
  if (onDataCallback) onDataCallback(chunk)
}

function disconnect(reason: string): void {
  debug('disconnect', reason)
  state.isConnecting = false
  updateElement('status', `WEBSOCKET SERVER DISCONNECTED: ${reason}`, 'red')
  if (onDisconnectCallback) onDisconnectCallback(reason)
}

function error(err: unknown): void {
  debug('Socket error:', err)
  if (onDisconnectCallback) onDisconnectCallback('error', err)
}

function permissions(permissions: Record<string, boolean>): void {
  debug('permissions', permissions)
  const handlers = {
    autoLog: (value: boolean) => {
      if (value) toggleLog(value)
    },
    allowReauth: (value: boolean) => {
      state.allowReauth = value
      updateUIVisibility({ allowReauth: value } as unknown as Record<string, boolean>)
    },
    allowReconnect: (value: boolean) => {
      state.allowReconnect = value
    },
    allowReplay: (value: boolean) => {
      state.allowReplay = value
      updateUIVisibility({ allowReplay: value } as unknown as Record<string, boolean>)
    }
  } as const

  Object.entries(permissions).forEach(([key, value]) => {
    const handler = (handlers as Record<string, (v: boolean) => void>)[key]
    if (handler) handler(Boolean(value))
  })
}

function handleKeyboardInteractive(data: { prompts: Array<{ prompt: string; echo: boolean }>; name?: string }): void {
  debug('handleKeyboardInteractive')
  showPromptDialog(data, (responses: string[]) => {
    debug('handleKeyboardInteractive: response')
    socket?.emit('authentication', {
      action: 'keyboard-interactive',
      responses
    } as unknown as Record<string, unknown>)
  })
}

function ssherror(msg: string): void {
  debug('ssherror', msg)
  if (onDisconnectCallback) onDisconnectCallback('ssh_error', msg)
}

function authentication(data: { action: string; success?: boolean; message?: string }): void {
  debug('authentication', data)
  switch (data.action) {
    case 'request_auth':
      authenticate()
      updateElement('status', 'Requesting authentication...', 'orange')
      break
    case 'auth_result':
      authResult({ success: Boolean(data.success), message: data.message })
      break
    case 'keyboard-interactive':
      handleKeyboardInteractive(data as unknown as { prompts: Array<{ prompt: string; echo: boolean }>; name?: string })
      break
    case 'reauth':
      if (onDisconnectCallback) onDisconnectCallback('reauth_required', socket)
      break
    case 'dimensions':
      emitResize(getTerminalDimensions() as ClientResizePayload)
      break
    default:
      debug(`Unhandled authentication action: ${data.action}`)
      break
  }
}

function updateUI(data: { element?: string; value?: unknown }): void {
  debug('updateUI', JSON.stringify(data))
  const { element, value } = data
  if (!element || value === undefined || value === null) {
    console.warn('updateUI: Received invalid data from updateUI event:', data)
    return
  }
  updateElement(element, value as unknown as { text: string; background?: string })
}

function setupSocketListeners(): void {
  debug('setupSocketListeners')
  if (!socket) return
  socket.on('authentication', authentication)
  socket.on('permissions', permissions)
  socket.on('getTerminal', getTerminal)
  socket.on('data', data)
  socket.on('ssherror', ssherror)
  socket.on('updateUI', updateUI)
  // Default Socket.IO lifecycle events
  socket.on('connect', connect)
  socket.on('connect_error', connect_error)
  socket.on('disconnect', disconnect)
  socket.on('error', error)
}
