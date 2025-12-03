/**
 * Download Assembler Utility
 *
 * Assembles received chunks into a Blob and triggers browser download.
 * Handles base64 decoding and chunk ordering.
 *
 * @module utils/download-assembler
 */

import createDebug from 'debug'

const debug = createDebug('webssh2-client:download-assembler')

/**
 * Received chunk data
 */
export interface ReceivedChunk {
  /** 0-based chunk index */
  readonly index: number
  /** Base64 encoded data */
  readonly data: string
  /** Whether this is the final chunk */
  readonly isLast: boolean
}

/**
 * Download assembler state
 */
export interface DownloadState {
  /** Transfer ID */
  readonly transferId: string
  /** File name for download */
  readonly fileName: string
  /** Expected total size in bytes */
  readonly expectedSize: number
  /** MIME type for the file */
  readonly mimeType: string
  /** Bytes received so far */
  bytesReceived: number
  /** Whether download is complete */
  isComplete: boolean
  /** Whether download was cancelled */
  isCancelled: boolean
}

/**
 * Convert base64 string to Uint8Array
 */
function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.codePointAt(i) ?? 0
  }
  return bytes
}

/**
 * Download Assembler class
 *
 * Collects chunks and assembles them into a downloadable file.
 *
 * @example
 * ```typescript
 * const assembler = new DownloadAssembler('transfer-123', 'file.txt', 1024, 'text/plain')
 *
 * socket.on('sftp-download-chunk', (response) => {
 *   if (response.transferId === assembler.transferId) {
 *     assembler.addChunk(response)
 *     if (response.isLast) {
 *       assembler.download()
 *     }
 *   }
 * })
 * ```
 */
export class DownloadAssembler {
  private readonly chunks: Map<number, Uint8Array> = new Map()

  private readonly state: DownloadState

  private nextExpectedIndex: number = 0

  constructor(
    transferId: string,
    fileName: string,
    expectedSize: number,
    mimeType: string = 'application/octet-stream'
  ) {
    this.state = {
      transferId,
      fileName,
      expectedSize,
      mimeType,
      bytesReceived: 0,
      isComplete: false,
      isCancelled: false
    }
    debug(
      `DownloadAssembler created: ${fileName}, expected size: ${expectedSize}`
    )
  }

  /** Transfer ID */
  get transferId(): string {
    return this.state.transferId
  }

  /** File name */
  get fileName(): string {
    return this.state.fileName
  }

  /** Expected total size */
  get expectedSize(): number {
    return this.state.expectedSize
  }

  /** MIME type */
  get mimeType(): string {
    return this.state.mimeType
  }

  /** Bytes received so far */
  get bytesReceived(): number {
    return this.state.bytesReceived
  }

  /** Progress as percentage (0-100) */
  get progress(): number {
    if (this.state.expectedSize === 0) return 100
    return Math.round(
      (this.state.bytesReceived / this.state.expectedSize) * 100
    )
  }

  /** Whether download is complete */
  get isComplete(): boolean {
    return this.state.isComplete
  }

  /** Whether download was cancelled */
  get isCancelled(): boolean {
    return this.state.isCancelled
  }

  /** Number of chunks received */
  get chunkCount(): number {
    return this.chunks.size
  }

  /**
   * Add a received chunk
   *
   * @param chunk - Received chunk data
   * @returns true if chunk was added, false if duplicate or cancelled
   */
  addChunk(chunk: ReceivedChunk): boolean {
    if (this.state.isCancelled) {
      debug(`Ignoring chunk ${chunk.index}: download cancelled`)
      return false
    }

    if (this.chunks.has(chunk.index)) {
      debug(`Ignoring duplicate chunk ${chunk.index}`)
      return false
    }

    const data = base64ToUint8Array(chunk.data)
    this.chunks.set(chunk.index, data)
    this.state.bytesReceived += data.byteLength

    debug(
      `Added chunk ${chunk.index}: ${data.byteLength} bytes, total: ${this.state.bytesReceived}/${this.state.expectedSize}`
    )

    if (chunk.isLast) {
      this.state.isComplete = true
      debug('Download complete, all chunks received')
    }

    // Track expected index for progress reporting
    if (chunk.index === this.nextExpectedIndex) {
      this.nextExpectedIndex++
      // Also advance for any out-of-order chunks we already have
      while (this.chunks.has(this.nextExpectedIndex)) {
        this.nextExpectedIndex++
      }
    }

    return true
  }

