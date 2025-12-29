/**
 * SFTP Client Service
 *
 * Handles file transfer operations with chunking and progress tracking.
 * Provides a Promise-based API over Socket.IO events.
 *
 * @module services/sftp-service
 */

import { createSignal } from 'solid-js'
import createDebug from 'debug'

import { socket as getSocket } from './socket.js'
import { FileChunker, DEFAULT_CHUNK_SIZE } from '../utils/file-chunker.js'
import { createDownloadAssembler } from '../utils/download-assembler.js'
import type { DownloadAssembler } from '../utils/download-assembler.js'
import {
  type TransferId,
  type SftpFileEntry,
  type SftpListRequest,
  type SftpStatRequest,
  type SftpDeleteRequest,
  type SftpUploadChunkRequest,
  type SftpDirectoryResponse,
  type SftpStatResponse,
  type SftpOperationResponse,
  type SftpUploadReadyResponse,
  type SftpUploadAckResponse,
  type SftpDownloadReadyResponse,
  type SftpDownloadChunkResponse,
  type SftpProgressResponse,
  type SftpCompleteResponse,
  type SftpErrorResponse,
  type ClientTransfer,
  type UploadOptions,
  type DownloadOptions
} from '../types/sftp.js'

const debug = createDebug('webssh2-client:sftp-service')

interface PendingRequest<T> {
  resolve: (value: T) => void
  reject: (error: Error) => void
  timeoutId: ReturnType<typeof setTimeout>
}

// =============================================================================
// State
// =============================================================================

/** Whether SFTP is enabled (set by server permissions) */
export const [sftpEnabled, setSftpEnabled] = createSignal(true)

/** Active transfers map */
const activeTransfers = new Map<TransferId, ClientTransfer>()

/** Active file chunkers (for uploads) */
const activeChunkers = new Map<TransferId, FileChunker>()

/** Active download assemblers */
const activeAssemblers = new Map<TransferId, DownloadAssembler>()

/** Pending requests waiting for responses */
const pendingRequests = new Map<string, PendingRequest<unknown>>()

/** FIFO queue for pending upload-ready responses (server-generated transfer IDs) */
const pendingUploadReady: Array<PendingRequest<SftpUploadReadyResponse>> = []

/** FIFO queue for pending download-ready responses (server-generated transfer IDs) */
const pendingDownloadReady: Array<PendingRequest<SftpDownloadReadyResponse>> =
  []

/** Default request timeout (30 seconds) */
const REQUEST_TIMEOUT = 30000

// =============================================================================
// Event Listener Setup
// =============================================================================

let listenersInitialized = false

/**
 * Initialize SFTP socket event listeners
 * Should be called once when socket connects
 */
