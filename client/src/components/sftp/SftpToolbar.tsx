/**
 * SFTP Toolbar Component
 *
 * Navigation and action buttons for the file browser.
 *
 * @module components/sftp/SftpToolbar
 */

import type { Component } from 'solid-js'
import { createSignal, Show } from 'solid-js'
import {
  ArrowLeft,
  Home,
  RefreshCw,
  Eye,
  EyeOff,
  FolderPlus,
  Upload,
  X
} from 'lucide-solid'

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
          aria-label="Go to parent directory"
          disabled={props.loading}
        >
          <ArrowLeft class="size-4" aria-hidden="true" />
        </button>

        {/* Home button */}
        <button
          type="button"
          class="rounded p-1.5 text-neutral-400 hover:bg-neutral-700 hover:text-white disabled:opacity-50"
          onClick={() => props.onNavigate('~')}
          title="Home"
          aria-label="Go to home directory"
          disabled={props.loading}
        >
          <Home class="size-4" aria-hidden="true" />
        </button>

        {/* Path bar - editable on click */}
        <Show
          when={isEditingPath()}
          fallback={
            <div
              class="flex-1 cursor-text truncate rounded bg-neutral-900 px-2 py-1 text-sm text-neutral-300 hover:bg-neutral-800"
              onClick={startEditingPath}
              onKeyDown={(e) => e.key === 'Enter' && startEditingPath()}
              title="Click to edit path"
              role="button"
              tabIndex={0}
              aria-label={`Current path: ${props.currentPath}. Press Enter to edit.`}
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
            aria-label="Directory path"
            autofocus
          />
        </Show>

        {/* Refresh button */}
        <button
          type="button"
          class="rounded p-1.5 text-neutral-400 hover:bg-neutral-700 hover:text-white disabled:opacity-50"
          onClick={props.onRefresh}
          title="Refresh"
          aria-label="Refresh directory listing"
          disabled={props.loading}
        >
          <RefreshCw
            class={`size-4 ${props.loading ? 'animate-spin' : ''}`}
            aria-hidden="true"
          />
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
          aria-label={
            props.showHidden ? 'Hide hidden files' : 'Show hidden files'
          }
          aria-pressed={props.showHidden}
        >
          <Show
            when={props.showHidden}
            fallback={<Eye class="size-4" aria-hidden="true" />}
          >
            <EyeOff class="size-4" aria-hidden="true" />
          </Show>
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
          aria-label="Create new folder"
          aria-expanded={showNewFolderInput()}
        >
          <FolderPlus class="size-4" aria-hidden="true" />
        </button>

        {/* Upload button */}
        <button
          type="button"
          class="rounded p-1.5 text-neutral-400 hover:bg-neutral-700 hover:text-white"
          onClick={props.onUpload}
          title="Upload files"
          aria-label="Upload files"
        >
          <Upload class="size-4" aria-hidden="true" />
        </button>

        {/* Separator */}
        <div class="mx-1 h-4 w-px bg-neutral-600" />

        {/* Close button */}
        <button
          type="button"
          class="rounded p-1.5 text-neutral-400 hover:bg-neutral-700 hover:text-white"
          onClick={props.onClose}
          title="Close file browser"
          aria-label="Close file browser"
        >
          <X class="size-4" aria-hidden="true" />
        </button>
      </div>

      {/* New folder input */}
      <Show when={showNewFolderInput()}>
        <div
          class="flex items-center gap-2 border-t border-neutral-700 px-2 py-1"
          role="group"
          aria-label="Create new folder"
        >
          <label for="new-folder-name" class="text-sm text-neutral-400">
            New folder:
          </label>
          <input
            ref={newFolderInputRef}
            id="new-folder-name"
            type="text"
            class="flex-1 rounded border border-neutral-600 bg-neutral-900 px-2 py-1 text-sm text-neutral-200 focus:border-blue-500 focus:outline-none"
            placeholder="Folder name"
            value={newFolderName()}
            onInput={(e) => setNewFolderName(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleNewFolder()
              if (e.key === 'Escape') setShowNewFolderInput(false)
            }}
            aria-describedby="new-folder-hint"
          />
          <span id="new-folder-hint" class="sr-only">
            Press Enter to create or Escape to cancel
          </span>
          <button
            type="button"
            class="rounded bg-blue-600 px-2 py-1 text-sm text-white hover:bg-blue-700"
            onClick={handleNewFolder}
            aria-label="Create folder"
          >
            Create
          </button>
          <button
            type="button"
            class="rounded bg-neutral-700 px-2 py-1 text-sm text-neutral-300 hover:bg-neutral-600"
            onClick={() => setShowNewFolderInput(false)}
            aria-label="Cancel folder creation"
          >
            Cancel
          </button>
        </div>
      </Show>
    </div>
  )
}

export default SftpToolbar
