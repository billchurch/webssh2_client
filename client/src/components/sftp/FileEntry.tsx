/**
 * File Entry Component
 *
 * Displays a single file or directory entry in the file browser.
 *
 * @module components/sftp/FileEntry
 */

import type { Component } from 'solid-js'
import { Show } from 'solid-js'
import type { SftpFileEntry } from '../../types/sftp.js'
import { getFileIcon, formatFileSize } from '../../types/sftp.js'

interface FileEntryProps {
  entry: SftpFileEntry
  selected?: boolean
  onClick?: () => void
  onDownload?: () => void
  onDelete?: () => void
}

export const FileEntry: Component<FileEntryProps> = (props) => {
  const handleClick = (e: MouseEvent) => {
    e.preventDefault()
    props.onClick?.()
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      props.onClick?.()
    }
  }

  const formatDate = (isoString: string): string => {
    const date = new Date(isoString)
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div
      class={`flex cursor-pointer items-center gap-2 px-2 py-1 text-sm hover:bg-neutral-700 ${
        props.selected ? 'bg-blue-900/50' : ''
      }`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-selected={props.selected}
    >
      {/* Icon */}
      <span class="w-5 text-center text-base" aria-hidden="true">
        {getFileIcon(props.entry)}
      </span>

      {/* Name */}
      <span
        class={`flex-1 truncate ${
          props.entry.isHidden ? 'text-neutral-400' : 'text-neutral-100'
        }`}
        title={props.entry.name}
      >
        {props.entry.name}
      </span>

      {/* Size (for files only) */}
      <Show when={props.entry.type === 'file'}>
        <span class="w-20 text-right text-neutral-400">
          {formatFileSize(props.entry.size)}
        </span>
      </Show>
      <Show when={props.entry.type !== 'file'}>
        <span class="w-20 text-right text-neutral-500">--</span>
      </Show>

      {/* Modified date */}
      <span class="hidden w-40 text-right text-neutral-400 sm:block">
        {formatDate(props.entry.modifiedAt)}
      </span>

      {/* Permissions */}
      <span class="hidden w-24 font-mono text-xs text-neutral-500 md:block">
        {props.entry.permissions}
      </span>

      {/* Actions */}
      <div class="flex gap-1">
        <Show when={props.entry.type === 'file' && props.onDownload}>
          <button
            type="button"
            class="rounded p-1 text-neutral-400 hover:bg-neutral-600 hover:text-white"
            onClick={(e) => {
              e.stopPropagation()
              props.onDownload?.()
            }}
            title="Download"
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
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
          </button>
        </Show>
        <Show when={props.onDelete}>
          <button
            type="button"
            class="rounded p-1 text-neutral-400 hover:bg-red-600 hover:text-white"
            onClick={(e) => {
              e.stopPropagation()
              // eslint-disable-next-line no-restricted-globals, no-alert
              if (window.confirm(`Delete "${props.entry.name}"?`)) {
                props.onDelete?.()
              }
            }}
            title="Delete"
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
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </Show>
      </div>
    </div>
  )
}

/**
 * Parent directory entry component ("..")
 */
interface ParentEntryProps {
  onNavigateUp: () => void
}

export const ParentEntry: Component<ParentEntryProps> = (props) => {
  return (
    <div
      class="flex cursor-pointer items-center gap-2 px-2 py-1 text-sm hover:bg-neutral-700"
      onClick={props.onNavigateUp}
      onKeyDown={(e) => e.key === 'Enter' && props.onNavigateUp()}
      tabIndex={0}
      role="button"
    >
      <span class="w-5 text-center text-base" aria-hidden="true">
        ..
      </span>
    </div>
  )
}

export default FileEntry
