// client
// client/src/js/dom.ts
/**
 * @module dom
 * @description Handles DOM manipulations and UI updates for WebSSH2 client
 */

import createDebug from 'debug'
import { createIconNode } from './icons.js'
import {
  sanitizeColor,
  validateNumber,
  validateBellStyle,
  validatePrivateKey
} from './utils.js'
import { emitData, emitResize, reauth, replayCredentials } from './socket.js'
import { downloadLog, clearLog, toggleLog } from './clientlog.js'
import { initializeSettings, saveTerminalSettings } from './settings.js'
import { state } from './state.js'
import type { ElementId, UpdateElementContent } from '../types/dom.d'
import type { ClientAuthenticatePayload } from '../types/events.d'

const debug = createDebug('webssh2-client:dom')

type TerminalDimensions = { cols: number; rows: number }

import type { ITerminalOptions as TerminalOptions } from '@xterm/xterm'
import type { WebSSH2Config } from '../types/config.d'

type TerminalFunctions = {
  getTerminalSettings: (config: WebSSH2Config) => Partial<TerminalOptions>
  applyTerminalSettings: (settings: Partial<TerminalOptions>) => void
  resizeTerminal: () => TerminalDimensions | null
}

type ConnectToServerFn = (formData: Partial<ClientAuthenticatePayload>) => void

// connectToServer will be injected to avoid circular dependency
let connectToServer: ConnectToServerFn | null = null

export function setConnectToServerFunction(connectFn: ConnectToServerFn): void {
  connectToServer = connectFn
}

// Terminal functions will be injected to avoid circular dependency
let getTerminalSettings: TerminalFunctions['getTerminalSettings'] | null = null
let applyTerminalSettings: TerminalFunctions['applyTerminalSettings'] | null =
  null
let resizeTerminal: TerminalFunctions['resizeTerminal'] | null = null

export function setTerminalFunctions(
  terminalFunctions: TerminalFunctions
): void {
  getTerminalSettings = terminalFunctions.getTerminalSettings
  applyTerminalSettings = terminalFunctions.applyTerminalSettings
  resizeTerminal = terminalFunctions.resizeTerminal
}

interface Elements {
  backdrop: HTMLElement
  clearLogBtn: HTMLButtonElement
  closeterminalSettingsBtn: HTMLButtonElement
  downloadLogBtn: HTMLButtonElement
  dropupContent: HTMLElement
  errorDialog: HTMLDialogElement
  errorMessage: HTMLElement
  footer: HTMLElement
  header: HTMLElement
  hostInput: HTMLInputElement
  loginDialog: HTMLDialogElement
  loginForm: HTMLFormElement
  passwordInput: HTMLInputElement
  portInput: HTMLInputElement
  privateKeyFile: HTMLInputElement
  privateKeyText: HTMLTextAreaElement
  privateKeySection: HTMLElement
  passphraseInput: HTMLInputElement
  promptDialog: HTMLDialogElement
  promptMessage: HTMLElement
  reauthBtn: HTMLButtonElement
  reconnectButton: HTMLButtonElement
  replayCredentialsBtn: HTMLButtonElement
  startLogBtn: HTMLButtonElement
  status: HTMLElement
  stopLogBtn: HTMLButtonElement
  terminalContainer: HTMLElement
  terminalSettingsBtn: HTMLButtonElement
  terminalSettingsDialog: HTMLDialogElement
  terminalSettingsForm: HTMLFormElement
  usernameInput: HTMLInputElement
  loginSettingsBtn: HTMLButtonElement
}

let elements: Partial<Elements> = {}

type TermLike = { open: (container: HTMLElement) => void; focus: () => void }
let term: TermLike | null = null

export function hideErrorDialog(): void {
  const { errorDialog } = elements
  errorDialog?.close?.()
}

export function hidePromptDialog(): void {
  const { promptDialog } = elements
  promptDialog?.close?.()
}

