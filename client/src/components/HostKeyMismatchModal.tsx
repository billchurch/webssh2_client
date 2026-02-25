import type { Component } from 'solid-js'
import { Show } from 'solid-js'
import { Modal } from './Modal'
import { ShieldX } from 'lucide-solid'
import {
  hostKeyMismatchData,
  isHostKeyMismatchOpen,
  setIsHostKeyMismatchOpen
} from '../stores/terminal'

interface HostKeyMismatchModalProps {
  onDismiss: () => void
}

/**
 * HostKeyMismatchModal - Hard block modal shown when a host presents a key
 * that does not match the previously stored key. This could indicate a
 * man-in-the-middle attack or a legitimate server key change.
 *
 * No accept option is provided; the connection is always refused.
 */
export const HostKeyMismatchModal: Component<HostKeyMismatchModalProps> = (
  props
) => {
  const handleDismiss = () => {
    props.onDismiss()
    setIsHostKeyMismatchOpen(false)
  }

  return (
    <Modal
      isOpen={isHostKeyMismatchOpen()}
      onClose={handleDismiss}
      showCloseButton={false}
      closeOnBackdropClick={false}
    >
      <Show when={hostKeyMismatchData()}>
        <div
          class="relative w-80 rounded-lg border border-red-500 bg-slate-900 p-6 text-slate-100 shadow-xl sm:w-[28rem]"
          role="alertdialog"
          aria-labelledby="host-key-mismatch-title"
          aria-describedby="host-key-mismatch-description"
        >
          {/* Header with icon */}
          <div class="mb-4 flex flex-col items-center text-center">
            <div class="mb-3">
              <ShieldX class="size-12 text-red-500" />
            </div>
            <h2
              id="host-key-mismatch-title"
              class="text-xl font-bold text-red-500"
            >
              WARNING: HOST KEY MISMATCH
            </h2>
          </div>

          {/* Host info */}
          <div class="mb-4 rounded-md bg-slate-800 p-3 font-mono text-sm">
            <div class="flex justify-between py-1">
              <span class="text-slate-500">Host</span>
              <span class="text-cyan-400">
                {hostKeyMismatchData()!.host}:{hostKeyMismatchData()!.port}
              </span>
            </div>
          </div>

          {/* Warning message */}
          <p
            id="host-key-mismatch-description"
            class="mb-4 text-center text-sm text-red-300"
          >
            This could indicate a man-in-the-middle attack or the server key may
            have changed. The connection has been refused for your safety.
          </p>

          {/* Fingerprint comparison */}
          <div class="mb-4 rounded-md bg-slate-800 p-3">
            <div class="mb-1 text-xs text-slate-500">Expected Fingerprint</div>
            <div class="mb-3 break-all font-mono text-sm text-slate-300">
              {hostKeyMismatchData()!.storedFingerprint}
            </div>
            <div class="mb-1 text-xs text-slate-500">Received Fingerprint</div>
            <div class="break-all font-mono text-sm text-red-400">
              {hostKeyMismatchData()!.fingerprint}
            </div>
          </div>

          {/* Connection refused notice */}
          <p class="mb-4 text-center text-sm font-semibold text-slate-300">
            Connection has been refused.
          </p>

          {/* Guidance based on source */}
          <Show when={hostKeyMismatchData()!.source === 'client'}>
            <p class="mb-4 text-center text-xs text-slate-400">
              If you trust this server, remove the old key from Trusted Host
              Keys in Settings, then reconnect.
            </p>
          </Show>
          <Show when={hostKeyMismatchData()!.source === 'server'}>
            <p class="mb-4 text-center text-xs text-slate-400">
              Contact your administrator to verify the server key has been
              intentionally changed.
            </p>
          </Show>

          {/* Dismiss button */}
          <div class="flex justify-center">
            <button
              type="button"
              class="inline-flex items-center justify-center rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-slate-900"
              onClick={handleDismiss}
              autofocus
            >
              Dismiss
            </button>
          </div>
        </div>
      </Show>
    </Modal>
  )
}
