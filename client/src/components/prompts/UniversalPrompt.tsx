/**
 * UniversalPrompt - Modal component for input, confirm, and notice prompts
 * Features focus trap safety and emergency close
 */
import type { Component } from 'solid-js'
import {
  createSignal,
  createEffect,
  onMount,
  onCleanup,
  For,
  Show
} from 'solid-js'
import type {
  PromptPayload,
  PromptResponsePayload,
  PromptSeverity
} from '../../types/prompt'
import { Modal } from '../Modal'
import { FORCE_CLOSE_ENABLE_DELAY_MS } from '../../constants.js'
import { resolvePromptIcon } from '../../utils/prompt-icons'
import { promptStore } from '../../stores/prompt-store'

interface UniversalPromptProps {
  prompt: PromptPayload
  onResponse: (response: PromptResponsePayload) => void
  onDismiss: () => void
}

/** Severity-based icon colors */
const severityColors: Record<PromptSeverity, string> = {
  info: 'text-blue-500',
  warning: 'text-yellow-500',
  error: 'text-red-500',
  success: 'text-green-500'
}

/** Severity-based border colors */
const severityBorders: Record<PromptSeverity, string> = {
  info: 'border-blue-300',
  warning: 'border-yellow-300',
  error: 'border-red-300',
  success: 'border-green-300'
}

export const UniversalPrompt: Component<UniversalPromptProps> = (props) => {
  const [inputValues, setInputValues] = createSignal<Record<string, string>>({})
  const [forceCloseEnabled, setForceCloseEnabled] = createSignal(false)

  // Initialize input values from prompt
  createEffect(() => {
    const initialValues: Record<string, string> = {}
    for (const input of props.prompt.inputs ?? []) {
      initialValues[input.id] = input.value ?? ''
    }
    setInputValues(initialValues)
  })

  // Safety: force enable backdrop close after 5 seconds
  createEffect(() => {
    const timer = setTimeout(() => {
      setForceCloseEnabled(true)
    }, FORCE_CLOSE_ENABLE_DELAY_MS)
    onCleanup(() => clearTimeout(timer))
  })

  // Emergency close: Ctrl+Shift+Esc dismisses all prompts
  onMount(() => {
    const handleForceClose = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'Escape') {
        e.preventDefault()
        promptStore.dismissAllPrompts()
      }
    }
    window.addEventListener('keydown', handleForceClose)
    onCleanup(() => window.removeEventListener('keydown', handleForceClose))
  })

  const handleButtonClick = (buttonId: string) => {
    props.onResponse({
      id: props.prompt.id,
      action: buttonId,
      inputs:
        props.prompt.inputs !== undefined && props.prompt.inputs.length > 0
          ? inputValues()
          : undefined
    })
  }

  const handleBackdropClick = () => {
    if (props.prompt.closeOnBackdrop !== false || forceCloseEnabled()) {
      props.onDismiss()
    }
  }

  const handleFormSubmit = (e: Event) => {
    e.preventDefault()
    // Find the default button or first primary button
    const defaultButton = props.prompt.buttons?.find((b) => b.default)
    const primaryButton = props.prompt.buttons?.find(
      (b) => b.variant === 'primary'
    )
    const buttonToClick = defaultButton ?? primaryButton
    if (buttonToClick !== undefined) {
      handleButtonClick(buttonToClick.id)
    }
  }

  // Resolve icon: use custom icon if provided, otherwise fallback to severity default
  const IconComponent = () =>
    resolvePromptIcon(props.prompt.icon, props.prompt.severity ?? 'info')
  const severity = () => props.prompt.severity ?? 'info'
  const severityColor = () => severityColors[severity()]
  const severityBorder = () => severityBorders[severity()]

  // Default buttons if none provided
  const buttons = () =>
    props.prompt.buttons ?? [
      { id: 'ok', label: 'OK', variant: 'primary' as const, default: true }
    ]

  // Get button variant classes
  const getButtonVariantClasses = (
    variant: 'primary' | 'secondary' | 'danger' | undefined
  ): string => {
    if (variant === 'danger') {
      return 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
    }
    if (variant === 'primary') {
      return 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500'
    }
    return 'bg-slate-200 text-slate-800 hover:bg-slate-300 focus:ring-slate-500'
  }

  return (
    <Modal isOpen={true} onClose={handleBackdropClick} showCloseButton={false}>
      <div
        class={`relative w-80 rounded-md border bg-white p-5 text-slate-800 shadow-md sm:w-96 ${severityBorder()}`}
        role={props.prompt.type === 'notice' ? 'alertdialog' : 'dialog'}
        aria-labelledby="prompt-title"
        aria-describedby={
          props.prompt.message !== undefined ? 'prompt-message' : undefined
        }
      >
        {/* Header with icon and title */}
        <div class="mb-4 flex items-center gap-3">
          <IconComponent class={`size-6 ${severityColor()}`} />
          <h3 id="prompt-title" class="text-lg font-semibold text-slate-900">
            {props.prompt.title}
          </h3>
        </div>

        {/* Message */}
        <Show when={props.prompt.message}>
          <p id="prompt-message" class="mb-4 text-slate-600">
            {props.prompt.message}
          </p>
        </Show>

        {/* Form for inputs */}
        <form onSubmit={handleFormSubmit}>
          {/* Input fields */}
          <Show
            when={
              props.prompt.inputs !== undefined &&
              props.prompt.inputs.length > 0
            }
          >
            <div class="mb-4 space-y-4">
              <For each={props.prompt.inputs}>
                {(input, index) => {
                  const inputId = `prompt-input-${input.id}`
                  return (
                    <div>
                      <label
                        for={inputId}
                        class="mb-1 block text-sm font-medium text-slate-700"
                      >
                        {input.label}
                      </label>
                      <input
                        id={inputId}
                        type={input.type}
                        placeholder={input.placeholder}
                        value={inputValues()[input.id] ?? ''}
                        onInput={(e) =>
                          setInputValues((prev) => ({
                            ...prev,
                            [input.id]: e.currentTarget.value
                          }))
                        }
                        required={input.required}
                        autofocus={
                          props.prompt.autoFocus !== false && index() === 0
                        }
                        class="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        aria-required={input.required}
                      />
                    </div>
                  )
                }}
              </For>
            </div>
          </Show>

          {/* Buttons */}
          <div class="flex justify-end gap-2">
            <For each={buttons()}>
              {(button) => (
                <button
                  type={button.default ? 'submit' : 'button'}
                  onClick={
                    button.default
                      ? undefined
                      : () => handleButtonClick(button.id)
                  }
                  class={`inline-flex items-center justify-center rounded-md border border-transparent px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${getButtonVariantClasses(button.variant)}`}
                  autofocus={
                    button.default &&
                    (props.prompt.inputs === undefined ||
                      props.prompt.inputs.length === 0)
                  }
                >
                  {button.label}
                </button>
              )}
            </For>
          </div>
        </form>

        {/* Force close hint (shows after 5s) */}
        <Show
          when={forceCloseEnabled() && props.prompt.closeOnBackdrop === false}
        >
          <p class="mt-3 text-xs text-slate-400">
            Click outside or press Escape to close
          </p>
        </Show>
      </div>
    </Modal>
  )
}
