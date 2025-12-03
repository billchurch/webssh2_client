/**
 * Transfer List Component
 *
 * Displays a list of active and recent file transfers.
 *
 * @module components/sftp/TransferList
 */

import type { Component } from 'solid-js'
import { Show, For } from 'solid-js'
import type { ClientTransfer, TransferId } from '../../types/sftp.js'
import { TransferProgress } from './TransferProgress.jsx'

interface TransferListProps {
  transfers: ClientTransfer[]
  onCancel?: (id: TransferId) => void
  onClearCompleted?: () => void
}

export const TransferList: Component<TransferListProps> = (props) => {
  const hasCompletedOrFailed = () =>
    props.transfers.some(
      (t) =>
        t.status === 'completed' ||
        t.status === 'failed' ||
        t.status === 'cancelled'
    )

  return (
    <div
      class="shrink-0 border-t border-neutral-700 bg-neutral-900"
      role="region"
      aria-label="File transfers"
    >
      {/* Header */}
      <div class="flex items-center justify-between border-b border-neutral-700 px-2 py-1">
        <span class="text-sm font-medium text-neutral-300" id="transfers-label">
          Transfers ({props.transfers.length})
        </span>
        <Show when={hasCompletedOrFailed() && props.onClearCompleted}>
          <button
            type="button"
            class="text-xs text-neutral-400 hover:text-white"
            onClick={props.onClearCompleted}
            aria-label="Clear completed transfers"
          >
            Clear completed
          </button>
        </Show>
      </div>

      {/* Transfer list - limit height to show max 3 transfers */}
      <div
        class="max-h-32 overflow-y-auto p-2"
        role="list"
        aria-labelledby="transfers-label"
        aria-live="polite"
      >
        <Show
          when={props.transfers.length > 0}
          fallback={
            <div
              class="py-4 text-center text-sm text-neutral-500"
              role="status"
            >
              No active transfers
            </div>
          }
        >
          <div class="flex flex-col gap-2">
            <For each={props.transfers}>
              {(transfer) => (
                <TransferProgress
                  transfer={transfer}
                  {...(props.onCancel ? { onCancel: props.onCancel } : {})}
                />
              )}
            </For>
          </div>
        </Show>
      </div>
    </div>
  )
}

export default TransferList
