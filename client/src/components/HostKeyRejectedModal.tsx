import type { Component } from 'solid-js'
import { Modal } from './Modal'
import { ShieldX } from 'lucide-solid'

interface HostKeyRejectedModalProps {
  isOpen: boolean
  reason: string
  onDismiss: () => void
}

/**
 * HostKeyRejectedModal - Simple notice shown when a connection is refused
 * due to host key policy (e.g., server rejects unknown keys automatically).
 */
export const HostKeyRejectedModal: Component<HostKeyRejectedModalProps> = (
  props
) => {
  return (
    <Modal
      isOpen={props.isOpen}
      onClose={props.onDismiss}
      showCloseButton={false}
      closeOnBackdropClick={true}
    >
      <div
        class="relative w-80 rounded-lg border border-red-500 bg-slate-900 p-6 text-slate-100 shadow-xl sm:w-[28rem]"
        role="alertdialog"
        aria-labelledby="host-key-rejected-title"
        aria-describedby="host-key-rejected-description"
      >
        {/* Header with icon */}
        <div class="mb-4 flex flex-col items-center text-center">
          <div class="mb-3">
            <ShieldX class="size-12 text-red-500" />
          </div>
          <h2
            id="host-key-rejected-title"
            class="text-xl font-semibold text-red-400"
          >
            Connection Refused
          </h2>
        </div>

        {/* Reason */}
        <p
          id="host-key-rejected-description"
          class="mb-4 text-center text-sm text-slate-300"
        >
          {props.reason}
        </p>

        {/* Guidance */}
        <p class="mb-4 text-center text-xs text-slate-400">
          Contact your administrator to add this host to the trusted keys
          database before connecting.
        </p>

        {/* Dismiss button */}
        <div class="flex justify-center">
          <button
            type="button"
            class="inline-flex items-center justify-center rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-slate-900"
            onClick={props.onDismiss}
            autofocus
          >
            Dismiss
          </button>
        </div>
      </div>
    </Modal>
  )
}
