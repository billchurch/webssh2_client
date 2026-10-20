// client
// client/src/js/utils.ts
import type { TerminalSettings } from '../types/config.d'

export const defaultSettings: TerminalSettings = {
  cursorBlink: true,
  scrollback: 10000,
  tabStopWidth: 8,
  bellStyle: 'sound',
  fontSize: 14,
  fontFamily: 'courier-new, courier, monospace',
  letterSpacing: 0,
  lineHeight: 1,
  logLevel: 'info',
  clipboardAutoSelectToCopy: true,
  clipboardEnableMiddleClickPaste: true,
  clipboardEnableKeyboardShortcuts: true,
  keyboardCapture: {
    captureEscape: false,
    captureCtrlB: false,
    customCaptureKeys: []
  },
  shiftEnterNewline: false,
  promptSounds: {
    enabled: false,
    severities: {
      info: true,
      warning: true,
      error: true,
      success: true
    }
  },
  themeName: 'Default',
  customTheme: null
}

export function validateNumber(
  value: number | string,
  min: number,
  max: number,
  defaultValue: number
): number {
  const num = typeof value === 'number' ? value : Number(value)
  if (Number.isNaN(num) || num < min || num > max) {
    return defaultValue
  }
  return num
}

export function isObject(item: unknown): item is Record<string, unknown> {
  return item !== null && typeof item === 'object' && !Array.isArray(item)
}

export function mergeDeep<T, U extends Record<string, unknown>>(
  target: T,
  source: U
): T & U {
  const output: Record<string, unknown> = {
    ...(target as unknown as Record<string, unknown>)
  }
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach((key) => {
      const sVal = (source as Record<string, unknown>)[key]
      const tVal = (target as unknown as Record<string, unknown>)[key]
      if (isObject(sVal)) {
        if (!(key in (target as Record<string, unknown>))) {
          output[key] = sVal
        } else {
          output[key] = mergeDeep(
            isObject(tVal) ? (tVal as Record<string, unknown>) : {},
            sVal as Record<string, unknown>
          )
        }
      } else {
        output[key] = sVal
      }
    })
  }
  return output as T & U
}

export function formatDate(date: Date): string {
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')} @ ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`
}

export function validateBellStyle(
  value: string,
  defaultValue: 'sound' | 'none' = 'sound'
): 'sound' | 'none' {
  return ['sound', 'none'].includes(value)
    ? (value as 'sound' | 'none')
    : defaultValue
}

