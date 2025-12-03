/**
 * File Entry Component
 *
 * Displays a single file or directory entry in the file browser.
 *
 * @module components/sftp/FileEntry
 */

import type { Component } from 'solid-js'
import { Show } from 'solid-js'
import { Download, Trash2 } from 'lucide-solid'
import type { SftpFileEntry } from '../../types/sftp.js'
import { formatFileSize } from '../../types/sftp.js'
import { FileIcon } from './FileIcon.jsx'

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
    // Use a compact format: "Dec 2, 2025, 03:09 PM"
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
      role="listitem"
      aria-selected={props.selected}
      aria-label={`${props.entry.type === 'directory' ? 'Folder' : 'File'}: ${props.entry.name}${props.entry.type === 'file' ? `, ${formatFileSize(props.entry.size)}` : ''}`}
    >
      {/* Icon */}
      <span class="flex w-5 items-center justify-center">
        <FileIcon entry={props.entry} class="size-4" />
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
        <span class="w-20 shrink-0 text-right text-neutral-400">
          {formatFileSize(props.entry.size)}
        </span>
      </Show>
      <Show when={props.entry.type !== 'file'}>
        <span class="w-20 shrink-0 text-right text-neutral-500">--</span>
      </Show>

      {/* Modified date */}
      <span class="hidden shrink-0 whitespace-nowrap text-right text-neutral-400 sm:block sm:w-44 lg:w-48">
        {formatDate(props.entry.modifiedAt)}
      </span>

      {/* Permissions */}
      <span class="hidden w-24 shrink-0 font-mono text-xs text-neutral-500 md:block">
        {props.entry.permissions}
      </span>

      {/* Actions */}
      <div class="flex shrink-0 gap-1">
        {/* Download button for files, placeholder for directories */}
        <Show
          when={props.entry.type === 'file' && props.onDownload}
          fallback={<span class="size-6" aria-hidden="true" />}
        >
          <button
            type="button"
            class="rounded p-1 text-neutral-400 hover:bg-neutral-600 hover:text-white"
            onClick={(e) => {
              e.stopPropagation()
              props.onDownload?.()
            }}
            title="Download"
            aria-label={`Download ${props.entry.name}`}
          >
            <Download class="size-4" aria-hidden="true" />
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
            aria-label={`Delete ${props.entry.name}`}
          >
            <Trash2 class="size-4" aria-hidden="true" />
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
      role="listitem"
      aria-label="Go to parent directory"
    >
      <span class="w-5 text-center text-base" aria-hidden="true">
        ..
      </span>
      <span class="sr-only">Parent directory</span>
    </div>
  )
}

export default FileEntry
