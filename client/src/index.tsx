// SolidJS entry point for webssh2_client
import { render } from 'solid-js/web'
import createDebug from 'debug'
import App from './app'

const debug = createDebug('webssh2-client:index')

debug('SolidJS entry point loading')

// Mount the SolidJS app
const appElement = document.createElement('div')
appElement.id = 'app'
appElement.className = 'h-screen w-full absolute inset-0'
document.body.appendChild(appElement)

debug('Mounting SolidJS app')
render(() => <App />, appElement)
debug('SolidJS app mounted')
