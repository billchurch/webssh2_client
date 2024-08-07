// /client/src/js/state.js

/**
 * @module state
 * @description Manages shared state for the WebSSH2 client
 */

let reconnectAttempts = 0;
let isConnecting = false;

const state = {
  getReconnectAttempts: () => reconnectAttempts,
  setReconnectAttempts: (value) => { reconnectAttempts = value; },
  getIsConnecting: () => isConnecting,
  setIsConnecting: (value) => { isConnecting = value; },
};

export default state;