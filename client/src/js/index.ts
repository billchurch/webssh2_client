// client
// client/src/js/index.ts

import createDebug from 'debug'
import 'purecss/build/pure.css'
import '../css/menu.css'
import '@xterm/xterm/css/xterm.css'
import '../css/terminal.css'
import '../css/style.css'
import '../css/icons.css'

import {
  fillLoginForm,
  focusTerminal,
  hideErrorDialog,
  hideReconnectBtn,
  initializeDom,
  initializeElements,
  openTerminal,
  showErrorDialog,
  showloginDialog,
  showReconnectBtn,
  toggleTerminalDisplay,
  updateElement,
  updatestartLogBtnState,
  setTerminalFunctions,
  setConnectToServerFunction
} from './dom.js'

import {
  initializeSocketConnection,
  initSocket,
  setFormData
} from './socket.js'

import {
  initializeTerminal,
  resetTerminal,
  writeToTerminal,
  getTerminalSettings,
  applyTerminalSettings,
  resizeTerminal
} from './terminal.js'

import { state } from './state.js'
import {
  initializeConfig,
  getBasicAuthCookie,
  populateFormFromUrl
} from './utils.js'
import {
  addToSessionLog,
  checkSavedSessionLog,
  downloadLog,
  setSessionFooter
} from './clientlog.js'
import { replaceIconsIn } from './icons.js'

import type { WebSSH2Config } from '../types/config.d'
import type { ClientAuthenticatePayload } from '../types/events.d'

export const debug = createDebug('webssh2-client')

let config: WebSSH2Config
let elements: ReturnType<typeof initializeElements>
export let sessionFooter: string | null = null

async function initialize(): Promise<void> {
  try {
    console.log(`Initializing WebSSH2 client - ${BANNER_STRING}`)
    config = initializeConfig()

    const basicAuthCookie = getBasicAuthCookie()
    if (basicAuthCookie) {
      config.ssh.host = basicAuthCookie.host || config.ssh.host
      config.ssh.port = basicAuthCookie.port || config.ssh.port
      state.isBasicAuthCookiePresent = true
    } else {
      state.isBasicAuthCookiePresent = false
    }

    config = populateFormFromUrl(config)
    await initializeDom(config)
    replaceIconsIn(document)
    initializeTerminalAndUI()
    initSocket(
      config,
      onConnect,
      onDisconnect,
      onData,
      writeToTerminal,
      focusTerminal
    )
    checkSavedSessionLog()
    initializeConnection()
  } catch (error) {
    handleError('Initialization error:', error)
  }
}

;(async () => {
  await initialize()
})()

function initializeTerminalAndUI(): void {
  debug('initializeTerminalAndUI')
  initializeTerminal(config)
  setTerminalFunctions({
    getTerminalSettings,
    applyTerminalSettings,
    resizeTerminal
  })
  setConnectToServerFunction(connectToServer)
  elements = initializeElements()
  sessionFooter = config.ssh.host
    ? `ssh://${config.ssh.host}:${config.ssh.port}`
    : null
  setSessionFooter(sessionFooter)
  const { terminalContainer } = elements
  if (terminalContainer) {
    openTerminal(terminalContainer)
  } else {
    console.error(
      'Terminal container not found. Terminal cannot be initialized.'
    )
  }
}

export function connectToServer(
  formData: Partial<ClientAuthenticatePayload> | null = null
): void {
  debug('connectToServer')
  const { isConnecting, reauthRequired } = state
  if (isConnecting) return
  if (reauthRequired) {
    state.reauthRequired = false
    resetTerminal()
  }
  state.isConnecting = true
  if (formData) setFormData(formData)
  initializeSocketConnection()

  const { terminalContainer } = elements
  if (terminalContainer) {
    debug('Terminal container found. Applying header and footer.')
    if (config?.header?.text != null && config?.header?.background != null) {
      const headerContent = {
        text: config.header.text ?? '',
        background: config.header.background ?? ''
      }
      updateElement('header', headerContent)
    }
    if (sessionFooter != null) updateElement('footer', { text: sessionFooter })
    toggleTerminalDisplay(true)
  }
}

function onConnect(): void {
  hideReconnectBtn()
  hideErrorDialog()
  state.sessionLogEnable = false
  state.loggedData = false
  updatestartLogBtnState(false)
  debug('onConnect: Successfully connected to the server')
}

function onDisconnect(reason: string, details?: unknown): void {
  const { reauthRequired } = state
  debug('onDisconnect:', reason)
  switch (reason) {
    case 'auth_required':
    case 'auth_failed':
      showloginDialog()
      break
    case 'reauth_required':
      debug('onDisconnect: reauth_required: forms auth flow')
      state.reauthRequired = true
      showloginDialog()
      break
    case 'error':
      showErrorDialog(`Socket error: ${String(details || reason)}`)
      commonPostDisconnectTasks()
      break
    case 'ssh_error':
      if (reauthRequired) {
        debug('Ignoring error due to prior reauth_required')
        state.reauthRequired = false
      } else {
        showErrorDialog(`${String(details || reason)}`)
        commonPostDisconnectTasks()
      }
      break
    default:
      showErrorDialog(`Disconnected: ${String(details || reason)}`)
      commonPostDisconnectTasks()
      break
  }
}

function commonPostDisconnectTasks(): void {
  const { sessionLogEnable } = state
  state.isConnecting = false
  if (sessionLogEnable) {
    const autoDownload = window.confirm(
      'Would you like to download the session log?'
    )
    downloadLog(autoDownload)
  }
  resetApplication()
  if (state.allowReconnect && !state.isBasicAuthCookiePresent) {
    showReconnectBtn(reconnectToServer)
  }
}

function onData(data: string): void {
  if (state.sessionLogEnable) addToSessionLog(data)
}

export function handleError(message: string, error: unknown): void {
  console.error('Error:', message, error)
  state.isConnecting = false
  updateElement('status', `Error: ${message}`, 'red')
  showErrorDialog(message)
}

function resetApplication(): void {
  state.sessionLogEnable = false
  updatestartLogBtnState(false)
}

function reconnectToServer(): void {
  const { isConnecting } = state
  if (isConnecting) {
    debug('Reconnection already in progress')
    return
  }
  hideReconnectBtn()
  hideErrorDialog()
  resetTerminal()
  connectToServer()
}

function initializeConnection(): void {
  const { autoConnect, ssh } = config
  debug('initializeConnection', { autoConnect })
  try {
    if (autoConnect) {
      fillLoginForm(ssh)
      connectToServer()
    } else {
      showloginDialog()
    }
  } catch (error) {
    handleError('initializeConnection: failed: ', error)
  }
}
