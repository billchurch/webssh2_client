import type { Component } from 'solid-js'
import { createSignal, onMount, onCleanup, Show, createEffect } from 'solid-js'
import createDebug from 'debug'

// Import existing utilities and types
import type { WebSSH2Config } from './types/config.d'
import {
  initializeConfig,
  initializeUrlParams,
  configWithUrlOverrides
} from './js/stores/config.js'
import { getBasicAuthCookie } from './utils/cookies.js'
import {
  checkSavedLog,
  setSessionFooter as setGlobalSessionFooter,
  startLogging,
  stopLogging,
  downloadLog,
  addToLog,
  clearLog
} from './services/logging.js'

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
  promptData,
  setPromptData
} from './stores/terminal.js'

// Import components
import {
  TerminalComponent,
  terminalManager,
  type TerminalActions
} from './js/components/Terminal'
import { LoginModal } from './js/components/LoginModal'
import { ErrorModal, PromptModal } from './js/components/Modal'
import { TerminalSettingsModal } from './js/components/TerminalSettingsModal'
import { MenuDropdown } from './js/components/MenuDropdown'

// Import socket service
import {
  socketService,
  setTerminalDimensions,
  submitPromptResponses,
  connectionStatus,
  connectionStatusColor
} from './services/socket.js'

// Import types
import type { ClientAuthenticatePayload } from './types/events.d'
import type { TerminalRef } from './lib/xterm-solid/types'
import type { ITerminalOptions } from '@xterm/xterm'

// Import CSS
import './app.css'
import '@xterm/xterm/css/xterm.css'
import './css/icons.css'

const debug = createDebug('webssh2-client:app')

const App: Component = () => {
  const [config, setConfig] = createSignal<WebSSH2Config>()
  const [_isTerminalVisible, setIsTerminalVisible] = createSignal(false)
  const [terminalActions, setTerminalActions] = createSignal<TerminalActions>()

  let terminalRef: TerminalRef | undefined

  // Debug effect for login dialog state
  createEffect(() => {
    debug('LoginDialog state changed:', isLoginDialogOpen())
  })

  onMount(async () => {
    try {
      // This console.log is intentional and should not be changed to debug
      console.log(
        `Initializing WebSSH2 client - ${BANNER_STRING}`
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
    // Note: terminalManager.setTerminalRef is called by the TerminalComponent itself

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
    const actions = terminalActions()
    if (actions) {
      actions.write(data)
    } else {
      // Fallback to manager if reactive actions not available yet
      terminalManager.writeToTerminal(data)
    }
  }

  const focusTerminal = () => {
    const actions = terminalActions()
    if (actions) {
      actions.focus()
    } else {
      // Fallback to manager if reactive actions not available yet
      terminalManager.focusTerminal()
    }
  }

  // UI event handlers
  const handleLogin = (formData: Partial<ClientAuthenticatePayload>) => {
    debug('Handling login', { host: formData.host, port: formData.port })
    connectToServer(formData)
  }

  const handleTerminalSettings = (settings: Record<string, unknown>) => {
    const actions = terminalActions()
    if (actions) {
      actions.applySettings(settings as Partial<ITerminalOptions>)
    } else {
      // Fallback to manager if reactive actions not available yet
      terminalManager.applyTerminalSettings(settings)
    }
  }

  const handleReconnect = () => {
    setShowReconnectButton(false)
    setIsErrorDialogOpen(false)
    const actions = terminalActions()
    if (actions) {
      actions.reset()
    } else {
      // Fallback to manager if reactive actions not available yet
      terminalManager.resetTerminal()
    }
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
      const actions = terminalActions()
      if (actions) {
        actions.reset()
      } else {
        // Fallback to manager if reactive actions not available yet
        terminalManager.resetTerminal()
      }
    }

    setState('isConnecting', true)
    if (formData) socketService.setFormData(formData)
    socketService.initializeSocketConnection()

    // Show terminal - header will be set by server via updateUI events
    if (terminalRef) {
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
    <div class="flex size-full flex-col overflow-hidden bg-black text-neutral-100">
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
            class={(() => {
              const header = headerContent()!

              // New headerStyle approach (full styling)
              if (header.fullStyle && header.styleIsTailwind) {
                return `z-[99] w-full shrink-0 border-b border-neutral-200 text-center text-white ${header.fullStyle}`
              }

              // Backward compatibility: headerBackground approach
              if (header.backgroundIsTailwind && header.background) {
                return `z-[99] h-6 w-full shrink-0 border-b border-neutral-200 text-center leading-6 text-white ${header.background}`
              }

              // Default fallback
              return 'z-[99] h-6 w-full shrink-0 border-b border-neutral-200 bg-black text-center leading-6 text-white'
            })()}
            style={(() => {
              const header = headerContent()!

              // New headerStyle with Tailwind classes - no inline styles needed
              if (header.fullStyle && header.styleIsTailwind) {
                return {}
              }

              // New headerStyle approach with CSS fallback
              if (header.fullStyle && !header.styleIsTailwind) {
                // Parse CSS properties from fullStyle (basic implementation)
                const styles: Record<string, string> = {}
                if (header.fullStyle.includes('background')) {
                  // Simple regex to extract background-color or background
                  const bgMatch = header.fullStyle.match(
                    /background(?:-color)?:\s*([^;]+)/i
                  )
                  if (bgMatch && bgMatch[1]) {
                    styles['background-color'] = bgMatch[1].trim()
                  }
                }
                return styles
              }

              // Backward compatibility: headerBackground CSS approach
              if (!header.backgroundIsTailwind && header.background) {
                return { 'background-color': header.background || '#000' }
              }

              return {}
            })()}
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
              onTerminalMounted={setTerminalActions}
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
