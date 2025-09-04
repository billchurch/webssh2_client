export type ElementId =
  | 'backdrop'
  | 'clearLogBtn'
  | 'closeterminalSettingsBtn'
  | 'downloadLogBtn'
  | 'dropupContent'
  | 'errorDialog'
  | 'errorMessage'
  | 'footer'
  | 'header'
  | 'hostInput'
  | 'loginDialog'
  | 'loginForm'
  | 'passwordInput'
  | 'portInput'
  | 'privateKeyFile'
  | 'privateKeyText'
  | 'privateKeySection'
  | 'passphraseInput'
  | 'promptDialog'
  | 'promptMessage'
  | 'reauthBtn'
  | 'reconnectButton'
  | 'replayCredentialsBtn'
  | 'startLogBtn'
  | 'status'
  | 'stopLogBtn'
  | 'terminalContainer'
  | 'terminalSettingsBtn'
  | 'terminalSettingsDialog'
  | 'terminalSettingsForm'
  | 'usernameInput'
  | 'loginSettingsBtn'

export interface UpdateElementContentObject {
  text: string
  background?: string
}

export type UpdateElementContent = string | UpdateElementContentObject

