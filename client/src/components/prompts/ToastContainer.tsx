/**
 * ToastContainer - Fixed position container for toast notifications
 * Renders in bottom-right corner of the screen
 */
import type { Component } from 'solid-js'
import { For } from 'solid-js'
import { Toast } from './Toast'
import { promptStore } from '../../stores/prompt-store'

export const ToastContainer: Component = () => {
  return (
    <div
      class="pointer-events-none fixed bottom-6 right-6 z-[1000] flex max-w-sm flex-col gap-2"
      aria-label="Notifications"
      role="region"
    >
      <For each={promptStore.toasts}>
        {(toast) => (
          <div class="pointer-events-auto">
            <Toast toast={toast} onDismiss={promptStore.removeToast} />
          </div>
        )}
      </For>
    </div>
  )
}
