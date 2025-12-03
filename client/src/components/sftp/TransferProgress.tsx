/**
 * Transfer Progress Component
 *
 * Displays progress for a single file transfer.
 *
 * @module components/sftp/TransferProgress
 */

import type { Component } from 'solid-js'
import { Show } from 'solid-js'
import { Upload, Download, X } from 'lucide-solid'
import type { ClientTransfer, TransferId } from '../../types/sftp.js'
import {
  formatFileSize,
  formatTransferSpeed,
  formatTimeRemaining
} from '../../types/sftp.js'

interface TransferProgressProps {
  transfer: ClientTransfer
  onCancel?: (id: TransferId) => void
}

export const TransferProgress: Component<TransferProgressProps> = (props) => {
  const getStatusColor = () => {
    switch (props.transfer.status) {
      case 'active':
        return 'bg-blue-500'
      case 'completed':
        return 'bg-green-500'
      case 'failed':
        return 'bg-red-500'
      case 'cancelled':
        return 'bg-neutral-500'
      case 'paused':
        return 'bg-yellow-500'
      default:
        return 'bg-neutral-400'
    }
  }

  const getStatusText = () => {
    switch (props.transfer.status) {
      case 'pending':
        return 'Waiting...'
      case 'active':
        return `${formatTransferSpeed(props.transfer.bytesPerSecond)}`
      case 'completed':
        return 'Complete'
      case 'failed':
        return props.transfer.error || 'Failed'
      case 'cancelled':
        return 'Cancelled'
      case 'paused':
        return 'Paused'
      default:
        return ''
    }
  }

  const getDirectionIcon = () => {
    if (props.transfer.direction === 'upload') {
      return <Upload class="size-4" aria-hidden="true" />
    }
    return <Download class="size-4" aria-hidden="true" />
  }

  return (
    <div
      class="rounded border border-neutral-700 bg-neutral-800 p-2"
      role="listitem"
      aria-label={`${props.transfer.direction === 'upload' ? 'Uploading' : 'Downloading'} ${props.transfer.fileName}, ${props.transfer.percentComplete}% complete`}
    >
      <div class="mb-1 flex items-center gap-2">
        {/* Direction icon */}
        <span
          class="text-neutral-400"
          aria-label={
            props.transfer.direction === 'upload' ? 'Upload' : 'Download'
          }
        >
          {getDirectionIcon()}
        </span>

        {/* File name */}
        <span
          class="flex-1 truncate text-sm text-neutral-200"
          title={props.transfer.fileName}
        >
          {props.transfer.fileName}
        </span>

        {/* Cancel button (only for active/pending transfers) */}
        <Show
          when={
            ['pending', 'active', 'paused'].includes(props.transfer.status) &&
            props.onCancel
          }
        >
          <button
            type="button"
            class="rounded p-1 text-neutral-400 hover:bg-neutral-600 hover:text-white"
            onClick={() => props.onCancel?.(props.transfer.id)}
            title="Cancel"
            aria-label={`Cancel ${props.transfer.direction} of ${props.transfer.fileName}`}
          >
            <X class="size-4" aria-hidden="true" />
          </button>
        </Show>
      </div>

      {/* Progress bar */}
      <div
        class="mb-1 h-2 overflow-hidden rounded-full bg-neutral-700"
        role="progressbar"
        aria-valuenow={props.transfer.percentComplete}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Transfer progress: ${props.transfer.percentComplete}%`}
      >
        <div
          class={`h-full transition-all duration-300 ${getStatusColor()}`}
          style={{ width: `${props.transfer.percentComplete}%` }}
        />
      </div>

      {/* Stats */}
      <div class="flex justify-between text-xs text-neutral-400">
        <span>
          {formatFileSize(props.transfer.bytesTransferred)} /{' '}
          {formatFileSize(props.transfer.totalBytes)}
        </span>
        <span aria-live="polite">{getStatusText()}</span>
        <Show
          when={
            props.transfer.status === 'active' &&
            props.transfer.estimatedSecondsRemaining !== null
          }
        >
          <span>
            {formatTimeRemaining(props.transfer.estimatedSecondsRemaining)}
          </span>
        </Show>
      </div>
    </div>
  )
}

export default TransferProgress
