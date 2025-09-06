import type { Component, JSX } from 'solid-js'
import {
  Show,
  For,
  createSignal,
  createEffect,
  onMount,
  onCleanup
} from 'solid-js'
import { Portal } from 'solid-js/web'
import createDebug from 'debug'

const debug = createDebug('webssh2-client:modal')

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  children: JSX.Element
  class?: string
  showCloseButton?: boolean
  closeOnBackdropClick?: boolean
}

export const Modal: Component<ModalProps> = (props) => {
  let dialogRef: HTMLDialogElement | undefined

  // Handle modal state changes
  createEffect(() => {
    debug('Modal createEffect triggered:', {
      isOpen: props.isOpen,
      hasDialog: !!dialogRef
    })

    // Use requestAnimationFrame to ensure dialogRef is available
    requestAnimationFrame(() => {
      if (props.isOpen && dialogRef) {
        debug('Opening modal dialog')
        dialogRef.showModal()

        // Focus trap - focus on first focusable element using another requestAnimationFrame for proper timing
        requestAnimationFrame(() => {
          if (dialogRef) {
            const focusableElements = dialogRef.querySelectorAll(
              'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            )
            const firstElement = focusableElements[0] as HTMLElement
            if (firstElement) {
              firstElement.focus()
            }
          }
        })
      } else if (!props.isOpen && dialogRef) {
        debug('Closing modal dialog')
        dialogRef.close()
      }
    })
  })

  // Handle keyboard events
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && props.isOpen) {
      props.onClose()
    }
  }

  // Handle backdrop clicks
  const handleDialogClick = (e: MouseEvent) => {
    const rect = dialogRef?.getBoundingClientRect()
    if (
      rect &&
      props.closeOnBackdropClick !== false &&
      (e.clientX < rect.left ||
        e.clientX > rect.right ||
        e.clientY < rect.top ||
        e.clientY > rect.bottom)
    ) {
      props.onClose()
    }
  }

  onMount(() => {
    document.addEventListener('keydown', handleKeyDown)
  })

  onCleanup(() => {
    document.removeEventListener('keydown', handleKeyDown)
  })

  return (
    <Portal>
      <Show when={props.isOpen}>
        <dialog
          ref={dialogRef}
          class={`modal ${props.class || ''}`}
          onClick={handleDialogClick}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <Show when={props.showCloseButton !== false}>
              <button
                type="button"
                class="absolute right-2 top-2 border-0 bg-transparent p-0 text-xl leading-none text-neutral-400 hover:text-neutral-600"
                onClick={props.onClose}
                aria-label="Close"
              >
                &times;
              </button>
            </Show>
            {props.children}
          </div>
        </dialog>
      </Show>
    </Portal>
  )
}

// Error Modal Component
interface ErrorModalProps {
  isOpen: boolean
  onClose: () => void
  message: string
}

export const ErrorModal: Component<ErrorModalProps> = (props) => {
  return (
    <Modal isOpen={props.isOpen} onClose={props.onClose}>
      <div class="relative w-80 rounded-md border border-red-400 bg-red-50 p-5 shadow-md sm:w-96">
        <h2 class="mb-3 text-lg font-semibold text-red-700">Error</h2>
        <p class="mb-4 text-red-600">{props.message}</p>
        <div class="flex justify-end">
          <button
            type="button"
            class="inline-flex items-center justify-center rounded-md border border-transparent bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            onClick={props.onClose}
            autofocus
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  )
}

// Prompt Modal Component (for keyboard-interactive authentication)
interface PromptModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  prompts: Array<{ prompt: string; echo: boolean }>
  onSubmit: (responses: string[]) => void
}

export const PromptModal: Component<PromptModalProps> = (props) => {
  const [responses, setResponses] = createSignal<string[]>([])

  // Initialize responses array when prompts change
  createEffect(() => {
    if (props.prompts) {
      setResponses(new Array(props.prompts.length).fill(''))
    }
  })

  const handleInputChange = (index: number, value: string) => {
    const newResponses = [...responses()]
    newResponses[index] = value
    setResponses(newResponses)
  }

  const handleSubmit = (e: Event) => {
    e.preventDefault()
    props.onSubmit(responses())
    props.onClose()
  }

  return (
    <Modal isOpen={props.isOpen} onClose={props.onClose}>
      <div class="relative w-80 rounded-md border border-neutral-300 bg-white p-5 text-slate-800 shadow-md sm:w-96">
        <h2 class="mb-4 text-lg font-semibold text-slate-900">{props.title}</h2>
        <form onSubmit={handleSubmit}>
          <div class="mb-4 space-y-3">
            <For each={props.prompts}>
              {(prompt, index) => (
                <div>
                  <label class="mb-1 block text-sm font-medium text-slate-700">
                    {prompt.prompt}
                  </label>
                  <input
                    type={prompt.echo ? 'text' : 'password'}
                    class="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={responses()[index()] || ''}
                    onInput={(e) =>
                      handleInputChange(index(), e.currentTarget.value)
                    }
                    required
                  />
                </div>
              )}
            </For>
          </div>
          <div class="flex justify-end gap-2">
            <button
              type="button"
              class="inline-flex items-center justify-center rounded-md border border-transparent bg-slate-700 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
              onClick={props.onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              class="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Submit
            </button>
          </div>
        </form>
      </div>
    </Modal>
  )
}