export function fillLoginForm(sshConfig: {
  host?: string
  port?: number | string
  username?: string
}): void {
  const { hostInput, loginForm, portInput, usernameInput } = elements
  const { host, port, username } = sshConfig
  if (loginForm) {
    debug('fillLoginForm', sshConfig)
    if (hostInput) hostInput.value = host ?? ''
    if (portInput) portInput.value = String(port ?? '')
    if (usernameInput) usernameInput.value = username ?? ''
  } else {
    console.error('fillLoginForm: element not found')
  }
}

export function hideloginDialog(): void {
  debug('hideloginDialog')
  elements.loginDialog?.close?.()
}

export function hideReconnectBtn(): void {
  toggleVisibility(elements.backdrop ?? null, false)
  if (elements.reconnectButton) hideButton(elements.reconnectButton, true)
}

export function initializeElements(): Partial<Elements> {
  debug('initializeElements')
  const elementIds: ElementId[] = [
    'backdrop',
    'clearLogBtn',
    'closeterminalSettingsBtn',
    'downloadLogBtn',
    'dropupContent',
    'errorDialog',
    'errorMessage',
    'footer',
    'header',
    'hostInput',
    'loginDialog',
    'loginForm',
    'passwordInput',
    'portInput',
    'privateKeyFile',
    'privateKeyText',
    'privateKeySection',
    'passphraseInput',
    'promptDialog',
    'promptMessage',
    'reauthBtn',
    'reconnectButton',
    'replayCredentialsBtn',
    'startLogBtn',
    'status',
    'stopLogBtn',
    'terminalContainer',
    'terminalSettingsBtn',
    'terminalSettingsDialog',
    'terminalSettingsForm',
    'usernameInput',
    'loginSettingsBtn'
  ]

  const criticalElements: ElementId[] = [
    'terminalContainer',
    'loginForm',
    'errorDialog',
    'promptDialog'
  ]

  elements = {}
  elementIds.forEach((id) => {
    const el = document.getElementById(id as string)
    if (el) {
      ;(elements as Record<string, Element | null>)[id] = el
    } else if (criticalElements.includes(id)) {
      throw new Error(
        `initializeElements: Critical element with id '${id}' not found`
      )
    } else {
      console.warn(`initializeElements: Element with id '${id}' not found`)
    }
  })

  if (elements.errorDialog) {
    const closeBtn = elements.errorDialog.querySelector(
      '.close-button'
    ) as HTMLButtonElement | null
    if (closeBtn) {
      closeBtn.onclick = () => hideErrorDialog()
      elements.errorDialog.addEventListener('close', () => {
        elements.reconnectButton?.focus()
      })
    }
  }

  if (elements.promptDialog) {
    const closeBtn = elements.promptDialog.querySelector(
      '.close-button'
    ) as HTMLButtonElement | null
    if (closeBtn) closeBtn.onclick = () => hidePromptDialog()
  }
  return elements
}

export function setupEventListeners(config: unknown): void {
  debug('setupEventListeners')
  const elementHandlers: Record<string, (ev: Event) => void> = {
    clearLogBtn: () => clearLog(),
    closeterminalSettingsBtn: () => hideterminalSettingsDialog(),
    // Download button should immediately download current session log
    downloadLogBtn: () => downloadLog(true),
    loginForm: (e) => formSubmit(e),
    loginSettingsBtn: () => showterminalSettingsDialog(config),
    reauthBtn: () => reauth(),
    replayCredentialsBtn: () => replayCredentials(),
    startLogBtn: () => toggleLog(),
    stopLogBtn: () => toggleLog(),
    terminalSettingsBtn: () => showterminalSettingsDialog(config),
    terminalSettingsForm: (event) => handleterminalSettingsSubmit(event, config)
  }

  Object.entries(elementHandlers).forEach(([elementName, handler]) => {
    const element = (
      elements as Record<string, HTMLElement | HTMLFormElement | undefined>
    )[elementName]
    if (element) {
      const eventType = ['loginForm', 'terminalSettingsForm'].includes(
        elementName
      )
        ? 'submit'
        : 'click'
      element.addEventListener(eventType, handler as EventListener)
    }
  })

  setupPrivateKeyEvents()

  window.addEventListener('resize', () => resize())
  document.addEventListener('keydown', keydown)
  window.addEventListener('beforeunload', (event) => {
    event.preventDefault()
  })
  if (elements.passwordInput) {
    elements.passwordInput.addEventListener('keyup', detectCapsLock)
    elements.passwordInput.addEventListener('keydown', detectCapsLock)
  }
}

