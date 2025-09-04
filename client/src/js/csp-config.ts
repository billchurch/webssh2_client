/**
 * Content Security Policy Configuration
 * Helps prevent XSS attacks by restricting resource loading
 *
 * Note: 'unsafe-inline' is required for:
 * - xterm.js terminal rendering
 * - Dynamic terminal styling
 *
 * These CSP headers should be set by the server serving the client
 */

export const CSP_CONFIG: Record<string, string[]> = {
  'default-src': ["'self'"],
  // Only allow same-origin scripts; no inline scripts
  'script-src': ["'self'"],
  'style-src': ["'self'", "'unsafe-inline'"], // unsafe-inline needed for terminal styling
  'img-src': ["'self'", 'data:'],
  'font-src': ["'self'"],
  'connect-src': ["'self'", 'ws:', 'wss:'], // WebSocket connections
  'frame-src': ["'none'"],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'upgrade-insecure-requests': []
}

/**
 * Generates CSP header string from config
 */
export function generateCSPHeader(): string {
  return Object.entries(CSP_CONFIG)
    .map(([directive, values]) => {
      if (values.length === 0) return directive
      return `${directive} ${values.join(' ')}`
    })
    .join('; ')
}

/**
 * Security headers configuration
 * Additional security headers to prevent various attacks
 */
export const SECURITY_HEADERS: Record<string, string> = {
  'Content-Security-Policy': generateCSPHeader(),
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
}

/**
 * Express-style middleware to add security headers
 */
export function securityHeadersMiddleware(
  _req: unknown,
  res: { setHeader: (name: string, value: string) => void },
  next: () => void
): void {
  Object.entries(SECURITY_HEADERS).forEach(([header, value]) => {
    res.setHeader(header, value)
  })
  next()
}