export function initializeSftpListeners(): void {
  const socketInstance = getSocket()
  if (!socketInstance || listenersInitialized) {
    debug('SFTP listeners already initialized or no socket')
    return
  }

  debug('Initializing SFTP socket listeners')

  // Directory listing response
  socketInstance.on(
    'sftp-directory' as never,
    (response: SftpDirectoryResponse) => {
      debug('sftp-directory received', response.path)
      // Try exact path match first, then fall back to prefix match
      // This handles ~ being resolved to /home/user by the server
      if (!resolvePendingRequest(`list:${response.path}`, response)) {
        resolvePendingByPrefix('list:', response)
      }
    }
  )

  // Stat response
  socketInstance.on(
    'sftp-stat-result' as never,
    (response: SftpStatResponse) => {
      debug('sftp-stat-result received', response.path)
      if (!resolvePendingRequest(`stat:${response.path}`, response)) {
        resolvePendingByPrefix('stat:', response)
      }
    }
  )

  // Operation result (mkdir, delete)
  socketInstance.on(
    'sftp-operation-result' as never,
    (response: SftpOperationResponse) => {
      debug('sftp-operation-result received', response.path, response.success)
      if (!resolvePendingRequest(`operation:${response.path}`, response)) {
        resolvePendingByPrefix('operation:', response)
      }
    }
  )

  // Upload ready - use FIFO queue (server generates transferId)
  socketInstance.on(
    'sftp-upload-ready' as never,
    (response: SftpUploadReadyResponse) => {
      debug(
        'sftp-upload-ready received',
        response.transferId,
        `chunkSize: ${response.chunkSize}`
      )
      const pending = pendingUploadReady.shift()
      if (pending) {
        clearTimeout(pending.timeoutId)
        pending.resolve(response)
      } else {
        debug('No pending upload-ready request for', response.transferId)
      }
    }
  )

  // Upload ack
  socketInstance.on(
    'sftp-upload-ack' as never,
    (response: SftpUploadAckResponse) => {
      debug(
        'sftp-upload-ack received',
        response.transferId,
        `chunk: ${response.chunkIndex}`
      )
      resolvePendingRequest(
        `upload-ack:${response.transferId}:${response.chunkIndex}`,
        response
      )
    }
  )

  // Download ready
  socketInstance.on(
    'sftp-download-ready' as never,
    (response: SftpDownloadReadyResponse) => {
      debug(
        'sftp-download-ready received',
        response.transferId,
        response.fileName
      )
      handleDownloadReady(response)
    }
  )

  // Download chunk
  socketInstance.on(
    'sftp-download-chunk' as never,
    (response: SftpDownloadChunkResponse) => {
      debug(
        'sftp-download-chunk received',
        response.transferId,
        `chunk: ${response.chunkIndex}`
      )
      handleDownloadChunk(response)
    }
  )

  // Progress updates
  socketInstance.on(
    'sftp-progress' as never,
    (response: SftpProgressResponse) => {
      debug(
        'sftp-progress received',
        response.transferId,
        `${response.percentComplete}%`
      )
      handleProgress(response)
    }
  )

  // Transfer complete
  socketInstance.on(
    'sftp-complete' as never,
    (response: SftpCompleteResponse) => {
      debug('sftp-complete received', response.transferId)
      handleComplete(response)
    }
  )

  // Error response
  socketInstance.on('sftp-error' as never, (response: SftpErrorResponse) => {
    debug('sftp-error received', response.code, response.message)
    handleError(response)
  })

  listenersInitialized = true
  debug('SFTP listeners initialized')
}

/**
 * Cleanup SFTP listeners (call on disconnect)
 */
export function cleanupSftpListeners(): void {
  const socketInstance = getSocket()
  if (socketInstance) {
    socketInstance.off('sftp-directory' as never)
    socketInstance.off('sftp-stat-result' as never)
    socketInstance.off('sftp-operation-result' as never)
    socketInstance.off('sftp-upload-ready' as never)
    socketInstance.off('sftp-upload-ack' as never)
    socketInstance.off('sftp-download-ready' as never)
    socketInstance.off('sftp-download-chunk' as never)
    socketInstance.off('sftp-progress' as never)
    socketInstance.off('sftp-complete' as never)
    socketInstance.off('sftp-error' as never)
  }

  // Clear pending requests
  for (const [, request] of pendingRequests) {
    clearTimeout(request.timeoutId)
    request.reject(new Error('SFTP service disconnected'))
  }
  pendingRequests.clear()

  // Clear FIFO queues for upload-ready/download-ready
  for (const pending of pendingUploadReady) {
    clearTimeout(pending.timeoutId)
    pending.reject(new Error('SFTP service disconnected'))
  }
  pendingUploadReady.length = 0

  for (const pending of pendingDownloadReady) {
    clearTimeout(pending.timeoutId)
    pending.reject(new Error('SFTP service disconnected'))
  }
  pendingDownloadReady.length = 0

  // Clear active transfers
  activeTransfers.clear()
  activeChunkers.clear()
  activeAssemblers.clear()

  listenersInitialized = false
  debug('SFTP listeners cleaned up')
}

// =============================================================================
// Request/Response Helpers
// =============================================================================

