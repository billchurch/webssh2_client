/**
 * SFTP State Management Store
 *
 * Manages SFTP state using SolidJS stores.
 * Provides reactive state for file browser, transfers, and operations.
 *
 * @module stores/sftp-store
 */

import { createStore } from 'solid-js/store'
import { createSignal, createRoot } from 'solid-js'
import createDebug from 'debug'

import {
  sftpService,
  initializeSftpListeners,
  cleanupSftpListeners
} from '../services/sftp-service.js'
import {
  type SftpFileEntry,
  type ClientTransfer,
  type TransferId,
  type SftpProgressResponse,
  type SftpStatusResponse,
  type SftpServerConfig
} from '../types/sftp.js'

const debug = createDebug('webssh2-client:sftp-store')

// Placeholder ID counter for transfers before server assigns real ID
let placeholderCounter = 0
function createPlaceholderId(): TransferId {
  return `pending-${++placeholderCounter}` as TransferId
}

// =============================================================================
// Types
// =============================================================================

export interface SftpState {
  /** Whether SFTP panel is open */
  isOpen: boolean
  /** Whether SFTP is available (server has SFTP enabled and sent status) */
  isAvailable: boolean
  /** Server-provided SFTP configuration (limits, restrictions) */
  serverConfig: SftpServerConfig | null
  /** Current directory path */
  currentPath: string
  /** Directory entries */
  entries: SftpFileEntry[]
  /** Whether currently loading */
  loading: boolean
  /** Error message if any */
  error: string | null
  /** Active and recent transfers */
  transfers: ClientTransfer[]
  /** Selected file paths */
  selectedPaths: string[]
  /** Show hidden files */
  showHidden: boolean
  /** Sort field */
  sortBy: 'name' | 'size' | 'modifiedAt' | 'type'
  /** Sort direction */
  sortDirection: 'asc' | 'desc'
}

const initialState: SftpState = {
  isOpen: false,
  isAvailable: false,
  serverConfig: null,
  currentPath: '~',
  entries: [],
  loading: false,
  error: null,
  transfers: [],
  selectedPaths: [],
  showHidden: false,
  sortBy: 'name',
  sortDirection: 'asc'
}

// =============================================================================
// Store Creation
// =============================================================================

/**
 * Create SFTP store instance
 * Uses createRoot for proper cleanup handling
 */
