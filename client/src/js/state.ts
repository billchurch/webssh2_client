// client
// client/src/js/state.ts

import createDebug from 'debug'

const debug = createDebug('webssh2-client:state')

export interface State {
  allowReauth: boolean
  allowReconnect: boolean
  allowReplay: boolean
  isBasicAuthCookiePresent: boolean
  isConnecting: boolean
  loggedData: boolean
  reauthRequired: boolean
  sessionLogEnable: boolean
  term: string | null
}

const initialState: State = {
  allowReauth: false,
  allowReconnect: false,
  allowReplay: false,
  isBasicAuthCookiePresent: false,
  isConnecting: false,
  loggedData: false,
  reauthRequired: false,
  sessionLogEnable: false,
  term: null
}

export const state: State = { ...initialState }

type BooleanKeys = {
  [K in keyof State]: State[K] extends boolean ? K : never
}[keyof State]

export function toggleState(key: BooleanKeys): boolean {
  state[key] = !state[key]
  debug('toggleState', { [key]: state[key] })
  return state[key]
}