function createPendingRequest<T>(
  key: string,
  timeout: number = REQUEST_TIMEOUT
): Promise<T> {
  // If there's already a pending request with this key, clear its timeout
  // This can happen if the same directory is requested multiple times rapidly
  // (e.g., toggling hidden files while a request is in flight)
  const existing = pendingRequests.get(key)
  if (existing) {
    debug('Clearing existing pending request', key)
    clearTimeout(existing.timeoutId)
    pendingRequests.delete(key)
  }

  return new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      pendingRequests.delete(key)
      reject(new Error(`SFTP request timed out: ${key}`))
    }, timeout)

    pendingRequests.set(key, {
      resolve: resolve as (value: unknown) => void,
      reject,
      timeoutId
    })
  })
}

function resolvePendingRequest<T>(key: string, value: T): boolean {
  const pending = pendingRequests.get(key)
  if (pending) {
    clearTimeout(pending.timeoutId)
    pendingRequests.delete(key)
    pending.resolve(value)
    return true
  }
  return false
}

/**
 * Resolve the first pending request that starts with a given prefix
 * Used when server returns a resolved path (e.g., /home/bill) but client sent ~
 */
function resolvePendingByPrefix<T>(prefix: string, value: T): boolean {
  for (const [key, pending] of pendingRequests) {
    if (key.startsWith(prefix)) {
      debug('Resolving by prefix', prefix, 'matched', key)
      clearTimeout(pending.timeoutId)
      pendingRequests.delete(key)
      pending.resolve(value)
      return true
    }
  }
  return false
}

function rejectPendingRequest(key: string, error: Error): void {
  const pending = pendingRequests.get(key)
  if (pending) {
    clearTimeout(pending.timeoutId)
    pendingRequests.delete(key)
    pending.reject(error)
  }
}

// =============================================================================
// Event Handlers
// =============================================================================

function handleDownloadReady(response: SftpDownloadReadyResponse): void {
  // Use FIFO queue (server generates transferId)
  const pending = pendingDownloadReady.shift()
  if (pending) {
    clearTimeout(pending.timeoutId)
    pending.resolve(response)
  } else {
    debug('No pending download-ready request for', response.transferId)
  }

  // Create assembler for this download
  const assembler = createDownloadAssembler(
    response.transferId,
    response.fileName,
    response.fileSize,
    response.mimeType
  )
  activeAssemblers.set(response.transferId as TransferId, assembler)
}

function handleDownloadChunk(response: SftpDownloadChunkResponse): void {
  const assembler = activeAssemblers.get(response.transferId as TransferId)
  if (!assembler) {
    debug(`No assembler for download ${response.transferId}`)
    return
  }

  assembler.addChunk({
    index: response.chunkIndex,
    data: response.data,
    isLast: response.isLast
  })

  // Update transfer state
  const transfer = activeTransfers.get(response.transferId as TransferId)
  if (transfer) {
    transfer.bytesTransferred = assembler.bytesReceived
    transfer.percentComplete = assembler.progress
  }

  // If complete, trigger download and cleanup
  if (response.isLast) {
    try {
      assembler.download()
    } catch (err) {
      debug('Error triggering download', err)
    }
  }
}

function handleProgress(response: SftpProgressResponse): void {
  const transfer = activeTransfers.get(response.transferId as TransferId)
  if (transfer) {
    transfer.bytesTransferred = response.bytesTransferred
    transfer.percentComplete = response.percentComplete
    transfer.bytesPerSecond = response.bytesPerSecond
    transfer.estimatedSecondsRemaining = response.estimatedSecondsRemaining
    transfer.status = 'active'
  }

  // Notify progress callbacks
  const callback = progressCallbacks.get(response.transferId as TransferId)
  if (callback) {
    callback(response)
  }
}

