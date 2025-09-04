export interface AuthenticationRequest {
  action:
    | 'request_auth'
    | 'auth_result'
    | 'keyboard-interactive'
    | 'reauth'
    | 'dimensions'
  success?: boolean
  message?: string
  prompts?: Array<{ prompt: string; echo: boolean }>
}

export interface PermissionsPayload {
  autoLog: boolean
  allowReplay: boolean
  allowReconnect: boolean
  allowReauth: boolean
}

// Client → Server
export interface ClientAuthenticatePayload {
  username: string
  password: string
  host: string
  port: number
  term?: string
  cols?: number
  rows?: number
  privateKey?: string
  passphrase?: string
}

export interface ClientTerminalPayload {
  term: string
  cols: number
  rows: number
}

export interface ClientResizePayload {
  cols: number
  rows: number
}

export type ClientControlPayload = 'replayCredentials' | 'reauth'

// Server → Client Socket.IO event maps (can be used with socket.io-client generics)
export interface ServerToClientEvents {
  authentication: (payload: AuthenticationRequest) => void
  permissions: (payload: PermissionsPayload) => void
  getTerminal: () => void
  data: (chunk: string) => void
  ssherror: (message: string) => void
  updateUI: (payload: {
    element: string
    value: string | { text: string; background?: string }
  }) => void
}

export interface ClientToServerEvents {
  authenticate: (payload: ClientAuthenticatePayload) => void
  terminal: (payload: ClientTerminalPayload) => void
  data: (chunk: string) => void
  resize: (payload: ClientResizePayload) => void
  control: (payload: ClientControlPayload) => void
  authentication: (payload: {
    action: 'keyboard-interactive'
    responses: string[]
  }) => void
}
