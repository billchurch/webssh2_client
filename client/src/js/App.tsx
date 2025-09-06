import type { Component } from 'solid-js'
import { createSignal, onMount, onCleanup, Show, createEffect } from 'solid-js'
import createDebug from 'debug'

// Import existing utilities and types
import type { WebSSH2Config } from '../types/config.d'
import {
  initializeConfig,
  initializeUrlParams,
  configWithUrlOverrides
} from './stores/config.js'
import { getBasicAuthCookie } from './utils/cookies.js'
import {
  checkSavedLog,
  setSessionFooter as setGlobalSessionFooter,
  startLogging,
  stopLogging,
  downloadLog,
  addToLog,
  clearLog
} from './services/logging-service.js'

// Import state management
import {
  state,
  setState,
  sessionFooter,
  setSessionFooter,
  errorMessage,
  setErrorMessage,
  isLoginDialogOpen,
  setIsLoginDialogOpen,
  isErrorDialogOpen,
  setIsErrorDialogOpen,
  isTerminalSettingsOpen,
  setIsTerminalSettingsOpen,
  showReconnectButton,
  setShowReconnectButton,
  headerContent,
  setHeaderContent,
  promptData,
  setPromptData
} from './state-solid.js'

// Import components
import { TerminalComponent, terminalManager } from './components/Terminal'
import { LoginModal } from './components/LoginModal'
import { ErrorModal, PromptModal } from './components/Modal'
import { TerminalSettingsModal } from './components/TerminalSettingsModal'
import { MenuDropdown } from './components/MenuDropdown'

// Import socket service
import {
  socketService,
  setTerminalDimensions,
  submitPromptResponses,
  connectionStatus,
  connectionStatusColor
} from './services/socket-service.js'

// Import types
import type { ClientAuthenticatePayload } from '../types/events.d'
import type { TerminalRef } from './xterm-solid/types'

// Import CSS
import '../css/tailwind.css'
import '@xterm/xterm/css/xterm.css'
import '../css/icons.css'

const debug = createDebug('webssh2-client:app')