function handleComplete(response: SftpCompleteResponse): void {
  const transfer = activeTransfers.get(response.transferId as TransferId)
  if (transfer) {
    transfer.status = 'completed'
    transfer.bytesTransferred = response.bytesTransferred
    transfer.percentComplete = 100
  }

  // Resolve any waiting promises
  resolvePendingRequest(`complete:${response.transferId}`, response)

  // Cleanup
  activeChunkers.delete(response.transferId as TransferId)
  activeAssemblers.delete(response.transferId as TransferId)
  progressCallbacks.delete(response.transferId as TransferId)
}

function handleError(response: SftpErrorResponse): void {
  debug(
    'SFTP error',
    response.code,
    response.message,
    response.operation,
    response.path
  )

  const error = new Error(response.message)

  // Update transfer status if applicable
  if (response.transferId) {
    const transfer = activeTransfers.get(response.transferId as TransferId)
    if (transfer) {
      transfer.status = 'failed'
      transfer.error = response.message
    }

    // Reject any pending promises for this transfer
    rejectAllForTransfer(response.transferId as TransferId, error)
  }

  // Reject operation-specific requests by path if provided
  let pathMatchFound = false
  if (response.path) {
    // Try to find and reject by exact path match
    const listKey = `list:${response.path}`
    const statKey = `stat:${response.path}`
    const opKey = `operation:${response.path}`

    if (pendingRequests.has(listKey)) {
      rejectPendingRequest(listKey, error)
      pathMatchFound = true
    }
    if (pendingRequests.has(statKey)) {
      rejectPendingRequest(statKey, error)
      pathMatchFound = true
    }
    if (pendingRequests.has(opKey)) {
      rejectPendingRequest(opKey, error)
      pathMatchFound = true
    }
  }

  // If no path match found (path mismatch between request/response, e.g., ~ vs /root/~)
  // or no path provided, use operation-based prefix matching
  if (!pathMatchFound && response.operation) {
    const prefix = getOperationPrefix(response.operation)
    if (prefix) {
      rejectPendingByPrefix(prefix, error)
    }
  }
}

/**
 * Map operation types to pending request key prefixes
 */
function getOperationPrefix(operation: string): string | null {
  switch (operation) {
    case 'list':
      return 'list:'
    case 'stat':
      return 'stat:'
    case 'mkdir':
    case 'delete':
      return 'operation:'
    case 'upload':
      return 'upload-'
    case 'download':
      return 'download-'
    default:
      return null
  }
}

/**
 * Reject all pending requests that start with a given prefix
 */
function rejectPendingByPrefix(prefix: string, error: Error): void {
  const keysToReject = Array.from(pendingRequests.keys()).filter((key) =>
    key.startsWith(prefix)
  )
  debug('Rejecting pending requests by prefix', prefix, keysToReject.length)
  for (const key of keysToReject) {
    rejectPendingRequest(key, error)
  }
}

function rejectAllForTransfer(transferId: TransferId, error: Error): void {
  const keysToReject = Array.from(pendingRequests.keys()).filter((key) =>
    key.includes(transferId)
  )
  for (const key of keysToReject) {
    rejectPendingRequest(key, error)
  }

  // Cleanup
  activeChunkers.delete(transferId)
  activeAssemblers.delete(transferId)
  progressCallbacks.delete(transferId)
}

// Progress callback storage
const progressCallbacks = new Map<
  TransferId,
  (progress: SftpProgressResponse) => void
>()

// =============================================================================
// Public API
// =============================================================================

/** Result of listing a directory, includes resolved path */
export interface ListDirectoryResult {
  /** The resolved path (e.g., ~ becomes /home/user) */
  path: string
  /** Directory entries */
  entries: SftpFileEntry[]
}

/**
 * List directory contents
 */
export async function listDirectory(
  path: string,
  showHidden: boolean = false
): Promise<ListDirectoryResult> {
  const socketInstance = getSocket()
  if (!socketInstance) {
    throw new Error('Not connected')
  }

  initializeSftpListeners()

  const request: SftpListRequest = { path, showHidden }
  debug('Requesting directory listing', path)

  const responsePromise = createPendingRequest<SftpDirectoryResponse>(
    `list:${path}`
  )
  socketInstance.emit('sftp-list', request)

  const response = await responsePromise
  if (response.error) {
    throw new Error(response.error)
  }

  // Return both the resolved path and entries
  // This is important because the server resolves ~ to an absolute path
  return {
    path: response.path,
    entries: [...response.entries]
  }
}

