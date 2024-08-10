// /client/src/js/state.js

/**
 * @module state
 * @description Manages shared state for the WebSSH2 client
 */

import createDebug from 'debug'

const debug = createDebug('webssh2-client:state')

let state = {
  reconnectAttempts: 0,
  isConnecting: false,
  allowReauth: false,
  allowReplay: false
  // Add any other state properties you need here
}

const stateManager = {
  getReconnectAttempts: () => state.reconnectAttempts,
  setReconnectAttempts: (value) => {
    state.reconnectAttempts = value
    debug(`reconnectAttempts set to: ${value}`)
  },

  getIsConnecting: () => state.isConnecting,
  setIsConnecting: (value) => {
    state.isConnecting = value
    debug(`isConnecting set to: ${value}`)
  },

  getAllowReauth: () => state.allowReauth,
  setAllowReauth: (value) => {
    state.allowReauth = value
    debug(`allowReauth set to: ${value}`)
  },

  getAllowReplay: () => state.allowReplay,
  setAllowReplay: (value) => {
    state.allowReplay = value
    debug(`allowReplay set to: ${value}`)
  },

  // Add a method to reset the state
  resetState: () => {
    state = {
      reconnectAttempts: 0,
      isConnecting: false,
      allowReauth: false
      // Reset any other state properties here
    }
    debug('State reset to initial values')
  },

  // Add a method to get the entire state (for debugging purposes)
  getEntireState: () => {
    return { ...state }
  }
}

export default stateManager
