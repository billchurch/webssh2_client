// /client/src/js/state.js

/**
 * @module state
 * @description Manages shared state for the WebSSH2 client
 */

import createDebug from 'debug'

const debug = createDebug('webssh2-client:state')

let state = { // eslint-disable-line prefer-const
  reconnectAttempts: 0,
  isConnecting: false,
  allowReauth: false,
  allowReplay: false,
  reauthRequired: false,
  sessionLogEnable: false,
  loggedData: false
}

const stateManager = {
  getState: (key) => state[key],
  setState: (key, value) => {
    state[key] = value
    debug(`${key} set to: ${value}`)
  },
  toggleState: (key) => {
    state[key] = !state[key]
    debug(`${key} toggled to: ${state[key]}`)
    return state[key]
  },
  getEntireState: () => {
    return { ...state }
  }

}

export default stateManager