/**
 * Get file/directory stats
 */
export async function stat(path: string): Promise<SftpFileEntry> {
  const socketInstance = getSocket()
  if (!socketInstance) {
    throw new Error('Not connected')
  }

  initializeSftpListeners()

  const request: SftpStatRequest = { path }
  debug('Requesting stat', path)

  const responsePromise = createPendingRequest<SftpStatResponse>(`stat:${path}`)
  socketInstance.emit('sftp-stat', request)

  const response = await responsePromise
  if (response.error || !response.entry) {
    throw new Error(response.error || 'File not found')
  }

  return response.entry
}

/**
 * Create directory
 */
export async function mkdir(path: string, mode?: number): Promise<void> {
  const socketInstance = getSocket()
  if (!socketInstance) {
    throw new Error('Not connected')
  }

  initializeSftpListeners()

  const request = mode !== undefined ? { path, mode } : { path }
  debug('Creating directory', path)

  const responsePromise = createPendingRequest<SftpOperationResponse>(
    `operation:${path}`
  )
  socketInstance.emit('sftp-mkdir', request)

  const response = await responsePromise
  if (!response.success) {
    throw new Error(response.error || 'Failed to create directory')
  }
}

/**
 * Delete file or directory
 */
export async function deleteFile(
  path: string,
  recursive: boolean = false
): Promise<void> {
  const socketInstance = getSocket()
  if (!socketInstance) {
    throw new Error('Not connected')
  }

  initializeSftpListeners()

  const request: SftpDeleteRequest = { path, recursive }
  debug('Deleting', path, recursive ? '(recursive)' : '')

  const responsePromise = createPendingRequest<SftpOperationResponse>(
    `operation:${path}`
  )
  socketInstance.emit('sftp-delete', request)

  const response = await responsePromise
  if (!response.success) {
    throw new Error(response.error || 'Failed to delete')
  }
}

/**
 * Upload a file with chunking and progress tracking
 * @returns Server-generated transfer ID
 */
