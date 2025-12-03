/**
 * SFTP Toolbar Component
 *
 * Navigation and action buttons for the file browser.
 *
 * @module components/sftp/SftpToolbar
 */

import type { Component } from 'solid-js'
import { createSignal, Show } from 'solid-js'

interface SftpToolbarProps {
  currentPath: string
  loading?: boolean
  showHidden?: boolean
  onNavigate: (path: string) => void
  onNavigateUp: () => void
  onRefresh: () => void
  onUpload: () => void
  onNewFolder: (name: string) => void
  onToggleHidden: () => void
  onClose: () => void
}

export const SftpToolbar: Component<SftpToolbarProps> = (props) => {
  const [showNewFolderInput, setShowNewFolderInput] = createSignal(false)
  const [newFolderName, setNewFolderName] = createSignal('')
  const [isEditingPath, setIsEditingPath] = createSignal(false)
  const [editedPath, setEditedPath] = createSignal('')

  let newFolderInputRef: HTMLInputElement | undefined

  // Handle path navigation from the editable path bar
  const handlePathSubmit = () => {
    const path = editedPath().trim()
    if (path && path !== props.currentPath) {
      props.onNavigate(path)
    }
    setIsEditingPath(false)
  }

  // Start editing path bar
  const startEditingPath = () => {
    setEditedPath(props.currentPath)
    setIsEditingPath(true)
  }

  // Cancel path editing
  const cancelEditingPath = () => {
    setIsEditingPath(false)
    setEditedPath('')
  }

  const handleNewFolder = () => {
    const name = newFolderName().trim()
    if (name) {
      props.onNewFolder(name)
      setNewFolderName('')
      setShowNewFolderInput(false)
    }
  }

  return (
    <div class="flex flex-col border-b border-neutral-700 bg-neutral-800">
      {/* Main toolbar */}
      <div class="flex items-center gap-1 px-2 py-1">
        {/* Back button */}
        <button
          type="button"
          class="rounded p-1.5 text-neutral-400 hover:bg-neutral-700 hover:text-white disabled:opacity-50"
          onClick={props.onNavigateUp}
          title="Go up"
          disabled={props.loading}
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
              d="M11 17l-5-5m0 0l5-5m-5 5h12"
            />
          </svg>
        </button>

        {/* Home button */}
        <button
          type="button"
          class="rounded p-1.5 text-neutral-400 hover:bg-neutral-700 hover:text-white disabled:opacity-50"
          onClick={() => props.onNavigate('~')}
          title="Home"
          disabled={props.loading}
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
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
            />
          </svg>
        </button>

        {/* Path bar - editable on click */}
        <Show
          when={isEditingPath()}
          fallback={
            <div
              class="flex-1 cursor-text truncate rounded bg-neutral-900 px-2 py-1 text-sm text-neutral-300 hover:bg-neutral-800"
              onClick={startEditingPath}
              title="Click to edit path"
            >
              {props.currentPath}
            </div>
          }
        >
          <input
            type="text"
            class="flex-1 rounded border border-blue-500 bg-neutral-900 px-2 py-1 text-sm text-neutral-200 focus:outline-none"
            value={editedPath()}
            onInput={(e) => setEditedPath(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handlePathSubmit()
              if (e.key === 'Escape') cancelEditingPath()
            }}
            onBlur={handlePathSubmit}
            autofocus
          />
        </Show>

        {/* Refresh button */}
        <button
          type="button"
          class="rounded p-1.5 text-neutral-400 hover:bg-neutral-700 hover:text-white disabled:opacity-50"
          onClick={props.onRefresh}
          title="Refresh"
          disabled={props.loading}
        >
          <svg
            class={`size-4 ${props.loading ? 'animate-spin direction-reverse' : ''}`}
            style={props.loading ? { 'animation-direction': 'reverse' } : {}}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>

        {/* Toggle hidden files */}
        <button
          type="button"
          class={`rounded p-1.5 hover:bg-neutral-700 ${
            props.showHidden
              ? 'text-blue-400'
              : 'text-neutral-400 hover:text-white'
          }`}
          onClick={props.onToggleHidden}
          title={props.showHidden ? 'Hide hidden files' : 'Show hidden files'}
        >
          <svg
            class="size-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <Show
              when={props.showHidden}
              fallback={
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              }
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
              />
            </Show>
          </svg>
        </button>

        {/* Separator */}
        <div class="mx-1 h-4 w-px bg-neutral-600" />

        {/* New folder button */}
        <button
          type="button"
          class="rounded p-1.5 text-neutral-400 hover:bg-neutral-700 hover:text-white"
          onClick={() => {
            const willShow = !showNewFolderInput()
            setShowNewFolderInput(willShow)
            if (willShow) {
              // Focus input after it renders
              requestAnimationFrame(() => newFolderInputRef?.focus())
            }
          }}
          title="New folder"
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
              d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
            />
          </svg>
        </button>

        {/* Upload button */}
        <button
          type="button"
          class="rounded p-1.5 text-neutral-400 hover:bg-neutral-700 hover:text-white"
          onClick={props.onUpload}
          title="Upload files"
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
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
            />
          </svg>
        </button>

        {/* Separator */}
        <div class="mx-1 h-4 w-px bg-neutral-600" />

        {/* Close button */}
        <button
          type="button"
          class="rounded p-1.5 text-neutral-400 hover:bg-neutral-700 hover:text-white"
          onClick={props.onClose}
          title="Close file browser"
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

      {/* New folder input */}
      <Show when={showNewFolderInput()}>
        <div class="flex items-center gap-2 border-t border-neutral-700 px-2 py-1">
          <span class="text-sm text-neutral-400">New folder:</span>
          <input
            ref={newFolderInputRef}
            type="text"
            class="flex-1 rounded border border-neutral-600 bg-neutral-900 px-2 py-1 text-sm text-neutral-200 focus:border-blue-500 focus:outline-none"
            placeholder="Folder name"
            value={newFolderName()}
            onInput={(e) => setNewFolderName(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleNewFolder()
              if (e.key === 'Escape') setShowNewFolderInput(false)
            }}
          />
          <button
            type="button"
            class="rounded bg-blue-600 px-2 py-1 text-sm text-white hover:bg-blue-700"
            onClick={handleNewFolder}
          >
            Create
          </button>
          <button
            type="button"
            class="rounded bg-neutral-700 px-2 py-1 text-sm text-neutral-300 hover:bg-neutral-600"
            onClick={() => setShowNewFolderInput(false)}
          >
            Cancel
          </button>
        </div>
      </Show>
    </div>
  )
}

export default SftpToolbar