export function showErrorDialog(message: string): void {
  const { errorMessage, errorDialog } = elements
  if (errorMessage && errorDialog) {
    debug(`Error modal shown with message: ${message}`)
    errorMessage.textContent = message
    errorDialog.showModal()
    updateElement('status', 'ERROR', 'red')
  } else {
    console.error('Error modal or error message element not found')
  }
}

export function showPromptDialog(
  data: { name?: string; prompts: Array<{ prompt: string; echo: boolean }> },
  callback: (responses: string[]) => void
): void {
  const { promptDialog, promptMessage } = elements
  if (!promptDialog || !promptMessage) {
    console.error('Prompt modal or prompt message element not found')
    return
  }
  const form = promptDialog.querySelector('form') as HTMLFormElement | null
  if (!form) return
  const inputContainer = form.querySelector(
    '#promptInputContainer'
  ) as HTMLElement | null
  if (!inputContainer) return

  debug('Prompt dialog shown', data)
  promptMessage.textContent = data.name || 'Authentication Required'
  inputContainer.textContent = ''

  let firstInput: HTMLInputElement | null = null
  data.prompts.forEach((prompt, index) => {
    const label = document.createElement('label')
    label.textContent = prompt.prompt
    const input = document.createElement('input')
    input.type = prompt.echo ? 'text' : 'password'
    input.required = true
    input.id = `promptInput${index}`
    if (index === 0) firstInput = input
    inputContainer.appendChild(label)
    inputContainer.appendChild(input)
  })

  form.onsubmit = (e) => {
    debug('showPromptDialog: form.onsubmit')
    e.preventDefault()
    const responses = data.prompts.map((_, index) => {
      const el = document.getElementById(
        `promptInput${index}`
      ) as HTMLInputElement | null
      return el?.value ?? ''
    })
    hidePromptDialog()
    callback(responses)
  }

  promptDialog.showModal()
  if (firstInput) setTimeout(() => firstInput?.focus(), 0)
  updateElement('status', 'RESPONSE REQUIRED', 'orange')
}

export function showloginDialog(): void {
  debug('showloginDialog')
  const { loginDialog, terminalContainer, usernameInput, passwordInput } =
    elements
  const isReauthRequired = state.reauthRequired
  loginDialog?.showModal?.()
  if (terminalContainer) toggleVisibility(terminalContainer, true)
  if (passwordInput) passwordInput.value = ''
  if (isReauthRequired && usernameInput) {
    usernameInput.value = ''
    toggleLoginFields(isReauthRequired)
  }
  focusAppropriateInput()
}

export function showReconnectBtn(reconnectCallback: () => void): void {
  debug('showReconnectBtn')
  const { reconnectButton, backdrop } = elements
  if (backdrop) toggleVisibility(backdrop, true)
  if (reconnectButton) {
    showButton(reconnectButton, reconnectCallback)
    reconnectButton.focus()
  }
}

export function toggleTerminalDisplay(visible: boolean): void {
  debug(`toggleTerminalDisplay: ${visible}`)
  const { terminalContainer } = elements
  if (terminalContainer) toggleVisibility(terminalContainer, visible)
}

export function triggerDownload(blob: Blob, filename: string): void {
  debug(`triggerDownload: ${filename}`)
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(link.href)
}

