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

export const CSP_CONFIG = {
  'default-src': ["'self'"],
  'script-src': ["'self'", "'unsafe-inline'"],  // unsafe-inline needed for xterm.js
  'style-src': ["'self'", "'unsafe-inline'"],   // unsafe-inline needed for terminal styling  
  'img-src': ["'self'", 'data:'],
  'font-src': ["'self'"],
  'connect-src': ["'self'", 'ws:', 'wss:'],    // WebSocket connections
  'frame-src': ["'none'"],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'upgrade-insecure-requests': []
}

/**
 * Generates CSP header string from config
 * @returns {string} The complete CSP header value
 */
export function generateCSPHeader() {
  return Object.entries(CSP_CONFIG)
    .map(([directive, values]) => {
      if (values.length === 0) {
        return directive
      }
      return `${directive} ${values.join(' ')}`
    })
    .join('; ')
}

/**
 * Security headers configuration
 * Additional security headers to prevent various attacks
 */
export const SECURITY_HEADERS = {
  'Content-Security-Policy': generateCSPHeader(),
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
}

/**
 * Express middleware to add security headers
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export function securityHeadersMiddleware(req, res, next) {
  Object.entries(SECURITY_HEADERS).forEach(([header, value]) => {
    res.setHeader(header, value)
  })
  next()
}

// For CommonJS compatibility
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    CSP_CONFIG,
    generateCSPHeader,
    SECURITY_HEADERS,
    securityHeadersMiddleware
  }
}