export async function uploadFile(
  file: File,
  remotePath: string,
  options: UploadOptions = {}
): Promise<TransferId> {
  const socketInstance = getSocket()
  if (!socketInstance) {
    throw new Error('Not connected')
  }

  initializeSftpListeners()

  debug('Starting upload', file.name, 'to', remotePath, `size: ${file.size}`)

  // Build request without transferId (server will generate it)
  const startRequest = {
    remotePath,
    fileName: file.name,
    fileSize: file.size,
    ...(file.type ? { mimeType: file.type } : {}),
    ...(options.overwrite !== undefined ? { overwrite: options.overwrite } : {})
  }

  // Use FIFO queue for upload-ready (server generates transferId)
  const readyPromise = new Promise<SftpUploadReadyResponse>(
    (resolve, reject) => {
      const timeoutId = setTimeout(() => {
        const idx = pendingUploadReady.findIndex((p) => p.resolve === resolve)
        if (idx !== -1) pendingUploadReady.splice(idx, 1)
        reject(new Error('Upload ready timeout'))
      }, REQUEST_TIMEOUT)
      pendingUploadReady.push({
        resolve: resolve as (value: unknown) => void,
        reject,
        timeoutId
      })
    }
  )

  socketInstance.emit('sftp-upload-start', startRequest)

  const readyResponse = await readyPromise
  const transferId = readyResponse.transferId as TransferId
  const chunkSize = readyResponse.chunkSize || DEFAULT_CHUNK_SIZE

  debug('Upload ready', transferId, `chunk size: ${chunkSize}`)

  // Create transfer tracking AFTER getting server-provided ID
  const transfer: ClientTransfer = {
    id: transferId,
    direction: 'upload',
    remotePath,
    fileName: file.name,
    totalBytes: file.size,
    bytesTransferred: 0,
    percentComplete: 0,
    bytesPerSecond: 0,
    estimatedSecondsRemaining: null,
    startedAt: Date.now(),
    status: 'active'
  }
  activeTransfers.set(transferId, transfer)

  // Register progress callback
  if (options.onProgress) {
    progressCallbacks.set(transferId, options.onProgress)
  }

  try {
    // Create chunker
    const chunker = new FileChunker(file, chunkSize)
    activeChunkers.set(transferId, chunker)

    // Send chunks - sequential awaits are intentional for flow control
    // eslint-disable-next-line no-await-in-loop
    let chunk = await chunker.nextChunk()
    while (chunk) {
      const chunkRequest: SftpUploadChunkRequest = {
        transferId,
        chunkIndex: chunk.index,
        data: chunk.data,
        isLast: chunk.isLast
      }

      // Wait for ack before sending next chunk
      const ackPromise = createPendingRequest<SftpUploadAckResponse>(
        `upload-ack:${transferId}:${chunk.index}`
      )
      socketInstance.emit('sftp-upload-chunk', chunkRequest)
      // eslint-disable-next-line no-await-in-loop
      const ackResponse = await ackPromise

      // Update progress from ack response (don't wait for sftp-progress events)
      const bytesTransferred = ackResponse.bytesReceived
      const percentComplete = Math.round((bytesTransferred / file.size) * 100)
      transfer.bytesTransferred = bytesTransferred
      transfer.percentComplete = percentComplete
      transfer.status = 'active'

      // Calculate speed and ETA
      const elapsed = (Date.now() - transfer.startedAt) / 1000
      if (elapsed > 0) {
        transfer.bytesPerSecond = Math.round(bytesTransferred / elapsed)
        const remainingBytes = file.size - bytesTransferred
        transfer.estimatedSecondsRemaining =
          transfer.bytesPerSecond > 0
            ? Math.round(remainingBytes / transfer.bytesPerSecond)
            : null
      }

      // Call progress callback
      if (options.onProgress) {
        options.onProgress({
          transferId,
          direction: 'upload',
          bytesTransferred,
          totalBytes: file.size,
          percentComplete,
          bytesPerSecond: transfer.bytesPerSecond,
          estimatedSecondsRemaining: transfer.estimatedSecondsRemaining
        })
      }

      // eslint-disable-next-line no-await-in-loop
      chunk = await chunker.nextChunk()
    }

    // Wait for completion
    const completePromise = createPendingRequest<SftpCompleteResponse>(
      `complete:${transferId}`
    )
    await completePromise

    debug('Upload complete', transferId)
    return transferId
  } catch (error) {
    transfer.status = 'failed'
    transfer.error = error instanceof Error ? error.message : 'Upload failed'
    throw error
  } finally {
    // Cleanup
    activeChunkers.delete(transferId)
    progressCallbacks.delete(transferId)
  }
}

/**
 * Download a file with progress tracking
 * @returns Server-generated transfer ID
 */
