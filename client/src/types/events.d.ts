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
  username?: string
  password?: string
  host?: string
  port?: number
  term?: string
  cols?: number
  rows?: number
  privateKey?: string
  passphrase?: string
}

export interface ClientTerminalPayload {
  cols: number
  rows: number
}

export interface ClientResizePayload {
  cols: number
  rows: number
}

export type ClientControlPayload = 'replayCredentials' | 'reauth'

// SFTP Types (imported from sftp.ts for event typing)
import type {
  SftpListRequest,
  SftpStatRequest,
  SftpMkdirRequest,
  SftpDeleteRequest,
  SftpUploadStartRequest,
  SftpUploadChunkRequest,
  SftpUploadCancelRequest,
  SftpDownloadStartRequest,
  SftpDownloadCancelRequest,
  SftpStatusResponse,
  SftpDirectoryResponse,
  SftpStatResponse,
  SftpOperationResponse,
  SftpUploadReadyResponse,
  SftpUploadAckResponse,
  SftpDownloadReadyResponse,
  SftpDownloadChunkResponse,
  SftpProgressResponse,
  SftpCompleteResponse,
  SftpErrorResponse
} from './sftp'

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
  // SFTP Events
  'sftp-status': (response: SftpStatusResponse) => void
  'sftp-directory': (response: SftpDirectoryResponse) => void
  'sftp-stat-result': (response: SftpStatResponse) => void
  'sftp-operation-result': (response: SftpOperationResponse) => void
  'sftp-upload-ready': (response: SftpUploadReadyResponse) => void
  'sftp-upload-ack': (response: SftpUploadAckResponse) => void
  'sftp-download-ready': (response: SftpDownloadReadyResponse) => void
  'sftp-download-chunk': (response: SftpDownloadChunkResponse) => void
  'sftp-progress': (response: SftpProgressResponse) => void
  'sftp-complete': (response: SftpCompleteResponse) => void
  'sftp-error': (response: SftpErrorResponse) => void
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
  // SFTP Events
  'sftp-list': (request: SftpListRequest) => void
  'sftp-stat': (request: SftpStatRequest) => void
  'sftp-mkdir': (request: SftpMkdirRequest) => void
  'sftp-delete': (request: SftpDeleteRequest) => void
  'sftp-upload-start': (request: SftpUploadStartRequest) => void
  'sftp-upload-chunk': (request: SftpUploadChunkRequest) => void
  'sftp-upload-cancel': (request: SftpUploadCancelRequest) => void
  'sftp-download-start': (request: SftpDownloadStartRequest) => void
  'sftp-download-cancel': (request: SftpDownloadCancelRequest) => void
}
