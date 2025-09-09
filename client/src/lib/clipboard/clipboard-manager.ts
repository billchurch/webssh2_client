export interface ClipboardPermissionStatus {
  canRead: boolean
  canWrite: boolean
  isSecureContext: boolean
  warnings: string[]
}

export class ClipboardManager {
  // eslint-disable-next-line no-use-before-define
  private static instance: ClipboardManager | null = null

  private permissionCache: ClipboardPermissionStatus | null = null

  private constructor() {
    // Private constructor for singleton pattern
    this.permissionCache = null
  }

  static getInstance(): ClipboardManager {
    if (!ClipboardManager.instance) {
      ClipboardManager.instance = new ClipboardManager()
    }
    return ClipboardManager.instance
  }

  isSupported(): boolean {
    return !!(
      navigator.clipboard &&
      typeof navigator.clipboard.readText === 'function' &&
      typeof navigator.clipboard.writeText === 'function'
    )
  }

  isSecureContext(): boolean {
    return window.isSecureContext
  }

  async checkPermissions(): Promise<ClipboardPermissionStatus> {
    if (this.permissionCache) {
      return this.permissionCache
    }

    const status: ClipboardPermissionStatus = {
      canRead: false,
      canWrite: false,
      isSecureContext: this.isSecureContext(),
      warnings: []
    }

    if (!this.isSecureContext()) {
      status.warnings.push('Clipboard API requires HTTPS or localhost')
    }

    if (!this.isSupported()) {
      status.warnings.push('Browser does not fully support Clipboard API')
      this.permissionCache = status
      return status
    }

    try {
      const writePermission = await navigator.permissions.query({
        name: 'clipboard-write' as PermissionName
      })
      status.canWrite =
        writePermission.state === 'granted' ||
        writePermission.state === 'prompt'
    } catch {
      status.canWrite = true
    }

    try {
      const readPermission = await navigator.permissions.query({
        name: 'clipboard-read' as PermissionName
      })
      status.canRead =
        readPermission.state === 'granted' || readPermission.state === 'prompt'
    } catch {
      status.canRead = false
    }

    const userAgent = navigator.userAgent.toLowerCase()
    if (userAgent.includes('firefox')) {
      status.warnings.push(
        'Firefox may require clipboard permissions in about:config'
      )
    }
    if (userAgent.includes('safari') && !userAgent.includes('chrome')) {
      status.warnings.push('Safari may have limited clipboard support')
    }

    this.permissionCache = status
    return status
  }

  async writeText(text: string): Promise<boolean> {
    if (!this.isSupported()) {
      return this.fallbackCopy(text)
    }

    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch (error) {
      console.warn('Clipboard write failed, trying fallback:', error)
      return this.fallbackCopy(text)
    }
  }

  async readText(): Promise<string | null> {
    if (!this.isSupported()) {
      return null
    }

    try {
      const text = await navigator.clipboard.readText()
      return text
    } catch (error) {
      console.warn('Clipboard read failed:', error)
      return null
    }
  }

  private fallbackCopy(text: string): boolean {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.left = '-999999px'
    textarea.style.top = '-999999px'
    document.body.appendChild(textarea)

    try {
      textarea.select()
      const success = document.execCommand('copy')
      document.body.removeChild(textarea)
      return success
    } catch {
      document.body.removeChild(textarea)
      return false
    }
  }

  clearPermissionCache(): void {
    this.permissionCache = null
  }
}
