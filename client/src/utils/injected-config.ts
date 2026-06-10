// client/src/utils/injected-config.ts
// CSP-compatible runtime config reader.
//
// The webssh2 gateway injects runtime config into the served HTML. The
// CSP-compatible injection point is a JSON data block:
//
//   <script type="application/json" id="webssh2-config">{...}</script>
//
// which is inert (never executed), so it survives a strict
// `script-src 'self'` policy. Gateways that predate the data block still
// replace the legacy inline `window.webssh2Config = null;` script, so the
// reader falls back to the window global when the block is absent or
// still holds its `null` placeholder.

import type { WebSSH2Config } from '../types/config.d'

const CONFIG_BLOCK_ID = 'webssh2-config'

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readConfigBlock(): Partial<WebSSH2Config> | undefined {
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

/**
 * Read the gateway-injected runtime config.
 *
 * Prefers the `<script type="application/json" id="webssh2-config">` data
 * block; falls back to the legacy `window.webssh2Config` global. Returns
 * `undefined` when neither source provides a config object.
 */
export function readInjectedConfig(): Partial<WebSSH2Config> | undefined {
  const fromBlock = readConfigBlock()
  if (fromBlock !== undefined) {
    return fromBlock
  }
  const fromWindow: unknown = window.webssh2Config
  return isPlainObject(fromWindow)
    ? (fromWindow as Partial<WebSSH2Config>)
    : undefined
}
