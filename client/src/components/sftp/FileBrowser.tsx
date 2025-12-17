/**
 * File Browser Component
 *
 * Main SFTP file browser component with directory listing and file operations.
 *
 * @module components/sftp/FileBrowser
 */

import type { Component } from 'solid-js'
import { Show, For, createEffect, createSignal } from 'solid-js'
import { X, LoaderCircle, Folder } from 'lucide-solid'
import createDebug from 'debug'

import { sftpStore } from '../../stores/sftp-store.js'
import type { SftpFileEntry } from '../../types/sftp.js'
import { SftpToolbar } from './SftpToolbar.jsx'
import { FileEntry, ParentEntry } from './FileEntry.jsx'
import { FileInfoModal } from './FileInfoModal.jsx'
import { UploadDropzone } from './UploadDropzone.jsx'
import { TransferList } from './TransferList.jsx'

const debug = createDebug('webssh2-client:file-browser')

interface FileBrowserProps {
  class?: string
}

export const FileBrowser: Component<FileBrowserProps> = (props) => {
  let fileInputRef: HTMLInputElement | undefined

  // State for file info modal
  const [selectedFile, setSelectedFile] = createSignal<SftpFileEntry | null>(
    null
  )
  const [isFileInfoModalOpen, setIsFileInfoModalOpen] = createSignal(false)

  // Open file info modal for a file
  const openFileInfo = (entry: SftpFileEntry) => {
    setSelectedFile(entry)
    setIsFileInfoModalOpen(true)
  }

  // Close file info modal
  const closeFileInfo = () => {
    setIsFileInfoModalOpen(false)
  }

  // Handle entry click - files open modal, directories navigate
  const handleEntryClick = (entry: SftpFileEntry) => {
    if (entry.type === 'file') {
      openFileInfo(entry)
    } else {
      sftpStore.handleEntryClick(entry)
    }
  }

  // Handle file selection for upload
  const handleFileSelect = (e: Event) => {
    const input = e.target as HTMLInputElement
    if (input.files && input.files.length > 0) {
      const files = Array.from(input.files)
      sftpStore.uploadFiles(files)
      // Reset input
      input.value = ''
    }
  }

  // Handle upload button click
  const handleUploadClick = () => {
    fileInputRef?.click()
  }

  // Handle drop files
  const handleDrop = (files: File[]) => {
    debug('Files dropped', files.length)
    sftpStore.handleDrop(files)
  }

  // Error display with auto-clear
  createEffect(() => {
    const error = sftpStore.error
    if (error) {
      const timeout = setTimeout(() => {
        sftpStore.clearError()
      }, 5000)
      return () => clearTimeout(timeout)
    }
    return undefined
  })

  return (
    <Show when={sftpStore.isOpen}>
      <div
        class={`flex h-72 shrink-0 flex-col overflow-hidden border-t border-neutral-600 bg-neutral-900 ${
          props.class || ''
        }`}
      >
        {/* Toolbar */}
        <SftpToolbar
          currentPath={sftpStore.currentPath}
          loading={sftpStore.loading}
          showHidden={sftpStore.showHidden}
          onNavigate={sftpStore.navigateTo.bind(sftpStore)}
          onNavigateUp={sftpStore.navigateUp.bind(sftpStore)}
          onRefresh={sftpStore.refresh.bind(sftpStore)}
          onUpload={handleUploadClick}
          onNewFolder={sftpStore.createFolder.bind(sftpStore)}
          onToggleHidden={sftpStore.toggleShowHidden.bind(sftpStore)}
          onClose={sftpStore.close.bind(sftpStore)}
        />

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          class="hidden"
          onChange={handleFileSelect}
          aria-label="Select files to upload"
          aria-hidden="true"
          tabIndex={-1}
        />

        {/* Error banner */}
        <Show when={sftpStore.error}>
          <div
            class="flex items-center justify-between bg-red-900/50 px-2 py-1 text-sm text-red-200"
            role="alert"
            aria-live="assertive"
          >
            <span>{sftpStore.error}</span>
            <button
              type="button"
              class="text-red-300 hover:text-white"
              onClick={() => sftpStore.clearError()}
              aria-label="Dismiss error"
            >
              <X class="size-4" aria-hidden="true" />
            </button>
          </div>
        </Show>

        {/* File list - min-h-0 and flex-1 required for proper scrolling in flex container */}
        <UploadDropzone onDrop={handleDrop} disabled={sftpStore.loading}>
          <section
            class="min-h-0 flex-1 overflow-y-scroll"
            aria-label="File browser"
            aria-busy={sftpStore.loading}
          >
            {/* Loading state */}
            <Show when={sftpStore.loading && sftpStore.rawEntries.length === 0}>
              <output
                class="flex h-full items-center justify-center"
                aria-live="polite"
              >
                <span class="flex items-center gap-2 text-neutral-400">
                  <LoaderCircle
                    class="size-5 animate-spin"
                    aria-hidden="true"
                  />
                  <span>Loading...</span>
                </span>
              </output>
            </Show>

            {/* Empty state */}
            <Show
              when={
                !sftpStore.loading &&
                sftpStore.entries.length === 0 &&
                sftpStore.currentPath !== '~' &&
                sftpStore.currentPath !== '/'
              }
            >
              <output
                class="flex h-full flex-col items-center justify-center text-neutral-500"
                aria-live="polite"
              >
                <Folder class="mb-2 size-12" aria-hidden="true" />
                <span>Empty directory</span>
                <span class="text-sm">Drop files here to upload</span>
              </output>
            </Show>

            {/* File list content */}
            <Show
              when={
                sftpStore.entries.length > 0 || sftpStore.currentPath !== '~'
              }
            >
              <ul
                class="divide-y divide-neutral-800"
                aria-label={`Directory contents: ${sftpStore.entries.length} items`}
              >
                {/* Parent directory link */}
                <Show
                  when={
                    sftpStore.currentPath !== '~' &&
                    sftpStore.currentPath !== '/'
                  }
                >
                  <ParentEntry
                    onNavigateUp={sftpStore.navigateUp.bind(sftpStore)}
                  />
                </Show>

                {/* Directory entries */}
                <For each={sftpStore.entries}>
                  {(entry) => {
                    const isFile = entry.type === 'file'
                    return (
                      <FileEntry
                        entry={entry}
                        selected={sftpStore.selectedPaths.includes(entry.path)}
                        onClick={() => handleEntryClick(entry)}
                        {...(isFile
                          ? {
                              onDownload: () => {
                                sftpStore.downloadFile(entry)
                              }
                            }
                          : {})}
                        onDelete={() => {
                          sftpStore.deleteEntry(entry)
                        }}
                      />
                    )
                  }}
                </For>
              </ul>
            </Show>
          </section>
        </UploadDropzone>

        {/* Transfer list */}
        <Show when={sftpStore.transfers.length > 0}>
          <TransferList
            transfers={sftpStore.transfers}
            onCancel={sftpStore.cancelTransfer.bind(sftpStore)}
            onClearCompleted={sftpStore.clearCompletedTransfers.bind(sftpStore)}
          />
        </Show>

        {/* File info modal */}
        <FileInfoModal
          entry={selectedFile()}
          isOpen={isFileInfoModalOpen()}
          onClose={closeFileInfo}
          onDownload={() => {
            const file = selectedFile()
            if (file) {
              sftpStore.downloadFile(file)
            }
          }}
          onDelete={() => {
            const file = selectedFile()
            if (file) {
              sftpStore.deleteEntry(file)
            }
          }}
        />
      </div>
    </Show>
  )
}

export default FileBrowser
