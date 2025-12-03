/**
 * File Chunker Utility
 *
 * Provides memory-efficient file chunking for upload operations.
 * Uses File.slice() to avoid loading entire files into memory.
 *
 * @module utils/file-chunker
 */

import createDebug from 'debug'

const debug = createDebug('webssh2-client:file-chunker')

/**
 * Default chunk size (32KB) - matches server default
 */
export const DEFAULT_CHUNK_SIZE = 32768

/**
 * Chunk data with metadata
 */
export interface FileChunk {
  /** 0-based chunk index */
  readonly index: number
  /** Base64 encoded chunk data */
  readonly data: string
  /** Whether this is the last chunk */
  readonly isLast: boolean
  /** Original byte offset in file */
  readonly byteOffset: number
  /** Size of this chunk in bytes */
  readonly byteLength: number
}

/**
 * Convert ArrayBuffer to base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCodePoint(bytes[i]!)
  }
  return btoa(binary)
}

/**
 * Async generator that yields file chunks
 *
 * @param file - File to chunk
 * @param chunkSize - Size of each chunk in bytes (default: 32KB)
 * @yields FileChunk objects with base64-encoded data
 *
 * @example
 * ```typescript
 * const file = new File(['hello world'], 'test.txt')
 * for await (const chunk of chunkFile(file, 1024)) {
 *   console.log(`Chunk ${chunk.index}: ${chunk.byteLength} bytes`)
 *   socket.emit('sftp-upload-chunk', {
 *     transferId,
 *     chunkIndex: chunk.index,
 *     data: chunk.data,
 *     isLast: chunk.isLast
 *   })
 * }
 * ```
 */
export async function* chunkFile(
  file: File,
  chunkSize: number = DEFAULT_CHUNK_SIZE
): AsyncGenerator<FileChunk, void, unknown> {
  const totalChunks = Math.ceil(file.size / chunkSize)
  debug(
    `Chunking file: ${file.name}, size: ${file.size}, chunks: ${totalChunks}`
  )

  let offset = 0
  let chunkIndex = 0

  while (offset < file.size) {
    const end = Math.min(offset + chunkSize, file.size)
    const blob = file.slice(offset, end)
    // eslint-disable-next-line no-await-in-loop
    const buffer = await blob.arrayBuffer()
    const base64Data = arrayBufferToBase64(buffer)

    const chunk: FileChunk = {
      index: chunkIndex,
      data: base64Data,
      isLast: end >= file.size,
      byteOffset: offset,
      byteLength: buffer.byteLength
    }

    debug(
      `Yielding chunk ${chunkIndex}/${totalChunks - 1}, bytes: ${offset}-${end}`
    )
    yield chunk

    offset = end
    chunkIndex++
  }

  debug(`File chunking complete: ${chunkIndex} chunks`)
}

/**
 * Calculate the number of chunks for a file
 *
 * @param fileSize - Size of file in bytes
 * @param chunkSize - Size of each chunk in bytes
 * @returns Number of chunks
 */
export function calculateChunkCount(
  fileSize: number,
  chunkSize: number = DEFAULT_CHUNK_SIZE
): number {
  return Math.ceil(fileSize / chunkSize)
}

/**
 * Read a single chunk from a file (for retry scenarios)
 *
 * @param file - File to read from
 * @param chunkIndex - 0-based chunk index
 * @param chunkSize - Size of each chunk in bytes
 * @returns FileChunk or null if index is out of bounds
 */
export async function readChunk(
  file: File,
  chunkIndex: number,
  chunkSize: number = DEFAULT_CHUNK_SIZE
): Promise<FileChunk | null> {
  const offset = chunkIndex * chunkSize

  if (offset >= file.size) {
    debug(`Chunk index ${chunkIndex} out of bounds for file size ${file.size}`)
    return null
  }

  const end = Math.min(offset + chunkSize, file.size)
  const blob = file.slice(offset, end)
  const buffer = await blob.arrayBuffer()
  const base64Data = arrayBufferToBase64(buffer)

  return {
    index: chunkIndex,
    data: base64Data,
    isLast: end >= file.size,
    byteOffset: offset,
    byteLength: buffer.byteLength
  }
}

/**
 * Create a chunker instance for a file with state tracking
 * Useful for pause/resume scenarios
 */
export class FileChunker {
  private readonly file: File

  private readonly chunkSize: number

  private readonly totalChunks: number

  private currentChunkIndex: number = 0

  private _isPaused: boolean = false

  private _isCancelled: boolean = false

  constructor(file: File, chunkSize: number = DEFAULT_CHUNK_SIZE) {
    this.file = file
    this.chunkSize = chunkSize
    this.totalChunks = calculateChunkCount(file.size, chunkSize)
    debug(`FileChunker created: ${file.name}, ${this.totalChunks} chunks`)
  }

  /** File being chunked */
  get fileName(): string {
    return this.file.name
  }

  /** File size in bytes */
  get fileSize(): number {
    return this.file.size
  }

  /** Total number of chunks */
  get chunkCount(): number {
    return this.totalChunks
  }

  /** Current chunk index (next to be read) */
  get currentIndex(): number {
    return this.currentChunkIndex
  }

  /** Whether chunking is paused */
  get isPaused(): boolean {
    return this._isPaused
  }

  /** Whether chunking is cancelled */
  get isCancelled(): boolean {
    return this._isCancelled
  }

  /** Whether all chunks have been read */
  get isComplete(): boolean {
    return this.currentChunkIndex >= this.totalChunks
  }

  /** Progress as percentage (0-100) */
  get progress(): number {
    if (this.totalChunks === 0) return 100
    return Math.round((this.currentChunkIndex / this.totalChunks) * 100)
  }

  /** Bytes read so far */
  get bytesRead(): number {
    return Math.min(this.currentChunkIndex * this.chunkSize, this.file.size)
  }

  /**
   * Read the next chunk
   * @returns FileChunk or null if complete, paused, or cancelled
   */
  async nextChunk(): Promise<FileChunk | null> {
    if (this._isPaused || this._isCancelled || this.isComplete) {
      return null
    }

    const chunk = await readChunk(
      this.file,
      this.currentChunkIndex,
      this.chunkSize
    )
    if (chunk) {
      this.currentChunkIndex++
    }
    return chunk
  }

  /**
   * Re-read a specific chunk (for retry scenarios)
   */
  async getChunk(index: number): Promise<FileChunk | null> {
    return readChunk(this.file, index, this.chunkSize)
  }

  /** Pause chunking */
  pause(): void {
    this._isPaused = true
    debug(`FileChunker paused at chunk ${this.currentChunkIndex}`)
  }

  /** Resume chunking */
  resume(): void {
    this._isPaused = false
    debug(`FileChunker resumed at chunk ${this.currentChunkIndex}`)
  }

  /** Cancel chunking */
  cancel(): void {
    this._isCancelled = true
    debug(`FileChunker cancelled at chunk ${this.currentChunkIndex}`)
  }

  /** Reset to beginning */
  reset(): void {
    this.currentChunkIndex = 0
    this._isPaused = false
    this._isCancelled = false
    debug('FileChunker reset')
  }
}
