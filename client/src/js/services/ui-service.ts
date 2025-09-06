// UI Service for WebSSH2 Client - Replaces imperative DOM updates with reactive signals
import { setHeaderContent, setSessionFooter } from '../state-solid.js'
import {
  setConnectionStatus,
  setConnectionStatusColor
} from './socket-service.js'
import { sanitizeColor } from '../utils.js'
import type { ElementId } from '../../types/dom.d'
import createDebug from 'debug'

const debug = createDebug('webssh2-client:ui-service')

// Replace updateElement function with reactive signal updates
export const updateElement = (
  elementName: ElementId | string,
  content: string | { text: string; background?: string },
  color?: string
): void => {
  const { text, background } =
    typeof content === 'object'
      ? { text: content.text, background: content.background }
      : { text: content, background: color }

  const sanitizedColor = background ? sanitizeColor(background) : undefined

  debug('updateElement', { elementName, text, sanitizedColor })

  switch (elementName) {
    case 'status':
      // Use socket-service status signals
      setConnectionStatus(text)
      if (sanitizedColor) {
        setConnectionStatusColor(sanitizedColor)
      }
      break
    case 'header':
      setHeaderContent({
        text,
        ...(sanitizedColor && { background: sanitizedColor })
      })
      break
    case 'footer':
      // Footer is handled by sessionFooter in state-solid.ts
      setSessionFooter(text)
      break
    case 'errorMessage':
      // Handle error message element
      console.error('Error message:', text)
      break
    default:
      console.warn(`updateElement: Unknown element '${elementName}'`)
  }
}

export { sanitizeColor }
