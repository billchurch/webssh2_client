/**
 * File Browser Component
 *
 * Main SFTP file browser component with directory listing and file operations.
 *
 * @module components/sftp/FileBrowser
 */

import type { Component } from 'solid-js'
import { Show, For, createEffect } from 'solid-js'
import createDebug from 'debug'

import { sftpStore } from '../../stores/sftp-store.js'
import { SftpToolbar } from './SftpToolbar.jsx'
import { FileEntry, ParentEntry } from './FileEntry.jsx'
import { UploadDropzone } from './UploadDropzone.jsx'
import { TransferList } from './TransferList.jsx'

const debug = createDebug('webssh2-client:file-browser')

interface FileBrowserProps {
  class?: string
}

export const FileBrowser: Component<FileBrowserProps> = (props) => {
  let fileInputRef: HTMLInputElement | undefined

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
        />

        {/* Error banner */}
        <Show when={sftpStore.error}>
          <div class="flex items-center justify-between bg-red-900/50 px-2 py-1 text-sm text-red-200">
            <span>{sftpStore.error}</span>
            <button
              type="button"
              class="text-red-300 hover:text-white"
              onClick={() => sftpStore.clearError()}
            >
              <svg
                class="size-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </Show>

        {/* File list - min-h-0 and flex-1 required for proper scrolling in flex container */}
        <UploadDropzone onDrop={handleDrop} disabled={sftpStore.loading}>
          <div class="min-h-0 flex-1 overflow-y-scroll">
            {/* Loading state */}
            <Show when={sftpStore.loading && sftpStore.rawEntries.length === 0}>
              <div class="flex h-full items-center justify-center">
                <div class="flex items-center gap-2 text-neutral-400">
                  <svg
                    class="size-5 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      class="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      stroke-width="4"
                    />
                    <path
                      class="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span>Loading...</span>
                </div>
              </div>
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
              <div class="flex h-full flex-col items-center justify-center text-neutral-500">
                <svg
                  class="mb-2 size-12"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="1.5"
                    d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                  />
                </svg>
                <span>Empty directory</span>
                <span class="text-sm">Drop files here to upload</span>
              </div>
            </Show>

            {/* File list content */}
            <Show
              when={
                sftpStore.entries.length > 0 || sftpStore.currentPath !== '~'
              }
            >
              <div class="divide-y divide-neutral-800">
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
                        onClick={() => sftpStore.handleEntryClick(entry)}
                        {...(isFile
                          ? { onDownload: () => sftpStore.downloadFile(entry) }
                          : {})}
                        onDelete={() => {
                          sftpStore.deleteEntry(entry)
                        }}
                      />
                    )
                  }}
                </For>
              </div>
            </Show>
          </div>
        </UploadDropzone>

        {/* Transfer list */}
        <Show when={sftpStore.transfers.length > 0}>
          <TransferList
            transfers={sftpStore.transfers}
            onCancel={sftpStore.cancelTransfer.bind(sftpStore)}
            onClearCompleted={sftpStore.clearCompletedTransfers.bind(sftpStore)}
          />
        </Show>
      </div>
    </Show>
  )
}

export default FileBrowser