const App: Component = () => {
  const [config, setConfig] = createSignal<WebSSH2Config>()
  const [_isTerminalVisible, setIsTerminalVisible] = createSignal(false)

  let terminalRef: TerminalRef | undefined

  // Debug effect for login dialog state
  createEffect(() => {
    debug('LoginDialog state changed:', isLoginDialogOpen())
  })

  onMount(async () => {
    try {
      debug(
        `Initializing WebSSH2 client - ${(globalThis as Record<string, unknown>)['BANNER_STRING'] ?? 'undefined'}`
      )

      // Initialize reactive config and URL params
      initializeConfig()
      const cleanupUrlListener = initializeUrlParams()

      // Handle cleanup on component unmount
      onCleanup(() => cleanupUrlListener())

      const basicAuthCookie = getBasicAuthCookie()
      if (basicAuthCookie) {
        // Note: Basic auth cookie handling may need to be integrated with reactive config
        setState('isBasicAuthCookiePresent', true)
      } else {
        setState('isBasicAuthCookiePresent', false)
      }

      // Use reactive config with URL overrides
      const initialConfig = configWithUrlOverrides()
      setConfig(initialConfig)

      // Set session footer
      const footer = initialConfig.ssh.host
        ? `ssh://${initialConfig.ssh.host}:${initialConfig.ssh.port}`
        : null
      setSessionFooter(footer)
      setGlobalSessionFooter(footer)

      // Initialize socket service
      socketService.initSocket(
        initialConfig,
        onConnect,
        onDisconnect,
        onData,
        writeToTerminal,
        focusTerminal
      )

      // Set up reactive effects within the SolidJS context
      socketService.setupReactiveEffects()

      // Check for saved session log
      checkSavedLog()

      // Initialize loggedData state based on localStorage
      const hasSessionLog = window.localStorage.getItem('webssh2_session_log')
      setState('loggedData', !!hasSessionLog)
      debug('Initialized loggedData state:', !!hasSessionLog)

      // Initialize connection
      initializeConnection(initialConfig)

      debug('WebSSH2 client initialized', {
        autoConnect: initialConfig.autoConnect,
        loginDialogOpen: isLoginDialogOpen()
      })
    } catch (error) {
      console.error('Initialization error:', error)
      handleError('Initialization error:', error)
    }
  })

  onCleanup(() => {
    debug('App cleanup')
    socketService.closeConnection()
  })

  // Terminal event handlers
  const handleTerminalReady = (ref: TerminalRef) => {
    debug('Terminal ready')
    terminalRef = ref
    terminalManager.setTerminalRef(ref)

    // Set initial dimensions
    if (ref.terminal) {
      const dims = { cols: ref.terminal.cols, rows: ref.terminal.rows }
      setTerminalDimensions(dims)
      debug('Terminal dimensions set:', dims)
    }

    // Set up resize listener
    if (ref.terminal) {
      ref.terminal.onResize((dimensions) => {
        const dims = { cols: dimensions.cols, rows: dimensions.rows }
        setTerminalDimensions(dims)
        debug('Terminal resized:', dims)

        // Manually trigger resize to socket
        socketService.emitResize(dims)
      })
    }

    setIsTerminalVisible(true)
  }

  // Socket event handlers
  const onConnect = () => {
    setShowReconnectButton(false)
    setIsErrorDialogOpen(false)
    setState('sessionLogEnable', false)
    setState('loggedData', false)
    debug('Connected to server')
  }

  const onDisconnect = (reason: string, details?: unknown) => {
    debug('Disconnected:', reason)
    switch (reason) {
      case 'auth_required':
      case 'auth_failed':
        setIsLoginDialogOpen(true)
        break
      case 'reauth_required':
        debug('Reauth required')
        setState('reauthRequired', true)
        setIsLoginDialogOpen(true)
        break
      case 'error':
      case 'ssh_error':
        if (!state.reauthRequired) {
          setErrorMessage(`${String(details || reason)}`)
          setIsErrorDialogOpen(true)
          commonPostDisconnectTasks()
        } else {
          setState('reauthRequired', false)
        }
        break
      default:
        setErrorMessage(`Disconnected: ${String(details || reason)}`)
        setIsErrorDialogOpen(true)
        commonPostDisconnectTasks()
        break
    }
  }

  const onData = (data: string) => {
    addToLog(data)
  }

  const writeToTerminal = (data: string) => {
    terminalManager.writeToTerminal(data)
  }

  const focusTerminal = () => {
    terminalManager.focusTerminal()
  }

  // UI event handlers
  const handleLogin = (formData: Partial<ClientAuthenticatePayload>) => {
    debug('Handling login', { host: formData.host, port: formData.port })
    connectToServer(formData)
  }

  const handleTerminalSettings = (settings: Record<string, unknown>) => {
    terminalManager.applyTerminalSettings(settings)
  }

  const handleReconnect = () => {
    setShowReconnectButton(false)
    setIsErrorDialogOpen(false)
    terminalManager.resetTerminal()
    connectToServer()
  }

  const handlePromptSubmit = (responses: string[]) => {
    // Handle keyboard interactive authentication responses
    debug('Prompt responses:', responses)
    submitPromptResponses(responses)
  }

  // Menu handlers
  const handleStartLog = () => {
    startLogging()
  }

  const handleStopLog = () => {
    stopLogging()
  }

  const handleDownloadLog = () => {
    downloadLog()
  }

  const handleClearLog = () => {
    clearLog()
  }

  const handleReplayCredentials = () => {
    socketService.replayCredentials()
  }

  const handleReauth = () => {
    socketService.reauth()
  }

  // Utility functions
  const connectToServer = (formData?: Partial<ClientAuthenticatePayload>) => {
    debug('Connecting to server')
    const currentConfig = config()
    if (!currentConfig) return

    if (state.isConnecting) return

    if (state.reauthRequired) {
      setState('reauthRequired', false)
      terminalManager.resetTerminal()
    }

    setState('isConnecting', true)
    if (formData) socketService.setFormData(formData)
    socketService.initializeSocketConnection()

    // Show terminal and set header/footer
    if (terminalRef) {
      if (currentConfig?.header?.text && currentConfig?.header?.background) {
        setHeaderContent({
          text: currentConfig.header.text,
          background: currentConfig.header.background
        })
      }
      setIsTerminalVisible(true)
    }
  }

  const commonPostDisconnectTasks = () => {
    setState('isConnecting', false)
    if (state.sessionLogEnable) {
      downloadLog()
    }
    resetApplication()
    if (state.allowReconnect && !state.isBasicAuthCookiePresent) {
      setShowReconnectButton(true)
    }
  }

  const resetApplication = () => {
    setState('sessionLogEnable', false)
  }

  const handleError = (message: string, error: unknown) => {
    console.error('Error:', message, error)
    setState('isConnecting', false)
    setErrorMessage(message)
    setIsErrorDialogOpen(true)
  }

  const initializeConnection = (currentConfig: WebSSH2Config) => {
    debug('Initializing connection', { autoConnect: currentConfig.autoConnect })
    try {
      if (currentConfig.autoConnect) {
        const loginInfo: Partial<ClientAuthenticatePayload> = {}
        if (currentConfig.ssh.host) loginInfo.host = currentConfig.ssh.host
        loginInfo.port = currentConfig.ssh.port
        if (currentConfig.ssh.username)
          loginInfo.username = currentConfig.ssh.username
        connectToServer(loginInfo)
      } else {
        // Show login dialog when autoConnect is false
        debug('Setting login dialog to open')
        // Component is already mounted (called from onMount), so we can set state directly
        setIsLoginDialogOpen(true)
      }
    } catch (error) {
      handleError('Connection initialization failed', error)
    }
  }

  return (
    <div
      class="flex flex-col overflow-hidden bg-black text-neutral-100"
      style="height: 100%; width: 100%;"
    >
      {/* Modals */}
      <LoginModal
        isOpen={isLoginDialogOpen()}
        onClose={() => {
          debug('Closing login dialog')
          setIsLoginDialogOpen(false)
        }}
        onSubmit={handleLogin}
        onOptionsClick={() => setIsTerminalSettingsOpen(true)}
        initialValues={
          config()
            ? (Object.fromEntries(
                Object.entries({
                  ...(config()!.ssh.host && { host: config()!.ssh.host }),
                  ...(config()!.ssh.port && { port: config()!.ssh.port }),
                  ...(config()!.ssh.username && {
                    username: config()!.ssh.username
                  })
                }).filter(([_, value]) => value != null)
              ) as Partial<ClientAuthenticatePayload>)
            : undefined
        }
      />

      <ErrorModal
        isOpen={isErrorDialogOpen()}
        onClose={() => setIsErrorDialogOpen(false)}
        message={errorMessage() || 'An error occurred'}
      />

      <TerminalSettingsModal
        isOpen={isTerminalSettingsOpen()}
        onClose={() => setIsTerminalSettingsOpen(false)}
        onSave={handleTerminalSettings}
      />

      <Show when={promptData()}>
        <PromptModal
          isOpen={!!promptData()}
          onClose={() => setPromptData(null)}
          title={promptData()?.title || 'Authentication Required'}
          prompts={promptData()?.prompts || []}
          onSubmit={handlePromptSubmit}
        />
      </Show>

      {/* Reconnect Button */}
      <Show when={showReconnectButton()}>
        <button
          type="button"
          class="fixed left-1/2 top-1/2 z-[1001] -translate-x-1/2 -translate-y-1/2 rounded bg-blue-600 px-5 py-2 text-sm text-white shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          onClick={handleReconnect}
        >
          Reconnect
        </button>
      </Show>

      {/* Main Container */}
      <div class="flex min-h-0 flex-1 flex-col">
        {/* Header */}
        <Show when={headerContent()}>
          <div
            class="z-[99] h-6 w-full shrink-0 border-b border-neutral-200 text-center leading-6 text-white"
            style={{ 'background-color': headerContent()?.background }}
          >
            {headerContent()?.text}
          </div>
        </Show>

        {/* Terminal Container */}
        <Show
          when={config()}
          fallback={
            <div class="flex flex-1 items-center justify-center">
              <div class="text-neutral-400">Initializing...</div>
            </div>
          }
        >
          <div class="min-h-0 w-full flex-1 overflow-hidden">
            <TerminalComponent
              config={config()!}
              onTerminalReady={handleTerminalReady}
              class="size-full"
            />
          </div>
        </Show>

        {/* Bottom Bar */}
        <div class="z-[99] flex h-6 shrink-0 items-center border-t border-neutral-200 bg-neutral-800 text-neutral-100">
          {/* Menu */}
          <MenuDropdown
            onStartLog={handleStartLog}
            onStopLog={handleStopLog}
            onDownloadLog={handleDownloadLog}
            onClearLog={handleClearLog}
            onReplayCredentials={handleReplayCredentials}
            onReauth={handleReauth}
            onTerminalSettings={() => setIsTerminalSettingsOpen(true)}
          />

          {/* Footer and Status */}
          <div class="inline-block border-l border-neutral-200 px-[10px] text-left">
            {sessionFooter()}
          </div>
          <div
            id="status"
            role="status"
            aria-live="polite"
            aria-atomic="true"
            class={`z-[100] inline-block border-x border-neutral-200 px-[10px] text-left text-white ${(() => {
              const color = connectionStatusColor()
              if (color === 'green') return 'bg-green-700'
              if (color === 'red') return 'bg-red-700'
              if (color === 'orange') return 'bg-orange-700'
              return ''
            })()}`}
          >
            {connectionStatus()}
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