export function getElements(): Partial<Elements> {
  return elements
}

export function updateElement(
  elementName: ElementId,
  content: UpdateElementContent,
  color?: string
): void {
  const element = (elements as Record<string, HTMLElement | undefined>)[
    elementName
  ]
  if (!element || content == null) {
    console.warn(
      `updateElement: ${String(elementName)} element not found or content missing.`
    )
    return
  }
  const { text, background } =
    typeof content === 'object'
      ? { text: content.text, background: content.background }
      : { text: content, background: color }
  const sanitizedColor = background ? sanitizeColor(background) : null
  debug('updateElement', { elementName, text, sanitizedColor })
  element.textContent = text
  if (sanitizedColor) element.style.backgroundColor = sanitizedColor
  if (elementName === 'header') {
    const { terminalContainer } = elements
    // show header (Tailwind-driven)
    element.classList.remove('hidden')
    // Tailwind-based height adjust
    if (terminalContainer) {
      terminalContainer.classList.remove('h-[calc(100%-var(--bar-h))]')
      terminalContainer.classList.add('h-[calc(100%-(var(--bar-h)*2))]')
      // Back-compat for legacy CSS rule
      terminalContainer.classList.add('with-header')
    }
  }
}

export function updatestartLogBtnState(isLogging: boolean): void {
  debug(`updatestartLogBtnState: ${isLogging}`)
  const { startLogBtn, stopLogBtn, downloadLogBtn, clearLogBtn } = elements
  if (startLogBtn && stopLogBtn) {
    if (isLogging) {
      toggleVisibility(startLogBtn, false)
      toggleVisibility(stopLogBtn, true)
    } else {
      toggleVisibility(startLogBtn, true)
      toggleVisibility(stopLogBtn, false)
    }
  }
  if (downloadLogBtn && clearLogBtn && isLogging) {
    toggleVisibility(downloadLogBtn, true)
    toggleVisibility(clearLogBtn, true)
  }
}

export function updateUIVisibility(permissions: {
  allowReauth?: boolean
  allowReplay?: boolean
  error?: string
}): void {
  debug('updateUIVisibility', permissions)
  if (permissions.allowReauth !== undefined)
    updateReauthBtnVisibility(permissions.allowReauth)
  if (permissions.allowReplay !== undefined)
    updateReplayCredentialsBtnVisibility(permissions.allowReplay)
  if (permissions.error) showErrorDialog(permissions.error)
}

function focusAppropriateInput(): void {
  debug('focusAppropriateInput')
  const { hostInput, usernameInput, passwordInput, portInput } = elements
  const isReauthRequired = state.reauthRequired
  if (isReauthRequired) {
    if (usernameInput && !usernameInput.value) {
      usernameInput.focus()
      return
    }
    passwordInput?.focus()
    return
  }
  if (hostInput && !hostInput.value) {
    hostInput.focus()
    return
  }
  if (usernameInput && !usernameInput.value && portInput?.value) {
    usernameInput.focus()
    return
  }
  passwordInput?.focus()
}

function updateReauthBtnVisibility(visible: boolean): void {
  const { reauthBtn } = elements
  if (reauthBtn) toggleVisibility(reauthBtn, visible)
}

function updateReplayCredentialsBtnVisibility(visible: boolean): void {
  const { replayCredentialsBtn } = elements
  if (replayCredentialsBtn) toggleVisibility(replayCredentialsBtn, visible)
}

export function toggleDownloadLogBtn(visible: boolean): void {
  if (elements.downloadLogBtn)
    toggleVisibility(elements.downloadLogBtn, visible)
}

export function toggleClearLogBtn(visible: boolean): void {
  if (elements.clearLogBtn) toggleVisibility(elements.clearLogBtn, visible)
}

function toggleVisibility(
  element: HTMLElement | null,
  isVisible: boolean
): void {
  if (!element) return
  debug(`toggleVisibility: ${element.id}: ${isVisible}`)
  if (isVisible) element.classList.remove('hidden')
  else element.classList.add('hidden')
}

