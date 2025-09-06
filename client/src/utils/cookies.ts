// client/src/js/utils/cookies.ts
import { createSignal } from 'solid-js'
import createDebug from 'debug'

const debug = createDebug('webssh2-client:cookies')

// Reactive cookie management
export const [basicAuthCookie, setBasicAuthCookie] = createSignal<
  string | null
>(null)

export function getBasicAuthCookie(): string | null {
  const cookies = document.cookie.split(';')
  for (let i = 0; i < cookies.length; i++) {
    let cookie = cookies[i]
    if (cookie) {
      while (cookie.charAt(0) === ' ') {
        cookie = cookie.substring(1)
      }
      if (cookie.indexOf('basicauth=') === 0) {
        const value = cookie.substring(10, cookie.length)
        setBasicAuthCookie(value)
        debug('Basic auth cookie found')
        return value
      }
    }
  }
  setBasicAuthCookie(null)
  debug('No basic auth cookie found')
  return null
}

export function clearBasicAuthCookie(): void {
  document.cookie = 'basicauth=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/'
  setBasicAuthCookie(null)
  debug('Basic auth cookie cleared')
}