function createSftpStoreInternal() {
  const [state, setState] = createStore<SftpState>({ ...initialState })

  // Sorted entries computed from state
  const getSortedEntries = (): SftpFileEntry[] => {
    const entries = [...state.entries]

    // Filter hidden if needed
    const filtered = state.showHidden
      ? entries
      : entries.filter((e) => !e.isHidden)

    // Sort
    filtered.sort((a, b) => {
      // Directories first
      if (a.type === 'directory' && b.type !== 'directory') return -1
      if (a.type !== 'directory' && b.type === 'directory') return 1

      let comparison = 0
      switch (state.sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
        case 'size':
          comparison = a.size - b.size
          break
        case 'modifiedAt':
          comparison =
            new Date(a.modifiedAt).getTime() - new Date(b.modifiedAt).getTime()
          break
        case 'type':
          comparison = a.type.localeCompare(b.type)
          break
        default:
          // Default to name comparison
          comparison = a.name.localeCompare(b.name)
      }

      return state.sortDirection === 'asc' ? comparison : -comparison
    })

    return filtered
  }

  // Active transfers
  const getActiveTransfers = (): ClientTransfer[] => {
    return state.transfers.filter(
      (t) =>
        t.status === 'pending' || t.status === 'active' || t.status === 'paused'
    )
  }

  return {
    // State getters
    get state() {
      return state
    },
    get isOpen() {
      return state.isOpen
    },
    get isAvailable() {
      return state.isAvailable
    },
    get serverConfig() {
      return state.serverConfig
    },
    get currentPath() {
      return state.currentPath
    },
    get entries() {
      return getSortedEntries()
    },
    get rawEntries() {
      return state.entries
    },
    get loading() {
      return state.loading
    },
    get error() {
      return state.error
    },
    get transfers() {
      return state.transfers
    },
    get activeTransfers() {
      return getActiveTransfers()
    },
    get selectedPaths() {
      return state.selectedPaths
    },
    get showHidden() {
      return state.showHidden
    },
    get sortBy() {
      return state.sortBy
    },
    get sortDirection() {
      return state.sortDirection
    },

    // SFTP Status handling
    setStatus(status: SftpStatusResponse) {
      debug('SFTP status received', status.enabled)
      setState({
        isAvailable: status.enabled,
        serverConfig: status.config ?? null
      })
    },

    // Panel controls
    open() {
      debug('Opening SFTP panel')
      setState('isOpen', true)
      initializeSftpListeners()
      // Navigate to current path on open
      if (state.entries.length === 0) {
        this.navigateTo(state.currentPath)
      }
    },

    close() {
      debug('Closing SFTP panel')
      setState('isOpen', false)
    },

    toggle() {
      if (state.isOpen) {
        this.close()
      } else {
        this.open()
      }
    },

    // Navigation
    async navigateTo(path: string) {
      debug('Navigating to', path)
      setState({ loading: true, error: null })

      try {
        const result = await sftpService.listDirectory(path, state.showHidden)
        // Use the resolved path from the server response
        // This is important because ~ gets resolved to /home/user
        // and subsequent requests should use the resolved path
        setState({
          currentPath: result.path,
          entries: result.entries,
          loading: false,
          selectedPaths: []
        })
        debug(
          'Directory loaded',
          result.path,
          `${result.entries.length} entries`
        )
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to list directory'
        debug('Navigation error', message)
        setState({ error: message, loading: false })
      }
    },

    navigateUp() {
      const current = state.currentPath
      if (current === '/' || current === '~') {
        return
      }
      const parent = current.split('/').slice(0, -1).join('/') || '/'
      this.navigateTo(parent)
    },

    async handleEntryClick(entry: SftpFileEntry) {
      if (entry.type === 'directory') {
        await this.navigateTo(entry.path)
      }
      // For files, just select them
    },

    async refresh() {
      await this.navigateTo(state.currentPath)
    },

    // Selection
    toggleSelection(path: string) {
      const selected = state.selectedPaths
      if (selected.includes(path)) {
        setState(
          'selectedPaths',
          selected.filter((p) => p !== path)
        )
      } else {
        setState('selectedPaths', [...selected, path])
      }
    },

    selectAll() {
      setState(
        'selectedPaths',
        state.entries.map((e) => e.path)
      )
    },

    clearSelection() {
      setState('selectedPaths', [])
    },

    // File operations
    async createFolder(name: string) {
      const path = `${state.currentPath}/${name}`
      debug('Creating folder', path)
      setState({ loading: true, error: null })

      try {
        await sftpService.mkdir(path)
        await this.refresh()
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to create folder'
        debug('Create folder error', message)
        setState({ error: message, loading: false })
        throw err
      }
    },

    async deleteEntry(entry: SftpFileEntry) {
      debug('Deleting', entry.path)
      setState({ loading: true, error: null })

      try {
        await sftpService.deleteFile(entry.path, entry.type === 'directory')
        await this.refresh()
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete'
        debug('Delete error', message)
        setState({ error: message, loading: false })
        throw err
      }
    },

    async deleteSelected() {
      const paths = state.selectedPaths
      if (paths.length === 0) return

      debug('Deleting selected', paths.length)
      setState({ loading: true, error: null })

      try {
        // Sequential deletion is intentional - delete one at a time
        for (const path of paths) {
          const entry = state.entries.find((e) => e.path === path)
          if (entry) {
            // eslint-disable-next-line no-await-in-loop
            await sftpService.deleteFile(path, entry.type === 'directory')
          }
        }
        await this.refresh()
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete'
        debug('Delete selected error', message)
        setState({ error: message, loading: false })
        throw err
      }
    },

    // Upload
    async uploadFile(file: File, remotePath?: string) {
      const destination = remotePath ?? `${state.currentPath}/${file.name}`
      const placeholderId = createPlaceholderId()

      debug('Uploading file', file.name, 'to', destination)

      // Add placeholder transfer to state immediately (shows "Initiating..." in UI)
      const placeholderTransfer: ClientTransfer = {
        id: placeholderId,
        direction: 'upload',
        remotePath: destination,
        fileName: file.name,
        totalBytes: file.size,
        bytesTransferred: 0,
        percentComplete: 0,
        bytesPerSecond: 0,
        estimatedSecondsRemaining: null,
        startedAt: Date.now(),
        status: 'pending' // 'pending' indicates waiting for server
      }
      setState('transfers', [...state.transfers, placeholderTransfer])

      let realTransferId: TransferId | null = null

      try {
        // Service now returns the server-provided transferId
        realTransferId = await sftpService.uploadFile(file, destination, {
          onProgress: (progress) => {
            // Replace placeholder with real transfer on first progress (id is readonly)
            if (
              realTransferId &&
              state.transfers.find((t) => t.id === placeholderId)
            ) {
              const placeholder = state.transfers.find(
                (t) => t.id === placeholderId
              )
              if (placeholder) {
                const updatedTransfer = { ...placeholder, id: realTransferId }
                setState('transfers', (transfers) =>
                  transfers.map((t) =>
                    t.id === placeholderId ? updatedTransfer : t
                  )
                )
              }
            }
            // Update progress using real ID (or placeholder if not yet replaced)
            const targetId = realTransferId ?? placeholderId
            this.updateTransferProgress(targetId, progress)
          }
        })

        // Replace placeholder with real transfer if not already done (id is readonly)
        if (state.transfers.find((t) => t.id === placeholderId)) {
          const placeholder = state.transfers.find(
            (t) => t.id === placeholderId
          )
          if (placeholder) {
            const updatedTransfer = { ...placeholder, id: realTransferId }
            setState('transfers', (transfers) =>
              transfers.map((t) =>
                t.id === placeholderId ? updatedTransfer : t
              )
            )
          }
        }

        // Mark complete
        this.updateTransferStatus(realTransferId, 'completed')

        // Refresh directory
        await this.refresh()
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Upload failed'
        // Mark placeholder as failed (even if we never got a real ID)
        const targetId = realTransferId ?? placeholderId
        this.updateTransferStatus(targetId, 'failed', message)
        debug('Upload error', message)
        throw err
      }
    },

    async uploadFiles(files: File[]) {
      // Sequential upload is intentional - upload one at a time
      for (const file of files) {
        // eslint-disable-next-line no-await-in-loop
        await this.uploadFile(file)
      }
    },

    handleDrop(files: File[]) {
      this.uploadFiles(files)
    },

    // Download
    async downloadFile(entry: SftpFileEntry) {
      if (entry.type !== 'file') {
        debug('Cannot download non-file', entry.type)
        return
      }

      const placeholderId = createPlaceholderId()
      debug('Downloading file', entry.path)

      // Add placeholder transfer to state immediately
      const placeholderTransfer: ClientTransfer = {
        id: placeholderId,
        direction: 'download',
        remotePath: entry.path,
        fileName: entry.name,
        totalBytes: entry.size,
        bytesTransferred: 0,
        percentComplete: 0,
        bytesPerSecond: 0,
        estimatedSecondsRemaining: null,
        startedAt: Date.now(),
        status: 'pending'
      }
      setState('transfers', [...state.transfers, placeholderTransfer])

      let realTransferId: TransferId | null = null

      try {
        // Service now returns the server-provided transferId
        realTransferId = await sftpService.downloadFile(entry.path, {
          onProgress: (progress) => {
            // Replace placeholder with real transfer on first progress (id is readonly)
            if (
              realTransferId &&
              state.transfers.find((t) => t.id === placeholderId)
            ) {
              const placeholder = state.transfers.find(
                (t) => t.id === placeholderId
              )
              if (placeholder) {
                const updatedTransfer = { ...placeholder, id: realTransferId }
                setState('transfers', (transfers) =>
                  transfers.map((t) =>
                    t.id === placeholderId ? updatedTransfer : t
                  )
                )
              }
            }
            const targetId = realTransferId ?? placeholderId
            this.updateTransferProgress(targetId, progress)
          }
        })

        // Replace placeholder with real transfer if not already done (id is readonly)
        if (state.transfers.find((t) => t.id === placeholderId)) {
          const placeholder = state.transfers.find(
            (t) => t.id === placeholderId
          )
          if (placeholder) {
            const updatedTransfer = { ...placeholder, id: realTransferId }
            setState('transfers', (transfers) =>
              transfers.map((t) =>
                t.id === placeholderId ? updatedTransfer : t
              )
            )
          }
        }

        // Mark complete
        this.updateTransferStatus(realTransferId, 'completed')
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Download failed'
        const targetId = realTransferId ?? placeholderId
        this.updateTransferStatus(targetId, 'failed', message)
        throw err
      }
    },

    // Transfer management
    updateTransferProgress(
      transferId: TransferId,
      progress: SftpProgressResponse
    ) {
      setState('transfers', (transfer) => transfer.id === transferId, {
        bytesTransferred: progress.bytesTransferred,
        percentComplete: progress.percentComplete,
        bytesPerSecond: progress.bytesPerSecond,
        estimatedSecondsRemaining: progress.estimatedSecondsRemaining,
        status: 'active'
      })
    },

    updateTransferStatus(
      transferId: TransferId,
      status: ClientTransfer['status'],
      error?: string
    ) {
      setState('transfers', (transfer) => transfer.id === transferId, {
        status,
        ...(error && { error }),
        ...(status === 'completed' && { percentComplete: 100 })
      })
    },

    cancelTransfer(transferId: TransferId) {
      debug('Cancelling transfer', transferId)
      sftpService.cancelTransfer(transferId)
      this.updateTransferStatus(transferId, 'cancelled')
    },

    clearCompletedTransfers() {
      setState(
        'transfers',
        state.transfers.filter(
          (t) =>
            t.status !== 'completed' &&
            t.status !== 'failed' &&
            t.status !== 'cancelled'
        )
      )
    },

    // Settings
    toggleShowHidden() {
      setState('showHidden', !state.showHidden)
      this.refresh()
    },

    setSortBy(field: SftpState['sortBy']) {
      if (state.sortBy === field) {
        setState(
          'sortDirection',
          state.sortDirection === 'asc' ? 'desc' : 'asc'
        )
      } else {
        setState({ sortBy: field, sortDirection: 'asc' })
      }
    },

    // Cleanup
    reset() {
      setState({ ...initialState })
      cleanupSftpListeners()
    },

    clearError() {
      setState('error', null)
    }
  }
}

// =============================================================================
// Store Singleton
// =============================================================================

// Create store in root context
export const sftpStore = createRoot(createSftpStoreInternal)

// Export individual accessors for convenience
export const {
  open: openSftpPanel,
  close: closeSftpPanel,
  toggle: toggleSftpPanel,
  navigateTo: navigateToPath,
  refresh: refreshDirectory,
  uploadFile,
  uploadFiles,
  downloadFile,
  cancelTransfer,
  clearCompletedTransfers
} = sftpStore

// Export signals for reactive access
export const [isSftpOpen, setIsSftpOpen] = createSignal(false)

// Sync with store
createRoot(() => {
  // This would need proper effect handling in a real app
  // For now, components should use sftpStore.isOpen directly
})

export default sftpStore
