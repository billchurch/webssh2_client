/**
 * Transfer Progress Component
 *
 * Displays progress for a single file transfer.
 *
 * @module components/sftp/TransferProgress
 */

import type { Component } from 'solid-js'
import { Show } from 'solid-js'
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
      return (
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
      )
    }
    return (
      <svg class="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
        />
      </svg>
    )
  }

  return (
    <div class="rounded border border-neutral-700 bg-neutral-800 p-2">
      <div class="mb-1 flex items-center gap-2">
        {/* Direction icon */}
        <span class="text-neutral-400">{getDirectionIcon()}</span>

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
        </Show>
      </div>

      {/* Progress bar */}
      <div class="mb-1 h-2 overflow-hidden rounded-full bg-neutral-700">
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
        <span>{getStatusText()}</span>
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
