export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export type SSHAuthMethod = 'password' | 'keyboard-interactive' | 'publickey'

export interface KeyboardCaptureSettings {
  captureEscape: boolean
  captureCtrlB: boolean
  customCaptureKeys: string[]
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

export interface WebSSH2Config {
  socket: WebSocketConfig
  ssh: SSHConfigInput
  allowedAuthMethods?: SSHAuthMethod[]
  terminal: TerminalSettings
  header: HeaderConfig
  autoConnect: boolean
  logLevel: LogLevel
}

declare global {
  interface Window {
    webssh2Config?: Partial<WebSSH2Config>
  }
}
