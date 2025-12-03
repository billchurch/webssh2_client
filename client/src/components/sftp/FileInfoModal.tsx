/**
 * File Info Modal Component
 *
 * Displays detailed information about a file in a modal dialog.
 *
 * @module components/sftp/FileInfoModal
 */

import type { Component } from 'solid-js'
import {
  X,
  File,
  Download,
  Trash2,
  Calendar,
  Clock,
  Shield,
  User,
  Users,
  HardDrive
} from 'lucide-solid'
import { Modal } from '../Modal.jsx'
import type { SftpFileEntry } from '../../types/sftp.js'
import { formatFileSize } from '../../types/sftp.js'
import { FileIcon } from './FileIcon.jsx'

interface FileInfoModalProps {
  /** The file entry to display info for */
  entry: SftpFileEntry | null
  /** Whether the modal is open */
  isOpen: boolean
  /** Callback when the modal is closed */
  onClose: () => void
  /** Callback when download is requested */
  onDownload: () => void
  /** Callback when delete is requested */
  onDelete: () => void
}

export const FileInfoModal: Component<FileInfoModalProps> = (props) => {
  const formatDate = (isoString: string): string => {
    const date = new Date(isoString)
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatTime = (isoString: string): string => {
    const date = new Date(isoString)
    return date.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const handleDelete = () => {
    // eslint-disable-next-line no-restricted-globals, no-alert
    if (props.entry && window.confirm(`Delete "${props.entry.name}"?`)) {
      props.onDelete()
      props.onClose()
    }
  }

  const handleDownload = () => {
    props.onDownload()
    props.onClose()
  }

  return (
    <Modal
      isOpen={props.isOpen}
      onClose={props.onClose}
      showCloseButton={false}
    >
      <div
        class="relative w-80 rounded-lg border border-neutral-700 bg-neutral-800 shadow-xl sm:w-96"
        role="dialog"
        aria-labelledby="file-info-title"
        aria-describedby="file-info-description"
      >
        {/* Header */}
        <div class="flex items-center justify-between border-b border-neutral-700 px-4 py-3">
          <h2
            id="file-info-title"
            class="flex items-center gap-2 text-lg font-semibold text-neutral-100"
          >
            <File class="size-5" aria-hidden="true" />
            File Info
          </h2>
          <button
            type="button"
            class="rounded p-1 text-neutral-400 hover:bg-neutral-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            onClick={props.onClose}
            aria-label="Close dialog"
          >
            <X class="size-5" aria-hidden="true" />
          </button>
        </div>

        {/* Content */}
        <div id="file-info-description" class="space-y-4 p-4">
          {/* File name with icon */}
          <div class="flex items-center gap-3 rounded-md bg-neutral-900 p-3">
            <span class="flex size-10 shrink-0 items-center justify-center rounded-md bg-neutral-700">
              {props.entry && (
                <FileIcon entry={props.entry} class="size-6 text-neutral-300" />
              )}
            </span>
            <div class="min-w-0 flex-1">
              <p
                class="truncate font-medium text-neutral-100"
                title={props.entry?.name}
              >
                {props.entry?.name}
              </p>
              <p class="text-sm text-neutral-400">{props.entry?.path}</p>
            </div>
          </div>

          {/* File details grid */}
          <dl class="grid grid-cols-2 gap-3 text-sm">
            {/* Size */}
            <div class="flex items-center gap-2">
              <dt class="flex items-center gap-1.5 text-neutral-400">
                <HardDrive class="size-4" aria-hidden="true" />
                <span>Size</span>
              </dt>
            </div>
            <dd class="text-right text-neutral-100">
              {props.entry ? formatFileSize(props.entry.size) : '--'}
            </dd>

            {/* Modified date */}
            <div class="flex items-center gap-2">
              <dt class="flex items-center gap-1.5 text-neutral-400">
                <Calendar class="size-4" aria-hidden="true" />
                <span>Modified</span>
              </dt>
            </div>
            <dd class="text-right text-neutral-100">
              {props.entry ? formatDate(props.entry.modifiedAt) : '--'}
            </dd>

            {/* Modified time */}
            <div class="flex items-center gap-2">
              <dt class="flex items-center gap-1.5 text-neutral-400">
                <Clock class="size-4" aria-hidden="true" />
                <span>Time</span>
              </dt>
            </div>
            <dd class="text-right text-neutral-100">
              {props.entry ? formatTime(props.entry.modifiedAt) : '--'}
            </dd>

            {/* Permissions */}
            <div class="flex items-center gap-2">
              <dt class="flex items-center gap-1.5 text-neutral-400">
                <Shield class="size-4" aria-hidden="true" />
                <span>Permissions</span>
              </dt>
            </div>
            <dd class="text-right font-mono text-neutral-100">
              {props.entry?.permissions || '--'}
            </dd>

            {/* Owner */}
            <div class="flex items-center gap-2">
              <dt class="flex items-center gap-1.5 text-neutral-400">
                <User class="size-4" aria-hidden="true" />
                <span>Owner</span>
              </dt>
            </div>
            <dd class="text-right text-neutral-100">
              {props.entry?.owner || '--'}
            </dd>

            {/* Group */}
            <div class="flex items-center gap-2">
              <dt class="flex items-center gap-1.5 text-neutral-400">
                <Users class="size-4" aria-hidden="true" />
                <span>Group</span>
              </dt>
            </div>
            <dd class="text-right text-neutral-100">
              {props.entry?.group || '--'}
            </dd>
          </dl>
        </div>

        {/* Actions footer */}
        <div class="flex justify-end gap-2 border-t border-neutral-700 px-4 py-3">
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-neutral-800"
            onClick={handleDelete}
            aria-label={`Delete ${props.entry?.name}`}
          >
            <Trash2 class="size-4" aria-hidden="true" />
            Delete
          </button>
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-neutral-800"
            onClick={handleDownload}
            aria-label={`Download ${props.entry?.name}`}
          >
            <Download class="size-4" aria-hidden="true" />
            Download
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default FileInfoModal
