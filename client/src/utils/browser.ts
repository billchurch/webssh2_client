// Browser utility functions
import createDebug from 'debug'

const debug = createDebug('webssh2-client:browser-utils')

/**
 * Triggers a download of a blob with the given filename
 */
export function triggerDownload(blob: Blob, filename: string): void {
  debug(`triggerDownload: ${filename}`)
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(link.href)
}

/**
 * Get terminal dimensions that fit the current viewport
 */
export function getViewportTerminalDimensions(): {
  cols: number
  rows: number
} | null {
  // This would calculate optimal terminal dimensions based on viewport
  // For now, return null to indicate calculation is needed elsewhere
  debug('getViewportTerminalDimensions: calculation needed')
  return null
}

// Enhanced download function for string content
export function downloadText(filename: string, content: string): void {
  debug(`Downloading text file: ${filename}`)
  const blob = new Blob([content], { type: 'text/plain' })
  triggerDownload(blob, filename)
}