function formSubmit(e: Event): void {
  e.preventDefault()
  const form = e.target as HTMLFormElement
  const formData = new FormData(form)
  const entriesObj: Record<string, unknown> = {}
  formData.forEach((v, k) => {
    entriesObj[k] = v
  })
  const entries = entriesObj as Partial<ClientAuthenticatePayload>
  if (entries.port) {
    const portNum = parseInt(String(entries.port), 10)
    if (Number.isNaN(portNum) || portNum < 1 || portNum > 65535) {
      showErrorDialog(
        `Invalid port number: ${String(entries.port)}. Port must be between 1 and 65535.`
      )
      return
    }
    entries.port = portNum
  }
  hideloginDialog()
  if (connectToServer) connectToServer(entries)
  else console.error('connectToServer function not available')
}

function keydown(event: KeyboardEvent): void {
  if (event.ctrlKey && event.shiftKey && event.code === 'Digit6') {
    event.preventDefault()
    emitData('\x1E')
  }
}

function detectCapsLock(event: KeyboardEvent): void {
  const input = elements.passwordInput
  if (!input) return
  if (event.getModifierState('CapsLock')) input.classList.add('capslock-active')
  else input.classList.remove('capslock-active')
}

export function resize(): void {
  if (resizeTerminal) {
    const dimensions = resizeTerminal()
    if (dimensions) {
      debug('resize:', dimensions)
      emitResize(dimensions)
    }
  }
}

export function hideButton(
  button: HTMLElement,
  removeOnClick: boolean = false
): void {
  toggleVisibility(button, false)
  if (removeOnClick) (button as HTMLButtonElement).onclick = null
}

export function showButton(
  button: HTMLElement,
  onClick: (() => void) | null = null
): void {
  toggleVisibility(button, true)
  if (onClick) (button as HTMLButtonElement).onclick = onClick
}

export function showterminalSettingsDialog(config: unknown): void {
  debug('showterminalSettingsDialog')
  if (elements.terminalSettingsDialog) {
    populateterminalSettingsForm(config)
    elements.terminalSettingsDialog.showModal()
  }
}

function populateterminalSettingsForm(config: unknown): void {
  const settings = getTerminalSettings
    ? getTerminalSettings(config as WebSSH2Config)
    : {}
  debug('populateterminalSettingsForm', settings)
  if (elements.terminalSettingsForm) {
    const form = elements.terminalSettingsForm
    Object.keys(settings).forEach((key) => {
      const control = form.elements.namedItem(key) as
        | HTMLInputElement
        | HTMLSelectElement
        | RadioNodeList
        | null
      if (!control) return
      if (control instanceof HTMLInputElement) {
        if (control.type === 'checkbox')
          control.checked = Boolean((settings as Record<string, unknown>)[key])
        else
          control.value = String(
            (settings as Record<string, unknown>)[key] ?? ''
          )
      } else if (control instanceof HTMLSelectElement) {
        control.value = String((settings as Record<string, unknown>)[key] ?? '')
      }
    })
  }
}

export function hideterminalSettingsDialog(): void {
  debug('hideterminalSettingsDialog')
  elements.terminalSettingsDialog?.close?.()
}

