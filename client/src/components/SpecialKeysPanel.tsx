import type { Component } from 'solid-js'
import { For, createSignal, onMount, onCleanup } from 'solid-js'
import { Keyboard, X, ChevronDown, ChevronUp } from 'lucide-solid'

import { isSpecialKeysOpen, setIsSpecialKeysOpen } from '../stores/terminal'
import { emitData } from '../services/socket'
import { keyCategories } from './special-keys-data'

interface SpecialKeysPanelProps {
  onSendKey: () => void
}

export const SpecialKeysPanel: Component<SpecialKeysPanelProps> = (props) => {
  const [collapsedCategories, setCollapsedCategories] = createSignal<
    Set<string>
  >(new Set())

  const toggleCategory = (name: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(name)) {
        next.delete(name)
      } else {
        next.add(name)
      }
      return next
    })
  }

  const handleSendKey = (sequence: string) => {
    emitData(sequence)
    props.onSendKey()
  }

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && isSpecialKeysOpen()) {
      event.stopPropagation()
      setIsSpecialKeysOpen(false)
      props.onSendKey()
    }
  }

  onMount(() => {
    document.addEventListener('keydown', handleKeyDown)
  })

  onCleanup(() => {
    document.removeEventListener('keydown', handleKeyDown)
  })

  return (
    <div
      class={`absolute right-0 top-0 z-40 flex h-full w-64 flex-col border-l border-neutral-600 bg-neutral-800 transition-transform duration-200 ${
        isSpecialKeysOpen() ? 'translate-x-0' : 'translate-x-full'
      }`}
      aria-hidden={!isSpecialKeysOpen()}
      aria-label="Special Keys Panel"
      role="complementary"
    >
      {/* Header */}
      <div class="flex shrink-0 items-center justify-between border-b border-neutral-600 px-3 py-2">
        <div class="flex items-center gap-2 text-sm font-medium text-neutral-100">
          <Keyboard class="size-4" />
          Special Keys
        </div>
        <button
          type="button"
          class="rounded p-1 text-neutral-400 hover:bg-neutral-700 hover:text-neutral-100"
          onClick={() => {
            setIsSpecialKeysOpen(false)
            props.onSendKey()
          }}
          title="Close panel (Escape)"
        >
          <X class="size-4" />
        </button>
      </div>

      {/* Scrollable body */}
      <div class="flex-1 overflow-y-auto p-2">
        <For each={keyCategories}>
          {(category) => {
            const isCollapsed = () => collapsedCategories().has(category.name)

            return (
              <div class="mb-2">
                <button
                  type="button"
                  class="flex w-full items-center justify-between rounded px-2 py-1.5 text-xs font-medium uppercase tracking-wide text-neutral-400 hover:bg-neutral-700 hover:text-neutral-300"
                  onClick={() => toggleCategory(category.name)}
                  aria-expanded={!isCollapsed()}
                >
                  {category.name}
                  {isCollapsed() ? (
                    <ChevronDown class="size-3" />
                  ) : (
                    <ChevronUp class="size-3" />
                  )}
                </button>

                {!isCollapsed() && (
                  <div class="mt-1 grid grid-cols-3 gap-1">
                    <For each={category.keys}>
                      {(key) => (
                        <button
                          type="button"
                          class={`rounded px-1 py-1.5 font-mono text-xs transition-colors ${
                            key.browserReserved
                              ? 'border border-dashed border-amber-700 bg-neutral-700 text-amber-400 hover:bg-neutral-600'
                              : 'bg-neutral-700 text-neutral-200 hover:bg-neutral-600'
                          }`}
                          title={`${key.description}${key.browserReserved ? ' (browser-reserved)' : ''}`}
                          onClick={() => handleSendKey(key.sequence)}
                        >
                          {key.label}
                        </button>
                      )}
                    </For>
                  </div>
                )}
              </div>
            )
          }}
        </For>
      </div>
    </div>
  )
}