  /**
   * Check if we're missing any chunks (for gap detection)
   */
  getMissingChunks(): number[] {
    const missing: number[] = []
    for (let i = 0; i < this.nextExpectedIndex; i++) {
      if (!this.chunks.has(i)) {
        missing.push(i)
      }
    }
    return missing
  }

  /**
   * Assemble all chunks into a Blob
   *
   * @returns Blob containing the complete file data
   * @throws Error if chunks are missing or out of order
   */
  assemble(): Blob {
    if (!this.state.isComplete) {
      throw new Error('Cannot assemble incomplete download')
    }

    // Sort chunks by index and concatenate
    const sortedIndices = Array.from(this.chunks.keys()).sort((a, b) => a - b)
    const parts: BlobPart[] = []

    for (let i = 0; i < sortedIndices.length; i++) {
      if (sortedIndices[i] !== i) {
        throw new Error(`Missing chunk at index ${i}`)
      }
      const chunk = this.chunks.get(i)!
      // Create a new Uint8Array to ensure we have a proper ArrayBuffer
      const copy = new Uint8Array(chunk.length)
      copy.set(chunk)
      parts.push(copy)
    }

    debug(`Assembling ${parts.length} chunks into Blob`)
    return new Blob(parts, { type: this.state.mimeType })
  }

  /**
   * Trigger browser download of the assembled file
   *
   * Creates an object URL and clicks a temporary anchor element.
   */
  download(): void {
    const blob = this.assemble()
    const url = URL.createObjectURL(blob)

    debug(`Triggering download: ${this.state.fileName}, size: ${blob.size}`)

    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = this.state.fileName
    anchor.style.display = 'none'
    document.body.appendChild(anchor)
    anchor.click()

    // Clean up
    setTimeout(() => {
      anchor.remove()
      URL.revokeObjectURL(url)
      debug('Download triggered, cleanup complete')
    }, 100)
  }

  /**
   * Get the assembled Blob without triggering download
   * Useful for preview or further processing
   */
  getBlob(): Blob {
    return this.assemble()
  }

  /**
   * Get an object URL for the assembled file
   * Caller is responsible for revoking the URL when done
   */
  getObjectUrl(): string {
    const blob = this.assemble()
    return URL.createObjectURL(blob)
  }

  /**
   * Cancel the download and clear all chunks
   */
  cancel(): void {
    this.state.isCancelled = true
    this.chunks.clear()
    debug('Download cancelled, chunks cleared')
  }

  /**
   * Reset the assembler for reuse
   */
  reset(): void {
    this.chunks.clear()
    this.nextExpectedIndex = 0
    this.state.bytesReceived = 0
    this.state.isComplete = false
    this.state.isCancelled = false
    debug('DownloadAssembler reset')
  }
}

/**
 * Create a download assembler from server response
 */
export function createDownloadAssembler(
  transferId: string,
  fileName: string,
  fileSize: number,
  mimeType?: string
): DownloadAssembler {
  return new DownloadAssembler(
    transferId,
    fileName,
    fileSize,
    mimeType || 'application/octet-stream'
  )
}

/**
 * Trigger a direct download of a Blob
 * Utility function for simple download scenarios
 */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.style.display = 'none'
  document.body.appendChild(anchor)
  anchor.click()

  setTimeout(() => {
    anchor.remove()
    URL.revokeObjectURL(url)
  }, 100)
}

/**
 * Download a text string as a file
 */
export function downloadText(
  content: string,
  fileName: string,
  mimeType: string = 'text/plain'
): void {
  const blob = new Blob([content], { type: mimeType })
  downloadBlob(blob, fileName)
}