export function sanitizeColor(color: string): string | null {
  const colorRegex =
    /^(#([0-9a-fA-F]{3}){1,2}|rgba?\(\s*(\d{1,3}\s*,\s*){2,3}\s*\d{1,3}\s*\)|[a-zA-Z]+)$/
  return colorRegex.test(color) ? color : null
}

export function clearBasicAuthCookie(): void {
  document.cookie = 'basicauth=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/'
}

export function getBasicAuthCookie(): { host?: string; port?: number } | null {
  const cookies = document.cookie.split(';')
  for (let i = 0; i < cookies.length; i++) {
    const cookie = cookies[i]!.trim()
    if (cookie.startsWith('basicauth=')) {
      try {
        const parsed = JSON.parse(
          decodeURIComponent(cookie.substring('basicauth='.length))
        ) as {
          host?: string
          port?: number
        }
        return parsed
      } catch (e) {
        console.error(
          'getBasicAuthCookie: Failed to parse basicauth cookie:',
          e
        )
        return null
      }
    }
  }
  return null
}

export function validatePrivateKey(key: string): boolean {
  // Be inclusive of common key formats used by OpenSSH and PKCS#1/PKCS#8
  // Accepts: OPENSSH PRIVATE KEY, RSA/EC/DSA PRIVATE KEY, and generic PRIVATE KEY
  const text = String(key || '').trim()
  if (!text.startsWith('-----BEGIN') || !text.includes('PRIVATE KEY-----'))
    return false

  const patterns: RegExp[] = [
    // OpenSSH format
    /^-----BEGIN OPENSSH PRIVATE KEY-----[\s\S]+-----END OPENSSH PRIVATE KEY-----\s*$/m,
    // PKCS#8 generic
    /^-----BEGIN PRIVATE KEY-----[\s\S]+-----END PRIVATE KEY-----\s*$/m,
    // PKCS#1 RSA
    /^-----BEGIN RSA PRIVATE KEY-----[\s\S]+-----END RSA PRIVATE KEY-----\s*$/m,
    // EC and DSA
    /^-----BEGIN EC PRIVATE KEY-----[\s\S]+-----END EC PRIVATE KEY-----\s*$/m,
    /^-----BEGIN DSA PRIVATE KEY-----[\s\S]+-----END DSA PRIVATE KEY-----\s*$/m
  ]
  return patterns.some((re) => re.test(text))
}

/**
 * Deep validation of private keys.
 * Phase 1: header/footer regex (handled by validatePrivateKey).
 * Phase 2: parse the block payload to ensure it is structurally valid.
 * - OPENSSH: base64 decodes to content starting with "openssh-key-v1\0"
 * - PKCS#1/8/EC/DSA: base64 decodes to DER starting with 0x30 (SEQUENCE)
 */
export function validatePrivateKeyDeep(
  key: string
): { format: 'OPENSSH' | 'PKCS8' | 'PKCS1-RSA' | 'EC' | 'DSA' } | null {
  const text = String(key || '').trim()
  // Identify block type and extract base64 body
  const blocks: Array<{ type: string; body: string }> = []
  const patterns: Array<{ type: string; re: RegExp }> = [
    {
      type: 'OPENSSH',
      re: /-----BEGIN OPENSSH PRIVATE KEY-----(?<body>[\s\S]+?)-----END OPENSSH PRIVATE KEY-----/m
    },
    {
      type: 'PKCS8',
      re: /-----BEGIN PRIVATE KEY-----(?<body>[\s\S]+?)-----END PRIVATE KEY-----/m
    },
    {
      type: 'PKCS1-RSA',
      re: /-----BEGIN RSA PRIVATE KEY-----(?<body>[\s\S]+?)-----END RSA PRIVATE KEY-----/m
    },
    {
      type: 'EC',
      re: /-----BEGIN EC PRIVATE KEY-----(?<body>[\s\S]+?)-----END EC PRIVATE KEY-----/m
    },
    {
      type: 'DSA',
      re: /-----BEGIN DSA PRIVATE KEY-----(?<body>[\s\S]+?)-----END DSA PRIVATE KEY-----/m
    }
  ]
  for (const { type, re } of patterns) {
    const m = text.match(re)
    const matchedBody = m?.groups?.['body']
    if (matchedBody != null && matchedBody !== '') {
      blocks.push({ type, body: matchedBody })
      break
    }
  }
  if (blocks.length === 0) return null

  const { type, body } = blocks[0]!
  const b64 = body.replace(/\s+/g, '')
  let bytes: Uint8Array
  try {
    if (typeof atob === 'function') {
      const bin = atob(b64)
      bytes = new Uint8Array(bin.length)
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    } else if (
      typeof globalThis !== 'undefined' &&
      (globalThis as Record<string, unknown>)['Buffer'] != null
    ) {
      const B = (
        globalThis as unknown as {
          Buffer: { from: (s: string, enc: string) => Uint8Array }
        }
      )['Buffer']
      const buf = B.from(b64, 'base64')
      bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
    } else {
      return null
    }
  } catch {
    return null
  }

  if (type === 'OPENSSH') {
    // OpenSSH keys start with magic: "openssh-key-v1\0"
    const magic = 'openssh-key-v1\0'
    const prefix = new TextDecoder().decode(bytes.slice(0, magic.length))
    if (prefix === magic) return { format: 'OPENSSH' }
    return null
  }

  // DER should start with SEQUENCE (0x30)
  if (bytes.length >= 2 && bytes[0] === 0x30) {
    // Optional: check the length field is plausible
    // This is a light check to avoid full ASN.1 parsing
    return { format: type as 'PKCS8' | 'PKCS1-RSA' | 'EC' | 'DSA' }
  }
  return null
}
