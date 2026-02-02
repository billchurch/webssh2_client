export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export type SSHAuthMethod = 'password' | 'keyboard-interactive' | 'publickey'

export interface KeyboardCaptureSettings {
  captureEscape: boolean
  captureCtrlB: boolean
  customCaptureKeys: string[]
}

export interface PromptSoundSettings {
  enabled: boolean
  severities: {
    info: boolean
    warning: boolean
    error: boolean
    success: boolean
  }
}

export interface TerminalSettings {
  cursorBlink: boolean
  scrollback: number
  tabStopWidth: number
  bellStyle: 'sound' | 'none'
  fontSize: number
  fontFamily: string
  letterSpacing: number
  lineHeight: number
  logLevel: LogLevel
  clipboardAutoSelectToCopy: boolean
  clipboardEnableMiddleClickPaste: boolean
  clipboardEnableKeyboardShortcuts: boolean
  keyboardCapture: KeyboardCaptureSettings
  promptSounds: PromptSoundSettings
}

export interface WebSocketConfig {
  url: string | null
  path: string
}

export interface SSHConfigInput {
  host: string | null
  port: number
  username: string | null
  password: string | null
  sshterm: string
  privateKey?: string
  passphrase?: string
}

export interface HeaderConfig {
  text: string | null
  background: string
}

/**
 * Connection mode determines which fields are editable in the login modal.
 * - 'full': All fields (host, port, username, password) are editable
 * - 'host-locked': Host/port are fixed from URL, only credentials are editable
 */
export type ConnectionMode = 'full' | 'host-locked'

export interface WebSSH2Config {
  socket: WebSocketConfig
  ssh: SSHConfigInput
  allowedAuthMethods?: SSHAuthMethod[]
  terminal: TerminalSettings
  header: HeaderConfig
  autoConnect: boolean
  logLevel: LogLevel
  /** Connection mode: 'full' allows editing host/port, 'host-locked' restricts to credentials only */
  connectionMode?: ConnectionMode
  /** Host that cannot be changed (when connectionMode is 'host-locked') */
  lockedHost?: string
  /** Port that cannot be changed (when connectionMode is 'host-locked') */
  lockedPort?: number
}

declare global {
  interface Window {
    webssh2Config?: Partial<WebSSH2Config>
  }
}
