// client/src/utils/transports.ts
// Resolver for the gateway-injected Socket.IO transport list (#131).
//
// The webssh2 gateway may inject `socket.transports` into the runtime
// config so deployments behind WebSocket-blocking proxies can force
// long-polling. The server validates the list before injecting; this
// filter is the client-side safety net (the target environment is, by
// definition, a meddling proxy).

const VALID_TRANSPORTS = new Set(['websocket', 'polling'])

export const DEFAULT_TRANSPORTS: readonly string[] = ['websocket', 'polling']

/**
 * Whitelist-filter an injected transport list.
 *
 * Returns the filtered, deduped list when at least one valid entry
 * survives; otherwise returns the websocket-first default. Never
 * returns an empty array (with `reconnection: false` an empty list
 * yields a socket that can never connect).
 */
export function resolveTransports(injected: unknown): string[] {
  if (!Array.isArray(injected)) {
    return [...DEFAULT_TRANSPORTS]
  }
  const filtered = injected.filter(
    (entry): entry is string =>
      typeof entry === 'string' && VALID_TRANSPORTS.has(entry)
  )
  const deduped = [...new Set(filtered)]
  return deduped.length > 0 ? deduped : [...DEFAULT_TRANSPORTS]
}
