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
  allowReconnect: false,
  allowReplay: false,
  reauthRequired: false,
  sessionLogEnable: false,
  loggedData: false,
  term: null
}

/**
 * Manages the state of the application.
 *
 * @typedef {Object} StateManager
 * @property {function(string): any} getState - Retrieves the value of a specific state key.
 * @property {function(string, any): void} setState - Sets the value of a specific state key.
 * @property {function(string): boolean} toggleState - Toggles the value of a specific state key.
 * @property {function(): Object} getEntireState - Retrieves the entire state object.
 */
const stateManager = {
  getState: (key) => state[key],
  setState: (key, value) => {
    state[key] = value
    debug(`stateManager ${key} set to: ${value}`)
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
