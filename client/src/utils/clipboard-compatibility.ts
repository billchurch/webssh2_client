export class ClipboardCompatibility {
  static isSupported(): boolean {
    return !!(
      navigator.clipboard &&
      navigator.clipboard.readText &&
      navigator.clipboard.writeText
    )
  }

  static isSecureContext(): boolean {
    return window.isSecureContext
  }

  static getWarnings(): string[] {
    const warnings: string[] = []

    if (!this.isSecureContext()) {
      warnings.push('Clipboard API requires HTTPS or localhost')
    }

    if (!this.isSupported()) {
      warnings.push('Browser does not fully support Clipboard API')
    }

    const userAgent = navigator.userAgent.toLowerCase()

    if (userAgent.includes('firefox')) {
      warnings.push(
        'Firefox: May require clipboard permissions in about:config'
      )
    }

    if (userAgent.includes('safari') && !userAgent.includes('chrome')) {
      warnings.push(
        'Safari: Limited clipboard support, some features may not work'
      )
    }

    return warnings
  }

  static async requestPermission(): Promise<boolean> {
    try {
      await navigator.clipboard.readText()
      return true
    } catch (err) {
      console.warn('Clipboard permission denied or not available:', err)
      return false
    }
  }

  static getBrowserInfo(): {
    name: string
    supportsMiddleClick: boolean
    clipboardShortcut: string
  } {
    const userAgent = navigator.userAgent.toLowerCase()
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0

    let name = 'Unknown'
    let supportsMiddleClick = true

    if (userAgent.includes('firefox')) {
      name = 'Firefox'
    } else if (userAgent.includes('safari') && !userAgent.includes('chrome')) {
      name = 'Safari'
      supportsMiddleClick = false
    } else if (userAgent.includes('chrome')) {
      name = 'Chrome'
    } else if (userAgent.includes('edge')) {
      name = 'Edge'
    }

    const clipboardShortcut = isMac ? 'Cmd+Shift+C/V' : 'Ctrl+Shift+C/V'

    return { name, supportsMiddleClick, clipboardShortcut }
  }
}
