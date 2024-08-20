// client
// client/src/js/state.js

import createDebug from 'debug';

const debug = createDebug('webssh2-client:state');

const initialState = {
  allowReauth: false,
  allowReconnect: false,
  allowReplay: false,
  isBasicAuthCookiePresent: false,
  isConnecting: false,
  loggedData: false,
  reauthRequired: false,
  sessionLogEnable: false,
  term: null
};

export const state = { ...initialState };

export function toggleState(key) {
  if (typeof state[key] === 'boolean') {
    state[key] = !state[key];
    debug('toggleState', { [key]: state[key] });
    return state[key];
  }
  throw new Error(`Cannot toggle non-boolean state: ${key}`);
}