export function handleterminalSettingsSubmit(
  event: Event,
  config: unknown
): void {
  debug('handleterminalSettingsSubmit')
  event.preventDefault()
  const form = event.target as HTMLFormElement
  if (!(form instanceof HTMLFormElement)) {
    console.error('handleterminalSettingsSubmit: Invalid form element')
    return
  }
  const formData = new FormData(form)
  const settings: Record<string, unknown> = {}
  const currentSettings = getTerminalSettings
    ? getTerminalSettings(config as WebSSH2Config)
    : {}
  const entries: Array<[string, FormDataEntryValue]> = []
  formData.forEach((v, k) => entries.push([k, v]))
  for (const [key, value] of entries) {
    switch (key) {
      case 'fontSize':
        settings[key] = validateNumber(
          value as string,
          8,
          72,
          (currentSettings as Record<string, number>)['fontSize'] as number
        )
        break
      case 'scrollback':
        settings[key] = validateNumber(
          value as string,
          1,
          200000,
          (currentSettings as Record<string, number>)['scrollback'] as number
        )
        break
      case 'tabStopWidth':
        settings[key] = validateNumber(
          value as string,
          1,
          100,
          (currentSettings as Record<string, number>)['tabStopWidth'] as number
        )
        break
      case 'cursorBlink':
        settings[key] = (value as string) === 'true'
        break
      case 'bellStyle':
        settings[key] = validateBellStyle(
          value as string,
          (currentSettings as Record<string, 'sound' | 'none'>)['bellStyle'] as
            | 'sound'
            | 'none'
        )
        break
      case 'fontFamily':
        settings[key] =
          (value as string) ||
          (currentSettings as Record<string, string>)['fontFamily']
        break
      default:
        settings[key] = value
    }
  }
  saveTerminalSettings(settings)
  if (applyTerminalSettings) applyTerminalSettings(settings)
  hideterminalSettingsDialog()
}

export function initializeDom(config: unknown): Promise<void> {
  return new Promise((resolve) => {
    const initializeDomContent = () => {
      debug('initializeDom')
      initializeElements()
      setupEventListeners(config)
      initializeSettings()
      resolve()
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initializeDomContent)
    } else {
      initializeDomContent()
    }
  })
}

export function setTerminalInstance(terminalInstance: TermLike): void {
  term = terminalInstance
}

export function openTerminal(container: HTMLElement): void {
  if (term && container) {
    term.open(container)
    debug('openTerminal')
  } else {
    console.error('openTerminal: Terminal or container not available')
  }
}

export function focusTerminal(): void {
  if (term) {
    term.focus()
    debug('focusTerminal: Terminal focused')
  } else {
    console.error('openTerminal: Terminal not available')
  }
}

function toggleLoginFields(stateValue: boolean): void {
  const { hostInput, portInput } = elements
  if (hostInput) hostInput.disabled = stateValue
  if (portInput) portInput.disabled = stateValue
  debug(
    `toggleLoginFields: ${stateValue ? 'disabled' : 'enabled'} for ${stateValue ? 're-authentication' : 'new connection'}`
  )
}

function setupPrivateKeyEvents(): void {
  const privateKeyToggle = document.getElementById(
    'privateKeyToggle'
  ) as HTMLButtonElement | null
  const privateKeyFile = document.getElementById(
    'privateKeyFile'
  ) as HTMLInputElement | null
  const privateKeyText = document.getElementById(
    'privateKeyText'
  ) as HTMLTextAreaElement | null
  const privateKeySection = document.getElementById(
    'privateKeySection'
  ) as HTMLElement | null
  if (
    !privateKeyToggle ||
    !privateKeyFile ||
    !privateKeyText ||
    !privateKeySection
  )
    return
  privateKeyToggle.addEventListener('click', (e) => {
    e.preventDefault()
    privateKeySection.classList.toggle('hidden')
    privateKeyToggle.replaceChildren()
    const iconEl = createIconNode('key', 'w-5 h-5 inline-block')
    if (privateKeySection.classList.contains('hidden')) {
      privateKeyToggle.append(iconEl, document.createTextNode(' Add SSH Key'))
    } else {
      privateKeyToggle.append(iconEl, document.createTextNode(' Hide SSH Key'))
    }
  })
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  privateKeyFile.addEventListener('change', async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (file) {
      try {
        const content = await file.text()
        if (validatePrivateKey(content)) {
          privateKeyText.value = content
        } else {
          showErrorDialog('Invalid private key format')
        }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (_error) {
        showErrorDialog('Error reading private key file')
      }
    }
  })
}