export async function downloadFile(
  remotePath: string,
  options: DownloadOptions = {}
): Promise<TransferId> {
  const socketInstance = getSocket()
  if (!socketInstance) {
    throw new Error('Not connected')
  }

  initializeSftpListeners()

  debug('Starting download', remotePath)

  // Build request without transferId (server will generate it)
  const startRequest = { remotePath }

  // Use FIFO queue for download-ready (server generates transferId)
  const readyPromise = new Promise<SftpDownloadReadyResponse>(
    (resolve, reject) => {
      const timeoutId = setTimeout(() => {
        const idx = pendingDownloadReady.findIndex((p) => p.resolve === resolve)
        if (idx !== -1) pendingDownloadReady.splice(idx, 1)
        reject(new Error('Download ready timeout'))
      }, REQUEST_TIMEOUT)
      pendingDownloadReady.push({
        resolve: resolve as (value: unknown) => void,
        reject,
        timeoutId
      })
    }
  )

  socketInstance.emit('sftp-download-start', startRequest)

  const readyResponse = await readyPromise
  const transferId = readyResponse.transferId as TransferId

  debug(
    'Download ready',
    transferId,
    readyResponse.fileName,
    `size: ${readyResponse.fileSize}`
  )

  // Create transfer tracking AFTER getting server-provided ID
  const transfer: ClientTransfer = {
    id: transferId,
    direction: 'download',
    remotePath,
    fileName: readyResponse.fileName,
    totalBytes: readyResponse.fileSize,
    bytesTransferred: 0,
    percentComplete: 0,
    bytesPerSecond: 0,
    estimatedSecondsRemaining: null,
    startedAt: Date.now(),
    status: 'active'
  }
  activeTransfers.set(transferId, transfer)

  // Register progress callback
  if (options.onProgress) {
    progressCallbacks.set(transferId, options.onProgress)
  }

  try {
    // Wait for completion (chunks are handled by event listeners)
    const completePromise = createPendingRequest<SftpCompleteResponse>(
      `complete:${transferId}`,
      600000
    ) // 10 min timeout for large files
    await completePromise

    debug('Download complete', transferId)
    return transferId
  } catch (error) {
    transfer.status = 'failed'
    transfer.error = error instanceof Error ? error.message : 'Download failed'
    throw error
  } finally {
    // Cleanup
    activeAssemblers.delete(transferId)
    progressCallbacks.delete(transferId)
  }
}

/**
 * Cancel an active transfer
 */
export function cancelTransfer(transferId: TransferId): void {
  const socketInstance = getSocket()
  const transfer = activeTransfers.get(transferId)

  if (!transfer) {
    debug('No transfer to cancel', transferId)
    return
  }

  debug('Cancelling transfer', transferId)
  transfer.status = 'cancelled'

  if (socketInstance) {
    if (transfer.direction === 'upload') {
      socketInstance.emit('sftp-upload-cancel', { transferId })
    } else {
      socketInstance.emit('sftp-download-cancel', { transferId })
    }
  }

  // Cleanup
  const chunker = activeChunkers.get(transferId)
  if (chunker) {
    chunker.cancel()
    activeChunkers.delete(transferId)
  }

  const assembler = activeAssemblers.get(transferId)
  if (assembler) {
    assembler.cancel()
    activeAssemblers.delete(transferId)
  }

  progressCallbacks.delete(transferId)
  rejectAllForTransfer(transferId, new Error('Transfer cancelled'))
}

/**
 * Get active transfer by ID
 */
export function getTransfer(
  transferId: TransferId
): ClientTransfer | undefined {
  return activeTransfers.get(transferId)
}

/**
 * Get all active transfers
 */
export function getActiveTransfers(): ClientTransfer[] {
  return Array.from(activeTransfers.values()).filter(
    (t) =>
      t.status === 'pending' || t.status === 'active' || t.status === 'paused'
  )
}

/**
 * Get all transfers (including completed/failed)
 */
export function getAllTransfers(): ClientTransfer[] {
  return Array.from(activeTransfers.values())
}

/**
 * Clear completed/failed transfers from the list
 */
export function clearCompletedTransfers(): void {
  for (const [id, transfer] of activeTransfers) {
    if (
      transfer.status === 'completed' ||
      transfer.status === 'failed' ||
      transfer.status === 'cancelled'
    ) {
      activeTransfers.delete(id)
    }
  }
}

// =============================================================================
// SFTP Service Object (for compatibility with existing patterns)
// =============================================================================

export const sftpService = {
  initializeSftpListeners,
  cleanupSftpListeners,
  listDirectory,
  stat,
  mkdir,
  deleteFile,
  uploadFile,
  downloadFile,
  cancelTransfer,
  getTransfer,
  getActiveTransfers,
  getAllTransfers,
  clearCompletedTransfers
}

export default sftpService
