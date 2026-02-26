import type { Component } from 'solid-js'
import { createSignal, onCleanup, Show } from 'solid-js'
import { ShieldCheck, ShieldAlert } from 'lucide-solid'
import {
  hostKeyStatus,
  hostKeySource,
  hostKeyInfo,
  hostKeyVerifyConfig
} from '../stores/terminal'

/**
 * HostKeyStatusIndicator - Status bar icon showing host key verification state.
 * Shows a shield icon (green for verified, amber for alert) with a click-to-expand
 * popover displaying host key details.
 *
 * Only renders when host key verification is enabled and status is not 'none'.
 */
export const HostKeyStatusIndicator: Component = () => {
  const [isPopoverOpen, setIsPopoverOpen] = createSignal(false)
  let containerRef: HTMLDivElement | undefined

  const togglePopover = () => {
    setIsPopoverOpen(!isPopoverOpen())
  }

  const handleClickOutside = (e: MouseEvent) => {
    if (
      containerRef !== undefined &&
      !containerRef.contains(e.target as Node)
    ) {
      setIsPopoverOpen(false)
    }
  }

  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsPopoverOpen(false)
    }
  }

  document.addEventListener('mousedown', handleClickOutside)
  document.addEventListener('keydown', handleEscape)
  onCleanup(() => {
    document.removeEventListener('mousedown', handleClickOutside)
    document.removeEventListener('keydown', handleEscape)
  })

  const sourceLabel = () => {
    const src = hostKeySource()
    if (src === 'server') return 'Server store'
    if (src === 'client') return 'Client store'
    return 'Not stored'
  }

  return (
    <Show when={hostKeyVerifyConfig()?.enabled && hostKeyStatus() !== 'none'}>
      <div
        ref={containerRef}
        class="relative border-l border-neutral-200 px-[10px]"
      >
        <button
          type="button"
          class="flex items-center justify-center"
          onClick={togglePopover}
          aria-label="Host key verification status"
          aria-expanded={isPopoverOpen()}
          title={`Host key: ${hostKeyStatus()}`}
        >
          <Show
            when={hostKeyStatus() === 'verified'}
            fallback={<ShieldAlert class="size-4 text-amber-400" />}
          >
            <ShieldCheck class="size-4 text-green-400" />
          </Show>
        </button>

        {/* Popover */}
        <Show when={isPopoverOpen() && hostKeyInfo()}>
          <div
            class="absolute bottom-full right-0 z-[200] mb-2 w-72 rounded-lg border border-slate-600 bg-slate-900 p-3 text-sm text-slate-100 shadow-xl"
            role="dialog"
            aria-label="Host key details"
          >
            <div class="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Host Key Details
            </div>
            <div class="space-y-1.5">
              <div class="flex justify-between">
                <span class="text-slate-500">Host</span>
                <span class="font-mono text-cyan-400">
                  {hostKeyInfo()!.host}:{hostKeyInfo()!.port}
                </span>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-500">Algorithm</span>
                <span class="font-mono text-slate-300">
                  {hostKeyInfo()!.algorithm}
                </span>
              </div>
              <div>
                <span class="text-slate-500">Fingerprint</span>
                <div class="mt-0.5 break-all font-mono text-xs text-slate-300">
                  {hostKeyInfo()!.fingerprint}
                </div>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-500">Source</span>
                <span class="text-slate-300">{sourceLabel()}</span>
              </div>
            </div>
          </div>
        </Show>
      </div>
    </Show>
  )
}
