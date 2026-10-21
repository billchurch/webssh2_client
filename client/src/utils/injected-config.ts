// client/src/utils/injected-config.ts
// CSP-compatible runtime config reader.
//
// The webssh2 gateway injects runtime config into the served HTML. The
// CSP-compatible injection point is a JSON data block:
//
//   <script type="application/json" id="webssh2-config">{...}</script>
//
// which is inert (never executed), so it survives a strict
// `script-src 'self'` policy. It is the only supported injection point, so
// the client requires a gateway that writes it (webssh2 server >= 5.1.0).

import type { WebSSH2Config } from '../types/config.d'

const CONFIG_BLOCK_ID = 'webssh2-config'

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Read the gateway-injected runtime config from the
 * `<script type="application/json" id="webssh2-config">` data block.
 * Returns `undefined` when the block is absent, still holds its `null`
 * placeholder, or does not contain a JSON object.
 */
export function readInjectedConfig(): Partial<WebSSH2Config> | undefined {
  const element = document.getElementById(CONFIG_BLOCK_ID)
  if (element === null) {
    return undefined
  }
  if (element.getAttribute('type') !== 'application/json') {
    return undefined
  }
  const text = element.textContent
  if (text === null || text.trim() === '') {
    return undefined
  }
  try {
    const parsed: unknown = JSON.parse(text)
    if (isPlainObject(parsed)) {
      return parsed as Partial<WebSSH2Config>
    }
  } catch {
    console.warn('webssh2-config block contains invalid JSON; ignoring it')
  }
  return undefined
}
