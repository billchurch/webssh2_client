// SolidJS entry point for webssh2_client
import { render } from 'solid-js/web'
import createDebug from 'debug'
import App from './App'

const debug = createDebug('webssh2-client:index')

debug('SolidJS entry point loading')

// Mount the SolidJS app
const appElement = document.createElement('div')
appElement.id = 'app'
appElement.style.cssText =
  'height: 100vh; width: 100%; position: absolute; top: 0; left: 0;'
document.body.appendChild(appElement)

debug('Mounting SolidJS app')
render(() => <App />, appElement)
debug('SolidJS app mounted')
