import type { Component } from 'solid-js'
import { createSignal, Show } from 'solid-js'
import { Modal } from './Modal'
import { ShieldAlert } from 'lucide-solid'
import {
  hostKeyPromptData,
  isHostKeyPromptOpen,
  setIsHostKeyPromptOpen,
  hostKeyVerifyConfig
} from '../stores/terminal'

interface HostKeyPromptModalProps {
  onAccept: (remember: boolean) => void
  onReject: () => void
}

/**
 * HostKeyPromptModal - Shown when connecting to a host whose key is not yet
 * trusted. Presents the host fingerprint and asks the user to accept or reject.
 * Optionally allows saving the key to the client-side store.
 */
export const HostKeyPromptModal: Component<HostKeyPromptModalProps> = (
  props
) => {
  const [rememberKey, setRememberKey] = createSignal(true)

  const handleAccept = () => {
    props.onAccept(rememberKey())
    setIsHostKeyPromptOpen(false)
  }

  const handleReject = () => {
    props.onReject()
    setIsHostKeyPromptOpen(false)
  }

  return (
    <Modal
      isOpen={isHostKeyPromptOpen()}
      onClose={handleReject}
      showCloseButton={false}
      closeOnBackdropClick={false}
    >
      <Show when={hostKeyPromptData()}>
        <div
          class="relative w-80 rounded-lg border border-amber-400 bg-slate-900 p-6 text-slate-100 shadow-xl sm:w-[28rem]"
          role="alertdialog"
          aria-labelledby="host-key-prompt-title"
          aria-describedby="host-key-prompt-description"
        >
          {/* Header with icon */}
          <div class="mb-4 flex flex-col items-center text-center">
            <div class="mb-3">
              <ShieldAlert class="size-12 text-amber-400" />
            </div>
            <h2
              id="host-key-prompt-title"
              class="text-xl font-semibold text-amber-400"
            >
              Unknown Host Key
            </h2>
          </div>

          {/* Host info */}
          <div class="mb-4 rounded-md bg-slate-800 p-3 font-mono text-sm">
            <div class="flex justify-between py-1">
              <span class="text-slate-500">Host</span>
              <span class="text-cyan-400">
                {hostKeyPromptData()!.host}:{hostKeyPromptData()!.port}
              </span>
            </div>
          </div>

          {/* Fingerprint display */}
          <div class="mb-4 rounded-md bg-slate-800 p-3">
            <div class="mb-1 text-xs text-slate-500">Algorithm</div>
            <div class="mb-2 font-mono text-sm text-slate-300">
              {hostKeyPromptData()!.algorithm}
            </div>
            <div class="mb-1 text-xs text-slate-500">SHA-256 Fingerprint</div>
            <div class="break-all font-mono text-sm text-slate-300">
              {hostKeyPromptData()!.fingerprint}
            </div>
          </div>

          {/* Confirmation question */}
          <p
            id="host-key-prompt-description"
            class="mb-4 text-center text-sm text-slate-300"
          >
            Are you sure you want to continue connecting?
          </p>

          {/* Remember checkbox - only when client store is enabled */}
          <Show when={hostKeyVerifyConfig()?.clientStoreEnabled}>
            <label class="mb-4 flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={rememberKey()}
                onChange={(e) => setRememberKey(e.currentTarget.checked)}
                class="size-4 rounded border-slate-500 bg-slate-700 text-cyan-600 focus:ring-cyan-500 focus:ring-offset-slate-900"
              />
              Remember this key (save to browser)
            </label>
          </Show>

          {/* Action buttons */}
          <div class="flex justify-center gap-3">
            <button
              type="button"
              class="inline-flex items-center justify-center rounded-md border border-slate-500 bg-transparent px-4 py-2 text-sm font-medium text-slate-300 shadow-sm hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-slate-900"
              onClick={handleReject}
            >
              Reject
            </button>
            <button
              type="button"
              class="inline-flex items-center justify-center rounded-md bg-cyan-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-900"
              onClick={handleAccept}
              autofocus
            >
              Accept
            </button>
          </div>
        </div>
      </Show>
    </Modal>
  )
}
